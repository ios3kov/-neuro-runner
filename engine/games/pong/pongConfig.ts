import type { ArenaMode, Barrier, PongState } from './pongTypes';

export const clampPong = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const pongTargetForLevel = (level: number) => 3 + Math.floor((level - 1) / 5);

export const pongModeForLevel = (level: number): ArenaMode => {
  if (level <= 3) return 'CLASSIC';
  if (level <= 6) return 'FIREWALL';
  if (level <= 9) return 'PULSE';
  if (level <= 12) return 'WARP';
  if (level <= 15) return 'FIREWALL';
  if (level <= 18) return 'NARROW';
  return 'CORE';
};

export const pongPaddleWidthForLevel = (level: number) => {
  if (level >= 19) return 10;
  if (level >= 16) return 11;
  if (level >= 10) return 13;
  return 15;
};

export const buildPongBarriers = (level: number): Barrier[] => {
  if ((level >= 4 && level <= 6) || (level >= 13 && level <= 15) || level >= 19) {
    const second = level >= 14;
    return [
      { x: 8, y: 47, w: second ? 31 : 36, h: 2, phase: 0 },
      { x: second ? 61 : 56, y: 51, w: second ? 31 : 36, h: 2, phase: Math.PI },
    ];
  }
  return [];
};

export const createPongState = (level: number): PongState => {
  const safeLevel = Math.max(1, Math.min(20, level || 1));
  const paddleWidth = pongPaddleWidthForLevel(safeLevel);
  const baseSpeed = 78 + safeLevel * 4.8;
  return {
    ball: {
      x: 50,
      y: 50,
      vx: (Math.random() > 0.5 ? 1 : -1) * (28 + Math.random() * 34),
      vy: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
      size: safeLevel >= 16 ? 1.35 : 1.6,
    },
    p1: { x: 50 - paddleWidth / 2, w: paddleWidth, score: 0 },
    p2: { x: 50 - paddleWidth / 2, w: paddleWidth, score: 0 },
    score: (safeLevel - 1) * 300,
    level: safeLevel,
    targetScore: pongTargetForLevel(safeLevel),
    gameOver: false,
    roundComplete: false,
    trails: [],
    rally: 0,
    maxRally: 0,
    combo: 0,
    bestCombo: 0,
    elapsed: 0,
    pulseTimer: 0,
    pulseActive: false,
    warpCooldown: 0,
    barriers: buildPongBarriers(safeLevel),
    mode: pongModeForLevel(safeLevel),
  };
};

export const PONG_MODE_MESSAGES: Record<ArenaMode, string> = {
  CLASSIC: 'ARENA_PROTOCOL: CLASSIC_DUEL',
  FIREWALL: 'ARENA_PROTOCOL: MOVING_FIREWALLS',
  PULSE: 'ARENA_PROTOCOL: PULSE_ACCELERATION',
  WARP: 'ARENA_PROTOCOL: EDGE_WARP',
  NARROW: 'ARENA_PROTOCOL: NARROW_DEFENSE',
  CORE: 'ARENA_PROTOCOL: CORE_OVERLOAD',
};
