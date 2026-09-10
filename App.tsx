
import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppContent } from './components/AppContent';
import { VisualNoiseLayer } from './components/VisualNoiseLayer';
import { OrientationLockOverlay } from './components/OrientationLockOverlay';
import { useTelegram } from './hooks/useTelegram';
import { useStore } from './store';
import { Z_LAYERS } from './constants/ui';

const App: React.FC = () => {
  const { isLandscape } = useTelegram();
  
  // 1. Optimized Selectors
  // Split subscription to avoid re-renders on unrelated state changes
  const { 
    setSuspendReasons, 
    initRuntime, 
    isSuspended, 
    suspendReasons,
    isRuntimeInitialized 
  } = useStore(useShallow(s => ({
    setSuspendReasons: s.setSuspendReasons,
    initRuntime: s.initRuntime,
    isSuspended: s.isSuspended,
    suspendReasons: s.suspendReasons,
    isRuntimeInitialized: s.isRuntimeInitialized
  })));

  // 2. Lifecycle: Orientation (Reactive)
  useEffect(() => {
    setSuspendReasons({ LANDSCAPE: isLandscape });
  }, [isLandscape, setSuspendReasons]);

  // 3. Lifecycle: Global Events (Static Listeners)
  useEffect(() => {
    // Initial atomic check for environment state
    setSuspendReasons({
        PAGEHIDE: false,
        BACKGROUND: document.hidden
    });

    const handleVisibility = () => {
        setSuspendReasons({ BACKGROUND: document.hidden });
    };
    
    const handlePageHide = () => {
        setSuspendReasons({ PAGEHIDE: true });
    };
    
    // Pageshow handles bfcache restoration (back button from external link)
    const handlePageShow = (e: PageTransitionEvent) => {
        if (e.persisted) {
            setSuspendReasons({
                PAGEHIDE: false,
                BACKGROUND: document.hidden,
                // Re-evaluate landscape here just in case, though reactive hook handles it mostly
                LANDSCAPE: window.matchMedia('(orientation: landscape)').matches
            });
        } else {
            setSuspendReasons({ PAGEHIDE: false, BACKGROUND: document.hidden });
        }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    
    // Bootstrap runtime (start listening to engine events, etc)
    initRuntime();
    
    return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
    };
  }, [setSuspendReasons, initRuntime]); 

  // 4. UI Freeze Policy (Inert Attribute)
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
      const el = contentRef.current;
      if (!el) return;

      if (isSuspended) {
          el.setAttribute('inert', '');
          // Force blur to remove keyboard focus from frozen elements
          if (document.activeElement instanceof HTMLElement && el.contains(document.activeElement)) {
              document.activeElement.blur();
          }
      } else {
          el.removeAttribute('inert');
      }
  }, [isSuspended]);

  // 5. Effects Gate for Visual Layer
  // Only render visual noise if runtime is ready and app is active.
  const effectsAllowed = isRuntimeInitialized && !isSuspended;

  return (
    <div 
        className="w-full relative bg-black overflow-hidden flex flex-col font-mono"
        style={{ 
            height: 'var(--tg-viewport-height, 100dvh)',
            zIndex: Z_LAYERS.BASE
        }}
    >
      {/* GLOBAL FX LAYER [Z-50] */}
      {effectsAllowed && <VisualNoiseLayer />}
      
      {/* APP CONTENT LAYER [Z-10] */}
      <div 
        ref={contentRef}
        className={`relative h-full w-full pt-safe pb-safe transition-opacity duration-300 ${
            isSuspended ? 'opacity-50' : 'opacity-100'
        }`}
        style={{ zIndex: Z_LAYERS.CONTENT }}
        aria-hidden={isSuspended}
      >
        <AppContent />
      </div>

      {/* GLOBAL OVERLAY LAYER [Z-9999] */}
      {/* Only show orientation lock if that is the specific reason we are suspended.
          If we are suspended due to backgrounding, no need to render the overlay. */}
      {isSuspended && suspendReasons.LANDSCAPE && (
        <OrientationLockOverlay />
      )}
    </div>
  );
};

export default App;
