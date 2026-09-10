import type { AsteroidKind, AsteroidsLevelRules, Vec2 } from './asteroidsTypes';

export const getAsteroidsRules = (level: number): AsteroidsLevelRules => ({
  level,
  targetKills: 12 + Math.floor((level - 1) * 1.8),
  spawnEvery: Math.max(0.48, 1.58 - level * 0.043),
  speedScale: 1 + level * 0.06,
  lives: level >= 19 ? 2 : 3,
  fastChance: level >= 4 ? Math.min(0.24, 0.06 + (level - 4) * 0.013) : 0,
  armoredChance: level >= 7 ? Math.min(0.24, 0.05 + (level - 7) * 0.015) : 0,
  mineChance: level >= 11 ? Math.min(0.18, 0.04 + (level - 11) * 0.015) : 0,
  coreChance: level >= 17 ? Math.min(0.18, 0.05 + (level - 17) * 0.03) : 0,
});

export const asteroidColor = (kind: AsteroidKind) => ({
  ROCK: '#ff2b7a',
  FAST: '#f3ff00',
  ARMORED: '#7d5cff',
  MINE: '#ff0055',
  CORE: '#ffffff',
}[kind]);

export const makePolygon = (radius: number, seed: number, sides = 8): Vec2[] => {
  const points: Vec2[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = i / sides * Math.PI * 2;
    const jitter = 0.78 + (((seed * 31 + i * 17) % 23) / 100);
    points.push({ x: Math.cos(angle) * radius * jitter, y: Math.sin(angle) * radius * jitter });
  }
  return points;
};

export const chooseAsteroidKind = (level: number, serial: number): AsteroidKind => {
  const rules = getAsteroidsRules(level);
  const roll = ((serial * 37 + level * 19) % 100) / 100;
  if (roll < rules.coreChance) return 'CORE';
  if (roll < rules.coreChance + rules.mineChance) return 'MINE';
  if (roll < rules.coreChance + rules.mineChance + rules.armoredChance) return 'ARMORED';
  if (roll < rules.coreChance + rules.mineChance + rules.armoredChance + rules.fastChance) return 'FAST';
  return 'ROCK';
};

export const asteroidHp = (kind: AsteroidKind) => kind === 'CORE' ? 5 : kind === 'ARMORED' ? 3 : 1;
