import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Coffee,
} from "lucide-react";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

export default function QuickOrderModal({ isOpen, onClose, onOrderCreated }) {
  // Form states - Phần 1: Thông tin đơn hàng
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [serviceType, setServiceType] = useState("dine_in"); // dine_in | take_away
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Menu states - Phần 2: Chọn món
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart state - Danh sách món đã chọn
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch tables, categories, menu items khi modal mở
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tablesRes, catsRes, menuRes] = await Promise.all([
          api.get("/tables").catch(() => ({ data: [] })),
          api.get("/categories").catch(() => ({ data: [] })),
          api.get("/menu-items").catch(() => ({ data: [] })),
        ]);

        setTables(tablesRes.data || []);
        setCategories(catsRes.data || []);
        setMenuItems(menuRes.data || []);
      } catch (err) {
        setError("Không thể tải danh sách dữ liệu. Vui lòng thử lại!");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Reset form khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedTable("");
      setServiceType("dine_in");
      setCustomerName("");
      setCustomerPhone("");
      setCart([]);
      setSearchQuery("");
      setSelectedCategory("all");
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Lọc món theo search query và category
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        selectedCategory === "all" ||
        item.category_id === Number(selectedCategory);
      const matchSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Thao tác giỏ hàng
  const addToCart = (item) => {
    if (item.is_available === false) return;

    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.id === item.id);
      if (existing) {
        return prevCart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prevCart,
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
    setCart((prevCart) =>
      prevCart
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

  const updateItemNote = (id, note) => {
    setCart((prev) =>
      prev.map((item) =>
        String(item.id) === String(id) ? { ...item, note } : item
      )
    );
  };

  // Tính tổng tiền
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Gửi tạo đơn
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError("Vui lòng chọn ít nhất 1 món!");
      return;
    }

    if (serviceType === "dine_in" && !selectedTable) {
      setError("Vui lòng chọn bàn khi phục vụ Tại quán!");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        table_id: serviceType === "dine_in" ? Number(selectedTable) : null,
        service_type: serviceType,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          note: item.note || undefined,
        })),
      };

      await api.post("/orders", payload);
      setSuccessMsg("Tạo đơn hàng thành công!");

      setTimeout(() => {
        if (onOrderCreated) onOrderCreated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Có lỗi xảy ra khi tạo đơn!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-800">
                Tạo Đơn Hàng Nhanh
              </h2>
              <p className="text-xs text-stone-500">
                Thêm món và tạo order trực tiếp cho bàn hoặc mang về
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Thông báo lỗi / thành công */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 px-6 py-2.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Nội dung chia 2 cột */}
        <div className="flex flex-1 overflow-hidden">
          {/* CỘT TRÁI: PHẦN 2 - CHỌN MÓN */}
          <div className="flex flex-1 flex-col border-r border-stone-200 p-5">
            {/* Thanh tìm kiếm & lọc danh mục */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm món theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Danh mục */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === "all"
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  Tất cả ({menuItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      selectedCategory === cat.id
                        ? "bg-orange-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách món (Grid) */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-stone-400">
                  Đang tải danh sách món...
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-sm text-stone-400">
                  <Coffee className="mb-2 h-8 w-8 text-stone-300" />
                  Không tìm thấy món nào
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredMenuItems.map((item) => {
                    const isAvailable = item.is_available !== false;
                    return (
                      <div
                        key={item.id}
                        onClick={() => isAvailable && addToCart(item)}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border border-stone-200 p-2.5 transition hover:shadow-md ${
                          isAvailable
                            ? "cursor-pointer bg-white hover:border-orange-300"
                            : "cursor-not-allowed bg-stone-50 opacity-60"
                        }`}
                      >
                        {/* Ảnh món */}
                        <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-stone-100">
                          {item.image_url ? (
                            <img
                              src={getImageUrl(item.image_url)}
                              alt={item.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-300">
                              <Coffee className="h-8 w-8" />
                            </div>
                          )}
                          {!isAvailable && (
                            <span className="absolute left-1.5 top-1.5 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Hết hàng
                            </span>
                          )}
                        </div>

                        {/* Tên & Giá */}
                        <div>
                          <h4 className="line-clamp-1 text-sm font-semibold text-stone-800">
                            {item.name}
                          </h4>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs font-bold text-orange-600">
                              {Number(item.price).toLocaleString("vi-VN")} đ
                            </span>
                            <button
                              type="button"
                              disabled={!isAvailable}
                              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                isAvailable
                                  ? "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white"
                                  : "bg-stone-200 text-stone-400"
                              }`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: PHẦN 1 - THÔNG TIN ĐƠN & GIỎ HÀNG */}
          <div className="flex w-96 flex-col bg-stone-50/50 p-5">
            {/* PHẦN 1: THÔNG TIN ĐƠN HÀNG */}
            <div className="mb-4 rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                1. Thông tin đơn hàng
              </h3>

              {/* Hình thức phục vụ */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setServiceType("dine_in")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                    serviceType === "dine_in"
                      ? "border border-orange-500 bg-orange-50 text-orange-700"
                      : "border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Tại quán
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServiceType("take_away");
                    setSelectedTable("");
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                    serviceType === "take_away"
                      ? "border border-orange-500 bg-orange-50 text-orange-700"
                      : "border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Mang đi
                </button>
              </div>

              {/* Chọn bàn (chỉ hiện khi Tại quán) */}
              {serviceType === "dine_in" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">
                    Chọn bàn <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">-- Chọn bàn phục vụ --</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.zone_name ? `(${t.zone_name})` : ""} -{" "}
                        {t.status === "occupied" ? "Đang có khách" : "Trống"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Khách hàng (Tùy chọn) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-stone-500">
                    Tên khách hàng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Anh Nam"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-stone-500">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0987..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* DANH SÁCH MÓN ĐÃ CHỌN (CART) */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Món đã chọn ({cart.reduce((s, i) => s + i.quantity, 0)})
                </h3>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center text-xs text-stone-400">
                    Chưa chọn món nào.
                    <br />
                    Nhấn vào món bên trái để thêm!
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-1.5 rounded-lg border border-stone-100 bg-stone-50/70 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-800">
                          {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-stone-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}{" "}
                          đ
                        </span>
                        {/* Tăng / giảm số lượng */}
                        <div className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="text-stone-500 hover:text-orange-600"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="text-stone-500 hover:text-orange-600"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Ghi chú món */}
                      <input
                        type="text"
                        placeholder="Ghi chú (ít đá, ít ngọt...)"
                        value={item.note || ""}
                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                        className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600 focus:border-orange-400 focus:outline-none"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* TỔNG TIỀN VÀ NÚT TẠO ĐƠN */}
              <div className="mt-3 border-t border-stone-200 pt-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-600">
                    Tổng cộng:
                  </span>
                  <span className="text-lg font-black text-orange-600">
                    {totalAmount.toLocaleString("vi-VN")} đ
                  </span>
                </div>

                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={handleSubmitOrder}
                  className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition ${
                    submitting || cart.length === 0
                      ? "cursor-not-allowed bg-stone-300"
                      : "bg-orange-600 hover:bg-orange-700 active:scale-[0.98]"
                  }`}
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận tạo đơn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

