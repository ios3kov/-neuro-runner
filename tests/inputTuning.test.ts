import { describe, expect, it } from 'vitest';
import { getInputTuning } from '../engine/core/inputTuning';

describe('cross-device input tuning', () => {
  it('keeps phone gestures responsive', () => {
    const tuning = getInputTuning(390, 844);
    expect(tuning.swipeThreshold).toBeGreaterThanOrEqual(20);
    expect(tuning.swipeThreshold).toBeLessThanOrEqual(30);
    expect(tuning.edgeMargin).toBeGreaterThanOrEqual(16);
  });

  it('requires a little more movement on tablets', () => {
    const phone = getInputTuning(390, 844);
    const tablet = getInputTuning(1024, 1366);
    expect(tablet.swipeThreshold).toBeGreaterThan(phone.swipeThreshold);
    expect(tablet.tapThreshold).toBeGreaterThan(phone.tapThreshold);
  });

  it('caps tuning for very large displays', () => {
    const tuning = getInputTuning(2048, 2732);
    expect(tuning.swipeThreshold).toBeLessThanOrEqual(38);
    expect(tuning.edgeMargin).toBeLessThanOrEqual(30);
    expect(tuning.tapThreshold).toBeLessThanOrEqual(20);
  });
});
