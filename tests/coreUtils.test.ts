import { describe, expect, it } from 'vitest';
import { normalizeExpanded, normalizePath, safeCounter } from '../state/coreUtils';

describe('core store utilities', () => {
  it('normalizes unsafe navigation paths', () => {
    expect(normalizePath(['root', 'games', 'games', '../bad', 'snake'])).toEqual(['root', 'games', 'snake']);
  });

  it('keeps root expanded and removes invalid ids', () => {
    expect(normalizeExpanded(['games', 'bad id', 'games'])).toEqual(['games', 'root']);
  });

  it('sanitizes counters', () => {
    expect(safeCounter(4.9)).toBe(4);
    expect(safeCounter(-1)).toBe(0);
    expect(safeCounter(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
