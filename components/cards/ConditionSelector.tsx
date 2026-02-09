// components/cards/ConditionSelector.tsx
export function ConditionSelector({ variants, value, onChange }: any) {
  return (
    <div className="mt-2 flex gap-2">
      {Object.entries(variants).map(([cond, data]: any) => (
        <button
          key={cond}
          disabled={data.stock === 0}
          onClick={() => onChange(cond)}
          className={[
            "rounded-md border px-2 py-1 text-xs transition-colors",
            value === cond
              ? "border-orange-400 bg-orange-400/10 text-orange-600"
              : "border-white/10 text-white/70 hover:border-white/30 hover:bg-white/5",
            "disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-white/10",
          ].join(" ")}
        >
          {cond}
        </button>
      ))}
    </div>
  );
}

