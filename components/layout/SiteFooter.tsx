import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="bg-[#07080A] text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* MARCA */}
        <div>
          <div className="text-lg font-semibold text-white">
            Bodega Galática
          </div>
          <p className="mt-3 text-sm text-white/60">
            Compra e venda de Star Wars: Unlimited com foco em
            comunidade, confiança e experiência premium.
          </p>
        </div>

        {/* NAVEGAÇÃO */}
        <div>
          <div className="text-sm font-semibold text-white">Explorar</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/cartas" className="hover:text-white">Cartas</Link></li>
            <li><Link href="/vender" className="hover:text-white">Vender</Link></li>
            <li><Link href="/acessorios" className="hover:text-white">Acessórios</Link></li>
            <li><Link href="/merch" className="hover:text-white">Merch</Link></li>
          </ul>
        </div>

        {/* COMUNIDADE */}
        <div>
          <div className="text-sm font-semibold text-white">Comunidade</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/comunidade" className="hover:text-white">BGON</Link></li>
            <li><Link href="/eventos" className="hover:text-white">Eventos</Link></li>
            <li><Link href="/guias" className="hover:text-white">Guias</Link></li>
          </ul>
        </div>

        {/* LEGAL */}
        <div>
          <div className="text-sm font-semibold text-white">Legal</div>
          <p className="mt-3 text-xs text-white/50 leading-relaxed">
            Star Wars™ e Star Wars: Unlimited™ são marcas registradas
            de seus respectivos proprietários.  
            A Bodega Galática não é afiliada à Disney ou à Fantasy Flight Games.
          </p>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/40 flex flex-col md:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Bodega Galática</span>
          <span>Feito no Brasil • Para a galáxia</span>
        </div>
      </div>
    </footer>
  );
}
