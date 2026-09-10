import React from 'react';
import { useStore } from '../../store';

export const FlipFlopGame: React.FC = () => {
  const stopGame = useStore((state) => state.stopGame);

  return (
    <div className="absolute inset-0 z-30 bg-black font-mono select-none overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-20 h-12 border-b border-cyan-400/30 bg-black/95 flex items-center justify-between px-3">
        <div className="text-[11px] tracking-[0.22em] text-cyan-300">FLIP FLOP // ORIGINAL PORT</div>
        <button
          type="button"
          onClick={stopGame}
          className="min-h-11 px-4 border border-cyan-400/50 text-cyan-200 text-xs tracking-widest active:bg-cyan-300/15"
        >
          EXIT
        </button>
      </div>
      <iframe
        title="FLIP FLOP"
        src="/basic-computer-games/36_Flip_Flop/javascript/flipflop.html"
        className="absolute inset-x-0 bottom-0 top-12 h-[calc(100%-3rem)] w-full border-0 bg-black"
      />
    </div>
  );
};
