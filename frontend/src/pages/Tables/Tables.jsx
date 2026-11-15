import { useState, useEffect } from "react";
import { Armchair, Users, CircleCheck, RefreshCw, Trash2, AlertTriangle, Plus, Pencil, MapPin, X, Check } from "lucide-react";
import StatCard from "../../components/dashboard/StatCard";
import ZoneTabs from "../../components/tables/ZoneTabs";
import TableCard from "../../components/tables/TableCard";
import QrModal from "../../components/tables/QrModal";
import AddTableModal from "../../components/tables/AddTableModal";
import EditTableModal from "../../components/tables/EditTableModal";
import { formatTime } from "../../utils/date";
import { usePageHeader } from "../../context/PageHeaderContext";
import api from "../../services/api";

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [zonesList, setZonesList] = useState([]);
  const [zone, setZone] = useState("all");
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [qrTable, setQrTable] = useState(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [deletingTable, setDeletingTable] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Zone management states ──────────────────────────────────
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [editingZone, setEditingZone] = useState(null);   // { id, name } or null
  const [editZoneName, setEditZoneName] = useState("");
  const [deletingZone, setDeletingZone] = useState(null);
  const [isDeletingZone, setIsDeletingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [addingZone, setAddingZone] = useState(false);
  const [zoneError, setZoneError] = useState("");

  // Load bàn và khu vực từ API
  const fetchTablesData = async () => {
    try {
      setLoading(true);
      const [tablesRes, zonesRes] = await Promise.all([
        api.get("/tables").catch(() => ({ data: [] })),
        api.get("/zones").catch(() => ({ data: [] })),
      ]);

      setTables(tablesRes.data || []);
      setZonesList(zonesRes.data || []);
      setUpdatedAt(new Date());
    } catch (err) {
      console.warn("Lỗi tải danh sách bàn từ API:", err);
      setTables([]);
      setZonesList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesData();

    // Tự động đồng bộ mỗi 4 giây để phản ánh tức thì khi khách quét QR hoặc đổi bàn
    const interval = setInterval(() => {
      fetchTablesData();
    }, 4000);

    const onFocus = () => fetchTablesData();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  usePageHeader({
    title: "Bàn & mã QR",
    subtitle: "Theo dõi trạng thái bàn và quản lý QR Menu theo khu vực",
    action: {
      label: "Thêm bàn",
      onClick: () => setIsAddTableOpen(true),
    },
  });

  // Thống kê
  const total = tables.length;
  const occupied = tables.filter((t) => t.status === "occupied").length;
  const free = tables.filter((t) => t.status === "free" || t.status === "available").length;
  const zoneNames = zonesList.map((z) => (typeof z === "object" ? z.name : z));
  const zoneCount = new Set(tables.map((t) => t.zone_name || t.zone)).size || zoneNames.length;
  const usage = total ? Math.round((occupied / total) * 100) : 0;

  const stats = [
    { label: "Tổng số bàn", value: total, trend: `${zoneCount} khu vực`, tone: "blue", icon: Armchair },
    { label: "Bàn đang dùng", value: occupied, trend: `${usage}% công suất`, tone: "orange", icon: Users },
    { label: "Bàn trống", value: free, trend: "Sẵn sàng đón khách", tone: "green", icon: CircleCheck },
  ];

  const tabs = [
    { id: "all", label: "Tất cả", count: total },
    ...zoneNames.map((z) => ({
      id: z,
      label: z,
      count: tables.filter((t) => (t.zone_name || t.zone) === z).length,
    })),
  ];

  const visibleTables =
    zone === "all"
      ? tables
      : tables.filter((t) => (t.zone_name || t.zone) === zone);

  const handleRefresh = () => {
    fetchTablesData();
  };

  const handleTableUpdated = (updatedTable) => {
    setTables((prev) =>
      prev.map((t) => (t.id === updatedTable.id ? { ...t, ...updatedTable } : t))
    );
    setEditingTable(null);
    fetchTablesData();
  };

  const handleConfirmDelete = async () => {
    if (!deletingTable) return;
    setIsDeleting(true);
    try {
      await api.delete(`/tables/${deletingTable.id}`);
      setTables((prev) => prev.filter((t) => t.id !== deletingTable.id));
      setDeletingTable(null);
      fetchTablesData();
    } catch (err) {
      console.warn("Lỗi API xóa bàn, cập nhật local state:", err);
      setTables((prev) => prev.filter((t) => t.id !== deletingTable.id));
      setDeletingTable(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (tableId, nextStatus) => {
    try {
      await api.patch(`/tables/${tableId}/status`, { status: nextStatus });
      fetchTablesData();
    } catch (err) {
      console.warn("Lỗi cập nhật trạng thái bàn:", err);
    }
  };

  // ── Zone CRUD handlers ──────────────────────────────────────
  const handleStartEditZone = (z) => {
    setEditingZone(z);
    setEditZoneName(z.name);
    setZoneError("");
  };

  const handleSaveEditZone = async () => {
    if (!editZoneName.trim()) {
      setZoneError("Vui lòng nhập tên khu vực!");
      return;
    }
    setZoneError("");
    try {
      await api.put(`/zones/${editingZone.id}`, { name: editZoneName.trim() });
      setZonesList((prev) =>
        prev.map((z) => (z.id === editingZone.id ? { ...z, name: editZoneName.trim() } : z))
      );
      setEditingZone(null);
      fetchTablesData();
    } catch (err) {
      setZoneError(err?.response?.data?.message || "Không thể cập nhật khu vực!");
    }
  };

  const handleConfirmDeleteZone = async () => {
    if (!deletingZone) return;
    setIsDeletingZone(true);
    try {
      await api.delete(`/zones/${deletingZone.id}`);
      setZonesList((prev) => prev.filter((z) => z.id !== deletingZone.id));
      if (zone === deletingZone.name) setZone("all");
      setDeletingZone(null);
      fetchTablesData();
    } catch (err) {
      console.warn("Lỗi xóa khu vực:", err);
      setDeletingZone(null);
    } finally {
      setIsDeletingZone(false);
    }
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) {
      setZoneError("Vui lòng nhập tên khu vực!");
      return;
    }
    setZoneError("");
    setAddingZone(true);
    try {
      const res = await api.post("/zones", { name: newZoneName.trim() });
      setZonesList((prev) => [...prev, res.data]);
      setNewZoneName("");
      fetchTablesData();
    } catch (err) {
      setZoneError(err?.response?.data?.message || "Không thể thêm khu vực!");
    } finally {
      setAddingZone(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 3 thẻ thống kê */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Thanh tab khu vực + nút làm mới */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ZoneTabs tabs={tabs} active={zone} onChange={setZone} />

        <div className="flex items-center gap-2 self-end text-xs text-stone-500 sm:self-auto">
          <span>Cập nhật: {formatTime(updatedAt)}</span>

          {/* Nút Quản lý khu vực */}
          <button
            type="button"
            onClick={() => { setShowZoneManager(true); setZoneError(""); }}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white shadow-xs hover:bg-orange-50 hover:text-orange-600 text-stone-600 font-semibold transition border border-stone-200/80 text-[11px]"
            title="Quản lý khu vực"
          >
            <MapPin size={12} />
            <span className="hidden sm:inline">Khu vực</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-xs hover:bg-stone-50 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-brand" : "text-stone-500"} />
          </button>
        </div>
      </div>

      {/* Lưới bàn */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {visibleTables.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            onShowQr={() => setQrTable(t)}
            onEdit={() => setEditingTable(t)}
            onDelete={() => setDeletingTable(t)}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Modal QR Code */}
      {qrTable && <QrModal table={qrTable} onClose={() => setQrTable(null)} />}

      {/* Modal Thêm bàn mới */}
      <AddTableModal
        isOpen={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        zones={zonesList}
        onTableCreated={fetchTablesData}
      />

      {/* Modal Chỉnh sửa bàn khi ấn nút 3 chấm -> Sửa */}
      {editingTable && (
        <EditTableModal
          isOpen={Boolean(editingTable)}
          onClose={() => setEditingTable(null)}
          table={editingTable}
          zones={zonesList}
          onTableUpdated={handleTableUpdated}
        />
      )}

      {/* Modal Xác nhận Xóa bàn khi ấn nút 3 chấm -> Xóa */}
      {deletingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base mb-1">
              Xác nhận xóa bàn?
            </h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-bold text-stone-800">
                {deletingTable.name || `Bàn ${deletingTable.number}`}
              </span>{" "}
              thuộc khu vực{" "}
              <span className="font-bold text-stone-800">
                {deletingTable.zone_name || deletingTable.zone}
              </span>{" "}
              không? Mã QR và thiết lập liên quan sẽ bị gỡ bỏ.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingTable(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md disabled:bg-stone-300"
              >
                {isDeleting ? "Đang xóa..." : "Xóa bàn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL QUẢN LÝ KHU VỰC (Thêm / Sửa / Xóa khu vực)
          ══════════════════════════════════════════════════════════ */}
      {showZoneManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-100 animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm leading-tight">Quản lý khu vực</h3>
                  <p className="text-[11px] text-stone-500 font-medium">Thêm, sửa tên, xóa khu vực bàn</p>
                </div>
              </div>
              <button
                onClick={() => { setShowZoneManager(false); setEditingZone(null); setZoneError(""); setNewZoneName(""); }}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Danh sách khu vực */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
              {zonesList.length === 0 && (
                <p className="text-xs text-center text-stone-400 py-6">Chưa có khu vực nào.</p>
              )}

              {zonesList.map((z) => (
                <div
                  key={z.id}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-stone-50 px-4 py-3"
                >
                  <MapPin size={14} className="shrink-0 text-orange-500" />

                  {editingZone?.id === z.id ? (
                    /* Inline edit mode */
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editZoneName}
                        onChange={(e) => { setEditZoneName(e.target.value); setZoneError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEditZone(); if (e.key === "Escape") setEditingZone(null); }}
                        className="flex-1 rounded-lg border border-orange-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                      />
                      <button
                        onClick={handleSaveEditZone}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
                        title="Lưu"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => { setEditingZone(null); setZoneError(""); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 transition"
                        title="Hủy"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{z.name}</p>
                        <p className="text-[10.5px] text-stone-400 font-medium">
                          {tables.filter((t) => (t.zone_name || t.zone) === z.name).length} bàn
                        </p>
                      </div>
                      <button
                        onClick={() => handleStartEditZone(z)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-orange-50 hover:text-orange-600 transition"
                        title="Sửa tên khu vực"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingZone(z)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Xóa khu vực"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Thêm khu vực mới */}
            <div className="px-6 pb-5 pt-3 border-t border-stone-100 space-y-2">
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Thêm khu vực mới</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: Tầng 2, Sân thượng, Phòng VIP..."
                  value={newZoneName}
                  onChange={(e) => { setNewZoneName(e.target.value); setZoneError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddZone(); }}
                  className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:bg-white focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleAddZone}
                  disabled={addingZone}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E06D44] hover:bg-[#c85d36] text-white text-xs font-bold transition disabled:opacity-60 shadow-sm"
                >
                  <Plus size={14} />
                  <span>{addingZone ? "Đang thêm..." : "Thêm"}</span>
                </button>
              </div>
              {zoneError && (
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {zoneError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa khu vực */}
      {deletingZone && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base mb-1">Xác nhận xóa khu vực?</h3>
            <p className="text-xs text-stone-500 mb-1 leading-relaxed font-medium">
              Bạn có chắc muốn xóa khu vực{" "}
              <span className="font-bold text-stone-800">"{deletingZone.name}"</span>?
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-2 mb-5 font-medium">
              ⚠️ Các bàn trong khu vực này sẽ không còn được phân loại theo khu vực, nhưng sẽ không bị xóa.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingZone(null)}
                disabled={isDeletingZone}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteZone}
                disabled={isDeletingZone}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md disabled:bg-stone-300"
              >
                {isDeletingZone ? "Đang xóa..." : "Xóa khu vực"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
