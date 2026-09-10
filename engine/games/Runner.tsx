import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { useStore } from '../../store';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { buildRunnerTrack, getRunnerRules, runnerObjectColor } from './runner/runnerConfig';
import type { RunnerLane, RunnerObject, RunnerState } from './runner/runnerTypes';
import { drawRunnerScene } from './runner/runnerRenderer';

const LANE_WIDTH = 2.5;
const CAMERA_HEIGHT = 1.8;
const CAMERA_Z = -5;
const FOCAL_LENGTH = 300;
const GRAVITY = -35;
const JUMP_FORCE = 12;

const createState = (level: number): RunnerState => {
  const rules = getRunnerRules(level);
  return {
    player: {
      x: 0,
      y: 0,
      lane: 0,
      vy: 0,
      grounded: true,
      sliding: false,
      slideTimer: 0,
      speed: rules.baseSpeed,
      shield: 100,
    },
    objects: buildRunnerTrack(level),
    distance: 0,
    score: (level - 1) * 1000,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    level,
    targetDistance: rules.distance,
    overdrive: 0,
    elapsed: 0,
    gameOver: false,
  };
};

const isRunnerState = (value: unknown): value is RunnerState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<RunnerState>;
  return !!s.player && Array.isArray(s.objects)
    && typeof s.distance === 'number' && typeof s.score === 'number'
    && typeof s.coins === 'number' && typeof s.level === 'number'
    && typeof s.targetDistance === 'number' && typeof s.gameOver === 'boolean';
};

