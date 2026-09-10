import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { blockColor, createBreakoutBlocks, getBreakoutRules } from './breakout/breakoutConfig';
import type { BreakoutBall, BreakoutBlock, BreakoutState } from './breakout/breakoutTypes';

const makeBall = (level: number, direction = -1, x = 50): BreakoutBall => {
  const speed = getBreakoutRules(level).ballSpeed;
  const angle = 0.75 + ((level * 13) % 25) / 100;
  return {
    x,
    y: 79,
    vx: Math.cos(angle) * speed * (level % 2 ? 1 : -1),
    vy: Math.sin(angle) * speed * direction,
    radius: 1.15,
    active: true,
    trail: [],
  };
};

const createState = (level: number): BreakoutState => {
  const rules = getBreakoutRules(level);
  const blocks = createBreakoutBlocks(level);
  return {
    balls: [makeBall(level)],
    paddle: { x: 50 - rules.paddleWidth / 2, w: rules.paddleWidth, energy: 0, overdrive: 0 },
    blocks,
    score: (level - 1) * 700,
    level,
    lives: rules.lives,
    combo: 0,
    bestCombo: 0,
    gameOver: false,
    destroyedCount: 0,
    targetDestroyed: blocks.length,
    elapsed: 0,
    flash: 0,
  };
};

const isBreakoutState = (value: unknown): value is BreakoutState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<BreakoutState>;
  return Array.isArray(s.balls) && Array.isArray(s.blocks) && !!s.paddle
    && typeof s.score === 'number' && typeof s.level === 'number'
    && typeof s.lives === 'number' && typeof s.gameOver === 'boolean'
    && typeof s.destroyedCount === 'number' && typeof s.targetDestroyed === 'number';
};

