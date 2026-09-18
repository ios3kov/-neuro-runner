import React, { useEffect, useState } from 'react';
import { Dialog } from '../Dialog';
import { LORE_PASSWORD } from '../../data/fileSystem';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { VirtualKeyboard } from '../VirtualKeyboard';

interface Props { isOpen: boolean; targetName?: string; onClose: () => void; onSuccess: () => void; }

export const AuthModal: React.FC<Props> = ({ isOpen, targetName, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setKeyboardOpen(false);
    }
  }, [isOpen]);

  const submit = () => {
    if (password.toUpperCase() === LORE_PASSWORD) {
      audio.playSuccess();
      haptics.notificationSuccess();
      setKeyboardOpen(false);
      onSuccess();
    } else {
      audio.playError();
      setError('Incorrect archive key. Try again.');
      setKeyboardOpen(true);
    }
  };

  return (
    <Dialog open={isOpen} title={`Unlock ${targetName || 'archive'}`} onClose={onClose}>
      <form className={keyboardOpen ? 'nr-with-virtual-keyboard' : ''} onSubmit={event => { event.preventDefault(); submit(); }}>
        <p className="nr-muted text-sm">A puzzle lock, not a real security boundary. The key is hidden in the archive.</p>
        <div className="nr-field">
          <span id="archive-key-label">ARCHIVE KEY</span>
          <div
            id="archive-key"
            role="textbox"
            tabIndex={0}
            aria-labelledby="archive-key-label"
            aria-describedby="archive-error"
            aria-invalid={!!error}
            aria-readonly="true"
            className="nr-virtual-field"
            data-active={keyboardOpen}
            onPointerDown={event => { event.preventDefault(); setKeyboardOpen(true); }}
            onFocus={() => setKeyboardOpen(true)}
          >
            {password ? '•'.repeat(password.length) : <span className="nr-virtual-field__placeholder">TAP TO ENTER KEY</span>}
            {keyboardOpen && <span className="nr-caret" aria-hidden="true" />}
          </div>
        </div>
        <p id="archive-error" className="nr-error" aria-live="polite">{error}</p>
        <div className="flex gap-3 mt-4">
          <button className="nr-secondary flex-1" type="button" onClick={onClose}>CANCEL</button>
          <button className="nr-primary flex-1" type="submit">UNLOCK</button>
        </div>
      </form>
      {keyboardOpen && (
        <VirtualKeyboard
          onKeyPress={key => { setError(''); setPassword(value => (value + key).slice(0, 32)); }}
          onDelete={() => setPassword(value => value.slice(0, -1))}
          onClear={() => setPassword('')}
          onSubmit={submit}
          onClose={() => setKeyboardOpen(false)}
          submitLabel="UNLOCK"
        />
      )}
    </Dialog>
  );
};
