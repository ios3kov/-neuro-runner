import type { RunnerLane, RunnerLevelRules, RunnerObject, RunnerObjectType } from './runnerTypes';

export const getRunnerRules = (level: number): RunnerLevelRules => ({
  level,
  distance: 520 + level * 32,
  baseSpeed: 9.2 + level * 0.22,
  maxSpeed: 14.5 + level * 0.42,
  acceleration: 0.45 + level * 0.018,
  spacing: Math.max(22, 38 - level * 0.65),
  boostChance: level >= 5 ? Math.min(0.18, 0.05 + (level - 5) * 0.01) : 0,
  glitchChance: level >= 9 ? Math.min(0.16, 0.04 + (level - 9) * 0.012) : 0,
  obstacleDensity: Math.min(0.82, 0.45 + level * 0.018),
});

const laneFor = (seed: number): RunnerLane => ([-1, 0, 1] as const)[Math.abs(seed) % 3];
const obstacleFor = (level: number, index: number): RunnerObjectType => {
  const r = (level * 19 + index * 31) % 100;
  if (level >= 9 && r < getRunnerRules(level).glitchChance * 100) return 'GLITCH';
  if (level >= 5 && r < (getRunnerRules(level).glitchChance + getRunnerRules(level).boostChance) * 100) return 'BOOST';
  return (['WALL', 'BEAM', 'GATE'] as const)[(level + index) % 3];
};

export const buildRunnerTrack = (level: number): RunnerObject[] => {
  const rules = getRunnerRules(level);
  const objects: RunnerObject[] = [];
  let z = 24;
  let id = level * 10000;
  let index = 0;

  while (z < rules.distance - 40) {
    const lane = laneFor(level * 7 + index * 5);
    const roll = ((level * 13 + index * 29) % 100) / 100;
    const type: RunnerObjectType = roll < rules.obstacleDensity ? obstacleFor(level, index) : 'COIN';
    objects.push({ id: id++, z, lane, type, collected: false, yOffset: type === 'COIN' && index % 5 === 0 ? 1.7 : 0 });

    if (type !== 'COIN' && index % 3 === 0) {
      const safeLane = lane === 0 ? (index % 2 ? -1 : 1) : 0;
      objects.push({ id: id++, z: z + 7, lane: safeLane as RunnerLane, type: 'COIN', collected: false, yOffset: 0 });
      objects.push({ id: id++, z: z + 13, lane: safeLane as RunnerLane, type: 'COIN', collected: false, yOffset: type === 'BEAM' ? 1.6 : 0 });
    }

    if (level >= 13 && index % 7 === 0) {
      const blocked = lane === -1 ? 1 : -1;
      objects.push({ id: id++, z: z + 1.2, lane: blocked as RunnerLane, type: 'WALL', collected: false, yOffset: 0 });
    }

    z += rules.spacing + ((index * 11 + level * 3) % 9);
    index += 1;
  }

  objects.push({ id: id++, z: rules.distance, lane: 0, type: 'FINISH', collected: false, yOffset: 0 });
  return objects;
};

export const runnerObjectColor = (type: RunnerObjectType) => ({
  WALL: '#ff0055',
  BEAM: '#ff7a00',
  GATE: '#7d5cff',
  COIN: '#f3ff00',
  BOOST: '#00ff88',
  GLITCH: '#ff2bd6',
  FINISH: '#ffffff',
}[type]);
