
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useStore } from '../store';
import { useGameStore } from '../gameStore';
import { GAME_CONFIGS } from '../data/gameConfig';
import { audio } from '../utils/audio';
import { LogLevel, JuiceState, LevelResult } from '../types';
import { buildCompletedLevelResult } from './core/levelResults';

export interface GameCoreHandle {
  addShake: (amount: number) => void;
  triggerHitStop: (ms: number) => void;
  addChromatic: (amount: number) => void;
  emitParticles: (x: number, y: number, color: string, count: number) => void;
  levelUp: (level: number, metrics?: Record<string, number>) => void; 
}

interface GameProps {
  update: (dt: number, input: InputState, juice: GameCoreHandle) => void;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onReset: (startLevel: number) => void; 
  isGameOver: boolean;
  score: number;
  level: number;
  progress?: number; // 0 to 1
  gameId: string;
  instructions: string[];
  onSave?: () => string; 
  onLoad?: (data: string) => void; 
}

export interface InputState {
  keys: Set<string>;
  swipeDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;
  touchX: number;
  touchY: number;
  touchDeltaX: number;
  touchDeltaY: number;
  isTouching: boolean;
  tapDetected: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

type GameState = 'INIT_LOADING' | 'LEVEL_SELECT' | 'LOADING' | 'BRIEFING' | 'WAITING_TO_START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_COMPLETE';

export const GameCore = forwardRef<GameCoreHandle, GameProps>(({ 
    update, draw, onReset, isGameOver, score, level, progress = 0, gameId, instructions, onSave, onLoad 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Core Store for UI/System
  const stopGame = useStore(s => s.stopGame);
  const addLog = useStore(s => s.addLog);
  const toggleSound = useStore(s => s.toggleSound);
  const soundEnabled = useStore(s => s.user.settings.soundEnabled ?? true);
  
  // Game Store for Progression
  const submitLevelResult = useGameStore(s => s.submitLevelResult);
  const gameProgress = useGameStore(s => s.gameProgress);

  const [gameState, setGameState] = useState<GameState>('INIT_LOADING');
  const [initLoadProgress, setInitLoadProgress] = useState(0);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(1);
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const startTimeRef = useRef(0);
  
  const juiceRef = useRef<JuiceState>({ shake: 0, chromaticAberration: 0, hitStop: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const lastTouchRef = useRef<{x: number, y: number} | null>(null);

  const inputRef = useRef<InputState>({
    keys: new Set(),
    swipeDirection: null,
    touchX: 0,
    touchY: 0,
    touchDeltaX: 0,
    touchDeltaY: 0,
    isTouching: false,
    tapDetected: false
  });

  const gameConfig = GAME_CONFIGS[gameId];
  const userGameProgress = gameProgress[gameId] || { levels: {}, unlockedLevels: [`${gameId}_1`] };

  useEffect(() => {
    const preventDefault = (e: Event) => {
        if (e.type === 'touchmove' || e.type === 'gesturestart' || e.type === 'touchstart') {
            e.preventDefault();
        }
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('gesturestart', preventDefault, { passive: false });
    
    const handleVisibility = () => {
        if (document.hidden) {
            setGameState(prev => (prev === 'PLAYING' || prev === 'WAITING_TO_START') ? 'PAUSED' : prev);
        }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
        document.removeEventListener('touchmove', preventDefault);
        document.removeEventListener('gesturestart', preventDefault);
        document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleStartLevel = (lvlIndex: number) => {
    const levelId = `${gameId}_${lvlIndex}`;
    const isUnlocked = userGameProgress.unlockedLevels.includes(levelId);
    
    if (!isUnlocked && lvlIndex !== 0) { 
         audio.playError();
         return;
    }

    audio.playClick();
    setSelectedLevelIndex(lvlIndex);
    onReset(lvlIndex);
    
    if (lvlIndex === 0) {
        setGameState('BRIEFING');
    } else {
        setGameState('WAITING_TO_START');
    }
  };

  const juiceHandle: GameCoreHandle = {
    addShake: (amount) => { juiceRef.current.shake = Math.min(juiceRef.current.shake + amount, 30); },
    triggerHitStop: (ms) => { juiceRef.current.hitStop = ms; },
    addChromatic: (amount) => { juiceRef.current.chromaticAberration = Math.max(juiceRef.current.chromaticAberration, amount); },
    emitParticles: (x, y, color, count) => {
         for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 40;
            particlesRef.current.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0 + Math.random() * 0.5,
                color: color,
                size: Math.random() * 2 + 1
            });
        }
    },
    levelUp: (nextLvlNum, metrics = {}) => {
        const currentLevelId = `${gameId}_${selectedLevelIndex}`;
        const levelSpec = gameConfig.levels.find(l => l.levelId === currentLevelId);
        const finalScore = metrics.score !== undefined ? metrics.score : score;

        const result = buildCompletedLevelResult({
            gameId,
            levelId: currentLevelId,
            levelSpec,
            score: finalScore,
            metrics,
            startedAt: startTimeRef.current
        });

        setLevelResult(result);
        submitLevelResult(result);
        setGameState('LEVEL_COMPLETE');
        audio.playSuccess();
    }
  };

  useImperativeHandle(ref, () => juiceHandle);

  useEffect(() => {
    if (gameState === 'INIT_LOADING') {
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 10;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setTimeout(() => {
            if (gameConfig.skipLevelSelect) {
                onReset(1);
                setGameState('PLAYING');
                startTimeRef.current = Date.now();
            } else {
                setGameState('LEVEL_SELECT');
            }
          }, 600);
        }
        setInitLoadProgress(p);
      }, 80);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'WAITING_TO_START') return;

    const engage = () => {
        setGameState('PLAYING');
        audio.playTone(880, 'square', 0.1, 0.2); 
        startTimeRef.current = Date.now();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') return;
        engage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        inputRef.current.keys.add(e.code);
        if (e.code === 'Escape') setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
    };
    const handleKeyUp = (e: KeyboardEvent) => inputRef.current.keys.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (useStore.getState().isSuspended) {
          lastTime = time; 
          inputRef.current.keys.clear();
          inputRef.current.swipeDirection = null;
          inputRef.current.tapDetected = false;
          inputRef.current.isTouching = false;
          animationFrameId = requestAnimationFrame(loop);
          return;
      }

      let dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (juiceRef.current.shake > 0) {
          juiceRef.current.shake *= 0.9;
          if (juiceRef.current.shake < 0.5) juiceRef.current.shake = 0;
      }
      if (juiceRef.current.chromaticAberration > 0) {
          juiceRef.current.chromaticAberration *= 0.92;
          if (juiceRef.current.chromaticAberration < 0.5) juiceRef.current.chromaticAberration = 0;
      }

      if (gameState === 'PLAYING') {
          timeRef.current += dt;
          if (juiceRef.current.hitStop > 0) {
            juiceRef.current.hitStop -= dt * 1000;
            dt = 0; 
          }

          particlesRef.current.forEach(p => {
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.life -= dt * 1.2; 
          });
          particlesRef.current = particlesRef.current.filter(p => p.life > 0);
          
          update(dt, inputRef.current, juiceHandle);
          
          inputRef.current.touchDeltaX *= 0.5;
          inputRef.current.touchDeltaY *= 0.5;
      }

      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }

        if (ctx) {
            ctx.save();
            ctx.fillStyle = '#030303';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (juiceRef.current.shake > 0) {
                const dx = (Math.random() - 0.5) * juiceRef.current.shake;
                const dy = (Math.random() - 0.5) * juiceRef.current.shake;
                ctx.translate(dx, dy);
            }

            if (juiceRef.current.chromaticAberration > 2) {
                 ctx.shadowColor = 'rgba(255,0,0,0.5)';
                 ctx.shadowOffsetX = Math.random() * 4 - 2;
                 ctx.shadowOffsetY = Math.random() * 4 - 2;
            }

            draw(ctx, canvas.width, canvas.height); 
            
            const w = (val: number) => (val / 100) * canvas.width;
            const h = (val: number) => (val / 100) * canvas.height; 
            particlesRef.current.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(w(p.x), h(p.y), p.size, p.size);
            });
            ctx.globalAlpha = 1.0;
            ctx.shadowColor = 'transparent';
            ctx.restore();
        }
      }
      
      if (inputRef.current.swipeDirection) inputRef.current.swipeDirection = null;
      inputRef.current.tapDetected = false;
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [update, draw, gameState]);

