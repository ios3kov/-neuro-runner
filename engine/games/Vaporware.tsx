import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { useStore } from '../../store';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import {
  ASSET_NAMES,
  FAKE_STUDIOS,
  TERMINAL_LINES,
  VAPOR_ACTIONS,
  VAPOR_SCREENS,
  getVaporwareRules,
  pickDeterministic,
  vaporActionLabel,
} from './vaporware/vaporwareConfig';
import type { VaporAction, VaporwareState } from './vaporware/vaporwareTypes';
import { drawVaporwareScene } from './vaporware/vaporwareRenderer';

const createState = (level: number): VaporwareState => {
  const rules = getVaporwareRules(level);
  return {
    level,
    score: (level - 1) * 700,
    lives: rules.lives,
    correct: 0,
    targetCorrect: rules.targetCorrect,
    streak: 0,
    bestStreak: 0,
    screen: 'LOGO',
    screenTimer: 0,
    screenDuration: rules.screenDurationMax,
    progress: 0,
    prompt: null,
    promptCooldown: 0.9,
    textLines: [],
    assetName: ASSET_NAMES[0],
    elapsed: 0,
    exitOpen: false,
    exitTimer: 0,
    gameOver: false,
  };
};

const isVaporwareState = (value: unknown): value is VaporwareState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<VaporwareState>;
  return typeof s.level === 'number' && typeof s.score === 'number'
    && typeof s.lives === 'number' && typeof s.correct === 'number'
    && typeof s.targetCorrect === 'number' && typeof s.screen === 'string'
    && Array.isArray(s.textLines) && typeof s.gameOver === 'boolean';
};

const detectAction = (input: InputState): VaporAction | null => {
  if (input.tapDetected) return 'TAP';
  if (input.swipeDirection === 'LEFT') return 'LEFT';
  if (input.swipeDirection === 'RIGHT') return 'RIGHT';
  if (input.swipeDirection === 'UP') return 'UP';
  if (input.swipeDirection === 'DOWN') return 'DOWN';
  if (input.keys.has('Space') || input.keys.has('Enter')) return 'TAP';
  if (input.keys.has('ArrowLeft')) return 'LEFT';
  if (input.keys.has('ArrowRight')) return 'RIGHT';
  if (input.keys.has('ArrowUp')) return 'UP';
  if (input.keys.has('ArrowDown')) return 'DOWN';
  return null;
};

