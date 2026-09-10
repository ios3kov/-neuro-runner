

export enum AppState {
  BOOT = 'BOOT',
  LOGIN = 'LOGIN',
  DESKTOP = 'DESKTOP',
  GAME = 'GAME',
  SETTINGS = 'SETTINGS'
}

export enum LogLevel {
  SYS = 'SYS',
  INFO = 'INFO',
  WARN = 'WARN',
  ERR = 'ERR',
  SUCCESS = 'OK'
}

export type ViewMode = 'GRID' | 'LIST' | 'TREE';
export const VALID_VIEW_MODES = ['GRID', 'LIST', 'TREE'] as const;

export type SuspendReason = 'LANDSCAPE' | 'BACKGROUND' | 'PAGEHIDE';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

// --- DOMAIN: GAME DATA ---

export interface GameStats {
  id: string;
  plays: number;
  highScore: number;
  lastPlayed: number;
  maxLevelReached: number;
}

export type LevelState = 'LOCKED' | 'UNLOCKED' | 'COMPLETED' | 'PERFECT';

export type GoalType = 
  | 'score_at_least' 
  | 'survive_seconds' 
  | 'collect_items' 
  | 'destroy_targets' 
  | 'finish_level';

export interface GoalSpec {
  id: string;
  type: GoalType;
  required: boolean;
  target: number;
  label: string;
}

export interface LevelSpec {
  levelId: string;
  index: number;
  name: string;
  description: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';
  goals: GoalSpec[];
  unlocksOnComplete?: string[]; // IDs of levels to unlock
}

export interface GameConfig {
  gameId: string;
  title: string;
  levels: LevelSpec[];
  skipLevelSelect?: boolean;
}

export interface LevelResult {
  gameId: string;
  levelId: string;
  status: 'COMPLETED' | 'PERFECT' | 'FAILED' | 'UNLOCKED';
  score: number;
  durationMs: number;
  goalsCompleted: Record<string, boolean>; // goalId -> completed
  timestamp: number;
}

export interface LevelProgress {
  state: LevelState;
  bestScore: number;
  bestTimeMs: number;
  timesPlayed: number;
}

export interface GameProgress {
  levels: Record<string, LevelProgress>;
  unlockedLevels: string[]; // List of levelIds
}

export type GameId = 'SNAKE' | 'PONG' | 'BREAKOUT' | 'ASTEROIDS' | 'DRIFT' | 'DEFENDER' | 'SETTINGS' | 'AI_CHAT' | 'RUNNER' | 'VAPORWARE' | 'CROSSWIRE';

// --- SYSTEM: USER SESSION ---

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  showHidden: boolean;
  hapticsEnabled: boolean; // Tri-state in logic (undefined = true), strict boolean here
  lowPowerMode: boolean;
}

export interface UserSession {
  username: string;
  sessionToken: string; // Transient
  sessionStartTime: number | null; // Transient
  omniAttempts: number; 
  omniDeleted: boolean; 
  omniIteration: number; 
  settings: UserSettings;
}

export interface PlayerData {
  stats: Record<string, GameStats>;
  gameProgress: Record<string, GameProgress>;
  achievements: string[];
}

export interface FileNode {
  id: string;
  name: string;
  type: 'FOLDER' | 'EXE';
  children?: FileNode[];
  gameId?: GameId;
  description?: string;
  isPasswordProtected?: boolean;
  isHidden?: boolean;
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

export interface JuiceState {
  shake: number;
  chromaticAberration: number;
  hitStop: number;
}