import { getArcadeArtProfile } from '../../visuals/gameArtDirection';
import { runnerObjectColor } from './runnerConfig';
import type { RunnerObject, RunnerState } from './runnerTypes';

export interface RunnerRenderOptions { lowPowerMode: boolean }

const LANE_WIDTH = 2.5;
const CAMERA_HEIGHT = 1.8;
const CAMERA_Z = -5;
const FOCAL_LENGTH = 300;

const rgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const drawRunnerObject = (ctx: CanvasRenderingContext2D, object: RunnerObject, state: RunnerState, pos: {x:number;y:number;scale:number}, lowPowerMode: boolean): void => {
  const color = runnerObjectColor(object.type);
  const scale = Math.max(0.2, pos.scale / 100);
  const ow = 82 * scale;
  const oh = 84 * scale;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = lowPowerMode ? 0 : object.type === 'FINISH' ? 26 : object.type === 'BOOST' ? 18 : 12;
  ctx.strokeStyle = color;
  ctx.fillStyle = rgba(color, 0.16);
  ctx.lineWidth = Math.max(1, scale * 1.2);

  if (object.type === 'COIN') {
    const pulse = 1 + Math.sin(state.elapsed * 8 + object.id) * 0.12;
    ctx.rotate(state.elapsed * 1.8 + object.id);
    ctx.beginPath(); ctx.arc(0, -oh * 0.42, ow * 0.2 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -oh * 0.42, ow * 0.09 * pulse, 0, Math.PI * 2); ctx.stroke();
  } else if (object.type === 'BOOST') {
    ctx.rotate(state.elapsed * 1.6);
    for (let i=0;i<3;i+=1){ ctx.beginPath(); ctx.arc(0,-oh*0.42,ow*(0.14+i*0.07),i*0.8,Math.PI*1.35+i*0.8); ctx.stroke(); }
  } else if (object.type === 'WALL') {
    ctx.fillRect(-ow/2,-oh,ow,oh); ctx.strokeRect(-ow/2,-oh,ow,oh);
    ctx.globalAlpha = 0.45; for (let i=-2;i<=2;i+=1){ ctx.beginPath(); ctx.moveTo(i*ow*0.18,-oh); ctx.lineTo((i+1)*ow*0.18,0); ctx.stroke(); }
  } else if (object.type === 'BEAM') {
    ctx.fillRect(-ow/2,-oh*0.34,ow,oh*0.24); ctx.strokeRect(-ow/2,-oh*0.34,ow,oh*0.24);
    ctx.globalAlpha = 0.5; ctx.fillRect(-ow*0.65,-oh*0.27,ow*1.3,2);
  } else if (object.type === 'GATE') {
    ctx.fillRect(-ow/2,-oh,ow*0.15,oh); ctx.fillRect(ow*0.35,-oh,ow*0.15,oh); ctx.fillRect(-ow/2,-oh,ow,oh*0.18);
    ctx.globalAlpha=0.5; ctx.strokeRect(-ow*0.34,-oh*0.78,ow*0.68,oh*0.6);
  } else if (object.type === 'GLITCH') {
    ctx.fillRect(-ow/2,-oh,ow,oh);
    ctx.globalAlpha = 0.9; for (let j=0;j<6;j+=1) ctx.fillRect(-ow/2+((j*31+object.id)%100)/100*ow,-oh+j*oh/6,ow*0.28,Math.max(1,scale*2));
  } else if (object.type === 'FINISH') {
    ctx.fillRect(-ow*1.4,-oh*3.6,ow*2.8,oh*3.6); ctx.globalAlpha=1; ctx.strokeRect(-ow*1.4,-oh*3.6,ow*2.8,oh*3.6);
    ctx.globalAlpha=0.5; for (let i=-2;i<=2;i+=1){ ctx.beginPath(); ctx.moveTo(i*ow*0.42,-oh*3.6); ctx.lineTo(i*ow*0.42,0); ctx.stroke(); }
  }
  ctx.restore();
};

