import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import type { AsteroidEntity, AsteroidKind, AsteroidsState } from './asteroidsTypes';

export interface AsteroidsRenderOptions { lowPowerMode: boolean; }

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const kindStyle: Record<AsteroidKind, { edge: string; fill: string; accent: string }> = {
  ROCK: { edge: '#62e9ff', fill: '#10242b', accent: '#b7f7ff' },
  FAST: { edge: '#f3ff00', fill: '#343900', accent: '#ffffff' },
  ARMORED: { edge: '#8b5cf6', fill: '#24103f', accent: '#d8b4fe' },
  MINE: { edge: '#ff315f', fill: '#420818', accent: '#ff9db2' },
  CORE: { edge: '#ffffff', fill: '#203342', accent: '#00f3ff' },
};

const drawSpaceField = (ctx: CanvasRenderingContext2D, state: AsteroidsState, width: number, height: number, lowPowerMode: boolean): void => {
  const art = getArcadeArtProfile('ASTEROIDS', state.level);
  const centerX = width * 0.52;
  const centerY = height * 0.44;
  const voidGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.7);
  voidGradient.addColorStop(0, rgba(art.primary, state.level >= 16 ? 0.11 : 0.07));
  voidGradient.addColorStop(0.46, rgba('#06101c', 0.38));
  voidGradient.addColorStop(1, 'rgba(0,0,0,0.04)');
  ctx.fillStyle = voidGradient;
  ctx.fillRect(0, 0, width, height);

  const stars = lowPowerMode ? 28 : 74;
  for (let i = 0; i < stars; i += 1) {
    const depth = 1 + (i % 3);
    const speed = 2.2 + depth * 1.8;
    const x = ((i * 157 + state.level * 31 + state.elapsed * speed * 7) % 997) / 997 * width;
    const y = ((i * 89 + state.level * 47 + state.elapsed * speed * 3) % 991) / 991 * height;
    const size = depth === 3 ? 1.8 : depth === 2 ? 1.1 : 0.7;
    ctx.fillStyle = rgba(i % 9 === 0 ? art.accent : '#ffffff', 0.15 + depth * 0.09);
    ctx.fillRect(x, y, size, size);
  }

  if (!lowPowerMode) {
    ctx.save();
    ctx.strokeStyle = rgba(art.primary, 0.07);
    ctx.lineWidth = 1;
    const radius = Math.min(width, height) * 0.24;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + ring * 42, state.elapsed * (0.04 + ring * 0.01), Math.PI * (1.15 + ring * 0.08));
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.level >= 12) {
    const stormX = ((state.elapsed * 25) % (width * 1.5)) - width * 0.25;
    const storm = ctx.createLinearGradient(stormX - 120, 0, stormX + 120, 0);
    storm.addColorStop(0, 'rgba(124,58,237,0)');
    storm.addColorStop(0.5, rgba('#7c3aed', lowPowerMode ? 0.03 : 0.07));
    storm.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = storm;
    ctx.fillRect(0, 0, width, height);
  }
};

