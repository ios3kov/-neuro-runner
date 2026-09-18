import React from 'react';
import { useStore } from '../store';
import { AppState } from '../types';
import { Dialog } from './Dialog';

export const SettingsTool: React.FC = () => {
  const settings = useStore(s=>s.user.settings);
  const state = useStore.getState();
  const items = [
    { id:'soundEnabled',label:'AUDIO_FX',description:'Interface sounds',action:state.toggleSound },
    { id:'musicEnabled',label:'AMBIENCE',description:'Background atmosphere',action:state.toggleMusic },
    { id:'showHidden',label:'HIDDEN_FILES',description:'Reveal the hidden archive',action:state.toggleHidden },
    { id:'hapticsEnabled',label:'HAPTICS',description:'Touch feedback where supported',action:state.toggleHaptics },
    { id:'lowPowerMode',label:'LOW_POWER',description:'Reduce visual effects and motion',action:state.toggleLowPower }
  ] as const;
  return <Dialog open title="System settings" onClose={()=>state.setAppState(AppState.DESKTOP)}>
    {items.map(item=><button key={item.id} type="button" role="switch" aria-checked={settings[item.id]} aria-label={item.label} className="nr-setting" onClick={item.action}><span>{item.label}<small>{item.description}</small></span><span className="text-cyan-400">{settings[item.id]?'ON':'OFF'}</span></button>)}
    <p className="nr-muted text-xs mt-4">Preferences stay on this device. Sound starts after your first interaction.</p>
  </Dialog>;
};
