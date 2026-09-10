export interface CanvasFxOptions {
  time: number;
  lowPowerMode: boolean;
  intensity?: number;
}

export const drawGlobalGameFx = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { time, lowPowerMode, intensity = 1 }: CanvasFxOptions,
): void => {
  ctx.save();

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.46,
    Math.min(width, height) * 0.18,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.68, `rgba(0,0,0,${0.08 * intensity})`);
  vignette.addColorStop(1, `rgba(0,0,0,${0.58 * intensity})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.11 * intensity;
  const topGlow = ctx.createLinearGradient(0, 0, width, height);
  topGlow.addColorStop(0, 'rgba(0,243,255,0.26)');
  topGlow.addColorStop(0.48, 'rgba(0,0,0,0)');
  topGlow.addColorStop(1, 'rgba(255,0,85,0.2)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.3 * intensity;
  ctx.strokeStyle = 'rgba(0,243,255,0.38)';
  ctx.lineWidth = 1;
  const bracket = Math.max(14, Math.min(width, height) * 0.04);
  const pad = Math.max(8, Math.min(width, height) * 0.022);
  const corners: Array<[number, number, number, number]> = [
    [pad, pad, 1, 1],
    [width - pad, pad, -1, 1],
    [pad, height - pad, 1, -1],
    [width - pad, height - pad, -1, -1],
  ];
  corners.forEach(([x, y, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x + sx * bracket, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * bracket);
    ctx.stroke();
  });

  if (!lowPowerMode) {
    ctx.globalAlpha = 0.035 * intensity;
    ctx.fillStyle = '#ffffff';
    const scanOffset = Math.floor((time * 34) % 4);
    for (let y = scanOffset; y < height; y += 4) ctx.fillRect(0, y, width, 1);

    ctx.globalAlpha = 0.055 * intensity;
    const bandY = ((time * 37) % (height + 80)) - 40;
    const band = ctx.createLinearGradient(0, bandY - 18, 0, bandY + 18);
    band.addColorStop(0, 'rgba(0,243,255,0)');
    band.addColorStop(0.5, 'rgba(0,243,255,0.5)');
    band.addColorStop(1, 'rgba(0,243,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY - 18, width, 36);

    ctx.globalAlpha = 0.055 * intensity;
    for (let i = 0; i < 11; i += 1) {
      const seed = i * 71 + Math.floor(time * 3);
      const x = (seed * 17 % 1000) / 1000 * width;
      const y = (seed * 43 % 1000) / 1000 * height;
      ctx.fillStyle = i % 3 === 0 ? '#ff0055' : '#00f3ff';
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
};
