import React, { useEffect } from 'react';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { useStore } from '../store';
import { useHardwareKeyboard } from '../hooks/useHardwareKeyboard';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onNext: () => void;
  onClose: () => void;
  showSubmit: boolean;
}

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const isSupportedPrintableKey = (key: string): boolean => /^[a-z0-9 ]$/i.test(key);

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onDelete,
  onClear,
  onSubmit,
  onNext,
  onClose,
  showSubmit
}) => {
  const setKeyboardOpen = useStore(state => state.setKeyboardOpen);
  const { hasHardwareKeyboard } = useHardwareKeyboard();

  useEffect(() => {
    setKeyboardOpen(!hasHardwareKeyboard);
    return () => setKeyboardOpen(false);
  }, [hasHardwareKeyboard, setKeyboardOpen]);

  useEffect(() => {
    const handlePhysicalKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        onDelete();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (showSubmit) onSubmit();
        else onNext();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        onNext();
        return;
      }

      if (isSupportedPrintableKey(event.key)) {
        event.preventDefault();
        onKeyPress(event.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handlePhysicalKey);
    return () => window.removeEventListener('keydown', handlePhysicalKey);
  }, [onClose, onDelete, onKeyPress, onNext, onSubmit, showSubmit]);

  if (hasHardwareKeyboard) return null;

  const handleTap = (action: () => void) => {
    audio.playClick();
    haptics.impactLight();
    action();
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/95 border-t-2 border-cyan-500/50 backdrop-blur-xl z-[9999] pb-safe animate-in slide-in-from-bottom duration-300 select-none touch-none virtual-keyboard-area">
      <div className="flex justify-between items-center px-2 py-1 bg-cyan-950/20 border-b border-cyan-900/30">
        <div className="text-[9px] text-cyan-700 tracking-widest font-mono">SECURE_INPUT_METHOD_V1</div>
        <button
          onClick={(e) => { e.preventDefault(); handleTap(onClose); }}
          className="px-4 py-1 text-cyan-500 hover:text-white transition-colors"
        >
          ▼
        </button>
      </div>

      <div className="p-1 sm:p-2 flex flex-col gap-1 sm:gap-2 max-w-3xl mx-auto">
        <div className="flex w-full gap-1">
          {ROWS[0].map(key => (
            <KeyButton key={key} char={key} onClick={() => handleTap(() => onKeyPress(key))} />
          ))}
        </div>

        <div className="flex w-full gap-1">
          {ROWS[1].map(key => (
            <KeyButton key={key} char={key} onClick={() => handleTap(() => onKeyPress(key))} />
          ))}
        </div>

        <div className="flex w-full gap-1 px-[4%]">
          {ROWS[2].map(key => (
            <KeyButton key={key} char={key} onClick={() => handleTap(() => onKeyPress(key))} />
          ))}
        </div>

        <div className="flex w-full gap-1">
          <ActionButton label="CLR" color="text-red-400" onClick={() => handleTap(onClear)} width="w-[15%]" />
          <div className="flex-1 flex gap-1">
            {ROWS[3].map(key => (
              <KeyButton key={key} char={key} onClick={() => handleTap(() => onKeyPress(key))} />
            ))}
          </div>
          <ActionButton label="⌫" color="text-red-400" onClick={() => handleTap(onDelete)} width="w-[15%]" />
        </div>

        <div className="flex w-full gap-2 mt-1">
          <button
            onClick={(e) => { e.preventDefault(); handleTap(() => onKeyPress(' ')); }}
            className="flex-[3] bg-gray-900/50 border border-cyan-900/50 text-cyan-100/50 font-bold tracking-widest py-3 active:bg-cyan-500 active:text-black transition-all cyber-shape text-xs sm:text-sm uppercase"
          >
            SPACE
          </button>

          {showSubmit ? (
            <button
              onClick={(e) => { e.preventDefault(); handleTap(onSubmit); }}
              className="flex-1 bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-black tracking-widest py-3 active:bg-cyan-400 active:text-black transition-all cyber-shape text-xs sm:text-sm whitespace-nowrap"
            >
              ENTER
            </button>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); handleTap(onNext); }}
              className="flex-1 bg-cyan-900/20 border border-cyan-700 text-cyan-200 font-bold tracking-widest py-3 active:bg-cyan-700 transition-all cyber-shape text-xs sm:text-sm whitespace-nowrap"
            >
              NEXT
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const KeyButton: React.FC<{ char: string; onClick: () => void }> = ({ char, onClick }) => (
  <button
    onPointerDown={(e) => { e.preventDefault(); onClick(); }}
    className="flex-1 h-10 sm:h-12 bg-gray-900/50 border border-cyan-900/50 text-cyan-100 font-mono text-lg sm:text-xl font-bold rounded-sm active:bg-cyan-500 active:text-black active:border-cyan-400 transition-all shadow-[0_0_5px_rgba(0,240,255,0.05)]"
  >
    {char}
  </button>
);

const ActionButton: React.FC<{ label: string; onClick: () => void; width: string; color?: string }> = ({ label, onClick, width, color = 'text-cyan-400' }) => (
  <button
    onPointerDown={(e) => { e.preventDefault(); onClick(); }}
    className={`${width} h-10 sm:h-12 bg-gray-900/80 border border-red-900/30 font-bold text-xs sm:text-sm rounded-sm active:bg-red-500 active:text-black transition-all uppercase tracking-wider ${color}`}
  >
    {label}
  </button>
);
