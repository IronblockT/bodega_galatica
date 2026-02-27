// CardResultRow

"use client";

import { useMemo, useState } from "react";
import { ConditionSelector } from "./ConditionSelector";
import { QuantitySelector } from "./QuantitySelector";
import Link from "next/link";

function getTypeLabel(v: any): string {
  if (!v) return "—";
  if (typeof v === "string") return v;

  const name1 = v?.data?.attributes?.name;
  if (typeof name1 === "string" && name1.trim()) return name1.trim();

  const name2 = v?.attributes?.name;
  if (typeof name2 === "string" && name2.trim()) return name2.trim();

  const name3 = v?.name;
  if (typeof name3 === "string" && name3.trim()) return name3.trim();

  return "—";
}

export function CardResultRow({ card }: any) {
  const [condition, setCondition] = useState(card.recommendedCondition);
  const variant = card.variants?.[condition] ?? { price: 0, stock: 0 };

  const typeLabel = getTypeLabel(card.type);

  const isHorizontal = card.type === "Leader" || card.type === "Base";

  // ✅ rota correta: /cartas/[card_uid]
  // ✅ passamos finish + cond pra manter o contexto da variante escolhida
  const detailHref = useMemo(() => {
    const uid = encodeURIComponent(String(card.uid ?? ""));
    const finish = encodeURIComponent(String(card.finish ?? "standard"));
    const cond = encodeURIComponent(String(condition ?? "NM"));

    return `/cartas/${uid}?finish=${finish}&cond=${cond}`;
  }, [card.uid, card.finish, condition]);

  return (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur">
      {/* Imagem (clicável) */}
      <div className="flex-shrink-0">
        <Link href={detailHref} className="block">
          <div className="relative h-48 w-36 md:h-56 md:w-40 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
            {card.image ? (
              <img
                src={card.image}
                alt={card.name}
                className={[
                  "max-h-full max-w-full",
                  isHorizontal ? "object-contain p-2" : "object-cover",
                ].join(" ")}
                loading="lazy"
              />
            ) : null}
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-white font-semibold">
            <Link href={detailHref} className="hover:underline">
              {card.name}
            </Link>
          </h3>

          <p className="text-xs text-white/60">
            {typeLabel} • {card.set} • {card.finish}
          </p>

          {card.rules_text ? (
            <p className="mt-2 text-sm text-white/70 line-clamp-2">
              {card.rules_text}
            </p>
          ) : null}
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
          R$ {Number(variant.price || 0).toFixed(2)}
        </div>

        <p className="text-xs text-white/60 mb-2">{variant.stock ?? 0} em estoque</p>

        <QuantitySelector max={variant.stock ?? 0} />

        <button
          disabled={(variant.stock ?? 0) === 0}
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