export const VaporwareGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const lowPowerMode = useStore((s) => s.user.settings.lowPowerMode ?? false);
  const state = useRef<VaporwareState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: VaporwareState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(s.targetCorrect > 0 ? s.correct / s.targetCorrect : 0);
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isVaporwareState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  };

  const nextScreen = () => {
    const s = state.current;
    const rules = getVaporwareRules(s.level);
    const seed = Math.floor(s.elapsed * 10) + s.correct * 17 + s.level * 31;
    const index = (VAPOR_SCREENS.indexOf(s.screen) + 1 + (seed % 3)) % VAPOR_SCREENS.length;
    s.screen = VAPOR_SCREENS[index];
    s.screenTimer = 0;
    const span = rules.screenDurationMax - rules.screenDurationMin;
    s.screenDuration = rules.screenDurationMin + (((seed * 13) % 100) / 100) * span;
    s.progress = 0;
    s.textLines = [];
    s.assetName = pickDeterministic(ASSET_NAMES, seed);
  };

  const openPrompt = () => {
    const s = state.current;
    const rules = getVaporwareRules(s.level);
    const seed = Math.floor(s.elapsed * 100) + s.correct * 43 + s.level * 11;
    const action = pickDeterministic(VAPOR_ACTIONS, seed);
    s.prompt = {
      action,
      label: vaporActionLabel(action),
      openedAt: s.elapsed,
      expiresAt: s.elapsed + rules.promptWindow,
    };
    s.promptCooldown = rules.promptEveryMin + (((seed * 17) % 100) / 100) * (rules.promptEveryMax - rules.promptEveryMin);
    audio.playTone(780, 'square', 0.025, 0.05);
  };

  const failPrompt = (juice: GameCoreHandle) => {
    const s = state.current;
    s.prompt = null;
    s.lives -= 1;
    s.streak = 0;
    audio.playError();
    haptics.notificationError();
    juice.addShake(9);
    juice.addChromatic(16);
    juice.triggerHitStop(70);
    juice.emitParticles(50, 50, '#ff0055', 18);
    if (s.lives <= 0) {
      s.gameOver = true;
      updateStats('VAPORWARE', s.score, s.level);
      setGameOver(true);
    }
    syncUi(s);
  };

  const completePrompt = (juice: GameCoreHandle) => {
    const s = state.current;
    if (!s.prompt) return;
    const responseTime = Math.max(0, s.elapsed - s.prompt.openedAt);
    s.prompt = null;
    s.correct += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const speedBonus = Math.max(0, 200 - Math.round(responseTime * 120));
    s.score += 90 + speedBonus + s.streak * 12;
    audio.playSuccess();
    haptics.impactLight();
    juice.emitParticles(50, 50, '#00f3ff', 12);
    juice.addChromatic(s.streak >= 6 ? 5 : 2);
    if (s.correct >= s.targetCorrect) {
      s.exitOpen = true;
      s.exitTimer = 0;
      s.prompt = null;
      audio.playTone(1200, 'sine', 0.12, 0.18);
      haptics.notificationSuccess();
      juice.addShake(4);
      juice.addChromatic(10);
    }
    syncUi(s);
  };

  const escapeLoop = (juice: GameCoreHandle) => {
    const s = state.current;
    s.score += s.lives * 300 + s.bestStreak * 60;
    setScore(s.score);
    audio.playSuccess();
    haptics.notificationSuccess();
    juice.triggerHitStop(100);
    juice.addChromatic(18);
    juice.levelUp(s.level + 1, { score: s.score, itemsCollected: s.correct, bestCombo: s.bestStreak });
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    s.elapsed += dt;
    s.screenTimer += dt;
    s.progress = Math.min(1, s.screenTimer / Math.max(0.1, s.screenDuration));

    if (s.screenTimer >= s.screenDuration) nextScreen();

    if (s.screen === 'TERMINAL' && Math.floor(s.screenTimer * 8) > s.textLines.length && s.textLines.length < 8) {
      s.textLines.push(`> ${pickDeterministic(TERMINAL_LINES, s.textLines.length + s.level * 5)}`);
      audio.playKeystroke();
    }
    if (s.screen === 'ASSETS' && Math.floor(s.screenTimer * 5) % 2 === 0) {
      s.assetName = pickDeterministic(ASSET_NAMES, Math.floor(s.screenTimer * 7) + s.level * 3);
    }

    const action = detectAction(input);
    if (s.exitOpen) {
      s.exitTimer += dt;
      if (action === 'TAP' || action === 'UP') {
        escapeLoop(juice);
        s.exitOpen = false;
      }
      return;
    }

    if (s.prompt) {
      if (action) {
        if (action === s.prompt.action) completePrompt(juice);
        else failPrompt(juice);
      } else if (s.elapsed > s.prompt.expiresAt) failPrompt(juice);
    } else {
      s.promptCooldown -= dt;
      if (s.promptCooldown <= 0) openPrompt();
    }
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawVaporwareScene(ctx, state.current, width, height, { lowPowerMode });
  }, [lowPowerMode]);

  const instructions = useMemo(() => [
    'THE LOADING LOOP IS HOSTILE. WATCH FOR YELLOW COMMAND WINDOWS.',
    'RESPOND WITH THE EXACT TAP OR SWIPE BEFORE THE TIMER EXPIRES.',
    'WRONG INPUT OR TIMEOUT COSTS A LIFE AND BREAKS YOUR STREAK.',
    'COMPLETE THE REQUIRED BREACHES TO REVEAL THE GREEN EXIT NODE.',
    'EACH LOOP GETS FASTER, LESS FORGIVING AND MORE VISUALLY CORRUPTED.',
  ], []);

  return <GameCore
    gameId="VAPORWARE"
    update={update}
    draw={draw}
    onReset={reset}
    isGameOver={gameOver}
    score={score}
    level={level}
    progress={progress}
    instructions={instructions}
    onSave={saveState}
    onLoad={loadState}
  />;
};
