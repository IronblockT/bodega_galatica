import Link from 'next/link';

function MailIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m5 7 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21a8.8 8.8 0 0 1-4.24-1.08L3.5 21l1.15-4.12A8.96 8.96 0 1 1 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 9.1c-.2-.45-.4-.46-.6-.47h-.5c-.17 0-.45.06-.68.31-.23.25-.88.86-.88 2.09s.9 2.42 1.03 2.58c.12.17 1.73 2.77 4.28 3.77 2.11.82 2.54.66 3 .62.46-.04 1.48-.6 1.69-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.17-.48-.29-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.56.13-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.13-1.05-.4-2-1.29-.74-.66-1.24-1.48-1.39-1.73-.15-.25-.02-.38.11-.5.12-.12.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.43-.76-1.87Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#07080A] text-white/70">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-5">
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
            <li>
              <Link href="/cartas" className="hover:text-white">
                Cartas
              </Link>
            </li>
            <li>
              <Link href="/vender" className="hover:text-white">
                Vender
              </Link>
            </li>
            <li>
              <Link href="/acessorios" className="hover:text-white">
                Acessórios
              </Link>
            </li>
            <li>
              <Link href="/merch" className="hover:text-white">
                Merch
              </Link>
            </li>
          </ul>
        </div>

        {/* COMUNIDADE */}
        <div>
          <div className="text-sm font-semibold text-white">Comunidade</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/comunidade" className="hover:text-white">
                BGON
              </Link>
            </li>
            <li>
              <Link href="/comunidade" className="hover:text-white">
                Eventos
              </Link>
            </li>
            <li>
              <Link href="/comunidade" className="hover:text-white">
                Guias
              </Link>
            </li>
            <li>
              <Link href="/comunidade" className="hover:text-white">
                Decklists
              </Link>
            </li>
          </ul>
        </div>

        {/* CONTATO */}
        <div>
          <div className="text-sm font-semibold text-white">Contato</div>
          <ul className="mt-3 space-y-3 text-sm">
            <li>
              <a
                href="mailto:Contato@bgexchange.com.br"
                className="inline-flex items-center gap-2 hover:text-white"
              >
                <MailIcon className="h-4 w-4 text-orange-400" />
                <span>Contato@bgexchange.com.br</span>
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/5511911070032"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 whitespace-nowrap hover:text-white"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0 text-orange-400" />
                <span className="whitespace-nowrap">WhatsApp: (11) 91107-0032</span>
              </a>
            </li>
          </ul>
        </div>

        {/* LEGAL */}
        <div>
          <div className="text-sm font-semibold text-white">Legal</div>
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            Star Wars™ e Star Wars: Unlimited™ são marcas registradas
            de seus respectivos proprietários.
            A Bodega Galática não é afiliada à Disney ou à Fantasy Flight Games.
          </p>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-4 text-xs text-white/40 md:flex-row">
          <span>© {new Date().getFullYear()} Bodega Galática</span>
          <span>Feito no Brasil • Para a galáxia</span>
        </div>
      </div>
    </footer>
  );
}