export const RunnerGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const lowPowerMode = useStore((s) => s.user.settings.lowPowerMode ?? false);
  const state = useRef<RunnerState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: RunnerState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(Math.min(1, s.targetDistance > 0 ? s.distance / s.targetDistance : 0));
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isRunnerState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  };

  const changeLane = (direction: -1 | 1) => {
    const p = state.current.player;
    const next = Math.max(-1, Math.min(1, p.lane + direction)) as RunnerLane;
    if (next === p.lane) return;
    p.lane = next;
    audio.playClick();
    haptics.selection();
  };

  const crash = (juice: GameCoreHandle, object?: RunnerObject) => {
    const s = state.current;
    if (object) object.collected = true;
    s.combo = 0;
    s.player.shield = Math.max(0, s.player.shield - (object?.type === 'GLITCH' ? 35 : 45));
    s.player.speed *= 0.72;
    audio.playError();
    haptics.impactHeavy();
    juice.addShake(14);
    juice.addChromatic(object?.type === 'GLITCH' ? 22 : 14);
    juice.triggerHitStop(120);
    juice.emitParticles(50 + s.player.x * 18, 82, '#ff0055', 24);
    if (s.player.shield <= 0) {
      s.gameOver = true;
      updateStats('RUNNER', s.score, s.level);
      setGameOver(true);
      haptics.notificationError();
    }
    syncUi(s);
  };

  const collect = (object: RunnerObject, juice: GameCoreHandle) => {
    const s = state.current;
    object.collected = true;
    if (object.type === 'COIN') {
      s.coins += 1;
      s.combo += 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.score += Math.round(60 * (1 + Math.min(2.5, s.combo * 0.06)));
      s.player.shield = Math.min(100, s.player.shield + 2);
      audio.playTone(900 + Math.min(700, s.combo * 18), 'sine', 0.025, 0.05);
      haptics.impactLight();
      juice.emitParticles(50 + object.lane * 18, 64, '#f3ff00', 7);
    } else if (object.type === 'BOOST') {
      s.overdrive = 4.5;
      s.score += 180;
      audio.playSuccess();
      haptics.notificationSuccess();
      juice.addChromatic(6);
      juice.emitParticles(50 + object.lane * 18, 64, '#00ff88', 16);
    }
    syncUi(s);
  };

  const completeLevel = (juice: GameCoreHandle) => {
    const s = state.current;
    s.score += Math.round(s.player.shield * 5 + s.coins * 25 + s.bestCombo * 45);
    setScore(s.score);
    audio.playSuccess();
    haptics.notificationSuccess();
    juice.addChromatic(8);
    juice.levelUp(s.level + 1, { score: s.score, itemsCollected: s.coins, bestCombo: s.bestCombo });
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    const p = s.player;
    const rules = getRunnerRules(s.level);
    s.elapsed += dt;
    s.overdrive = Math.max(0, s.overdrive - dt);

    if (input.swipeDirection === 'LEFT' || input.keys.has('ArrowLeft')) changeLane(-1);
    if (input.swipeDirection === 'RIGHT' || input.keys.has('ArrowRight')) changeLane(1);

    if ((input.swipeDirection === 'UP' || input.keys.has('ArrowUp') || input.tapDetected) && p.grounded && !p.sliding) {
      p.vy = JUMP_FORCE;
      p.grounded = false;
      audio.playTone(520, 'triangle', 0.03, 0.07);
      haptics.impactLight();
    }
    if ((input.swipeDirection === 'DOWN' || input.keys.has('ArrowDown')) && p.grounded) {
      p.sliding = true;
      p.slideTimer = 0.82;
      audio.playTone(240, 'triangle', 0.03, 0.07);
      haptics.impactLight();
    }

    p.x += (p.lane - p.x) * Math.min(1, dt * 11);
    if (!p.grounded) {
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.grounded = true;
        haptics.impactLight();
      }
    }
    if (p.sliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0) p.sliding = false;
    }

    const targetSpeed = s.overdrive > 0 ? rules.maxSpeed * 1.55 : rules.maxSpeed;
    p.speed = Math.min(targetSpeed, p.speed + rules.acceleration * dt * (s.overdrive > 0 ? 2.2 : 1));
    if (s.overdrive <= 0 && p.speed > rules.maxSpeed) p.speed += (rules.maxSpeed - p.speed) * dt * 1.8;
    s.distance += p.speed * dt;

    for (const object of s.objects) {
      if (object.collected) continue;
      const dz = object.z - s.distance;
      if (dz > 1.1 || dz < -1.7) continue;
      if (object.type === 'FINISH') {
        object.collected = true;
        completeLevel(juice);
        break;
      }
      const laneMatch = Math.abs(object.lane - p.lane) < 0.45;
      if (!laneMatch) continue;

      if (object.type === 'COIN' || object.type === 'BOOST') {
        collect(object, juice);
        continue;
      }
      if (object.type === 'WALL') crash(juice, object);
      else if (object.type === 'BEAM' && p.y < 0.9) crash(juice, object);
      else if (object.type === 'GATE' && !p.sliding) crash(juice, object);
      else if (object.type === 'GLITCH') {
        object.collected = true;
        s.combo = 0;
        p.lane = (p.lane === 1 ? -1 : p.lane === -1 ? 1 : (object.id % 2 ? -1 : 1)) as RunnerLane;
        juice.addChromatic(18);
        juice.addShake(5);
        audio.playError();
        haptics.notificationWarning();
      } else object.collected = true;
    }

    syncUi(s);
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawRunnerScene(ctx, state.current, width, height, { lowPowerMode });
  }, [lowPowerMode]);

  const instructions = useMemo(() => [
    'SWIPE LEFT/RIGHT TO CHANGE LANE. SWIPE UP OR TAP TO JUMP. SWIPE DOWN TO SLIDE.',
    'RED WALLS REQUIRE A LANE CHANGE. ORANGE BEAMS REQUIRE JUMP. VIOLET GATES REQUIRE SLIDE.',
    'YELLOW DATA BUILDS CHAIN. GREEN BOOSTS TRIGGER OVERDRIVE.',
    'MAGENTA GLITCH NODES SCRAMBLE YOUR LANE. IMPACTS DAMAGE SHIELD.',
    '20 NODES RAMP SPEED, DENSITY AND COMBINED OBSTACLE PATTERNS.',
  ], []);

  return <GameCore
    gameId="RUNNER"
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
