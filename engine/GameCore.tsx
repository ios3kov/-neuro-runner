import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { useGameStore } from '../gameStore';
import { GAME_CONFIGS } from '../data/gameConfig';
import { audio } from '../utils/audio';
import type { GameProgress, JuiceState, LevelResult } from '../types';
import { buildCompletedLevelResult } from './core/levelResults';
import type { GameCoreHandle, GameState, InputState, Particle } from './core/gameTypes';
import { useGameInput } from './hooks/useGameInput';
import { useGameLoop } from './hooks/useGameLoop';
import { GameHud } from './components/GameHud';
import { GameOverlays } from './components/GameOverlays';

export type { GameCoreHandle, InputState } from './core/gameTypes';

interface GameProps {
  update: (dt: number, input: InputState, juice: GameCoreHandle) => void;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onReset: (startLevel: number) => void;
  isGameOver: boolean;
  score: number;
  level: number;
  progress?: number;
  gameId: string;
  instructions: string[];
  onSave?: () => string;
  onLoad?: (data: string) => void;
}

const fallbackProgress = (gameId: string): GameProgress => ({
  levels: {},
  unlockedLevels: [`${gameId}_1`],
});

export const GameCore = forwardRef<GameCoreHandle, GameProps>(({
  update,
  draw,
  onReset,
  isGameOver,
  score,
  level: _level,
  progress = 0,
  gameId,
  instructions,
  onSave: _onSave,
  onLoad: _onLoad,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopGame = useStore((state) => state.stopGame);
  const toggleSound = useStore((state) => state.toggleSound);
  const soundEnabled = useStore((state) => state.user.settings.soundEnabled ?? true);
  const lowPowerMode = useStore((state) => state.user.settings.lowPowerMode ?? false);
  const submitLevelResult = useGameStore((state) => state.submitLevelResult);
  const gameProgress = useGameStore((state) => state.gameProgress);

  const [gameState, setGameState] = useState<GameState>('INIT_LOADING');
  const [initLoadProgress, setInitLoadProgress] = useState(0);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(1);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const startTimeRef = useRef(0);
  const juiceRef = useRef<JuiceState>({ shake: 0, chromaticAberration: 0, hitStop: 0 });
  const particlesRef = useRef<Particle[]>([]);

  const gameConfig = GAME_CONFIGS[gameId];
  const userGameProgress = gameProgress[gameId] ?? fallbackProgress(gameId);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) return;
      setGameState((previous) =>
        previous === 'PLAYING' || previous === 'WAITING_TO_START' ? 'PAUSED' : previous,
      );
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleStartLevel = useCallback((levelIndex: number) => {
    const levelId = `${gameId}_${levelIndex}`;
    const isUnlocked = userGameProgress.unlockedLevels.includes(levelId);
    if (!isUnlocked && levelIndex !== 0) {
      audio.playError();
      return;
    }

    audio.playClick();
    setSelectedLevelIndex(levelIndex);
    setLevelResult(null);
    onReset(levelIndex);
    setGameState(levelIndex === 0 ? 'BRIEFING' : 'WAITING_TO_START');
  }, [gameId, onReset, userGameProgress.unlockedLevels]);

  const juiceHandle = useMemo<GameCoreHandle>(() => ({
    addShake: (amount) => {
      juiceRef.current.shake = Math.min(juiceRef.current.shake + amount, 30);
    },
    triggerHitStop: (ms) => {
      juiceRef.current.hitStop = ms;
    },
    addChromatic: (amount) => {
      juiceRef.current.chromaticAberration = Math.max(juiceRef.current.chromaticAberration, amount);
    },
    emitParticles: (x, y, color, count) => {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 120 + 40;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1 + Math.random() * 0.5,
          color,
          size: Math.random() * 2 + 1,
        });
      }
    },
    levelUp: (_nextLevelNumber, metrics = {}) => {
      const currentLevelId = `${gameId}_${selectedLevelIndex}`;
      const levelSpec = gameConfig.levels.find((item) => item.levelId === currentLevelId);
      const finalScore = metrics.score !== undefined ? metrics.score : score;
      const result = buildCompletedLevelResult({
        gameId,
        levelId: currentLevelId,
        levelSpec,
        score: finalScore,
        metrics,
        startedAt: startTimeRef.current,
      });
      setLevelResult(result);
      submitLevelResult(result);
      setGameState('LEVEL_COMPLETE');
      audio.playSuccess();
    },
  }), [gameConfig.levels, gameId, score, selectedLevelIndex, submitLevelResult]);

  useImperativeHandle(ref, () => juiceHandle, [juiceHandle]);

  useEffect(() => {
    if (gameState !== 'INIT_LOADING') return undefined;
    let loadProgress = 0;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      loadProgress += Math.random() * 10;
      if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(interval);
        finishTimer = setTimeout(() => {
          if (gameConfig.skipLevelSelect) {
            onReset(1);
            setGameState('PLAYING');
            startTimeRef.current = Date.now();
          } else {
            setGameState('LEVEL_SELECT');
          }
        }, 600);
      }
      setInitLoadProgress(loadProgress);
    }, 80);

    return () => {
      clearInterval(interval);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [gameConfig.skipLevelSelect, gameState, onReset]);

  const engage = useCallback(() => {
    setGameState('PLAYING');
    audio.playTone(880, 'square', 0.1, 0.2);
    startTimeRef.current = Date.now();
  }, []);

  const handleEscape = useCallback(() => {
    setGameState((previous) => previous === 'PLAYING' ? 'PAUSED' : previous === 'PAUSED' ? 'PLAYING' : previous);
  }, []);

  const {
    inputRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTransientInput,
    clearAllInput,
  } = useGameInput({
    canvasRef,
    onEscape: handleEscape,
    onEngage: engage,
    isWaitingToStart: gameState === 'WAITING_TO_START',
  });

  useGameLoop({
    canvasRef,
    inputRef,
    juiceRef,
    particlesRef,
    gameState,
    gameId,
    level: Math.max(1, selectedLevelIndex || _level || 1),
    lowPowerMode,
    update,
    draw,
    juiceHandle,
    clearAllInput,
    resetTransientInput,
  });

  useEffect(() => {
    if (isGameOver) setGameState('GAMEOVER');
  }, [isGameOver]);

  const exitGame = useCallback(() => {
    audio.playClick();
    stopGame();
  }, [stopGame]);

  const toggleGameSound = useCallback(() => {
    audio.playClick();
    toggleSound();
  }, [toggleSound]);

  const openLevelSelect = useCallback(() => setGameState('LEVEL_SELECT'), []);
  const initializeBriefing = useCallback(() => {
    audio.playSuccess();
    setGameState('WAITING_TO_START');
  }, []);
  const resume = useCallback(() => setGameState('PLAYING'), []);
  const handleNextLevel = useCallback(() => handleStartLevel(selectedLevelIndex + 1), [handleStartLevel, selectedLevelIndex]);

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col font-mono select-none overflow-hidden" tabIndex={0}>
      <GameHud
        level={selectedLevelIndex}
        score={score}
        progress={progress}
        soundEnabled={soundEnabled}
        onExit={exitGame}
        onToggleSound={toggleGameSound}
      />

      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => {
          if (gameState === 'WAITING_TO_START') engage();
        }}
      />

      <GameOverlays
        state={gameState}
        gameId={gameId}
        initLoadProgress={initLoadProgress}
        selectedLevelIndex={selectedLevelIndex}
        score={score}
        instructions={instructions}
        gameConfig={gameConfig}
        gameProgress={userGameProgress}
        levelResult={levelResult}
        onEngage={engage}
        onStartLevel={handleStartLevel}
        onExit={exitGame}
        onOpenLevelSelect={openLevelSelect}
        onInitialize={initializeBriefing}
        onResume={resume}
        onNextLevel={handleNextLevel}
      />
    </div>
  );
});

GameCore.displayName = 'GameCore';
