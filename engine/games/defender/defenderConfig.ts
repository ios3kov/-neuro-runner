import type { DefenderEnemyKind, DefenderRules } from './defenderTypes';

export const getDefenderRules = (level: number): DefenderRules => ({
  level,
  duration: 20 + level * 4,
  spawnEvery: Math.max(0.42, 1.5 - level * 0.04),
  baseSpeed: 16 + level * 0.85,
  maxEnemies: 6 + Math.floor(level * 0.45),
  shieldArc: Math.max(0.58, 1.12 - level * 0.02),
  shieldTurnSpeed: 3.4 + level * 0.065,
  damage: level >= 22 ? 25 : 20,
  fastChance: level >= 5 ? Math.min(0.24, 0.07 + (level - 5) * 0.011) : 0,
  corruptChance: level >= 9 ? Math.min(0.2, 0.045 + (level - 9) * 0.012) : 0,
  heavyChance: level >= 13 ? Math.min(0.19, 0.045 + (level - 13) * 0.014) : 0,
  splitterChance: level >= 17 ? Math.min(0.16, 0.035 + (level - 17) * 0.016) : 0,
  bossMode: level >= 23,
});

export const chooseDefenderEnemyKind = (level: number, serial: number): DefenderEnemyKind => {
  const rules = getDefenderRules(level);
  if (rules.bossMode && serial % 9 === 0) return 'BOSS';
  const roll = ((serial * 41 + level * 19) % 100) / 100;
  if (roll < rules.splitterChance) return 'SPLITTER';
  if (roll < rules.splitterChance + rules.heavyChance) return 'HEAVY';
  if (roll < rules.splitterChance + rules.heavyChance + rules.corruptChance) return 'CORRUPTED';
  if (roll < rules.splitterChance + rules.heavyChance + rules.corruptChance + rules.fastChance) return 'FAST';
  return 'NORMAL';
};

export const defenderEnemyColor = (kind: DefenderEnemyKind) => ({
  NORMAL: '#00f3ff',
  FAST: '#f3ff00',
  CORRUPTED: '#ff0055',
  HEAVY: '#7d5cff',
  SPLITTER: '#ff7a00',
  BOSS: '#ffffff',
}[kind]);

export const defenderEnemyHp = (kind: DefenderEnemyKind) => kind === 'BOSS' ? 4 : kind === 'HEAVY' ? 2 : 1;
