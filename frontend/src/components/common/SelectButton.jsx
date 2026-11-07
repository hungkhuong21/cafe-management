// Nút trông như button, bên trên phủ một <select> trong suốt nên bấm vào là mở danh sách
export default function SelectButton({ icon: Icon, placeholder, value, onChange, options }) {
  const isDefault = value === options[0].value;
  const current = options.find((o) => o.value === value);

  return (
    <label className="relative flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
      <Icon size={16} />
      <span>{isDefault ? placeholder : current.label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}