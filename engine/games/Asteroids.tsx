import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { asteroidColor, asteroidHp, chooseAsteroidKind, getAsteroidsRules, makePolygon } from './asteroids/asteroidsConfig';
import type { AsteroidEntity, AsteroidsState } from './asteroids/asteroidsTypes';

let serial = 1;
const nextId = () => serial++;

const wrap = (value: number) => value < -5 ? 105 : value > 105 ? -5 : value;

const createState = (level: number): AsteroidsState => {
  const rules = getAsteroidsRules(level);
  return {
    player: { x: 50, y: 52, vx: 0, vy: 0, rotation: -Math.PI / 2, shield: 100, invulnerable: 0 },
    asteroids: [],
    bullets: [],
    score: (level - 1) * 900,
    level,
    lives: rules.lives,
    combo: 0,
    bestCombo: 0,
    kills: 0,
    targetKills: rules.targetKills,
    spawnTimer: 0.4,
    shotTimer: 0,
    elapsed: 0,
    gameOver: false,
  };
};

const isAsteroidsState = (value: unknown): value is AsteroidsState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<AsteroidsState>;
  return !!s.player && Array.isArray(s.asteroids) && Array.isArray(s.bullets)
    && typeof s.score === 'number' && typeof s.level === 'number'
    && typeof s.lives === 'number' && typeof s.kills === 'number'
    && typeof s.targetKills === 'number' && typeof s.gameOver === 'boolean';
};

