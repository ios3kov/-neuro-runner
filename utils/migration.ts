import { useStore } from '../store';
import { useGameStore } from '../gameStore';
import { sanitizeCore } from '../state/persistedCore';
import { sanitizeHistory } from './history';

/** Legacy input is untrusted. Keep its original record as a rollback copy. */
export function performLegacyMigration() {
  try {
    const storage = globalThis.localStorage;
    if (!storage || storage.getItem('netrunner_migration_v1')) return;
    const raw = storage.getItem('netrunner-storage');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.state?.user || typeof parsed.state.user !== 'object') return;
    if (!storage.getItem('netrunner-game-storage')) useGameStore.setState(sanitizeHistory(parsed.state.user));
    if (!storage.getItem('netrunner-core-storage')) {
      const core = sanitizeCore(parsed.state);
      useStore.setState(state => ({ ...core, user: { ...state.user, ...core.user } }));
    }
    storage.setItem('netrunner_migration_v1', 'true');
  } catch { /* Invalid or inaccessible storage must not block a new local session. */ }
}
