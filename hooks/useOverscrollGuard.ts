import { useCallback, useMemo } from 'react';

/**
 * Provides a touch handler to prevent iOS/Telegram overscroll behavior.
 * 
 * Telegram Mini Apps on iOS often close or refresh when dragging the scrollable area
 * past its boundaries (rubber banding). By ensuring the scrollTop is never exactly 0 
 * or exactly at the bottom before a touch move starts, we trap the scroll event 
 * within the container, preventing the event from bubbling to the WebView wrapper.
 * 
 * Returns a stable, memoized object to be spread onto scrollable containers.
 */
export const useOverscrollGuard = () => {
    const onTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
        const el = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = el;

        // Only apply if content overflows and is scrollable
        if (scrollHeight > clientHeight) {
            // If at top, move 1px down to prevent pulling down the refresh/close gesture
            if (scrollTop <= 0) {
                el.scrollTop = 1;
            }
            // If at bottom, move 1px up to prevent pulling up the close gesture
            else if (scrollTop + clientHeight >= scrollHeight) {
                el.scrollTop = scrollHeight - clientHeight - 1;
            }
        }
    }, []);

    // Return a stable object reference to prevent unnecessary re-renders in consumers
    return useMemo(() => ({ 
        onTouchStart,
        // Optional: enforces strict touch behavior via style if not already handled by CSS class
        style: { touchAction: 'pan-y' as const } 
    }), [onTouchStart]);
};
