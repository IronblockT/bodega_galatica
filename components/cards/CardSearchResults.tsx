"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardResultRow } from "./CardResultRow";

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
  "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors";

function toMockRow(card: ApiCard) {
  return {
    id: card.card_uid,
    name: card.subtitle ? `${card.title}, ${card.subtitle}` : card.title,
    set: card.expansion_code,
    type: card.card_type_label ?? "—",
    image: card.image_front_url ?? "/placeholder-card.png",

    // ✅ já fica disponível pra modal/detalhe futuramente
    rules_text: card.rules_text ?? "",

    recommendedCondition: "NM",
    variants: {
      NM: { price: 0, stock: 0 },
      EX: { price: 0, stock: 0 },
      VG: { price: 0, stock: 0 },
      G: { price: 0, stock: 0 },
    },
  };
}

export function CardSearchResults() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [items, setItems] = useState<ApiCard[]>([]);
  const [total, setTotal] = useState(0);

  const page = Math.max(parseInt(sp.get("page") ?? "1", 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt(sp.get("pageSize") ?? "24", 10), 1),
    60
  );

  const q = sp.get("q") ?? "";
  const setCode = sp.get("set") ?? "";
  const type = sp.get("type") ?? "";
  const rarity = sp.get("rarity") ?? "";

  const aspects = sp.get("aspects") ?? "";
  const traits = sp.get("traits") ?? "";
  const keywords = sp.get("keywords") ?? "";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setCode) params.set("set", setCode);
    if (type) params.set("type", type);
    if (rarity) params.set("rarity", rarity);

    if (aspects) params.set("aspects", aspects);
    if (traits) params.set("traits", traits);
    if (keywords) params.set("keywords", keywords);

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [q, setCode, type, rarity, aspects, traits, keywords, page, pageSize]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/cards?${queryString}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse;

      if (!mounted) return;

      if (!json.ok) {
        setErrorMsg(json.error ?? "Falha ao buscar cartas.");
        setItems([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [queryString]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  const rows = useMemo(() => items.map(toMockRow), [items]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm text-white/60">
        <span>
          {loading ? "Carregando..." : `${total} resultado${total === 1 ? "" : "s"}`}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/45">
            Página {page} de {totalPages}
          </span>

          <button
            className={secondaryBtn}
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
          >
            Anterior
          </button>
          <button
            className={secondaryBtn}
            disabled={page >= totalPages || loading}
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

      {loading ? (
        <div className="text-sm text-white/60">Buscando cartas…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-white/60">Nenhuma carta encontrada.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((card) => (
            <CardResultRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}


