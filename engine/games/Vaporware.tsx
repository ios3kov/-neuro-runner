import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameCore, type GameCoreHandle, type InputState } from '../GameCore';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import {
  ASSET_NAMES,
  FAKE_STUDIOS,
  TERMINAL_LINES,
  VAPOR_ACTIONS,
  VAPOR_SCREENS,
  getVaporwareRules,
  pickDeterministic,
  vaporActionLabel,
} from './vaporware/vaporwareConfig';
import type { VaporAction, VaporwareState } from './vaporware/vaporwareTypes';

const createState = (level: number): VaporwareState => {
  const rules = getVaporwareRules(level);
  return {
    level,
    score: (level - 1) * 700,
    lives: rules.lives,
    correct: 0,
    targetCorrect: rules.targetCorrect,
    streak: 0,
    bestStreak: 0,
    screen: 'LOGO',
    screenTimer: 0,
    screenDuration: rules.screenDurationMax,
    progress: 0,
    prompt: null,
    promptCooldown: 0.9,
    textLines: [],
    assetName: ASSET_NAMES[0],
    elapsed: 0,
    exitOpen: false,
    exitTimer: 0,
    gameOver: false,
  };
};

const isVaporwareState = (value: unknown): value is VaporwareState => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<VaporwareState>;
  return typeof s.level === 'number' && typeof s.score === 'number'
    && typeof s.lives === 'number' && typeof s.correct === 'number'
    && typeof s.targetCorrect === 'number' && typeof s.screen === 'string'
    && Array.isArray(s.textLines) && typeof s.gameOver === 'boolean';
};

const detectAction = (input: InputState): VaporAction | null => {
  if (input.tapDetected) return 'TAP';
  if (input.swipeDirection === 'LEFT') return 'LEFT';
  if (input.swipeDirection === 'RIGHT') return 'RIGHT';
  if (input.swipeDirection === 'UP') return 'UP';
  if (input.swipeDirection === 'DOWN') return 'DOWN';
  if (input.keys.has('Space') || input.keys.has('Enter')) return 'TAP';
  if (input.keys.has('ArrowLeft')) return 'LEFT';
  if (input.keys.has('ArrowRight')) return 'RIGHT';
  if (input.keys.has('ArrowUp')) return 'UP';
  if (input.keys.has('ArrowDown')) return 'DOWN';
  return null;
};

