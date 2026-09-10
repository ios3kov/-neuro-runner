import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import { defenderEnemyColor, getDefenderRules } from './defenderConfig';
import type { DefenderEnemy, DefenderState } from './defenderTypes';

export interface DefenderRenderOptions { lowPowerMode: boolean }

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: DefenderEnemy, state: DefenderState, cx: number, cy: number, radius: number, lowPowerMode: boolean): void => {
  const d = radius * enemy.dist / 100;
  const x = cx + Math.cos(enemy.angle) * d;
  const y = cy + Math.sin(enemy.angle) * d;
  const color = defenderEnemyColor(enemy.kind);
  const size = enemy.kind === 'BOSS' ? 13 : enemy.kind === 'HEAVY' ? 10 : enemy.kind === 'FAST' ? 6 : 8;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(enemy.rotation);
  ctx.strokeStyle = color;
  ctx.fillStyle = rgba(color, 0.14);
  ctx.shadowColor = color;
  ctx.shadowBlur = lowPowerMode ? 0 : enemy.kind === 'BOSS' ? 22 : 10;
  ctx.lineWidth = enemy.kind === 'BOSS' ? 2.4 : 1.4;

  if (enemy.kind === 'FAST') {
    ctx.beginPath(); ctx.moveTo(0, -size * 1.3); ctx.lineTo(size * 1.2, 0); ctx.lineTo(0, size * 1.3); ctx.lineTo(-size * 1.2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(-size * 2, 0); ctx.lineTo(size * 2, 0); ctx.stroke();
  } else if (enemy.kind === 'SPLITTER') {
    ctx.beginPath(); ctx.moveTo(0, -size * 1.25); ctx.lineTo(size, size); ctx.lineTo(0, size * 0.45); ctx.lineTo(-size, size); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (enemy.kind === 'BOSS') {
    for (let i = 0; i < 3; i += 1) { ctx.rotate(Math.PI / 6); ctx.strokeRect(-size - i * 2, -size - i * 2, (size + i * 2) * 2, (size + i * 2) * 2); }
    ctx.fillRect(-size * 0.35, -size * 0.35, size * 0.7, size * 0.7);
  } else {
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.fillRect(-size, -size, size * 2, size * 2);
    if (enemy.kind === 'HEAVY') { ctx.globalAlpha = 0.55; ctx.strokeRect(-size * 0.65, -size * 0.65, size * 1.3, size * 1.3); }
    if (enemy.kind === 'CORRUPTED') { ctx.globalAlpha = 0.5; ctx.fillRect(-size * 1.5, Math.sin(state.time * 14 + enemy.id) * size, size * 3, 2); }
  }

  if (enemy.maxHp > 1) {
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.8; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-size, size + 4, size * 2, 2);
    ctx.fillStyle = color; ctx.fillRect(-size, size + 4, size * 2 * enemy.hp / enemy.maxHp, 2);
  }
  ctx.restore();
};

export const drawDefenderScene = (ctx: CanvasRenderingContext2D, state: DefenderState, width: number, height: number, options: DefenderRenderOptions): void => {
  const { lowPowerMode } = options;
  const art = getArcadeArtProfile('DEFENDER', state.level);
  const rules = getDefenderRules(state.level);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.5);
  bg.addColorStop(0, rgba(state.hp < 35 ? '#ff0055' : art.primary, 0.13));
  bg.addColorStop(0.45, rgba('#07111c', 0.65));
  bg.addColorStop(1, 'rgba(0,0,0,0.04)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

  ctx.save(); ctx.translate(cx, cy);
  const rings = lowPowerMode ? 4 : 7;
  for (let ring = 1; ring <= rings; ring += 1) {
    const rr = radius * ring / rings;
    ctx.strokeStyle = rgba(ring % 2 ? art.primary : art.secondary, 0.04 + ring * 0.012);
    ctx.lineWidth = ring === rings ? 1.5 : 1;
    ctx.setLineDash(ring % 2 ? [] : [4, 8]);
    ctx.beginPath(); ctx.arc(0, 0, rr, state.time * (0.02 + ring * 0.002), Math.PI * 2); ctx.stroke();
  }
  ctx.setLineDash([]);
  const rays = lowPowerMode ? 8 : 18;
  for (let ray = 0; ray < rays; ray += 1) {
    const angle = ray / rays * Math.PI * 2 + state.time * 0.025;
    ctx.strokeStyle = rgba(art.primary, ray % 3 === 0 ? 0.07 : 0.025);
    ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 28, Math.sin(angle) * 28); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.stroke();
  }
  ctx.restore();

  if (!lowPowerMode && state.level >= 10) {
    const sweep = (state.time * 0.7) % (Math.PI * 2);
    ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = rgba(art.primary, 0.045); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, sweep, sweep + 0.32); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  state.enemies.forEach(enemy => drawEnemy(ctx, enemy, state, cx, cy, radius, lowPowerMode));

  ctx.save(); ctx.translate(cx, cy);
  const coreColor = state.hp < 35 ? '#ff0055' : art.primary;
  ctx.shadowColor = coreColor; ctx.shadowBlur = lowPowerMode ? 0 : 26; ctx.strokeStyle = coreColor; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) { ctx.globalAlpha = 0.5 - i * 0.1; ctx.beginPath(); ctx.arc(0, 0, 18 + i * 8 + Math.sin(state.time * (5 + i)) * 2, state.time * (i % 2 ? -0.3 : 0.25), Math.PI * 1.45); ctx.stroke(); }
  ctx.globalAlpha = 0.14; ctx.fillStyle = coreColor; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();

  ctx.rotate(state.shieldAngle);
  const shieldColor = state.shieldEnergy < 25 ? '#ff0055' : state.overcharge > 0 ? art.accent : '#ffffff';
  ctx.globalAlpha = 1; ctx.strokeStyle = shieldColor; ctx.shadowColor = shieldColor; ctx.shadowBlur = lowPowerMode ? 0 : 20; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, radius * 0.3, -rules.shieldArc / 2, rules.shieldArc / 2); ctx.stroke();
  ctx.globalAlpha = 0.22; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(0, 0, radius * 0.3, -rules.shieldArc / 2, rules.shieldArc / 2); ctx.stroke();
  ctx.restore();

  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`CORE ${Math.max(0, Math.round(state.hp))}%`, 12, height - 30);
  ctx.fillStyle = state.shieldEnergy < 25 ? '#ff0055' : art.primary; ctx.fillText(`SHIELD ${Math.round(state.shieldEnergy)}%`, 12, height - 14);
  ctx.textAlign = 'center'; ctx.fillStyle = state.combo >= 8 ? art.accent : art.primary; ctx.fillText(`CHAIN x${state.combo}`, cx, height - 14);
  ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`SURVIVE ${Math.max(0, state.duration - state.time).toFixed(1)}s`, width - 12, height - 14);
};
