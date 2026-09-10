export type CrosswireLaneType = 'GOAL' | 'STREAM' | 'SAFE' | 'ROAD' | 'START';

export interface CrosswireEntity {
  id: number;
  x: number;
  width: number;
  speed: number;
  kind: 'PACKET' | 'BUS' | 'GLITCH' | 'BARGE' | 'RELAY';
}

export interface CrosswireLane {
  row: number;
  type: CrosswireLaneType;
  direction: -1 | 1;
  speed: number;
  entities: CrosswireEntity[];
}

export interface CrosswireRules {
  level: number;
  chapter: 'ACCESS' | 'TRAFFIC' | 'STREAM' | 'BLACKOUT' | 'CORE';
  lives: number;
  targetSlots: number;
  timeLimit: number;
  roadSpeed: number;
  streamSpeed: number;
  entityCount: number;
  hazardWidth: number;
  platformWidth: number;
}

export interface CrosswireState {
  level: number;
  score: number;
  lives: number;
  playerX: number;
  playerRow: number;
  moveCooldown: number;
  timeLeft: number;
  elapsed: number;
  crossings: number;
  targetSlots: number;
  goalCenters: number[];
  filledGoals: boolean[];
  streak: number;
  bestStreak: number;
  highestRow: number;
  lanes: CrosswireLane[];
  gameOver: boolean;
  flash: number;
}
