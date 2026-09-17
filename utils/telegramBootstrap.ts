let loading: Promise<void> | undefined;
export const TELEGRAM_READY = 'neuro:telegram-ready';

/** Ordinary browser visits have no third-party SDK request or SDK startup delay. */
export function bootstrapTelegram(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const launch = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (!launch.has('tgWebAppVersion') && !query.has('tgWebAppVersion')) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    const timer = window.setTimeout(resolve, 4000);
    script.onload = () => { window.clearTimeout(timer); window.dispatchEvent(new Event(TELEGRAM_READY)); resolve(); };
    script.onerror = () => { window.clearTimeout(timer); resolve(); };
    document.head.append(script);
  });
  return loading;
}
