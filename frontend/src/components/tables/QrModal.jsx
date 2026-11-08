import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, RefreshCw, CheckCircle2 } from "lucide-react";
import Modal from "../common/Modal";
import api from "../../services/api";

export default function QrModal({ table, onClose, onTableUpdated }) {
  const canvasRef = useRef(null);
  const [currentTable, setCurrentTable] = useState(table);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState("");

  // Link QR luôn trỏ về Frontend (Vercel) để khách mở giao diện menu
  const getFrontendOrigin = () => {
    const saved = localStorage.getItem("cf_qr_base_url");
    if (saved && !saved.includes("onrender.com") && !saved.includes(":5000")) {
      return saved;
    }
    // Dọn dẹp cache cũ nếu từng lưu trỏ về Render backend
    if (saved) localStorage.removeItem("cf_qr_base_url");
    return typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : (import.meta.env.VITE_PUBLIC_URL || "https://cafe-management-lywb2huvn-hungkhuong21s-projects.vercel.app");
  };

  const [baseUrl] = useState(getFrontendOrigin);

  const qrToken = currentTable.qr_token || currentTable.number || currentTable.id;
  const tableNum = currentTable.number ? String(currentTable.number).padStart(2, "0") : "";
  const tableParam = tableNum ? `?table=${tableNum}` : "";
  const url = `${baseUrl.replace(/\/+$/, "")}/qr/${qrToken}${tableParam}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `qr-ban-${currentTable.number || currentTable.id}.png`;
    link.click();
  };

  // Tạo lại mã QR mới (POST /api/tables/:id/qr/regenerate)
  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      setMessage("");
      const res = await api.post(`/tables/${currentTable.id}/qr/regenerate`);
      if (res.data?.qr_token) {
        setCurrentTable((prev) => ({
          ...prev,
          qr_token: res.data.qr_token,
        }));
        setMessage("Đã cấp mã QR mới! Mã cũ đã hết hiệu lực.");
        if (onTableUpdated) onTableUpdated();
      }
    } catch (err) {
      console.warn("Lỗi tạo lại QR:", err);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Modal title={`Mã QR • ${currentTable.name || `Bàn ${currentTable.number}`}`} onClose={onClose}>
      <div className="flex justify-center rounded-2xl border border-stone-200 bg-white p-4 shadow-inner">
        {/* Vẽ ở 512px cho ảnh tải về nét, hiển thị thu nhỏ còn 220px */}
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={512}
          level="M"
          marginSize={2}
          style={{ width: 220, height: 220 }}
        />
      </div>

      <p className="mt-4 text-center text-sm font-medium text-stone-700">
        Khách quét mã để xem menu và gọi món tại bàn này.
      </p>

      {/* Hiển thị đường dẫn trực tiếp để test hoặc sao chép */}
      <div className="mt-2 text-center text-xs break-all font-mono bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-orange-600 hover:underline font-semibold"
        >
          {url}
        </a>
      </div>

      {message && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 py-2 rounded-xl border border-emerald-100">
          <CheckCircle2 size={14} />
          {message}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-xs font-bold text-white hover:opacity-90 transition shadow-sm"
          >
            <Download size={14} />
            Tải ảnh PNG
          </button>
          <button
            type="button"
            disabled={regenerating}
            onClick={handleRegenerate}
            title="Đổi mã QR mới nếu cần vô hiệu hóa mã cũ"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition disabled:opacity-60"
          >
            <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
            {regenerating ? "Đang tạo..." : "Tạo lại QR"}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
}
