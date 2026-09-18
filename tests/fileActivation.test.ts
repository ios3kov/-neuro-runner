import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fileSystemData, findNodeById } from '../data/fileSystem';
import { activateFileNode } from '../utils/fileActivation';
import type { FileNode } from '../types';

const actions = {
  navigateDown: vi.fn(),
  startGame: vi.fn(),
  openFile: vi.fn(),
  openEmbeddedUrl: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

const activate = (id: string) => {
  const node = findNodeById(id, fileSystemData);
  expect(node).not.toBeNull();
  activateFileNode(node!, actions);
};

const expectOnly = (key: keyof typeof actions, value: string) => {
  for (const [name, callback] of Object.entries(actions)) {
    if (name === key) {
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(value);
    } else {
      expect(callback).not.toHaveBeenCalled();
    }
  }
};

describe('file activation', () => {
  it('mounts CAT TERRITORY inside the Neuro Runner shell', () => {
    activate('cat_territory');
    expectOnly('openEmbeddedUrl', 'https://meow.neurospace.tech');
  });

  it('still opens folders', () => {
    activate('arcade');
    expectOnly('navigateDown', 'arcade');
  });

  it.each([['omni', 'AI_CHAT'], ['config', 'SETTINGS']])('still runs the %s internal tool', (id, tool) => {
    activate(id);
    expectOnly('startGame', tool);
  });

  it('still opens text documents', () => {
    activate('copyright');
    expectOnly('openFile', 'copyright');
  });

  it('prioritizes embedded game launch over a stale internal game id', () => {
    const node: FileNode = {
      id: 'cat_territory', name: 'CAT_TERRITORY.EXE', type: 'EXE',
      externalUrl: 'https://meow.neurospace.tech', gameId: 'AI_CHAT',
    };
    activateFileNode(node, actions);
    expectOnly('openEmbeddedUrl', 'https://meow.neurospace.tech');
  });

  it('never treats a folder as an external game', () => {
    const node: FileNode = {
      id: 'arcade', name: 'ARCADE', type: 'FOLDER',
      externalUrl: 'https://meow.neurospace.tech',
    };
    activateFileNode(node, actions);
    expectOnly('navigateDown', 'arcade');
  });
});
