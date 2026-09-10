import { describe, expect, it } from 'vitest';
import { getArcadeArtProfile } from '../engine/visuals/gameArtDirection';

describe('arcade technical art direction', () => {
  it('gives SERPENT distinct campaign biomes', () => {
    expect(getArcadeArtProfile('SNAKE', 1).biome).toBe('TRAINING_GRID');
    expect(getArcadeArtProfile('SNAKE', 4).biome).toBe('FIREWALL_SECTOR');
    expect(getArcadeArtProfile('SNAKE', 7).biome).toBe('MALWARE_ZONE');
    expect(getArcadeArtProfile('SNAKE', 10).biome).toBe('VPN_TUNNEL');
    expect(getArcadeArtProfile('SNAKE', 13).biome).toBe('COMPRESSION_CHAMBER');
    expect(getArcadeArtProfile('SNAKE', 16).biome).toBe('TWO_FA_VAULT');
    expect(getArcadeArtProfile('SNAKE', 19).biome).toBe('OVERCLOCK_RING');
    expect(getArcadeArtProfile('SNAKE', 25).biome).toBe('ROOT_CORE');
  });

  it('assigns every shipped game a deliberate art profile', () => {
    const ids = ['SNAKE', 'PONG', 'BREAKOUT', 'ASTEROIDS', 'DRIFT', 'DEFENDER', 'RUNNER', 'VAPORWARE'];
    for (const id of ids) {
      const art = getArcadeArtProfile(id, 20);
      expect(art.primary).toMatch(/^#/);
      expect(art.secondary).toMatch(/^#/);
      expect(art.label.length).toBeGreaterThan(3);
      expect(art.particleDensity).toBeGreaterThan(0);
      expect(art.motion).toBeGreaterThan(0);
    }
  });
});
