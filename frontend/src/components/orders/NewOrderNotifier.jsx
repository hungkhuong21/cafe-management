import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, ArrowRight, X } from "lucide-react";
import api from "../../services/api";
import { playOrderSound } from "../../utils/sound";

export default function NewOrderNotifier() {
  const navigate = useNavigate();
  const location = useLocation();
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const knownOrderIdsRef = useRef(new Set());
  const isInitialRef = useRef(true);

  useEffect(() => {
    let timer = null;

    const checkOrders = async () => {
      try {
        const res = await api.get("/orders");
        const list = res.data || [];

        if (isInitialRef.current) {
          // Lần đầu: lưu tất cả ID hiện tại làm baseline, chưa phát âm
          knownOrderIdsRef.current = new Set(list.map((o) => o.id));
          isInitialRef.current = false;
          return;
        }

        // Tìm đơn hoàn toàn mới (ID chưa có trong tập đã biết) — không lọc theo status
        // vì đơn QR có thể có status 'pending', 'confirmed', v.v.
        const brandNewOrders = list.filter(
          (o) => !knownOrderIdsRef.current.has(o.id)
        );

        // Cập nhật tập đã biết với toàn bộ danh sách mới nhất
        list.forEach((o) => knownOrderIdsRef.current.add(o.id));

        if (brandNewOrders.length > 0) {
          // Phát âm thanh báo
          playOrderSound();

          // Hiển thị toast thông báo
          const latest = brandNewOrders[brandNewOrders.length - 1];
          const tableLabel =
            latest.table_name ||
            (latest.table_id
              ? `Bàn ${String(latest.table_id).padStart(2, "0")}`
              : "Mang đi");
          const code = latest.code
            ? latest.code.replace("#", "")
            : `CF-${latest.id}`;

          setNewOrderAlert({
            id: latest.id,
            code,
            table: tableLabel,
            count: brandNewOrders.length,
          });

          // Tự tắt sau 7 giây
          setTimeout(() => setNewOrderAlert(null), 7000);
        }
      } catch (err) {
        // Im lặng khi mất mạng / backend chưa sẵn sàng
      }
    };

    // Kiểm tra ngay khi mount
    checkOrders();

    // Kiểm tra định kỳ mỗi 5 giây
    timer = setInterval(checkOrders, 5000);

    return () => clearInterval(timer);
  }, []);

  if (!newOrderAlert) return null;

  return (
    <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-3.5 rounded-2xl bg-[#2E2018] p-3.5 pl-4 pr-3 text-white shadow-2xl border border-orange-500/30 backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-md animate-bounce">
          <Bell size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Đơn hàng mới
            </span>
            <span className="text-xs font-bold text-white">#{newOrderAlert.code}</span>
          </div>
          <p className="text-xs text-stone-300 mt-0.5 font-medium">
            Khách vừa đặt tại <span className="font-bold text-white">{newOrderAlert.table}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          {location.pathname !== "/orders" && (
            <button
              type="button"
              onClick={() => {
                setNewOrderAlert(null);
                navigate("/orders");
              }}
              className="flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 transition shadow-xs"
            >
              <span>Xem đơn</span>
              <ArrowRight size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setNewOrderAlert(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

