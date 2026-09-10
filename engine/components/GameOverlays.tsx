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
}) => (
  <>
    {state === 'INIT_LOADING' && (
      <div className="absolute inset-0 z-[80] bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
        <div className="text-cyan-400 font-bold text-lg tracking-[0.5em] mb-4 text-center uppercase neon-text animate-pulse">
          BOOTING {gameId}
        </div>
        <div className="relative h-1 w-48 bg-cyan-950/20 mb-2 overflow-hidden border border-cyan-900/30">
          <div
            className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_15px_rgba(0,240,255,1)]"
            style={{ width: `${initLoadProgress}%` }}
          />
        </div>
      </div>
    )}

    {state === 'WAITING_TO_START' && (
      <div
        className="absolute inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
        onClick={onEngage}
      >
        <div className="bg-black/80 border border-cyan-500/40 px-8 py-6 cyber-shape flex flex-col items-center animate-pulse">
          <div className="text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase mb-2 neon-text">SYSTEM READY</div>
          <div className="text-[10px] text-cyan-800 font-mono uppercase tracking-widest">[ TAP SCREEN TO ENGAGE ]</div>
        </div>
      </div>
    )}

    {state === 'LEVEL_SELECT' && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[60] p-6 backdrop-blur-md animate-in fade-in duration-500">
        <div className="max-w-xl w-full border border-cyan-500/20 bg-black/80 p-6 md:p-14 shadow-[0_0_100px_rgba(0,240,255,0.1)] relative flex flex-col max-h-[80vh]">
          <button onClick={onExit} className="absolute top-4 right-4 text-red-500 font-bold border border-red-900/40 w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all z-10">✕</button>
          <h2 className="text-xl md:text-3xl text-cyan-400 font-bold mb-6 tracking-[0.2em] uppercase text-center neon-text">SELECT NODE</h2>
          <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 custom-scrollbar">
            <button onClick={() => onStartLevel(0)} className="group flex justify-between items-center border border-green-500/20 p-4 transition-all text-left hover:bg-green-500/10">
              <div className="text-green-500 font-bold tracking-widest text-xs">SANDBOX_MODE</div>
              <div className="text-green-500 text-[9px] font-bold opacity-50">UNSAFE {'>'}</div>
            </button>
            {gameConfig.levels.map((lvl) => {
              const progress = gameProgress.levels[lvl.levelId];
              const isUnlocked = gameProgress.unlockedLevels.includes(lvl.levelId);
              const isCompleted = progress?.state === 'COMPLETED' || progress?.state === 'PERFECT';
              return (
                <button
                  key={lvl.levelId}
                  disabled={!isUnlocked}
                  onClick={() => onStartLevel(lvl.index)}
                  className={`group flex justify-between items-center border p-4 transition-all text-left ${!isUnlocked ? 'border-gray-900 opacity-30 cursor-not-allowed bg-black' : isCompleted ? 'border-cyan-500/50 bg-cyan-900/10 hover:bg-cyan-900/20' : 'border-cyan-500/20 hover:bg-cyan-500/10'}`}
                >
                  <div>
                    <div className={`font-bold tracking-widest text-xs mb-1 ${!isUnlocked ? 'text-gray-600' : 'text-cyan-100'}`}>{lvl.name} {isCompleted && '✓'}</div>
                    <div className="text-[7px] text-cyan-900 uppercase font-black tracking-widest">{lvl.difficulty}{progress?.bestScore ? ` // HI: ${progress.bestScore}` : ''}</div>
                  </div>
                  {!isUnlocked && <span className="text-gray-600 text-lg">🔒</span>}
                  {isUnlocked && !isCompleted && <div className="text-cyan-400 text-[9px] font-bold">START {'>'}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {state === 'BRIEFING' && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="max-w-md w-full border border-cyan-500/30 p-8 md:p-12 bg-black/90 shadow-[0_0_100px_rgba(0,240,255,0.05)] relative overflow-hidden">
          <button onClick={onOpenLevelSelect} className="absolute top-4 right-4 text-cyan-900 hover:text-cyan-400 transition-all font-bold text-xl">✕</button>
          <h2 className="text-2xl text-cyan-400 font-bold mb-8 tracking-[0.2em] text-center uppercase neon-text">MISSION START</h2>
          <div className="space-y-4 mb-8 text-[10px] text-cyan-100/70 leading-relaxed font-bold tracking-wider">
            {instructions.map((line, index) => (
              <div key={`${line}-${index}`} className="flex gap-4 items-start"><span className="text-cyan-500 mt-1">{'>'}</span><span>{line.toUpperCase()}</span></div>
            ))}
            {gameConfig.levels.find((lvl) => lvl.index === selectedLevelIndex)?.goals.map((goal) => (
              <div key={goal.id} className="flex gap-4 items-start text-white"><span className="text-green-500 mt-1">Goal:</span><span>{goal.label}</span></div>
            ))}
          </div>
          <button onClick={onInitialize} className="w-full bg-cyan-500 text-black py-4 hover:bg-white transition-all uppercase tracking-[0.3em] font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)]">INITIALIZE</button>
        </div>
      </div>
    )}

    {state === 'PAUSED' && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[80] backdrop-blur-md animate-in fade-in duration-300">
        <div className="text-center p-12 border border-yellow-500/20 bg-black shadow-[0_0_80px_rgba(234,179,8,0.05)] relative mx-4">
          <button onClick={onOpenLevelSelect} className="absolute top-4 right-4 text-yellow-900 hover:text-yellow-500 transition-all font-bold text-xl">✕</button>
          <h2 className="text-2xl md:text-4xl text-yellow-400 font-black mb-12 tracking-[0.2em]">SUSPENDED</h2>
          <button onClick={onResume} className="bg-yellow-500 text-black px-8 py-4 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all">RESUME</button>
        </div>
      </div>
    )}

    {state === 'LEVEL_COMPLETE' && levelResult && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] backdrop-blur-3xl animate-in zoom-in-95 duration-500">
        <div className="w-full max-w-md border-y-4 border-green-500 bg-black p-8 relative flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl text-green-500 font-black tracking-tighter uppercase mb-2 neon-text text-center">COMPLETE</h2>
          <div className="text-green-900 font-bold tracking-[0.5em] text-[8px] mb-8 uppercase">SECTOR {selectedLevelIndex} SECURED</div>
          <div className="w-full space-y-3 mb-8">
            {gameConfig.levels.find((lvl) => lvl.index === selectedLevelIndex)?.goals.map((goal) => (
              <div key={goal.id} className="flex justify-between items-center border-b border-green-900/30 pb-2">
                <span className="text-green-100 text-xs tracking-wider">{goal.label}</span>
                <span className={`${levelResult.goalsCompleted[goal.id] ? 'text-green-500' : 'text-gray-600'} font-bold`}>{levelResult.goalsCompleted[goal.id] ? '[ OK ]' : '[FAIL]'}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2"><span className="text-gray-500 text-[10px] uppercase">TOTAL SCORE</span><span className="text-green-400 font-mono text-xl">{levelResult.score}</span></div>
          </div>
          <div className="flex gap-4 w-full">
            <button onClick={onOpenLevelSelect} className="flex-1 border border-green-900/50 text-green-700 py-4 font-bold text-[10px] tracking-widest hover:bg-green-900/10">MENU</button>
            <button onClick={onNextLevel} className="flex-[2] bg-green-500 text-black py-4 font-black text-xs tracking-[0.3em] hover:bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)]">NEXT LEVEL</button>
          </div>
        </div>
      </div>
    )}

    {state === 'GAMEOVER' && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] backdrop-blur-3xl animate-in fade-in duration-500">
        <div className="text-center border border-red-500/40 p-8 md:p-16 bg-black shadow-[0_0_150px_rgba(239,68,68,0.1)] relative mx-4 w-full max-w-lg">
          <button onClick={onExit} className="absolute top-4 right-4 text-red-900 hover:text-red-500 transition-all font-bold text-2xl">✕</button>
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_#ef4444]" />
          <h2 className="text-4xl md:text-6xl text-red-600 font-black mb-10 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">CRASHED</h2>
          <div className="space-y-2 mb-12"><p className="text-red-100 font-black tracking-[0.2em] text-sm">FINAL_SCORE: {score}</p></div>
          <button onClick={() => onStartLevel(selectedLevelIndex)} className="bg-red-500 text-black px-12 py-5 hover:bg-white transition-all uppercase tracking-[0.3em] font-black text-xs">RETRY</button>
        </div>
      </div>
    )}
  </>
);
