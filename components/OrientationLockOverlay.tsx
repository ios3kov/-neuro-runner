
import React, { useEffect, useRef } from 'react';
import { Z_LAYERS } from '../constants/ui';
import { UI_STRINGS } from '../constants/strings';

interface OrientationLockOverlayProps {
    title?: string;
    message?: string;
    errorCode?: string;
}

export const OrientationLockOverlay: React.FC<OrientationLockOverlayProps> = ({
    title = UI_STRINGS.OVERLAY.TITLE,
    message = UI_STRINGS.OVERLAY.MESSAGE,
    errorCode = UI_STRINGS.OVERLAY.ERROR_CODE
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Aggressively capture input events on this specific layer using non-passive listeners
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const prevent = (e: Event) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
        };
        
        // Add non-passive listeners to guarantee default prevention (scroll/zoom)
        el.addEventListener('touchmove', prevent, { passive: false });
        el.addEventListener('wheel', prevent, { passive: false });
        el.addEventListener('gesturestart', prevent, { passive: false }); // iOS Pinch Zoom
        el.addEventListener('pointermove', prevent, { passive: false });
        
        return () => {
            el.removeEventListener('touchmove', prevent);
            el.removeEventListener('wheel', prevent);
            el.removeEventListener('gesturestart', prevent);
            el.removeEventListener('pointermove', prevent);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            role="alert"
            aria-live="assertive"
            className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 pt-safe pb-safe select-none animate-in fade-in duration-300" 
            style={{ 
                zIndex: Z_LAYERS.OVERLAY,
                touchAction: 'none',
                overscrollBehavior: 'none'
            }}
            // Synthetic event traps for good measure
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onScroll={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div className="w-24 h-24 border border-cyan-500/30 cyber-shape flex items-center justify-center mb-8 relative pointer-events-none">
                <div className="absolute inset-2 border border-cyan-500/10 cyber-shape animate-ping"></div>
                <div className="text-4xl text-cyan-400 animate-[spin_4s_linear_infinite] drop-shadow-[0_0_10px_#00f0ff]">⟳</div>
            </div>
            <h2 className="text-cyan-400 font-bold text-lg tracking-[0.3em] uppercase mb-4 text-center neon-text border-y border-cyan-900/50 py-2 w-full max-w-xs pointer-events-none">
                {title}
            </h2>
            <p className="text-cyan-800 text-[10px] font-mono tracking-widest text-center uppercase pointer-events-none">
                {message}
            </p>
            <div className="mt-12 flex flex-col items-center gap-2 pointer-events-none">
                <div className="h-px w-16 bg-red-900/50"></div>
                <div className="text-[8px] text-red-500/50 font-mono">
                    {errorCode}
                </div>
            </div>
        </div>
    );
};