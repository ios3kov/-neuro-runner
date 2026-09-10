import { describe, expect, it } from 'vitest';
import { GAME_CONFIGS } from '../data/gameConfig';
import { getAsteroidsRules } from '../engine/games/asteroids/asteroidsConfig';
import { getBreakoutRules } from '../engine/games/breakout/breakoutConfig';
import { getDefenderRules } from '../engine/games/defender/defenderConfig';
import { getDriftRules } from '../engine/games/drift/driftConfig';
import { getRunnerRules } from '../engine/games/runner/runnerConfig';
import { getVaporwareRules } from '../engine/games/vaporware/vaporwareConfig';

describe('campaign balance guardrails', () => {
  it('keeps all eight campaigns present with the expected level counts', () => {
    expect(GAME_CONFIGS.SNAKE.levels).toHaveLength(25);
    expect(GAME_CONFIGS.PONG.levels).toHaveLength(20);
    expect(GAME_CONFIGS.BREAKOUT.levels).toHaveLength(20);
    expect(GAME_CONFIGS.ASTEROIDS.levels).toHaveLength(20);
    expect(GAME_CONFIGS.DRIFT.levels).toHaveLength(20);
    expect(GAME_CONFIGS.DEFENDER.levels).toHaveLength(25);
    expect(GAME_CONFIGS.RUNNER.levels).toHaveLength(20);
    expect(GAME_CONFIGS.VAPORWARE.levels).toHaveLength(10);
  });

  it('keeps ASTEROIDS demanding without reaching unreadable speed', () => {
    const first = getAsteroidsRules(1);
    const final = getAsteroidsRules(20);
    expect(final.speedScale).toBeGreaterThan(first.speedScale);
    expect(final.speedScale).toBeLessThanOrEqual(2.25);
    expect(final.spawnEvery).toBeGreaterThanOrEqual(0.48);
    expect(final.lives).toBe(2);
  });

  it('keeps BREAKOUT paddle and ball within phone-friendly bounds', () => {
    const final = getBreakoutRules(20);
    expect(final.paddleWidth).toBeGreaterThanOrEqual(12);
    expect(final.ballSpeed).toBeLessThanOrEqual(138);
    expect(final.lives).toBe(2);
  });

  it('caps DEFENDER session length and enemy pressure', () => {
    const final = getDefenderRules(25);
    expect(final.duration).toBeLessThanOrEqual(120);
    expect(final.maxEnemies).toBeLessThanOrEqual(17);
    expect(final.spawnEvery).toBeGreaterThanOrEqual(0.42);
    expect(final.shieldArc).toBeGreaterThanOrEqual(0.58);
  });

  it('keeps DRIFT gates readable at maximum campaign speed', () => {
    const final = getDriftRules(20);
    expect(final.baseSpeed).toBeLessThanOrEqual(100);
    expect(final.gateWidth).toBeGreaterThanOrEqual(19);
    expect(final.spawnEvery).toBeGreaterThanOrEqual(0.55);
  });

  it('keeps AERO_RUN reaction spacing viable on touch devices', () => {
    const final = getRunnerRules(20);
    expect(final.maxSpeed).toBeLessThanOrEqual(21);
    expect(final.spacing).toBeGreaterThanOrEqual(24);
    expect(final.obstacleDensity).toBeLessThanOrEqual(0.74);
  });

  it('keeps VAPORWARE final reaction windows human-scale', () => {
    const final = getVaporwareRules(10);
    expect(final.promptWindow).toBeGreaterThanOrEqual(0.68);
    expect(final.promptEveryMin).toBeGreaterThanOrEqual(0.75);
    expect(final.lives).toBe(2);
  });

  it('keeps progression targets non-decreasing across every campaign', () => {
    for (const config of Object.values(GAME_CONFIGS)) {
      const targets = config.levels.map((level) => level.goals[0]?.target ?? 0);
      for (let i = 1; i < targets.length; i += 1) {
        expect(targets[i]).toBeGreaterThanOrEqual(targets[i - 1]);
      }
    }
  });
});