export const drawRunnerScene = (ctx: CanvasRenderingContext2D, state: RunnerState, width: number, height: number, options: RunnerRenderOptions): void => {
  const { lowPowerMode } = options;
  const art = getArcadeArtProfile('RUNNER', state.level);
  const p = state.player;
  const cx = width / 2;
  const cy = height * 0.48;
  const project = (x:number,y:number,z:number) => {
    const relZ = z - (state.distance + CAMERA_Z);
    if (relZ <= 0.5) return null;
    const scale = FOCAL_LENGTH / relZ;
    return { x: cx + x * LANE_WIDTH * scale, y: cy + (CAMERA_HEIGHT-y)*scale*0.6, scale };
  };

  const bg = ctx.createLinearGradient(0,0,0,height);
  bg.addColorStop(0,'#020207'); bg.addColorStop(0.48,rgba(art.primary,0.08)); bg.addColorStop(0.78,rgba(art.secondary,0.06)); bg.addColorStop(1,'#050508');
  ctx.fillStyle=bg; ctx.fillRect(0,0,width,height);

  const horizon = project(0,0,state.distance+180);
  if (horizon) {
    ctx.fillStyle = rgba(art.primary,0.06); ctx.fillRect(0,horizon.y-2,width,4);
    if (!lowPowerMode) {
      for(let i=0;i<24;i+=1){ const side=i%2?1:-1; const z=state.distance+15+(i%12)*13; const base=project(side*(4.2+(i%3)*0.6),0,z); const top=project(side*(4.2+(i%3)*0.6),4+(i%5),z); if(!base||!top)continue; ctx.strokeStyle=rgba(side>0?art.secondary:art.primary,0.1+(i%4)*0.025); ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke(); }
    }
  }

  ctx.save(); ctx.lineWidth=1;
  [-1.5,-0.5,0.5,1.5].forEach(lane=>{ const near=project(lane,0,state.distance+3); const far=project(lane,0,state.distance+180); if(!near||!far)return; ctx.strokeStyle=rgba(art.primary,0.22); ctx.beginPath();ctx.moveTo(near.x,near.y);ctx.lineTo(far.x,far.y);ctx.stroke(); });
  const gridStart=Math.floor(state.distance/10)*10;
  for(let i=1;i<20;i+=1){ const z=gridStart+i*10; const l=project(-4.5,0,z), r=project(4.5,0,z); if(!l||!r)continue; const a=Math.max(0,1-(z-state.distance)/180); ctx.strokeStyle=rgba(art.primary,a*0.16); ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(r.x,r.y);ctx.stroke(); }
  ctx.restore();

  if (!lowPowerMode && state.overdrive>0) {
    ctx.strokeStyle=rgba(art.accent,0.3); for(let i=0;i<18;i+=1){ const x=((i*73+state.elapsed*240)%width); const y=(i*53)%height; ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-24,y+32);ctx.stroke(); }
  }

  const visible=state.objects.filter(o=>!o.collected&&o.z>state.distance-2&&o.z<state.distance+165).sort((a,b)=>b.z-a.z);
  visible.forEach(o=>{ const pos=project(o.lane,o.yOffset,o.z); if(pos) drawRunnerObject(ctx,o,state,pos,lowPowerMode); });

  const pp=project(p.x,p.y,state.distance+3.4);
  if(pp){ const pw=42*pp.scale/100, ph=64*pp.scale/100, bodyH=p.sliding?ph*0.45:ph; ctx.save();ctx.translate(pp.x,pp.y);ctx.rotate((p.lane-p.x)*0.48); const c=state.overdrive>0?art.accent:art.primary; ctx.shadowColor=c;ctx.shadowBlur=lowPowerMode?0:20;ctx.strokeStyle=c;ctx.fillStyle=rgba(c,0.2); ctx.beginPath();ctx.moveTo(0,-bodyH);ctx.lineTo(pw*0.58,-bodyH*0.35);ctx.lineTo(pw*0.45,0);ctx.lineTo(0,-bodyH*0.18);ctx.lineTo(-pw*0.45,0);ctx.lineTo(-pw*0.58,-bodyH*0.35);ctx.closePath();ctx.fill();ctx.stroke(); ctx.globalAlpha=0.55; for(let i=0;i<4;i+=1){ctx.beginPath();ctx.moveTo(-pw*0.7,-bodyH*0.2+i*3);ctx.lineTo(-pw*(1.2+i*0.15),-bodyH*0.2+i*5);ctx.stroke();ctx.beginPath();ctx.moveTo(pw*0.7,-bodyH*0.2+i*3);ctx.lineTo(pw*(1.2+i*0.15),-bodyH*0.2+i*5);ctx.stroke();} ctx.restore(); }

  ctx.font='bold 11px monospace'; ctx.textAlign='left'; ctx.fillStyle=p.shield<40?'#ff0055':'#dffcff';ctx.fillText(`SHIELD ${Math.round(p.shield)}%`,12,height-30); ctx.fillStyle=state.overdrive>0?art.accent:art.primary;ctx.fillText(`SPEED ${p.speed.toFixed(1)}`,12,height-14); ctx.textAlign='center';ctx.fillStyle=state.combo>=8?art.accent:art.primary;ctx.fillText(`CHAIN x${state.combo}`,width/2,height-14); ctx.textAlign='right';ctx.fillStyle='#dffcff';ctx.fillText(`${Math.floor(state.distance)} / ${state.targetDistance}m`,width-12,height-14);
};
