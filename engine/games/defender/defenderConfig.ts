import type { DefenderEnemyKind, DefenderRules } from './defenderTypes';

export const getDefenderRules = (level: number): DefenderRules => ({
  level,
  duration: 20 + level * 5,
  spawnEvery: Math.max(0.3, 1.45 - level * 0.043),
  baseSpeed: 17 + level * 1.05,
  maxEnemies: 6 + Math.floor(level * 0.58),
  shieldArc: Math.max(0.52, 1.08 - level * 0.022),
  shieldTurnSpeed: 3.5 + level * 0.07,
  damage: level >= 18 ? 25 : 20,
  fastChance: level >= 5 ? Math.min(0.28, 0.08 + (level - 5) * 0.012) : 0,
  corruptChance: level >= 9 ? Math.min(0.24, 0.05 + (level - 9) * 0.014) : 0,
  heavyChance: level >= 13 ? Math.min(0.22, 0.05 + (level - 13) * 0.016) : 0,
  splitterChance: level >= 17 ? Math.min(0.18, 0.04 + (level - 17) * 0.018) : 0,
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
