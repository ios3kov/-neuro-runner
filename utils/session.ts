/**
 * Generates a display-only session identifier for the local UI.
 * This is not an authentication credential and must never be used for server authorization.
 */
export const createDisplaySessionToken = (): string => {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  const fallback = Math.floor(Math.random() * 0xffffffff);
  return fallback.toString(16).padStart(8, '0').toUpperCase();
};
