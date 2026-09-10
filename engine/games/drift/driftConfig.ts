import type { DriftGateKind, DriftLevelRules } from './driftTypes';

export const getDriftRules = (level: number): DriftLevelRules => ({
  level,
  targetPassed: 10 + Math.floor((level - 1) * 1.25),
  baseSpeed: 36 + level * 3.2,
  acceleration: 0.32 + level * 0.03,
  gateWidth: Math.max(13, 32 - level * 0.65),
  spawnEvery: Math.max(0.55, 1.28 - level * 0.028),
  lives: level >= 19 ? 2 : 3,
  movingChance: level >= 4 ? Math.min(0.28, 0.07 + (level - 4) * 0.015) : 0,
  boostChance: level >= 7 ? Math.min(0.22, 0.055 + (level - 7) * 0.014) : 0,
  glitchChance: level >= 11 ? Math.min(0.18, 0.04 + (level - 11) * 0.016) : 0,
  coreMode: level >= 18,
});

export const gateKindFor = (level: number, serial: number): DriftGateKind => {
  const rules = getDriftRules(level);
  if (rules.coreMode && serial % 7 === 0) return 'CORE';
  const roll = ((serial * 37 + level * 23) % 100) / 100;
  if (roll < rules.glitchChance) return 'GLITCH';
  if (roll < rules.glitchChance + rules.boostChance) return 'BOOST';
  if (roll < rules.glitchChance + rules.boostChance + rules.movingChance) return 'MOVING';
  return 'NORMAL';
};

export const gateColor = (kind: DriftGateKind) => ({
  NORMAL: '#00f3ff',
  MOVING: '#7d5cff',
  BOOST: '#f3ff00',
  GLITCH: '#ff0055',
  CORE: '#ffffff',
}[kind]);
