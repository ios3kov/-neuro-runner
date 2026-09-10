import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { LogLevel } from '../../types';
import {
  SNAKE_GRID_H,
  SNAKE_GRID_W,
  SNAKE_MAX_LEVEL,
  type SnakeFoodType,
  type SnakePoint,
  type SnakeState,
} from './snake/snakeTypes';
import { createInitialSnakeState, getSnakeProfile } from './snake/snakeConfig';
import { buildSnakeArena } from './snake/snakeLevelBuilder';

const same = (a: SnakePoint, b: SnakePoint) => a.x === b.x && a.y === b.y;

export const SnakeGame: React.FC = () => {
  const addLog = useStore((s) => s.addLog);
  const updateStats = useGameStore((s) => s.updateStats);
  const state = useRef<SnakeState>(createInitialSnakeState());

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const occupied = useCallback((x: number, y: number, includeGate = true) => {
    const s = state.current;
    const point = { x, y };
    return s.snake.some((value) => same(value, point)) || s.walls.some((value) => same(value, point)) ||
      (includeGate && s.gates.some((value) => same(value, point))) || s.tunnels.some((value) => same(value, point)) ||
      (s.keyItem ? same(s.keyItem, point) : false);
  }, []);

  const spawnKey = useCallback((avoid: SnakePoint) => {
    const s = state.current;
    for (let attempt = 0; attempt < 250; attempt += 1) {
      const point = { x: Math.floor(Math.random() * SNAKE_GRID_W), y: Math.floor(Math.random() * SNAKE_GRID_H) };
      if (!occupied(point.x, point.y) && Math.abs(point.x - avoid.x) + Math.abs(point.y - avoid.y) >= 9) {
        s.keyItem = point;
        return;
      }
    }
    s.keyItem = { x: 2, y: 2 };
  }, [occupied]);

  const spawnFood = useCallback(() => {
    const s = state.current;
    const profile = getSnakeProfile(s.level);
    const needs2FA = profile.twoFactor && !s.hasKey && s.itemsCollected > 0 && s.itemsCollected % 3 === 2;

    for (let attempt = 0; attempt < 300; attempt += 1) {
      const point = { x: Math.floor(Math.random() * SNAKE_GRID_W), y: Math.floor(Math.random() * SNAKE_GRID_H) };
      if (occupied(point.x, point.y)) continue;

      let type: SnakeFoodType = 'DATA';
      if (needs2FA) type = 'LOCKED_DATA';
      else {
        const roll = Math.random();
        if (roll < profile.virusChance) type = 'VIRUS';
        else if (roll < profile.virusChance + profile.zipChance && s.snake.length > 6) type = 'ZIP';
      }
      s.food = { ...point, type };
      if (type === 'LOCKED_DATA') spawnKey(point);
      return;
    }
    s.food = { x: 22, y: 22, type: 'DATA' };
  }, [occupied, spawnKey]);

  const reset = useCallback((requestedLevel = 1) => {
    const sandbox = requestedLevel === 0;
    const actualLevel = sandbox ? 1 : Math.max(1, Math.min(SNAKE_MAX_LEVEL, requestedLevel));
    const profile = getSnakeProfile(actualLevel);
    state.current = {
      ...createInitialSnakeState(),
      ...buildSnakeArena(actualLevel),
      level: actualLevel,
      target: profile.target,
      score: (actualLevel - 1) * 750,
      sandbox,
      firewallPhaseTime: profile.firewallPeriod,
    };
    spawnFood();
    setScore(state.current.score);
    setLevel(actualLevel);
    setGameOver(false);
    setProgress(0);
    addLog(LogLevel.SYS, sandbox ? 'SERPENT_SANDBOX_INITIALIZED' : `SERPENT_NODE_${String(actualLevel).padStart(2, '0')}: ${profile.label}`);
  }, [addLog, spawnFood]);

  const saveState = useCallback(() => JSON.stringify(state.current), []);

  const loadState = useCallback((data: string) => {
    try {
      const raw: unknown = JSON.parse(data);
      if (!raw || typeof raw !== 'object') return;
      const candidate = raw as Partial<SnakeState>;
      if (!Array.isArray(candidate.snake) || typeof candidate.score !== 'number' || typeof candidate.level !== 'number') return;
      state.current = { ...createInitialSnakeState(), ...candidate } as SnakeState;
      setScore(state.current.score);
      setLevel(state.current.level);
      setGameOver(state.current.gameOver);
      setProgress(state.current.sandbox ? 0 : Math.min(1, state.current.itemsCollected / Math.max(1, state.current.target)));
    } catch {
      // Invalid saves are ignored; the current live state remains intact.
    }
  }, []);

  const die = useCallback((juice: GameCoreHandle, cause: string) => {
    const s = state.current;
    if (s.gameOver || s.completed) return;
    s.gameOver = true;
    setGameOver(true);
    audio.playError();
    haptics.impactHeavy();
    juice.addShake(22);
    juice.addChromatic(24);
    juice.triggerHitStop(280);
    const head = s.snake[0];
    juice.emitParticles((head.x + 0.5) * (100 / SNAKE_GRID_W), (head.y + 0.5) * (100 / SNAKE_GRID_H), '#ff1744', 48);
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
      audio.playError();
      haptics.notificationError();
      juice.addChromatic(18);
      juice.addShake(6);
      juice.emitParticles((food.x + 0.5) * (100 / SNAKE_GRID_W), (food.y + 0.5) * (100 / SNAKE_GRID_H), '#ff1744', 30);
      addLog(LogLevel.WARN, `MALWARE_${s.virusEffect}`);
    } else if (food.type === 'ZIP') {
      const cut = Math.min(5, Math.max(0, s.snake.length - 3));
      s.snake.splice(Math.max(3, s.snake.length - cut), cut);
      s.score += 35 * multiplier;
      audio.playTone(620, 'triangle', 0.08, 0.08);
      haptics.impactMedium();
      juice.emitParticles((food.x + 0.5) * (100 / SNAKE_GRID_W), (food.y + 0.5) * (100 / SNAKE_GRID_H), '#448aff', 20);
    } else {
      s.itemsCollected += 1;
      const base = 60 + s.level * 8 + Math.min(80, s.snake.length * 2);
      s.score += base * multiplier;
      if (food.type === 'LOCKED_DATA') {
        s.score += 120;
        s.hasKey = false;
        addLog(LogLevel.SUCCESS, '2FA_PACKET_DECRYPTED');
      }
      audio.playSuccess();
      haptics.impactLight();
      juice.addShake(2);
      juice.emitParticles((food.x + 0.5) * (100 / SNAKE_GRID_W), (food.y + 0.5) * (100 / SNAKE_GRID_H), '#00ff88', 14);
    }

    setScore(s.score);
    if (!s.sandbox) setProgress(Math.min(1, s.itemsCollected / s.target));

    if (!s.sandbox && s.itemsCollected >= s.target) {
      s.completed = true;
      setProgress(1);
      audio.playTone(660, 'sine', 0.08, 0.1);
      audio.playTone(880, 'sine', 0.08, 0.12);
      haptics.notificationSuccess();
      juice.addShake(5);
      addLog(LogLevel.SUCCESS, s.level === SNAKE_MAX_LEVEL ? 'ROOT_CORE_SECURED' : `NODE_${s.level}_SECURED`);
      juice.levelUp(Math.min(SNAKE_MAX_LEVEL, s.level + 1), {
        score: s.score,
        itemsCollected: s.itemsCollected,
        combo: s.bestCombo,
        level: s.level,
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
        s.firewallTimer = 0;
        s.gates.forEach((gate) => { gate.active = !gate.active; });
        audio.playTone(180, 'sawtooth', 0.04, 0.05);
        haptics.impactLight();
      }
    }

    if (s.virusTimer > 0) {
      s.virusTimer -= dt;
      if (s.virusTimer <= 0) {
        s.virusEffect = 'NONE';
        s.virusTimer = 0;
        addLog(LogLevel.SUCCESS, 'MALWARE_PURGED');
      } else if (s.virusEffect === 'VIDEO_DRIVER_FAIL' && Math.random() > 0.9) {
        juice.addChromatic(4);
        if (Math.random() > 0.8) juice.addShake(1);
      }
    }

    let requested: SnakePoint | null = null;
    if (input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has('W') || input.swipeDirection === 'UP') requested = { x: 0, y: -1 };
    if (input.keys.has('ArrowDown') || input.keys.has('s') || input.keys.has('S') || input.swipeDirection === 'DOWN') requested = { x: 0, y: 1 };
    if (input.keys.has('ArrowLeft') || input.keys.has('a') || input.keys.has('A') || input.swipeDirection === 'LEFT') requested = { x: -1, y: 0 };
    if (input.keys.has('ArrowRight') || input.keys.has('d') || input.keys.has('D') || input.swipeDirection === 'RIGHT') requested = { x: 1, y: 0 };
    if (requested && s.virusEffect === 'INPUT_HIJACK') requested = { x: -requested.x, y: -requested.y };
    if (requested && (requested.x !== -s.dir.x || requested.y !== -s.dir.y)) s.nextDir = requested;

    const head = s.snake[0];
    s.inOverclock = s.zones.some((zone) => head.x >= zone.x && head.x < zone.x + zone.w && head.y >= zone.y && head.y < zone.y + zone.h);
    if (s.inOverclock) {
      s.overclockScoreTimer += dt;
      if (s.overclockScoreTimer >= 0.75) {
        s.overclockScoreTimer = 0;
        s.score += 10;
        setScore(s.score);
      }
    }

    const speed = getSnakeProfile(s.level).tick * (s.inOverclock ? 0.62 : 1);
    s.timer += dt;
    if (s.timer < speed) return;
    s.timer = 0;
    s.dir = s.nextDir;
    s.tunnels.forEach((tunnel) => { if (tunnel.cooldown > 0) tunnel.cooldown -= 1; });
    s.history.push({ ...head });
    if (s.history.length > 240) s.history.shift();

    let next = { x: head.x + s.dir.x, y: head.y + s.dir.y };
    const tunnel = s.tunnels.find((item) => item.cooldown === 0 && same(item, next));
    if (tunnel) {
      const target = s.tunnels.find((item) => item.id === tunnel.linkId);
      if (target) {
        next = { x: target.x, y: target.y };
        target.cooldown = 3;
        audio.playTone(1200, 'sine', 0.08, 0.08);
        haptics.impactMedium();
        juice.addChromatic(5);
        juice.emitParticles((target.x + 0.5) * (100 / SNAKE_GRID_W), (target.y + 0.5) * (100 / SNAKE_GRID_H), '#448aff', 18);
      }
    }

    const out = next.x < 0 || next.x >= SNAKE_GRID_W || next.y < 0 || next.y >= SNAKE_GRID_H;
    const wall = s.walls.some((value) => same(value, next));
    const gate = s.gates.some((value) => value.active && same(value, next));
    const locked = s.food.type === 'LOCKED_DATA' && same(s.food, next) && !s.hasKey;
    const self = s.snake.slice(0, -1).some((value) => same(value, next));
    if (out || wall || gate || locked || self) {
      die(juice, out ? 'EDGE' : wall ? 'WALL' : gate ? 'FIREWALL' : locked ? '2FA_LOCK' : 'SELF_COLLISION');
      return;
    }

    s.snake.unshift(next);
    if (s.keyItem && same(s.keyItem, next)) {
      s.keyItem = null;
      s.hasKey = true;
      s.score += 75;
      setScore(s.score);
      audio.playSuccess();
      haptics.notificationSuccess();
      juice.emitParticles((next.x + 0.5) * (100 / SNAKE_GRID_W), (next.y + 0.5) * (100 / SNAKE_GRID_H), '#ffd740', 22);
      addLog(LogLevel.SUCCESS, 'AUTH_KEY_ACQUIRED');
    }

    if (same(s.food, next)) eat(juice);
    else s.snake.pop();
  }, [addLog, die, eat]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = state.current;
    const profile = getSnakeProfile(s.level);
    const cell = Math.max(6, Math.floor(Math.min(width, height) / SNAKE_GRID_W));
    const boardW = cell * SNAKE_GRID_W;
    const boardH = cell * SNAKE_GRID_H;
    const ox = (width - boardW) / 2;
    const oy = (height - boardH) / 2;

    ctx.save();
    ctx.fillStyle = '#020608';
    ctx.fillRect(ox, oy, boardW, boardH);
    if (s.virusEffect === 'VIDEO_DRIVER_FAIL') ctx.translate((Math.random() - 0.5) * 5, 0);

    ctx.strokeStyle = 'rgba(0,240,255,0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= SNAKE_GRID_W; i += 1) { ctx.moveTo(ox + i * cell, oy); ctx.lineTo(ox + i * cell, oy + boardH); }
    for (let i = 0; i <= SNAKE_GRID_H; i += 1) { ctx.moveTo(ox, oy + i * cell); ctx.lineTo(ox + boardW, oy + i * cell); }
    ctx.stroke();

    s.zones.forEach((zone) => {
      const pulse = 0.09 + Math.sin(s.animTime * 8) * 0.035;
      ctx.fillStyle = `rgba(255,170,0,${pulse})`;
      ctx.fillRect(ox + zone.x * cell, oy + zone.y * cell, zone.w * cell, zone.h * cell);
      ctx.strokeStyle = s.inOverclock ? '#ffd740' : 'rgba(255,170,0,.4)';
      ctx.lineWidth = s.inOverclock ? 2 : 1;
      ctx.strokeRect(ox + zone.x * cell, oy + zone.y * cell, zone.w * cell, zone.h * cell);
    });

    ctx.fillStyle = '#073338';
    s.walls.forEach((value) => { ctx.fillRect(ox + value.x * cell + 1, oy + value.y * cell + 1, cell - 2, cell - 2); });
    s.gates.forEach((gate) => {
      const x = ox + gate.x * cell;
      const y = oy + gate.y * cell;
      ctx.fillStyle = gate.active ? `rgba(255,23,68,${0.5 + Math.sin(s.animTime * 10) * 0.2})` : '#252a2b';
      ctx.shadowColor = gate.active ? '#ff1744' : 'transparent';
      ctx.shadowBlur = gate.active ? 10 : 0;
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.shadowBlur = 0;
    });
    s.tunnels.forEach((tunnel) => {
      const x = ox + tunnel.x * cell;
      const y = oy + tunnel.y * cell;
      ctx.strokeStyle = '#448aff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.strokeRect(x + 5, y + 5, Math.max(1, cell - 10), Math.max(1, cell - 10));
    });

    const drawItem = (point: SnakePoint, type: SnakeFoodType | 'KEY') => {
      const cx = ox + (point.x + 0.5) * cell;
      const cy = oy + (point.y + 0.5) * cell;
      ctx.save();
      ctx.translate(cx, cy);
      const pulse = 0.85 + Math.sin(s.animTime * 7) * 0.12;
      ctx.scale(pulse, pulse);
      if (type === 'DATA') { ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, cell * 0.25, 0, Math.PI * 2); ctx.fill(); }
      if (type === 'VIRUS') { ctx.fillStyle = '#ff1744'; ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 13; ctx.fillRect(-cell * 0.3, -cell * 0.3, cell * 0.6, cell * 0.6); }
      if (type === 'ZIP') { ctx.fillStyle = '#448aff'; ctx.shadowColor = '#448aff'; ctx.shadowBlur = 12; ctx.fillRect(-cell * 0.32, -cell * 0.12, cell * 0.64, cell * 0.24); ctx.fillRect(-cell * 0.12, -cell * 0.32, cell * 0.24, cell * 0.64); }
      if (type === 'LOCKED_DATA') { ctx.strokeStyle = s.hasKey ? '#00ff88' : '#ff1744'; ctx.lineWidth = 2; ctx.strokeRect(-cell * 0.3, -cell * 0.05, cell * 0.6, cell * 0.45); ctx.beginPath(); ctx.arc(0, -cell * 0.05, cell * 0.2, Math.PI, 0); ctx.stroke(); }
      if (type === 'KEY') { ctx.fillStyle = '#ffd740'; ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(-cell * 0.12, 0, cell * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(0, -cell * 0.07, cell * 0.34, cell * 0.14); }
      ctx.restore();
    };

    if (s.keyItem) drawItem(s.keyItem, 'KEY');
    drawItem(s.food, s.food.type);

    s.snake.forEach((value, index) => {
      const x = ox + value.x * cell;
      const y = oy + value.y * cell;
      const alpha = Math.max(0.22, 1 - index / Math.max(6, s.snake.length));
      ctx.fillStyle = s.virusEffect === 'NONE' ? `rgba(0,240,255,${alpha})` : `rgba(255,60,80,${alpha})`;
      if (index === 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; }
      ctx.fillRect(x + (index ? 2 : 1), y + (index ? 2 : 1), cell - (index ? 4 : 2), cell - (index ? 4 : 2));
      ctx.shadowBlur = 0;
    });

    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';
    ctx.fillText(s.sandbox ? 'SANDBOX // ENDLESS' : `DATA ${s.itemsCollected}/${s.target}`, ox + 6, oy + 6);
    ctx.fillStyle = '#00bcd4';
    ctx.textAlign = 'right';
    ctx.fillText(profile.label, ox + boardW - 6, oy + 6);
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
    '25 NODES ESCALATE FROM TRAINING TO THE ROOT CORE GAUNTLET.',
  ], []);

  return (
    <GameCore
      gameId="SNAKE"
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
