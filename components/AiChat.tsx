import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { Dialog } from './Dialog';
import { VirtualKeyboard } from './VirtualKeyboard';

type Mode = 'CHAT' | 'ERROR' | 'WIPING' | 'RECOVERY' | 'CONFIRM';

/** OMNI is a scripted four-visit story, not a remote AI or a real system failure. */
export const AiChat: React.FC = () => {
  const attempt = useStore(s => s.user.omniAttempts);
  const iteration = useStore(s => s.user.omniIteration);
  const suspended = useStore(s => s.isSuspended);
  const lowPower = useStore(s => s.user.settings.lowPowerMode);
  const stop = useStore(s => s.stopGame);
  const [mode, setMode] = useState<Mode>('CHAT');
  const [progress, setProgress] = useState(0);
  const [input, setInput] = useState('');
  const [sent, setSent] = useState('');
  const [pending, setPending] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const fail = useCallback(() => {
    setPending(false);
    setKeyboardOpen(false);
    setMode('ERROR');
    audio.playError();
    haptics.notificationError();
  }, []);

  useEffect(() => {
    if (!pending || suspended) return;
    const timer = window.setTimeout(fail, 1200);
    return () => window.clearTimeout(timer);
  }, [pending, suspended, fail]);

  useEffect(() => {
    if (suspended || (mode !== 'WIPING' && mode !== 'RECOVERY')) return;
    const reduced = lowPower || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (progress >= 100) {
      const timer = window.setTimeout(() => {
        setProgress(0);
        setMode(mode === 'WIPING' ? 'RECOVERY' : 'CONFIRM');
      }, reduced ? 0 : 350);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setProgress(value => Math.min(100, value + (reduced ? 100 : 10))), reduced ? 100 : 160);
    return () => window.clearTimeout(timer);
  }, [mode, progress, suspended, lowPower]);

  const acknowledge = () => {
    if (attempt < 3) {
      useStore.getState().incrementOmniAttempts();
      stop();
    } else {
      setProgress(0);
      setMode('WIPING');
      audio.playCriticalHalt();
    }
  };

  const updateInput = (key: string) => {
    const next = (input + key).slice(0, 240);
    setInput(next);
    if ((attempt === 0 && next.length > 0) || (attempt === 1 && next.length >= 3)) fail();
  };

  const submit = () => {
    if (!input.trim() || pending) return;
    audio.playClick();
    setSent(input.trim());
    setInput('');
    setKeyboardOpen(false);
    setPending(true);
  };

  return (
    <Dialog open title="OMNI_CORE.AI" onClose={stop}>
      <p className="nr-kicker mb-4">INTERACTIVE FICTION / LOCAL SIMULATION</p>
      {mode === 'CHAT' && (
        <>
          <div className="rounded border border-cyan-900 p-4 mb-5 text-sm leading-6" aria-live="polite">
            <p className="nr-muted">NEURAL_UPLINK ESTABLISHED.</p>
            <p>AWAITING INPUT…</p>
            {sent && <p className="mt-3 break-words">YOU: {sent}</p>}
            {pending && <p className="text-cyan-300 mt-3" role="status">Processing command…</p>}
          </div>
          <form className={keyboardOpen ? 'nr-with-virtual-keyboard' : ''} onSubmit={event => { event.preventDefault(); submit(); }}>
            <div className="nr-field">
              <span id="omni-command-label">COMMAND</span>
              <div
                id="omni-command"
                role="textbox"
                tabIndex={pending ? -1 : 0}
                aria-labelledby="omni-command-label"
                aria-readonly="true"
                aria-disabled={pending}
                className="nr-virtual-field"
                data-active={keyboardOpen}
                onPointerDown={event => { event.preventDefault(); if (!pending) setKeyboardOpen(true); }}
                onFocus={() => { if (!pending) setKeyboardOpen(true); }}
              >
                {input || <span className="nr-virtual-field__placeholder">TAP TO ENTER COMMAND</span>}
                {keyboardOpen && !pending && <span className="nr-caret" aria-hidden="true" />}
              </div>
            </div>
            <button className="nr-primary w-full" type="submit" disabled={pending || !input.trim()}>SEND</button>
          </form>
          {keyboardOpen && !pending && (
            <VirtualKeyboard
              onKeyPress={updateInput}
              onDelete={() => setInput(value => value.slice(0, -1))}
              onClear={() => setInput('')}
              onSubmit={submit}
              onClose={() => setKeyboardOpen(false)}
              submitLabel="SEND"
            />
          )}
        </>
      )}
      {mode === 'ERROR' && (
        <div role="alert">
          <h3 className="text-red-300 text-lg mb-3">CRITICAL_ERROR</h3>
          <p className="nr-muted text-sm leading-6">OMNI encountered a simulated memory fault. Your files and device are safe. Close this session and try the uplink again.</p>
          <button className="nr-primary w-full mt-6" onClick={acknowledge}>OK / ACKNOWLEDGE</button>
        </div>
      )}
      {(mode === 'WIPING' || mode === 'RECOVERY') && (
        <>
          <h3 className="text-cyan-300 text-lg mb-3">{mode === 'WIPING' ? 'ERASING_PROGRAM' : 'REINSTALLING_CORE'}</h3>
          <p className="nr-muted text-sm">Story animation only. No real files are deleted or installed.</p>
          <progress className="w-full my-6" value={progress} max={100} aria-label={mode === 'WIPING' ? 'Simulated erasure' : 'Simulated recovery'} />
          <button className="nr-secondary w-full" onClick={stop}>Leave simulation</button>
        </>
      )}
      {mode === 'CONFIRM' && (
        <>
          <h3 className="text-cyan-300 text-lg mb-3">RESTORE_COMPLETE</h3>
          <p className="nr-muted text-sm leading-6">OMNI is ready for another cycle.<br />Iteration: {iteration + 1}</p>
          <button className="nr-primary w-full mt-6" onClick={() => { audio.playSuccess(); haptics.notificationSuccess(); useStore.getState().resetOmniSession(); stop(); }}>NEXT</button>
        </>
      )}
    </Dialog>
  );
};
