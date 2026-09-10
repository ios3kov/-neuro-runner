// Browser extensions used by Neuro Runner.
interface DocumentEventMap {
  freeze: Event;
  resume: Event;
}

interface TelegramWebAppUser {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramBackButton {
  show(): void;
  hide(): void;
}

interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

interface TelegramWebApp {
  platform?: string;
  isExpanded?: boolean;
  isVerticalSwipesEnabled?: boolean;
  initDataUnsafe?: { user?: TelegramWebAppUser };
  BackButton: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  ready(): void;
  expand?(): void;
  lockOrientation?(): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  onEvent(event: string, callback: () => void): void;
  offEvent(event: string, callback: () => void): void;
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
  webkitAudioContext?: typeof AudioContext;
}

interface GestureEvent extends Event {
  readonly scale: number;
}
