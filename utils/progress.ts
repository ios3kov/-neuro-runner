import { GameProgress, LevelProgress, LevelState } from '../types';
import { GAME_CONFIGS } from '../data/gameConfig';
import { isRecord } from '../state/coreUtils';

const VALID_LEVEL_STATES = new Set<LevelState>(['LOCKED', 'UNLOCKED', 'COMPLETED', 'PERFECT']);

export const STATE_PRIORITY: Record<LevelState, number> = {
  LOCKED: 0,
  UNLOCKED: 1,
  COMPLETED: 2,
  PERFECT: 3,
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : fallback;
};

const toNonNegInt = (value: unknown, fallback = 0): number =>
  Math.floor(Math.max(0, toFiniteNumber(value, fallback)));

export const sanitizeLevelProgress = (data: unknown, isKnownUnlocked: boolean): LevelProgress => {
  const record = isRecord(data) ? data : {};
  const safeScore = toNonNegInt(record.bestScore, 0);
  const safeTime = toNonNegInt(record.bestTimeMs, 0);
  const safePlays = toNonNegInt(record.timesPlayed, 0);
  const hasProgressData = safeScore > 0 || safeTime > 0 || safePlays > 0;

  let state: LevelState = 'LOCKED';
  if (typeof record.state === 'string' && VALID_LEVEL_STATES.has(record.state as LevelState)) {
    state = record.state as LevelState;
  } else {
    state = isKnownUnlocked || hasProgressData ? 'UNLOCKED' : 'LOCKED';
  }

  return {
    state,
    bestScore: safeScore,
    bestTimeMs: safeTime,
    timesPlayed: safePlays,
  };
};

export const sanitizeGameProgress = (gameId: string, raw: unknown): GameProgress => {
  const config = GAME_CONFIGS[gameId];
  if (!config) return { levels: {}, unlockedLevels: [] };

  const configLevelIds = new Set(config.levels.map((level) => level.levelId));
  const level1Id = `${gameId}_1`;
  const record = isRecord(raw) ? raw : {};
  const rawLevels = isRecord(record.levels) ? record.levels : {};
  const rawUnlocked = Array.isArray(record.unlockedLevels) ? record.unlockedLevels : [];

  const nextLevels: Record<string, LevelProgress> = {};
  const nextUnlocked = new Set<string>();

  for (const id of rawUnlocked) {
    if (typeof id === 'string' && configLevelIds.has(id)) nextUnlocked.add(id);
  }

  for (const [levelId, rawLevel] of Object.entries(rawLevels)) {
    if (!configLevelIds.has(levelId)) continue;
    const clean = sanitizeLevelProgress(rawLevel, nextUnlocked.has(levelId));
    nextLevels[levelId] = clean;
    if (clean.state === 'LOCKED') nextUnlocked.delete(levelId);
    else nextUnlocked.add(levelId);
  }

  if (configLevelIds.has(level1Id)) {
    nextUnlocked.add(level1Id);
    if (!nextLevels[level1Id] || nextLevels[level1Id].state === 'LOCKED') {
      nextLevels[level1Id] = { state: 'UNLOCKED', bestScore: 0, bestTimeMs: 0, timesPlayed: 0 };
    }
  }

  for (const levelId of nextUnlocked) {
    if (!nextLevels[levelId]) {
      nextLevels[levelId] = { state: 'UNLOCKED', bestScore: 0, bestTimeMs: 0, timesPlayed: 0 };
    }
  }

  return {
    levels: nextLevels,
    unlockedLevels: config.levels.map((level) => level.levelId).filter((id) => nextUnlocked.has(id)),
  };
};

export const normalizeGameProgress = (rawProgress: unknown): Record<string, GameProgress> => {
  const safeProgress: Record<string, GameProgress> = {};
  const raw = isRecord(rawProgress) ? rawProgress : {};

  for (const gameId of Object.keys(GAME_CONFIGS)) {
    safeProgress[gameId] = sanitizeGameProgress(gameId, raw[gameId]);
  }

  return safeProgress;
};
