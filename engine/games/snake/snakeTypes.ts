export const SNAKE_GRID_W = 24;
export const SNAKE_GRID_H = 24;
export const SNAKE_MAX_LEVEL = 25;

export type SnakePoint = { x: number; y: number };
export type SnakeFoodType = 'DATA' | 'VIRUS' | 'ZIP' | 'LOCKED_DATA';
export type SnakeVirusEffect = 'NONE' | 'INPUT_HIJACK' | 'VIDEO_DRIVER_FAIL';
export type SnakeStageTheme = 'TRAINING' | 'FIREWALL' | 'MALWARE' | 'VPN' | 'COMPRESSION' | 'TWO_FA' | 'OVERCLOCK' | 'GAUNTLET' | 'CORE';

export interface SnakeGate extends SnakePoint { active: boolean; }
export interface SnakeTunnel extends SnakePoint { id: number; linkId: number; cooldown: number; }
export interface SnakeZone { x: number; y: number; w: number; h: number; type: 'OVERCLOCK'; }

export interface SnakeLevelProfile {
  level: number;
  theme: SnakeStageTheme;
  target: number;
  tick: number;
  firewallPeriod: number;
  virusChance: number;
  zipChance: number;
  twoFactor: boolean;
  label: string;
}

export interface SnakeState {
  snake: SnakePoint[];
  dir: SnakePoint;
  nextDir: SnakePoint;
  food: SnakePoint & { type: SnakeFoodType };
  keyItem: SnakePoint | null;
  walls: SnakePoint[];
  gates: SnakeGate[];
  tunnels: SnakeTunnel[];
  zones: SnakeZone[];
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
  virusEffect: SnakeVirusEffect;
  virusTimer: number;
  hasKey: boolean;
  inOverclock: boolean;
  overclockScoreTimer: number;
  animTime: number;
  history: SnakePoint[];
  combo: number;
  comboTimer: number;
  bestCombo: number;
}

export interface SnakeArena {
  walls: SnakePoint[];
  gates: SnakeGate[];
  tunnels: SnakeTunnel[];
  zones: SnakeZone[];
}
