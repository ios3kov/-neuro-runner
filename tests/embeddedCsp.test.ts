import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('embedded CAT TERRITORY CSP', () => {
  it('allows the CAT TERRITORY origin as a frame source', () => {
    const headers = readFileSync('public/_headers','utf8');
    expect(headers).toContain("frame-src https://meow.neurospace.tech;");
  });
});
