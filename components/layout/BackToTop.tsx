'use client';

export function BackToTop() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-sand py-10">
      <div className="mx-auto max-w-6xl px-4 flex justify-center">
        <button
          onClick={scrollToTop}
          className="
            inline-flex items-center gap-2
            rounded-full border border-black/10
            bg-white px-5 py-3
            text-sm font-semibold text-black
            hover:bg-black/5 transition
          "
        >
          ↑ Voltar ao topo
        </button>
      </div>
    </div>
  );
}
