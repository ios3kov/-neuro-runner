import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('CAT TERRITORY embedded UX', () => {
  it('keeps the game inside Neuro Runner with an explicit close action', () => {
    const fileSystem = readFileSync('components/FileSystem.tsx','utf8');
    const frame = readFileSync('components/EmbeddedGame.tsx','utf8');
    expect(fileSystem).toContain('setEmbeddedGame({ title: node.name, url })');
    expect(fileSystem).not.toContain('window.location.assign(url)');
    expect(frame).toContain('<iframe');
    expect(frame).toContain('✕ CLOSE');
    expect(frame).toContain('onClose');
  });
});
