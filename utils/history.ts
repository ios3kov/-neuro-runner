import type { GameStats, PlayerData } from '../types';
import { isRecord, safeCounter } from '../state/coreUtils';
import { normalizeGameProgress } from './progress';

/** Keep legacy scores without trusting persisted object shapes or executable fields. */
export function sanitizeHistory(raw: unknown): PlayerData {
  const source = isRecord(raw) ? raw : {};
  const entries = isRecord(source.stats) ? Object.entries(source.stats) : [];
  const stats: Record<string, GameStats> = Object.fromEntries(entries.filter(([id, value]) => /^[A-Z0-9_]{1,64}$/i.test(id) && !['__proto__','constructor','prototype'].includes(id) && isRecord(value)).map(([id, raw]) => {
    const value = raw as Record<string, unknown>;
    return [id, { id, plays: safeCounter(value.plays), highScore: safeCounter(value.highScore), lastPlayed: safeCounter(value.lastPlayed), maxLevelReached: Math.max(1, safeCounter(value.maxLevelReached)) }];
  }));
  return { stats, gameProgress: normalizeGameProgress(source.gameProgress), achievements: Array.isArray(source.achievements) ? [...new Set(source.achievements.filter((id): id is string => typeof id === 'string' && id.length <= 100))] : [] };
}
