// components/cards/CardSearchFilters.tsx
export function CardSearchFilters() {
  return (
    <div className="sticky top-24 rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
        Filtros
      </h2>

      {/* Nome */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-white/60">Nome da carta</label>
        <input
          type="text"
          placeholder="Ex: Darth Vader"
          className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30"
        />
      </div>

      {/* Set */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-white/60">Set</label>
        <select className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white">
          <option>Todos</option>
          <option>SOR</option>
          <option>SHD</option>
          <option>TWI</option>
        </select>
      </div>

      {/* Tipo */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-white/60">Tipo</label>
        <select className="w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white">
          <option>Todos</option>
          <option>Leader</option>
          <option>Base</option>
          <option>Unit</option>
          <option>Event</option>
          <option>Upgrade</option>
        </select>
      </div>

      {/* Condição */}
      <div className="mb-4">
        <label className="mb-2 block text-xs text-white/60">Condição</label>
        <div className="flex flex-wrap gap-2">
          {["NM", "EX", "VG", "G"].map((c) => (
            <button
              key={c}
              className="rounded-md border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Em estoque */}
      <div className="mb-4 flex items-center gap-2">
        <input type="checkbox" />
        <span className="text-xs text-white/70">Somente em estoque</span>
      </div>

      <div className="mt-6 flex gap-2">
        <button className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors">
          Limpar
        </button>
        <button
          className="flex-1 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
