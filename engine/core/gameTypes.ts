export interface GameCoreHandle {
  addShake: (amount: number) => void;
  triggerHitStop: (ms: number) => void;
  addChromatic: (amount: number) => void;
  emitParticles: (x: number, y: number, color: string, count: number) => void;
  levelUp: (level: number, metrics?: Record<string, number>) => void;
}

export interface InputState {
  keys: Set<string>;
  swipeDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;
  touchX: number;
  touchY: number;
  touchDeltaX: number;
  touchDeltaY: number;
  isTouching: boolean;
  tapDetected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export type GameState =
  | 'INIT_LOADING'
  | 'LEVEL_SELECT'
  | 'LOADING'
  | 'BRIEFING'
  | 'WAITING_TO_START'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAMEOVER'
  | 'LEVEL_COMPLETE';
