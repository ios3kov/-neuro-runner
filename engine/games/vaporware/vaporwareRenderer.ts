import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import { FAKE_STUDIOS, pickDeterministic } from './vaporwareConfig';
import type { VaporwareState } from './vaporwareTypes';

export interface VaporwareRenderOptions { lowPowerMode: boolean }

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const drawFrame = (ctx: CanvasRenderingContext2D, width: number, height: number, primary: string, secondary: string, level: number, elapsed: number, lowPowerMode: boolean): void => {
  ctx.fillStyle = '#020204';
  ctx.fillRect(0, 0, width, height);

  const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.72);
  bg.addColorStop(0, rgba(primary, 0.08 + Math.min(0.05, level * 0.004)));
  bg.addColorStop(0.55, 'rgba(4,9,15,0.35)');
  bg.addColorStop(1, rgba(secondary, 0.035));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = rgba(primary, lowPowerMode ? 0.035 : 0.06);
  ctx.lineWidth = 1;
  const grid = lowPowerMode ? 48 : 32;
  for (let x = 0; x < width; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

  if (!lowPowerMode) {
    const scanY = (elapsed * 42) % (height + 90) - 45;
    const scan = ctx.createLinearGradient(0, scanY - 38, 0, scanY + 38);
    scan.addColorStop(0, 'rgba(0,0,0,0)');
    scan.addColorStop(0.5, rgba(primary, 0.065));
    scan.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(0, scanY - 38, width, 76);
  }

  ctx.strokeStyle = rgba(primary, 0.22);
  ctx.strokeRect(10.5, 10.5, width - 21, height - 21);
  ctx.strokeStyle = rgba(secondary, 0.18);
  ctx.strokeRect(15.5, 15.5, width - 31, height - 31);
};

const drawTerminal = (ctx: CanvasRenderingContext2D, s: VaporwareState, width: number, height: number, primary: string): void => {
  const left = width * 0.07;
  const top = height * 0.16;
  const panelW = width * 0.86;
  const panelH = height * 0.62;
  ctx.fillStyle = 'rgba(0,8,8,0.72)'; ctx.fillRect(left, top, panelW, panelH);
  ctx.strokeStyle = rgba(primary, 0.6); ctx.strokeRect(left, top, panelW, panelH);
  ctx.fillStyle = rgba(primary, 0.12); ctx.fillRect(left, top, panelW, 23);
  ctx.fillStyle = primary; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillText('ROOT://VAPOR_CONSOLE', left + 10, top + 15);
  ctx.font = '11px monospace'; ctx.fillStyle = '#00ff88';
  s.textLines.forEach((line, index) => ctx.fillText(line, left + 12, top + 48 + index * 18));
  ctx.fillStyle = primary; ctx.fillRect(left + 12, top + 51 + s.textLines.length * 18, 10, 2);
};

const drawProgressRail = (ctx: CanvasRenderingContext2D, s: VaporwareState, width: number, height: number, color: string): void => {
  const x = width * 0.14;
  const y = height * 0.76;
  const w = width * 0.72;
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillRect(x, y, w * s.progress, 8); ctx.shadowBlur = 0;
  for (let i = 1; i < 8; i += 1) { ctx.fillStyle = 'rgba(2,2,4,0.75)'; ctx.fillRect(x + w * i / 8 - 1, y, 2, 8); }
};

