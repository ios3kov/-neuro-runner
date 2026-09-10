import type { CrosswireLane, CrosswireState } from './crosswireTypes';
import { crosswireChapterLabel, getCrosswireRules } from './crosswireConfig';

const COLORS = {
  bg: '#02040a',
  panel: '#071019',
  cyan: '#00f3ff',
  cyanSoft: 'rgba(0,243,255,0.18)',
  cyanFaint: 'rgba(0,243,255,0.07)',
  magenta: '#ff0055',
  yellow: '#f3ff00',
  orange: '#ff8a00',
  violet: '#9b6cff',
  blue: '#2e7dff',
  white: '#ecfeff',
  dark: '#02050a',
};

const rowY = (row: number, height: number) => (row / 11) * height;
const rowH = (height: number) => height / 11;

const chapterAccent = (level: number) => {
  const chapter = getCrosswireRules(level).chapter;
  if (chapter === 'TRAFFIC') return COLORS.orange;
  if (chapter === 'STREAM') return COLORS.violet;
  if (chapter === 'BLACKOUT') return COLORS.magenta;
  if (chapter === 'CORE') return COLORS.yellow;
  return COLORS.cyan;
};

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawHorizon = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrosswireState,
  lowPowerMode: boolean,
) => {
  const accent = chapterAccent(state.level);
  const horizon = height * 0.17;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#020208');
  sky.addColorStop(0.18, '#07111d');
  sky.addColorStop(0.55, '#02060c');
  sky.addColorStop(1, COLORS.bg);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = lowPowerMode ? 0.1 : 0.18;
  ctx.fillStyle = accent;
  const glow = ctx.createLinearGradient(0, horizon - 42, 0, horizon + 44);
  glow.addColorStop(0, 'rgba(0,0,0,0)');
  glow.addColorStop(0.52, accent);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - 50, width, 100);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = lowPowerMode ? 0.16 : 0.27;
  ctx.fillStyle = '#030912';
  const towerCount = Math.max(10, Math.floor(width / 52));
  for (let i = 0; i < towerCount; i += 1) {
    const x = (i / towerCount) * width;
    const w = width / towerCount + 2;
    const seed = (i * 37 + state.level * 13) % 7;
    const h = 18 + seed * 8;
    ctx.fillRect(x, horizon - h, w * 0.7, h);
    if (!lowPowerMode && i % 2 === 0) {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.18;
      for (let yy = horizon - h + 7; yy < horizon - 5; yy += 9) {
        ctx.fillRect(x + 5, yy, 2, 1);
        ctx.fillRect(x + 12, yy, 2, 1);
      }
      ctx.fillStyle = '#030912';
      ctx.globalAlpha = 0.27;
    }
  }
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = lowPowerMode ? 0.08 : 0.12;
  const centerX = width / 2;
  for (let i = -10; i <= 10; i += 1) {
    const bottomX = centerX + i * (width / 10);
    ctx.beginPath();
    ctx.moveTo(centerX + i * 3, horizon);
    ctx.lineTo(bottomX, height);
    ctx.stroke();
  }
  for (let i = 0; i < 13; i += 1) {
    const t = i / 12;
    const y = horizon + (t * t) * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  if (!lowPowerMode) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    for (let i = 0; i < 22; i += 1) {
      const x = ((i * 83 + state.elapsed * (9 + (i % 4) * 3)) % (width + 60)) - 30;
      const y = 8 + ((i * 47) % Math.max(18, horizon - 15));
      ctx.fillStyle = i % 5 === 0 ? COLORS.magenta : accent;
      ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
    }
    ctx.restore();
  }
};

