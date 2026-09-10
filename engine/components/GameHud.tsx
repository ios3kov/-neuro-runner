import React from 'react';

interface GameHudProps {
  level: number;
  score: number;
  progress: number;
  soundEnabled: boolean;
  onExit: () => void;
  onToggleSound: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  level,
  score,
  progress,
  soundEnabled,
  onExit,
  onToggleSound,
}) => (
  <div className="flex justify-between items-center p-4 bg-black/90 backdrop-blur-xl border-b border-cyan-500/10 z-40 relative">
    <button
      onClick={onExit}
      className="text-red-500 font-bold border border-red-900/40 w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all shrink-0"
      aria-label="Exit game"
    >
      ✕
    </button>
    <div className="flex flex-col items-center mx-4 w-full">
      <div className="flex justify-between w-full items-end mb-1">
        <div className="text-[10px] text-cyan-800 font-bold tracking-widest uppercase">
          LEVEL {level}
        </div>
        <div className="text-cyan-400 font-bold tracking-widest text-lg leading-none neon-text">
          {score.toString().padStart(7, '0')}
        </div>
      </div>
      <div className="w-full h-1 bg-cyan-950/30 relative overflow-hidden">
        <div
          className="absolute h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_10px_#00f0ff]"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
    </div>
    <div className="flex gap-3 shrink-0 ml-4">
      <button
        onClick={onToggleSound}
        className={`border p-1.5 transition-all flex items-center justify-center w-10 h-10 ${soundEnabled ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' : 'text-gray-700 border-gray-900'}`}
        aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
    </div>
  </div>
);
