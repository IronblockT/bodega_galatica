//CardSearchFilters

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MetaSet = { code: string; name: string | null };

type MetaResponse = {
  ok: boolean;
  sets: MetaSet[];
  types: string[];
  rarities: string[];
  error?: string;
};

const inputClass =
  "w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30";
const labelClass = "mb-1 block text-xs text-white/60";
const selectClass =
  "w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white";

const secondaryBtn =
  "flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors";
const primaryBtn =
  "flex-1 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors";

const ASPECTS = [
  { key: "Aggression", label: "Aggression", icon: "/aspects/Aggression.png" },
  { key: "Vigilance", label: "Vigilance", icon: "/aspects/Vigilance.png" },
  { key: "Command", label: "Command", icon: "/aspects/Command.png" },
  { key: "Cunning", label: "Cunning", icon: "/aspects/Cunning.png" },
  { key: "Heroism", label: "Heroism", icon: "/aspects/Heroism.png" },
  { key: "Villainy", label: "Villainy", icon: "/aspects/Villainy.png" },
];

const CARD_TYPES = [
  { value: "Base", label: "Base" },
  { value: "Leader", label: "Líder" },
  { value: "Unit", label: "Unidade" },
  { value: "Upgrade", label: "Upgrade" },
  { value: "Event", label: "Evento" },
  { value: "Token", label: "Token" },
];

const RARITIES = [
  { value: "Common", label: "Comum" },
  { value: "Uncommon", label: "Incomum" },
  { value: "Rare", label: "Rara" },
  { value: "Legendary", label: "Lendária" },
  { value: "Special", label: "Especial" },
];

export function CardSearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const searchParams = useSearchParams();

  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [sets, setSets] = useState<MetaSet[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  // Estado local (só aplica quando clica "Aplicar")
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [setCode, setSetCode] = useState(sp.get("set") ?? "");
  const [cardType, setCardType] = useState(sp.get("type") ?? "");

  // (placeholder por hora — ainda não temos estoque/condição no banco)
  const [condition, setCondition] = useState(sp.get("cond") ?? "");
  const [inStock, setInStock] = useState(sp.get("stock") === "1");

  const aspects = useMemo(
    () => (searchParams.get("aspects") ?? "").split(",").filter(Boolean),
    [searchParams]
  );

  function toggleAspect(value: string) {
    const next = aspects.includes(value)
      ? aspects.filter((a) => a !== value)
      : [...aspects, value];

    const params = new URLSearchParams(searchParams.toString());

    if (next.length) {
      params.set("aspects", next.join(","));
    } else {
      params.delete("aspects");
    }

    params.set("page", "1"); // reset paginação
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      setMetaLoading(true);
      setMetaError(null);

      const res = await fetch("/api/cards/meta", { cache: "no-store" });
      const json = (await res.json()) as MetaResponse;

      if (!mounted) return;

      if (!json.ok) {
        setMetaError(json.error ?? "Falha ao carregar metadados.");
        setMetaLoading(false);
        return;
      }

      setSets(json.sets ?? []);
      setTypes(json.types ?? []);
      setMetaLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // manter o form sincronizado se o usuário navegar pelo back/forward
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setSetCode(sp.get("set") ?? "");
    setCardType(sp.get("type") ?? "");
    setCondition(sp.get("cond") ?? "");
    setInStock(sp.get("stock") === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const canApply = useMemo(() => {
    return true; // sempre pode aplicar, mesmo vazio
  }, []);

  function applyFilters() {
    const params = new URLSearchParams(sp.toString());

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    if (setCode) params.set("set", setCode);
    else params.delete("set");

    if (cardType) params.set("type", cardType);
    else params.delete("type");

    // placeholders
    if (condition) params.set("cond", condition);
    else params.delete("cond");

    if (inStock) params.set("stock", "1");
    else params.delete("stock");

    // sempre volta pra página 1 ao aplicar filtro
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    // limpa tudo (mantém só page=1 e pageSize se existir)
    const params = new URLSearchParams();
    params.set("page", "1");

    const pageSize = sp.get("pageSize");
    if (pageSize) params.set("pageSize", pageSize);

    router.push(`${pathname}?${params.toString()}`);
  }

  function setParam(key: string, value?: string | null) {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    if (!value) sp.delete(key);
    else sp.set(key, value);
    // ✅ sempre volta pra página 1 quando muda filtro
    sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="sticky top-24 rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
        Filtros
      </h2>

      {metaError && (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-rose-200">
          {metaError}
        </div>
      )}

      {/* Nome */}
      <div className="mb-4">
        <label className={labelClass}>Nome da carta</label>
        <input
          type="text"
          placeholder="Ex: Darth Vader"
          className={inputClass}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Set */}
      <div className="mb-4">
        <label className={labelClass}>Set</label>
        <select
          className={selectClass}
          value={setCode}
          onChange={(e) => setSetCode(e.target.value)}
          disabled={metaLoading}
        >
          <option value="">Todos</option>
          {sets.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code}
              {s.name ? ` — ${s.name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-white/60">Tipo</label>

        <select
          value={searchParams.get("type") ?? ""}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());

            if (e.target.value) {
              params.set("type", e.target.value);
            } else {
              params.delete("type");
            }

            params.set("page", "1");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white"
        >
          <option value="">Todos</option>

          {CARD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Raridade */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-white/60">Raridade</label>

        <select
          value={searchParams.get("rarity") ?? ""}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());

            if (e.target.value) {
              params.set("rarity", e.target.value);
            } else {
              params.delete("rarity");
            }

            params.set("page", "1");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white"
        >
          <option value="">Todas</option>
          {RARITIES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Aspectos */}
      <div className="mb-4">
        <label className="mb-2 block text-xs text-white/60">Aspectos</label>

        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((aspect) => {
            const selected = aspects.includes(aspect.key);

            return (
              <button
                key={aspect.key}
                type="button"
                title={aspect.label}
                onClick={() => toggleAspect(aspect.key)}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-md border transition",
                  selected
                    ? "border-orange-400 bg-orange-400/15"
                    : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5",
                ].join(" ")}
              >
                <img
                  src={aspect.icon}
                  alt={aspect.label}
                  className="h-6 w-6 object-contain"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Condição (placeholder) */}
      <div className="mb-4">
        <label className="mb-2 block text-xs text-white/60">Condição</label>
        <div className="flex flex-wrap gap-2">
          {["NM", "EX", "VG", "G"].map((c) => {
            const selected = condition === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCondition((prev) => (prev === c ? "" : c))}
                className={[
                  "rounded-md border px-3 py-1 text-xs transition",
                  selected
                    ? "border-orange-400/60 bg-orange-500/15 text-white"
                    : "border-white/10 text-white/70 hover:border-white/30",
                ].join(" ")}
              >
                {c}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-white/45">
          * Condição ainda não filtra no banco (placeholder).
        </p>
      </div>

      {/* Em estoque */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => {
            const checked = e.target.checked;
            setInStock(checked);
            setParam("stock", checked ? "1" : null); // ✅ envia stock=1
          }}
        />
        <span className="text-xs text-white/70">Somente em estoque</span>
      </div>

      <p className="mb-4 text-[11px] text-white/45">
        * “Em estoque” será ativado quando conectarmos inventário/listings.
      </p>

      <div className="mt-6 flex gap-2">
        <button type="button" className={secondaryBtn} onClick={clearFilters}>
          Limpar
        </button>
        <button
          type="button"
          className={primaryBtn}
          onClick={applyFilters}
          disabled={!canApply}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
