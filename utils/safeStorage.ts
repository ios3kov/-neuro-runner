import type { StateStorage } from 'zustand/middleware';

/** Storage is optional: private mode/quota failures must not break navigation. */
export function createSafeStorage(resolve: () => Storage): StateStorage {
  const written = new Map<string, string>();
  return {
    getItem(key) {
      try { const value = resolve().getItem(key); if (value !== null) written.set(key, value); return value; }
      catch { return null; }
    },
    setItem(key, value) {
      // Zustand persists on every set, including transient logs; avoid duplicate disk writes.
      if (written.get(key) === value) return;
      try { resolve().setItem(key, value); written.set(key, value); } catch { /* Session remains usable in memory. */ }
    },
    removeItem(key) { written.delete(key); try { resolve().removeItem(key); } catch { /* Storage unavailable. */ } }
  };
}
export const safeStorage = createSafeStorage(() => globalThis.localStorage);
