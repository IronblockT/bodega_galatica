// components/cards/CardResultRow.tsx
"use client";

import { useState } from "react";
import { ConditionSelector } from "./ConditionSelector";
import { QuantitySelector } from "./QuantitySelector";

export function CardResultRow({ card }: any) {
  const [condition, setCondition] = useState(card.recommendedCondition);
  const variant = card.variants[condition];

  return (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur">
      {/* Imagem */}
      <div className="flex-shrink-0">
        <div className="relative h-48 w-36 md:h-56 md:w-40 rounded-xl bg-white/5 border border-white/10">
          {/* Quando ligar imagem real, entra o <Image /> aqui */}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-white font-semibold">{card.name}</h3>
          <p className="text-xs text-white/60">
            {card.type} • {card.set}
          </p>
        </div>

        <ConditionSelector
          variants={card.variants}
          value={condition}
          onChange={setCondition}
        />
      </div>

      {/* Compra */}
      <div className="w-44 text-right">
        <div className="text-xl font-semibold text-white">
          R$ {variant.price.toFixed(2)}
        </div>

        <p className="text-xs text-white/60 mb-2">
          {variant.stock} em estoque
        </p>

        <QuantitySelector max={variant.stock} />

        <button
          disabled={variant.stock === 0}
          className={[
            "mt-2 w-full rounded-full px-4 py-2 text-xs font-semibold",
            "text-[#0B0C10]",
            "bg-gradient-to-r from-orange-400 to-orange-500",
            "hover:from-orange-500 hover:to-orange-600",
            "transition-colors",
            "disabled:opacity-40",
          ].join(" ")}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}
