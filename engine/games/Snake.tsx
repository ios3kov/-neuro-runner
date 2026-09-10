import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { LogLevel } from '../../types';

const GRID_W = 24;
const GRID_H = 24;
const MAX_LEVEL = 25;

type Point = { x: number; y: number };
type FoodType = 'DATA' | 'VIRUS' | 'ZIP' | 'LOCKED_DATA';
type VirusEffect = 'NONE' | 'INPUT_HIJACK' | 'VIDEO_DRIVER_FAIL';
type StageTheme = 'TRAINING' | 'FIREWALL' | 'MALWARE' | 'VPN' | 'COMPRESSION' | 'TWO_FA' | 'OVERCLOCK' | 'GAUNTLET' | 'CORE';

interface Gate extends Point { active: boolean; }
interface Tunnel extends Point { id: number; linkId: number; cooldown: number; }
interface Zone { x: number; y: number; w: number; h: number; type: 'OVERCLOCK'; }

interface LevelProfile {
  level: number;
  theme: StageTheme;
  target: number;
  tick: number;
  firewallPeriod: number;
  virusChance: number;
  zipChance: number;
  twoFactor: boolean;
  label: string;
}

interface SnakeState {
  snake: Point[];
  dir: Point;
  nextDir: Point;
  food: Point & { type: FoodType };
  keyItem: Point | null;
  walls: Point[];
  gates: Gate[];
  tunnels: Tunnel[];
  zones: Zone[];
  timer: number;
  score: number;
  level: number;
  target: number;
  itemsCollected: number;
  gameOver: boolean;
  completed: boolean;
  sandbox: boolean;
  firewallTimer: number;
  firewallPhaseTime: number;
  virusEffect: VirusEffect;
  virusTimer: number;
  hasKey: boolean;
  inOverclock: boolean;
  overclockScoreTimer: number;
  animTime: number;
  history: Point[];
  combo: number;
  comboTimer: number;
  bestCombo: number;
}

const levelTarget = (level: number) => Math.min(15, 8 + Math.floor((level - 1) / 4));

const getProfile = (level: number): LevelProfile => {
  const l = Math.max(1, Math.min(MAX_LEVEL, level));
  let theme: StageTheme = 'TRAINING';
  if (l >= 4) theme = 'FIREWALL';
  if (l >= 7) theme = 'MALWARE';
  if (l >= 10) theme = 'VPN';
  if (l >= 13) theme = 'COMPRESSION';
  if (l >= 16) theme = 'TWO_FA';
  if (l >= 19) theme = 'OVERCLOCK';
  if (l >= 22) theme = 'GAUNTLET';
  if (l === 25) theme = 'CORE';

  const labels: Record<StageTheme, string> = {
    TRAINING: 'PACKET TRAINING', FIREWALL: 'FIREWALL GRID', MALWARE: 'MALWARE STREAM',
    VPN: 'VPN ROUTING', COMPRESSION: 'ZIP PROTOCOL', TWO_FA: '2FA VAULT',
    OVERCLOCK: 'OVERCLOCK RING', GAUNTLET: 'MIXED THREATS', CORE: 'ROOT CORE'
  };

  return {
    level: l,
    theme,
    target: levelTarget(l),
    tick: Math.max(0.058, 0.125 - (l - 1) * 0.0027),
    firewallPeriod: Math.max(1.25, 3.4 - l * 0.075),
    virusChance: l < 7 ? 0 : Math.min(0.18, 0.06 + (l - 7) * 0.006),
    zipChance: l < 13 ? 0 : Math.min(0.12, 0.05 + (l - 13) * 0.004),
    twoFactor: l >= 16,
    label: labels[theme]
  };
};

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const keyOf = (p: Point) => `${p.x}:${p.y}`;

const initialState = (): SnakeState => ({
  snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
  dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
  food: { x: 15, y: 10, type: 'DATA' }, keyItem: null,
  walls: [], gates: [], tunnels: [], zones: [], timer: 0, score: 0,
  level: 1, target: levelTarget(1), itemsCollected: 0,
  gameOver: false, completed: false, sandbox: false,
  firewallTimer: 0, firewallPhaseTime: 3, virusEffect: 'NONE', virusTimer: 0,
  hasKey: false, inOverclock: false, overclockScoreTimer: 0, animTime: 0,
  history: [], combo: 0, comboTimer: 0, bestCombo: 0
});

