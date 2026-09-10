export interface InputTuning {
  edgeMargin: number;
  swipeThreshold: number;
  tapThreshold: number;
  deltaMultiplier: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Keeps gesture feel consistent across small phones, large phones and tablets.
 * Coordinates are CSS pixels because touch input is derived from getBoundingClientRect().
 */
export const getInputTuning = (width: number, height: number): InputTuning => {
  const shortSide = Math.max(1, Math.min(width, height));
  const scale = clamp(shortSide / 390, 0.82, 1.45);

  return {
    edgeMargin: Math.round(clamp(18 * scale, 16, 30)),
    swipeThreshold: Math.round(clamp(24 * scale, 20, 38)),
    tapThreshold: Math.round(clamp(13 * scale, 11, 20)),
    deltaMultiplier: clamp(200 / shortSide, 0.34, 0.62),
  };
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
};
