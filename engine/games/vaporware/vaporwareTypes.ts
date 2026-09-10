export type VaporAction = 'TAP' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
export type VaporScreen = 'LOGO' | 'TERMINAL' | 'ASSETS' | 'SHADER' | 'SERVER' | 'BIOS' | 'UPDATE' | 'EULA' | 'INSTALL' | 'LOBBY';

export interface VaporPrompt {
  action: VaporAction;
  label: string;
  openedAt: number;
  expiresAt: number;
}

export interface VaporwareState {
  level: number;
  score: number;
  lives: number;
  correct: number;
  targetCorrect: number;
  streak: number;
  bestStreak: number;
  screen: VaporScreen;
  screenTimer: number;
  screenDuration: number;
  progress: number;
  prompt: VaporPrompt | null;
  promptCooldown: number;
  textLines: string[];
  assetName: string;
  elapsed: number;
  exitOpen: boolean;
  exitTimer: number;
  gameOver: boolean;
}

export interface VaporwareRules {
  level: number;
  targetCorrect: number;
  lives: number;
  screenDurationMin: number;
  screenDurationMax: number;
  promptWindow: number;
  promptEveryMin: number;
  promptEveryMax: number;
}
