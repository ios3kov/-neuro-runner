import { useEffect } from 'react';

export const useVisibleInterval = (callback: () => void, delayMs: number): void => {
  useEffect(() => {
    let intervalId: number | null = null;

    const stop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const start = () => {
      stop();
      if (document.hidden) return;
      intervalId = window.setInterval(callback, delayMs);
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [callback, delayMs]);
};