  useEffect(() => {
    if (isGameOver) setGameState('GAMEOVER');
  }, [isGameOver]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState === 'WAITING_TO_START') {
        setGameState('PLAYING');
        audio.playTone(880, 'square', 0.1, 0.2);
        startTimeRef.current = Date.now();
        return;
    }

    const t = e.touches[0];
    const { clientX, clientY } = t;
    const { innerWidth, innerHeight } = window;
    const EDGE_MARGIN = 25;
    if (clientX < EDGE_MARGIN || clientX > innerWidth - EDGE_MARGIN || clientY > innerHeight - EDGE_MARGIN) return;

    setTouchStart({ x: t.clientX, y: t.clientY });
    lastTouchRef.current = { x: t.clientX, y: t.clientY };
    inputRef.current.isTouching = true;
    inputRef.current.touchX = t.clientX;
    inputRef.current.touchY = t.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (lastTouchRef.current) {
          inputRef.current.touchDeltaX = ((t.clientX - lastTouchRef.current.x) / window.innerWidth) * 200;
          inputRef.current.touchDeltaY = ((t.clientY - lastTouchRef.current.y) / window.innerHeight) * 200;
      }

      if (touchStart) {
          const dx = t.clientX - touchStart.x;
          const dy = t.clientY - touchStart.y;
          const threshold = 25; 
          if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
              if (Math.abs(dx) > Math.abs(dy)) {
                  inputRef.current.swipeDirection = dx > 0 ? 'RIGHT' : 'LEFT';
              } else {
                  inputRef.current.swipeDirection = dy > 0 ? 'DOWN' : 'UP';
              }
              setTouchStart({ x: t.clientX, y: t.clientY });
          }
      }

      lastTouchRef.current = { x: t.clientX, y: t.clientY };
      inputRef.current.touchX = t.clientX;
      inputRef.current.touchY = t.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    inputRef.current.isTouching = false;
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) inputRef.current.tapDetected = true;
    setTouchStart(null);
  };

  const handleNextLevel = () => {
      handleStartLevel(selectedLevelIndex + 1);
  };

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col font-mono select-none overflow-hidden" tabIndex={0}>
        <div className="flex justify-between items-center p-4 bg-black/90 backdrop-blur-xl border-b border-cyan-500/10 z-40 relative">
            <button 
                onClick={() => { audio.playClick(); stopGame(); }} 
                className="text-red-500 font-bold border border-red-900/40 w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all shrink-0"
            >
                ✕
            </button>
            <div className="flex flex-col items-center mx-4 w-full">
                <div className="flex justify-between w-full items-end mb-1">
                     <div className="text-[10px] text-cyan-800 font-bold tracking-widest uppercase">
                        LEVEL {selectedLevelIndex}
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
                  onClick={() => { audio.playClick(); toggleSound(); }} 
                  className={`border p-1.5 transition-all flex items-center justify-center w-10 h-10 ${soundEnabled ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' : 'text-gray-700 border-gray-900'}`}
                >
                    {soundEnabled ? "🔊" : "🔇"}
                </button>
            </div>
        </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => {
             if (gameState === 'WAITING_TO_START') {
                setGameState('PLAYING');
                audio.playTone(880, 'square', 0.1, 0.2);
                startTimeRef.current = Date.now();
            }
        }}
      />

      {gameState === 'INIT_LOADING' && (
        <div className="absolute inset-0 z-[80] bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="text-cyan-400 font-bold text-lg tracking-[0.5em] mb-4 text-center uppercase neon-text animate-pulse">
               BOOTING {gameId}
           </div>
           <div className="relative h-1 w-48 bg-cyan-950/20 mb-2 overflow-hidden border border-cyan-900/30">
                <div 
                    className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_15px_rgba(0,240,255,1)]"
                    style={{ width: `${initLoadProgress}%` }}
                ></div>
            </div>
        </div>
      )}

      {gameState === 'WAITING_TO_START' && (
          <div 
            className="absolute inset-0 z-[90] flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
            onClick={() => {
                setGameState('PLAYING');
                audio.playTone(880, 'square', 0.1, 0.2);
                startTimeRef.current = Date.now();
            }}
          >
              <div className="bg-black/80 border border-cyan-500/40 px-8 py-6 cyber-shape flex flex-col items-center animate-pulse">
                  <div className="text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase mb-2 neon-text">
                      SYSTEM READY
                  </div>
                  <div className="text-[10px] text-cyan-800 font-mono uppercase tracking-widest">
                      [ TAP SCREEN TO ENGAGE ]
                  </div>
              </div>
          </div>
      )}

      {gameState === 'LEVEL_SELECT' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[60] p-6 backdrop-blur-md animate-in fade-in duration-500">
              <div className="max-w-xl w-full border border-cyan-500/20 bg-black/80 p-6 md:p-14 shadow-[0_0_100px_rgba(0,240,255,0.1)] relative flex flex-col max-h-[80vh]">
                  <button 
                      onClick={() => { audio.playClick(); stopGame(); }}
                      className="absolute top-4 right-4 text-red-500 font-bold border border-red-900/40 w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all z-10"
                  >
                      ✕
                  </button>
                  <h2 className="text-xl md:text-3xl text-cyan-400 font-bold mb-6 tracking-[0.2em] uppercase text-center neon-text">SELECT NODE</h2>
                  
                  <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 custom-scrollbar">
                      <button 
                        onClick={() => handleStartLevel(0)} 
                        className="group flex justify-between items-center border border-green-500/20 p-4 transition-all text-left hover:bg-green-500/10"
                      >
                          <div className="text-green-500 font-bold tracking-widest text-xs">SANDBOX_MODE</div>
                          <div className="text-green-500 text-[9px] font-bold opacity-50">UNSAFE {'>'}</div>
                      </button>

                      {gameConfig.levels.map((lvl) => {
                          const levelId = lvl.levelId;
                          const prog = userGameProgress.levels[levelId];
                          const isUnlocked = userGameProgress.unlockedLevels.includes(levelId);
                          const isCompleted = prog?.state === 'COMPLETED' || prog?.state === 'PERFECT';

                          return (
                            <button 
                                key={lvl.levelId} 
                                disabled={!isUnlocked} 
                                onClick={() => handleStartLevel(lvl.index)} 
                                className={`group flex justify-between items-center border p-4 transition-all text-left ${
                                    !isUnlocked 
                                        ? 'border-gray-900 opacity-30 cursor-not-allowed bg-black' 
                                        : isCompleted
                                            ? 'border-cyan-500/50 bg-cyan-900/10 hover:bg-cyan-900/20'
                                            : 'border-cyan-500/20 hover:bg-cyan-500/10'
                                }`}
                            >
                                <div>
                                    <div className={`font-bold tracking-widest text-xs mb-1 ${!isUnlocked ? 'text-gray-600' : 'text-cyan-100'}`}>
                                        {lvl.name} {isCompleted && '✓'}
                                    </div>
                                    <div className="text-[7px] text-cyan-900 uppercase font-black tracking-widest">
                                        {lvl.difficulty}
                                        {prog?.bestScore ? ` // HI: ${prog.bestScore}` : ''}
                                    </div>
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

      {gameState === 'BRIEFING' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="max-w-md w-full border border-cyan-500/30 p-8 md:p-12 bg-black/90 shadow-[0_0_100px_rgba(0,240,255,0.05)] relative overflow-hidden">
                  <button onClick={() => setGameState('LEVEL_SELECT')} className="absolute top-4 right-4 text-cyan-900 hover:text-cyan-400 transition-all font-bold text-xl">✕</button>
                  <h2 className="text-2xl text-cyan-400 font-bold mb-8 tracking-[0.2em] text-center uppercase neon-text">MISSION START</h2>
                  <div className="space-y-4 mb-8 text-[10px] text-cyan-100/70 leading-relaxed font-bold tracking-wider">
                      {instructions.map((line, i) => (
                          <div key={i} className="flex gap-4 items-start">
                              <span className="text-cyan-500 mt-1">{'>'}</span>
                              <span>{line.toUpperCase()}</span>
                          </div>
                      ))}
                      {gameConfig.levels.find(l => l.index === selectedLevelIndex)?.goals.map(g => (
                          <div key={g.id} className="flex gap-4 items-start text-white">
                              <span className="text-green-500 mt-1">Goal:</span>
                              <span>{g.label}</span>
                          </div>
                      ))}
                  </div>
                  <button 
                    onClick={() => { audio.playSuccess(); setGameState('WAITING_TO_START'); }}
                    className="w-full bg-cyan-500 text-black py-4 hover:bg-white transition-all uppercase tracking-[0.3em] font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                  >
                      INITIALIZE
                  </button>
              </div>
          </div>
      )}

      {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-[80] backdrop-blur-md animate-in fade-in duration-300">
              <div className="text-center p-12 border border-yellow-500/20 bg-black shadow-[0_0_80px_rgba(234,179,8,0.05)] relative mx-4">
                  <button onClick={() => setGameState('LEVEL_SELECT')} className="absolute top-4 right-4 text-yellow-900 hover:text-yellow-500 transition-all font-bold text-xl">✕</button>
                  <h2 className="text-2xl md:text-4xl text-yellow-400 font-black mb-12 tracking-[0.2em]">SUSPENDED</h2>
                  <button onClick={() => setGameState('PLAYING')} className="bg-yellow-500 text-black px-8 py-4 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all">RESUME</button>
              </div>
          </div>
      )}

      {gameState === 'LEVEL_COMPLETE' && levelResult && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] backdrop-blur-3xl animate-in zoom-in-95 duration-500">
            <div className="w-full max-w-md border-y-4 border-green-500 bg-black p-8 relative flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl text-green-500 font-black tracking-tighter uppercase mb-2 neon-text text-center">
                    COMPLETE
                </h2>
                <div className="text-green-900 font-bold tracking-[0.5em] text-[8px] mb-8 uppercase">
                    SECTOR {selectedLevelIndex} SECURED
                </div>

                <div className="w-full space-y-3 mb-8">
                     {gameConfig.levels.find(l => l.index === selectedLevelIndex)?.goals.map(g => (
                         <div key={g.id} className="flex justify-between items-center border-b border-green-900/30 pb-2">
                             <span className="text-green-100 text-xs tracking-wider">{g.label}</span>
                             <span className={`${levelResult.goalsCompleted[g.id] ? 'text-green-500' : 'text-gray-600'} font-bold`}>
                                 {levelResult.goalsCompleted[g.id] ? '[ OK ]' : '[FAIL]'}
                             </span>
                         </div>
                     ))}
                     <div className="flex justify-between items-center pt-2">
                         <span className="text-gray-500 text-[10px] uppercase">TOTAL SCORE</span>
                         <span className="text-green-400 font-mono text-xl">{levelResult.score}</span>
                     </div>
                </div>

                <div className="flex gap-4 w-full">
                    <button 
                        onClick={() => setGameState('LEVEL_SELECT')} 
                        className="flex-1 border border-green-900/50 text-green-700 py-4 font-bold text-[10px] tracking-widest hover:bg-green-900/10"
                    >
                        MENU
                    </button>
                    <button 
                        onClick={handleNextLevel}
                        className="flex-[2] bg-green-500 text-black py-4 font-black text-xs tracking-[0.3em] hover:bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                    >
                        NEXT LEVEL
                    </button>
                </div>
            </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-[100] backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="text-center border border-red-500/40 p-8 md:p-16 bg-black shadow-[0_0_150px_rgba(239,68,68,0.1)] relative mx-4 w-full max-w-lg">
            <button onClick={() => stopGame()} className="absolute top-4 right-4 text-red-900 hover:text-red-500 transition-all font-bold text-2xl">✕</button>
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_#ef4444]"></div>
            <h2 className="text-4xl md:text-6xl text-red-600 font-black mb-10 tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">CRASHED</h2>
            <div className="space-y-2 mb-12">
                <p className="text-red-100 font-black tracking-[0.2em] text-sm">FINAL_SCORE: {score}</p>
            </div>
            <button onClick={() => handleStartLevel(selectedLevelIndex)} className="bg-red-500 text-black px-12 py-5 hover:bg-white transition-all uppercase tracking-[0.3em] font-black text-xs">RETRY</button>
          </div>
        </div>
      )}
    </div>
  );
});