const drawAsteroid = (ctx: CanvasRenderingContext2D, state: AsteroidsState, asteroid: AsteroidEntity, width: number, lowPowerMode: boolean): void => {
  const style = kindStyle[asteroid.kind];
  const px = width * asteroid.x / 100;
  const pyScale = width / 100;
  ctx.save();
  ctx.translate(px, 0);
  ctx.translate(0, asteroid.y * pyScale);
  ctx.rotate(asteroid.rotation);
  ctx.shadowColor = style.edge;
  ctx.shadowBlur = lowPowerMode ? 0 : asteroid.kind === 'CORE' ? 22 : asteroid.kind === 'MINE' ? 15 : 8;

  const body = ctx.createRadialGradient(0, 0, 0, 0, 0, width * asteroid.size / 100);
  body.addColorStop(0, rgba(style.accent, 0.2));
  body.addColorStop(0.55, style.fill);
  body.addColorStop(1, rgba('#000000', 0.78));
  ctx.fillStyle = body;
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = asteroid.kind === 'CORE' ? 2.4 : 1.4;
  ctx.beginPath();
  asteroid.vertices.forEach((point, index) => {
    const x = point.x * width / 100;
    const y = point.y * width / 100;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = rgba(style.accent, 0.28);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-asteroid.size * width * 0.003, -asteroid.size * width * 0.002);
  ctx.lineTo(asteroid.size * width * 0.002, asteroid.size * width * 0.003);
  ctx.stroke();

  if (asteroid.maxHp > 1) {
    const bar = asteroid.size * 2 * width / 100;
    ctx.fillStyle = rgba('#000000', 0.7);
    ctx.fillRect(-bar * 0.5, asteroid.size * width / 100 + 6, bar, 2);
    ctx.fillStyle = style.accent;
    ctx.fillRect(-bar * 0.5, asteroid.size * width / 100 + 6, bar * asteroid.hp / asteroid.maxHp, 2);
  }

  if (asteroid.kind === 'MINE') {
    const r = asteroid.size * 1.42 * width / 100;
    ctx.strokeStyle = rgba('#ff315f', 0.45 + Math.sin(state.elapsed * 10) * 0.18);
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 6; i += 1) {
      const a = i / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); ctx.lineTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08); ctx.stroke();
    }
  } else if (asteroid.kind === 'CORE') {
    const r = asteroid.size * width / 100;
    for (let i = 0; i < 2; i += 1) {
      ctx.strokeStyle = rgba(i ? '#00f3ff' : '#ffffff', 0.62 - i * 0.18);
      ctx.beginPath(); ctx.arc(0, 0, r * (0.42 + i * 0.22), state.elapsed * (0.9 + i * 0.4), state.elapsed * (0.9 + i * 0.4) + Math.PI * 1.2); ctx.stroke();
    }
  }
  ctx.restore();
};

export const drawAsteroidsScene = (ctx: CanvasRenderingContext2D, state: AsteroidsState, width: number, height: number, { lowPowerMode }: AsteroidsRenderOptions): void => {
  const sx = (v: number) => width * v / 100;
  const sy = (v: number) => height * v / 100;
  drawSpaceField(ctx, state, width, height, lowPowerMode);

  state.asteroids.forEach(a => { if (a.active) drawAsteroid(ctx, state, a, width, lowPowerMode); });

  state.bullets.forEach(bullet => {
    if (!bullet.active) return;
    ctx.save();
    ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = lowPowerMode ? 2 : 12;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, width * 0.0022);
    ctx.beginPath(); ctx.moveTo(sx(bullet.x), sy(bullet.y)); ctx.lineTo(sx(bullet.x - bullet.vx * 0.018), sy(bullet.y - bullet.vy * 0.018)); ctx.stroke();
    ctx.restore();
  });

  const p = state.player;
  const x = sx(p.x), y = sy(p.y);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(p.rotation);
  const blink = p.invulnerable > 0 && Math.floor(state.elapsed * 14) % 2 === 0;
  ctx.globalAlpha = blink ? 0.25 : 1;
  ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = lowPowerMode ? 4 : 18;
  ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 2;
  ctx.fillStyle = rgba('#00f3ff', 0.09);
  ctx.beginPath(); ctx.moveTo(sx(2.35), 0); ctx.lineTo(sx(-1.5), sx(1.45)); ctx.lineTo(sx(-0.65), 0); ctx.lineTo(sx(-1.5), sx(-1.45)); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba('#ffffff', 0.48);
  ctx.beginPath(); ctx.moveTo(sx(-0.45), 0); ctx.lineTo(sx(1.1), 0); ctx.stroke();
  if (p.shield > 0) {
    const shieldR = sx(3.2);
    ctx.strokeStyle = rgba('#00f3ff', 0.22 + p.shield / 100 * 0.34);
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(0, 0, shieldR, state.elapsed * 0.8, Math.PI * 1.8 + state.elapsed * 0.8); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  const font = Math.max(9, Math.floor(Math.min(width, height) * 0.019));
  ctx.font = `bold ${font}px monospace`;
  ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`HULL ${state.lives}`, 14, height - 35);
  ctx.fillStyle = '#00f3ff'; ctx.fillText(`SHIELD ${Math.round(p.shield)}%`, 14, height - 19);
  ctx.textAlign = 'center'; ctx.fillStyle = state.combo >= 8 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`CHAIN x${state.combo}`, width * 0.5, height - 24);
  ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`THREATS ${Math.max(0, state.targetKills - state.kills)}`, width - 14, height - 24);
};
