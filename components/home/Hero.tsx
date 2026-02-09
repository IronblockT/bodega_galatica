export function Hero() {
  return (
    <section className="relative bg-sand">
      {/* fundo sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* TEXTO */}
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
            Os maiores negociantes de{' '}
            <span className="text-orange-500">Star Wars: Unlimited</span>{' '}
            da galáxia.
          </h1>

          <p className="mt-5 text-lg text-black/65">
            Compre, venda e negocie cartas com segurança, transparência
            e escala galáctica.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/cartas"
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
            >
              Comprar Cartas
            </a>

            <a
              href="/vender"
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-black/5"
            >
              Vender Cartas
            </a>
          </div>
        </div>

        {/* VISUAL */}
        <div className="relative">
          <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-orange-100 via-orange-50 to-white shadow-premium" />

          {/* Aqui depois podemos colocar imagem ou composição */}
          <div className="absolute inset-0 flex items-center justify-center text-black/30 text-sm">
            Visual galáctico / cartas
          </div>
        </div>
      </div>
    </section>
  );
}
