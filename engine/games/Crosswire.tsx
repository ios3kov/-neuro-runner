import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { useStore } from '../../store';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { buildCrosswireLanes, getCrosswireGoalCenters, getCrosswireRules } from './crosswire/crosswireConfig';
import { drawCrosswireScene } from './crosswire/crosswireRenderer';
import type { CrosswireEntity, CrosswireState } from './crosswire/crosswireTypes';

const START_ROW = 11;
const STEP_X = 10;

const createState = (level: number): CrosswireState => {
  const rules = getCrosswireRules(level);
  return {
    level: rules.level,
    score: (rules.level - 1) * 1600,
    lives: rules.lives,
    playerX: 50,
    playerRow: START_ROW,
    moveCooldown: 0,
    timeLeft: rules.timeLimit,
    elapsed: 0,
    crossings: 0,
    targetSlots: rules.targetSlots,
    goalCenters: getCrosswireGoalCenters(rules.level),
    filledGoals: Array(rules.targetSlots).fill(false),
    streak: 0,
    bestStreak: 0,
    highestRow: START_ROW,
    lanes: buildCrosswireLanes(rules.level),
    gameOver: false,
    flash: 0,
  };
};

const isCrosswireState = (value: unknown): value is CrosswireState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<CrosswireState>;
  return typeof s.level === 'number'
    && typeof s.score === 'number'
    && typeof s.lives === 'number'
    && typeof s.playerX === 'number'
    && typeof s.playerRow === 'number'
    && typeof s.timeLeft === 'number'
    && Array.isArray(s.lanes)
    && Array.isArray(s.filledGoals)
    && typeof s.gameOver === 'boolean';
};

const wrappedDistance = (a: number, b: number) => {
  const direct = Math.abs(a - b);
  return Math.min(direct, Math.abs(a - (b + 112)), Math.abs(a - (b - 112)));
};

const overlaps = (x: number, entity: CrosswireEntity, padding = 2.2) =>
  wrappedDistance(x, entity.x) <= entity.width / 2 + padding;

const normalizeEntityX = (x: number) => {
  let next = x;
  while (next > 106) next -= 112;
  while (next < -6) next += 112;
  return next;
};

