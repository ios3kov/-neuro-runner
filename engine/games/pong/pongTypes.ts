export type ArenaMode = 'CLASSIC' | 'FIREWALL' | 'PULSE' | 'WARP' | 'NARROW' | 'CORE';

export interface Trail {
  x: number;
  y: number;
  alpha: number;
}

export interface Paddle {
  x: number;
  w: number;
  score: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface Barrier {
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
}

export interface PongState {
  ball: Ball;
  p1: Paddle;
  p2: Paddle;
  score: number;
  level: number;
  targetScore: number;
  gameOver: boolean;
  roundComplete: boolean;
  trails: Trail[];
  rally: number;
  maxRally: number;
  combo: number;
  bestCombo: number;
  elapsed: number;
  pulseTimer: number;
  pulseActive: boolean;
  warpCooldown: number;
  barriers: Barrier[];
  mode: ArenaMode;
}
