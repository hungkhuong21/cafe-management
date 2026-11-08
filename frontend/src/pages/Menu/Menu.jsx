import { useMemo, useState, useEffect } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import CategoryPanel from "../../components/menu/CategoryPanel";
import MenuItemCard from "../../components/menu/MenuItemCard";
import SelectButton from "../../components/common/SelectButton";
import CategoryModal from "../../components/menu/CategoryModal";
import MenuItemModal from "../../components/menu/MenuItemModal";
import { usePageHeader } from "../../context/PageHeaderContext";
import api from "../../services/api";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "available", label: "Đang bán" },
  { value: "soldout", label: "Tạm hết" },
  { value: "hidden", label: "Ẩn khỏi menu" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "name", label: "Tên A → Z" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
];

export default function Menu() {
  const [items, setItems] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);

  // Chỉnh sửa & Xóa món
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Chỉnh sửa & Xóa danh mục
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("default");

  // Load menu items & categories từ API, nếu rỗng thì giữ lại dữ liệu mẫu minh hoạ
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [menuRes, catsRes] = await Promise.all([
        api.get("/menu-items").catch(() => ({ data: [] })),
        api.get("/categories").catch(() => ({ data: [] })),
      ]);

      const apiItems = menuRes.data || [];
      const apiCats = catsRes.data || [];

      setItems(apiItems);
      setCategoriesList(apiCats);
    } catch (err) {
      console.warn("Lỗi tải menu:", err);
      setItems([]);
      setCategoriesList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  usePageHeader({
    title: "Menu & danh mục",
    subtitle: "Quản lý món, giá bán và tình trạng hiển thị trên QR Menu",
    action: {
      label: "Thêm món mới",
      onClick: () => setIsMenuItemModalOpen(true),
    },
  });

  // Danh mục kèm số lượng món (tính cho cả id dạng string hay number)
  const categories = useMemo(() => {
    return [
      { id: "all", name: "Tất cả món", count: items.length },
      ...categoriesList.map((c) => ({
        id: c.id,
        name: c.name,
        count: items.filter(
          (i) =>
            i.category_id === c.id ||
            i.category === c.id ||
            String(i.category_id) === String(c.id)
        ).length,
      })),
    ];
  }, [items, categoriesList]);

  const categoryNameById = useMemo(
    () => Object.fromEntries(categoriesList.map((c) => [c.id, c.name])),
    [categoriesList]
  );

  // Lọc + sắp xếp
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = items.filter((i) => {
      const matchCat =
        categoryId === "all" ||
        i.category_id === categoryId ||
        i.category === categoryId ||
        String(i.category_id) === String(categoryId);

      const matchQuery = !q || (i.name && i.name.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter === "available") {
        matchStatus = i.status === "available";
      } else if (statusFilter === "soldout") {
        matchStatus = i.status === "soldout";
      } else if (statusFilter === "hidden") {
        matchStatus = i.status === "hidden";
      }

      return matchCat && matchQuery && matchStatus;
    });

    if (sort === "price-asc") {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price-desc") {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return list;
  }, [items, query, categoryId, statusFilter, sort]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // Mặc định 9 món/trang (3 cột x 3 hàng)

  // Tự động chuyển về trang 1 khi lọc, tìm kiếm hoặc đổi số lượng hiển thị
  useEffect(() => {
    setCurrentPage(1);
  }, [query, categoryId, statusFilter, sort, pageSize]);

  const totalItems = visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return visibleItems.slice(start, start + pageSize);
  }, [visibleItems, validCurrentPage, pageSize]);

  // Cập nhật trạng thái món trực tiếp (on/off)
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === "available" ? "soldout" : "available";
    try {
      await api.put(`/menu-items/${item.id}`, { status: newStatus });
    } catch (err) {
      // nếu chưa kết nối db thì vẫn toggle trên giao diện minh họa
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );
  };

  // Thao tác với món
  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsMenuItemModalOpen(true);
  };

  const handleDeleteItem = (item) => {
    setDeletingItem(item);
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/menu-items/${deletingItem.id}`);
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
      fetchMenuData();
    } catch (err) {
      console.warn("Lỗi API xóa món, xóa local state:", err);
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Thao tác với danh mục
  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (cat) => {
    setDeletingCategory(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await api.delete(`/categories/${deletingCategory.id}`);
      setCategoriesList((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      if (categoryId === deletingCategory.id) {
        setCategoryId("all");
      }
      setDeletingCategory(null);
      fetchMenuData();
    } catch (err) {
      console.warn("Lỗi API xóa danh mục, xóa local state:", err);
      setCategoriesList((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      if (categoryId === deletingCategory.id) {
        setCategoryId("all");
      }
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* Panel Danh mục bên trái */}
      <CategoryPanel
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onOpenAddCategory={() => {
          setEditingCategory(null);
          setIsCategoryModalOpen(true);
        }}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Khu vực danh sách món bên phải */}
      <div className="flex-1 space-y-4">
        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              placeholder="Tìm theo tên món..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-sm focus:border-brand focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SelectButton
              icon={SlidersHorizontal}
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
            />

            <SelectButton
              icon={ArrowUpDown}
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        {/* Danh sách món Grid */}
        {loading ? (
          <div className="py-20 text-center text-sm text-stone-400">
            Đang tải danh sách món...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-stone-400">
            Không tìm thấy món nào phù hợp với bộ lọc.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={{
                    ...item,
                    categoryName:
                      categoryNameById[item.category_id] ||
                      categoryNameById[item.category] ||
                      "Chưa phân loại",
                    inStock: item.status === "available",
                  }}
                  onToggle={() => handleToggleStatus(item)}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>

            {/* Thanh Phân Trang */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl p-3.5 px-5 shadow-xs border border-stone-200/80 text-xs text-stone-600">
              {/* Thông tin số lượng hiển thị */}
              <div className="flex items-center gap-2.5">
                <span>
                  Hiển thị{" "}
                  <span className="font-bold text-stone-900">
                    {Math.min((validCurrentPage - 1) * pageSize + 1, totalItems)} -{" "}
                    {Math.min(validCurrentPage * pageSize, totalItems)}
                  </span>{" "}
                  trong tổng số{" "}
                  <span className="font-bold text-stone-900">{totalItems}</span> món
                </span>

                <span className="text-stone-300">|</span>

                {/* Chọn số món mỗi trang */}
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500">Mỗi trang:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 font-bold text-stone-800 focus:border-brand focus:outline-none cursor-pointer"
                  >
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                    <option value={18}>18</option>
                    <option value={24}>24</option>
                  </select>
                </div>
              </div>

              {/* Các nút chuyển trang */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validCurrentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Trang trước"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - validCurrentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1.5 text-stone-400 select-none">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`flex h-8 min-w-[32px] px-2 items-center justify-center rounded-xl text-xs font-bold transition ${
                              validCurrentPage === page
                                ? "bg-brand text-white shadow-xs"
                                : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Trang tiếp theo"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Thêm / Chỉnh sửa danh mục */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onCategoryCreated={fetchMenuData}
        categoryToEdit={editingCategory}
      />

      {/* Modal Thêm / Chỉnh sửa món */}
      <MenuItemModal
        isOpen={isMenuItemModalOpen}
        onClose={() => {
          setIsMenuItemModalOpen(false);
          setEditingItem(null);
        }}
        categories={categories}
        onMenuItemCreated={fetchMenuData}
        itemToEdit={editingItem}
      />

      {/* Modal Xác nhận Xóa Món */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base mb-1">
              Xác nhận xóa món?
            </h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa món{" "}
              <span className="font-bold text-stone-800">
                "{deletingItem.name}"
              </span>{" "}
              khỏi thực đơn? Món sẽ không còn hiển thị trên QR Menu của khách.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md disabled:bg-stone-300"
              >
                {isDeleting ? "Đang xóa..." : "Xóa món"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Danh Mục */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-100 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base mb-1">
              Xác nhận xóa danh mục?
            </h3>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed font-medium">
              Bạn có chắc muốn xóa danh mục{" "}
              <span className="font-bold text-stone-800">
                "{deletingCategory.name}"
              </span>
              ? Các món thuộc danh mục này sẽ chuyển sang trạng thái "Chưa phân loại".
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-md disabled:bg-stone-300"
              >
                {isDeleting ? "Đang xóa..." : "Xóa danh mục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
