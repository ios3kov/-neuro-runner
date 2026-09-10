import { CORE_STORE_CONSTANTS } from './coreConfig';

const ID_REGEX = /^[a-zA-Z0-9_.-]+$/;

export const isValidId = (id: unknown): id is string =>
  typeof id === 'string' &&
  id.length > 0 &&
  id.length <= CORE_STORE_CONSTANTS.MAX_ID_LEN &&
  ID_REGEX.test(id);

export const safeCounter = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;

export const normalizePath = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [CORE_STORE_CONSTANTS.ROOT_ID];

  const validIds = raw.filter(
    (id): id is string => isValidId(id) && id !== CORE_STORE_CONSTANTS.ROOT_ID,
  );
  const deduped = validIds.filter(
    (item, index, items) => index === 0 || item !== items[index - 1],
  );

  return [CORE_STORE_CONSTANTS.ROOT_ID, ...deduped].slice(
    0,
    CORE_STORE_CONSTANTS.MAX_PATH_DEPTH,
  );
};

export const normalizeExpanded = (raw: unknown): string[] => {
  const list = Array.isArray(raw) ? raw.filter(isValidId) : [];
  const ids = new Set(list);
  ids.add(CORE_STORE_CONSTANTS.ROOT_ID);

  if (ids.size > CORE_STORE_CONSTANTS.MAX_EXPANDED) {
    ids.delete(CORE_STORE_CONSTANTS.ROOT_ID);
    return [
      CORE_STORE_CONSTANTS.ROOT_ID,
      ...Array.from(ids).slice(0, CORE_STORE_CONSTANTS.MAX_EXPANDED - 1),
    ];
  }

  return Array.from(ids);
};

export const reconcileExpanded = (current: string[], path: string[]): string[] => {
  const next = new Set(current);
  path.forEach((id) => next.add(id));
  return normalizeExpanded(Array.from(next));
};

export const generateRuntimeId = (): string =>
  Math.random().toString(36).slice(2, 11);

export const formatLogTimestamp = (): string =>
  new Date().toLocaleTimeString('en-US', { hour12: false });

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
