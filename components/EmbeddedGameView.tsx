import React, { useEffect, useRef, useState } from 'react';

export const EmbeddedGameView: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="nr-embedded-game" role="dialog" aria-modal="true" aria-label="CAT TERRITORY">
      <header className="nr-embedded-game__bar">
        <button ref={closeRef} type="button" className="nr-embedded-game__close" onClick={onClose} aria-label="Close CAT TERRITORY and return to ARCADE">← BACK</button>
        <div className="nr-embedded-game__title">
          <strong>CAT TERRITORY</strong>
          <span>{loaded ? 'RUNNING INSIDE NEURO//RUNNER' : 'MOUNTING…'}</span>
        </div>
      </header>
      <iframe
        className="nr-embedded-game__frame"
        src={url}
        title="CAT TERRITORY"
        allow="fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
    </section>
  );
};