const drawLaneBand = (
  ctx: CanvasRenderingContext2D,
  lane: CrosswireLane,
  width: number,
  height: number,
  state: CrosswireState,
) => {
  const h = rowH(height);
  const y = rowY(lane.row, height);

  if (lane.type === 'ROAD') {
    const road = ctx.createLinearGradient(0, y - h * 0.46, 0, y + h * 0.46);
    road.addColorStop(0, 'rgba(8,15,23,0.97)');
    road.addColorStop(0.5, 'rgba(1,5,9,0.99)');
    road.addColorStop(1, 'rgba(8,15,23,0.97)');
    ctx.fillStyle = road;
    ctx.fillRect(0, y - h * 0.47, width, h * 0.94);

    ctx.fillStyle = 'rgba(0,243,255,0.025)';
    for (let x = 0; x < width; x += 34) ctx.fillRect(x, y - h * 0.42, 1, h * 0.84);

    ctx.strokeStyle = 'rgba(150,220,235,0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([Math.max(10, width * 0.018), Math.max(10, width * 0.016)]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(0,243,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, y - h * 0.45);
    ctx.lineTo(width, y - h * 0.45);
    ctx.moveTo(0, y + h * 0.45);
    ctx.lineTo(width, y + h * 0.45);
    ctx.stroke();
    return;
  }

  if (lane.type === 'STREAM') {
    const stream = ctx.createLinearGradient(0, y - h * 0.48, 0, y + h * 0.48);
    stream.addColorStop(0, 'rgba(20,15,56,0.95)');
    stream.addColorStop(0.48, 'rgba(6,17,38,0.99)');
    stream.addColorStop(1, 'rgba(19,8,47,0.95)');
    ctx.fillStyle = stream;
    ctx.fillRect(0, y - h * 0.48, width, h * 0.96);

    for (let i = 0; i < 5; i += 1) {
      const waveY = y - h * 0.34 + i * h * 0.17;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(155,108,255,0.28)' : 'rgba(0,243,255,0.12)';
      ctx.beginPath();
      for (let x = -12; x <= width + 12; x += 12) {
        const yy = waveY + Math.sin(x * 0.035 + state.elapsed * 2.6 + i * 1.7) * 2.4;
        if (x === -12) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    return;
  }

  const isStart = lane.type === 'START';
  const safe = ctx.createLinearGradient(0, y - h * 0.45, 0, y + h * 0.45);
  safe.addColorStop(0, 'rgba(0,243,255,0.02)');
  safe.addColorStop(0.5, isStart ? 'rgba(0,243,255,0.09)' : 'rgba(0,243,255,0.045)');
  safe.addColorStop(1, 'rgba(0,243,255,0.02)');
  ctx.fillStyle = safe;
  ctx.fillRect(0, y - h * 0.45, width, h * 0.9);
  ctx.strokeStyle = isStart ? 'rgba(0,243,255,0.26)' : 'rgba(0,243,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, y - h * 0.42);
  ctx.lineTo(width, y - h * 0.42);
  ctx.moveTo(0, y + h * 0.42);
  ctx.lineTo(width, y + h * 0.42);
  ctx.stroke();
};

const drawVehicle = (
  ctx: CanvasRenderingContext2D,
  lane: CrosswireLane,
  entity: CrosswireLane['entities'][number],
  width: number,
  height: number,
) => {
  const x = entity.x / 100 * width;
  const w = entity.width / 100 * width;
  const y = rowY(lane.row, height);
  const h = rowH(height);
  const isBus = entity.kind === 'BUS';
  const isGlitch = entity.kind === 'GLITCH';
  const color = isGlitch ? COLORS.magenta : isBus ? COLORS.yellow : COLORS.cyan;
  const bodyH = Math.max(11, h * (isBus ? 0.38 : 0.3));
  const bodyW = Math.max(20, w);

  ctx.save();
  ctx.translate(x, y);

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  roundedRect(ctx, -bodyW * 0.58, -bodyH * 0.82, bodyW * 1.16, bodyH * 1.64, bodyH * 0.5);
  ctx.fill();

  ctx.globalAlpha = 1;
  const shell = ctx.createLinearGradient(0, -bodyH / 2, 0, bodyH / 2);
  shell.addColorStop(0, '#13212d');
  shell.addColorStop(0.5, '#061018');
  shell.addColorStop(1, '#020509');
  ctx.fillStyle = shell;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 11;
  roundedRect(ctx, -bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH, bodyH * 0.34);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(220,250,255,0.13)';
  roundedRect(ctx, -bodyW * 0.23, -bodyH * 0.28, bodyW * 0.46, bodyH * 0.24, 3);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  const lightW = Math.max(3, bodyW * 0.08);
  ctx.fillRect(-bodyW * 0.42, -1, lightW, 2);
  ctx.fillRect(bodyW * 0.42 - lightW, -1, lightW, 2);

  ctx.globalAlpha = 0.38;
  ctx.strokeStyle = COLORS.white;
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.35, bodyH * 0.33);
  ctx.lineTo(bodyW * 0.35, bodyH * 0.33);
  ctx.stroke();

  if (isGlitch) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(-bodyW * 0.44, -bodyH * 0.66, bodyW * 0.28, 2);
    ctx.fillRect(bodyW * 0.1, bodyH * 0.52, bodyW * 0.36, 2);
  }

  ctx.restore();
};

