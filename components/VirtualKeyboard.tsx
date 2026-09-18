import React, { useEffect, useMemo, useState } from 'react';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onNext?: () => void;
  onClose?: () => void;
  submitLabel?: string;
  showNext?: boolean;
}

const ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

const printable = (key: string) => /^[a-z0-9 _-]$/i.test(key);

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onDelete,
  onClear,
  onSubmit,
  onNext,
  onClose,
  submitLabel = 'ENTER',
  showNext = false,
}) => {
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const update = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setCoarsePointer(coarse || navigator.maxTouchPoints > 0);
    };
    update();
    const mq = window.matchMedia?.('(pointer: coarse)');
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, []);

  const keyHandler = useMemo(() => (event: KeyboardEvent) => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      onDelete();
      return;
    }
    if (event.key === 'Escape') {
      if (onClose) {
        event.preventDefault();
        onClose();
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (showNext && onNext) onNext();
      else onSubmit();
      return;
    }
    if (event.key === 'Tab' && onNext) {
      event.preventDefault();
      onNext();
      return;
    }
    if (printable(event.key)) {
      event.preventDefault();
      onKeyPress(event.key.toUpperCase());
    }
  }, [onClose, onDelete, onKeyPress, onNext, onSubmit, showNext]);

  useEffect(() => {
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [keyHandler]);

  if (!coarsePointer) return null;

  const run = (action: () => void) => {
    audio.resume();
    audio.playClick();
    haptics.impactLight();
    action();
  };

  return (
    <section className="nr-virtual-keyboard" aria-label="NEURO RUNNER keyboard">
      <div className="nr-virtual-keyboard__top">
        <span>SECURE_INPUT_METHOD</span>
        {onClose && <button type="button" onPointerDown={event => { event.preventDefault(); run(onClose); }} aria-label="Hide keyboard">▼</button>}
      </div>
      <div className="nr-virtual-keyboard__rows">
        {ROWS.map((row, rowIndex) => (
          <div className="nr-virtual-keyboard__row" key={rowIndex}>
            {row.map(key => <button type="button" key={key} onPointerDown={event => { event.preventDefault(); run(() => onKeyPress(key)); }}>{key}</button>)}
          </div>
        ))}
        <div className="nr-virtual-keyboard__row nr-virtual-keyboard__actions">
          <button type="button" onPointerDown={event => { event.preventDefault(); run(onClear); }}>CLR</button>
          <button type="button" className="nr-key-space" onPointerDown={event => { event.preventDefault(); run(() => onKeyPress(' ')); }}>SPACE</button>
          <button type="button" onPointerDown={event => { event.preventDefault(); run(onDelete); }}>⌫</button>
          <button type="button" className="nr-key-enter" onPointerDown={event => { event.preventDefault(); run(showNext && onNext ? onNext : onSubmit); }}>{showNext ? 'NEXT' : submitLabel}</button>
        </div>
      </div>
    </section>
  );
};
