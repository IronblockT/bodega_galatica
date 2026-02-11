// components/cards/QuantitySelector.tsx
"use client";

import { useEffect, useState } from "react";

export function QuantitySelector({ max }: { max: number }) {
  const safeMax = Math.max(0, Number(max ?? 0));
  const [qty, setQty] = useState(safeMax === 0 ? 0 : 1);

  // Ajusta qty quando max muda (ex: troca de condição)
  useEffect(() => {
    setQty((prev) => {
      if (safeMax === 0) return 0;
      if (prev < 1) return 1;
      if (prev > safeMax) return safeMax;
      return prev;
    });
  }, [safeMax]);

  const disabledAll = safeMax === 0;

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        disabled={disabledAll || qty <= 1}
        onClick={() => setQty((q) => Math.max(1, q - 1))}
        className="h-7 w-7 rounded-md border border-white/10 text-white disabled:opacity-40"
      >
        –
      </button>

      <span className="text-sm text-white">{qty}</span>

      <button
        type="button"
        disabled={disabledAll || qty >= safeMax}
        onClick={() => setQty((q) => Math.min(safeMax, q + 1))}
        className="h-7 w-7 rounded-md border border-white/10 text-white disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

