export function Hero() {
  return (
    <section className="relative overflow-hidden bg-sand">
      {/* fundo sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-transparent" />

      {/* glow decorativo */}
      <div className="absolute left-[-80px] top-[-80px] h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="absolute right-[-60px] bottom-[-60px] h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-24 md:grid-cols-2">
        {/* TEXTO */}
        <div>
          <div className="inline-flex items-center rounded-full border border-orange-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600 shadow-sm">
            Pré-venda exclusiva
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-black md:text-5xl">
            Reserve agora os novos decks de{" "}
            <span className="text-orange-500">Twin Suns</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-black/70">
            Garanta sua pré-venda do novo formato de Star Wars Unlimited
            na Bodega Galática. Um lançamento especial para quem quer entrar
            cedo no Twin Suns e assegurar seu produto antes da chegada oficial.
          </p>

          <div className="mt-6 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            Quantidades limitadas
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/reserva-twin-suns"
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Reservar Agora
            </a>

            <a
              href="/cartas"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-black/5"
            >
              Explorar a Loja
            </a>
          </div>

          <p className="mt-4 text-sm text-black/55">
            As reservas serão atendidas por ordem de solicitação, conforme disponibilidade do estoque.
          </p>
        </div>

        {/* VISUAL */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-100 via-orange-50 to-white p-8 shadow-premium">
            <div className="absolute right-4 top-4 rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Novo formato
            </div>

            <div className="flex min-h-[360px] flex-col justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                  Star Wars: Unlimited
                </div>

                <h2 className="mt-4 text-3xl font-semibold text-black md:text-4xl">
                  Twin Suns
                </h2>

                <p className="mt-4 max-w-md text-base text-black/65">
                  Pré-lançamento dos decks do novo formato. Uma oportunidade
                  para garantir seu produto antes que o estoque inicial se esgote.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/45">
                    Disponibilidade
                  </div>
                  <div className="mt-2 text-base font-semibold text-black">
                    Estoque inicial limitado
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/45">
                    Ação recomendada
                  </div>
                  <div className="mt-2 text-base font-semibold text-black">
                    Reserve o quanto antes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}