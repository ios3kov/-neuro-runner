import React from 'react';

interface GameHudProps {
  level: number;
  score: number;
  progress: number;
  soundEnabled: boolean;
  onExit: () => void;
  onToggleSound: () => void;
}

const safeHorizontalPadding = {
  paddingLeft: 'max(0.5rem, var(--tg-safe-area-left, 0px))',
  paddingRight: 'max(0.5rem, var(--tg-safe-area-right, 0px))',
  paddingTop: 'max(0.5rem, var(--tg-safe-area-top, 0px))',
} as const;

export const GameHud: React.FC<GameHudProps> = ({
  level,
  score,
  progress,
  soundEnabled,
  onExit,
  onToggleSound,
}) => (
  <div
    className="flex justify-between items-center py-2 sm:py-3 md:py-4 bg-black/90 backdrop-blur-xl border-b border-cyan-500/10 z-40 relative min-h-[60px] md:min-h-[72px]"
    style={safeHorizontalPadding}
  >
    <button
      onClick={onExit}
      className="text-red-500 font-bold border border-red-900/40 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all shrink-0 cyber-shape"
      aria-label="Exit game"
    >
      ✕
    </button>

    <div className="flex flex-col items-center mx-2 sm:mx-4 min-w-0 flex-1 max-w-4xl">
      <div className="flex justify-between w-full items-end mb-1 gap-2 min-w-0">
        <div className="text-[9px] sm:text-[10px] text-cyan-700 font-bold tracking-[0.12em] sm:tracking-widest uppercase whitespace-nowrap">
          <span className="hidden min-[390px]:inline">LEVEL </span>{level}
        </div>
        <div className="text-cyan-400 font-bold tracking-[0.08em] sm:tracking-widest text-base sm:text-lg md:text-xl leading-none neon-text tabular-nums truncate">
          {score.toString().padStart(7, '0')}
        </div>
      </div>
      <div className="w-full h-1.5 sm:h-1 bg-cyan-950/30 relative overflow-hidden border border-cyan-500/5">
        <div
          className="absolute h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_10px_#00f0ff]"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>

    <button
      onClick={onToggleSound}
      className={`border transition-all flex items-center justify-center w-11 h-11 md:w-10 md:h-10 shrink-0 cyber-shape ${soundEnabled ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' : 'text-gray-700 border-gray-900'}`}
      aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
    >
      {soundEnabled ? '🔊' : '🔇'}
    </button>
  </div>
);
