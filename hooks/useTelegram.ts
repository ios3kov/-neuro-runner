import { useEffect } from 'react';
import { useStore } from '../store';
import { AppState } from '../types';
import { TELEGRAM_READY } from '../utils/telegramBootstrap';

type Bridge = {
  viewportHeight?: number; contentSafeAreaInset?: Partial<Record<'top'|'right'|'bottom'|'left',number>>;
  ready?: () => void; expand?: () => void; setHeaderColor?: (color:string)=>void; setBackgroundColor?: (color:string)=>void;
  enableClosingConfirmation?:()=>void; disableClosingConfirmation?:()=>void;
  isVersionAtLeast?: (version:string)=>boolean;
  onEvent?: (name:string, callback:()=>void)=>void; offEvent?: (name:string,callback:()=>void)=>void;
  BackButton?: { show:()=>void; hide:()=>void };
};
const attempt = (action:()=>void) => { try { action(); } catch { /* Older Telegram clients fall back to browser controls. */ } };

export function useTelegram() {
  useEffect(() => {
    let disconnect = () => {};
    const connect = () => {
      disconnect();
      const tg = window.Telegram?.WebApp as unknown as Bridge | undefined;
      const updateViewport = () => {
        const vv = window.visualViewport;
        // Pinch zoom changes visualViewport.scale, not the application's logical layout.
        if (vv && vv.scale !== 1) return;
        const height = tg?.viewportHeight || vv?.height || window.innerHeight;
        if (height > 0) document.documentElement.style.setProperty('--tg-viewport-height', `${height}px`);
        for (const side of ['top','right','bottom','left'] as const) {
          const value = tg?.contentSafeAreaInset?.[side];
          if (typeof value === 'number' && value >= 0) document.documentElement.style.setProperty(`--tg-safe-area-${side}`, `max(env(safe-area-inset-${side}, 0px), ${value}px)`);
        }
      };
      const back = () => useStore.getState().handleGoBack();
      let last = '';
      const sync = () => {
        if (!tg) return;
        const state = useStore.getState();
        const active = state.appState !== AppState.BOOT && state.appState !== AppState.LOGIN;
        const showBack = active && (state.appState !== AppState.DESKTOP || state.activeModal !== 'NONE' || !!state.openedFileId || !!state.embeddedGameUrl || state.navigationPath.length > 1);
        const next = `${active}/${showBack}`;
        if (last === next) return;
        last = next;
        attempt(() => { if (tg.isVersionAtLeast?.('6.1')) showBack ? tg.BackButton?.show() : tg.BackButton?.hide(); });
        attempt(() => { if (tg.isVersionAtLeast?.('6.2')) active ? tg.enableClosingConfirmation?.() : tg.disableClosingConfirmation?.(); });
      };
      attempt(() => { tg?.ready?.(); tg?.expand?.(); tg?.setHeaderColor?.('#050b10'); tg?.setBackgroundColor?.('#050b10'); });
      const events = ['viewportChanged','safeAreaChanged','contentSafeAreaChanged'];
      events.forEach(name => attempt(() => tg?.onEvent?.(name, updateViewport)));
      attempt(() => tg?.onEvent?.('backButtonClicked', back));
      const unsubscribe = useStore.subscribe(sync);
      window.addEventListener('resize', updateViewport);
      window.visualViewport?.addEventListener('resize', updateViewport);
      updateViewport(); sync();
      disconnect = () => {
        unsubscribe();
        window.removeEventListener('resize', updateViewport);
        window.visualViewport?.removeEventListener('resize', updateViewport);
        events.forEach(name => attempt(() => tg?.offEvent?.(name, updateViewport)));
        attempt(() => tg?.offEvent?.('backButtonClicked', back));
      };
    };
    connect();
    window.addEventListener(TELEGRAM_READY, connect);
    return () => { disconnect(); window.removeEventListener(TELEGRAM_READY, connect); };
  }, []);
}
