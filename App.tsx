import React, { useEffect, useRef } from 'react';
import { AppContent } from './components/AppContent';
import { VisualNoiseLayer } from './components/VisualNoiseLayer';
import { useTelegram } from './hooks/useTelegram';
import { useStore } from './store';
import { audio } from './utils/audio';

const App: React.FC = () => {
  useTelegram();
  const suspended = useStore(s => s.isSuspended);
  const initialized = useStore(s => s.isRuntimeInitialized);
  const lowPower = useStore(s => s.user.settings.lowPowerMode);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const state = useStore.getState();
    const visibility = () => state.setSuspendReasons({ BACKGROUND: document.hidden });
    const hide = () => state.setSuspendReasons({ PAGEHIDE: true });
    const show = () => state.setSuspendReasons({ PAGEHIDE: false, BACKGROUND: document.hidden, LANDSCAPE: false });
    const resume = () => audio.resume();
    show(); state.initRuntime();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    document.addEventListener('pointerdown', resume, { passive: true });
    document.addEventListener('keydown', resume);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      document.removeEventListener('pointerdown', resume);
      document.removeEventListener('keydown', resume);
    };
  }, []);
  useEffect(() => { if (ref.current) ref.current.inert = suspended; }, [suspended]);
  return <main className="nr-app relative" data-low-power={lowPower} aria-label="Neuro Runner">
    {initialized && !suspended && !lowPower && <VisualNoiseLayer />}
    <div ref={ref} className="nr-content relative z-10" aria-hidden={suspended || undefined}><AppContent /></div>
  </main>;
};
export default App;
