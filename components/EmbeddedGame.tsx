import React, { useState } from 'react';

interface EmbeddedGameProps {
  title: string;
  url: string;
  onClose: () => void;
}

export const EmbeddedGame: React.FC<EmbeddedGameProps> = ({ title, url, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="absolute inset-0 z-40 flex flex-col bg-black" aria-label={title}>
      <header className="shrink-0 min-h-14 flex items-center justify-between gap-3 px-3 md:px-5 border-b border-cyan-900 bg-[#050b10]">
        <div className="min-w-0">
          <p className="nr-kicker">NEURO//RUNNER / ARCADE</p>
          <h1 className="text-sm md:text-base font-bold text-cyan-300 truncate">{title}</h1>
        </div>
        <button type="button" className="nr-secondary shrink-0" onClick={onClose} aria-label="Close CAT TERRITORY and return to Neuro Runner">
          ✕ CLOSE
        </button>
      </header>
      <div className="relative flex-1 min-h-0 bg-black">
        {!loaded && <div className="absolute inset-0 grid place-items-center text-cyan-400 text-xs tracking-widest" role="status">LOADING CAT TERRITORY…</div>}
        <iframe
          title={title}
          src={url}
          className="relative z-10 block w-full h-full border-0 bg-black"
          allow="autoplay; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </section>
  );
};
