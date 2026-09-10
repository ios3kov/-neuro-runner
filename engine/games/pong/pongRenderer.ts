import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import type { ArenaMode, Paddle, PongState } from './pongTypes';

export interface PongRenderOptions {
  lowPowerMode: boolean;
}

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

const drawArenaArchitecture = (
  ctx: CanvasRenderingContext2D,
  state: PongState,
  width: number,
  height: number,
  lowPowerMode: boolean,
): void => {
  const art = getArcadeArtProfile('PONG', state.level);
  const mode = state.mode;
  const horizon = height * 0.5;
  const pulse = 0.5 + Math.sin(state.elapsed * 2.2) * 0.5;

  const glass = ctx.createLinearGradient(0, 0, 0, height);
  glass.addColorStop(0, rgba('#ff0055', mode === 'CORE' ? 0.105 : 0.055));
  glass.addColorStop(0.45, 'rgba(0,0,0,0.02)');
  glass.addColorStop(0.55, rgba(art.primary, 0.025));
  glass.addColorStop(1, rgba('#00f3ff', mode === 'CORE' ? 0.12 : 0.06));
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = rgba(art.primary, 0.09);
  ctx.lineWidth = 1;
  const lane = Math.max(38, width * 0.075);
  for (let x = width * 0.5 % lane; x < width; x += lane) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += Math.max(32, height * 0.08)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.setLineDash([10, 14]);
  ctx.strokeStyle = rgba('#ffffff', 0.08);
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(width, horizon);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const railWidth = Math.max(2, width * 0.004);
  ctx.fillStyle = rgba('#ff0055', 0.25);
  ctx.fillRect(0, height * 0.035, width, railWidth);
  ctx.fillStyle = rgba('#00f3ff', 0.25);
  ctx.fillRect(0, height * 0.96, width, railWidth);

  if (mode === 'FIREWALL' || mode === 'CORE') {
    ctx.save();
    const stripe = Math.max(2, width * 0.004);
    ctx.fillStyle = rgba('#f59e0b', 0.06);
    for (let x = -height; x < width; x += width * 0.085) {
      ctx.save();
      ctx.translate(x, height * 0.44);
      ctx.rotate(-0.62);
      ctx.fillRect(0, 0, stripe, height * 0.18);
      ctx.restore();
    }
    ctx.restore();
  }

  if (mode === 'PULSE' || mode === 'CORE') {
    const bandY = height * 0.39;
    const bandH = height * 0.22;
    ctx.fillStyle = state.pulseActive ? rgba('#f59e0b', 0.11 + pulse * 0.055) : rgba('#00f3ff', 0.025);
    ctx.fillRect(0, bandY, width, bandH);
    ctx.strokeStyle = state.pulseActive ? rgba('#f59e0b', 0.5) : rgba('#00f3ff', 0.1);
    ctx.lineWidth = state.pulseActive ? 2 : 1;
    ctx.strokeRect(0, bandY, width, bandH);
    if (!lowPowerMode && state.pulseActive) {
      const scanX = ((state.elapsed * 220) % (width + 120)) - 60;
      const scan = ctx.createLinearGradient(scanX - 60, 0, scanX + 60, 0);
      scan.addColorStop(0, 'rgba(245,158,11,0)');
      scan.addColorStop(0.5, 'rgba(255,255,255,0.14)');
      scan.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.fillStyle = scan;
      ctx.fillRect(0, bandY, width, bandH);
    }
  }

  if (mode === 'WARP' || mode === 'CORE') {
    const top = height * 0.24;
    const portalH = height * 0.52;
    const portalW = Math.max(5, width * 0.012);
    for (const side of [0, 1]) {
      const x = side === 0 ? portalW * 0.5 : width - portalW * 0.5;
      ctx.save();
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = lowPowerMode ? 4 : 22;
      ctx.strokeStyle = rgba('#9f7aea', 0.85);
      ctx.lineWidth = portalW;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + portalH);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba('#00f3ff', 0.4);
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i += 1) {
        const yy = top + ((i / 5 + state.elapsed * 0.12) % 1) * portalH;
        ctx.beginPath();
        ctx.moveTo(side === 0 ? 0 : width - portalW * 2, yy);
        ctx.lineTo(side === 0 ? portalW * 2 : width, yy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  if (mode === 'NARROW') {
    ctx.save();
    ctx.strokeStyle = rgba('#00f3ff', 0.16);
    ctx.lineWidth = 1;
    const inset = width * 0.12;
    ctx.strokeRect(inset, height * 0.08, width - inset * 2, height * 0.84);
    ctx.fillStyle = rgba('#00f3ff', 0.025);
    ctx.fillRect(inset, height * 0.08, width - inset * 2, height * 0.84);
    ctx.restore();
  }

  if (mode === 'CORE') {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const minDim = Math.min(width, height);
    ctx.save();
    for (let i = 0; i < 4; i += 1) {
      const radius = minDim * (0.12 + i * 0.055);
      ctx.strokeStyle = rgba(i % 2 === 0 ? '#ffffff' : '#f59e0b', 0.07 + (3 - i) * 0.015);
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, state.elapsed * (0.16 + i * 0.035), Math.PI * 1.45 + state.elapsed * (0.16 + i * 0.035));
      ctx.stroke();
    }
    ctx.restore();
  }
};

const drawBarrier = (
  ctx: CanvasRenderingContext2D,
  state: PongState,
  barrier: PongState['barriers'][number],
  width: number,
  height: number,
  lowPowerMode: boolean,
): void => {
  const w = (value: number) => (value / 100) * width;
  const h = (value: number) => (value / 100) * height;
  const oscillation = Math.sin(state.elapsed * (0.8 + state.level * 0.025) + barrier.phase) * (state.level >= 13 ? 10 : 6);
  const x = w(barrier.x + oscillation);
  const y = h(barrier.y);
  const bw = w(barrier.w);
  const bh = Math.max(5, h(barrier.h));

  ctx.save();
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = lowPowerMode ? 3 : 15;
  const grad = ctx.createLinearGradient(x, y, x + bw, y);
  grad.addColorStop(0, 'rgba(245,158,11,0.14)');
  grad.addColorStop(0.18, 'rgba(245,158,11,0.88)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.96)');
  grad.addColorStop(0.82, 'rgba(245,158,11,0.88)');
  grad.addColorStop(1, 'rgba(245,158,11,0.14)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, bw, bh);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,220,140,0.7)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i += 1) {
    const xx = x + (bw * i) / 8;
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx, y + bh);
    ctx.stroke();
  }
  ctx.restore();
};

