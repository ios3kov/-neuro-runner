export type DefenderEnemyKind = 'NORMAL' | 'FAST' | 'CORRUPTED' | 'HEAVY' | 'SPLITTER' | 'BOSS';

export interface DefenderEnemy {
  id: number;
  kind: DefenderEnemyKind;
  dist: number;
  angle: number;
  speed: number;
  rotation: number;
  hp: number;
  maxHp: number;
  active: boolean;
}

export interface DefenderRules {
  level: number;
  duration: number;
  spawnEvery: number;
  baseSpeed: number;
  maxEnemies: number;
  shieldArc: number;
  shieldTurnSpeed: number;
  damage: number;
  fastChance: number;
  corruptChance: number;
  heavyChance: number;
  splitterChance: number;
  bossMode: boolean;
}

export interface DefenderState {
  shieldAngle: number;
  shieldEnergy: number;
  overcharge: number;
  enemies: DefenderEnemy[];
  spawnTimer: number;
  score: number;
  level: number;
  hp: number;
  time: number;
  duration: number;
  blocked: number;
  combo: number;
  bestCombo: number;
  gameOver: boolean;
}
