import { Banknote, FileText, CircleDollarSign, Armchair, Wallet, TrendingUp } from "lucide-react";

const ICONS = {
  revenue: Banknote,
  orders: FileText,
  average: CircleDollarSign,
  tables: Armchair,
  Wallet: Wallet,
  FileText: FileText,
  TrendingUp: TrendingUp,
};

// Ghi đủ tên class để Tailwind nhận diện (không ghép chuỗi động)
const TONES = {
  orange: { box: "bg-orange-50 text-brand", trend: "text-brand" },
  blue: { box: "bg-blue-50 text-blue-500", trend: "text-blue-500" },
  green: { box: "bg-emerald-50 text-emerald-500", trend: "text-emerald-600" },
  amber: { box: "bg-amber-50 text-amber-500", trend: "text-amber-600" },
};

export default function StatCard({ label, value, trend, tone, icon }) {
  const Icon = typeof icon === "string" ? ICONS[icon] : icon;
  const style = TONES[tone];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm text-stone-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.box}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-stone-900">{value}</p>
      <p className={`mt-1 text-xs font-semibold ${style.trend}`}>{trend}</p>
    </div>
  );
}