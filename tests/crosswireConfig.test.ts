import { describe, expect, it } from 'vitest';
import { buildCrosswireLanes, getCrosswireGoalCenters, getCrosswireRules } from '../engine/games/crosswire/crosswireConfig';

describe('CROSSWIRE campaign', () => {
  it('keeps all 20 levels playable and increasingly demanding', () => {
    const first = getCrosswireRules(1);
    const last = getCrosswireRules(20);
    expect(first.level).toBe(1);
    expect(last.level).toBe(20);
    expect(last.roadSpeed).toBeGreaterThan(first.roadSpeed);
    expect(last.streamSpeed).toBeGreaterThan(first.streamSpeed);
    expect(last.timeLimit).toBeLessThan(first.timeLimit);
    expect(last.targetSlots).toBe(5);
  });

  it('builds a complete Frogger-style crossing layout for every level', () => {
    for (let level = 1; level <= 20; level += 1) {
      const lanes = buildCrosswireLanes(level);
      expect(lanes).toHaveLength(12);
      expect(lanes[0].type).toBe('GOAL');
      expect(lanes[11].type).toBe('START');
      expect(lanes.filter((lane) => lane.type === 'ROAD').length).toBe(5);
      expect(lanes.filter((lane) => lane.type === 'STREAM').length).toBe(3);
      expect(lanes.filter((lane) => lane.type === 'SAFE').length).toBe(2);
      expect(lanes.filter((lane) => lane.type === 'ROAD' || lane.type === 'STREAM').every((lane) => lane.entities.length >= 3)).toBe(true);
      expect(getCrosswireGoalCenters(level)).toHaveLength(getCrosswireRules(level).targetSlots);
    }
  });

  it('covers all five visual chapters', () => {
    const chapters = new Set(Array.from({ length: 20 }, (_, i) => getCrosswireRules(i + 1).chapter));
    expect(chapters).toEqual(new Set(['ACCESS', 'TRAFFIC', 'STREAM', 'BLACKOUT', 'CORE']));
  });
});
