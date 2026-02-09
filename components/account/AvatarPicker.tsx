'use client';

type Avatar = {
  key: string;
  name: string;
  style: string;
  why: string;
};

const panelClass = 'rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur';
const titleClass = 'mb-4 text-sm font-semibold uppercase tracking-wide text-white/70';
const primaryBtn =
  'rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40';

export function AvatarPicker({
  selectedKey,
  onSelect,
  onSave,
  saving,
}: {
  selectedKey: string | null | undefined;
  onSelect: (key: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const avatars: Avatar[] = [
    {
      key: 'arelian',
      name: 'Arelians',
      style: 'Aggro tático com controle leve',
      why: 'Pressiona cedo com sinergias rápidas e remoções eficientes — no deserto, quem reage tarde não sobrevive.',
    },
    {
      key: 'lumari',
      name: 'Lúmari',
      style: 'Controle e value ao longo do tempo',
      why: 'Prefere jogos longos e respostas reativas, acumulando vantagem — quem controla o ritmo controla o desfecho.',
    },
    {
      key: 'kharzun',
      name: 'Kharzun',
      style: 'Aggro explosivo e pressão constante',
      why: 'Quer finalizar rápido com dano direto e trocas favoráveis — hesitação no deserto é sentença de morte.',
    },
    {
      key: 'varkai',
      name: 'Varkai',
      style: 'Midrange técnico e vantagem incremental',
      why: 'Adapta-se ao oponente com valor e eficiência — quem reutiliza sucata vence no longo prazo.',
    },
    {
      key: 'sahrikaan',
      name: "Sahri’Kaan",
      style: 'Midrange pesado com liderança e buffs',
      why: 'Estabelece presença e escala com o tempo — quem lidera com firmeza não precisa correr riscos.',
    },
  ];

  return (
    <div className={panelClass}>
      <h2 className={titleClass}>Avatar</h2>
      <p className="text-xs text-white/70">
        Escolha uma raça para representar seu perfil na Bodega Galáctica.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {avatars.map((a) => {
          const isSelected = selectedKey === a.key;

          return (
            <button
              key={a.key}
              type="button"
              onClick={() => onSelect(a.key)}
              className={[
                'group w-full rounded-xl border p-3 text-left transition',
                'border-white/10 bg-black/50 hover:bg-black/60',
                isSelected ? 'outline outline-1 outline-orange-400/60' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-lg border border-white/10 bg-black">
                    <img
                      src={`/avatars/${a.key}.png`}
                      alt={a.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div
                    className="
                      pointer-events-none
                      absolute left-0 top-0
                      opacity-0
                      transition-opacity duration-200
                      group-hover:opacity-100
                      z-50
                    "
                  >
                    <div className="mt-[-30px] ml-[70px] h-64 w-64 rounded-3xl border border-white/10 bg-black shadow-[0_40px_120px_rgba(0,0,0,.8)]">
                      <img
                        src={`/avatars/${a.key}.png`}
                        alt={a.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{a.name}</div>
                    {isSelected && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-[#0B0C10]">
                        Selecionado
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-white/70">{a.style}</div>
                  <div className="mt-1 text-xs text-white/55">{a.why}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" disabled={saving} onClick={onSave} className={primaryBtn}>
          {saving ? 'Salvando…' : 'Salvar avatar'}
        </button>
      </div>
    </div>
  );
}
