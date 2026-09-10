import { describe, expect, it } from 'vitest';
import { sanitizeGameProgress, sanitizeLevelProgress } from '../utils/progress';

describe('game progress migration', () => {
  it('sanitizes corrupted level values', () => {
    expect(sanitizeLevelProgress({ state: 'PERFECT', bestScore: '120', bestTimeMs: -4, timesPlayed: 2.9 }, false)).toEqual({
      state: 'PERFECT',
      bestScore: 120,
      bestTimeMs: 0,
      timesPlayed: 2,
    });
  });

  it('always unlocks the first configured level', () => {
    const progress = sanitizeGameProgress('SNAKE', { levels: {}, unlockedLevels: ['INVALID'] });
    expect(progress.unlockedLevels[0]).toBe('SNAKE_1');
    expect(progress.levels.SNAKE_1.state).toBe('UNLOCKED');
  });
});
