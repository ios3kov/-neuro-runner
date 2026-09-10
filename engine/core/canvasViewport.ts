export interface CanvasViewport {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export const syncCanvasViewport = (
  canvas: HTMLCanvasElement,
  maxDpr = 2,
): CanvasViewport | null => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const rawDpr = typeof window === 'undefined' ? 1 : (window.devicePixelRatio || 1);
  const dpr = Math.max(1, Math.min(maxDpr, rawDpr));
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Render in CSS-pixel coordinates while keeping a high-resolution backing store.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, dpr };
};
