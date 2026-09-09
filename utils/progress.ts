import { GameProgress, LevelProgress, LevelState } from '../types';
import { GAME_CONFIGS } from '../data/gameConfig';

const VALID_LEVEL_STATES = new Set<LevelState>(['LOCKED', 'UNLOCKED', 'COMPLETED', 'PERFECT']);

export const STATE_PRIORITY: Record<LevelState, number> = {
    'LOCKED': 0,
    'UNLOCKED': 1,
    'COMPLETED': 2,
    'PERFECT': 3
};

// Safe number converter that handles strings, NaNs, and Infinity
const toFiniteNumber = (val: any, fallback = 0): number => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
};

// Consolidate non-negative integer conversion
const toNonNegInt = (val: any, fallback = 0): number =>
    Math.floor(Math.max(0, toFiniteNumber(val, fallback)));

export const sanitizeLevelProgress = (data: any, isKnownUnlocked: boolean): LevelProgress => {
    const safeScore = toNonNegInt(data?.bestScore, 0);
    const safeTime = toNonNegInt(data?.bestTimeMs, 0);
    const safePlays = toNonNegInt(data?.timesPlayed, 0);
    const hasProgressData = safeScore > 0 || safeTime > 0 || safePlays > 0;

    let state: LevelState = 'LOCKED';
    if (data && VALID_LEVEL_STATES.has(data.state)) {
        state = data.state as LevelState;
    } else {
        state = (isKnownUnlocked || hasProgressData) ? 'UNLOCKED' : 'LOCKED';
    }

    return {
        state,
        bestScore: safeScore,
        bestTimeMs: safeTime,
        timesPlayed: safePlays,
    };
};

export const sanitizeGameProgress = (gameId: string, raw: any): GameProgress => {
  const config = GAME_CONFIGS[gameId];
  if (!config) return { levels: {}, unlockedLevels: [] };

  const configLevelIds = new Set(config.levels.map(l => l.levelId));
  const level1Id = `${gameId}_1`;

  const rawLevels = (raw?.levels && typeof raw.levels === 'object' && !Array.isArray(raw.levels))
      ? raw.levels
      : {};
  
  const nextLevels: Record<string, LevelProgress> = {};
  const rawUnlocked = Array.isArray(raw?.unlockedLevels) ? raw.unlockedLevels : [];
  const nextUnlocked = new Set<string>();
  
  rawUnlocked.forEach((id: any) => {
      if (typeof id === 'string' && configLevelIds.has(id)) {
          nextUnlocked.add(id);
      }
  });

  Object.keys(rawLevels).forEach(lid => {
      if (configLevelIds.has(lid)) {
          const wasUnlockedByList = nextUnlocked.has(lid);
          const clean = sanitizeLevelProgress(rawLevels[lid], wasUnlockedByList);
          nextLevels[lid] = clean;
          
          if (clean.state === 'LOCKED') {
              nextUnlocked.delete(lid);
          } else {
              nextUnlocked.add(lid);
          }
      }
  });

  if (configLevelIds.has(level1Id)) {
      nextUnlocked.add(level1Id);
      if (!nextLevels[level1Id] || nextLevels[level1Id].state === 'LOCKED') {
          nextLevels[level1Id] = { state: 'UNLOCKED', bestScore: 0, bestTimeMs: 0, timesPlayed: 0 };
      }
  }

  nextUnlocked.forEach(lid => {
      if (!nextLevels[lid]) {
          nextLevels[lid] = { state: 'UNLOCKED', bestScore: 0, bestTimeMs: 0, timesPlayed: 0 };
      }
  });

  const orderedUnlocked = config.levels
      .map(l => l.levelId)
      .filter(id => nextUnlocked.has(id));

  return {
      levels: nextLevels,
      unlockedLevels: orderedUnlocked
  };
};

export const normalizeGameProgress = (rawProgress: any): Record<string, GameProgress> => {
    const safeProgress: Record<string, GameProgress> = {};
    const raw = rawProgress && typeof rawProgress === 'object' ? rawProgress : {};

    Object.keys(GAME_CONFIGS).forEach(gameId => {
        safeProgress[gameId] = sanitizeGameProgress(gameId, raw[gameId]);
    });

    return safeProgress;
};