const drawPaddle = (
  ctx: CanvasRenderingContext2D,
  paddle: Paddle,
  yPct: number,
  color: string,
  width: number,
  height: number,
  lowPowerMode: boolean,
): void => {
  const w = (value: number) => (value / 100) * width;
  const h = (value: number) => (value / 100) * height;
  const x = w(paddle.x);
  const y = h(yPct);
  const pw = w(paddle.w);
  const ph = Math.max(7, h(1.35));

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = lowPowerMode ? 4 : 18;
  const grad = ctx.createLinearGradient(x, y, x, y + ph);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.22, color);
  grad.addColorStop(1, rgba(color, 0.46));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, pw, ph);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x + pw * 0.08, y + ph * 0.35, pw * 0.84, Math.max(1, ph * 0.22));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + pw * 0.22, y + ph * 0.08, pw * 0.56, Math.max(1, ph * 0.13));
  ctx.strokeStyle = rgba(color, 0.7);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 2, y - 2, pw + 4, ph + 4);
  ctx.restore();
};

const drawBallAndTrail = (
  ctx: CanvasRenderingContext2D,
  state: PongState,
  width: number,
  height: number,
  lowPowerMode: boolean,
): void => {
  const w = (value: number) => (value / 100) * width;
  const h = (value: number) => (value / 100) * height;
  const minDim = Math.min(width, height);

  const trailStart = lowPowerMode ? Math.max(0, state.trails.length - 7) : 0;
  state.trails.slice(trailStart).forEach((trail, index, arr) => {
    const t = (index + 1) / Math.max(1, arr.length);
    const color = state.pulseActive ? '#f59e0b' : index % 2 === 0 ? '#00f3ff' : '#ffffff';
    ctx.fillStyle = rgba(color, trail.alpha * 0.28 * t);
    const radius = Math.max(1.5, minDim * 0.006 * t);
    ctx.beginPath();
    ctx.arc(w(trail.x), h(trail.y), radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const bx = w(state.ball.x);
  const by = h(state.ball.y);
  const radius = Math.max(4, minDim * state.ball.size * 0.0082);
  const color = state.pulseActive ? '#f59e0b' : '#ffffff';

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = lowPowerMode ? 5 : 24;
  const glow = ctx.createRadialGradient(bx - radius * 0.3, by - radius * 0.3, radius * 0.1, bx, by, radius);
  glow.addColorStop(0, '#ffffff');
  glow.addColorStop(0.38, color);
  glow.addColorStop(1, rgba(color, 0.18));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(bx, by, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba('#ffffff', 0.65);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bx, by, radius * 1.7, state.elapsed * 2.2, state.elapsed * 2.2 + Math.PI * 0.95);
  ctx.stroke();
  ctx.restore();
};

const modeLabel: Record<ArenaMode, string> = {
  CLASSIC: 'CLASSIC DUEL',
  FIREWALL: 'FIREWALL CIRCUIT',
  PULSE: 'PULSE REACTOR',
  WARP: 'WARP CORRIDOR',
  NARROW: 'PRECISION ARENA',
  CORE: 'CORE DUEL',
};

export const drawPongScene = (
  ctx: CanvasRenderingContext2D,
  state: PongState,
  width: number,
  height: number,
  { lowPowerMode }: PongRenderOptions,
): void => {
  drawArenaArchitecture(ctx, state, width, height, lowPowerMode);
  state.barriers.forEach((barrier) => drawBarrier(ctx, state, barrier, width, height, lowPowerMode));
  drawPaddle(ctx, state.p2, 4.2, '#ff0055', width, height, lowPowerMode);
  drawPaddle(ctx, state.p1, 94.5, '#00f3ff', width, height, lowPowerMode);
  drawBallAndTrail(ctx, state, width, height, lowPowerMode);

  const fontLarge = Math.max(22, Math.floor(Math.min(width, height) * 0.075));
  ctx.font = `900 ${fontLarge}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,0,85,0.17)';
  ctx.fillText(String(state.p2.score), width * 0.16, height * 0.25);
  ctx.fillStyle = 'rgba(0,243,255,0.19)';
  ctx.fillText(String(state.p1.score), width * 0.16, height * 0.81);

  const fontSmall = Math.max(9, Math.floor(Math.min(width, height) * 0.021));
  ctx.font = `bold ${fontSmall}px monospace`;
  ctx.fillStyle = 'rgba(0,243,255,0.68)';
  ctx.textAlign = 'left';
  ctx.fillText(`RALLY ${state.rally}`, 14, height - 46);
  ctx.fillText(`COMBO x${Math.max(1, state.combo)}`, 14, height - 28);

  ctx.textAlign = 'right';
  ctx.fillStyle = state.mode === 'CORE' ? '#f59e0b' : 'rgba(255,255,255,0.5)';
  ctx.fillText(`${modeLabel[state.mode]} // FIRST TO ${state.targetScore}`, width - 14, 24);

  if (state.pulseActive) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = lowPowerMode ? 0 : 12;
    ctx.fillText('PULSE OVERDRIVE', width * 0.5, height * 0.5 - 14);
    ctx.shadowBlur = 0;
  }
};