export const SnakeGame: React.FC = () => {
  const addLog = useStore((s) => s.addLog);
  const updateStats = useGameStore((s) => s.updateStats);
  const state = useRef<SnakeState>(initialState());

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const occupied = useCallback((x: number, y: number, includeGate = true) => {
    const s = state.current;
    const p = { x, y };
    return s.snake.some((v) => same(v, p)) || s.walls.some((v) => same(v, p)) ||
      (includeGate && s.gates.some((v) => same(v, p))) || s.tunnels.some((v) => same(v, p)) ||
      (s.keyItem ? same(s.keyItem, p) : false);
  }, []);

  const addWallLine = (from: Point, to: Point, gaps: Point[] = []) => {
    const s = state.current;
    const gapSet = new Set(gaps.map(keyOf));
    if (from.x === to.x) {
      for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
        const p = { x: from.x, y }; if (!gapSet.has(keyOf(p))) s.walls.push(p);
      }
    } else {
      for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
        const p = { x, y: from.y }; if (!gapSet.has(keyOf(p))) s.walls.push(p);
      }
    }
  };

  const buildLevel = (levelNumber: number) => {
    const s = state.current;
    const p = getProfile(levelNumber);
    s.walls = []; s.gates = []; s.tunnels = []; s.zones = [];

    if (p.theme === 'TRAINING') {
      if (p.level >= 2) {
        addWallLine({ x: 5, y: 6 }, { x: 18, y: 6 }, [{ x: 11, y: 6 }, { x: 12, y: 6 }]);
        addWallLine({ x: 5, y: 17 }, { x: 18, y: 17 }, [{ x: 11, y: 17 }, { x: 12, y: 17 }]);
      }
      if (p.level === 3) {
        addWallLine({ x: 5, y: 6 }, { x: 5, y: 17 }, [{ x: 5, y: 11 }, { x: 5, y: 12 }]);
        addWallLine({ x: 18, y: 6 }, { x: 18, y: 17 }, [{ x: 18, y: 11 }, { x: 18, y: 12 }]);
      }
    }

    if (p.theme === 'FIREWALL' || p.theme === 'MALWARE') {
      [5, 11, 17].forEach((y, i) => {
        addWallLine({ x: 3, y }, { x: 20, y }, [{ x: 8 + i * 3, y }]);
        s.gates.push({ x: 8 + i * 3, y, active: i % 2 === 0 });
      });
    }

    if (p.theme === 'VPN' || p.theme === 'COMPRESSION') {
      addWallLine({ x: 12, y: 2 }, { x: 12, y: 21 }, [{ x: 12, y: 5 }, { x: 12, y: 18 }]);
      s.tunnels.push({ id: 1, x: 5, y: 5, linkId: 2, cooldown: 0 });
      s.tunnels.push({ id: 2, x: 19, y: 18, linkId: 1, cooldown: 0 });
      if (p.level >= 11) {
        s.tunnels.push({ id: 3, x: 19, y: 5, linkId: 4, cooldown: 0 });
        s.tunnels.push({ id: 4, x: 5, y: 18, linkId: 3, cooldown: 0 });
      }
    }

    if (p.theme === 'TWO_FA') {
      addWallLine({ x: 4, y: 4 }, { x: 19, y: 4 }, [{ x: 11, y: 4 }, { x: 12, y: 4 }]);
      addWallLine({ x: 4, y: 19 }, { x: 19, y: 19 }, [{ x: 11, y: 19 }, { x: 12, y: 19 }]);
      addWallLine({ x: 4, y: 4 }, { x: 4, y: 19 }, [{ x: 4, y: 11 }, { x: 4, y: 12 }]);
      addWallLine({ x: 19, y: 4 }, { x: 19, y: 19 }, [{ x: 19, y: 11 }, { x: 19, y: 12 }]);
      s.gates.push({ x: 4, y: 11, active: true }, { x: 19, y: 12, active: false });
    }

    if (p.theme === 'OVERCLOCK') {
      addWallLine({ x: 5, y: 5 }, { x: 18, y: 5 }, [{ x: 11, y: 5 }, { x: 12, y: 5 }]);
      addWallLine({ x: 5, y: 18 }, { x: 18, y: 18 }, [{ x: 11, y: 18 }, { x: 12, y: 18 }]);
      addWallLine({ x: 5, y: 5 }, { x: 5, y: 18 }, [{ x: 5, y: 11 }, { x: 5, y: 12 }]);
      addWallLine({ x: 18, y: 5 }, { x: 18, y: 18 }, [{ x: 18, y: 11 }, { x: 18, y: 12 }]);
      s.zones.push({ x: 8, y: 8, w: 8, h: 8, type: 'OVERCLOCK' });
    }

    if (p.theme === 'GAUNTLET' || p.theme === 'CORE') {
      addWallLine({ x: 3, y: 6 }, { x: 20, y: 6 }, [{ x: 7, y: 6 }, { x: 16, y: 6 }]);
      addWallLine({ x: 3, y: 17 }, { x: 20, y: 17 }, [{ x: 7, y: 17 }, { x: 16, y: 17 }]);
      addWallLine({ x: 6, y: 3 }, { x: 6, y: 20 }, [{ x: 6, y: 10 }, { x: 6, y: 14 }]);
      addWallLine({ x: 17, y: 3 }, { x: 17, y: 20 }, [{ x: 17, y: 9 }, { x: 17, y: 13 }]);
      s.gates.push({ x: 7, y: 6, active: true }, { x: 16, y: 17, active: false });
      s.tunnels.push({ id: 1, x: 3, y: 3, linkId: 2, cooldown: 0 }, { id: 2, x: 20, y: 20, linkId: 1, cooldown: 0 });
      s.zones.push({ x: 9, y: 9, w: 6, h: 6, type: 'OVERCLOCK' });
      if (p.theme === 'CORE') {
        s.gates.push({ x: 16, y: 6, active: false }, { x: 7, y: 17, active: true });
        s.tunnels.push({ id: 3, x: 20, y: 3, linkId: 4, cooldown: 0 }, { id: 4, x: 3, y: 20, linkId: 3, cooldown: 0 });
      }
    }

    // Always keep the spawn lane safe.
    s.walls = s.walls.filter((v) => !(v.y === 10 && v.x >= 7 && v.x <= 13));
    s.gates = s.gates.filter((v) => !(v.y === 10 && v.x >= 7 && v.x <= 13));
  };

  const spawnKey = useCallback((avoid: Point) => {
    const s = state.current;
    for (let attempt = 0; attempt < 250; attempt++) {
      const p = { x: Math.floor(Math.random() * GRID_W), y: Math.floor(Math.random() * GRID_H) };
      if (!occupied(p.x, p.y) && Math.abs(p.x - avoid.x) + Math.abs(p.y - avoid.y) >= 9) {
        s.keyItem = p; return;
      }
    }
    s.keyItem = { x: 2, y: 2 };
  }, [occupied]);

  const spawnFood = useCallback(() => {
    const s = state.current;
    const profile = getProfile(s.level);
    const needs2FA = profile.twoFactor && !s.hasKey && s.itemsCollected > 0 && s.itemsCollected % 3 === 2;

    for (let attempt = 0; attempt < 300; attempt++) {
      const p = { x: Math.floor(Math.random() * GRID_W), y: Math.floor(Math.random() * GRID_H) };
      if (occupied(p.x, p.y)) continue;

      let type: FoodType = 'DATA';
      if (needs2FA) type = 'LOCKED_DATA';
      else {
        const roll = Math.random();
        if (roll < profile.virusChance) type = 'VIRUS';
        else if (roll < profile.virusChance + profile.zipChance && s.snake.length > 6) type = 'ZIP';
      }
      s.food = { ...p, type };
      if (type === 'LOCKED_DATA') spawnKey(p);
      return;
    }
    s.food = { x: 22, y: 22, type: 'DATA' };
  }, [occupied, spawnKey]);

  const reset = useCallback((requestedLevel = 1) => {
    const sandbox = requestedLevel === 0;
    const actualLevel = sandbox ? 1 : Math.max(1, Math.min(MAX_LEVEL, requestedLevel));
    const p = getProfile(actualLevel);
    state.current = {
      ...initialState(), level: actualLevel, target: p.target, score: (actualLevel - 1) * 750,
      sandbox, firewallPhaseTime: p.firewallPeriod
    };
    buildLevel(actualLevel);
    spawnFood();
    setScore(state.current.score); setLevel(actualLevel); setGameOver(false); setProgress(0);
    addLog(LogLevel.SYS, sandbox ? 'SERPENT_SANDBOX_INITIALIZED' : `SERPENT_NODE_${String(actualLevel).padStart(2, '0')}: ${p.label}`);
  }, [addLog, spawnFood]);

  const saveState = useCallback(() => JSON.stringify(state.current), []);
  const loadState = useCallback((data: string) => {
    try {
      const raw: unknown = JSON.parse(data);
      if (!raw || typeof raw !== 'object') return;
      const candidate = raw as Partial<SnakeState>;
      if (!Array.isArray(candidate.snake) || typeof candidate.score !== 'number' || typeof candidate.level !== 'number') return;
      state.current = { ...initialState(), ...candidate } as SnakeState;
      setScore(state.current.score); setLevel(state.current.level); setGameOver(state.current.gameOver);
      setProgress(state.current.sandbox ? 0 : Math.min(1, state.current.itemsCollected / Math.max(1, state.current.target)));
    } catch { /* invalid save is ignored */ }
  }, []);

  const die = useCallback((juice: GameCoreHandle, cause: string) => {
    const s = state.current;
    if (s.gameOver || s.completed) return;
    s.gameOver = true; setGameOver(true);
    audio.playError(); haptics.impactHeavy();
    juice.addShake(22); juice.addChromatic(24); juice.triggerHitStop(280);
    const head = s.snake[0];
    juice.emitParticles((head.x + 0.5) * (100 / GRID_W), (head.y + 0.5) * (100 / GRID_H), '#ff1744', 48);
    addLog(LogLevel.ERR, `SERPENT_CRASH: ${cause}`);
    updateStats('SNAKE', s.score, s.level);
  }, [addLog, updateStats]);

  const eat = useCallback((juice: GameCoreHandle) => {
    const s = state.current;
    const food = s.food;
    const fastPickup = s.comboTimer > 0;
    s.combo = fastPickup ? Math.min(15, s.combo + 1) : 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.comboTimer = 4.25;
    const multiplier = Math.min(5, 1 + Math.floor((s.combo - 1) / 3));

    if (food.type === 'VIRUS') {
      s.virusTimer = 4.5;
      s.virusEffect = Math.random() < 0.5 ? 'INPUT_HIJACK' : 'VIDEO_DRIVER_FAIL';
      s.score += 90 * multiplier;
      audio.playError(); haptics.notificationError(); juice.addChromatic(18); juice.addShake(6);
      juice.emitParticles((food.x + 0.5) * (100 / GRID_W), (food.y + 0.5) * (100 / GRID_H), '#ff1744', 30);
      addLog(LogLevel.WARN, `MALWARE_${s.virusEffect}`);
    } else if (food.type === 'ZIP') {
      const cut = Math.min(5, Math.max(0, s.snake.length - 3));
      s.snake.splice(Math.max(3, s.snake.length - cut), cut);
      s.score += 35 * multiplier;
      audio.playTone(620, 'triangle', 0.08, 0.08); haptics.impactMedium();
      juice.emitParticles((food.x + 0.5) * (100 / GRID_W), (food.y + 0.5) * (100 / GRID_H), '#448aff', 20);
    } else {
      s.itemsCollected += 1;
      const base = 60 + s.level * 8 + Math.min(80, s.snake.length * 2);
      s.score += base * multiplier;
      if (food.type === 'LOCKED_DATA') {
        s.score += 120; s.hasKey = false;
        addLog(LogLevel.SUCCESS, '2FA_PACKET_DECRYPTED');
      }
      audio.playSuccess(); haptics.impactLight(); juice.addShake(2);
      juice.emitParticles((food.x + 0.5) * (100 / GRID_W), (food.y + 0.5) * (100 / GRID_H), '#00ff88', 14);
    }

    setScore(s.score);
    if (!s.sandbox) setProgress(Math.min(1, s.itemsCollected / s.target));

    if (!s.sandbox && s.itemsCollected >= s.target) {
      s.completed = true;
      setProgress(1);
      audio.playTone(660, 'sine', 0.08, 0.1);
      audio.playTone(880, 'sine', 0.08, 0.12);
      haptics.notificationSuccess(); juice.addShake(5);
      addLog(LogLevel.SUCCESS, s.level === MAX_LEVEL ? 'ROOT_CORE_SECURED' : `NODE_${s.level}_SECURED`);
      juice.levelUp(Math.min(MAX_LEVEL, s.level + 1), {
        score: s.score,
        itemsCollected: s.itemsCollected,
        combo: s.bestCombo,
        level: s.level
      });
      return;
    }
    spawnFood();
  }, [addLog, spawnFood]);

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    s.animTime += dt;
    if (s.gameOver || s.completed) return;

    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) s.combo = 0;
    }

    if (s.gates.length > 0) {
      s.firewallTimer += dt;
      if (s.firewallTimer >= s.firewallPhaseTime) {
        s.firewallTimer = 0; s.gates.forEach((g) => { g.active = !g.active; });
        audio.playTone(180, 'sawtooth', 0.04, 0.05); haptics.impactLight();
      }
    }

    if (s.virusTimer > 0) {
      s.virusTimer -= dt;
      if (s.virusTimer <= 0) {
        s.virusEffect = 'NONE'; s.virusTimer = 0; addLog(LogLevel.SUCCESS, 'MALWARE_PURGED');
      } else if (s.virusEffect === 'VIDEO_DRIVER_FAIL' && Math.random() > 0.9) {
        juice.addChromatic(4); if (Math.random() > 0.8) juice.addShake(1);
      }
    }

    let requested: Point | null = null;
    if (input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has('W') || input.swipeDirection === 'UP') requested = { x: 0, y: -1 };
    if (input.keys.has('ArrowDown') || input.keys.has('s') || input.keys.has('S') || input.swipeDirection === 'DOWN') requested = { x: 0, y: 1 };
    if (input.keys.has('ArrowLeft') || input.keys.has('a') || input.keys.has('A') || input.swipeDirection === 'LEFT') requested = { x: -1, y: 0 };
    if (input.keys.has('ArrowRight') || input.keys.has('d') || input.keys.has('D') || input.swipeDirection === 'RIGHT') requested = { x: 1, y: 0 };
    if (requested && s.virusEffect === 'INPUT_HIJACK') requested = { x: -requested.x, y: -requested.y };
    if (requested && (requested.x !== -s.dir.x || requested.y !== -s.dir.y)) s.nextDir = requested;

    const head = s.snake[0];
    s.inOverclock = s.zones.some((z) => head.x >= z.x && head.x < z.x + z.w && head.y >= z.y && head.y < z.y + z.h);
    if (s.inOverclock) {
      s.overclockScoreTimer += dt;
      if (s.overclockScoreTimer >= 0.75) { s.overclockScoreTimer = 0; s.score += 10; setScore(s.score); }
    }

    const speed = getProfile(s.level).tick * (s.inOverclock ? 0.62 : 1);
    s.timer += dt;
    if (s.timer < speed) return;
    s.timer = 0; s.dir = s.nextDir;
    s.tunnels.forEach((t) => { if (t.cooldown > 0) t.cooldown -= 1; });
    s.history.push({ ...head }); if (s.history.length > 240) s.history.shift();

    let next = { x: head.x + s.dir.x, y: head.y + s.dir.y };
    const tunnel = s.tunnels.find((t) => t.cooldown === 0 && same(t, next));
    if (tunnel) {
      const target = s.tunnels.find((t) => t.id === tunnel.linkId);
      if (target) {
        next = { x: target.x, y: target.y }; target.cooldown = 3;
        audio.playTone(1200, 'sine', 0.08, 0.08); haptics.impactMedium(); juice.addChromatic(5);
        juice.emitParticles((target.x + 0.5) * (100 / GRID_W), (target.y + 0.5) * (100 / GRID_H), '#448aff', 18);
      }
    }

    const out = next.x < 0 || next.x >= GRID_W || next.y < 0 || next.y >= GRID_H;
    const wall = s.walls.some((v) => same(v, next));
    const gate = s.gates.some((v) => v.active && same(v, next));
    const locked = s.food.type === 'LOCKED_DATA' && same(s.food, next) && !s.hasKey;
    const self = s.snake.slice(0, -1).some((v) => same(v, next));
    if (out || wall || gate || locked || self) {
      die(juice, out ? 'EDGE' : wall ? 'WALL' : gate ? 'FIREWALL' : locked ? '2FA_LOCK' : 'SELF_COLLISION'); return;
    }

    s.snake.unshift(next);
    if (s.keyItem && same(s.keyItem, next)) {
      s.keyItem = null; s.hasKey = true; s.score += 75; setScore(s.score);
      audio.playSuccess(); haptics.notificationSuccess();
      juice.emitParticles((next.x + 0.5) * (100 / GRID_W), (next.y + 0.5) * (100 / GRID_H), '#ffd740', 22);
      addLog(LogLevel.SUCCESS, 'AUTH_KEY_ACQUIRED');
    }

    if (same(s.food, next)) eat(juice); else s.snake.pop();
  }, [addLog, die, eat]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = state.current;
    const profile = getProfile(s.level);
    const cell = Math.max(6, Math.floor(Math.min(width, height) / GRID_W));
    const boardW = cell * GRID_W; const boardH = cell * GRID_H;
    const ox = (width - boardW) / 2; const oy = (height - boardH) / 2;

    ctx.save();
    ctx.fillStyle = '#020608'; ctx.fillRect(ox, oy, boardW, boardH);
    if (s.virusEffect === 'VIDEO_DRIVER_FAIL') ctx.translate((Math.random() - 0.5) * 5, 0);

    ctx.strokeStyle = 'rgba(0,240,255,0.055)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= GRID_W; i++) { ctx.moveTo(ox + i * cell, oy); ctx.lineTo(ox + i * cell, oy + boardH); }
    for (let i = 0; i <= GRID_H; i++) { ctx.moveTo(ox, oy + i * cell); ctx.lineTo(ox + boardW, oy + i * cell); }
    ctx.stroke();

    s.zones.forEach((z) => {
      const pulse = 0.09 + Math.sin(s.animTime * 8) * 0.035;
      ctx.fillStyle = `rgba(255,170,0,${pulse})`; ctx.fillRect(ox + z.x * cell, oy + z.y * cell, z.w * cell, z.h * cell);
      ctx.strokeStyle = s.inOverclock ? '#ffd740' : 'rgba(255,170,0,.4)'; ctx.lineWidth = s.inOverclock ? 2 : 1;
      ctx.strokeRect(ox + z.x * cell, oy + z.y * cell, z.w * cell, z.h * cell);
    });

    ctx.fillStyle = '#073338';
    s.walls.forEach((v) => { ctx.fillRect(ox + v.x * cell + 1, oy + v.y * cell + 1, cell - 2, cell - 2); });
    s.gates.forEach((g) => {
      const x = ox + g.x * cell, y = oy + g.y * cell;
      ctx.fillStyle = g.active ? `rgba(255,23,68,${0.5 + Math.sin(s.animTime * 10) * .2})` : '#252a2b';
      ctx.shadowColor = g.active ? '#ff1744' : 'transparent'; ctx.shadowBlur = g.active ? 10 : 0;
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4); ctx.shadowBlur = 0;
    });
    s.tunnels.forEach((t) => {
      const x = ox + t.x * cell, y = oy + t.y * cell;
      ctx.strokeStyle = '#448aff'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.strokeRect(x + 5, y + 5, Math.max(1, cell - 10), Math.max(1, cell - 10));
    });

    const drawItem = (p: Point, type: FoodType | 'KEY') => {
      const cx = ox + (p.x + .5) * cell, cy = oy + (p.y + .5) * cell;
      ctx.save(); ctx.translate(cx, cy);
      const pulse = .85 + Math.sin(s.animTime * 7) * .12; ctx.scale(pulse, pulse);
      if (type === 'DATA') { ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, cell * .25, 0, Math.PI * 2); ctx.fill(); }
      if (type === 'VIRUS') { ctx.fillStyle = '#ff1744'; ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 13; ctx.fillRect(-cell*.3, -cell*.3, cell*.6, cell*.6); }
      if (type === 'ZIP') { ctx.fillStyle = '#448aff'; ctx.shadowColor = '#448aff'; ctx.shadowBlur = 12; ctx.fillRect(-cell*.32, -cell*.12, cell*.64, cell*.24); ctx.fillRect(-cell*.12, -cell*.32, cell*.24, cell*.64); }
      if (type === 'LOCKED_DATA') { ctx.strokeStyle = s.hasKey ? '#00ff88' : '#ff1744'; ctx.lineWidth = 2; ctx.strokeRect(-cell*.3, -cell*.05, cell*.6, cell*.45); ctx.beginPath(); ctx.arc(0, -cell*.05, cell*.2, Math.PI, 0); ctx.stroke(); }
      if (type === 'KEY') { ctx.fillStyle = '#ffd740'; ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(-cell*.12, 0, cell*.18, 0, Math.PI*2); ctx.fill(); ctx.fillRect(0, -cell*.07, cell*.34, cell*.14); }
      ctx.restore();
    };
    if (s.keyItem) drawItem(s.keyItem, 'KEY'); drawItem(s.food, s.food.type);

    s.snake.forEach((v, i) => {
      const x = ox + v.x * cell, y = oy + v.y * cell;
      const alpha = Math.max(.22, 1 - i / Math.max(6, s.snake.length));
      ctx.fillStyle = s.virusEffect === 'NONE' ? `rgba(0,240,255,${alpha})` : `rgba(255,60,80,${alpha})`;
      if (i === 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; }
      ctx.fillRect(x + (i ? 2 : 1), y + (i ? 2 : 1), cell - (i ? 4 : 2), cell - (i ? 4 : 2)); ctx.shadowBlur = 0;
    });

    ctx.font = 'bold 11px monospace'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#00ff88'; ctx.textAlign = 'left';
    ctx.fillText(s.sandbox ? 'SANDBOX // ENDLESS' : `DATA ${s.itemsCollected}/${s.target}`, ox + 6, oy + 6);
    ctx.fillStyle = '#00bcd4'; ctx.textAlign = 'right'; ctx.fillText(profile.label, ox + boardW - 6, oy + 6);
    if (s.combo > 1) { ctx.fillStyle = '#ffd740'; ctx.textAlign = 'left'; ctx.fillText(`COMBO x${Math.min(5, 1 + Math.floor((s.combo - 1) / 3))}`, ox + 6, oy + 21); }
    if (s.hasKey) { ctx.fillStyle = '#ffd740'; ctx.textAlign = 'right'; ctx.fillText('2FA KEY READY', ox + boardW - 6, oy + 21); }
    if (s.virusEffect !== 'NONE') { ctx.fillStyle = '#ff1744'; ctx.textAlign = 'center'; ctx.fillText(`${s.virusEffect} ${s.virusTimer.toFixed(1)}s`, ox + boardW / 2, oy + boardH - 18); }
    if (s.inOverclock) { ctx.fillStyle = '#ffab00'; ctx.textAlign = 'center'; ctx.fillText('OVERCLOCK // 162%', ox + boardW / 2, oy + boardH - 32); }
    ctx.restore();
  }, []);

  const instructions = useMemo(() => [
    'SWIPE OR USE ARROWS / WASD TO ROUTE SERPENT.',
    'GREEN DATA ADVANCES THE NODE. QUICK PICKUPS BUILD SCORE COMBO.',
    'RED MALWARE CORRUPTS INPUT OR VIDEO. BLUE ZIP SHORTENS YOUR TAIL.',
    'RED FIREWALL CELLS ARE LETHAL WHILE ACTIVE. BLUE VPN NODES TELEPORT.',
    'LOCKED DATA REQUIRES A GOLD 2FA KEY. ORANGE OVERCLOCK ZONES BOOST SPEED + SCORE.',
    '25 NODES ESCALATE FROM TRAINING TO THE ROOT CORE GAUNTLET.'
  ], []);

  return <GameCore
    gameId="SNAKE" update={update} draw={draw} onReset={reset}
    isGameOver={gameOver} score={score} level={level} progress={progress}
    instructions={instructions} onSave={saveState} onLoad={loadState}
  />;
};