const drawRelay = (
  ctx: CanvasRenderingContext2D,
  lane: CrosswireLane,
  entity: CrosswireLane['entities'][number],
  width: number,
  height: number,
  state: CrosswireState,
) => {
  const x = entity.x / 100 * width;
  const w = Math.max(24, entity.width / 100 * width);
  const y = rowY(lane.row, height);
  const h = rowH(height);
  const color = entity.kind === 'RELAY' ? COLORS.violet : COLORS.cyan;
  const bodyH = Math.max(10, h * 0.32);

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;

  const aura = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  aura.addColorStop(0, 'rgba(0,0,0,0)');
  aura.addColorStop(0.5, color);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.11;
  ctx.fillStyle = aura;
  ctx.fillRect(-w * 0.62, -bodyH, w * 1.24, bodyH * 2);

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#06101b';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  roundedRect(ctx, -w / 2, -bodyH / 2, w, bodyH, Math.min(7, bodyH / 2));
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = COLORS.white;
  const pad = Math.max(5, w * 0.11);
  for (let px = -w / 2 + pad; px < w / 2 - pad; px += Math.max(10, w * 0.18)) {
    ctx.beginPath();
    ctx.moveTo(px, -bodyH * 0.28);
    ctx.lineTo(px + 5, bodyH * 0.28);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = color;
  const pulse = 2 + Math.sin(state.elapsed * 4 + entity.x * 0.08) * 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2.2, pulse), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawGoals = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrosswireState,
) => {
  const y = Math.max(20, rowH(height) * 0.35);
  const accent = chapterAccent(state.level);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.fillRect(0, 0, width, rowH(height) * 0.72);
  ctx.strokeStyle = `${accent}44`;
  ctx.beginPath();
  ctx.moveTo(0, rowH(height) * 0.7);
  ctx.lineTo(width, rowH(height) * 0.7);
  ctx.stroke();
  ctx.restore();

  state.goalCenters.forEach((center, index) => {
    const x = center / 100 * width;
    const filled = state.filledGoals[index];
    const r = Math.max(10, Math.min(16, Math.min(width, height) * 0.022));
    const color = filled ? COLORS.yellow : accent;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.elapsed * (filled ? 1.8 : 0.7) + index * 0.6);
    ctx.shadowColor = color;
    ctx.shadowBlur = filled ? 24 : 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = filled ? 2 : 1.3;
    ctx.globalAlpha = filled ? 0.95 : 0.72;

    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI / 3 * i;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = filled ? 0.18 : 0.06;
    ctx.fillStyle = color;
    ctx.fill();

    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.48, 0, Math.PI * 1.35);
    ctx.stroke();

    if (filled) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(-2, -2, 4, 4);
    }
    ctx.restore();
  });
};