export const CrosswireGame: React.FC = () => {
  const updateStats = useGameStore((s) => s.updateStats);
  const lowPowerMode = useStore((s) => s.user.settings.lowPowerMode ?? false);
  const state = useRef<CrosswireState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = useCallback((s: CrosswireState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(s.crossings / Math.max(1, s.targetSlots));
  }, []);

  const reset = useCallback((startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  }, [syncUi]);

  const saveState = useCallback(() => JSON.stringify(state.current), []);
  const loadState = useCallback((data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isCrosswireState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  }, [syncUi]);

  const resetCourier = (preserveHighest = false) => {
    const s = state.current;
    const rules = getCrosswireRules(s.level);
    s.playerX = 50;
    s.playerRow = START_ROW;
    s.moveCooldown = 0.08;
    s.timeLeft = rules.timeLimit;
    if (!preserveHighest) s.highestRow = START_ROW;
  };

  const failAttempt = (juice: GameCoreHandle, reason: 'COLLISION' | 'VOID' | 'TIMEOUT' | 'MISS') => {
    const s = state.current;
    if (s.gameOver) return;
    s.lives -= 1;
    s.streak = 0;
    s.flash = 0.42;
    audio.playError();
    haptics.impactHeavy();
    juice.addShake(reason === 'COLLISION' ? 14 : 9);
    juice.addChromatic(13);
    juice.triggerHitStop(70);
    juice.emitParticles(s.playerX, (s.playerRow / START_ROW) * 100, '#ff0055', lowPowerMode ? 8 : 20);

    if (s.lives <= 0) {
      s.gameOver = true;
      updateStats('CROSSWIRE', s.score, s.level);
      syncUi(s);
      return;
    }

    resetCourier();
    syncUi(s);
  };

  const claimGoal = (juice: GameCoreHandle) => {
    const s = state.current;
    let slot = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    s.goalCenters.forEach((center, index) => {
      if (s.filledGoals[index]) return;
      const distance = Math.abs(center - s.playerX);
      if (distance < bestDistance) {
        bestDistance = distance;
        slot = index;
      }
    });

    if (slot < 0 || bestDistance > 7.2) {
      failAttempt(juice, 'MISS');
      return;
    }

    s.filledGoals[slot] = true;
    s.crossings += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const timeBonus = Math.round(Math.max(0, s.timeLeft) * 24);
    const streakBonus = s.streak * 180;
    s.score += 900 + s.level * 90 + timeBonus + streakBonus;
    s.flash = 0.85;
    audio.playSuccess();
    haptics.notificationSuccess();
    juice.addShake(4);
    juice.addChromatic(4);
    juice.triggerHitStop(45);
    juice.emitParticles(s.playerX, 3, '#f3ff00', lowPowerMode ? 10 : 28);
    syncUi(s);

    if (s.crossings >= s.targetSlots) {
      s.score += s.lives * 500 + s.bestStreak * 250;
      syncUi(s);
      juice.levelUp(s.level + 1, {
        score: s.score,
        itemsCollected: s.crossings,
        bestCombo: s.bestStreak,
        timeSurvived: s.elapsed,
      });
      return;
    }

    resetCourier();
  };

  const movePlayer = (dx: number, dRow: number, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.moveCooldown > 0 || s.gameOver) return;
    const previousRow = s.playerRow;
    s.playerX = Math.max(4, Math.min(96, s.playerX + dx));
    s.playerRow = Math.max(0, Math.min(START_ROW, s.playerRow + dRow));
    s.moveCooldown = 0.105;
    audio.playTone(dRow < 0 ? 520 : dRow > 0 ? 340 : 430, 'square', 0.018, 0.035);
    haptics.impactLight();

    if (s.playerRow < s.highestRow) {
      const advance = s.highestRow - s.playerRow;
      s.highestRow = s.playerRow;
      s.score += advance * (22 + s.level * 2);
      if (s.playerRow === 8 || s.playerRow === 4) {
        s.score += 70 + s.level * 5;
        juice.emitParticles(s.playerX, (s.playerRow / START_ROW) * 100, '#00f3ff', lowPowerMode ? 3 : 7);
      }
    }

    if (previousRow !== s.playerRow) syncUi(s);
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    s.elapsed += dt;
    s.timeLeft -= dt;
    s.moveCooldown = Math.max(0, s.moveCooldown - dt);
    s.flash = Math.max(0, s.flash - dt * 2.8);

    for (const lane of s.lanes) {
      for (const entity of lane.entities) {
        entity.x = normalizeEntityX(entity.x + entity.speed * dt);
      }
    }

    const keyLeft = input.keys.has('ArrowLeft') || input.keys.has('a') || input.keys.has('A');
    const keyRight = input.keys.has('ArrowRight') || input.keys.has('d') || input.keys.has('D');
    const keyUp = input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has('W');
    const keyDown = input.keys.has('ArrowDown') || input.keys.has('s') || input.keys.has('S');
    const swipe = input.swipeDirection;

    if (swipe === 'LEFT' || keyLeft) movePlayer(-STEP_X, 0, juice);
    else if (swipe === 'RIGHT' || keyRight) movePlayer(STEP_X, 0, juice);
    else if (swipe === 'UP' || keyUp) movePlayer(0, -1, juice);
    else if (swipe === 'DOWN' || keyDown) movePlayer(0, 1, juice);

    if (s.timeLeft <= 0) {
      failAttempt(juice, 'TIMEOUT');
      return;
    }

    if (s.playerRow === 0) {
      claimGoal(juice);
      return;
    }

    const lane = s.lanes.find((item) => item.row === s.playerRow);
    if (!lane) return;

    if (lane.type === 'ROAD') {
      const hit = lane.entities.some((entity) => overlaps(s.playerX, entity, 2.4));
      if (hit) {
        failAttempt(juice, 'COLLISION');
        return;
      }
    }

    if (lane.type === 'STREAM') {
      const platform = lane.entities.find((entity) => overlaps(s.playerX, entity, 1.1));
      if (!platform) {
        failAttempt(juice, 'VOID');
        return;
      }
      s.playerX += platform.speed * dt;
      if (s.playerX < 3 || s.playerX > 97) {
        failAttempt(juice, 'VOID');
        return;
      }
    }
  }, [lowPowerMode, syncUi, updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawCrosswireScene(ctx, state.current, width, height, { lowPowerMode });
  }, [lowPowerMode]);

  const instructions = useMemo(() => [
    'CROSS THE GRID AND LOCK INTO EVERY UPLINK PORT AT THE TOP.',
    'DESKTOP: ARROWS OR WASD. MOBILE: SWIPE IN THE DIRECTION YOU WANT TO HOP.',
    'ROAD LANES: DODGE FAST DATA TRAFFIC. ONE HIT COSTS A LIFE.',
    'STREAM LANES: LAND ON MOVING RELAYS. THEY CARRY YOU SIDEWAYS.',
    'REACH SAFE DECKS, WATCH THE SYNC TIMER, AND FILL ALL UPLINKS TO CLEAR THE NODE.',
  ], []);

  return (
    <GameCore
      gameId="CROSSWIRE"
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
    />
  );
};
