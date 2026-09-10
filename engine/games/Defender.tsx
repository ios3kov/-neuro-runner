import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { chooseDefenderEnemyKind, defenderEnemyColor, defenderEnemyHp, getDefenderRules } from './defender/defenderConfig';
import type { DefenderEnemy, DefenderState } from './defender/defenderTypes';

let enemySerial = 1;

const createState = (level: number): DefenderState => {
  const rules = getDefenderRules(level);
  return {
    shieldAngle: 0,
    shieldEnergy: 100,
    overcharge: 0,
    enemies: [],
    spawnTimer: 0.6,
    score: (level - 1) * 900,
    level,
    hp: 100,
    time: 0,
    duration: rules.duration,
    blocked: 0,
    combo: 0,
    bestCombo: 0,
    gameOver: false,
  };
};

const isDefenderState = (value: unknown): value is DefenderState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<DefenderState>;
  return Array.isArray(s.enemies) && typeof s.shieldAngle === 'number'
    && typeof s.shieldEnergy === 'number' && typeof s.score === 'number'
    && typeof s.level === 'number' && typeof s.hp === 'number'
    && typeof s.time === 'number' && typeof s.duration === 'number'
    && typeof s.blocked === 'number' && typeof s.gameOver === 'boolean';
};

export const DefenderGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const state = useRef<DefenderState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: DefenderState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(Math.min(1, s.duration > 0 ? s.time / s.duration : 0));
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isDefenderState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  };

  const spawnEnemy = () => {
    const s = state.current;
    const rules = getDefenderRules(s.level);
    if (s.enemies.filter(e => e.active).length >= rules.maxEnemies) return;
    const id = enemySerial++;
    const kind = chooseDefenderEnemyKind(s.level, id);
    const hp = defenderEnemyHp(kind);
    const speedScale = kind === 'FAST' ? 1.55 : kind === 'HEAVY' ? 0.72 : kind === 'BOSS' ? 0.6 : kind === 'SPLITTER' ? 1.05 : 1;
    s.enemies.push({
      id,
      kind,
      dist: 100,
      angle: ((id * 137 + s.level * 29) % 360) * Math.PI / 180,
      speed: rules.baseSpeed * speedScale,
      rotation: id * 0.33,
      hp,
      maxHp: hp,
      active: true,
    });
  };

  const spawnSplitChildren = (enemy: DefenderEnemy) => {
    const s = state.current;
    if (enemy.kind !== 'SPLITTER') return;
    for (let i = 0; i < 2; i += 1) {
      const id = enemySerial++;
      s.enemies.push({
        id,
        kind: 'FAST',
        dist: enemy.dist + 4,
        angle: enemy.angle + (i ? 0.18 : -0.18),
        speed: getDefenderRules(s.level).baseSpeed * 1.45,
        rotation: 0,
        hp: 1,
        maxHp: 1,
        active: true,
      });
    }
  };

  const blockEnemy = (enemy: DefenderEnemy, juice: GameCoreHandle) => {
    const s = state.current;
    enemy.hp -= 1;
    const color = defenderEnemyColor(enemy.kind);
    audio.playTone(enemy.kind === 'BOSS' ? 420 : 680, 'triangle', 0.035, 0.07);
    haptics.impactMedium();
    juice.emitParticles(50 + Math.cos(enemy.angle) * 25, 50 + Math.sin(enemy.angle) * 25, color, enemy.kind === 'BOSS' ? 16 : 8);
    juice.addShake(enemy.kind === 'BOSS' ? 5 : 2);

    if (enemy.hp > 0) {
      enemy.dist += 8;
      s.shieldEnergy = Math.max(0, s.shieldEnergy - 10);
      return;
    }

    enemy.active = false;
    s.blocked += 1;
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const base = enemy.kind === 'BOSS' ? 240 : enemy.kind === 'HEAVY' ? 120 : enemy.kind === 'CORRUPTED' ? 100 : 70;
    s.score += Math.round(base * (1 + Math.min(2, s.combo * 0.07)));
    s.shieldEnergy = Math.min(100, s.shieldEnergy + (enemy.kind === 'BOSS' ? 20 : 5));
    if (enemy.kind === 'SPLITTER') spawnSplitChildren(enemy);
    if (enemy.kind === 'CORRUPTED') {
      s.overcharge = 2.3;
      juice.addChromatic(11);
    }
    if (enemy.kind === 'BOSS') {
      juice.addChromatic(14);
      juice.triggerHitStop(70);
    }
    syncUi(s);
  };

  const hitCore = (enemy: DefenderEnemy, juice: GameCoreHandle) => {
    const s = state.current;
    const rules = getDefenderRules(s.level);
    enemy.active = false;
    s.hp -= enemy.kind === 'BOSS' ? rules.damage * 1.5 : rules.damage;
    s.combo = 0;
    audio.playError();
    haptics.impactHeavy();
    juice.triggerHitStop(90);
    juice.addShake(15);
    juice.addChromatic(12);
    juice.emitParticles(50, 50, '#ff0055', 22);
    if (s.hp <= 0) {
      s.gameOver = true;
      updateStats('DEFENDER', s.score, s.level);
      setGameOver(true);
    }
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    const rules = getDefenderRules(s.level);
    s.time += dt;
    s.overcharge = Math.max(0, s.overcharge - dt);
    s.shieldEnergy = Math.min(100, s.shieldEnergy + dt * (s.overcharge > 0 ? 13 : 5.5));

    const turn = (input.keys.has('ArrowLeft') ? -1 : 0) + (input.keys.has('ArrowRight') ? 1 : 0);
    s.shieldAngle += turn * rules.shieldTurnSpeed * dt;
    s.shieldAngle += input.touchDeltaX * 0.01 * (rules.shieldTurnSpeed / 2.5);
    s.shieldAngle = (s.shieldAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      spawnEnemy();
      s.spawnTimer = rules.spawnEvery;
    }

    for (const enemy of s.enemies) {
      if (!enemy.active) continue;
      enemy.dist -= enemy.speed * dt;
      enemy.rotation += dt * (enemy.kind === 'FAST' ? 8 : 4);
      if (enemy.kind === 'CORRUPTED') enemy.angle += Math.sin(s.time * 5 + enemy.id) * dt * 0.22;

      if (enemy.dist <= 31 && enemy.dist >= 26) {
        let diff = enemy.angle - s.shieldAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const effectiveArc = rules.shieldArc * (s.shieldEnergy < 25 ? 0.72 : 1);
        if (Math.abs(diff) <= effectiveArc / 2) {
          if (s.shieldEnergy <= 0) continue;
          s.shieldEnergy = Math.max(0, s.shieldEnergy - (enemy.kind === 'BOSS' ? 18 : 7));
          blockEnemy(enemy, juice);
        }
      }

      if (enemy.active && enemy.dist <= 4.5) hitCore(enemy, juice);
    }
    s.enemies = s.enemies.filter(enemy => enemy.active);

    if (s.time >= s.duration) {
      s.score += Math.round(s.hp * 4 + s.bestCombo * 45 + s.blocked * 12);
      setScore(s.score);
      haptics.notificationSuccess();
      juice.levelUp(s.level + 1, { timeSurvived: s.time, score: s.score, targetsDestroyed: s.blocked, bestCombo: s.bestCombo });
      s.time = -999;
    }
    syncUi(s);
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = state.current;
    const rules = getDefenderRules(s.level);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.35);
    bg.addColorStop(0, 'rgba(0,243,255,0.08)');
    bg.addColorStop(0.5, 'rgba(5,5,8,0.04)');
    bg.addColorStop(1, 'rgba(255,0,85,0.055)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(cx, cy);
    for (let ring = 1; ring <= 5; ring += 1) {
      ctx.strokeStyle = `rgba(0,243,255,${0.025 + ring * 0.012})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, radius * ring / 5, 0, Math.PI * 2); ctx.stroke();
    }
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = ray / 12 * Math.PI * 2 + s.time * 0.03;
      ctx.strokeStyle = 'rgba(0,243,255,0.035)';
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 24, Math.sin(angle) * 24); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.stroke();
    }
    ctx.restore();

    s.enemies.forEach(enemy => {
      const d = radius * enemy.dist / 100;
      const x = cx + Math.cos(enemy.angle) * d;
      const y = cy + Math.sin(enemy.angle) * d;
      const color = defenderEnemyColor(enemy.kind);
      const size = enemy.kind === 'BOSS' ? 13 : enemy.kind === 'HEAVY' ? 10 : enemy.kind === 'FAST' ? 6 : 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(enemy.rotation);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = enemy.kind === 'BOSS' ? 18 : 8; ctx.lineWidth = enemy.kind === 'BOSS' ? 2.3 : 1.4;
      ctx.globalAlpha = 0.85;
      ctx.strokeRect(-size, -size, size * 2, size * 2);
      ctx.globalAlpha = 0.12; ctx.fillRect(-size, -size, size * 2, size * 2);
      if (enemy.kind === 'FAST') { ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(-size * 1.6, 0); ctx.lineTo(size * 1.6, 0); ctx.stroke(); }
      if (enemy.kind === 'CORRUPTED') { ctx.globalAlpha = 0.45; ctx.fillRect(-size * 1.5, Math.sin(s.time * 14 + enemy.id) * size, size * 3, 2); }
      if (enemy.maxHp > 1) { ctx.globalAlpha = 0.5; ctx.fillRect(-size, size + 4, size * 2 * enemy.hp / enemy.maxHp, 2); }
      ctx.restore();
    });

    ctx.save();
    ctx.translate(cx, cy);
    const coreColor = s.hp < 35 ? '#ff0055' : '#00f3ff';
    ctx.shadowColor = coreColor; ctx.shadowBlur = 22; ctx.strokeStyle = coreColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(s.time * 6) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.16; ctx.fillStyle = coreColor; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(s.shieldAngle);
    const shieldColor = s.shieldEnergy < 25 ? '#ff0055' : s.overcharge > 0 ? '#f3ff00' : '#ffffff';
    ctx.globalAlpha = 1; ctx.strokeStyle = shieldColor; ctx.shadowColor = shieldColor; ctx.shadowBlur = 16; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.3, -rules.shieldArc / 2, rules.shieldArc / 2); ctx.stroke();
    ctx.restore();

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`CORE ${Math.max(0, Math.round(s.hp))}%`, 12, height - 30);
    ctx.fillStyle = s.shieldEnergy < 25 ? '#ff0055' : '#00f3ff'; ctx.fillText(`SHIELD ${Math.round(s.shieldEnergy)}%`, 12, height - 14);
    ctx.textAlign = 'center'; ctx.fillStyle = s.combo >= 8 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`CHAIN x${s.combo}`, cx, height - 14);
    ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`SURVIVE ${Math.max(0, s.duration - s.time).toFixed(1)}s`, width - 12, height - 14);
  }, []);

  const instructions = useMemo(() => [
    'ROTATE THE SHIELD WITH LEFT/RIGHT OR HORIZONTAL TOUCH.',
    'BLOCK INCOMING PACKETS UNTIL THE TIMER EXPIRES.',
    'YELLOW: FAST // RED: CORRUPTED // VIOLET: HEAVY // ORANGE: SPLITTER.',
    'WHITE BOSS PACKETS REQUIRE MULTIPLE BLOCKS. SHIELD ENERGY RECHARGES.',
    'CHAIN CLEAN BLOCKS FOR SCORE. CORE DAMAGE BREAKS THE CHAIN.',
  ], []);

  return <GameCore
    gameId="DEFENDER"
    update={update}
    draw={draw}
    onReset={reset}
    isGameOver={gameOver}
    score={score}
    level={level}
    progress={progress}
    instructions={instructions}
    onSave={saveState}
    onLoad={loadState}
  />;
};
