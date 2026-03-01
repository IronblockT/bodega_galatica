"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  max: number;
  value?: number; // ✅ opcional (controlado)
  onChange?: (next: number) => void; // ✅ opcional (controlado)
};

export function QuantitySelector({ max, value, onChange }: Props) {
  const safeMax = Math.max(0, Number(max ?? 0));

  const isControlled = typeof value === "number" && typeof onChange === "function";

  // ✅ estado interno só pra modo antigo (não-controlado)
  const [internalQty, setInternalQty] = useState(safeMax === 0 ? 0 : 1);

  const qty = useMemo(() => {
    return isControlled ? (value as number) : internalQty;
  }, [isControlled, value, internalQty]);

  const setQty = (next: number) => {
    const clamped =
      safeMax === 0 ? 0 : Math.max(1, Math.min(safeMax, Number(next || 0)));

    if (isControlled) onChange!(clamped);
    else setInternalQty(clamped);
  };

  // ✅ Ajusta qty quando max muda (troca de condição/estoque)
  useEffect(() => {
    if (safeMax === 0) {
      setQty(0);
      return;
    }
    if (qty < 1) setQty(1);
    else if (qty > safeMax) setQty(safeMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMax]);

  const disabledAll = safeMax === 0;

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        disabled={disabledAll || qty <= 1}
        onClick={() => setQty(qty - 1)}
        className="h-7 w-7 rounded-md border border-white/10 text-white disabled:opacity-40"
      >
        –
      </button>

      <span className="text-sm text-white">{qty}</span>

      <button
        type="button"
        disabled={disabledAll || qty >= safeMax}
        onClick={() => setQty(qty + 1)}
        className="h-7 w-7 rounded-md border border-white/10 text-white disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
