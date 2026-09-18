import { DEFAULT_SETTINGS } from './coreConfig';
import { isRecord, normalizeExpanded, safeCounter } from './coreUtils';
import { VALID_VIEW_MODES, type UserSession, type ViewMode } from '../types';

export function sanitizeCore(raw: unknown) {
  const source = isRecord(raw) ? raw : {};
  const user = isRecord(source.user) ? source.user : {};
  const settings = isRecord(user.settings) ? user.settings : {};
  const normalizedSettings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof UserSession['settings'])[]) {
    if (typeof settings[key] === 'boolean') normalizedSettings[key] = settings[key] as boolean;
  }
  return {
    user: {
      username: (typeof user.username === 'string' ? user.username.trim().slice(0, 32) : '') || 'User',
      settings: normalizedSettings,
      omniAttempts: safeCounter(user.omniAttempts),
      omniDeleted: user.omniDeleted === true,
      omniIteration: safeCounter(user.omniIteration)
    },
    viewMode: typeof source.viewMode === 'string' && VALID_VIEW_MODES.includes(source.viewMode as ViewMode) ? source.viewMode as ViewMode : 'GRID' as ViewMode,
    expandedNodes: normalizeExpanded(source.expandedNodes)
  };
}