export const AsteroidsGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const state = useRef<AsteroidsState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: AsteroidsState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(s.targetKills > 0 ? s.kills / s.targetKills : 0);
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isAsteroidsState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  };

  const spawnAsteroid = () => {
    const s = state.current;
    const rules = getAsteroidsRules(s.level);
    const id = nextId();
    const side = id % 4;
    const offset = ((id * 29) % 100);
    const x = side === 1 ? 105 : side === 3 ? -5 : offset;
    const y = side === 0 ? -5 : side === 2 ? 105 : offset;
    const kind = chooseAsteroidKind(s.level, id);
    const baseSize = kind === 'CORE' ? 7.5 : kind === 'MINE' ? 3.2 : 4.3 + (id % 4) * 0.7;
    const angle = Math.atan2(50 - y, 50 - x) + (((id * 13) % 21) - 10) / 45;
    const kindSpeed = kind === 'FAST' ? 1.8 : kind === 'MINE' ? 0.75 : kind === 'CORE' ? 0.7 : 1;
    const speed = (12 + (id % 9) * 1.6) * rules.speedScale * kindSpeed;
    const hp = asteroidHp(kind);
    s.asteroids.push({
      id,
      kind,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: baseSize,
      hp,
      maxHp: hp,
      rotation: id * 0.71,
      spin: ((id % 2 ? 1 : -1) * (0.25 + (id % 5) * 0.08)),
      vertices: makePolygon(baseSize, id, kind === 'CORE' ? 10 : 7),
      active: true,
    });
  };

  const splitAsteroid = (asteroid: AsteroidEntity) => {
    const s = state.current;
    if (asteroid.size < 4.4 || asteroid.kind === 'MINE' || asteroid.kind === 'CORE') return;
    for (let i = 0; i < 2; i += 1) {
      const id = nextId();
      const size = asteroid.size * 0.55;
      s.asteroids.push({
        id,
        kind: 'ROCK',
        x: asteroid.x,
        y: asteroid.y,
        vx: asteroid.vx + (i ? 22 : -22),
        vy: asteroid.vy + (i ? -16 : 16),
        size,
        hp: 1,
        maxHp: 1,
        rotation: asteroid.rotation + i,
        spin: i ? 0.7 : -0.7,
        vertices: makePolygon(size, id, 6),
        active: true,
      });
    }
  };

  const destroyAsteroid = (asteroid: AsteroidEntity, juice: GameCoreHandle) => {
    const s = state.current;
    asteroid.active = false;
    s.kills += 1;
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const base = asteroid.kind === 'CORE' ? 260 : asteroid.kind === 'ARMORED' ? 110 : asteroid.kind === 'FAST' ? 95 : asteroid.kind === 'MINE' ? 130 : 70;
    s.score += Math.round(base * (1 + Math.min(2, s.combo * 0.07)));
    s.player.shield = Math.min(100, s.player.shield + (asteroid.kind === 'CORE' ? 20 : 4));

    const color = asteroidColor(asteroid.kind);
    audio.playExplosion();
    haptics.impactMedium();
    juice.emitParticles(asteroid.x, asteroid.y, color, asteroid.kind === 'CORE' ? 34 : 16);
    juice.addShake(asteroid.kind === 'CORE' ? 9 : 3);
    if (asteroid.kind === 'MINE') {
      juice.addChromatic(14);
      juice.triggerHitStop(65);
    }
    if (asteroid.kind === 'CORE') {
      juice.addChromatic(18);
      juice.triggerHitStop(90);
    }
    splitAsteroid(asteroid);
    syncUi(s);
  };

  const damagePlayer = (juice: GameCoreHandle) => {
    const s = state.current;
    if (s.player.invulnerable > 0) return;
    if (s.player.shield > 0) {
      s.player.shield = Math.max(0, s.player.shield - 50);
      s.player.invulnerable = 1.1;
      s.combo = 0;
      audio.playError();
      haptics.notificationWarning();
      juice.addChromatic(10);
      juice.addShake(8);
      return;
    }
    s.lives -= 1;
    s.combo = 0;
    s.player = { x: 50, y: 52, vx: 0, vy: 0, rotation: -Math.PI / 2, shield: 50, invulnerable: 1.8 };
    audio.playError();
    haptics.impactHeavy();
    juice.addShake(17);
    juice.addChromatic(16);
    juice.triggerHitStop(120);
    juice.emitParticles(50, 52, '#ff0055', 28);
    if (s.lives <= 0) {
      s.gameOver = true;
      updateStats('ASTEROIDS', s.score, s.level);
      setGameOver(true);
    }
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    const rules = getAsteroidsRules(s.level);
    const p = s.player;
    s.elapsed += dt;
    s.shotTimer += dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt);

    const turn = (input.keys.has('ArrowLeft') ? -1 : 0) + (input.keys.has('ArrowRight') ? 1 : 0);
    p.rotation += turn * dt * 4.3 + input.touchDeltaX * 0.015;
    const thrusting = input.keys.has('ArrowUp') || (input.isTouching && Math.abs(input.touchDeltaY) > 0.1);
    if (thrusting) {
      p.vx += Math.cos(p.rotation) * 31 * dt;
      p.vy += Math.sin(p.rotation) * 31 * dt;
      if (Math.random() > 0.45) juice.emitParticles(p.x - Math.cos(p.rotation) * 2.4, p.y - Math.sin(p.rotation) * 2.4, '#00f3ff', 1);
    }
    p.vx *= Math.pow(0.985, dt * 60);
    p.vy *= Math.pow(0.985, dt * 60);
    const maxSpeed = 38;
    const velocity = Math.hypot(p.vx, p.vy);
    if (velocity > maxSpeed) { p.vx = p.vx / velocity * maxSpeed; p.vy = p.vy / velocity * maxSpeed; }
    p.x = wrap(p.x + p.vx * dt);
    p.y = wrap(p.y + p.vy * dt);

    if ((input.keys.has('Space') || input.tapDetected || (input.isTouching && s.shotTimer > 0.22)) && s.shotTimer > 0.2) {
      const speed = 88;
      s.bullets.push({ id: nextId(), x: p.x + Math.cos(p.rotation) * 2.5, y: p.y + Math.sin(p.rotation) * 2.5, vx: Math.cos(p.rotation) * speed + p.vx * 0.25, vy: Math.sin(p.rotation) * speed + p.vy * 0.25, life: 1.15, active: true });
      s.shotTimer = 0;
      audio.playTone(950, 'square', 0.025, 0.05);
      haptics.impactLight();
      juice.addShake(0.8);
    }

    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0 && s.asteroids.filter(a => a.active).length < 18) {
      spawnAsteroid();
      s.spawnTimer = rules.spawnEvery;
    }

    s.bullets.forEach(bullet => {
      if (!bullet.active) return;
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.life <= 0 || bullet.x < -3 || bullet.x > 103 || bullet.y < -3 || bullet.y > 103) bullet.active = false;
    });

    s.asteroids.forEach(asteroid => {
      if (!asteroid.active) return;
      asteroid.x = wrap(asteroid.x + asteroid.vx * dt);
      asteroid.y = wrap(asteroid.y + asteroid.vy * dt);
      asteroid.rotation += asteroid.spin * dt;
      if (asteroid.kind === 'MINE') {
        const dx = p.x - asteroid.x, dy = p.y - asteroid.y;
        const d = Math.max(8, Math.hypot(dx, dy));
        asteroid.vx += dx / d * dt * 3.5;
        asteroid.vy += dy / d * dt * 3.5;
      }
    });

    for (const bullet of s.bullets) {
      if (!bullet.active) continue;
      for (const asteroid of s.asteroids) {
        if (!asteroid.active) continue;
        if (Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) > asteroid.size + 0.8) continue;
        bullet.active = false;
        asteroid.hp -= 1;
        const color = asteroidColor(asteroid.kind);
        juice.emitParticles(bullet.x, bullet.y, color, 5);
        if (asteroid.hp <= 0) destroyAsteroid(asteroid, juice);
        else {
          audio.playClick();
          juice.addShake(1.2);
        }
        break;
      }
    }

    for (const asteroid of s.asteroids) {
      if (!asteroid.active) continue;
      if (Math.hypot(p.x - asteroid.x, p.y - asteroid.y) < asteroid.size + 1.6) {
        asteroid.active = false;
        damagePlayer(juice);
        break;
      }
    }

    s.bullets = s.bullets.filter(b => b.active);
    s.asteroids = s.asteroids.filter(a => a.active);

    if (s.kills >= s.targetKills) {
      s.score += s.lives * 300 + s.bestCombo * 55;
      setScore(s.score);
      haptics.notificationSuccess();
      juice.levelUp(s.level + 1, { score: s.score, targetsDestroyed: s.kills, bestCombo: s.bestCombo });
    }
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = state.current;
    const w = (v: number) => width * v / 100;
    const h = (v: number) => height * v / 100;

    const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.75);
    bg.addColorStop(0, 'rgba(0,243,255,0.055)');
    bg.addColorStop(0.55, 'rgba(5,5,8,0.015)');
    bg.addColorStop(1, 'rgba(255,0,85,0.045)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(0,243,255,0.18)';
    for (let i = 0; i < 38; i += 1) {
      const x = ((i * 37 + s.level * 11) % 100) / 100 * width;
      const y = ((i * 61 + Math.floor(s.elapsed * 3)) % 100) / 100 * height;
      ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }

    s.asteroids.forEach(asteroid => {
      const color = asteroidColor(asteroid.kind);
      ctx.save();
      ctx.translate(w(asteroid.x), h(asteroid.y));
      ctx.rotate(asteroid.rotation);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = asteroid.kind === 'CORE' ? 18 : 8;
      ctx.lineWidth = asteroid.kind === 'CORE' ? 2.4 : 1.4;
      ctx.beginPath();
      asteroid.vertices.forEach((point, index) => {
        const px = w(point.x), py = w(point.y);
        if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.globalAlpha = 0.16; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.stroke();
      if (asteroid.maxHp > 1) {
        ctx.globalAlpha = 0.55;
        ctx.fillRect(-w(asteroid.size), w(asteroid.size + 1.2), w(asteroid.size * 2 * asteroid.hp / asteroid.maxHp), 1.5);
      }
      if (asteroid.kind === 'MINE') {
        ctx.globalAlpha = 0.4 + Math.sin(s.elapsed * 10) * 0.2;
        ctx.beginPath(); ctx.arc(0, 0, w(asteroid.size * 1.45), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });

    s.bullets.forEach(bullet => {
      ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(w(bullet.x), h(bullet.y), w(0.32), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    const p = s.player;
    ctx.save();
    ctx.translate(w(p.x), h(p.y));
    ctx.rotate(p.rotation);
    const blink = p.invulnerable > 0 && Math.floor(s.elapsed * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.25 : 1;
    ctx.strokeStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 16; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w(2.2), 0); ctx.lineTo(w(-1.4), w(1.4)); ctx.lineTo(w(-0.65), 0); ctx.lineTo(w(-1.4), w(-1.4)); ctx.closePath(); ctx.stroke();
    if (p.shield > 0) {
      ctx.globalAlpha = 0.18 + p.shield / 100 * 0.25;
      ctx.beginPath(); ctx.arc(0, 0, w(3.1), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`HULL ${s.lives}`, w(2), h(97));
    ctx.fillStyle = '#00f3ff'; ctx.fillText(`SHIELD ${Math.round(p.shield)}%`, w(2), h(99.5));
    ctx.textAlign = 'center'; ctx.fillStyle = s.combo >= 8 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`CHAIN x${s.combo}`, width / 2, h(98.2));
    ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`THREATS ${Math.max(0, s.targetKills - s.kills)}`, w(98), h(98.2));
  }, []);

  const instructions = useMemo(() => [
    'ROTATE WITH LEFT/RIGHT OR HORIZONTAL TOUCH. THRUST WITH UP/DRAG.',
    'FIRE WITH SPACE OR TAP. DESTROY THE REQUIRED THREAT COUNT.',
    'YELLOW: FAST // VIOLET: ARMORED // RED: HOMING MINE // WHITE: CORE.',
    'SHIELD ABSORBS DAMAGE AND RECHARGES FROM KILLS. BUILD CHAIN FOR SCORE.',
    'LATE NODES MIX ALL THREAT TYPES AT HIGHER SPEED.',
  ], []);

  return <GameCore
    gameId="ASTEROIDS"
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
