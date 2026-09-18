import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { audio } from '../utils/audio';
import { LoginPanel, type LoginField } from './login/LoginPanel';
import { Dialog } from './Dialog';
import { VirtualKeyboard } from './VirtualKeyboard';

const normalizeName = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 _-]/g, '').slice(0, 16);

export const LoginScreen: React.FC = () => {
  const login = useStore(s => s.login);
  const savedUsername = useStore(s => s.user.username);
  const suspended = useStore(s => s.isSuspended);
  const [username, setUsername] = useState(() => normalizeName(window.Telegram?.WebApp?.initDataUnsafe?.user?.username || savedUsername || ''));
  const [password, setPassword] = useState('');
  const [activeField, setActiveField] = useState<LoginField | null>(null);
  const [error, setError] = useState('');
  const [simulation, setSimulation] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!simulation || suspended) return;
    const timer = window.setInterval(() => setProgress(value => Math.min(100, value + 10)), 200);
    return () => window.clearInterval(timer);
  }, [simulation, suspended]);

  useEffect(() => {
    if (progress >= 100) setSimulation(false);
  }, [progress]);

  const submit = () => {
    const name = username.trim();
    if (!name) {
      setError('Enter a runner ID to continue.');
      setActiveField('username');
      document.getElementById('runner-id')?.focus();
      return;
    }
    audio.resume();
    if (name === 'ADMIN') {
      if (password.toUpperCase() !== 'ADMIN') {
        setError('That is not the admin simulation key. Use another runner ID for a normal session.');
        setActiveField('password');
        audio.playError();
        return;
      }
      setProgress(0);
      setActiveField(null);
      setSimulation(true);
      return;
    }
    setActiveField(null);
    audio.playClick();
    login(name);
  };

  const press = (key: string) => {
    setError('');
    if (activeField === 'password') setPassword(value => (value + key).slice(0, 32));
    else setUsername(value => normalizeName(value + key));
  };

  const remove = () => {
    if (activeField === 'password') setPassword(value => value.slice(0, -1));
    else setUsername(value => value.slice(0, -1));
  };

  const clear = () => {
    if (activeField === 'password') setPassword('');
    else setUsername('');
  };

  const next = () => {
    if (username.trim() === 'ADMIN' && activeField === 'username') {
      setActiveField('password');
      document.getElementById('admin-key')?.focus();
    } else {
      submit();
    }
  };

  return (
    <section className={`nr-login ${activeField ? 'nr-with-virtual-keyboard' : ''}`} aria-label="Local profile">
      <LoginPanel username={username} password={password} error={error} activeField={activeField} onFieldSelect={field => { setError(''); setActiveField(field); }} onSubmit={submit} />
      {activeField && (
        <VirtualKeyboard
          onKeyPress={press}
          onDelete={remove}
          onClear={clear}
          onSubmit={submit}
          onNext={next}
          showNext={username.trim() === 'ADMIN' && activeField === 'username'}
          onClose={() => setActiveField(null)}
        />
      )}
      <Dialog open={simulation} title="Admin simulation" onClose={() => setSimulation(false)}>
        <p className="nr-muted">Simulated system purge. No files are deleted.</p>
        <progress className="w-full my-5" value={progress} max={100} aria-label="Simulation progress" />
        <button className="nr-secondary" onClick={() => setSimulation(false)}>End simulation</button>
      </Dialog>
    </section>
  );
};
