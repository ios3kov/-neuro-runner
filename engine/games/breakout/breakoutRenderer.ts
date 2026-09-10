import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import type { BreakoutBall, BreakoutBlock, BreakoutBlockKind, BreakoutState } from './breakoutTypes';

export interface BreakoutRenderOptions { lowPowerMode: boolean; }

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const palette: Record<BreakoutBlockKind, { edge: string; fill: string; accent: string; label: string }> = {
  SOFT: { edge: '#00f3ff', fill: '#063c48', accent: '#8efaff', label: 'DATA' },
  ARMORED: { edge: '#94a3b8', fill: '#202733', accent: '#ffffff', label: 'ARM' },
  EXPLOSIVE: { edge: '#f59e0b', fill: '#4a2105', accent: '#ffe08a', label: 'BLAST' },
  SHIELD: { edge: '#3b82f6', fill: '#071f4a', accent: '#93c5fd', label: 'SHIELD' },
  CORRUPT: { edge: '#ff0055', fill: '#3b061e', accent: '#ff76b5', label: 'ERR' },
  CORE: { edge: '#f3ff00', fill: '#354000', accent: '#ffffff', label: 'CORE' },
};

const drawBlock = (ctx: CanvasRenderingContext2D, state: BreakoutState, block: BreakoutBlock, width: number, height: number, lowPowerMode: boolean): void => {
  const p = palette[block.kind];
  const x = width * block.x / 100;
  const y = height * block.y / 100;
  const w = width * block.w / 100;
  const h = height * block.h / 100;
  const pulse = 0.78 + Math.sin(state.elapsed * (block.kind === 'CORE' ? 6 : 3.5) + block.phase) * 0.12;
  ctx.save();
  ctx.shadowColor = p.edge;
  ctx.shadowBlur = lowPowerMode ? 0 : block.kind === 'CORE' ? 22 : block.kind === 'EXPLOSIVE' ? 13 : 7;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, rgba(p.accent, 0.22));
  g.addColorStop(0.2, p.fill);
  g.addColorStop(1, 'rgba(1,4,7,0.96)');
  ctx.fillStyle = g;
  ctx.globalAlpha = pulse;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = p.edge;
  ctx.lineWidth = block.kind === 'CORE' ? 2.5 : 1.2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const hp = Math.max(0, block.hp / Math.max(1, block.maxHp));
  ctx.fillStyle = rgba(p.accent, 0.75);
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * hp), Math.max(1, h * 0.07));

  if (block.kind === 'ARMORED') {
    ctx.strokeStyle = rgba('#ffffff', 0.18);
    ctx.beginPath(); ctx.moveTo(x + w * 0.18, y); ctx.lineTo(x + w * 0.38, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.62, y); ctx.lineTo(x + w * 0.82, y + h); ctx.stroke();
  } else if (block.kind === 'SHIELD') {
    ctx.strokeStyle = rgba('#93c5fd', 0.48);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + w * 0.1, y + h * 0.18, w * 0.8, h * 0.64);
    ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.22, 0, Math.PI * 2); ctx.stroke();
  } else if (block.kind === 'EXPLOSIVE') {
    ctx.strokeStyle = rgba('#ffe08a', 0.7);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.12); ctx.lineTo(x + w * 0.5, y + h * 0.88);
    ctx.moveTo(x + w * 0.22, y + h * 0.5); ctx.lineTo(x + w * 0.78, y + h * 0.5);
    ctx.stroke();
  } else if (block.kind === 'CORRUPT') {
    ctx.fillStyle = rgba('#ffffff', 0.4);
    const glitchX = x + ((Math.sin(state.elapsed * 17 + block.phase) + 1) * 0.5) * Math.max(1, w - 3);
    ctx.fillRect(glitchX, y, 2, h);
    ctx.fillStyle = rgba('#ff0055', 0.4);
    ctx.fillRect(x + w * 0.12, y + h * 0.62, w * 0.76, Math.max(1, h * 0.08));
  } else if (block.kind === 'CORE') {
    const cx = x + w * 0.5, cy = y + h * 0.5;
    ctx.strokeStyle = rgba('#ffffff', 0.72);
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * (0.16 + i * 0.13), state.elapsed * (1 + i * 0.4), Math.PI * 1.55 + state.elapsed * (1 + i * 0.4));
      ctx.stroke();
    }
  }
  ctx.restore();
};

