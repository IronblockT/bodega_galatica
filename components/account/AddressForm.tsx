'use client';

type AddressRow = {
  id: string;
  user_id: string;
  label: string | null;
  is_default: boolean;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
};

const panelClass = 'rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur';
const titleClass = 'mb-4 text-sm font-semibold uppercase tracking-wide text-white/70';
const labelClass = 'mb-1 block text-xs text-white/60';
const inputClass =
  'w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white/30';
const primaryBtn =
  'rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors disabled:opacity-40';

export function AddressForm({
  address,
  setAddress,
  onSave,
  saving,
  userId,
}: {
  address: AddressRow | null;
  setAddress: React.Dispatch<React.SetStateAction<AddressRow | null>>;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  userId: string;
}) {
  return (
    <div className={panelClass}>
      <h2 className={titleClass}>Endereço principal</h2>

      <form onSubmit={onSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>CEP</label>
          <input
            className={inputClass}
            value={address?.cep ?? ''}
            onChange={(e) =>
              setAddress((a) =>
                a
                  ? { ...a, cep: e.target.value }
                  : ({
                      id: '',
                      user_id: userId,
                      label: 'Principal',
                      is_default: true,
                      cep: e.target.value,
                      street: '',
                      number: '',
                      complement: '',
                      district: '',
                      city: '',
                      state: '',
                    } as AddressRow)
              )
            }
            placeholder="00000-000"
          />
        </div>

        <div>
          <label className={labelClass}>UF</label>
          <input
            className={inputClass}
            value={address?.state ?? ''}
            onChange={(e) => setAddress((a) => (a ? { ...a, state: e.target.value } : a))}
            placeholder="SP"
            maxLength={2}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Rua</label>
          <input
            className={inputClass}
            value={address?.street ?? ''}
            onChange={(e) => setAddress((a) => (a ? { ...a, street: e.target.value } : a))}
            placeholder="Rua Exemplo"
          />
        </div>

        <div>
          <label className={labelClass}>Número</label>
          <input
            className={inputClass}
            value={address?.number ?? ''}
            onChange={(e) => setAddress((a) => (a ? { ...a, number: e.target.value } : a))}
            placeholder="123"
          />
        </div>

        <div>
          <label className={labelClass}>Complemento</label>
          <input
            className={inputClass}
            value={address?.complement ?? ''}
            onChange={(e) => setAddress((a) => (a ? { ...a, complement: e.target.value } : a))}
            placeholder="Apto 45"
          />
        </div>

        <div>
          <label className={labelClass}>Bairro</label>
          <input
            className={inputClass}
            value={address?.district ?? ''}
            onChange={(e) => setAddress((a) => (a ? { ...a, district: e.target.value } : a))}
            placeholder="Centro"
          />
        </div>

        <div>
          <label className={labelClass}>Cidade</label>
          <input
            className={inputClass}
            value={address?.city ?? ''}
            onChange={(e) => setAddress((a) => (a ? { ...a, city: e.target.value } : a))}
            placeholder="São Paulo"
          />
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