export const VaporwareGame: React.FC = () => {
  const updateStats = useGameStore(s => s.updateStats);
  const state = useRef<VaporwareState>(createState(1));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const syncUi = (s: VaporwareState) => {
    setScore(s.score);
    setLevel(s.level);
    setGameOver(s.gameOver);
    setProgress(s.targetCorrect > 0 ? s.correct / s.targetCorrect : 0);
  };

  const reset = (startLevel = 1) => {
    state.current = createState(Math.max(1, startLevel || 1));
    syncUi(state.current);
  };

  const saveState = () => JSON.stringify(state.current);
  const loadState = (data: string) => {
    try {
      const parsed: unknown = JSON.parse(data);
      if (!isVaporwareState(parsed)) return;
      state.current = parsed;
      syncUi(parsed);
    } catch {
      // Ignore corrupted local saves.
    }
  };

  const nextScreen = () => {
    const s = state.current;
    const rules = getVaporwareRules(s.level);
    const seed = Math.floor(s.elapsed * 10) + s.correct * 17 + s.level * 31;
    const index = (VAPOR_SCREENS.indexOf(s.screen) + 1 + (seed % 3)) % VAPOR_SCREENS.length;
    s.screen = VAPOR_SCREENS[index];
    s.screenTimer = 0;
    const span = rules.screenDurationMax - rules.screenDurationMin;
    s.screenDuration = rules.screenDurationMin + (((seed * 13) % 100) / 100) * span;
    s.progress = 0;
    s.textLines = [];
    s.assetName = pickDeterministic(ASSET_NAMES, seed);
  };

  const openPrompt = () => {
    const s = state.current;
    const rules = getVaporwareRules(s.level);
    const seed = Math.floor(s.elapsed * 100) + s.correct * 43 + s.level * 11;
    const action = pickDeterministic(VAPOR_ACTIONS, seed);
    s.prompt = {
      action,
      label: vaporActionLabel(action),
      openedAt: s.elapsed,
      expiresAt: s.elapsed + rules.promptWindow,
    };
    s.promptCooldown = rules.promptEveryMin + (((seed * 17) % 100) / 100) * (rules.promptEveryMax - rules.promptEveryMin);
    audio.playTone(780, 'square', 0.025, 0.05);
  };

  const failPrompt = (juice: GameCoreHandle) => {
    const s = state.current;
    s.prompt = null;
    s.lives -= 1;
    s.streak = 0;
    audio.playError();
    haptics.notificationError();
    juice.addShake(9);
    juice.addChromatic(16);
    juice.triggerHitStop(70);
    juice.emitParticles(50, 50, '#ff0055', 18);
    if (s.lives <= 0) {
      s.gameOver = true;
      updateStats('VAPORWARE', s.score, s.level);
      setGameOver(true);
    }
    syncUi(s);
  };

  const completePrompt = (juice: GameCoreHandle) => {
    const s = state.current;
    if (!s.prompt) return;
    const responseTime = Math.max(0, s.elapsed - s.prompt.openedAt);
    s.prompt = null;
    s.correct += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const speedBonus = Math.max(0, 200 - Math.round(responseTime * 120));
    s.score += 90 + speedBonus + s.streak * 12;
    audio.playSuccess();
    haptics.impactLight();
    juice.emitParticles(50, 50, '#00f3ff', 12);
    juice.addChromatic(s.streak >= 6 ? 5 : 2);
    if (s.correct >= s.targetCorrect) {
      s.exitOpen = true;
      s.exitTimer = 0;
      s.prompt = null;
      audio.playTone(1200, 'sine', 0.12, 0.18);
      haptics.notificationSuccess();
      juice.addShake(4);
      juice.addChromatic(10);
    }
    syncUi(s);
  };

  const escapeLoop = (juice: GameCoreHandle) => {
    const s = state.current;
    s.score += s.lives * 300 + s.bestStreak * 60;
    setScore(s.score);
    audio.playSuccess();
    haptics.notificationSuccess();
    juice.triggerHitStop(100);
    juice.addChromatic(18);
    juice.levelUp(s.level + 1, { score: s.score, itemsCollected: s.correct, bestCombo: s.bestStreak });
  };

  const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
    const s = state.current;
    if (s.gameOver) return;
    s.elapsed += dt;
    s.screenTimer += dt;
    s.progress = Math.min(1, s.screenTimer / Math.max(0.1, s.screenDuration));

    if (s.screenTimer >= s.screenDuration) nextScreen();

    if (s.screen === 'TERMINAL' && Math.floor(s.screenTimer * 8) > s.textLines.length && s.textLines.length < 8) {
      s.textLines.push(`> ${pickDeterministic(TERMINAL_LINES, s.textLines.length + s.level * 5)}`);
      audio.playKeystroke();
    }
    if (s.screen === 'ASSETS' && Math.floor(s.screenTimer * 5) % 2 === 0) {
      s.assetName = pickDeterministic(ASSET_NAMES, Math.floor(s.screenTimer * 7) + s.level * 3);
    }

    const action = detectAction(input);
    if (s.exitOpen) {
      s.exitTimer += dt;
      if (action === 'TAP' || action === 'UP') {
        escapeLoop(juice);
        s.exitOpen = false;
      }
      return;
    }

    if (s.prompt) {
      if (action) {
        if (action === s.prompt.action) completePrompt(juice);
        else failPrompt(juice);
      } else if (s.elapsed > s.prompt.expiresAt) failPrompt(juice);
    } else {
      s.promptCooldown -= dt;
      if (s.promptCooldown <= 0) openPrompt();
    }
  }, [updateStats]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const s = state.current;
    const w = (v: number) => width * v / 100;
    const h = (v: number) => height * v / 100;
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(0,243,255,0.06)';
    for (let x = 0; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

    const glitch = s.prompt ? Math.max(0, 1 - (s.prompt.expiresAt - s.elapsed) * 2) : 0;
    if (glitch > 0) {
      ctx.fillStyle = `rgba(255,0,85,${glitch * 0.07})`;
      for (let i = 0; i < 5; i += 1) ctx.fillRect(((i * 37 + s.level * 11) % 100) / 100 * width, ((i * 19 + Math.floor(s.elapsed * 20)) % 100) / 100 * height, w(18 + i * 3), 2);
    }

    ctx.save();
    if (s.screen === 'LOGO') {
      const studio = pickDeterministic([...FAKE_STUDIOS], s.level + Math.floor(s.screenTimer));
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 14; ctx.font = 'bold 24px monospace'; ctx.fillText(studio[0], cx, cy - 22);
      ctx.shadowBlur = 0; ctx.fillStyle = '#00f3ff'; ctx.font = '11px monospace'; ctx.fillText(studio[1], cx, cy + 5);
    } else if (s.screen === 'TERMINAL') {
      ctx.textAlign = 'left'; ctx.fillStyle = '#00ff88'; ctx.font = '11px monospace';
      s.textLines.forEach((line, index) => ctx.fillText(line, w(8), h(20) + index * 18));
      ctx.fillStyle = '#00f3ff'; ctx.fillRect(w(8), h(20) + s.textLines.length * 18 + 4, 9, 2);
    } else if (s.screen === 'ASSETS') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#00f3ff'; ctx.font = '10px monospace'; ctx.fillText('CACHING_ASSETS...', cx, cy - 28);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 7; ctx.font = 'bold 13px monospace'; ctx.fillText(s.assetName, cx, cy);
      ctx.shadowBlur = 0;
    } else if (s.screen === 'SHADER') {
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText(`WARMING_PIPELINE [${Math.floor(s.progress * 8192)}]`, w(7), h(80));
      for (let i = 0; i < 24; i += 1) {
        ctx.fillStyle = i / 24 < s.progress ? '#00f3ff' : '#07191d';
        ctx.fillRect(i * width / 24, h(84), width / 24 - 2, h(2.4));
      }
    } else if (s.screen === 'SERVER') {
      ctx.translate(cx, cy - 15); ctx.rotate(s.elapsed * 2);
      ctx.strokeStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 12; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i <= 6; i += 1) { const a = i / 6 * Math.PI * 2; const r = 28; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center'; ctx.shadowBlur = 0; ctx.fillStyle = '#00f3ff'; ctx.font = '11px monospace'; ctx.fillText('ESTABLISHING_UPLINK...', cx, cy + 40);
    } else if (s.screen === 'BIOS') {
      ctx.textAlign = 'left'; ctx.fillStyle = '#00f3ff'; ctx.font = '11px monospace';
      ['NEURO_BIOS v9.4', 'CPU: UNKNOWN @ 99GHz', 'RAM: 1048576K OK', 'PRIM_MASTER: CORRUPT', 'BOOT_NET...', 'PXE-E53: NO_BOOT'].forEach((line, i) => ctx.fillText(`> ${line}`, w(8), h(20) + i * 20));
    } else if (s.screen === 'UPDATE') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 15; ctx.font = 'bold 44px monospace'; ctx.fillText(`${Math.floor(s.progress * 99)}%`, cx, cy);
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText('SYSTEM_PATCHING...', cx, cy + 35);
    } else if (s.screen === 'EULA') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#00f3ff'; ctx.font = 'bold 15px monospace'; ctx.fillText('NEURO_CONTRACT_V9', cx, h(17));
      ctx.fillStyle = '#17434a'; ctx.font = '10px monospace';
      ['YOUR_SOUL_IS_OURS.', 'BUGS = MECHANICS.', 'NO_REFUNDS.', 'DATA_SOLD_TO_ALIENS.', 'AUTO_ACCEPTING_TERMS...'].forEach((line, i) => ctx.fillText(line, cx, h(33) + i * 24));
    } else if (s.screen === 'INSTALL') {
      ctx.strokeStyle = '#00f3ff'; ctx.strokeRect(w(15), h(25), w(70), h(45));
      ctx.fillStyle = '#001a1f'; ctx.fillRect(w(15), h(25), w(70), h(7));
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '11px monospace'; ctx.fillText('INSTALLING DEFINITELY_FINAL_BUILD...', cx, h(46));
    } else if (s.screen === 'LOBBY') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.fillText('MATCHMAKING', cx, cy - 30);
      ctx.fillStyle = '#00f3ff'; ctx.font = '11px monospace'; ctx.fillText(`SEARCH_RANGE ${(s.progress * 9999).toFixed(0)}ms`, cx, cy + 4);
      ctx.fillStyle = '#ff0055'; ctx.fillText('PLAYERS_FOUND: 0', cx, cy + 32);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,243,255,0.35)'; ctx.strokeRect(w(8), h(88), w(84), h(1.2));
    ctx.fillStyle = '#00f3ff'; ctx.fillRect(w(8), h(88), w(84) * s.progress, h(1.2));

    if (s.prompt) {
      const remaining = Math.max(0, (s.prompt.expiresAt - s.elapsed) / Math.max(0.01, s.prompt.expiresAt - s.prompt.openedAt));
      ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(w(13), h(38), w(74), h(24));
      ctx.strokeStyle = remaining < 0.35 ? '#ff0055' : '#f3ff00'; ctx.lineWidth = 2; ctx.strokeRect(w(13), h(38), w(74), h(24));
      ctx.textAlign = 'center'; ctx.fillStyle = remaining < 0.35 ? '#ff0055' : '#f3ff00'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16; ctx.font = 'bold 20px monospace'; ctx.fillText(s.prompt.label, cx, cy + 5);
      ctx.shadowBlur = 0; ctx.fillRect(w(18), h(57), w(64) * remaining, h(1.2));
    }

    if (s.exitOpen) {
      const pulse = 0.55 + Math.sin(s.exitTimer * 8) * 0.25;
      ctx.fillStyle = `rgba(0,255,136,${0.08 + pulse * 0.08})`; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 22; ctx.lineWidth = 3; ctx.strokeRect(w(18), h(33), w(64), h(34));
      ctx.textAlign = 'center'; ctx.fillStyle = '#00ff88'; ctx.font = 'bold 28px monospace'; ctx.fillText('EXIT NODE FOUND', cx, cy - 5);
      ctx.font = 'bold 12px monospace'; ctx.fillText('[ TAP TO ESCAPE ]', cx, cy + 25); ctx.shadowBlur = 0;
    }

    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#dffcff'; ctx.fillText(`LIVES ${s.lives}`, 12, 18);
    ctx.textAlign = 'center'; ctx.fillStyle = s.streak >= 5 ? '#f3ff00' : '#00f3ff'; ctx.fillText(`STREAK x${s.streak}`, cx, 18);
    ctx.textAlign = 'right'; ctx.fillStyle = '#dffcff'; ctx.fillText(`BREACH ${s.correct}/${s.targetCorrect}`, width - 12, 18);
  }, []);

  const instructions = useMemo(() => [
    'THE LOADING LOOP IS HOSTILE. WATCH FOR YELLOW COMMAND WINDOWS.',
    'RESPOND WITH THE EXACT TAP OR SWIPE BEFORE THE TIMER EXPIRES.',
    'WRONG INPUT OR TIMEOUT COSTS A LIFE AND BREAKS YOUR STREAK.',
    'COMPLETE THE REQUIRED BREACHES TO REVEAL THE GREEN EXIT NODE.',
    'EACH LOOP GETS FASTER, LESS FORGIVING AND MORE VISUALLY CORRUPTED.',
  ], []);

  return <GameCore
    gameId="VAPORWARE"
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
