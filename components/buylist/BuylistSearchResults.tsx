"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BuylistResultRow } from "@/components/buylist/BuylistResultRow";

type ApiCard = {
  card_uid: string;
  expansion_code: string;
  title: string;
  subtitle: string | null;
  card_number: number | null;
  card_count: number | null;
  rarity_label: string | null;
  card_type_label: string | null;
  aspects_labels: string[];
  traits_labels: string[];
  keywords_labels: string[];
  cost: number | null;
  power: number | null;
  hp: number | null;
  rules_text: string | null;
  image_front_url: string | null;
  image_back_url: string | null;
  finish: string;
  variants: Record<
    string,
    { price: number; stock: number; sku_key: string; promo_type?: string }
  >;
  recommended_condition: string;
};

type ApiResponse = {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  items: ApiCard[];
  error?: string;
};

const secondaryBtn =
  "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function toBuylistRow(card: ApiCard) {
  const recommended = card.recommended_condition ?? "NM";

  return {
    id: `${card.card_uid}::${card.finish}`,
    uid: card.card_uid,
    name: card.subtitle ? `${card.title}, ${card.subtitle}` : card.title,
    set: card.expansion_code,
    finish: card.finish,
    type: card.card_type_label ?? "—",
    image: card.image_front_url ?? "/placeholder-card.png",
    rules_text: card.rules_text ?? "",
    recommendedCondition: recommended,
    variants: card.variants ?? {},
  };
}

export function BuylistSearchResults() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<ApiCard[]>([]);
  const [total, setTotal] = useState(0);

  const page = Math.max(parseInt(sp.get("page") ?? "1", 10), 1);
  const pageSize = 20;

  const q = sp.get("q") ?? "";
  const setCode = sp.get("set") ?? "";
  const type = sp.get("type") ?? "";
  const rarity = sp.get("rarity") ?? "";
  const aspects = sp.get("aspects") ?? "";
  const traits = sp.get("traits") ?? "";
  const keywords = sp.get("keywords") ?? "";
  const stock = sp.get("stock") ?? "";

  const hasSearchIntent = useMemo(() => {
    return Boolean(
      q.trim() ||
      setCode ||
      type ||
      rarity ||
      aspects ||
      traits ||
      keywords
    );
  }, [q, setCode, type, rarity, aspects, traits, keywords]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setCode) params.set("set", setCode);
    if (type) params.set("type", type);
    if (rarity) params.set("rarity", rarity);
    if (aspects) params.set("aspects", aspects);
    if (traits) params.set("traits", traits);
    if (keywords) params.set("keywords", keywords);
    if (stock) params.set("stock", stock);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [q, setCode, type, rarity, aspects, traits, keywords, stock, page, pageSize]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!hasSearchIntent) {
        if (!mounted) return;

        setLoading(false);
        setErrorMsg(null);
        setItems([]);
        setTotal(0);
        return;
      }

      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch(`/api/cards?${queryString}`, { cache: "no-store" });
        const text = await res.text();

        let json: ApiResponse | null = null;
        try {
          json = JSON.parse(text) as ApiResponse;
        } catch {
          json = null;
        }

        if (!mounted) return;

        if (!res.ok || !json?.ok) {
          setErrorMsg(json?.error ?? "Falha ao buscar cartas.");
          setItems([]);
          setTotal(0);
          setLoading(false);
          return;
        }

        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
        setLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(err?.message ?? "Falha ao buscar cartas.");
        setItems([]);
        setTotal(0);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [queryString, hasSearchIntent]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const rows = useMemo(() => items.map(toBuylistRow), [items]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
        <span>
          {!hasSearchIntent
            ? "Use os filtros para buscar cartas"
            : loading
              ? "Carregando..."
              : `${total} resultado${total === 1 ? "" : "s"}`}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/45">
            {hasSearchIntent ? `Página ${page} de ${totalPages}` : "Nenhuma busca feita"}
          </span>

          <button
            className={secondaryBtn}
            disabled={!hasSearchIntent || page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
          >
            Anterior
          </button>

          <button
            className={secondaryBtn}
            disabled={!hasSearchIntent || page >= totalPages || loading}
            onClick={() => goToPage(page + 1)}
          >
            Próxima
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-rose-200 backdrop-blur">
          {errorMsg}
        </div>
      )}

      {!hasSearchIntent ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-white/75">
          <div className="inline-flex items-center rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
            Busque uma carta
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            Veja se estamos comprando sua carta
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Digite o nome da carta ou use os filtros para encontrar cartas por coleção,
            tipo, raridade ou aspecto. A cotação de recompra aparecerá aqui quando você
            fizer uma busca.
          </p>
        </div>
      ) : loading ? (
        <div className="text-sm text-white/60">Buscando cartas…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-white/60">
          Nenhuma carta encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((card) => (
            <BuylistResultRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}