const drawPlayer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrosswireState,
) => {
  const x = state.playerX / 100 * width;
  const y = rowY(state.playerRow, height);
  const size = Math.max(9, Math.min(15, Math.min(width, height) * 0.025));
  const bob = Math.sin(state.elapsed * 8) * 1.3;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = COLORS.cyan;
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.48, size * 1.2, size * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = COLORS.cyan;
  ctx.fillStyle = '#06121c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.72, -size * 0.24);
  ctx.lineTo(size * 0.56, size * 0.62);
  ctx.lineTo(0, size * 0.88);
  ctx.lineTo(-size * 0.56, size * 0.62);
  ctx.lineTo(-size * 0.72, -size * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.white;
  ctx.globalAlpha = 0.92;
  roundedRect(ctx, -size * 0.23, -size * 0.28, size * 0.46, size * 0.36, 2);
  ctx.fill();

  ctx.fillStyle = COLORS.cyan;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-size * 0.1, -size * 0.15, size * 0.2, size * 0.1);

  ctx.strokeStyle = COLORS.cyan;
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.moveTo(-size * 0.52, size * 0.45);
  ctx.lineTo(-size * 0.92, size * 0.78);
  ctx.moveTo(size * 0.52, size * 0.45);
  ctx.lineTo(size * 0.92, size * 0.78);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = COLORS.yellow;
  ctx.beginPath();
  ctx.moveTo(-size * 0.18, size * 0.78);
  ctx.lineTo(0, size * 1.35 + Math.sin(state.elapsed * 13) * 2);
  ctx.lineTo(size * 0.18, size * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawTelemetry = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrosswireState,
) => {
  const accent = chapterAccent(state.level);
  const fontSize = Math.max(9, Math.min(12, width * 0.019));
  const panelW = Math.min(250, width * 0.58);

  ctx.save();
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  ctx.fillStyle = 'rgba(2,7,12,0.82)';
  roundedRect(ctx, 10, 10, panelW, 58, 6);
  ctx.fill();
  ctx.strokeStyle = `${accent}66`;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.fillText(`CROSSWIRE // ${crosswireChapterLabel(state.level)}`, 18, 17);
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`LIVES ${'◆'.repeat(Math.max(0, state.lives))}`, 18, 35);
  ctx.fillStyle = state.timeLeft < 8 ? COLORS.magenta : COLORS.cyan;
  ctx.fillText(`SYNC ${Math.max(0, state.timeLeft).toFixed(1)}s`, 18, 51);

  const meterW = Math.min(180, width * 0.34);
  const meterX = width - meterW - 12;
  ctx.fillStyle = 'rgba(2,7,12,0.8)';
  roundedRect(ctx, meterX, 10, meterW, 42, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,243,255,0.27)';
  ctx.stroke();
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`UPLINK ${state.crossings}/${state.targetSlots}`, meterX + 9, 17);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundedRect(ctx, meterX + 9, 34, meterW - 18, 6, 3);
  ctx.fill();
  const fillW = (meterW - 18) * Math.min(1, state.crossings / Math.max(1, state.targetSlots));
  if (fillW > 0) {
    ctx.fillStyle = accent;
    roundedRect(ctx, meterX + 9, 34, fillW, 6, 3);
    ctx.fill();
  }

  ctx.globalAlpha = 0.7;
  ctx.fillStyle = COLORS.white;
  ctx.font = `${Math.max(8, fontSize - 1)}px monospace`;
  const hint = width < 460 ? 'SWIPE / WASD' : 'MOVE: WASD / ARROWS / SWIPE';
  ctx.fillText(hint, 12, height - 18);
  ctx.restore();
};

const drawScreenFx = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: CrosswireState,
  lowPowerMode: boolean,
) => {
  if (!lowPowerMode) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = COLORS.white;
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    ctx.restore();

    const scanY = ((state.elapsed * 88) % (height + 90)) - 45;
    const scan = ctx.createLinearGradient(0, scanY - 26, 0, scanY + 26);
    scan.addColorStop(0, 'rgba(0,243,255,0)');
    scan.addColorStop(0.5, 'rgba(0,243,255,0.055)');
    scan.addColorStop(1, 'rgba(0,243,255,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(0, scanY - 26, width, 52);
  }

  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.22,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(0,243,255,0.13)';
  ctx.lineWidth = 1;
  const c = 14;
  const m = 10;
  ctx.beginPath();
  ctx.moveTo(m, m + c); ctx.lineTo(m, m); ctx.lineTo(m + c, m);
  ctx.moveTo(width - m - c, m); ctx.lineTo(width - m, m); ctx.lineTo(width - m, m + c);
  ctx.moveTo(m, height - m - c); ctx.lineTo(m, height - m); ctx.lineTo(m + c, height - m);
  ctx.moveTo(width - m - c, height - m); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m, height - m - c);
  ctx.stroke();
  ctx.restore();
};

export const drawCrosswireScene = (
  ctx: CanvasRenderingContext2D,
  state: CrosswireState,
  width: number,
  height: number,
  options: { lowPowerMode: boolean },
) => {
  ctx.save();
  drawHorizon(ctx, width, height, state, options.lowPowerMode);

  for (const lane of state.lanes) drawLaneBand(ctx, lane, width, height, state);

  for (const lane of state.lanes) {
    for (const entity of lane.entities) {
      if (lane.type === 'ROAD') drawVehicle(ctx, lane, entity, width, height);
      else if (lane.type === 'STREAM') drawRelay(ctx, lane, entity, width, height, state);
    }
  }

  drawGoals(ctx, width, height, state);
  drawPlayer(ctx, width, height, state);
  drawTelemetry(ctx, width, height, state);

  if (state.flash > 0) {
    ctx.globalAlpha = Math.min(0.22, state.flash * 0.34);
    ctx.fillStyle = state.flash > 0.4 ? COLORS.white : chapterAccent(state.level);
    ctx.fillRect(0, 0, width, height);
  }

  drawScreenFx(ctx, width, height, state, options.lowPowerMode);
  ctx.restore();
};
