// components/cards/QuantitySelector.tsx
"use client";

import { useState } from "react";

export function QuantitySelector({ max }: { max: number }) {
  const [qty, setQty] = useState(1);

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => setQty(Math.max(1, qty - 1))}
        className="h-7 w-7 rounded-md border border-white/10 text-white"
      >
        –
      </button>
      <span className="text-sm text-white">{qty}</span>
      <button
        onClick={() => setQty(Math.min(max, qty + 1))}
        className="h-7 w-7 rounded-md border border-white/10 text-white"
      >
        +
      </button>
    </div>
  );
}
