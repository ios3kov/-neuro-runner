import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { audio } from '../utils/audio';
import { LoginPanel } from './login/LoginPanel';
import { Dialog } from './Dialog';

const normalizeName = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 16);
export const LoginScreen: React.FC = () => {
  const login = useStore(s => s.login);
  const savedUsername = useStore(s => s.user.username);
  const suspended = useStore(s => s.isSuspended);
  const [username, setUsername] = useState(() => normalizeName(window.Telegram?.WebApp?.initDataUnsafe?.user?.username || savedUsername || ''));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [simulation, setSimulation] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!simulation || suspended) return;
    const timer = window.setInterval(() => setProgress(value => Math.min(100, value + 10)), 200);
    return () => window.clearInterval(timer);
  }, [simulation, suspended]);
  useEffect(() => { if (progress >= 100) setSimulation(false); }, [progress]);
  const submit = () => {
    const name = username.trim();
    if (!name) { setError('Enter a runner ID to continue.'); document.getElementById('runner-id')?.focus(); return; }
    audio.resume();
    if (name === 'ADMIN') {
      if (password.toUpperCase() !== 'ADMIN') { setError('That is not the admin simulation key. Use another runner ID for a normal session.'); audio.playError(); return; }
      setProgress(0); setSimulation(true); return;
    }
    audio.playClick(); login(name);
  };
  return <section className="nr-login" aria-label="Local profile">
    <LoginPanel username={username} password={password} error={error} onUsernameChange={value=>{setUsername(normalizeName(value));setError('');}} onPasswordChange={value=>{setPassword(value.slice(0,32));setError('');}} onSubmit={submit} />
    <Dialog open={simulation} title="Admin simulation" onClose={()=>setSimulation(false)}><p className="nr-muted">Simulated system purge. No files are deleted.</p><progress className="w-full my-5" value={progress} max={100} aria-label="Simulation progress" /><button className="nr-secondary" onClick={()=>setSimulation(false)}>End simulation</button></Dialog>
  </section>;
};
