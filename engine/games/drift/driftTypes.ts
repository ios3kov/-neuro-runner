export type DriftGateKind = 'NORMAL' | 'MOVING' | 'BOOST' | 'GLITCH' | 'CORE';

export interface DriftGate {
  id: number;
  y: number;
  center: number;
  width: number;
  kind: DriftGateKind;
  phase: number;
  passed: boolean;
}

export interface DriftState {
  playerX: number;
  velocityX: number;
  speed: number;
  gates: DriftGate[];
  gateTimer: number;
  combo: number;
  bestCombo: number;
  score: number;
  level: number;
  lives: number;
  distance: number;
  passed: number;
  targetPassed: number;
  overdrive: number;
  elapsed: number;
  gameOver: boolean;
}

export interface DriftLevelRules {
  level: number;
  targetPassed: number;
  baseSpeed: number;
  acceleration: number;
  gateWidth: number;
  spawnEvery: number;
  lives: number;
  movingChance: number;
  boostChance: number;
  glitchChance: number;
  coreMode: boolean;
}
