export type BreakoutBlockKind = 'SOFT' | 'ARMORED' | 'EXPLOSIVE' | 'SHIELD' | 'CORRUPT' | 'CORE';

export interface BreakoutBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface BreakoutBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: BreakoutBlockKind;
  hp: number;
  maxHp: number;
  active: boolean;
  phase: number;
  vx: number;
}

export interface BreakoutLevelRules {
  level: number;
  rows: number;
  targetDestroyed: number;
  ballSpeed: number;
  paddleWidth: number;
  lives: number;
  movingRows: boolean;
  shieldChance: number;
  explosiveChance: number;
  corruptChance: number;
  multiball: boolean;
  coreMode: boolean;
}

export interface BreakoutState {
  balls: BreakoutBall[];
  paddle: { x: number; w: number; energy: number; overdrive: number };
  blocks: BreakoutBlock[];
  score: number;
  level: number;
  lives: number;
  combo: number;
  bestCombo: number;
  gameOver: boolean;
  destroyedCount: number;
  targetDestroyed: number;
  elapsed: number;
  flash: number;
}