const drawBall = (ctx: CanvasRenderingContext2D, state: BreakoutState, ball: BreakoutBall, width: number, height: number, lowPowerMode: boolean): void => {
  if (!ball.active) return;
  const sx = (v: number) => width * v / 100;
  const sy = (v: number) => height * v / 100;
  const trail = lowPowerMode ? ball.trail.slice(-7) : ball.trail;
  trail.forEach((point, index) => {
    const t = (index + 1) / Math.max(1, trail.length);
    const color = state.paddle.overdrive > 0 ? '#f3ff00' : '#00f3ff';
    ctx.fillStyle = rgba(color, point.alpha * t * 0.28);
    ctx.beginPath();
    ctx.arc(sx(point.x), sy(point.y), Math.max(1.5, width * (0.0018 + t * 0.0018)), 0, Math.PI * 2);
    ctx.fill();
  });
  const x = sx(ball.x), y = sy(ball.y);
  const r = Math.max(4, width * ball.radius / 100);
  ctx.save();
  const color = state.paddle.overdrive > 0 ? '#f3ff00' : '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = lowPowerMode ? 4 : 20;
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, color);
  g.addColorStop(1, rgba('#00f3ff', 0.2));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(color, 0.55);
  ctx.beginPath(); ctx.arc(x, y, r * 1.55, state.elapsed * 2, state.elapsed * 2 + Math.PI); ctx.stroke();
  ctx.restore();
};

export const drawBreakoutScene = (ctx: CanvasRenderingContext2D, state: BreakoutState, width: number, height: number, { lowPowerMode }: BreakoutRenderOptions): void => {
  const art = getArcadeArtProfile('BREAKOUT', state.level);
  const sx = (v: number) => width * v / 100;
  const sy = (v: number) => height * v / 100;

  const chamber = ctx.createLinearGradient(0, 0, 0, height);
  chamber.addColorStop(0, rgba(art.primary, state.level >= 16 ? 0.12 : 0.065));
  chamber.addColorStop(0.56, 'rgba(0,0,0,0.015)');
  chamber.addColorStop(1, 'rgba(255,0,85,0.055)');
  ctx.fillStyle = chamber;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = rgba(art.primary, 0.08);
  ctx.lineWidth = 1;
  const spacing = Math.max(34, width * 0.055);
  for (let x = 0; x < width; x += spacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }

  if (state.level >= 8) {
    const reactorY = height * 0.47;
    ctx.strokeStyle = rgba('#f59e0b', 0.13);
    ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(0, reactorY); ctx.lineTo(width, reactorY); ctx.stroke();
    ctx.setLineDash([]);
  }

  state.blocks.forEach(block => { if (block.active) drawBlock(ctx, state, block, width, height, lowPowerMode); });

  const px = sx(state.paddle.x), py = sy(90), pw = sx(state.paddle.w), ph = Math.max(8, sy(1.5));
  ctx.save();
  const paddleColor = state.paddle.overdrive > 0 ? '#f3ff00' : '#00f3ff';
  ctx.shadowColor = paddleColor;
  ctx.shadowBlur = lowPowerMode ? 4 : 18;
  const pg = ctx.createLinearGradient(px, py, px, py + ph);
  pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.22, paddleColor); pg.addColorStop(1, rgba(paddleColor, 0.38));
  ctx.fillStyle = pg; ctx.fillRect(px, py, pw, ph);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(px + pw * 0.08, py + ph * 0.34, pw * 0.84, Math.max(1, ph * 0.2));
  ctx.strokeStyle = rgba(paddleColor, 0.75); ctx.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
  ctx.restore();

  state.balls.forEach(ball => drawBall(ctx, state, ball, width, height, lowPowerMode));

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(243,255,0,${Math.min(0.28, state.flash * 0.18)})`;
    ctx.fillRect(0, 0, width, height);
  }

  const font = Math.max(9, Math.floor(Math.min(width, height) * 0.019));
  ctx.font = `bold ${font}px monospace`;
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(0,243,255,0.72)';
  ctx.fillText(`LIVES ${state.lives} // COMBO x${Math.max(1, state.combo)}`, 14, height - 30);
  ctx.textAlign = 'right'; ctx.fillStyle = state.paddle.energy >= 100 ? '#f3ff00' : 'rgba(255,255,255,0.52)';
  ctx.fillText(`OVERDRIVE ${Math.floor(state.paddle.energy)}%`, width - 14, height - 30);
};
