import { describe, expect, it } from 'vitest';
import { fileSystemData } from '../data/fileSystem';
import { findNodePath } from '../utils/filePath';
describe('absolute file paths', () => {
  it('resolves a sibling independently of the current folder', () => {
    expect(findNodePath('sys',fileSystemData)).toEqual(['root','sys']);
    expect(findNodePath('cat_territory',fileSystemData)).toEqual(['root','arcade','cat_territory']);
  });
  it('handles root and unknown entries', () => {
    expect(findNodePath('root',fileSystemData)).toEqual(['root']);
    expect(findNodePath('missing',fileSystemData)).toBeNull();
  });
});
