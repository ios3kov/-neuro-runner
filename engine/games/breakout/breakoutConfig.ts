import type { BreakoutBlock, BreakoutBlockKind, BreakoutLevelRules } from './breakoutTypes';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const getBreakoutRules = (level: number): BreakoutLevelRules => ({
  level,
  rows: Math.min(9, 4 + Math.floor((level - 1) / 2)),
  targetDestroyed: Math.min(72, (4 + Math.floor((level - 1) / 2)) * 8),
  ballSpeed: Math.min(150, 62 + level * 4.2),
  paddleWidth: clamp(21 - level * 0.45, 10, 21),
  lives: level >= 16 ? 2 : 3,
  movingRows: level >= 7,
  shieldChance: level >= 10 ? Math.min(0.28, 0.06 + (level - 10) * 0.02) : 0,
  explosiveChance: level >= 4 ? Math.min(0.22, 0.05 + (level - 4) * 0.012) : 0,
  corruptChance: level >= 13 ? Math.min(0.2, 0.04 + (level - 13) * 0.018) : 0,
  multiball: level >= 9,
  coreMode: level >= 18,
});

const blockKindFor = (level: number, row: number, col: number, rules: BreakoutLevelRules): BreakoutBlockKind => {
  if (rules.coreMode && row < 2 && col >= 2 && col <= 5) return 'CORE';
  const key = (level * 17 + row * 11 + col * 7) % 100;
  if (key < rules.corruptChance * 100) return 'CORRUPT';
  if (key < (rules.corruptChance + rules.shieldChance) * 100) return 'SHIELD';
  if (key < (rules.corruptChance + rules.shieldChance + rules.explosiveChance) * 100) return 'EXPLOSIVE';
  if (row < Math.min(3, 1 + Math.floor(level / 5))) return 'ARMORED';
  return 'SOFT';
};

const hpFor = (kind: BreakoutBlockKind, level: number) => {
  if (kind === 'ARMORED') return level >= 12 ? 3 : 2;
  if (kind === 'SHIELD') return 2;
  if (kind === 'CORE') return 4;
  return 1;
};

export const createBreakoutBlocks = (level: number): BreakoutBlock[] => {
  const rules = getBreakoutRules(level);
  const blocks: BreakoutBlock[] = [];
  for (let row = 0; row < rules.rows; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const kind = blockKindFor(level, row, col, rules);
      const hp = hpFor(kind, level);
      blocks.push({
        id: `${level}-${row}-${col}`,
        x: col * 12.5 + 0.5,
        y: 6 + row * 5.2,
        w: 11.2,
        h: 3.8,
        kind,
        hp,
        maxHp: hp,
        active: true,
        phase: (row * 0.7 + col * 0.45) % (Math.PI * 2),
        vx: rules.movingRows && row % 2 === 1 ? (row % 4 === 1 ? 4 : -4) : 0,
      });
    }
  }
  return blocks;
};

export const blockColor = (kind: BreakoutBlockKind) => ({
  SOFT: '#00f3ff',
  ARMORED: '#f3ff00',
  EXPLOSIVE: '#ff2bd6',
  SHIELD: '#7d5cff',
  CORRUPT: '#ff0055',
  CORE: '#ffffff',
}[kind]);
