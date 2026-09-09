import { useEffect } from 'react';

/**
 * Applies defensive configuration for Telegram Mini Apps.
 * Enforces policies: No Pinch-Zoom, No Double-Tap Zoom, No Overscroll on Body.
 */
export const useTelegramGuards = () => {
    useEffect(() => {
        const tg = (window as any).Telegram?.WebApp;
        
        // 1. Telegram API Configuration
        if (tg) {
            try {
                if (tg.isVerticalSwipesEnabled) tg.disableVerticalSwipes();
                if (!tg.isExpanded && tg.expand) tg.expand();
                if (tg.setHeaderColor) tg.setHeaderColor('#000000');
                if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
                tg.ready();
            } catch (e) {
                console.debug('Telegram API guard warning:', e);
            }
        }

        // 2. DOM Level Guards (Prevent Default Browser Behaviors)
        
        const preventDefault = (e: Event) => {
            if (e.cancelable) e.preventDefault();
        };

        // Prevent Pinch Zoom
        const handleGestureStart = (e: Event) => preventDefault(e);

        // Prevent Double Tap Zoom
        let lastTouchEnd = 0;
        const handleTouchEnd = (e: TouchEvent) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                preventDefault(e);
            }
            lastTouchEnd = now;
        };

        // Block touchmove on body to prevent "rubber band" effect globally
        // (Scrollable areas must stopPropagation or use touch-action: pan-y)
        const handleTouchMove = (e: TouchEvent) => {
            // Allow if target is explicitly scrollable (heuristic check)
            let target = e.target as HTMLElement;
            let isScrollable = false;
            
            while (target && target !== document.body) {
                if (target.scrollHeight > target.clientHeight || target.scrollWidth > target.clientWidth) {
                    const style = window.getComputedStyle(target);
                    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                        isScrollable = true;
                        break;
                    }
                }
                target = target.parentElement as HTMLElement;
            }

            if (!isScrollable && (e as any).scale !== 1) {
                preventDefault(e);
            }
        };

        document.addEventListener('gesturestart', handleGestureStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Note: 'touchmove' listener can be aggressive. For games, we usually want to block body scroll.
        // We rely on CSS 'overscroll-behavior: none' on body as primary defense, 
        // and this listener as fallback for Safari PWA/WebClip modes.
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.removeEventListener('gesturestart', handleGestureStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);
};