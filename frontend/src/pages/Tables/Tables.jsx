import { useState, useEffect } from "react";
import { Armchair, Users, CircleCheck, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
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
    </div>
  );
}
