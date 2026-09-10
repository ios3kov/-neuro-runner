import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import { getSnakeProfile } from './snakeConfig';
import {
  SNAKE_GRID_H,
  SNAKE_GRID_W,
  type SnakeFoodType,
  type SnakePoint,
  type SnakeState,
} from './snakeTypes';

export interface SnakeRenderOptions {
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

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void => {
  const r = Math.min(radius, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawBoardMaterial = (
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  ox: number,
  oy: number,
  boardW: number,
  boardH: number,
  cell: number,
  lowPowerMode: boolean,
): void => {
  const profile = getSnakeProfile(state.level);
  const art = getArcadeArtProfile('SNAKE', state.level);

  ctx.save();
  roundedRect(ctx, ox, oy, boardW, boardH, Math.max(4, cell * 0.45));
  const panel = ctx.createLinearGradient(ox, oy, ox + boardW, oy + boardH);
  panel.addColorStop(0, 'rgba(1,8,13,0.88)');
  panel.addColorStop(0.5, rgba(art.secondary, 0.1));
  panel.addColorStop(1, 'rgba(1,3,7,0.92)');
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.clip();

  ctx.strokeStyle = rgba(art.primary, 0.075);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= SNAKE_GRID_W; x += 1) {
    ctx.moveTo(ox + x * cell, oy);
    ctx.lineTo(ox + x * cell, oy + boardH);
  }
  for (let y = 0; y <= SNAKE_GRID_H; y += 1) {
    ctx.moveTo(ox, oy + y * cell);
    ctx.lineTo(ox + boardW, oy + y * cell);
  }
  ctx.stroke();

  if (!lowPowerMode) {
    ctx.strokeStyle = rgba(art.accent, 0.1);
    ctx.lineWidth = 1;
    const sweep = (state.animTime * 26) % (boardW + boardH);
    ctx.beginPath();
    ctx.moveTo(ox + Math.max(0, sweep - boardH), oy + Math.min(boardH, sweep));
    ctx.lineTo(ox + Math.min(boardW, sweep), oy + Math.max(0, sweep - boardW));
    ctx.stroke();
  }

  if (profile.theme === 'FIREWALL' || profile.theme === 'MALWARE' || profile.theme === 'GAUNTLET' || profile.theme === 'CORE') {
    const stripe = Math.max(2, cell * 0.16);
    ctx.fillStyle = rgba('#ff315f', 0.045);
    for (let x = -boardH; x < boardW; x += cell * 3.2) {
      ctx.save();
      ctx.translate(ox + x, oy);
      ctx.rotate(-0.45);
      ctx.fillRect(0, 0, stripe, boardH * 1.5);
      ctx.restore();
    }
  }

  if (profile.theme === 'VPN' || profile.theme === 'COMPRESSION') {
    ctx.strokeStyle = rgba('#60a5fa', 0.12);
    ctx.lineWidth = Math.max(1, cell * 0.08);
    for (let i = 0; i < 3; i += 1) {
      const radius = cell * (3.5 + i * 2.5) + Math.sin(state.animTime * 1.4 + i) * cell * 0.25;
      ctx.beginPath();
      ctx.arc(ox + boardW * 0.5, oy + boardH * 0.5, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (profile.theme === 'TWO_FA') {
    ctx.strokeStyle = rgba('#facc15', 0.14);
    ctx.lineWidth = 1;
    const inset = cell * 2.5;
    roundedRect(ctx, ox + inset, oy + inset, boardW - inset * 2, boardH - inset * 2, cell * 0.5);
    ctx.stroke();
    ctx.setLineDash([cell * 0.55, cell * 0.45]);
    roundedRect(ctx, ox + inset * 1.45, oy + inset * 1.45, boardW - inset * 2.9, boardH - inset * 2.9, cell * 0.35);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (profile.theme === 'OVERCLOCK' || profile.theme === 'CORE') {
    const cx = ox + boardW * 0.5;
    const cy = oy + boardH * 0.5;
    for (let i = 0; i < 4; i += 1) {
      const phase = state.animTime * (0.35 + i * 0.08);
      const radius = cell * (3.5 + i * 2.2);
      ctx.strokeStyle = rgba(i % 2 ? '#00f3ff' : '#ffb000', 0.12 - i * 0.015);
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, phase, phase + Math.PI * (1.05 + i * 0.14));
      ctx.stroke();
    }
  }

  if (profile.theme === 'MALWARE' && !lowPowerMode) {
    ctx.fillStyle = 'rgba(255,0,85,0.055)';
    for (let i = 0; i < 13; i += 1) {
      const x = ox + ((i * 131 + Math.floor(state.animTime * 7) * 17) % 997) / 997 * boardW;
      const y = oy + ((i * 73 + Math.floor(state.animTime * 5) * 29) % 991) / 991 * boardH;
      ctx.fillRect(x, y, cell * (0.3 + (i % 3) * 0.22), Math.max(1, cell * 0.08));
    }
  }

  ctx.restore();

  ctx.save();
  ctx.shadowColor = art.primary;
  ctx.shadowBlur = lowPowerMode ? 0 : 16;
  ctx.strokeStyle = rgba(art.primary, 0.42);
  ctx.lineWidth = Math.max(1, cell * 0.08);
  roundedRect(ctx, ox, oy, boardW, boardH, Math.max(4, cell * 0.45));
  ctx.stroke();
  ctx.restore();
};

const drawWall = (
  ctx: CanvasRenderingContext2D,
  point: SnakePoint,
  ox: number,
  oy: number,
  cell: number,
  primary: string,
): void => {
  const x = ox + point.x * cell;
  const y = oy + point.y * cell;
  const inset = Math.max(1, cell * 0.1);
  const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
  grad.addColorStop(0, rgba(primary, 0.2));
  grad.addColorStop(0.5, 'rgba(5,22,29,0.96)');
  grad.addColorStop(1, rgba(primary, 0.1));
  ctx.fillStyle = grad;
  roundedRect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, Math.max(1, cell * 0.12));
  ctx.fill();
  ctx.strokeStyle = rgba(primary, 0.28);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = rgba(primary, 0.22);
  ctx.fillRect(x + cell * 0.2, y + cell * 0.2, cell * 0.42, Math.max(1, cell * 0.07));
};

const drawFood = (
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  point: SnakePoint,
  type: SnakeFoodType | 'KEY',
  ox: number,
  oy: number,
  cell: number,
): void => {
  const cx = ox + (point.x + 0.5) * cell;
  const cy = oy + (point.y + 0.5) * cell;
  const pulse = 0.9 + Math.sin(state.animTime * 7) * 0.1;
  const size = cell * pulse;

  ctx.save();
  ctx.translate(cx, cy);

  if (type === 'DATA') {
    ctx.rotate(state.animTime * 0.65);
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = Math.max(1.5, cell * 0.1);
    ctx.strokeRect(-size * 0.23, -size * 0.23, size * 0.46, size * 0.46);
    ctx.rotate(-state.animTime * 1.3);
    ctx.fillStyle = 'rgba(0,255,136,0.9)';
    ctx.fillRect(-size * 0.1, -size * 0.1, size * 0.2, size * 0.2);
  } else if (type === 'VIRUS') {
    ctx.rotate(state.animTime * 1.8);
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const radius = i % 2 === 0 ? size * 0.34 : size * 0.18;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#140207';
    ctx.fillRect(-size * 0.08, -size * 0.08, size * 0.16, size * 0.16);
  } else if (type === 'ZIP') {
    ctx.shadowColor = '#448aff';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(1.5, cell * 0.09);
    for (let i = 0; i < 3; i += 1) {
      const scale = 0.16 + i * 0.09;
      ctx.strokeRect(-size * scale, -size * scale, size * scale * 2, size * scale * 2);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-size * 0.04, -size * 0.25, size * 0.08, size * 0.5);
  } else if (type === 'LOCKED_DATA') {
    const color = state.hasKey ? '#00ff88' : '#ff315f';
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, cell * 0.1);
    roundedRect(ctx, -size * 0.27, -size * 0.02, size * 0.54, size * 0.36, size * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -size * 0.04, size * 0.18, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.035, size * 0.1, size * 0.07, size * 0.12);
  } else {
    ctx.rotate(Math.sin(state.animTime * 2) * 0.12);
    ctx.shadowColor = '#ffd740';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = '#fff3a3';
    ctx.lineWidth = Math.max(1.5, cell * 0.1);
    ctx.beginPath();
    ctx.arc(-size * 0.13, 0, size * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.31, 0);
    ctx.lineTo(size * 0.31, size * 0.12);
    ctx.moveTo(size * 0.2, 0);
    ctx.lineTo(size * 0.2, -size * 0.11);
    ctx.stroke();
  }

  ctx.restore();
};

const drawSnakeBody = (
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  ox: number,
  oy: number,
  cell: number,
  lowPowerMode: boolean,
): void => {
  if (!lowPowerMode) {
    const trailCount = Math.min(state.history.length, 18);
    for (let i = 0; i < trailCount; i += 1) {
      const point = state.history[state.history.length - 1 - i];
      const alpha = (1 - i / trailCount) * 0.055;
      ctx.fillStyle = rgba(state.inOverclock ? '#ffb000' : '#00f3ff', alpha);
      ctx.fillRect(ox + point.x * cell + cell * 0.32, oy + point.y * cell + cell * 0.32, cell * 0.36, cell * 0.36);
    }
  }

  state.snake.forEach((point, index) => {
    const x = ox + point.x * cell;
    const y = oy + point.y * cell;
    const alpha = Math.max(0.28, 1 - index / Math.max(7, state.snake.length * 1.05));
    const baseColor = state.virusEffect === 'NONE' ? (state.inOverclock ? '#ffb000' : '#00f3ff') : '#ff315f';
    const inset = index === 0 ? cell * 0.08 : cell * 0.16;

    ctx.save();
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = index === 0 ? (lowPowerMode ? 3 : 18) : (lowPowerMode ? 0 : 6);
    const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
    grad.addColorStop(0, rgba('#ffffff', Math.min(0.92, alpha + 0.2)));
    grad.addColorStop(0.28, rgba(baseColor, alpha));
    grad.addColorStop(1, rgba(baseColor, alpha * 0.48));
    ctx.fillStyle = grad;
    roundedRect(ctx, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * 0.16);
    ctx.fill();

    if (index === 0) {
      const cx = x + cell * 0.5;
      const cy = y + cell * 0.5;
      ctx.translate(cx, cy);
      const angle = Math.atan2(state.dir.y, state.dir.x);
      ctx.rotate(angle);
      ctx.fillStyle = '#021015';
      ctx.beginPath();
      ctx.moveTo(cell * 0.23, 0);
      ctx.lineTo(-cell * 0.05, -cell * 0.16);
      ctx.lineTo(-cell * 0.05, cell * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cell * 0.03, -cell * 0.18, cell * 0.07, cell * 0.07);
      ctx.fillRect(cell * 0.03, cell * 0.11, cell * 0.07, cell * 0.07);
    } else if (index % 3 === 0) {
      ctx.fillStyle = rgba('#ffffff', 0.16);
      ctx.fillRect(x + cell * 0.28, y + cell * 0.26, cell * 0.4, Math.max(1, cell * 0.07));
    }
    ctx.restore();
  });
};

export const drawSnakeScene = (
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  width: number,
  height: number,
  { lowPowerMode }: SnakeRenderOptions,
): void => {
  const profile = getSnakeProfile(state.level);
  const art = getArcadeArtProfile('SNAKE', state.level);
  const cell = Math.max(6, Math.floor(Math.min(width, height) / SNAKE_GRID_W));
  const boardW = cell * SNAKE_GRID_W;
  const boardH = cell * SNAKE_GRID_H;
  const ox = (width - boardW) * 0.5;
  const oy = (height - boardH) * 0.5;

  ctx.save();
  if (state.virusEffect === 'VIDEO_DRIVER_FAIL' && !lowPowerMode) {
    ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 1.5);
  }

  drawBoardMaterial(ctx, state, ox, oy, boardW, boardH, cell, lowPowerMode);

  state.zones.forEach((zone) => {
    const x = ox + zone.x * cell;
    const y = oy + zone.y * cell;
    const zoneW = zone.w * cell;
    const zoneH = zone.h * cell;
    const pulse = 0.08 + Math.sin(state.animTime * 7) * 0.035;
    ctx.fillStyle = rgba('#ffb000', pulse + (state.inOverclock ? 0.07 : 0));
    ctx.fillRect(x, y, zoneW, zoneH);
    ctx.strokeStyle = state.inOverclock ? '#ffd740' : rgba('#ffb000', 0.46);
    ctx.lineWidth = state.inOverclock ? 2 : 1;
    ctx.setLineDash([cell * 0.5, cell * 0.32]);
    ctx.strokeRect(x + 1, y + 1, zoneW - 2, zoneH - 2);
    ctx.setLineDash([]);
  });

  state.walls.forEach((wall) => drawWall(ctx, wall, ox, oy, cell, art.primary));

  state.gates.forEach((gate) => {
    const x = ox + gate.x * cell;
    const y = oy + gate.y * cell;
    ctx.save();
    ctx.shadowColor = gate.active ? '#ff1744' : art.primary;
    ctx.shadowBlur = gate.active && !lowPowerMode ? 16 : 0;
    ctx.fillStyle = gate.active ? rgba('#ff1744', 0.72 + Math.sin(state.animTime * 11) * 0.12) : 'rgba(80,95,100,0.2)';
    roundedRect(ctx, x + cell * 0.12, y + cell * 0.12, cell * 0.76, cell * 0.76, cell * 0.1);
    ctx.fill();
    ctx.strokeStyle = gate.active ? '#ff7b8f' : rgba(art.primary, 0.28);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const lineX = x + cell * (0.27 + i * 0.23);
      ctx.beginPath();
      ctx.moveTo(lineX, y + cell * 0.18);
      ctx.lineTo(lineX, y + cell * 0.82);
      ctx.stroke();
    }
    ctx.restore();
  });

  state.tunnels.forEach((tunnel) => {
    const cx = ox + (tunnel.x + 0.5) * cell;
    const cy = oy + (tunnel.y + 0.5) * cell;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.animTime * 0.7 * (tunnel.id % 2 ? 1 : -1));
    ctx.shadowColor = '#448aff';
    ctx.shadowBlur = lowPowerMode ? 3 : 16;
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = cell * (0.18 + ring * 0.1);
      ctx.strokeStyle = rgba(ring === 1 ? '#7dd3fc' : '#448aff', 0.9 - ring * 0.2);
      ctx.lineWidth = Math.max(1, cell * 0.07);
      ctx.beginPath();
      ctx.arc(0, 0, radius, ring * 0.8, ring * 0.8 + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();
  });

  if (state.keyItem) drawFood(ctx, state, state.keyItem, 'KEY', ox, oy, cell);
  drawFood(ctx, state, state.food, state.food.type, ox, oy, cell);
  drawSnakeBody(ctx, state, ox, oy, cell, lowPowerMode);

  const telemetrySize = Math.max(9, Math.min(13, Math.floor(cell * 0.72)));
  ctx.font = `bold ${telemetrySize}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'left';
  ctx.fillText(state.sandbox ? 'SANDBOX // ENDLESS' : `DATA ${state.itemsCollected}/${state.target}`, ox + cell * 0.55, oy + cell * 0.45);
  ctx.fillStyle = art.accent;
  ctx.textAlign = 'right';
  ctx.fillText(profile.label, ox + boardW - cell * 0.55, oy + cell * 0.45);

  if (state.combo > 1) {
    ctx.fillStyle = '#ffd740';
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO x${Math.min(5, 1 + Math.floor((state.combo - 1) / 3))}`, ox + cell * 0.55, oy + cell * 1.45);
  }
  if (state.hasKey) {
    ctx.fillStyle = '#ffd740';
    ctx.textAlign = 'right';
    ctx.fillText('2FA KEY READY', ox + boardW - cell * 0.55, oy + cell * 1.45);
  }
  if (state.virusEffect !== 'NONE') {
    ctx.fillStyle = '#ff315f';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.virusEffect} ${state.virusTimer.toFixed(1)}s`, ox + boardW * 0.5, oy + boardH - cell * 1.3);
  }
  if (state.inOverclock) {
    ctx.fillStyle = '#ffb000';
    ctx.textAlign = 'center';
    ctx.fillText('OVERCLOCK // 162%', ox + boardW * 0.5, oy + boardH - cell * 2.25);
  }

  ctx.restore();
};