export const BreakoutGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const state = useRef<BreakoutState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: BreakoutState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(s.targetDestroyed > 0 ? s.destroyedCount / s.targetDestroyed : 0);
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isBreakoutState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  };

  const explodeNeighbors = (origin: BreakoutBlock, juice: GameCoreHandle) => {
    const s = state.current;
    s.blocks.forEach(block => {
      if (!block.active || block.id === origin.id) return;
      const dx = Math.abs(block.x - origin.x);
      const dy = Math.abs(block.y - origin.y);
      if (dx < 14 && dy < 6.5) {
        block.hp = 1;
        hitBlock(block, juice, true);
      }
    });
  };

  const hitBlock = (block: BreakoutBlock, juice: GameCoreHandle, chained = false) => {
    const s = state.current;
    if (!block.active) return;

    if (block.kind === 'SHIELD' && block.hp === block.maxHp) {
      block.hp -= 1;
      audio.playTone(360, 'square', 0.04, 0.07);
      juice.addChromatic(4);
      juice.emitParticles(block.x + block.w / 2, block.y + block.h / 2, blockColor(block.kind), 8);
      return;
    }

    block.hp -= 1;
    if (block.hp > 0) {
      audio.playClick();
      juice.addShake(1);
      return;
    }

    block.active = false;
    s.destroyedCount += 1;
    s.combo += chained ? 2 : 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const comboMultiplier = 1 + Math.min(2.5, s.combo * 0.08);
    const base = block.kind === 'CORE' ? 180 : block.kind === 'ARMORED' ? 70 : block.kind === 'CORRUPT' ? 90 : 45;
    s.score += Math.round(base * s.level * comboMultiplier);
    s.paddle.energy = Math.min(100, s.paddle.energy + (block.kind === 'CORE' ? 18 : 5));

    audio.playExplosion();
    haptics.impactMedium();
    const color = blockColor(block.kind);
    juice.emitParticles(block.x + block.w / 2, block.y + block.h / 2, color, block.kind === 'CORE' ? 28 : 14);
    juice.addShake(block.kind === 'CORE' ? 7 : 2.5);

    if (block.kind === 'EXPLOSIVE') {
      juice.addChromatic(12);
      juice.triggerHitStop(65);
      explodeNeighbors(block, juice);
    }
    if (block.kind === 'CORRUPT') {
      s.paddle.w = Math.max(8, s.paddle.w * 0.88);
      juice.addChromatic(16);
      audio.playError();
    }
    if (block.kind === 'CORE') {
      s.flash = 1;
      juice.triggerHitStop(90);
    }

    syncUi(s);
  };

  const launchMultiball = (juice: GameCoreHandle) => {
    const s = state.current;
    if (s.balls.filter(ball => ball.active).length >= 3) return;
    const source = s.balls.find(ball => ball.active);
    if (!source) return;
    s.balls.push({ ...makeBall(s.level, source.vy < 0 ? -1 : 1, source.x), y: source.y, trail: [] });
    s.balls.push({ ...makeBall(s.level, source.vy < 0 ? -1 : 1, source.x), vx: -source.vx, y: source.y, trail: [] });
    audio.playSuccess();
    haptics.notificationSuccess();
    juice.addChromatic(8);
  };

  const completeLevel = (juice: GameCoreHandle) => {
    const s = state.current;
    s.score += s.lives * 250 + s.bestCombo * 40;
    setScore(s.score);
    haptics.notificationSuccess();
    juice.levelUp(s.level + 1, { targetsDestroyed: s.destroyedCount, score: s.score, bestCombo: s.bestCombo });
  };

  const loseLife = (juice: GameCoreHandle) => {
    const s = state.current;
    s.lives -= 1;
    s.combo = 0;
    audio.playError();
    haptics.notificationWarning();
    juice.addShake(13);
    juice.addChromatic(8);
    if (s.lives <= 0) {
      s.gameOver = true;
      haptics.notificationError();
      juice.triggerHitStop(180);
      updateStats('BREAKOUT', s.score, s.level);
      setGameOver(true);
      return;
    }
    s.balls = [makeBall(s.level)];
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    const rules = getBreakoutRules(s.level);
    s.elapsed += dt;
    s.flash = Math.max(0, s.flash - dt * 2.6);
    s.paddle.overdrive = Math.max(0, s.paddle.overdrive - dt);

    if (input.keys.has('ArrowLeft')) s.paddle.x -= 82 * dt;
    if (input.keys.has('ArrowRight')) s.paddle.x += 82 * dt;
    if (input.isTouching) s.paddle.x += input.touchDeltaX * 1.35;
    if ((input.keys.has('Space') || input.tapDetected) && s.paddle.energy >= 100) {
      s.paddle.energy = 0;
      s.paddle.overdrive = 5;
      s.paddle.w = Math.min(28, s.paddle.w * 1.35);
      launchMultiball(juice);
    }
    if (s.paddle.overdrive <= 0) s.paddle.w += (rules.paddleWidth - s.paddle.w) * Math.min(1, dt * 2.5);
    s.paddle.x = Math.max(0, Math.min(100 - s.paddle.w, s.paddle.x));

    if (rules.movingRows) {
      s.blocks.forEach(block => {
        if (!block.active || !block.vx) return;
        block.x += block.vx * dt;
        if (block.x <= 0.5 || block.x + block.w >= 99.5) block.vx *= -1;
      });
    }

    for (const ball of s.balls) {
      if (!ball.active) continue;
      ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.75 });
      if (ball.trail.length > 16) ball.trail.shift();
      ball.trail.forEach(point => { point.alpha = Math.max(0, point.alpha - dt * 2.2); });

      const speedBoost = s.paddle.overdrive > 0 ? 1.08 : 1;
      ball.x += ball.vx * dt * speedBoost;
      ball.y += ball.vy * dt * speedBoost;

      if (ball.x <= ball.radius || ball.x >= 100 - ball.radius) {
        ball.vx *= -1;
        ball.x = Math.max(ball.radius, Math.min(100 - ball.radius, ball.x));
        audio.playTone(240, 'triangle', 0.025, 0.04);
      }
      if (ball.y <= ball.radius) {
        ball.vy = Math.abs(ball.vy);
        ball.y = ball.radius;
      }

      if (ball.y >= 89 && ball.y <= 93 && ball.vy > 0 && ball.x >= s.paddle.x && ball.x <= s.paddle.x + s.paddle.w) {
        const hit = (ball.x - (s.paddle.x + s.paddle.w / 2)) / (s.paddle.w / 2);
        ball.vy = -Math.abs(ball.vy) * 1.015;
        ball.vx += hit * 44;
        ball.y = 88.8;
        s.combo = Math.max(0, s.combo - 1);
        audio.playKeystroke();
        haptics.impactLight();
        juice.emitParticles(ball.x, 90, '#00f3ff', 7);
      }

      for (const block of s.blocks) {
        if (!block.active) continue;
        if (ball.x + ball.radius < block.x || ball.x - ball.radius > block.x + block.w || ball.y + ball.radius < block.y || ball.y - ball.radius > block.y + block.h) continue;
        const fromSide = Math.min(Math.abs(ball.x - block.x), Math.abs(ball.x - (block.x + block.w))) < Math.min(Math.abs(ball.y - block.y), Math.abs(ball.y - (block.y + block.h)));
        if (fromSide) ball.vx *= -1; else ball.vy *= -1;
        hitBlock(block, juice);
        break;
      }

      if (ball.y > 103) ball.active = false;
    }

    if (s.balls.every(ball => !ball.active)) loseLife(juice);
    else if (rules.multiball && s.paddle.energy >= 100 && s.balls.length === 1) launchMultiball(juice);

    if (s.blocks.every(block => !block.active)) completeLevel(juice);
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = state.current;
    const w = (v: number) => width * v / 100;
    const h = (v: number) => height * v / 100;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0,243,255,0.06)');
    gradient.addColorStop(0.55, 'rgba(5,5,8,0.02)');
    gradient.addColorStop(1, 'rgba(255,0,85,0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0,243,255,0.055)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 100; x += 5) { ctx.beginPath(); ctx.moveTo(w(x), 0); ctx.lineTo(w(x), height); ctx.stroke(); }
    for (let y = 0; y < 100; y += 5) { ctx.beginPath(); ctx.moveTo(0, h(y)); ctx.lineTo(width, h(y)); ctx.stroke(); }

    for (const block of s.blocks) {
      if (!block.active) continue;
      const color = blockColor(block.kind);
      const pulse = 0.65 + Math.sin(s.elapsed * 4 + block.phase) * 0.2;
      const bx = w(block.x), by = h(block.y), bw = w(block.w), bh = h(block.h);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = block.kind === 'CORE' ? 18 : 9;
      ctx.strokeStyle = color;
      ctx.lineWidth = block.kind === 'CORE' ? 2.5 : 1.4;
      ctx.globalAlpha = pulse;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.08 + 0.13 * (block.hp / block.maxHp);
      ctx.fillRect(bx, by, bw, bh);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(bx + 2, by + 2, Math.max(0, (bw - 4) * block.hp / block.maxHp), 1.5);
      if (block.kind === 'SHIELD') {
        ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.25; ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
      }
      if (block.kind === 'CORRUPT') {
        ctx.globalAlpha = 0.4;
        ctx.fillRect(bx + ((Math.sin(s.elapsed * 13 + block.phase) + 1) * 0.5) * Math.max(1, bw - 4), by, 2, bh);
      }
      ctx.restore();
    }

    for (const ball of s.balls) {
      if (!ball.active) continue;
      ball.trail.forEach((trail, index) => {
        ctx.fillStyle = `rgba(0,243,255,${trail.alpha * (index / Math.max(1, ball.trail.length)) * 0.45})`;
        ctx.beginPath(); ctx.arc(w(trail.x), h(trail.y), w(0.25 + index * 0.025), 0, Math.PI * 2); ctx.fill();
      });
      ctx.save();
      ctx.shadowColor = s.paddle.overdrive > 0 ? '#f3ff00' : '#ffffff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(w(ball.x), h(ball.y), w(ball.radius), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.save();
    const paddleColor = s.paddle.overdrive > 0 ? '#f3ff00' : '#00f3ff';
    ctx.shadowColor = paddleColor; ctx.shadowBlur = 18; ctx.fillStyle = paddleColor;
    ctx.fillRect(w(s.paddle.x), h(90), w(s.paddle.w), h(1.8));
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7; ctx.fillRect(w(s.paddle.x + 1), h(90.45), w(Math.max(0, s.paddle.w - 2)), h(0.28));
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(w(2), h(94.5), w(34), h(3));
    ctx.strokeStyle = '#00f3ff'; ctx.strokeRect(w(2), h(94.5), w(34), h(3));
    ctx.fillStyle = s.paddle.energy >= 100 ? '#f3ff00' : '#00f3ff';
    ctx.fillRect(w(2), h(94.5), w(34 * s.paddle.energy / 100), h(3));

    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff';
    ctx.fillText(`LIVES ${s.lives}`, w(2), h(99));
    ctx.textAlign = 'center'; ctx.fillStyle = s.combo >= 8 ? '#f3ff00' : '#00f3ff';
    ctx.fillText(`COMBO x${s.combo}`, width / 2, h(99));
    ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff';
    ctx.fillText(`BLOCKS ${s.targetDestroyed - s.destroyedCount}`, w(98), h(99));

    if (s.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${s.flash * 0.16})`; ctx.fillRect(0, 0, width, height); }
  }, []);

  const instructions = useMemo(() => [
    'BREAK THE DATA WALL. CLEAR EVERY ACTIVE BLOCK.',
    'CYAN: DATA // YELLOW: ARMORED // MAGENTA: EXPLOSIVE.',
    'VIOLET SHIELDS ABSORB A HIT. RED CORRUPTION SHRINKS YOUR PADDLE.',
    'CHAIN HITS TO BUILD COMBO. FULL ENERGY TRIGGERS OVERDRIVE + MULTIBALL.',
    'LATE NODES ADD MOVING ROWS, CORE BLOCKS AND COMBINED THREATS.',
  ], []);

  return <GameCore
    gameId="BREAKOUT"
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
