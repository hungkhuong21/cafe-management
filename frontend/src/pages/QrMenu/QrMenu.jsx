import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import {
  Coffee,
  Search,
  Plus,
  Minus,
  X,
  CheckCircle2,
  AlertCircle,
  Armchair,
  ArrowRight,
  Info,
  ChevronLeft,
  Lock,
  ShoppingBag,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

// Danh mục ban đầu
const DEFAULT_QR_CATEGORIES = [{ id: "all", name: "Tất cả" }];

export default function QrMenuPage() {
  const [searchParams] = useSearchParams();
  const { tableId: paramTableId } = useParams();

  // Đọc cấu hình quán từ localStorage (đồng bộ từ trang Cài đặt / Admin)
  const [storeInfo, setStoreInfo] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("cf_store"));
      return {
        name: s?.name || "CafeFlow",
        branch: s?.branch || "Nguyễn Huệ • HCM",
        logo: s?.logo || null,
      };
    } catch {
      return { name: "CafeFlow", branch: "Nguyễn Huệ • HCM", logo: null };
    }
  });

  // Lắng nghe thay đổi store từ các tab/cửa sổ khác
  useEffect(() => {
    const handleStorage = () => {
      try {
        const s = JSON.parse(localStorage.getItem("cf_store"));
        if (s) {
          setStoreInfo({
            name: s.name || "CafeFlow",
            branch: s.branch || "Nguyễn Huệ • HCM",
            logo: s.logo || null,
          });
        }
      } catch (err) {}
    };
    window.addEventListener("cf_storage_update", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("cf_storage_update", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Tải cấu hình quán từ CSDL (GET /settings)
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get("/settings");
        if (res.data) {
          setStoreInfo({
            name: res.data.name || "CafeFlow",
            branch: res.data.branch || "Nguyễn Huệ • HCM",
            logo: res.data.logo_url || null,
          });
        }
      } catch (err) {}
    };
    fetchStore();
  }, []);

  // Xác định số bàn hoặc tableId từ URL (?table=08 hoặc /qr/08 hoặc /qr/<token>)
  const initialTableNumber = searchParams.get("table") || paramTableId || "08";

  // State màn hình chính: 'menu' (Thực đơn) | 'cart' (Giỏ hàng)
  const [currentScreen, setCurrentScreen] = useState("menu");

  // State thông tin bàn
  const [tableNumber, setTableNumber] = useState(
    initialTableNumber.length === 1 ? `0${initialTableNumber}` : initialTableNumber
  );
  const [currentZone, setCurrentZone] = useState("Lầu 1");
  const [currentSeats, setCurrentSeats] = useState(4);
  const [allDbTables, setAllDbTables] = useState([]);
  const [allDbZones, setAllDbZones] = useState([]);

  // Ref để track việc user đã đổi bàn thủ công — ngăn fetchTableInfo ghi đè lại
  const manualTableSwitch = useRef(null); // null = chưa đổi; string = số bàn mới

  // Modal Chọn / Đổi bàn
  const [showSelectTableModal, setShowSelectTableModal] = useState(false);
  const [selectedZoneTab, setSelectedZoneTab] = useState("Tất cả");
  const [tempSelectedTable, setTempSelectedTable] = useState("08");

  // Modal Xác nhận đổi bàn giữ nguyên giỏ
  const [showConfirmChangeModal, setShowConfirmChangeModal] = useState(false);
  const [targetTable, setTargetTable] = useState(null);

  // Thông báo hoàn thành
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [changeTableSuccess, setChangeTableSuccess] = useState(false);

  // Dữ liệu Thực đơn & Danh mục từ API
  const [categories, setCategories] = useState(DEFAULT_QR_CATEGORIES);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Giỏ hàng
  const [cart, setCart] = useState([]);

  // Modal Ghi chú món
  const [editingNoteItem, setEditingNoteItem] = useState(null);
  const [tempNoteText, setTempNoteText] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Tải thông tin bàn từ database
  useEffect(() => {
    const fetchTableInfo = async () => {
      try {
        const [tablesRes, zonesRes] = await Promise.all([
          api.get("/tables").catch(() => ({ data: [] })),
          api.get("/zones").catch(() => ({ data: [] })),
        ]);

        const tables = tablesRes.data || [];
        setAllDbTables(tables);

        const zones = zonesRes.data || [];
        setAllDbZones(zones);

        const found = tables.find(
          (t) =>
            String(t.qr_token) === String(paramTableId) ||
            String(t.id) === String(paramTableId) ||
            String(t.number) === String(paramTableId) ||
            `0${t.number}` === String(paramTableId) ||
            String(t.number) === String(searchParams.get("table"))
        );

        if (found) {
          // Chỉ cập nhật tableNumber nếu user CHƯA đổi bàn thủ công
          if (manualTableSwitch.current === null) {
            setTableNumber(String(found.number).padStart(2, "0"));
            if (found.zone_name) setCurrentZone(found.zone_name);
            if (found.seats) setCurrentSeats(found.seats);
            if (found.zone_name) setSelectedZoneTab(found.zone_name);
          } else {
            // User đã đổi bàn thủ công — cập nhật zone/seats từ bàn mới (manualTableSwitch)
            const switchedTable = tables.find(
              (t) => String(t.number).padStart(2, "0") === manualTableSwitch.current
            );
            if (switchedTable) {
              if (switchedTable.zone_name) setCurrentZone(switchedTable.zone_name);
              if (switchedTable.seats) setCurrentSeats(switchedTable.seats);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tìm thông tin bàn:", err);
      }
    };
    fetchTableInfo();
  }, [paramTableId, searchParams]);

  // Tải danh mục và menu thực tế từ API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catsRes, menuRes] = await Promise.all([
          api.get("/categories").catch(() => ({ data: [] })),
          api.get("/menu-items").catch(() => ({ data: [] })),
        ]);

        if (catsRes.data && catsRes.data.length > 0) {
          setCategories(catsRes.data);
        }

        if (menuRes.data && menuRes.data.length > 0) {
          setMenuItems(menuRes.data);
        }
      } catch (err) {
        console.warn("Lỗi tải danh mục & menu QR:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sourceItems = menuItems;

  // Lọc món theo danh mục & tìm kiếm
  const filteredItems = useMemo(() => {
    return sourceItems.filter((item) => {
      const matchCat =
        selectedCategory === "all" ||
        item.category_id === selectedCategory ||
        item.category_id === Number(selectedCategory) ||
        String(item.category_id) === String(selectedCategory);

      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      return matchCat && matchSearch;
    });
  }, [sourceItems, selectedCategory, searchQuery]);

  // Thao tác giỏ hàng
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          image_url: item.image_url,
          quantity: 1,
          note: "",
        },
      ];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemNote = (id, newNote) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note: newNote } : item))
    );
  };

  const totalQuantity = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Hàm thực thi đổi bàn: Bàn cũ -> 'free' (trống), Bàn mới -> 'occupied' (đang dùng)
  const executeSwitchTable = async (oldTableStr, newTableStr, targetObj) => {
    const fromNum = parseInt(oldTableStr, 10);
    const toNum = parseInt(newTableStr, 10);

    setTableNumber(newTableStr);
    // Đánh dấu user đã đổi bàn thủ công để fetchTableInfo không ghi đè lại
    manualTableSwitch.current = newTableStr;
    if (targetObj?.zone_name || targetObj?.zone) {
      setCurrentZone(targetObj.zone_name || targetObj.zone);
    }
    if (targetObj?.seats) setCurrentSeats(targetObj.seats);

    // Cập nhật ngay trong local state danh sách bàn để phản ánh tức thì
    setAllDbTables((prev) =>
      prev.map((t) => {
        if (Number(t.number) === fromNum) return { ...t, status: "free" };
        if (Number(t.number) === toNum) return { ...t, status: "occupied" };
        return t;
      })
    );

    // Gọi API cập nhật trạng thái trong database (Bàn cũ: free, Bàn mới: occupied)
    try {
      await api.post("/tables/switch", {
        from_table_number: fromNum,
        to_table_number: toNum,
      });
    } catch (err) {
      console.warn("Lỗi API /tables/switch, thử cập nhật từng bàn:", err);
      const fromObj = allDbTables.find((t) => Number(t.number) === fromNum);
      const toObj = allDbTables.find((t) => Number(t.number) === toNum);
      if (fromObj?.id) {
        api.patch(`/tables/${fromObj.id}/status`, { status: "free" }).catch(() => {});
      }
      if (toObj?.id) {
        api.patch(`/tables/${toObj.id}/status`, { status: "occupied" }).catch(() => {});
      }
    }
  };

  // Mở màn hình Chọn / Đổi bàn
  const handleOpenSelectTable = () => {
    setTempSelectedTable(tableNumber);
    setShowSelectTableModal(true);
  };

  // Xác nhận chuyển bàn từ Modal
  const handleConfirmTableSelection = () => {
    if (tempSelectedTable === tableNumber) {
      setShowSelectTableModal(false);
      return;
    }

    const selectedObj = allDbTables.find(
      (t) => String(t.number).padStart(2, "0") === tempSelectedTable
    );

    if (cart.length > 0) {
      setTargetTable({
        number: tempSelectedTable,
        zone: selectedObj?.zone_name || selectedZoneTab || "Khu vực chính",
        seats: selectedObj?.seats || 4,
        status: "Trống • Có thể chọn",
      });
      setShowSelectTableModal(false);
      setShowConfirmChangeModal(true);
    } else {
      executeSwitchTable(tableNumber, tempSelectedTable, selectedObj);
      setShowSelectTableModal(false);
      setChangeTableSuccess(true);
    }
  };

  // Xác nhận đổi bàn giữ nguyên giỏ hàng
  const handleFinalChangeTable = () => {
    if (targetTable) {
      executeSwitchTable(tableNumber, targetTable.number, targetTable);
    }
    setShowConfirmChangeModal(false);
    setChangeTableSuccess(true);
  };

  // Gửi đơn hàng
  const handleSendOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const currentObj = allDbTables.find(
        (t) =>
          String(t.qr_token) === String(paramTableId) ||
          String(t.number) === String(tableNumber) ||
          Number(t.number) === parseInt(tableNumber, 10) ||
          t.id === parseInt(tableNumber, 10)
      );
      const parsedNum = parseInt(tableNumber, 10);
      const targetTableId = currentObj
        ? currentObj.id
        : (!isNaN(parsedNum) ? parsedNum : null);

      const tableLabel = currentObj
        ? `Bàn ${String(currentObj.number).padStart(2, "0")}`
        : `Bàn ${tableNumber}`;

      const payload = {
        table_id: targetTableId,
        service_type: "dine_in",
        customer_name: tableLabel,
        items: cart.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          note: i.note || undefined,
        })),
      };

      const res = await api.post("/orders", payload);

      // Cập nhật trạng thái bàn hiện tại thành 'occupied' (đang dùng)
      if (currentObj?.id) {
        api.patch(`/tables/${currentObj.id}/status`, { status: "occupied" }).catch(() => {});
      }

      setOrderSuccess(true);
      setCart([]);
      setCurrentScreen("menu");
    } catch (err) {
      console.error("Lỗi gửi đơn hàng:", err);
      const data = err.response?.data;
      const errorObj = data?.error;
      const msg =
        (typeof errorObj === "object" ? errorObj?.message : errorObj) ||
        data?.message ||
        err.message ||
        "Gửi đơn thất bại!";
      alert(`Không thể gửi đơn: ${Array.isArray(msg) ? msg[0] : msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Danh sách bàn hiển thị trong modal chọn bàn
  const displayTables = useMemo(() => {
    if (allDbTables.length > 0) {
      return allDbTables
        .filter((t) => {
          if (selectedZoneTab === "Tất cả") return true;
          return t.zone_name === selectedZoneTab;
        })
        .map((t) => ({
          number: String(t.number).padStart(2, "0"),
          seats: t.seats || 4,
          status:
            String(t.number).padStart(2, "0") === tableNumber
              ? "current"
              : t.status === "occupied"
              ? "occupied"
              : t.status === "reserved"
              ? "reserved"
              : "free",
          label:
            String(t.number).padStart(2, "0") === tableNumber
              ? "Đang dùng • Bàn của bạn"
              : t.status === "occupied"
              ? "Đang có khách"
              : t.status === "reserved"
              ? "Đã được đặt"
              : "Trống • Có thể chọn",
        }));
    }

    // Dự phòng khi chưa có bàn trong DB
    return [
      { number: "06", seats: 4, status: "occupied", label: "Đang có khách" },
      { number: "07", seats: 4, status: "reserved", label: "Đã được đặt" },
      { number: "08", seats: 4, status: "current", label: "Đang dùng • Bàn của bạn" },
      { number: "09", seats: 4, status: "free", label: "Trống • Có thể chọn" },
      { number: "10", seats: 2, status: "free", label: "Trống • Có thể chọn" },
      { number: "11", seats: 6, status: "free", label: "Trống • Có thể chọn" },
    ];
  }, [allDbTables, selectedZoneTab, tableNumber]);

  return (
    <div
      className="w-full bg-[#FBF9F6] sm:bg-[#201A16] flex justify-center sm:items-center text-stone-800 antialiased font-sans select-none overflow-hidden"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {/* Khung giao diện: Trên di động = 100% full màn hình chuẩn app; Trên PC/Tablet = khung mockup bo tròn */}
      <div
        className="w-full h-full sm:max-w-md sm:h-[860px] sm:max-h-[92vh] sm:rounded-[40px] sm:shadow-2xl sm:border sm:border-stone-200/50 bg-[#FBF9F6] flex flex-col overflow-hidden"
      >

        {/* ============================================================== */}
        {/* HEADER: LOGO QUÁN + TÊN QUÁN + THẺ BÀN & NÚT ĐỔI BÀN            */}
        {/* ============================================================== */}
        <header className="safe-pt px-4 pt-3 pb-2.5 sm:px-5 flex items-center justify-between flex-shrink-0 bg-[#FBF9F6] border-b border-stone-200/60 z-30">
          <div className="flex items-center gap-3">
            {storeInfo.logo ? (
              <img
                src={getImageUrl(storeInfo.logo)}
                alt={storeInfo.name}
                className="w-10 h-10 rounded-2xl object-cover shadow-xs border border-stone-200/60"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#2E2018] flex items-center justify-center text-white shadow-sm">
                <Coffee className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-stone-900 tracking-tight leading-tight flex items-center gap-1.5">
                <span>{storeInfo.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-[11px] font-medium text-stone-500">
                {storeInfo.branch}
              </p>
            </div>
          </div>

          {currentScreen === "cart" ? (
            <button
              onClick={() => setCurrentScreen("menu")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Thực đơn</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 pl-3 pr-1.5 shadow-xs border border-stone-200/80">
              <div className="leading-tight text-left">
                <span className="block text-[9px] uppercase tracking-wider text-stone-400 font-bold">
                  Bàn phục vụ
                </span>
                <span className="block text-xs font-black text-[#2E2018]">
                  Bàn {tableNumber}
                </span>
              </div>
              <button
                onClick={handleOpenSelectTable}
                className="px-2.5 py-1.5 bg-[#2E2018] hover:bg-[#433126] text-white text-[11px] font-bold rounded-xl transition shadow-xs active:scale-95"
              >
                Đổi bàn
              </button>
            </div>
          )}
        </header>

        {/* ============================================================== */}
        {/* MÀN HÌNH 1: THỰC ĐƠN / ĐẶT HÀNG TẠI BÀN                         */}
        {/* ============================================================== */}
        {currentScreen === "menu" && (
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tiêu đề & Lời chào thân thiện */}
            <div className="px-4 pt-3 pb-1 sm:px-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                    <span>Thực đơn tại bàn</span>
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5 font-medium">
                    Chọn món yêu thích, chúng tôi sẽ phục vụ tận bàn của bạn.
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-stone-100 border border-stone-200/60 rounded-xl text-[10px] font-bold text-stone-600">
                    {currentZone}
                  </span>
                </div>
              </div>
            </div>

            {/* Thanh tìm kiếm món */}
            <div className="px-4 my-2 sm:px-5 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tìm cà phê, trà trái cây, bánh ngọt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white rounded-2xl py-2.5 pl-10 pr-9 text-xs sm:text-sm font-medium text-stone-800 placeholder-stone-400 shadow-xs border border-stone-200/80 focus:outline-none focus:ring-2 focus:ring-[#2E2018]/20 focus:border-[#2E2018] transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Thanh Tab Danh mục (Cuộn ngang êm ái, chạm nhạy) */}
            <div className="px-4 mb-2 sm:px-5 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === "all"
                      ? "bg-[#2E2018] text-white shadow-sm"
                      : "bg-white text-stone-600 border border-stone-200/70 hover:bg-stone-50"
                  }`}
                >
                  Tất cả ({sourceItems.length})
                </button>
                {categories.map((cat) => {
                  const isCatSelected =
                    selectedCategory === cat.id ||
                    String(selectedCategory) === String(cat.id);
                  const count = sourceItems.filter(
                    (i) =>
                      i.category_id === cat.id ||
                      String(i.category_id) === String(cat.id)
                  ).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                        isCatSelected
                          ? "bg-[#2E2018] text-white shadow-sm"
                          : "bg-white text-stone-600 border border-stone-200/70 hover:bg-stone-50"
                      }`}
                    >
                      {cat.name} {count > 0 ? `(${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Danh sách Thẻ món ăn - Cuộn mượt ở giữa */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-1 space-y-3 pb-3">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-stone-400">
                  <div className="w-8 h-8 border-2 border-stone-300 border-t-[#2E2018] rounded-full animate-spin mb-3" />
                  <p className="text-xs font-medium">Đang tải thực đơn...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-20 text-center text-stone-400 font-medium">
                  <Coffee className="w-10 h-10 mx-auto text-stone-300 mb-2 stroke-[1.5]" />
                  <p className="text-xs">Không tìm thấy món ăn phù hợp.</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-xs font-bold text-[#E06D44] underline"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  )}
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const inCartItem = cart.find((i) => i.id === item.id);
                  const isSelected = !!inCartItem;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-3xl p-3 sm:p-3.5 shadow-xs border transition-all duration-200 ${
                        isSelected
                          ? "border-[#2E2018]/40 ring-1 ring-[#2E2018]/10"
                          : "border-stone-200/70 hover:border-stone-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex gap-3 items-center">
                        {/* Ảnh món ăn */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0 relative border border-stone-200/60 shadow-2xs">
                          {item.image_url ? (
                            <img
                              src={getImageUrl(item.image_url)}
                              alt={item.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=240&auto=format&fit=crop&q=80";
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400">
                              <Coffee className="w-8 h-8 stroke-[1.5]" />
                            </div>
                          )}
                          {idx === 0 && (
                            <span className="absolute top-1.5 left-1.5 text-[8px] font-black text-white bg-[#D95D39] px-2 py-0.5 rounded-md shadow-xs">
                              BEST
                            </span>
                          )}
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 line-clamp-1 leading-snug">
                                {item.name}
                              </h3>
                              {idx === 1 && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 border border-emerald-200/50">
                                  Mới
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5 leading-tight">
                              {item.description || item.code || "Hương vị nguyên bản, chuẩn phong vị CafeFlow."}
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-black text-[#2E2018]">
                              {Number(item.price).toLocaleString("vi-VN")}đ
                            </span>

                            {isSelected ? (
                              <div className="flex items-center gap-1.5 bg-[#F6F3EF] rounded-2xl p-1 shadow-xs border border-stone-200/50">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-7 h-7 rounded-xl bg-white flex items-center justify-center text-stone-700 hover:bg-stone-50 active:scale-90 transition shadow-2xs"
                                  aria-label="Giảm"
                                >
                                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                                <span className="text-xs font-extrabold w-5 text-center text-stone-900">
                                  {inCartItem.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addToCart(item)}
                                  className="w-7 h-7 rounded-xl bg-[#2E2018] flex items-center justify-center text-white hover:bg-[#433126] active:scale-90 transition shadow-2xs"
                                  aria-label="Tăng"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#2E2018] hover:bg-[#433126] text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Chọn món</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ghi chú khi đã chọn */}
                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteItem(inCartItem);
                              setTempNoteText(inCartItem.note || "");
                            }}
                            className="text-[11px] text-stone-500 hover:text-stone-800 text-left truncate flex items-center gap-1.5 flex-1 mr-2"
                          >
                            <Pencil className="w-3 h-3 text-[#E06D44] shrink-0" />
                            {inCartItem.note ? (
                              <span className="text-stone-800 font-medium italic truncate">
                                "{inCartItem.note}"
                              </span>
                            ) : (
                              <span className="text-stone-400">
                                + Thêm ghi chú (ít đá, ít đường...)
                              </span>
                            )}
                          </button>
                          <span
                            onClick={() => {
                              setEditingNoteItem(inCartItem);
                              setTempNoteText(inCartItem.note || "");
                            }}
                            className="text-[10px] font-bold text-[#E06D44] cursor-pointer hover:underline shrink-0"
                          >
                            {inCartItem.note ? "Sửa" : "Thêm"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Thanh Giỏ hàng cố định đáy màn hình (Docked Bottom Bar) */}
            <div className="flex-shrink-0 px-3 pt-2.5 pb-2.5 sm:px-4 bg-white/98 backdrop-blur-md border-t border-stone-200/70 shadow-lg z-20 safe-pb">
              {totalQuantity > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-orange-100 flex items-center justify-center text-[#E06D44]">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-stone-600">
                        {cart.length} món • {totalQuantity} phần
                      </span>
                    </div>
                    <div className="text-right leading-none">
                      <span className="text-[10px] text-stone-400 block font-medium">Tạm tính</span>
                      <span className="text-base font-black text-[#D95D39]">
                        {totalAmount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentScreen("cart")}
                    className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-[#2E2018] hover:bg-[#3D2C22] text-white tracking-wide shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99]"
                  >
                    <span>Xem giỏ hàng ({totalQuantity})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
                    <Coffee className="w-4 h-4 text-stone-400" />
                    <span>Chưa chọn món nào</span>
                  </div>
                  <button
                    disabled
                    className="py-3 px-6 rounded-2xl font-bold text-xs bg-stone-200 text-stone-400 cursor-not-allowed"
                  >
                    Giỏ trống
                  </button>
                </div>
              )}
            </div>
          </main>
        )}

        {/* ============================================================== */}
        {/* MÀN HÌNH 2: GIỎ HÀNG CỦA BẠN (XÁC NHẬN GỌI MÓN)                 */}
        {/* ============================================================== */}
        {currentScreen === "cart" && (
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 pt-3 pb-1 sm:px-5 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Giỏ hàng của bạn
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
                Kiểm tra danh sách món trước khi gửi tới quầy pha chế.
              </p>
            </div>

            {/* Banner hiển thị bàn phục vụ */}
            <div className="px-4 my-2 sm:px-5 flex-shrink-0">
              <div className="flex items-center justify-between bg-stone-100 rounded-2xl p-2.5 sm:p-3 border border-stone-200/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#2E2018] shadow-2xs">
                    <Armchair className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      Phục vụ tại bàn
                    </span>
                    <span className="block text-xs font-black text-stone-900">
                      Bàn {tableNumber} • {currentZone}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleOpenSelectTable}
                  className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold rounded-xl border border-stone-200/80 shadow-2xs transition active:scale-95"
                >
                  Đổi bàn
                </button>
              </div>
            </div>

            {/* Danh sách món trong giỏ - cuộn ở giữa */}
            {cart.length > 0 ? (
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-1 space-y-3 pb-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500 px-1">
                  <span>Món đã chọn ({cart.length})</span>
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-500 font-semibold hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-3.5 shadow-xs border border-stone-200/70 space-y-2.5"
                  >
                    <div className="flex gap-3 items-center">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=240&auto=format&fit=crop&q=80";
                        }}
                        className="w-16 h-16 rounded-2xl object-cover bg-stone-100 border border-stone-200/60 shrink-0 shadow-2xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-extrabold text-stone-900 truncate">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-stone-300 hover:text-red-500 p-0.5 transition"
                            title="Xóa món"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {Number(item.price).toLocaleString("vi-VN")}đ / phần
                        </p>

                        <div className="mt-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 bg-[#F6F3EF] rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-stone-700 shadow-2xs active:scale-90"
                            >
                              <Minus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <span className="text-xs font-extrabold w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-[#2E2018] flex items-center justify-center text-white shadow-2xs active:scale-90"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>

                          <span className="text-xs sm:text-sm font-black text-stone-900">
                            {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => {
                          setEditingNoteItem(item);
                          setTempNoteText(item.note || "");
                        }}
                        className="text-stone-500 hover:text-stone-800 text-left truncate flex items-center gap-1.5 flex-1 mr-2"
                      >
                        <Pencil className="w-3 h-3 text-[#E06D44] shrink-0" />
                        {item.note ? (
                          <span className="text-stone-800 italic font-medium truncate">
                            "{item.note}"
                          </span>
                        ) : (
                          <span className="text-stone-400">+ Thêm ghi chú cho món...</span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingNoteItem(item);
                          setTempNoteText(item.note || "");
                        }}
                        className="text-[11px] font-bold text-[#E06D44] hover:underline shrink-0"
                      >
                        {item.note ? "Sửa" : "Thêm ghi chú"}
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setCurrentScreen("menu")}
                  className="w-full py-3 bg-white hover:bg-stone-50 text-stone-800 border border-dashed border-stone-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Chọn thêm món khác</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 text-center py-20">
                <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-black text-stone-800 mb-1">
                  Giỏ hàng của bạn đang trống
                </h3>
                <p className="text-xs text-stone-400 mb-5 leading-relaxed max-w-[240px]">
                  Hãy chọn một ly đồ uống mát lạnh hoặc bánh ngọt thơm ngon nhé!
                </p>
                <button
                  onClick={() => setCurrentScreen("menu")}
                  className="px-6 py-3 bg-[#2E2018] hover:bg-[#3D2C22] text-white rounded-2xl font-bold text-xs tracking-wide shadow-md transition"
                >
                  Xem thực đơn ngay
                </button>
              </div>
            )}

            {/* Thanh Xác nhận gửi đơn cố định đáy */}
            {cart.length > 0 && (
              <div className="flex-shrink-0 px-3 pt-2.5 pb-2.5 sm:px-4 bg-white/98 backdrop-blur-md border-t border-stone-200/70 shadow-lg z-20 safe-pb">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="leading-tight">
                    <span className="block text-[10px] text-stone-400 font-medium">
                      Tổng tiền thanh toán sau khi dùng
                    </span>
                    <span className="block text-xs font-bold text-stone-700">
                      Tổng cộng ({totalQuantity} phần)
                    </span>
                  </div>
                  <span className="text-lg font-black text-[#D95D39]">
                    {totalAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                <button
                  onClick={handleSendOrder}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide bg-[#2E2018] hover:bg-[#3D2C22] text-white shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-75"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang gửi tới quầy pha chế...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận gọi món • Bàn {tableNumber}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-stone-400 text-center mt-2 font-medium">
                  Nhân viên sẽ pha chế và mang trực tiếp đến bàn của bạn.
                </p>
              </div>
            )}
          </main>
        )}

        {/* ============================================================== */}
        {/* MODAL 1: CHỌN / ĐỔI BÀN (Tương thích DB thực tế)              */}
        {/* ============================================================== */}
        {showSelectTableModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-md bg-[#FBF9F6] rounded-t-[36px] sm:rounded-[36px] p-5 pb-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#2E2018] flex items-center justify-center text-white">
                    <Armchair className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900 leading-none">
                      Chọn / Đổi bàn phục vụ
                    </h3>
                    <p className="text-[11px] font-medium text-stone-500 mt-1">
                      Đang ở Bàn {tableNumber} • {currentZone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSelectTableModal(false)}
                  className="w-8 h-8 rounded-full bg-white border border-stone-200/80 flex items-center justify-center text-stone-500 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lọc theo khu vực */}
              <div className="pt-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-900">Khu vực quán</span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {displayTables.filter((t) => t.status === "free").length} bàn trống
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedZoneTab("Tất cả")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      selectedZoneTab === "Tất cả"
                        ? "bg-[#2E2018] text-white shadow-xs"
                        : "bg-white text-stone-700 border border-stone-200/80"
                    }`}
                  >
                    Tất cả
                  </button>
                  {allDbZones.length > 0
                    ? allDbZones.map((z) => (
                        <button
                          key={z.id}
                          onClick={() => setSelectedZoneTab(z.name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                            selectedZoneTab === z.name
                              ? "bg-[#2E2018] text-white shadow-xs"
                              : "bg-white text-stone-700 border border-stone-200/80"
                          }`}
                        >
                          {z.name}
                        </button>
                      ))
                    : ["Tầng trệt", "Lầu 1", "Sân vườn"].map((zone) => (
                        <button
                          key={zone}
                          onClick={() => setSelectedZoneTab(zone)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                            selectedZoneTab === zone
                              ? "bg-[#2E2018] text-white shadow-xs"
                              : "bg-white text-stone-700 border border-stone-200/80"
                          }`}
                        >
                          {zone}
                        </button>
                      ))}
                </div>
              </div>

              {/* Lưới bàn */}
              <div className="flex-1 overflow-y-auto pt-3 pb-2 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  {displayTables.map((t) => {
                    const isCurrent = t.number === tableNumber;
                    const isSelected = tempSelectedTable === t.number;
                    const isFree = t.status === "free";
                    const isOccupied = t.status === "occupied" && !isCurrent;
                    const isReserved = t.status === "reserved";

                    return (
                      <div
                        key={t.number}
                        onClick={() => {
                          if (isFree || isCurrent) {
                            setTempSelectedTable(t.number);
                          }
                        }}
                        className={`rounded-2xl p-3 border transition-all relative ${
                          isSelected
                            ? "bg-white border-2 border-[#2E2018] shadow-sm cursor-pointer"
                            : isFree
                            ? "bg-white border-stone-200/80 hover:border-stone-400 cursor-pointer"
                            : "bg-[#F3EFEA]/80 border-stone-200/40 cursor-not-allowed opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Armchair
                            className={`w-5 h-5 ${
                              isFree
                                ? "text-emerald-600"
                                : isSelected || isCurrent
                                ? "text-[#2E2018]"
                                : "text-stone-400"
                            }`}
                          />
                          {isCurrent ? (
                            <span className="text-[9px] font-black bg-[#2E2018] text-white px-2 py-0.5 rounded-full">
                              Bàn của bạn
                            </span>
                          ) : isOccupied || isReserved ? (
                            <Lock className="w-3.5 h-3.5 text-stone-400" />
                          ) : (
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                isSelected
                                  ? "border-4 border-[#2E2018]"
                                  : "border-stone-300"
                              }`}
                            />
                          )}
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-black text-stone-900">
                            Bàn {t.number}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium">
                            {t.seats} ghế
                          </span>
                        </div>

                        <p
                          className={`text-[10px] mt-1 font-semibold truncate ${
                            isFree
                              ? "text-emerald-600"
                              : isCurrent
                              ? "text-stone-800"
                              : isReserved
                              ? "text-blue-500"
                              : "text-stone-400"
                          }`}
                        >
                          • {t.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-start gap-2 bg-[#FFF3EC] border border-[#FFE1D1] rounded-2xl p-2.5 px-3">
                  <Info className="w-4 h-4 text-[#E06D44] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[#A84926] leading-tight font-medium">
                    Đổi bàn sẽ giữ nguyên tất cả món đang chọn và ghi chú của bạn.
                  </p>
                </div>
              </div>

              {/* Nút hành động ở đáy modal */}
              <div className="pt-3 border-t border-stone-200/70 shrink-0 space-y-2">
                <button
                  onClick={handleConfirmTableSelection}
                  className="w-full py-3.5 bg-[#2E2018] hover:bg-[#3D2C22] text-white rounded-2xl font-bold text-xs tracking-wide shadow-md flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                >
                  <span>Xác nhận chọn Bàn {tempSelectedTable}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSelectTableModal(false)}
                  className="w-full py-2.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-2xl font-bold text-xs transition"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: XÁC NHẬN ĐỔI BÀN KHI GIỎ HÀNG ĐANG CÓ MÓN            */}
        {/* ============================================================== */}
        {showConfirmChangeModal && targetTable && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] p-5 pb-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-3 sm:hidden" />

              <h3 className="text-lg font-black text-stone-900 tracking-tight leading-snug">
                Đổi sang Bàn {targetTable.number}?
              </h3>
              <p className="text-xs text-stone-500 mt-1 font-medium leading-relaxed">
                Giỏ hàng của bạn đang có {cart.length} món ({totalQuantity} phần). Bạn có muốn chuyển sang bàn mới và giữ nguyên các món đã chọn?
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex-1 bg-[#FBF9F6] rounded-2xl p-3 border border-stone-200/70">
                  <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">Bàn cũ</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Armchair className="w-4 h-4 text-stone-800" />
                    <span className="text-sm font-black text-stone-900">Bàn {tableNumber}</span>
                  </div>
                  <span className="block text-[10px] text-stone-500 mt-0.5">
                    {currentZone}
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />

                <div className="flex-1 bg-white rounded-2xl p-3 border-2 border-[#2E2018] shadow-xs">
                  <span className="block text-[10px] text-[#2E2018] font-bold uppercase tracking-wider">Bàn mới</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Armchair className="w-4 h-4 text-[#2E2018]" />
                    <span className="text-sm font-black text-stone-900">Bàn {targetTable.number}</span>
                  </div>
                  <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">
                    {targetTable.zone}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={handleFinalChangeTable}
                  className="w-full py-3.5 bg-[#2E2018] hover:bg-[#3E2B21] text-white rounded-2xl font-bold text-xs tracking-wide shadow-md transition active:scale-[0.99]"
                >
                  Xác nhận đổi sang Bàn {targetTable.number}
                </button>
                <button
                  onClick={() => setShowConfirmChangeModal(false)}
                  className="w-full py-2.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-2xl font-bold text-xs transition"
                >
                  Giữ nguyên Bàn {tableNumber}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* POPUP NHẬP GHI CHÚ RIÊNG CHO MÓN ĂN                             */}
        {/* ============================================================== */}
        {editingNoteItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full sm:max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-stone-900">
                  Ghi chú cho {editingNoteItem.name}
                </h4>
                <button
                  onClick={() => setEditingNoteItem(null)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Các gợi ý ghi chú nhanh */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Ít đá", "Nhiều đá", "Không đá", "Ít ngọt (50%)", "Không đường", "Mang về"].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setTempNoteText((prev) =>
                          prev ? `${prev}, ${tag}` : tag
                        );
                      }}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-semibold transition"
                    >
                      +{tag}
                    </button>
                  )
                )}
              </div>

              <textarea
                rows={3}
                value={tempNoteText}
                onChange={(e) => setTempNoteText(e.target.value)}
                placeholder="Nhập yêu cầu riêng cho món (ví dụ: để đá riêng, ít ngọt...)"
                className="w-full text-xs p-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#2E2018]/20 focus:border-[#2E2018] mb-3"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingNoteItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    updateItemNote(editingNoteItem.id, tempNoteText.trim());
                    setEditingNoteItem(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#2E2018] text-white text-xs font-bold hover:bg-[#433126] transition"
                >
                  Lưu ghi chú
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* POPUP THÀNH CÔNG: ĐẶT MÓN                                      */}
        {/* ============================================================== */}
        {orderSuccess && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 text-center max-w-xs shadow-2xl animate-in zoom-in-95 w-full">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-stone-900 mb-1">
                Đặt món thành công!
              </h3>
              <p className="text-xs text-stone-500 mb-4 font-medium leading-relaxed">
                Đơn hàng đã được chuyển tới quầy bar cho{" "}
                <span className="font-extrabold text-[#2E2018]">
                  Bàn {tableNumber}
                </span>
                . Bạn có thể thong thả nghỉ ngơi, món sẽ được mang ra ngay nhé!
              </p>
              <button
                onClick={() => setOrderSuccess(false)}
                className="w-full py-3 bg-[#2E2018] hover:bg-[#3D2C22] text-white rounded-2xl text-xs font-bold shadow-md transition"
              >
                Tiếp tục xem thực đơn
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* POPUP THÀNH CÔNG: ĐỔI BÀN                                      */}
        {/* ============================================================== */}
        {changeTableSuccess && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 text-center max-w-xs shadow-2xl animate-in zoom-in-95 w-full">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Armchair className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-stone-900 mb-1">
                Đổi bàn thành công!
              </h3>
              <p className="text-xs text-stone-500 mb-4 font-medium leading-relaxed">
                Đã chuyển sang{" "}
                <span className="font-extrabold text-[#2E2018]">
                  Bàn {tableNumber}
                </span>{" "}
                ({currentZone}). Toàn bộ món bạn đã chọn trong giỏ hàng được giữ nguyên.
              </p>
              <button
                onClick={() => setChangeTableSuccess(false)}
                className="w-full py-3 bg-[#2E2018] hover:bg-[#3D2C22] text-white rounded-2xl text-xs font-bold shadow-md transition"
              >
                Đồng ý
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
