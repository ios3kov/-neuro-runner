import React from 'react';

export type LoginField = 'username' | 'password';

interface Props {
  username: string;
  password: string;
  error: string;
  activeField: LoginField | null;
  onFieldSelect: (field: LoginField) => void;
  onSubmit: () => void;
}

const VirtualField: React.FC<{
  id: string;
  label: string;
  value: string;
  placeholder: string;
  active: boolean;
  masked?: boolean;
  describedBy?: string;
  onSelect: () => void;
}> = ({ id, label, value, placeholder, active, masked, describedBy, onSelect }) => (
  <div className="nr-field">
    <span id={`${id}-label`}>{label}</span>
    <div
      id={id}
      role="textbox"
      tabIndex={0}
      aria-labelledby={`${id}-label`}
      aria-describedby={describedBy}
      aria-readonly="true"
      aria-multiline="false"
      className="nr-virtual-field"
      data-active={active}
      onPointerDown={event => { event.preventDefault(); onSelect(); }}
      onFocus={onSelect}
    >
      {value ? (masked ? '•'.repeat(value.length) : value) : <span className="nr-virtual-field__placeholder">{placeholder}</span>}
      {active && <span className="nr-caret" aria-hidden="true" />}
    </div>
  </div>
);

export const LoginPanel: React.FC<Props> = ({ username, password, error, activeField, onFieldSelect, onSubmit }) => (
  <form className="nr-login-card" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <header>
      <p className="nr-kicker mb-3">YOUR LOCAL NEON DESKTOP</p>
      <h1 className="nr-brand neon-text">NEURO//RUNNER</h1>
      <p className="nr-muted mt-3 text-sm">One game. A hidden archive. Your own runner ID.</p>
    </header>
    <VirtualField id="runner-id" label="RUNNER_ID" value={username} placeholder="TAP TO ENTER ID" active={activeField === 'username'} describedBy="profile-note login-error" onSelect={() => onFieldSelect('username')} />
    {username.trim() === 'ADMIN' && (
      <VirtualField id="admin-key" label="ADMIN SIMULATION KEY" value={password} placeholder="TAP TO ENTER KEY" active={activeField === 'password'} masked describedBy="login-error" onSelect={() => onFieldSelect('password')} />
    )}
    <p id="login-error" className="nr-error" aria-live="polite">{error}</p>
    <button className="nr-primary w-full mt-3" type="submit">{username.trim() === 'ADMIN' ? 'AUTHENTICATE_ADMIN' : 'INITIALIZE_BOOT'}</button>
    <p id="profile-note" className="nr-muted text-xs leading-5 mt-5">Local profile only. No account, real password or personal information required.</p>
  </form>
);
