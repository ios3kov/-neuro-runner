import type { CrosswireLane, CrosswireRules } from './crosswireTypes';

const goalCentersFor = (count: number) => {
  if (count <= 3) return [20, 50, 80];
  if (count === 4) return [14, 38, 62, 86];
  return [10, 30, 50, 70, 90];
};

export const getCrosswireRules = (level: number): CrosswireRules => {
  const l = Math.max(1, Math.min(20, Math.floor(level || 1)));
  const chapter = l <= 4 ? 'ACCESS' : l <= 8 ? 'TRAFFIC' : l <= 12 ? 'STREAM' : l <= 16 ? 'BLACKOUT' : 'CORE';
  return {
    level: l,
    chapter,
    lives: l <= 5 ? 4 : 3,
    targetSlots: l <= 6 ? 3 : l <= 13 ? 4 : 5,
    timeLimit: Math.max(22, 35 - l * 0.55),
    roadSpeed: 10.5 + l * 0.72,
    streamSpeed: 7.5 + l * 0.48,
    entityCount: Math.min(6, 3 + Math.floor((l - 1) / 4)),
    hazardWidth: Math.max(7.5, 11.5 - l * 0.12),
    platformWidth: Math.max(16, 23 - l * 0.2),
  };
};

export const getCrosswireGoalCenters = (level: number) => goalCentersFor(getCrosswireRules(level).targetSlots);

const wrap = (x: number) => ((x % 112) + 112) % 112 - 6;

export const buildCrosswireLanes = (level: number): CrosswireLane[] => {
  const rules = getCrosswireRules(level);
  const layout: CrosswireLane['type'][] = [
    'GOAL', 'STREAM', 'STREAM', 'STREAM', 'SAFE', 'ROAD', 'ROAD', 'ROAD', 'SAFE', 'ROAD', 'ROAD', 'START',
  ];

  return layout.map((type, row) => {
    const direction: -1 | 1 = row % 2 === 0 ? 1 : -1;
    const baseSpeed = type === 'STREAM' ? rules.streamSpeed : type === 'ROAD' ? rules.roadSpeed : 0;
    const speed = baseSpeed * (1 + ((row * 17 + rules.level * 11) % 7) * 0.045);
    const count = type === 'ROAD' || type === 'STREAM' ? rules.entityCount : 0;
    const entities = Array.from({ length: count }, (_, index) => {
      const stream = type === 'STREAM';
      const width = stream
        ? rules.platformWidth + ((index + row) % 2) * 4
        : rules.hazardWidth + ((index + row) % 3) * 2.2;
      const x = wrap(8 + index * (100 / Math.max(1, count)) + ((row * 19 + rules.level * 13) % 21));
      const kinds: CrosswireLane['entities'][number]['kind'][] = stream
        ? ['BARGE', 'RELAY']
        : ['PACKET', 'BUS', 'GLITCH'];
      return {
        id: row * 100 + index,
        x,
        width,
        speed: speed * direction,
        kind: kinds[(index + row + rules.level) % kinds.length],
      };
    });
    return { row, type, direction, speed, entities };
  });
};

export const crosswireChapterLabel = (level: number) => {
  const chapter = getCrosswireRules(level).chapter;
  return {
    ACCESS: 'ACCESS SPINE',
    TRAFFIC: 'PACKET HIGHWAY',
    STREAM: 'QUANTUM STREAM',
    BLACKOUT: 'DARK ROUTE',
    CORE: 'ROOT CROSSING',
  }[chapter];
};
