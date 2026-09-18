import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('NEURO RUNNER input method', () => {
  it('keeps mobile text flows free of native input controls', () => {
    for (const path of ['components/login/LoginPanel.tsx','components/modals/AuthModal.tsx','components/AiChat.tsx']) {
      const source = read(path);
      expect(source).not.toMatch(/<input\b/i);
      expect(source).not.toMatch(/<textarea\b/i);
      expect(source).toMatch(/role="textbox"/);
    }
  });

  it('ships the built-in OS keyboard and physical keyboard listener', () => {
    const source = read('components/VirtualKeyboard.tsx');
    expect(source).toContain('SECURE_INPUT_METHOD');
    expect(source).toContain("window.addEventListener('keydown'");
    expect(source).toContain("navigator.maxTouchPoints");
    expect(source).toContain("(pointer: coarse)");
  });
});
