import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { useStore } from '../../store';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { gateColor, gateKindFor, getDriftRules } from './drift/driftConfig';
import type { DriftGate, DriftState } from './drift/driftTypes';
import { drawDriftScene } from './drift/driftRenderer';

let gateSerial = 1;

const createState = (level: number): DriftState => {
  const rules = getDriftRules(level);
  return {
    playerX: 50,
    velocityX: 0,
    speed: rules.baseSpeed,
    gates: [],
    gateTimer: 0.25,
    combo: 0,
    bestCombo: 0,
    score: (level - 1) * 850,
    level,
    lives: rules.lives,
    distance: 0,
    passed: 0,
    targetPassed: rules.targetPassed,
    overdrive: 0,
    elapsed: 0,
    gameOver: false,
  };
};

const isDriftState = (value: unknown): value is DriftState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<DriftState>;
  return Array.isArray(s.gates) && typeof s.playerX === 'number'
    && typeof s.speed === 'number' && typeof s.score === 'number'
    && typeof s.level === 'number' && typeof s.lives === 'number'
    && typeof s.passed === 'number' && typeof s.targetPassed === 'number'
    && typeof s.gameOver === 'boolean';
};

export const DriftGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const lowPowerMode = useStore((s) => s.user.settings.lowPowerMode ?? false);
  const state = useRef<DriftState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: DriftState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(s.targetPassed > 0 ? s.passed / s.targetPassed : 0);
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isDriftState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore invalid local saves.
    }
  };

  const spawnGate = () => {
    const s = state.current;
    const rules = getDriftRules(s.level);
    const id = gateSerial++;
    const kind = gateKindFor(s.level, id);
    const width = Math.max(9, rules.gateWidth + (kind === 'CORE' ? -3 : kind === 'BOOST' ? 2 : 0));
    const center = 14 + ((id * 31 + s.level * 17) % 72);
    s.gates.push({ id, y: -8, center, width, kind, phase: (id % 11) * 0.47, passed: false });
  };

  const hitGate = (juice: GameCoreHandle) => {
    const s = state.current;
    s.lives -= 1;
    s.combo = 0;
    s.velocityX *= -0.3;
    audio.playError();
    haptics.impactHeavy();
    juice.addShake(16);
    juice.addChromatic(15);
    juice.triggerHitStop(90);
    juice.emitParticles(s.playerX, 85, '#ff0055', 24);
    if (s.lives <= 0) {
      s.gameOver = true;
      updateStats('DRIFT', s.score, s.level);
      setGameOver(true);
    }
  };

  const passGate = (gate: DriftGate, juice: GameCoreHandle) => {
    const s = state.current;
    gate.passed = true;
    s.passed += 1;
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const base = gate.kind === 'CORE' ? 180 : gate.kind === 'GLITCH' ? 120 : gate.kind === 'BOOST' ? 100 : 70;
    s.score += Math.round(base * (1 + Math.min(2, s.combo * 0.08)) + s.speed * 0.8);
    const color = gateColor(gate.kind);
    audio.playTone(gate.kind === 'BOOST' ? 1100 : 720, 'triangle', 0.035, 0.07);
    haptics.impactLight();
    juice.emitParticles(s.playerX, 85, color, gate.kind === 'CORE' ? 18 : 8);
    if (gate.kind === 'BOOST') {
      s.overdrive = 3.5;
      s.speed += 9;
      juice.addChromatic(5);
    }
    if (gate.kind === 'GLITCH') {
      s.velocityX += (gate.id % 2 ? 1 : -1) * 18;
      juice.addChromatic(12);
      juice.addShake(4);
    }
    if (gate.kind === 'CORE') {
      s.score += 300;
      juice.triggerHitStop(55);
      juice.addShake(5);
    }
    syncUi(s);
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    const rules = getDriftRules(s.level);
    s.elapsed += dt;
    s.distance += s.speed * dt;
    s.overdrive = Math.max(0, s.overdrive - dt);
    s.speed += rules.acceleration * dt * (s.overdrive > 0 ? 1.7 : 1);

    const steer = (input.keys.has('ArrowLeft') ? -1 : 0) + (input.keys.has('ArrowRight') ? 1 : 0);
    s.velocityX += steer * 95 * dt;
    s.velocityX += input.touchDeltaX * 0.55;
    s.velocityX *= Math.pow(0.87, dt * 60);
    s.playerX += s.velocityX * dt;
    if (s.playerX < 3 || s.playerX > 97) {
      s.playerX = Math.max(3, Math.min(97, s.playerX));
      s.velocityX *= -0.35;
      s.combo = 0;
      juice.addShake(2);
      haptics.impactLight();
    }

    s.gateTimer -= dt;
    if (s.gateTimer <= 0) {
      spawnGate();
      s.gateTimer = rules.spawnEvery;
    }

    const playerY = 85;
    for (const gate of s.gates) {
      const movement = gate.kind === 'MOVING' || gate.kind === 'CORE'
        ? Math.sin(s.elapsed * (gate.kind === 'CORE' ? 2.8 : 1.8) + gate.phase) * (gate.kind === 'CORE' ? 14 : 9)
        : 0;
      gate.y += s.speed * dt * 0.72;
      const center = Math.max(10, Math.min(90, gate.center + movement));
      if (!gate.passed && gate.y >= playerY - 1.4 && gate.y <= playerY + 2.2) {
        const left = center - gate.width / 2;
        const right = center + gate.width / 2;
        if (s.playerX < left || s.playerX > right) hitGate(juice);
        else passGate(gate, juice);
      }
    }
    s.gates = s.gates.filter(gate => gate.y < 108);

    if (s.passed >= s.targetPassed) {
      s.score += s.lives * 260 + s.bestCombo * 50 + Math.round(s.speed * 8);
      setScore(s.score);
      haptics.notificationSuccess();
      juice.levelUp(s.level + 1, { score: s.score, targetsDestroyed: s.passed, bestCombo: s.bestCombo });
    }
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawDriftScene(ctx, state.current, width, height, { lowPowerMode });
  }, [lowPowerMode]);

  const instructions = useMemo(() => [
    'STEER THROUGH THE NEON DATA CORRIDOR. EVERY NODE IS A FIXED RUN.',
    'VIOLET GATES MOVE. YELLOW BOOST GATES TRIGGER OVERDRIVE.',
    'RED GLITCH GATES KICK YOUR TRAJECTORY. WHITE CORE GATES ARE NARROW.',
    'CHAIN CLEAN PASSES FOR MULTIPLIERS. WALL OR GATE IMPACT BREAKS THE CHAIN.',
    'LATE NODES COMBINE HIGH SPEED, MOVING WINDOWS AND CORE GATES.',
  ], []);

  return <GameCore
    gameId="DRIFT"
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
