import React, { useEffect, useState } from 'react';
import { Dialog } from '../Dialog';
import { LORE_PASSWORD } from '../../data/fileSystem';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
interface Props { isOpen:boolean; targetName?:string; onClose:()=>void; onSuccess:()=>void; }
export const AuthModal: React.FC<Props> = ({isOpen,targetName,onClose,onSuccess}) => {
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{if(isOpen){setPassword('');setError('');}},[isOpen]);
  return <Dialog open={isOpen} title={`Unlock ${targetName || 'archive'}`} onClose={onClose}>
    <form onSubmit={event=>{event.preventDefault();if(password.toUpperCase()===LORE_PASSWORD){audio.playSuccess();haptics.notificationSuccess();onSuccess();}else{audio.playError();setError('Incorrect archive key. Try again.');}}}>
      <p className="nr-muted text-sm">A puzzle lock, not a real security boundary. The key is hidden in the archive.</p>
      <div className="nr-field"><label htmlFor="archive-key">ARCHIVE KEY</label><input data-autofocus id="archive-key" type="password" autoComplete="off" value={password} maxLength={32} onChange={event=>{setPassword(event.target.value);setError('');}} aria-describedby="archive-error" aria-invalid={!!error} /></div>
      <p id="archive-error" className="nr-error" aria-live="polite">{error}</p>
      <div className="flex gap-3 mt-4"><button className="nr-secondary flex-1" type="button" onClick={onClose}>CANCEL</button><button className="nr-primary flex-1" type="submit">UNLOCK</button></div>
    </form>
  </Dialog>;
};
