import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { useStore } from '../../store';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { blockColor, createBreakoutBlocks, getBreakoutRules } from './breakout/breakoutConfig';
import type { BreakoutBall, BreakoutBlock, BreakoutState } from './breakout/breakoutTypes';
import { drawBreakoutScene } from './breakout/breakoutRenderer';

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
  const lowPowerMode = useStore((s) => s.user.settings.lowPowerMode ?? false);
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
    drawBreakoutScene(ctx, state.current, width, height, { lowPowerMode });
  }, [lowPowerMode]);

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
