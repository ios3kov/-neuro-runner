import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nr_hardware_keyboard';

const readRememberedHardwareKeyboard = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const looksLikeDesktopInput = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  const noTouch = (navigator.maxTouchPoints ?? 0) === 0;
  return finePointer || noTouch;
};

export const useHardwareKeyboard = () => {
  const [hasHardwareKeyboard, setHasHardwareKeyboard] = useState<boolean>(() =>
    readRememberedHardwareKeyboard() || looksLikeDesktopInput()
  );

  const markHardwareKeyboard = useCallback(() => {
    setHasHardwareKeyboard(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Storage can be unavailable in private/embedded contexts. Runtime detection still works.
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.key === 'Unidentified') return;
      markHardwareKeyboard();
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [markHardwareKeyboard]);

  return { hasHardwareKeyboard, markHardwareKeyboard };
};
