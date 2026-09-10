import { describe, expect, it } from 'vitest';
import { buildSnakeArena } from '../engine/games/snake/snakeLevelBuilder';
import { getSnakeProfile, snakeLevelTarget } from '../engine/games/snake/snakeConfig';
import { SNAKE_MAX_LEVEL } from '../engine/games/snake/snakeTypes';
import {
  buildPongBarriers,
  createPongState,
  pongModeForLevel,
  pongPaddleWidthForLevel,
  pongTargetForLevel,
} from '../engine/games/pong/pongConfig';

describe('SERPENT domain configuration', () => {
  it('keeps progression bounded and reaches the core theme', () => {
    expect(getSnakeProfile(1).theme).toBe('TRAINING');
    expect(getSnakeProfile(4).theme).toBe('FIREWALL');
    expect(getSnakeProfile(10).theme).toBe('VPN');
    expect(getSnakeProfile(16).theme).toBe('TWO_FA');
    expect(getSnakeProfile(SNAKE_MAX_LEVEL).theme).toBe('CORE');
    expect(snakeLevelTarget(1)).toBe(8);
    expect(snakeLevelTarget(SNAKE_MAX_LEVEL)).toBeLessThanOrEqual(15);
  });

  it('keeps the initial spawn corridor free of lethal walls and gates', () => {
    for (let level = 1; level <= SNAKE_MAX_LEVEL; level += 1) {
      const arena = buildSnakeArena(level);
      expect(arena.walls.some((point) => point.y === 10 && point.x >= 7 && point.x <= 13)).toBe(false);
      expect(arena.gates.some((point) => point.y === 10 && point.x >= 7 && point.x <= 13)).toBe(false);
    }
  });
});

describe('PONG domain configuration', () => {
  it('progresses through arena modes deterministically', () => {
    expect(pongModeForLevel(1)).toBe('CLASSIC');
    expect(pongModeForLevel(4)).toBe('FIREWALL');
    expect(pongModeForLevel(7)).toBe('PULSE');
    expect(pongModeForLevel(10)).toBe('WARP');
    expect(pongModeForLevel(16)).toBe('NARROW');
    expect(pongModeForLevel(20)).toBe('CORE');
  });

  it('keeps target score, paddle width and barriers coherent', () => {
    expect(pongTargetForLevel(1)).toBe(3);
    expect(pongTargetForLevel(20)).toBe(6);
    expect(pongPaddleWidthForLevel(1)).toBeGreaterThan(pongPaddleWidthForLevel(20));
    expect(buildPongBarriers(1)).toHaveLength(0);
    expect(buildPongBarriers(4).length).toBeGreaterThan(0);
    expect(buildPongBarriers(20).length).toBeGreaterThan(0);
    const state = createPongState(20);
    expect(state.level).toBe(20);
    expect(state.mode).toBe('CORE');
    expect(state.targetScore).toBe(pongTargetForLevel(20));
  });
});
