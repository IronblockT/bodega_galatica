'use client';

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  pix_key: string | null;
  avatar_key?: string | null;
};

const panelClass = 'rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur';
const titleClass = 'mb-4 text-sm font-semibold uppercase tracking-wide text-white/70';
const labelClass = 'mb-1 block text-xs text-white/60';
const inputClass =
  'w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30';
const primaryBtn =
  'rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40';

export function ProfileForm({
  profile,
  setProfile,
  onSave,
  saving,
}: {
  profile: ProfileRow | null;
  setProfile: React.Dispatch<React.SetStateAction<ProfileRow | null>>;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  return (
    <div className={panelClass}>
      <h2 className={titleClass}>Dados pessoais</h2>
      <p className="mb-4 text-xs text-white/60">
        CPF e Chave Pix são obrigatórios para comprar e vender cartas na Bodega.
      </p>

      <form onSubmit={onSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>Nome completo</label>
          <input
            className={inputClass}
            value={profile?.full_name ?? ''}
            onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label className={labelClass}>Telefone / WhatsApp</label>
          <input
            className={inputClass}
            value={profile?.phone ?? ''}
            onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className={labelClass}>CPF *</label>
          <input
            className={inputClass}
            value={profile?.cpf ?? ''}
            onChange={(e) => setProfile((p) => (p ? { ...p, cpf: e.target.value } : p))}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Chave Pix *</label>
          <input
            className={inputClass}
            value={profile?.pix_key ?? ''}
            onChange={(e) =>
              setProfile((p) => (p ? { ...p, pix_key: e.target.value } : p))
            }
            placeholder="CPF, email, telefone ou chave aleatória"
          />
          <p className="mt-1 text-[11px] text-white/45">
            Usaremos essa chave para pagamentos de vendas aprovadas.
          </p>
        </div>

        <div className="md:col-span-2 mt-2 flex justify-end">
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
