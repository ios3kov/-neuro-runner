export type RunnerLane = -1 | 0 | 1;
export type RunnerObjectType = 'WALL' | 'BEAM' | 'GATE' | 'COIN' | 'BOOST' | 'GLITCH' | 'FINISH';

export interface RunnerObject {
  id: number;
  z: number;
  lane: RunnerLane;
  type: RunnerObjectType;
  collected: boolean;
  yOffset: number;
}

export interface RunnerPlayer {
  x: number;
  y: number;
  lane: RunnerLane;
  vy: number;
  grounded: boolean;
  sliding: boolean;
  slideTimer: number;
  speed: number;
  shield: number;
}

export interface RunnerState {
  player: RunnerPlayer;
  objects: RunnerObject[];
  distance: number;
  score: number;
  coins: number;
  combo: number;
  bestCombo: number;
  level: number;
  targetDistance: number;
  overdrive: number;
  elapsed: number;
  gameOver: boolean;
}

export interface RunnerLevelRules {
  level: number;
  distance: number;
  baseSpeed: number;
  maxSpeed: number;
  acceleration: number;
  spacing: number;
  boostChance: number;
  glitchChance: number;
  obstacleDensity: number;
}
