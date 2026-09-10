import type { SnakeLevelProfile, SnakeStageTheme, SnakeState } from './snakeTypes';
import { SNAKE_MAX_LEVEL } from './snakeTypes';

export const snakeLevelTarget = (level: number) => Math.min(15, 8 + Math.floor((level - 1) / 4));

export const getSnakeProfile = (level: number): SnakeLevelProfile => {
  const safeLevel = Math.max(1, Math.min(SNAKE_MAX_LEVEL, level));
  let theme: SnakeStageTheme = 'TRAINING';
  if (safeLevel >= 4) theme = 'FIREWALL';
  if (safeLevel >= 7) theme = 'MALWARE';
  if (safeLevel >= 10) theme = 'VPN';
  if (safeLevel >= 13) theme = 'COMPRESSION';
  if (safeLevel >= 16) theme = 'TWO_FA';
  if (safeLevel >= 19) theme = 'OVERCLOCK';
  if (safeLevel >= 22) theme = 'GAUNTLET';
  if (safeLevel === SNAKE_MAX_LEVEL) theme = 'CORE';

  const labels: Record<SnakeStageTheme, string> = {
    TRAINING: 'PACKET TRAINING',
    FIREWALL: 'FIREWALL GRID',
    MALWARE: 'MALWARE STREAM',
    VPN: 'VPN ROUTING',
    COMPRESSION: 'ZIP PROTOCOL',
    TWO_FA: '2FA VAULT',
    OVERCLOCK: 'OVERCLOCK RING',
    GAUNTLET: 'MIXED THREATS',
    CORE: 'ROOT CORE',
  };

  return {
    level: safeLevel,
    theme,
    target: snakeLevelTarget(safeLevel),
    // The floor deliberately preserves a usable swipe reaction window even when
    // OVERCLOCK applies the game's existing 0.62 speed multiplier.
    tick: Math.max(0.076, 0.13 - (safeLevel - 1) * 0.00225),
    // Firewall state changes stay readable on compact phone canvases.
    firewallPeriod: Math.max(1.8, 3.55 - safeLevel * 0.065),
    virusChance: safeLevel < 7 ? 0 : Math.min(0.16, 0.055 + (safeLevel - 7) * 0.0055),
    zipChance: safeLevel < 13 ? 0 : Math.min(0.12, 0.05 + (safeLevel - 13) * 0.004),
    twoFactor: safeLevel >= 16,
    label: labels[theme],
  };
};

export const createInitialSnakeState = (): SnakeState => ({
  snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: { x: 15, y: 10, type: 'DATA' },
  keyItem: null,
  walls: [],
  gates: [],
  tunnels: [],
  zones: [],
  timer: 0,
  score: 0,
  level: 1,
  target: snakeLevelTarget(1),
  itemsCollected: 0,
  gameOver: false,
  completed: false,
  sandbox: false,
  firewallTimer: 0,
  firewallPhaseTime: 3,
  virusEffect: 'NONE',
  virusTimer: 0,
  hasKey: false,
  inOverclock: false,
  overclockScoreTimer: 0,
  animTime: 0,
  history: [],
  combo: 0,
  comboTimer: 0,
  bestCombo: 0,
});
