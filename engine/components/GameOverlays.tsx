import React from 'react';
import type { GameConfig, GameProgress, LevelResult } from '../../types';
import type { GameState } from '../core/gameTypes';

interface GameOverlaysProps {
  state: GameState;
  gameId: string;
  initLoadProgress: number;
  selectedLevelIndex: number;
  score: number;
  instructions: string[];
  gameConfig: GameConfig;
  gameProgress: GameProgress;
  levelResult: LevelResult | null;
  onEngage: () => void;
  onStartLevel: (level: number) => void;
  onExit: () => void;
  onOpenLevelSelect: () => void;
  onInitialize: () => void;
  onResume: () => void;
  onNextLevel: () => void;
}

const overlaySafeStyle = {
  paddingTop: 'max(0.75rem, var(--tg-safe-area-top, 0px))',
  paddingBottom: 'max(0.75rem, var(--tg-safe-area-bottom, 0px))',
  paddingLeft: 'max(0.75rem, var(--tg-safe-area-left, 0px))',
  paddingRight: 'max(0.75rem, var(--tg-safe-area-right, 0px))',
} as const;

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  state,
  gameId,
  initLoadProgress,
  selectedLevelIndex,
  score,
  instructions,
  gameConfig,
  gameProgress,
  levelResult,
  onEngage,
  onStartLevel,
  onExit,
  onOpenLevelSelect,
  onInitialize,
  onResume,
  onNextLevel,
}) => {
  const selectedLevel = gameConfig.levels.find((level) => level.index === selectedLevelIndex);
  const isFinalLevel = selectedLevelIndex >= gameConfig.levels.length;

  return (
    <>
      {state === 'INIT_LOADING' && (
        <div className="absolute inset-0 z-[80] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300" style={overlaySafeStyle}>
          <div className="text-cyan-400 font-bold text-base sm:text-lg tracking-[0.3em] sm:tracking-[0.5em] mb-4 text-center uppercase neon-text animate-pulse break-all max-w-[90vw]">
            BOOTING {gameId}
          </div>
          <div className="relative h-1.5 w-48 sm:w-64 max-w-[75vw] bg-cyan-950/20 mb-2 overflow-hidden border border-cyan-900/30">
            <div className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_15px_rgba(0,240,255,1)]" style={{ width: `${initLoadProgress}%` }} />
          </div>
        </div>
      )}

      {state === 'WAITING_TO_START' && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer" style={overlaySafeStyle} onClick={onEngage}>
          <div className="bg-black/85 border border-cyan-500/40 px-5 py-5 sm:px-8 sm:py-6 cyber-shape flex flex-col items-center animate-pulse max-w-[92vw] text-center">
            <div className="text-cyan-400 font-bold tracking-[0.16em] sm:tracking-[0.2em] text-sm uppercase mb-2 neon-text">SYSTEM READY</div>
            <div className="text-[9px] sm:text-[10px] text-cyan-700 font-mono uppercase tracking-[0.08em] sm:tracking-widest">[ TAP / PRESS KEY TO ENGAGE ]</div>
          </div>
        </div>
      )}

      {state === 'LEVEL_SELECT' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[60] backdrop-blur-md animate-in fade-in duration-500" style={overlaySafeStyle}>
          <div className="max-w-4xl w-full border border-cyan-500/20 bg-black/85 p-4 sm:p-6 md:p-8 shadow-[0_0_100px_rgba(0,240,255,0.1)] relative flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[85dvh]">
            <button onClick={onExit} className="absolute top-3 right-3 text-red-500 font-bold border border-red-900/40 w-11 h-11 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all z-10 cyber-shape" aria-label="Exit game">✕</button>
            <h2 className="text-lg sm:text-xl md:text-3xl text-cyan-400 font-bold mb-4 sm:mb-6 pr-12 tracking-[0.14em] sm:tracking-[0.2em] uppercase text-center neon-text">SELECT NODE</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar overscroll-contain">
              <button onClick={() => onStartLevel(0)} className="group min-h-12 flex justify-between items-center border border-green-500/20 p-3 sm:p-4 transition-all text-left hover:bg-green-500/10">
                <div className="text-green-500 font-bold tracking-widest text-[11px] sm:text-xs">SANDBOX_MODE</div>
                <div className="text-green-500 text-[9px] font-bold opacity-60">UNSAFE {'>'}</div>
              </button>
              {gameConfig.levels.map((level) => {
                const levelProgress = gameProgress.levels[level.levelId];
                const isUnlocked = gameProgress.unlockedLevels.includes(level.levelId);
                const isCompleted = levelProgress?.state === 'COMPLETED' || levelProgress?.state === 'PERFECT';
                return (
                  <button
                    key={level.levelId}
                    disabled={!isUnlocked}
                    onClick={() => onStartLevel(level.index)}
                    className={`group min-h-14 flex justify-between items-center border p-3 sm:p-4 transition-all text-left ${!isUnlocked ? 'border-gray-900 opacity-30 cursor-not-allowed bg-black' : isCompleted ? 'border-cyan-500/50 bg-cyan-900/10 hover:bg-cyan-900/20' : 'border-cyan-500/20 hover:bg-cyan-500/10'}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className={`font-bold tracking-widest text-[11px] sm:text-xs mb-1 truncate ${!isUnlocked ? 'text-gray-600' : 'text-cyan-100'}`}>{level.name} {isCompleted && '✓'}</div>
                      <div className="text-[8px] text-cyan-800 uppercase font-black tracking-wider truncate">{level.difficulty}{levelProgress?.bestScore ? ` // HI: ${levelProgress.bestScore}` : ''}</div>
                    </div>
                    {!isUnlocked && <span className="text-gray-600 text-lg shrink-0">🔒</span>}
                    {isUnlocked && !isCompleted && <div className="text-cyan-400 text-[9px] font-bold shrink-0">START {'>'}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {state === 'BRIEFING' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-50 animate-in fade-in zoom-in-95 duration-300" style={overlaySafeStyle}>
          <div className="max-w-lg w-full max-h-[calc(100dvh-5rem)] overflow-y-auto custom-scrollbar border border-cyan-500/30 p-5 sm:p-8 md:p-10 bg-black/95 shadow-[0_0_100px_rgba(0,240,255,0.05)] relative">
            <button onClick={onOpenLevelSelect} className="absolute top-3 right-3 text-cyan-700 hover:text-cyan-400 transition-all font-bold w-11 h-11 text-xl" aria-label="Close briefing">✕</button>
            <h2 className="text-xl sm:text-2xl text-cyan-400 font-bold mb-5 sm:mb-8 pr-10 tracking-[0.14em] sm:tracking-[0.2em] text-center uppercase neon-text">MISSION START</h2>
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-[10px] sm:text-[11px] text-cyan-100/75 leading-relaxed font-bold tracking-wide sm:tracking-wider">
              {instructions.map((line, index) => (
                <div key={`${line}-${index}`} className="flex gap-3 sm:gap-4 items-start"><span className="text-cyan-500 mt-1 shrink-0">{'>'}</span><span>{line.toUpperCase()}</span></div>
              ))}
              {selectedLevel?.goals.map((goal) => (
                <div key={goal.id} className="flex gap-3 sm:gap-4 items-start text-white"><span className="text-green-500 mt-1 shrink-0">GOAL:</span><span>{goal.label}</span></div>
              ))}
            </div>
            <button onClick={onInitialize} className="w-full min-h-12 bg-cyan-500 text-black py-3 sm:py-4 hover:bg-white transition-all uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)]">INITIALIZE</button>
          </div>
        </div>
      )}

      {state === 'PAUSED' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-[80] backdrop-blur-md animate-in fade-in duration-300" style={overlaySafeStyle}>
          <div className="text-center p-7 sm:p-10 md:p-12 border border-yellow-500/20 bg-black shadow-[0_0_80px_rgba(234,179,8,0.05)] relative w-full max-w-md">
            <button onClick={onOpenLevelSelect} className="absolute top-3 right-3 text-yellow-800 hover:text-yellow-500 transition-all font-bold w-11 h-11 text-xl" aria-label="Open level menu">✕</button>
            <h2 className="text-2xl md:text-4xl text-yellow-400 font-black mb-7 sm:mb-10 tracking-[0.14em] sm:tracking-[0.2em]">SUSPENDED</h2>
            <button onClick={onResume} className="bg-yellow-500 text-black min-h-12 px-8 py-3 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs hover:bg-white transition-all">RESUME</button>
          </div>
        </div>
      )}

      {state === 'LEVEL_COMPLETE' && levelResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] backdrop-blur-3xl animate-in zoom-in-95 duration-500" style={overlaySafeStyle}>
          <div className="w-full max-w-lg max-h-[calc(100dvh-4rem)] overflow-y-auto custom-scrollbar border-y-4 border-green-500 bg-black p-5 sm:p-8 relative flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl text-green-500 font-black tracking-tighter uppercase mb-2 neon-text text-center">COMPLETE</h2>
            <div className="text-green-800 font-bold tracking-[0.25em] sm:tracking-[0.5em] text-[8px] mb-5 sm:mb-8 uppercase text-center">SECTOR {selectedLevelIndex} SECURED</div>
            <div className="w-full space-y-3 mb-6 sm:mb-8">
              {selectedLevel?.goals.map((goal) => (
                <div key={goal.id} className="flex justify-between gap-3 items-center border-b border-green-900/30 pb-2">
                  <span className="text-green-100 text-[11px] sm:text-xs tracking-wide sm:tracking-wider">{goal.label}</span>
                  <span className={`${levelResult.goalsCompleted[goal.id] ? 'text-green-500' : 'text-gray-600'} font-bold shrink-0`}>{levelResult.goalsCompleted[goal.id] ? '[ OK ]' : '[FAIL]'}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2"><span className="text-gray-500 text-[10px] uppercase">TOTAL SCORE</span><span className="text-green-400 font-mono text-xl tabular-nums">{levelResult.score}</span></div>
            </div>
            <div className="flex gap-2 sm:gap-4 w-full">
              <button onClick={onOpenLevelSelect} className="flex-1 min-h-12 border border-green-900/50 text-green-600 py-3 font-bold text-[10px] tracking-widest hover:bg-green-900/10">MENU</button>
              {!isFinalLevel && (
                <button onClick={onNextLevel} className="flex-[2] min-h-12 bg-green-500 text-black py-3 font-black text-[10px] sm:text-xs tracking-[0.18em] sm:tracking-[0.3em] hover:bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)]">NEXT LEVEL</button>
              )}
            </div>
          </div>
        </div>
      )}

      {state === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] backdrop-blur-3xl animate-in fade-in duration-500" style={overlaySafeStyle}>
          <div className="text-center border border-red-500/40 p-7 sm:p-10 md:p-14 bg-black shadow-[0_0_150px_rgba(239,68,68,0.1)] relative w-full max-w-lg">
            <button onClick={onExit} className="absolute top-3 right-3 text-red-800 hover:text-red-500 transition-all font-bold w-11 h-11 text-2xl" aria-label="Exit game">✕</button>
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_#ef4444]" />
            <h2 className="text-4xl md:text-6xl text-red-600 font-black mb-6 sm:mb-10 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">CRASHED</h2>
            <div className="space-y-2 mb-7 sm:mb-10"><p className="text-red-100 font-black tracking-[0.12em] sm:tracking-[0.2em] text-xs sm:text-sm tabular-nums">FINAL_SCORE: {score}</p></div>
            <button onClick={() => onStartLevel(selectedLevelIndex)} className="bg-red-500 text-black min-h-12 px-8 sm:px-12 py-3 sm:py-4 hover:bg-white transition-all uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black text-xs">RETRY</button>
          </div>
        </div>
      )}
    </>
  );
};
