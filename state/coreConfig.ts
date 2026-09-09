import type { UserSession } from '../types';

export const CORE_STORE_CONSTANTS = {
  MAX_EXPANDED: 300,
  MAX_PATH_DEPTH: 50,
  MAX_ID_LEN: 64,
  ROOT_ID: 'root',
  LOG_LIMIT: 50,
} as const;

export const DEFAULT_SETTINGS: UserSession['settings'] = {
  soundEnabled: true,
  musicEnabled: true,
  showHidden: true,
  hapticsEnabled: true,
  lowPowerMode: false,
};

export type ModalType = 'NONE' | 'AUTH' | 'STATS' | 'EXIT_CONFIRM';
