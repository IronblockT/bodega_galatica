import Link from "next/link";

const panelClass =
  "rounded-2xl border border-white/10 bg-[#0B0C10]/70 backdrop-blur shadow-2xl";

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const orderId = params?.order ?? null;

  return (
    <main className="relative min-h-screen bg-[#F6F0E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(239,68,68,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12">
        <div className={panelClass}>
          <div className="p-8">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-2xl">
              !
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              Pagamento não concluído
            </h1>

            <p className="mt-4 text-white/65">
              Não foi possível concluir seu pagamento. Você pode revisar seus itens e tentar
              novamente.
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/75">
              <span className="text-white/50">Pedido:</span>{" "}
              <span className="font-mono">{orderId ?? "—"}</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/checkout"
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-[#0B0C10] hover:bg-orange-600 transition-colors"
              >
                Tentar novamente
              </Link>

              <Link
                href="/carrinho"
                className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 transition-colors"
              >
                Voltar ao carrinho
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}