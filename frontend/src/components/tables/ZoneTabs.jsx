export default function ZoneTabs({ tabs = [], selectedId, onSelect, active, onChange }) {
  const currentActive = active !== undefined ? active : selectedId;
  const handleSelect = onChange || onSelect || (() => {});

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-stone-200/70 p-1">
      {tabs.map((tab) => {
        const isTabActive = tab.id === currentActive;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSelect(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isTabActive
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {tab.label} <span className="ml-0.5 text-stone-400">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}