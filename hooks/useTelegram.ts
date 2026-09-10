import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { AppState } from '../types';

export interface TelegramOptions {
    orientation?: boolean;
    backButton?: boolean;
    closingConfirmation?: boolean;
}

// Stable default object to avoid effect re-triggering
const DEFAULT_OPTS: Required<TelegramOptions> = {
    orientation: true,
    backButton: true,
    closingConfirmation: true
};

export const useTelegram = (options: TelegramOptions = DEFAULT_OPTS) => {
    const appState = useStore((s) => s.appState);
    const [isLandscape, setIsLandscape] = useState(false);
    
    // Ref to track if options actually changed (deep check optimization if needed, 
    // but here we just rely on the stable reference passed or default)
    const opts = { ...DEFAULT_OPTS, ...options };

    // --- ORIENTATION LOCK & LANDSCAPE BLOCKER ---
    useEffect(() => {
        if (!opts.orientation) return;

        const handleOrientation = () => {
            const tg = window.Telegram?.WebApp;
            const platform = tg?.platform || 'unknown';
            
            // Filter for strict mobile platforms (Android/iOS)
            const isMobile = 
                platform === 'android' || 
                platform === 'ios' || 
                ((!tg || platform === 'unknown') && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

            const isLand = window.matchMedia('(orientation: landscape)').matches;
            
            setIsLandscape(isMobile && isLand);

            if (tg && isMobile) {
                // Orientation Lock only on mobile
                if (!isLand && tg.lockOrientation) {
                    tg.lockOrientation();
                }
            }
        };

        // Initial Check
        handleOrientation();

        // Listeners
        const mq = window.matchMedia('(orientation: landscape)');
        const mqHandler = (e: MediaQueryListEvent) => {
            handleOrientation();
        };

        mq.addEventListener('change', mqHandler);
        window.addEventListener('resize', handleOrientation);

        return () => {
            mq.removeEventListener('change', mqHandler);
            window.removeEventListener('resize', handleOrientation);
        };
    }, [opts.orientation]);

    // --- NATIVE CLOSING CONFIRMATION SYNC ---
    useEffect(() => {
        if (!opts.closingConfirmation) return;

        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        // Enable native closing confirmation when logged in
        if (appState === AppState.BOOT || appState === AppState.LOGIN) {
            if (tg.disableClosingConfirmation) tg.disableClosingConfirmation();
        } else {
            if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
        }
    }, [appState, opts.closingConfirmation]);

    // --- BACK BUTTON HANDLING ---
    useEffect(() => {
        if (!opts.backButton) return;

        const tg = window.Telegram?.WebApp;
        
        const handleBackBtn = () => {
            // Unified Back Dispatcher
            useStore.getState().handleGoBack();
        };

        if (tg) tg.onEvent('backButtonClicked', handleBackBtn);

        // Subscribe to store updates for Button Visibility logic
        const updateVisibility = () => {
            if (!tg) return;
            const state = useStore.getState();
            
            // Show Back Button if:
            // 1. In Game or Settings
            // 2. Overlay is open (Auth, Stats, Exit)
            // 3. File Viewer is open
            // 4. Navigation depth > 1
            
            const shouldShow = 
                state.appState === AppState.GAME || 
                state.appState === AppState.SETTINGS ||
                state.activeModal !== 'NONE' ||
                state.openedFileId !== null ||
                state.navigationPath.length > 1;

            if (shouldShow) tg.BackButton.show(); else tg.BackButton.hide();
        };

        const unsub = useStore.subscribe(updateVisibility);
        updateVisibility(); // Initial check

        return () => {
            if (tg) tg.offEvent('backButtonClicked', handleBackBtn);
            unsub();
        };
    }, [opts.backButton]);

    return { isLandscape };
};