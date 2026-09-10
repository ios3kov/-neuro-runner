export type AsteroidKind = 'ROCK' | 'FAST' | 'ARMORED' | 'MINE' | 'CORE';

export interface Vec2 { x: number; y: number }

export interface AsteroidEntity {
  id: number;
  kind: AsteroidKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hp: number;
  maxHp: number;
  rotation: number;
  spin: number;
  vertices: Vec2[];
  active: boolean;
}

export interface AsteroidBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

export interface AsteroidPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  shield: number;
  invulnerable: number;
}

export interface AsteroidsState {
  player: AsteroidPlayer;
  asteroids: AsteroidEntity[];
  bullets: AsteroidBullet[];
  score: number;
  level: number;
  lives: number;
  combo: number;
  bestCombo: number;
  kills: number;
  targetKills: number;
  spawnTimer: number;
  shotTimer: number;
  elapsed: number;
  gameOver: boolean;
}

export interface AsteroidsLevelRules {
  level: number;
  targetKills: number;
  spawnEvery: number;
  speedScale: number;
  lives: number;
  fastChance: number;
  armoredChance: number;
  mineChance: number;
  coreChance: number;
}