export const drawVaporwareScene = (ctx: CanvasRenderingContext2D, s: VaporwareState, width: number, height: number, options: VaporwareRenderOptions): void => {
  const { lowPowerMode } = options;
  const art = getArcadeArtProfile('VAPORWARE', s.level);
  const primary = art.primary;
  const secondary = art.secondary;
  const accent = art.accent;
  const cx = width / 2;
  const cy = height / 2;
  drawFrame(ctx, width, height, primary, secondary, s.level, s.elapsed, lowPowerMode);

  const urgency = s.prompt ? Math.max(0, 1 - (s.prompt.expiresAt - s.elapsed) / Math.max(0.1, s.prompt.expiresAt - s.prompt.openedAt)) : 0;
  if (urgency > 0.55) {
    ctx.fillStyle = rgba('#ff0055', (urgency - 0.55) * 0.16);
    ctx.fillRect(0, 0, width, height);
    if (!lowPowerMode) {
      ctx.fillStyle = rgba('#ff0055', 0.16);
      for (let i = 0; i < 7; i += 1) {
        const y = ((i * 73 + Math.floor(s.elapsed * 90)) % Math.max(1, Math.floor(height))) as number;
        const x = ((i * 97 + s.level * 31) % 100) / 100 * width;
        ctx.fillRect(x, y, width * (0.08 + (i % 4) * 0.035), 2);
      }
    }
  }

  ctx.save();
  switch (s.screen) {
    case 'LOGO': {
      const studio = pickDeterministic([...FAKE_STUDIOS], s.level + Math.floor(s.screenTimer));
      const pulse = 1 + Math.sin(s.elapsed * 2.2) * 0.03;
      ctx.translate(cx, cy - 18); ctx.scale(pulse, pulse);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = primary; ctx.shadowBlur = lowPowerMode ? 0 : 22; ctx.font = 'bold 25px monospace'; ctx.fillText(studio[0], 0, 0);
      ctx.shadowBlur = 0; ctx.fillStyle = primary; ctx.font = '11px monospace'; ctx.fillText(studio[1], 0, 28);
      ctx.strokeStyle = rgba(primary, 0.35); ctx.beginPath(); ctx.moveTo(-110, 45); ctx.lineTo(110, 45); ctx.stroke();
      break;
    }
    case 'TERMINAL':
      drawTerminal(ctx, s, width, height, primary);
      break;
    case 'ASSETS': {
      ctx.textAlign = 'center'; ctx.fillStyle = primary; ctx.font = '10px monospace'; ctx.fillText('ASSET_STREAM // CACHE_MIRROR', cx, cy - 70);
      const orb = 26 + Math.sin(s.elapsed * 5) * 3;
      ctx.strokeStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = lowPowerMode ? 0 : 16; ctx.beginPath(); ctx.arc(cx, cy - 18, orb, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.fillText(s.assetName, cx, cy + 36);
      drawProgressRail(ctx, s, width, height, primary);
      break;
    }
    case 'SHADER': {
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(`PIPELINE_COMPILE [${Math.floor(s.progress * 8192)}]`, width * 0.08, height * 0.24);
      for (let i = 0; i < 24; i += 1) {
        const active = i / 24 < s.progress;
        ctx.fillStyle = active ? primary : 'rgba(0,243,255,0.06)';
        ctx.shadowColor = active ? primary : 'transparent'; ctx.shadowBlur = lowPowerMode ? 0 : active ? 7 : 0;
        ctx.fillRect(i * width / 24, height * 0.55, width / 24 - 2, height * 0.04);
      }
      ctx.shadowBlur = 0;
      break;
    }
    case 'SERVER': {
      ctx.translate(cx, cy - 15);
      for (let r = 0; r < 3; r += 1) {
        ctx.save(); ctx.rotate(s.elapsed * (r % 2 ? -1.6 : 1.2)); ctx.strokeStyle = r === 2 ? accent : primary; ctx.globalAlpha = 0.8 - r * 0.18; ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = lowPowerMode ? 0 : 12; ctx.lineWidth = 2;
        const rr = 24 + r * 13; ctx.beginPath(); for (let i = 0; i <= 8; i += 1) { const a = i / 8 * Math.PI * 2; const x = Math.cos(a) * rr; const y = Math.sin(a) * rr; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      }
      ctx.setTransform(1,0,0,1,0,0); ctx.textAlign='center'; ctx.fillStyle=primary; ctx.font='11px monospace'; ctx.fillText('ESTABLISHING_UPLINK...',cx,cy+66);
      break;
    }
    case 'BIOS': {
      const lines = ['NEURO_BIOS v9.4','CPU: UNKNOWN @ 99GHz','RAM: 1048576K OK','PRIM_MASTER: CORRUPT','BOOT_NET...','PXE-E53: NO_BOOT'];
      ctx.textAlign='left';ctx.font='11px monospace'; lines.forEach((line,i)=>{ctx.fillStyle=i===3?'#ff0055':primary;ctx.fillText(`> ${line}`,width*0.08,height*0.18+i*22);});
      break;
    }
    case 'UPDATE': {
      ctx.textAlign='center';ctx.fillStyle=primary;ctx.shadowColor=primary;ctx.shadowBlur=lowPowerMode?0:20;ctx.font='bold 48px monospace';ctx.fillText(`${Math.floor(s.progress*99)}%`,cx,cy);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText('SYSTEM_PATCHING...',cx,cy+38);drawProgressRail(ctx,s,width,height,primary);
      break;
    }
    case 'EULA': {
      ctx.textAlign='center';ctx.fillStyle=primary;ctx.font='bold 15px monospace';ctx.fillText('NEURO_CONTRACT_V9',cx,height*0.18);ctx.fillStyle=rgba('#dffcff',0.45);ctx.font='10px monospace';['YOUR_SOUL_IS_OURS.','BUGS = MECHANICS.','NO_REFUNDS.','DATA_SOLD_TO_ALIENS.','AUTO_ACCEPTING_TERMS...'].forEach((line,i)=>ctx.fillText(line,cx,height*0.34+i*24));
      break;
    }
    case 'INSTALL': {
      const x=width*0.14,y=height*0.25,w=width*0.72,h=height*0.42;ctx.fillStyle='rgba(0,8,14,0.75)';ctx.fillRect(x,y,w,h);ctx.strokeStyle=primary;ctx.strokeRect(x,y,w,h);ctx.fillStyle=rgba(primary,0.14);ctx.fillRect(x,y,w,26);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='11px monospace';ctx.fillText('INSTALLING DEFINITELY_FINAL_BUILD...',cx,y+h*0.48);drawProgressRail(ctx,s,width,height,accent);
      break;
    }
    case 'LOBBY': {
      ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 18px monospace';ctx.shadowColor=primary;ctx.shadowBlur=lowPowerMode?0:18;ctx.fillText('MATCHMAKING_IN_VOID',cx,cy-30);ctx.shadowBlur=0;ctx.fillStyle=primary;ctx.font='11px monospace';ctx.fillText(`QUEUE_POSITION ${9999-s.level*13}`,cx,cy+8);ctx.strokeStyle=rgba(primary,0.5);ctx.beginPath();ctx.arc(cx,cy+48,22,0,Math.PI*2*s.progress);ctx.stroke();
      break;
    }
  }
  ctx.restore();

  if (s.prompt) {
    const remaining = Math.max(0, s.prompt.expiresAt - s.elapsed);
    const windowTotal = Math.max(0.1, s.prompt.expiresAt - s.prompt.openedAt);
    const frac = Math.max(0, Math.min(1, remaining / windowTotal));
    const pw = Math.min(width * 0.78, 330); const ph = 92; const px = cx - pw / 2; const py = height * 0.74 - ph / 2;
    ctx.fillStyle = 'rgba(2,6,10,0.92)'; ctx.fillRect(px,py,pw,ph); ctx.strokeStyle = urgency > 0.65 ? '#ff0055' : accent; ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = lowPowerMode ? 0 : 14; ctx.strokeRect(px,py,pw,ph); ctx.shadowBlur=0;
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 17px monospace';ctx.fillText(s.prompt.label,cx,py+38);ctx.fillStyle=urgency>0.65?'#ff0055':primary;ctx.fillRect(px+12,py+68,(pw-24)*frac,5);
  }

  if (s.exitOpen) {
    const pulse = 0.55 + Math.sin(s.exitTimer * 7) * 0.2;
    ctx.fillStyle = rgba('#00ff88', 0.055 + pulse * 0.03); ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#00ff88';ctx.shadowColor='#00ff88';ctx.shadowBlur=lowPowerMode?0:26;ctx.lineWidth=2;ctx.strokeRect(width*0.22,height*0.34,width*0.56,height*0.22);ctx.shadowBlur=0;ctx.textAlign='center';ctx.fillStyle='#00ff88';ctx.font='bold 20px monospace';ctx.fillText('EXIT NODE OPEN',cx,height*0.43);ctx.font='11px monospace';ctx.fillStyle='#dffcff';ctx.fillText('TAP / SWIPE UP TO BREACH',cx,height*0.49);
  }

  ctx.font='bold 11px monospace';ctx.textAlign='left';ctx.fillStyle='#dffcff';ctx.fillText(`LIVES ${s.lives}`,12,height-30);ctx.fillStyle=primary;ctx.fillText(`BREACH ${s.correct}/${s.targetCorrect}`,12,height-14);ctx.textAlign='center';ctx.fillStyle=s.streak>=6?accent:primary;ctx.fillText(`STREAK x${s.streak}`,cx,height-14);ctx.textAlign='right';ctx.fillStyle='#dffcff';ctx.fillText(s.screen,width-12,height-14);
};
