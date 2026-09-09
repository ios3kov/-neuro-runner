
type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

class HapticEngine {
  private enabled: boolean = true;
  private isMobile: boolean = false;
  private lastTriggerTime: Record<string, number> = {};

  // Rate limits in ms - tuned to prevent "rattle"
  private readonly LIMITS = {
    selection: 50,      // Reduced to 50ms (20Hz) for snappier keyboard navigation
    impactLight: 150,   // Prevent typing vibration fatigue
    impactMedium: 200,
    impactHeavy: 400,
    notification: 500
  };

  constructor() {
    // Detect mobile environment
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      const ua = navigator.userAgent || '';
      const platform = tg?.platform || '';
      
      this.isMobile = 
        platform === 'android' || 
        platform === 'ios' || 
        /Android|iPhone|iPad|iPod/i.test(ua);
    }
  }

  setEnabled(val: boolean) {
    this.enabled = val;
  }

  /**
   * Internal rate limiter
   */
  private canTrigger(key: string, limit: number): boolean {
    if (!this.enabled) return false; // Strict check against user setting
    
    // On desktop, we might skip haptics entirely or just log, but here we generally allow logic to flow
    // The actual vibrate call only happens if navigator.vibrate exists or TG bridge exists.
    
    const now = Date.now();
    const last = this.lastTriggerTime[key] || 0;
    
    if (now - last < limit) return false;
    
    this.lastTriggerTime[key] = now;
    return true;
  }

  /**
   * Trigger Telegram Impact Haptic or fallback
   */
  private triggerImpact(style: HapticStyle) {
    if (!this.enabled) return;

    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg) {
      tg.impactOccurred(style);
    } else if (this.isMobile && navigator.vibrate) {
      // Fallback patterns
      switch (style) {
        case 'light': navigator.vibrate(5); break;
        case 'medium': navigator.vibrate(10); break;
        case 'heavy': navigator.vibrate(20); break;
        case 'rigid': navigator.vibrate(8); break;
        case 'soft': navigator.vibrate(4); break;
      }
    }
  }

  /**
   * Trigger Telegram Notification Haptic or fallback
   */
  private triggerNotification(type: NotificationType) {
    if (!this.enabled) return;

    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg) {
      tg.notificationOccurred(type);
    } else if (this.isMobile && navigator.vibrate) {
      // Fallback patterns
      switch (type) {
        case 'success': navigator.vibrate([10, 30, 10]); break;
        case 'warning': navigator.vibrate([20, 50]); break;
        case 'error': navigator.vibrate([50, 50, 50]); break;
      }
    }
  }

  // --- PUBLIC API ---

  // UI Navigation / Focus change
  selection() {
    if (!this.canTrigger('selection', this.LIMITS.selection)) return;
    
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg) tg.selectionChanged();
    else if (this.isMobile && navigator.vibrate) navigator.vibrate(2);
  }

  // Tap, Type, Small interaction
  impactLight() {
    if (!this.canTrigger('impactLight', this.LIMITS.impactLight)) return;
    this.triggerImpact('light');
  }

  // Game hit, standard interaction
  impactMedium() {
    if (!this.canTrigger('impactMedium', this.LIMITS.impactMedium)) return;
    this.triggerImpact('medium');
  }

  // Damage, Crash, Large interaction
  impactHeavy() {
    if (!this.canTrigger('impactHeavy', this.LIMITS.impactHeavy)) return;
    this.triggerImpact('heavy');
  }

  notificationSuccess() {
    if (!this.canTrigger('notification', this.LIMITS.notification)) return;
    this.triggerNotification('success');
  }

  notificationError() {
    if (!this.canTrigger('notification', this.LIMITS.notification)) return;
    this.triggerNotification('error');
  }

  notificationWarning() {
    if (!this.canTrigger('notification', this.LIMITS.notification)) return;
    this.triggerNotification('warning');
  }
}

export const haptics = new HapticEngine();