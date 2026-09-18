import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { AppState, LogLevel } from '../types';

const LINES = ['BIOS_CHECK... OK', 'LOCAL_PROFILE_READY', 'READING_PREFERENCES...', 'ARCHIVE_MOUNTED', 'LOADING_INTERFACE...', 'CAT_TERRITORY_LINK_READY', 'AUDIO_READY_ON_INTERACTION', 'SYSTEM READY'];
export const BootSequence: React.FC = () => {
  const [count, setCount] = useState(0);
  const done = useRef(false);
  const lowPower = useStore(s => s.user.settings.lowPowerMode);
  const suspended = useStore(s => s.isSuspended);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    useStore.getState().addLog(LogLevel.SUCCESS, 'SYSTEM READY');
    useStore.getState().setAppState(AppState.LOGIN);
  }, []);
  useEffect(() => {
    if (suspended) return;
    if (lowPower || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = window.setTimeout(finish, 0);
      return () => window.clearTimeout(timer);
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1; setCount(index);
      if (index >= LINES.length) { window.clearInterval(timer); finish(); }
    }, 110);
    return () => window.clearInterval(timer);
  }, [finish, lowPower, suspended]);
  return <section className="nr-login" aria-label="Starting Neuro Runner"><div className="nr-login-card"><p className="nr-kicker mb-3">NEURO_OS / STARTUP</p><h1 className="nr-brand">NEURO//RUNNER</h1><div className="my-6 text-sm leading-7 min-h-56" aria-hidden="true">{LINES.map((line,index)=><p key={line} style={{visibility:index<count?'visible':'hidden'}}>› {line}</p>)}</div><button className="nr-secondary w-full" onClick={finish}>Skip intro</button></div></section>;
};
