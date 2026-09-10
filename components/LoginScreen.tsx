import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { AppState, LogLevel } from '../types';
import { audio } from '../utils/audio';
import { VirtualKeyboard } from './VirtualKeyboard';
import { LoginPanel, type LoginField } from './login/LoginPanel';
import { LoginEasterEggOverlay, type LoginEasterEggPhase } from './login/LoginEasterEggOverlay';

const FAKE_FILES = [
  'USER_DATA/PREFS.DAT',
  'SYS/ACHIEVEMENTS.DB',
  'CORE/MEMORY_DUMP.BIN',
  'SAVES/GAME_HISTORY.LOG',
  'NET/UPLINK_KEYS.AES',
  'USR/HIGH_SCORES.TBL',
  'SYS/KERNEL_PANIC.LOG',
  'ROOT/ACCESS_TOKENS.KEY',
];

const initialUsername = (savedUsername: string) => {
  const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const name = telegramUser?.username || telegramUser?.first_name || savedUsername || '';
  return name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 16);
};

export const LoginScreen: React.FC = () => {
  const login = useStore((state) => state.login);
  const addLog = useStore((state) => state.addLog);
  const savedUsername = useStore((state) => state.user.username);
  const setAppState = useStore((state) => state.setAppState);

  const [username, setUsername] = useState(() => initialUsername(savedUsername));
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeField, setActiveField] = useState<LoginField | null>(null);
  const [easterEggPhase, setEasterEggPhase] = useState<LoginEasterEggPhase>('IDLE');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [abortShake, setAbortShake] = useState(false);

  const isPasswordRequired = username === 'ADMIN';

  useEffect(() => {
    audio.resume();
    audio.startAmbient('MENU');
  }, []);

  useEffect(() => {
    if (easterEggPhase === 'INIT') {
      setActiveField(null);
      const timer = window.setTimeout(() => setEasterEggPhase('DELETING'), 2000);
      return () => window.clearTimeout(timer);
    }

    if (easterEggPhase !== 'DELETING') return undefined;

    let haltTimer: number | undefined;
    let rebootTimer: number | undefined;
    const interval = window.setInterval(() => {
      setProgress((previous) => {
        if (Math.random() > 0.6) {
          setCurrentFile(FAKE_FILES[Math.floor(Math.random() * FAKE_FILES.length)]);
          audio.playTone(800 + Math.random() * 400, 'square', 0.02, 0.1);
        }
        const next = previous + Math.random() * 1.5;
        if (next < 99) return next;

        window.clearInterval(interval);
        haltTimer = window.setTimeout(() => {
          setEasterEggPhase('ERROR');
          audio.playCriticalHalt();
          rebootTimer = window.setTimeout(() => setAppState(AppState.BOOT), 3000);
        }, 2500);
        return 99;
      });
    }, 50);

    return () => {
      window.clearInterval(interval);
      if (haltTimer) window.clearTimeout(haltTimer);
      if (rebootTimer) window.clearTimeout(rebootTimer);
    };
  }, [easterEggPhase, setAppState]);

  const handleSubmit = () => {
    if (isVerifying || easterEggPhase !== 'IDLE') return;
    if (!username) {
      setActiveField('username');
      audio.playError();
      return;
    }

    audio.resume();
    audio.playClick();

    if (username === 'ADMIN') {
      if (password === 'ADMIN') {
        setEasterEggPhase('INIT');
        addLog(LogLevel.WARN, 'ADMIN_OVERRIDE: INITIATING PURGE');
        audio.playError();
        return;
      }
      if (!password) {
        setActiveField('password');
        return;
      }
      addLog(LogLevel.ERR, 'ACCESS_DENIED: INVALID_HASH');
      audio.playError();
      setPassword('');
      return;
    }

    setIsVerifying(true);
    setActiveField(null);
    window.setTimeout(() => {
      setIsVerifying(false);
      login(username);
    }, 500);
  };

  const handleAbort = () => {
    audio.playError();
    setAbortShake(true);
    window.setTimeout(() => setAbortShake(false), 200);
    addLog(LogLevel.ERR, 'CMD_REJECTED: ABORT_LOCKED_BY_ADMIN');
  };

  const handleKeyPress = (key: string) => {
    if (activeField === 'username') {
      if (username.length < 16) setUsername((previous) => previous + key);
      else audio.playError();
      return;
    }
    if (activeField === 'password') {
      if (password.length < 32) setPassword((previous) => previous + key);
      else audio.playError();
    }
  };

  const handleDelete = () => {
    if (activeField === 'username') setUsername((previous) => previous.slice(0, -1));
    if (activeField === 'password') setPassword((previous) => previous.slice(0, -1));
  };

  const handleClear = () => {
    if (activeField === 'username') setUsername('');
    if (activeField === 'password') setPassword('');
  };

  const handleNext = () => {
    if (activeField !== 'username') return;
    if (isPasswordRequired || username === 'ADMIN') setActiveField('password');
    else setActiveField(null);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative z-10 font-mono overflow-hidden bg-black pt-safe-top pb-safe-bottom">
      {easterEggPhase !== 'IDLE' && (
        <LoginEasterEggOverlay
          phase={easterEggPhase}
          progress={progress}
          currentFile={currentFile}
          abortShake={abortShake}
          onAbort={handleAbort}
        />
      )}

      <LoginPanel
        username={username}
        password={password}
        activeField={activeField}
        isPasswordRequired={isPasswordRequired}
        isVerifying={isVerifying}
        easterEggPhase={easterEggPhase}
        onActiveFieldChange={setActiveField}
        onSubmit={handleSubmit}
      />

      {activeField && (
        <VirtualKeyboard
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onClear={handleClear}
          onNext={handleNext}
          onSubmit={handleSubmit}
          onClose={() => setActiveField(null)}
          showSubmit={activeField === 'password' || (!isPasswordRequired && activeField === 'username')}
        />
      )}

      <style>{`
        @keyframes progress-scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .terminal-cursor { animation: blink 1s step-end infinite; }
        .pt-safe-top { padding-top: calc(var(--tg-safe-area-top, 0px) + 20px); }
        .pb-safe-bottom { padding-bottom: calc(var(--tg-safe-area-bottom, 0px) + 20px); }
      `}</style>
    </div>
  );
};
