import React from 'react';
interface Props {
  username: string; password: string; error: string;
  onUsernameChange: (value:string)=>void; onPasswordChange: (value:string)=>void; onSubmit:()=>void;
}
export const LoginPanel: React.FC<Props> = ({username,password,error,onUsernameChange,onPasswordChange,onSubmit}) => (
  <form className="nr-login-card" onSubmit={event=>{event.preventDefault();onSubmit();}}>
    <header><p className="nr-kicker mb-3">YOUR LOCAL NEON DESKTOP</p><h1 className="nr-brand neon-text">NEURO//RUNNER</h1><p className="nr-muted mt-3 text-sm">One game. A hidden archive. Your own runner ID.</p></header>
    <div className="nr-field"><label htmlFor="runner-id">RUNNER_ID</label><input id="runner-id" name="runner-id" autoComplete="nickname" autoCapitalize="characters" spellCheck={false} maxLength={16} value={username} onChange={event=>onUsernameChange(event.target.value)} aria-describedby="profile-note login-error" placeholder="YOUR RUNNER ID" /></div>
    {username.trim()==='ADMIN' && <div className="nr-field"><label htmlFor="admin-key">ADMIN SIMULATION KEY</label><input id="admin-key" name="admin-key" type="password" autoComplete="off" value={password} onChange={event=>onPasswordChange(event.target.value)} aria-describedby="login-error" /></div>}
    <p id="login-error" className="nr-error" aria-live="polite">{error}</p>
    <button className="nr-primary w-full mt-3" type="submit">{username.trim()==='ADMIN'?'AUTHENTICATE_ADMIN':'INITIALIZE_BOOT'}</button>
    <p id="profile-note" className="nr-muted text-xs leading-5 mt-5">Local profile only. No account, real password or personal information required.</p>
  </form>
);
