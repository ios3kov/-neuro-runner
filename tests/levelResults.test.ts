import { describe, expect, it } from 'vitest';
import { buildCompletedLevelResult } from '../engine/core/levelResults';
import type { LevelSpec } from '../types';

const spec: LevelSpec = {
  levelId: 'TEST_1',
  index: 1,
  name: 'TEST',
  description: 'TEST',
  difficulty: 'EASY',
  goals: [
    { id: 'score', type: 'score_at_least', required: true, target: 100, label: 'Score' },
    { id: 'items', type: 'collect_items', required: true, target: 3, label: 'Items' },
  ],
};

describe('level results', () => {
  it('evaluates goals and clamps negative durations', () => {
    const result = buildCompletedLevelResult({
      gameId: 'TEST',
      levelId: 'TEST_1',
      levelSpec: spec,
      score: 120,
      metrics: { itemsCollected: 2 },
      startedAt: 200,
      completedAt: 100,
    });
    expect(result.durationMs).toBe(0);
    expect(result.goalsCompleted).toEqual({ score: true, items: false });
  });
});
