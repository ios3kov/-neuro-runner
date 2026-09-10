import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import type { DriftGate, DriftGateKind, DriftState } from './driftTypes';

export interface DriftRenderOptions { lowPowerMode: boolean; }

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const gatePalette: Record<DriftGateKind, { edge: string; accent: string }> = {
  NORMAL: { edge: '#00f3ff', accent: '#8efaff' },
  MOVING: { edge: '#8b5cf6', accent: '#d8b4fe' },
  BOOST: { edge: '#f3ff00', accent: '#ffffff' },
  GLITCH: { edge: '#ff315f', accent: '#ff8aa3' },
  CORE: { edge: '#ffffff', accent: '#f59e0b' },
};

const movingCenter = (state: DriftState, gate: DriftGate): number => {
  const moving = gate.kind === 'MOVING' || gate.kind === 'CORE'
    ? Math.sin(state.elapsed * (gate.kind === 'CORE' ? 2.8 : 1.8) + gate.phase) * (gate.kind === 'CORE' ? 14 : 9)
    : 0;
  return Math.max(10, Math.min(90, gate.center + moving));
};

const drawMegacity = (ctx: CanvasRenderingContext2D, state: DriftState, width: number, height: number, lowPowerMode: boolean): void => {
  const art = getArcadeArtProfile('DRIFT', state.level);
  const horizon = height * 0.2;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#020308');
  sky.addColorStop(0.3, rgba(art.primary, 0.075));
  sky.addColorStop(0.72, '#02070a');
  sky.addColorStop(1, rgba('#ff0055', 0.08));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);

  const buildings = lowPowerMode ? 10 : 18;
  for (let i = 0; i < buildings; i += 1) {
    const side = i % 2;
    const depth = (i % 6) / 6;
    const bw = width * (0.035 + depth * 0.025);
    const bh = height * (0.12 + depth * 0.18);
    const gap = width * (0.015 + depth * 0.01);
    const x = side === 0 ? i / 2 * (bw + gap) - bw * 0.25 : width - (Math.floor(i / 2) + 1) * (bw + gap) + gap;
    const y = horizon - bh * 0.12;
    ctx.fillStyle = rgba('#061018', 0.88); ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = rgba(side ? '#ff0055' : '#00f3ff', 0.11 + depth * 0.06); ctx.strokeRect(x, y, bw, bh);
    if (!lowPowerMode) {
      ctx.fillStyle = rgba(side ? '#ff0055' : '#00f3ff', 0.16);
      for (let wy = y + 7; wy < y + bh - 4; wy += 9) ctx.fillRect(x + bw * 0.24, wy, bw * 0.52, 1);
    }
  }

  ctx.strokeStyle = rgba(art.primary, 0.18); ctx.lineWidth = 1;
  for (let x = -100; x <= 200; x += 9) {
    ctx.beginPath(); ctx.moveTo(width / 2 + (width * x / 100 - width / 2) * 0.07, horizon); ctx.lineTo(width * x / 100, height); ctx.stroke();
  }
  const offset = (state.distance * 0.045) % 1;
  for (let i = 0; i < 20; i += 1) {
    const t = (i + offset) / 20;
    const y = horizon + (height - horizon) * t * t;
    ctx.strokeStyle = rgba(art.primary, 0.07 + t * 0.2);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  ctx.fillStyle = rgba('#ff0055', 0.07); ctx.fillRect(0, horizon, width * 0.075, height - horizon);
  ctx.fillRect(width * 0.925, horizon, width * 0.075, height - horizon);
  if (state.overdrive > 0) {
    const streaks = lowPowerMode ? 8 : 22;
    for (let i = 0; i < streaks; i += 1) {
      const x = ((i * 131 + state.elapsed * 480) % 997) / 997 * width;
      const y = horizon + ((i * 79) % 100) / 100 * (height - horizon);
      ctx.strokeStyle = rgba(i % 3 === 0 ? '#f3ff00' : '#ffffff', 0.12 + (i % 4) * 0.035);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 20 + (i % 5) * 11); ctx.stroke();
    }
  }
};

