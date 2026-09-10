import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { LogLevel } from '../../types';
import type { ArenaMode, Paddle, PongState } from './pong/pongTypes';
import {
  buildPongBarriers,
  clampPong,
  createPongState,
  PONG_MODE_MESSAGES,
  pongModeForLevel,
  pongTargetForLevel,
} from './pong/pongConfig';
import { drawPongScene } from './pong/pongRenderer';

export const PongGame: React.FC = () => {
  const addLog = useStore((s) => s.addLog);
  const lowPowerMode = useStore((s) => s.user.settings.lowPowerMode ?? false);
  const updateStats = useGameStore((s) => s.updateStats);
  const state = useRef<PongState>(createPongState(1));

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [levelProgress, setLevelProgress] = useState(0);

  const resetBall = useCallback((towardPlayer?: boolean) => {
    const s = state.current;
    const speed = 78 + s.level * 4.8;
    s.ball.x = 50;
    s.ball.y = 50;
    s.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (28 + Math.random() * 34);
    const down = towardPlayer ?? (Math.random() > 0.5);
    s.ball.vy = (down ? 1 : -1) * speed;
    s.trails = [];
    s.rally = 0;
    s.pulseActive = false;
    s.pulseTimer = 0;
    s.warpCooldown = 0;
  }, []);

  const reset = useCallback((startLevel: number = 1) => {
    const next = createPongState(startLevel);
    state.current = next;
    setScore(next.score);
    setLevel(next.level);
    setGameOver(false);
    setLevelProgress(0);
    addLog(next.level >= 16 ? LogLevel.WARN : LogLevel.SYS, PONG_MODE_MESSAGES[next.mode]);
  }, [addLog]);

  const saveState = useCallback(() => JSON.stringify(state.current), []);

  const loadState = useCallback((data: string) => {
    try {
      const loaded = JSON.parse(data) as Partial<PongState>;
      if (!loaded.ball || !loaded.p1 || !loaded.p2 || typeof loaded.level !== 'number') return;
      const safeLevel = clampPong(Math.floor(loaded.level), 1, 20);
      state.current = {
        ...createPongState(safeLevel),
        ...loaded,
        level: safeLevel,
        targetScore: pongTargetForLevel(safeLevel),
        mode: pongModeForLevel(safeLevel),
        barriers: Array.isArray(loaded.barriers) ? loaded.barriers : buildPongBarriers(safeLevel),
      } as PongState;
      setScore(state.current.score || 0);
      setLevel(safeLevel);
      setGameOver(Boolean(state.current.gameOver));
      setLevelProgress(clampPong(state.current.p1.score / state.current.targetScore, 0, 1));
    } catch {
      addLog(LogLevel.ERR, 'PONG_SAVE_CORRUPTED');
    }
  }, [addLog]);

  const handlePlayerHit = useCallback((juice: GameCoreHandle) => {
    const s = state.current;
    const hitOffset = (s.ball.x - (s.p1.x + s.p1.w / 2)) / (s.p1.w / 2);
    s.ball.vy = -Math.abs(s.ball.vy) * Math.min(1.035, 1.01 + s.level * 0.001);
    s.ball.vx += hitOffset * (38 + s.level * 1.2);
    s.ball.vx = clampPong(s.ball.vx, -145, 145);
    s.ball.y = 93.7;
    s.rally += 1;
    s.maxRally = Math.max(s.maxRally, s.rally);
    s.combo = Math.min(12, s.combo + 1);
    s.bestCombo = Math.max(s.bestCombo, s.combo);

    audio.playTone(420 + Math.min(480, s.rally * 20), 'square', 0.035, 0.06);
    haptics.impactLight();
    juice.addShake(Math.min(5, 1.5 + s.rally * 0.08));
    juice.emitParticles(s.ball.x, s.ball.y, '#00f0ff', 7 + Math.min(8, s.combo));
  }, []);

  const handleAiHit = useCallback((juice: GameCoreHandle) => {
    const s = state.current;
    const hitOffset = (s.ball.x - (s.p2.x + s.p2.w / 2)) / (s.p2.w / 2);
    s.ball.vy = Math.abs(s.ball.vy) * Math.min(1.03, 1.008 + s.level * 0.001);
    s.ball.vx += hitOffset * (30 + s.level);
    s.ball.vx = clampPong(s.ball.vx, -145, 145);
    s.ball.y = 6.3;
    s.rally += 1;
    s.maxRally = Math.max(s.maxRally, s.rally);
    audio.playTone(260 + Math.min(300, s.rally * 12), 'triangle', 0.03, 0.05);
    juice.emitParticles(s.ball.x, s.ball.y, '#ff0055', 6);
  }, []);

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver || s.roundComplete) return;

    s.elapsed += dt;
    s.warpCooldown = Math.max(0, s.warpCooldown - dt);

    const keyboardSpeed = 88 + s.level * 1.4;
    if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) s.p1.x -= keyboardSpeed * dt;
    if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) s.p1.x += keyboardSpeed * dt;
    if (input.isTouching) s.p1.x += input.touchDeltaX * 0.9;
    s.p1.x = clampPong(s.p1.x, 0, 100 - s.p1.w);

    const aiBase = 2.4 + s.level * 0.18;
    const prediction = s.ball.x + s.ball.vx * (0.035 + Math.min(0.06, s.level * 0.002));
    const targetX = prediction - s.p2.w / 2;
    const aiError = Math.max(0, 7 - s.level * 0.28) * Math.sin(s.elapsed * 1.9);
    s.p2.x += (targetX + aiError - s.p2.x) * aiBase * dt;
    s.p2.x = clampPong(s.p2.x, 0, 100 - s.p2.w);

    if (s.mode === 'PULSE' || s.mode === 'CORE') {
      s.pulseTimer += dt;
      if (s.pulseTimer >= 2.5) {
        s.pulseTimer = 0;
        s.pulseActive = !s.pulseActive;
        audio.playTone(s.pulseActive ? 980 : 520, 'sawtooth', 0.025, 0.08);
        juice.addChromatic(s.pulseActive ? 8 : 3);
      }
    }

    const pulseMultiplier = s.pulseActive ? 1.24 : 1;
    s.ball.x += s.ball.vx * dt * pulseMultiplier;
    s.ball.y += s.ball.vy * dt * pulseMultiplier;

    s.trails.push({ x: s.ball.x, y: s.ball.y, alpha: s.pulseActive ? 0.9 : 0.62 });
    const maxTrail = s.mode === 'CORE' ? 24 : 16;
    if (s.trails.length > maxTrail) s.trails.shift();
    s.trails.forEach((trail) => { trail.alpha = Math.max(0, trail.alpha - dt * 2.2); });

    if ((s.mode === 'WARP' || s.mode === 'CORE') && s.warpCooldown <= 0 && s.ball.y > 24 && s.ball.y < 76) {
      if (s.ball.x <= 0.5) {
        s.ball.x = 98.5;
        s.warpCooldown = 0.22;
        audio.playTone(1200, 'sine', 0.04, 0.08);
        juice.addChromatic(10);
        juice.emitParticles(2, s.ball.y, '#7c3aed', 14);
        juice.emitParticles(98, s.ball.y, '#7c3aed', 14);
      } else if (s.ball.x >= 99.5) {
        s.ball.x = 1.5;
        s.warpCooldown = 0.22;
        audio.playTone(1200, 'sine', 0.04, 0.08);
        juice.addChromatic(10);
        juice.emitParticles(98, s.ball.y, '#7c3aed', 14);
        juice.emitParticles(2, s.ball.y, '#7c3aed', 14);
      }
    }

    if (s.ball.x <= 0 || s.ball.x >= 100) {
      s.ball.vx *= -1;
      s.ball.x = s.ball.x <= 0 ? 0.2 : 99.8;
      audio.playTone(180, 'triangle', 0.02, 0.04);
      juice.addShake(1.2);
    }

    for (const barrier of s.barriers) {
      const oscillation = Math.sin(s.elapsed * (0.8 + s.level * 0.025) + barrier.phase) * (s.level >= 13 ? 10 : 6);
      const bx = barrier.x + oscillation;
      const hit = s.ball.x >= bx && s.ball.x <= bx + barrier.w && s.ball.y >= barrier.y && s.ball.y <= barrier.y + barrier.h;
      if (hit) {
        const fromAbove = s.ball.vy > 0;
        s.ball.vy = (fromAbove ? -1 : 1) * Math.abs(s.ball.vy);
        s.ball.y = fromAbove ? barrier.y - 0.25 : barrier.y + barrier.h + 0.25;
        s.combo = Math.max(0, s.combo - 1);
        audio.playTone(155, 'square', 0.04, 0.06);
        juice.addShake(3);
        juice.emitParticles(s.ball.x, s.ball.y, '#f59e0b', 10);
      }
    }

    if (s.ball.y >= 93.5 && s.ball.y <= 97 && s.ball.vy > 0 && s.ball.x >= s.p1.x - s.ball.size && s.ball.x <= s.p1.x + s.p1.w + s.ball.size) {
      handlePlayerHit(juice);
    }

    if (s.ball.y <= 6.5 && s.ball.y >= 3 && s.ball.vy < 0 && s.ball.x >= s.p2.x - s.ball.size && s.ball.x <= s.p2.x + s.p2.w + s.ball.size) {
      handleAiHit(juice);
    }

    if (s.ball.y < -2) {
      s.p1.score += 1;
      const rallyBonus = s.maxRally * 6;
      const comboBonus = s.combo * 18;
      const speedBonus = Math.floor(Math.max(0, 220 - s.elapsed * 3));
      s.score += 100 * s.level + rallyBonus + comboBonus + speedBonus;
      s.combo = Math.min(12, s.combo + 2);
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      setScore(s.score);
      setLevelProgress(clampPong(s.p1.score / s.targetScore, 0, 1));

      audio.playSuccess();
      haptics.notificationSuccess();
      juice.addShake(7);
      juice.addChromatic(5);
      juice.emitParticles(50, 4, '#22c55e', 24);
      addLog(LogLevel.SUCCESS, `PACKET_BREACH ${s.p1.score}/${s.targetScore}`);

      if (s.p1.score >= s.targetScore) {
        s.roundComplete = true;
        const clearBonus = Math.max(0, 1500 - Math.floor(s.elapsed * 20));
        s.score += clearBonus;
        setScore(s.score);
        setLevelProgress(1);
        juice.levelUp(s.level + 1, {
          score: s.score,
          pointsWon: s.p1.score,
          maxRally: s.maxRally,
          bestCombo: s.bestCombo,
        });
        return;
      }
      resetBall(false);
    }

    if (s.ball.y > 102) {
      s.p2.score += 1;
      s.combo = 0;
      setLevelProgress(clampPong(s.p1.score / s.targetScore, 0, 1));
      audio.playError();
      haptics.notificationWarning();
      juice.addShake(14);
      juice.addChromatic(7);
      juice.emitParticles(50, 97, '#ef4444', 20);
      addLog(LogLevel.WARN, `FIREWALL_BREACH ${s.p2.score}/${s.targetScore}`);

      if (s.p2.score >= s.targetScore) {
        s.gameOver = true;
        setGameOver(true);
        haptics.notificationError();
        audio.playTone(90, 'sawtooth', 0.12, 0.28);
        updateStats('PONG', s.score, s.level);
        return;
      }
      resetBall(true);
    }
  }, [addLog, handleAiHit, handlePlayerHit, resetBall, updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    drawPongScene(ctx, state.current, width, height, { lowPowerMode });
  }, [lowPowerMode]);

  const instructions = useMemo(() => [
    'MOVE THE CYAN PADDLE WITH ARROWS, A/D OR HORIZONTAL TOUCH DRAG.',
    'WIN THE RACE TO THE TARGET SCORE TO SECURE THE NODE.',
    'LONG RALLIES AND CLEAN STREAKS INCREASE SCORE AND COMBO BONUSES.',
    'NODES 4-6: MOVING FIREWALLS. NODES 7-9: PULSE OVERDRIVE.',
    'NODES 10-12: EDGE WARP. NODES 16-18: NARROW PADDLES.',
    'NODES 19-20: CORE MODE COMBINES HAZARDS AT MAXIMUM SPEED.',
  ], []);

  return (
    <GameCore
      gameId="PONG"
      update={update}
      draw={draw}
      onReset={reset}
      isGameOver={gameOver}
      score={score}
      level={level}
      progress={levelProgress}
      instructions={instructions}
      onSave={saveState}
      onLoad={loadState}
    />
  );
};
