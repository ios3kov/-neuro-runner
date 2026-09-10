import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { gateColor, gateKindFor, getDriftRules } from './drift/driftConfig';
import type { DriftGate, DriftState } from './drift/driftTypes';

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
    const s = state.current;
    const w = (v: number) => width * v / 100;
    const h = (v: number) => height * v / 100;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, 'rgba(5,5,8,1)');
    bg.addColorStop(0.55, 'rgba(0,15,24,1)');
    bg.addColorStop(1, 'rgba(25,0,18,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const horizon = h(20);
    ctx.strokeStyle = 'rgba(0,243,255,0.13)';
    ctx.lineWidth = 1;
    for (let x = -100; x <= 200; x += 10) {
      ctx.beginPath();
      ctx.moveTo(width / 2 + (w(x) - width / 2) * 0.07, horizon);
      ctx.lineTo(w(x), height);
      ctx.stroke();
    }
    const offset = (s.distance * 0.045) % 1;
    for (let i = 0; i < 18; i += 1) {
      const t = (i + offset) / 18;
      const y = horizon + (height - horizon) * t * t;
      ctx.globalAlpha = 0.08 + t * 0.2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,0,85,0.06)';
    ctx.fillRect(0, horizon, w(8), height - horizon);
    ctx.fillRect(w(92), horizon, w(8), height - horizon);

    for (const gate of s.gates) {
      const moving = gate.kind === 'MOVING' || gate.kind === 'CORE'
        ? Math.sin(s.elapsed * (gate.kind === 'CORE' ? 2.8 : 1.8) + gate.phase) * (gate.kind === 'CORE' ? 14 : 9)
        : 0;
      const center = Math.max(10, Math.min(90, gate.center + moving));
      const left = w(center - gate.width / 2);
      const right = w(center + gate.width / 2);
      const y = h(gate.y);
      const color = gate.passed ? '#00ff88' : gateColor(gate.kind);
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = gate.kind === 'CORE' ? 18 : 10;
      ctx.globalAlpha = gate.passed ? 0.28 : 0.72 + Math.sin(s.elapsed * 8 + gate.phase) * 0.15;
      ctx.fillRect(0, y, left, h(1.2));
      ctx.fillRect(right, y, width - right, h(1.2));
      ctx.globalAlpha *= 0.4;
      ctx.fillRect(left - 2, y - h(2), 2, h(5));
      ctx.fillRect(right, y - h(2), 2, h(5));
      if (gate.kind === 'GLITCH' && !gate.passed) {
        ctx.globalAlpha = 0.25;
        ctx.fillRect(left + ((Math.sin(s.elapsed * 16 + gate.phase) + 1) * 0.5) * Math.max(1, right - left), y - h(1), w(0.5), h(3));
      }
      ctx.restore();
    }

    const px = w(s.playerX), py = h(85);
    ctx.save();
    ctx.translate(px, py);
    const bank = Math.max(-0.42, Math.min(0.42, s.velocityX * 0.018));
    ctx.rotate(bank);
    const shipColor = s.overdrive > 0 ? '#f3ff00' : '#00f3ff';
    ctx.shadowColor = shipColor; ctx.shadowBlur = 18; ctx.fillStyle = shipColor;
    ctx.beginPath(); ctx.moveTo(0, -h(2.8)); ctx.lineTo(-w(2.2), h(2.5)); ctx.lineTo(0, h(1.4)); ctx.lineTo(w(2.2), h(2.5)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.fillRect(-w(0.45), h(1.3), w(0.9), h(2.4));
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 4; i += 1) ctx.fillRect(-w(0.18), h(3.5 + i * 1.4), w(0.36), h(0.9));
    ctx.restore();

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`HULL ${s.lives}`, w(2), h(97));
    ctx.fillStyle = s.overdrive > 0 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`${Math.round(s.speed)} KM/S`, w(2), h(99.4));
    ctx.textAlign = 'center'; ctx.fillStyle = s.combo >= 8 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`CHAIN x${s.combo}`, width / 2, h(98.2));
    ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`GATES ${Math.max(0, s.targetPassed - s.passed)}`, w(98), h(98.2));
  }, []);

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
