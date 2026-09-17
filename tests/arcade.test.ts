import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fileSystemData, findNodeById, getIcon } from '../data/fileSystem';
import type { FileNode } from '../types';

const flatten = (node: FileNode): FileNode[] => [
  node,
  ...(node.children ?? []).flatMap(flatten),
];

describe('single-game arcade', () => {
  it('offers only CAT TERRITORY at the requested external address', () => {
    const arcade = findNodeById('arcade', fileSystemData);
    expect(arcade?.children).toHaveLength(1);
    expect(arcade?.children?.[0]).toMatchObject({
      id: 'cat_territory',
      name: 'CAT_TERRITORY.EXE',
      type: 'EXE',
      externalUrl: 'https://meow.neurospace.tech',
    });
    expect(arcade?.children?.[0].gameId).toBeUndefined();
  });

  it('keeps only settings and OMNI as internal executables', () => {
    const internalIds = flatten(fileSystemData)
      .filter(node => node.gameId)
      .map(node => node.gameId)
      .sort();
    expect(internalIds).toEqual(['AI_CHAT', 'SETTINGS']);
  });

  it('gives the game a cat icon', () => {
    const game = findNodeById('cat_territory', fileSystemData);
    expect(game).not.toBeNull();
    expect(getIcon(game!)).toBe('🐱');
  });

  it('removes the old bundled games, rather than only hiding their menu entries', () => {
    expect(existsSync(new URL('../engine/games', import.meta.url))).toBe(false);
  });
});
