import type { CrosswireLane, CrosswireState } from './crosswireTypes';
import { crosswireChapterLabel, getCrosswireRules } from './crosswireConfig';

const COLORS = {
  bg: '#050508',
  cyan: '#00f3ff',
  cyanSoft: 'rgba(0,243,255,0.22)',
  magenta: '#ff0055',
  yellow: '#f3ff00',
  violet: '#8b5cf6',
  blue: '#1d4ed8',
  white: '#e8fdff',
};

const rowY = (row: number, height: number) => (row / 11) * height;
const rowH = (height: number) => height / 11;

const chapterAccent = (level: number) => {
  const chapter = getCrosswireRules(level).chapter;
  if (chapter === 'TRAFFIC') return '#ff7a00';
  if (chapter === 'STREAM') return '#8b5cf6';
  if (chapter === 'BLACKOUT') return '#ff0055';
  if (chapter === 'CORE') return '#f3ff00';
  return COLORS.cyan;
};

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, state: CrosswireState, lowPowerMode: boolean) => {
  const accent = chapterAccent(state.level);
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#02030a');
  g.addColorStop(0.48, '#07101a');
  g.addColorStop(1, COLORS.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = lowPowerMode ? 0.08 : 0.14;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  const spacing = Math.max(22, width / 12);
  for (let x = -spacing; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(width / 2 + (x - width / 2) * 0.25, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += Math.max(26, height / 15)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  if (!lowPowerMode) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = accent;
    const scanY = ((state.elapsed * 90) % (height + 50)) - 25;
    ctx.fillRect(0, scanY, width, 1.2);
    ctx.restore();
  }
};

const drawLane = (ctx: CanvasRenderingContext2D, lane: CrosswireLane, width: number, height: number, state: CrosswireState) => {
  const h = rowH(height);
  const y = rowY(lane.row, height);

  if (lane.type === 'ROAD') {
    ctx.fillStyle = 'rgba(2,6,12,0.88)';
    ctx.fillRect(0, y - h * 0.46, width, h * 0.92);
    ctx.strokeStyle = 'rgba(0,243,255,0.11)';
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (lane.type === 'STREAM') {
    const grad = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    grad.addColorStop(0, 'rgba(16,20,60,0.92)');
    grad.addColorStop(0.5, 'rgba(9,17,42,0.96)');
    grad.addColorStop(1, 'rgba(4,11,30,0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - h * 0.48, width, h * 0.96);
    ctx.strokeStyle = 'rgba(139,92,246,0.24)';
    for (let i = 0; i < 4; i += 1) {
      const waveY = y - h * 0.3 + i * h * 0.2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 16) {
        const yy = waveY + Math.sin(x * 0.04 + state.elapsed * 2.2 + i) * 2;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  } else if (lane.type === 'SAFE' || lane.type === 'START') {
    ctx.fillStyle = lane.type === 'START' ? 'rgba(0,243,255,0.06)' : 'rgba(0,243,255,0.035)';
    ctx.fillRect(0, y - h * 0.45, width, h * 0.9);
    ctx.strokeStyle = 'rgba(0,243,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(0, y - h * 0.42);
    ctx.lineTo(width, y - h * 0.42);
    ctx.stroke();
  }
};

const drawRoadEntity = (ctx: CanvasRenderingContext2D, lane: CrosswireLane, entity: CrosswireLane['entities'][number], width: number, height: number) => {
  const x = entity.x / 100 * width;
  const w = entity.width / 100 * width;
  const y = rowY(lane.row, height);
  const h = rowH(height);
  const color = entity.kind === 'GLITCH' ? COLORS.magenta : entity.kind === 'BUS' ? COLORS.yellow : COLORS.cyan;

  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  const bodyH = Math.max(8, h * (entity.kind === 'BUS' ? 0.34 : 0.27));
  ctx.globalAlpha = 0.16;
  ctx.fillRect(x - w * 0.54, y - bodyH * 0.82, w * 1.08, bodyH * 1.64);
  ctx.globalAlpha = 0.95;
  ctx.fillRect(x - w * 0.5, y - bodyH * 0.5, w, bodyH);
  ctx.fillStyle = '#02030a';
  ctx.fillRect(x - w * 0.30, y - bodyH * 0.24, w * 0.6, bodyH * 0.48);
  ctx.strokeStyle = COLORS.white;
  ctx.globalAlpha = 0.65;
  ctx.strokeRect(x - w * 0.46, y - bodyH * 0.46, w * 0.92, bodyH * 0.92);
  ctx.restore();
};

const drawStreamEntity = (ctx: CanvasRenderingContext2D, lane: CrosswireLane, entity: CrosswireLane['entities'][number], width: number, height: number) => {
  const x = entity.x / 100 * width;
  const w = entity.width / 100 * width;
  const y = rowY(lane.row, height);
  const h = rowH(height);
  const color = entity.kind === 'RELAY' ? COLORS.violet : COLORS.cyan;

  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.fillStyle = 'rgba(4,10,20,0.96)';
  ctx.fillRect(x - w * 0.5, y - h * 0.18, w, h * 0.36);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w * 0.5, y - h * 0.18, w, h * 0.36);
  ctx.globalAlpha = 0.5;
  for (let i = -2; i <= 2; i += 1) {
    const px = x + (i / 5) * w;
    ctx.beginPath();
    ctx.moveTo(px, y - h * 0.12);
    ctx.lineTo(px + 6, y + h * 0.12);
    ctx.stroke();
  }
  ctx.restore();
};

const drawGoals = (ctx: CanvasRenderingContext2D, width: number, height: number, state: CrosswireState) => {
  const y = rowY(0, height) + rowH(height) * 0.18;
  state.goalCenters.forEach((center, index) => {
    const x = center / 100 * width;
    const filled = state.filledGoals[index];
    const r = Math.max(9, Math.min(width, height) * 0.022);
    ctx.save();
    ctx.strokeStyle = filled ? COLORS.yellow : COLORS.cyan;
    ctx.fillStyle = filled ? 'rgba(243,255,0,0.18)' : 'rgba(0,243,255,0.06)';
    ctx.shadowColor = filled ? COLORS.yellow : COLORS.cyan;
    ctx.shadowBlur = filled ? 20 : 9;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, state.elapsed, state.elapsed + Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  });
};

const drawPlayer = (ctx: CanvasRenderingContext2D, width: number, height: number, state: CrosswireState) => {
  const x = state.playerX / 100 * width;
  const y = rowY(state.playerRow, height);
  const s = Math.max(8, Math.min(width, height) * 0.022);
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 16;
  ctx.shadowColor = COLORS.cyan;
  ctx.strokeStyle = COLORS.white;
  ctx.fillStyle = COLORS.cyan;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.9);
  ctx.lineTo(s * 0.7, -s * 0.1);
  ctx.lineTo(s * 0.48, s * 0.72);
  ctx.lineTo(0, s * 0.42);
  ctx.lineTo(-s * 0.48, s * 0.72);
  ctx.lineTo(-s * 0.7, -s * 0.1);
  ctx.closePath();
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(-s * 0.17, -s * 0.23, s * 0.34, s * 0.34);
  ctx.strokeStyle = COLORS.cyan;
  ctx.beginPath();
  ctx.moveTo(-s * 0.62, s * 0.32);
  ctx.lineTo(-s, s * 0.62);
  ctx.moveTo(s * 0.62, s * 0.32);
  ctx.lineTo(s, s * 0.62);
  ctx.stroke();
  ctx.restore();
};

const drawTelemetry = (ctx: CanvasRenderingContext2D, width: number, height: number, state: CrosswireState) => {
  const accent = chapterAccent(state.level);
  ctx.save();
  ctx.font = `${Math.max(9, Math.min(12, width * 0.019))}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(2,6,12,0.78)';
  ctx.fillRect(10, 10, Math.min(230, width * 0.56), 52);
  ctx.strokeStyle = `${accent}88`;
  ctx.strokeRect(10.5, 10.5, Math.min(230, width * 0.56) - 1, 51);
  ctx.fillStyle = accent;
  ctx.fillText(`CROSSWIRE // ${crosswireChapterLabel(state.level)}`, 18, 17);
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`LIVES ${'◆'.repeat(Math.max(0, state.lives))}`, 18, 34);
  ctx.fillStyle = state.timeLeft < 8 ? COLORS.magenta : COLORS.cyan;
  ctx.fillText(`SYNC ${Math.max(0, state.timeLeft).toFixed(1)}s`, 18, 48);

  const barW = Math.min(170, width * 0.34);
  const bx = width - barW - 14;
  ctx.fillStyle = 'rgba(2,6,12,0.72)';
  ctx.fillRect(bx, 10, barW, 36);
  ctx.strokeStyle = 'rgba(0,243,255,0.28)';
  ctx.strokeRect(bx + 0.5, 10.5, barW - 1, 35);
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`UPLINK ${state.crossings}/${state.targetSlots}`, bx + 8, 17);
  ctx.fillStyle = 'rgba(0,243,255,0.14)';
  ctx.fillRect(bx + 8, 33, barW - 16, 5);
  ctx.fillStyle = COLORS.cyan;
  ctx.fillRect(bx + 8, 33, (barW - 16) * Math.min(1, state.crossings / Math.max(1, state.targetSlots)), 5);
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
  drawBackground(ctx, width, height, state, options.lowPowerMode);
  for (const lane of state.lanes) drawLane(ctx, lane, width, height, state);
  for (const lane of state.lanes) {
    for (const entity of lane.entities) {
      if (lane.type === 'ROAD') drawRoadEntity(ctx, lane, entity, width, height);
      else if (lane.type === 'STREAM') drawStreamEntity(ctx, lane, entity, width, height);
    }
  }
  drawGoals(ctx, width, height, state);
  drawPlayer(ctx, width, height, state);
  drawTelemetry(ctx, width, height, state);

  if (state.flash > 0) {
    ctx.globalAlpha = Math.min(0.24, state.flash * 0.4);
    ctx.fillStyle = state.flash > 0.35 ? COLORS.white : chapterAccent(state.level);
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
};
