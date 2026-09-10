import { getArcadeArtProfile } from './gameArtDirection';

export interface CanvasFxOptions {
  time: number;
  lowPowerMode: boolean;
  intensity?: number;
  gameId?: string;
  level?: number;
}

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

export const drawGlobalGameBackdrop = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { time, lowPowerMode, intensity = 1, gameId = 'UNKNOWN', level = 1 }: CanvasFxOptions,
): void => {
  const art = getArcadeArtProfile(gameId, level);
  const quality = lowPowerMode ? 0.55 : 1;
  const minDim = Math.min(width, height);

  ctx.save();

  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#020307');
  base.addColorStop(0.48, hexToRgba(art.secondary, 0.12 * intensity));
  base.addColorStop(1, '#010102');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const horizon = height * (0.4 + Math.sin(time * 0.12) * 0.015);
  const perspectiveAlpha = art.gridAlpha * quality * intensity;
  ctx.strokeStyle = hexToRgba(art.primary, perspectiveAlpha);
  ctx.lineWidth = 1;
  const spacing = Math.max(34, minDim * 0.075);

  ctx.beginPath();
  for (let y = horizon; y < height + spacing; y += spacing) {
    const t = Math.max(0, (y - horizon) / Math.max(1, height - horizon));
    const yy = horizon + t * t * (height - horizon);
    ctx.moveTo(0, yy);
    ctx.lineTo(width, yy);
  }
  for (let x = -width; x <= width * 2; x += spacing) {
    ctx.moveTo(width * 0.5, horizon);
    ctx.lineTo(x, height);
  }
  ctx.stroke();

  const frameInset = Math.max(12, minDim * 0.025);
  ctx.strokeStyle = hexToRgba(art.primary, 0.18 * intensity);
  ctx.lineWidth = 1;
  ctx.strokeRect(frameInset, frameInset, width - frameInset * 2, height - frameInset * 2);

  if (!lowPowerMode) {
    const layers = 3;
    for (let layer = 0; layer < layers; layer += 1) {
      const speed = 4 + layer * 3;
      const alpha = (0.025 + layer * 0.012) * art.particleDensity * intensity;
      ctx.fillStyle = hexToRgba(layer === 2 ? art.accent : art.primary, alpha);
      const count = Math.floor((8 + layer * 5) * art.particleDensity);
      for (let i = 0; i < count; i += 1) {
        const seed = i * 137 + layer * 59;
        const x = ((seed * 17 + time * speed * 13) % 997) / 997 * width;
        const y = ((seed * 47 + time * speed * 7) % 991) / 991 * height;
        const size = layer === 2 ? 1.8 : 1;
        ctx.fillRect(x, y, size, size);
      }
    }

    if (art.biome === 'ROOT_CORE' || art.biome === 'OVERCLOCK_RING' || art.biome === 'REACTOR') {
      const cx = width * 0.5;
      const cy = height * 0.52;
      for (let i = 0; i < 3; i += 1) {
        const radius = minDim * (0.13 + i * 0.065) + Math.sin(time * (1.2 + i * 0.2)) * 4;
        ctx.strokeStyle = hexToRgba(i === 1 ? art.accent : art.primary, (0.07 - i * 0.012) * intensity);
        ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, time * 0.08 * (i + 1), Math.PI * 1.55 + time * 0.08 * (i + 1));
        ctx.stroke();
      }
    }
  }

  const haze = ctx.createRadialGradient(width * 0.5, height * 0.48, minDim * 0.05, width * 0.5, height * 0.52, minDim * 0.62);
  haze.addColorStop(0, hexToRgba(art.primary, art.hazeAlpha * 0.65 * intensity));
  haze.addColorStop(0.55, hexToRgba(art.secondary, art.hazeAlpha * 0.28 * intensity));
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
};

export const drawGlobalGameFx = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { time, lowPowerMode, intensity = 1, gameId = 'UNKNOWN', level = 1 }: CanvasFxOptions,
): void => {
  const art = getArcadeArtProfile(gameId, level);
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
  vignette.addColorStop(0.68, `rgba(0,0,0,${0.07 * intensity})`);
  vignette.addColorStop(1, `rgba(0,0,0,${0.58 * intensity})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.12 * intensity;
  const topGlow = ctx.createLinearGradient(0, 0, width, height);
  topGlow.addColorStop(0, hexToRgba(art.primary, 0.34));
  topGlow.addColorStop(0.5, 'rgba(0,0,0,0)');
  topGlow.addColorStop(1, hexToRgba(art.secondary, 0.24));
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.34 * intensity;
  ctx.strokeStyle = hexToRgba(art.primary, 0.52);
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

  ctx.globalAlpha = 0.35 * intensity;
  ctx.font = `bold ${Math.max(8, Math.floor(Math.min(width, height) * 0.015))}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = art.accent;
  ctx.fillText(`${art.label} // NODE ${String(Math.max(1, level)).padStart(2, '0')}`, pad + 4, height - pad - 5);

  if (!lowPowerMode) {
    ctx.globalAlpha = 0.03 * intensity;
    ctx.fillStyle = '#ffffff';
    const scanOffset = Math.floor((time * 34) % 4);
    for (let y = scanOffset; y < height; y += 4) ctx.fillRect(0, y, width, 1);

    ctx.globalAlpha = 0.07 * intensity;
    const bandY = ((time * 37 * art.motion) % (height + 90)) - 45;
    const band = ctx.createLinearGradient(0, bandY - 20, 0, bandY + 20);
    band.addColorStop(0, hexToRgba(art.primary, 0));
    band.addColorStop(0.5, hexToRgba(art.primary, 0.62));
    band.addColorStop(1, hexToRgba(art.primary, 0));
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY - 20, width, 40);

    ctx.globalAlpha = 0.06 * intensity;
    for (let i = 0; i < Math.floor(12 * art.particleDensity); i += 1) {
      const seed = i * 71 + Math.floor(time * 3);
      const x = (seed * 17 % 1000) / 1000 * width;
      const y = (seed * 43 % 1000) / 1000 * height;
      ctx.fillStyle = i % 4 === 0 ? art.secondary : art.primary;
      ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
};