const drawGate = (ctx: CanvasRenderingContext2D, state: DriftState, gate: DriftGate, width: number, height: number, lowPowerMode: boolean): void => {
  const center = movingCenter(state, gate);
  const left = width * (center - gate.width / 2) / 100;
  const right = width * (center + gate.width / 2) / 100;
  const y = height * gate.y / 100;
  const style = gatePalette[gate.kind];
  const color = gate.passed ? '#00ff88' : style.edge;
  const beamH = Math.max(5, height * 0.012);
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = lowPowerMode ? 0 : gate.kind === 'CORE' ? 20 : 10;
  const g1 = ctx.createLinearGradient(0, y, left, y);
  g1.addColorStop(0, rgba(color, 0.14)); g1.addColorStop(1, color);
  ctx.fillStyle = g1; ctx.globalAlpha = gate.passed ? 0.28 : 0.74 + Math.sin(state.elapsed * 8 + gate.phase) * 0.12;
  ctx.fillRect(0, y, left, beamH);
  const g2 = ctx.createLinearGradient(right, y, width, y);
  g2.addColorStop(0, color); g2.addColorStop(1, rgba(color, 0.14)); ctx.fillStyle = g2; ctx.fillRect(right, y, width - right, beamH);
  ctx.globalAlpha = gate.passed ? 0.22 : 0.72;
  ctx.fillStyle = style.accent; ctx.fillRect(left - 3, y - beamH * 1.5, 3, beamH * 4); ctx.fillRect(right, y - beamH * 1.5, 3, beamH * 4);
  if (gate.kind === 'CORE') {
    ctx.strokeStyle = rgba('#f59e0b', 0.65); ctx.setLineDash([5, 5]); ctx.strokeRect(left + 5, y - beamH * 1.1, right - left - 10, beamH * 3.2); ctx.setLineDash([]);
  }
  if (gate.kind === 'GLITCH' && !gate.passed) {
    const glitchX = left + ((Math.sin(state.elapsed * 16 + gate.phase) + 1) * 0.5) * Math.max(1, right - left);
    ctx.fillStyle = rgba('#ffffff', 0.42); ctx.fillRect(glitchX, y - beamH, Math.max(2, width * 0.004), beamH * 3);
  }
  ctx.restore();
};

export const drawDriftScene = (ctx: CanvasRenderingContext2D, state: DriftState, width: number, height: number, { lowPowerMode }: DriftRenderOptions): void => {
  drawMegacity(ctx, state, width, height, lowPowerMode);
  state.gates.forEach(gate => drawGate(ctx, state, gate, width, height, lowPowerMode));

  const px = width * state.playerX / 100, py = height * 0.85;
  const bank = Math.max(-0.42, Math.min(0.42, state.velocityX * 0.018));
  const shipColor = state.overdrive > 0 ? '#f3ff00' : '#00f3ff';
  ctx.save(); ctx.translate(px, py); ctx.rotate(bank); ctx.shadowColor = shipColor; ctx.shadowBlur = lowPowerMode ? 4 : 22;
  const ship = ctx.createLinearGradient(0, -height * 0.028, 0, height * 0.028);
  ship.addColorStop(0, '#ffffff'); ship.addColorStop(0.25, shipColor); ship.addColorStop(1, rgba(shipColor, 0.25));
  ctx.fillStyle = ship; ctx.beginPath(); ctx.moveTo(0, -height * 0.03); ctx.lineTo(-width * 0.024, height * 0.027); ctx.lineTo(0, height * 0.014); ctx.lineTo(width * 0.024, height * 0.027); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#061018'; ctx.fillRect(-width * 0.004, -height * 0.003, width * 0.008, height * 0.023);
  const flame = state.overdrive > 0 ? 0.06 : 0.035;
  ctx.fillStyle = rgba(state.overdrive > 0 ? '#f3ff00' : '#00f3ff', 0.65); ctx.beginPath(); ctx.moveTo(-width * 0.004, height * 0.025); ctx.lineTo(0, height * flame); ctx.lineTo(width * 0.004, height * 0.025); ctx.closePath(); ctx.fill(); ctx.restore();

  const font = Math.max(9, Math.floor(Math.min(width, height) * 0.019)); ctx.font = `bold ${font}px monospace`;
  ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`HULL ${state.lives}`, 14, height - 34); ctx.fillStyle = shipColor; ctx.fillText(`${Math.round(state.speed)} KM/S`, 14, height - 18);
  ctx.textAlign = 'center'; ctx.fillStyle = state.combo >= 8 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`CHAIN x${state.combo}`, width / 2, height - 22);
  ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`GATES ${Math.max(0, state.targetPassed - state.passed)}`, width - 14, height - 22);
};
