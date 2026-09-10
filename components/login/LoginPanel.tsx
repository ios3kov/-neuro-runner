import React from 'react';
import { audio } from '../../utils/audio';
import type { LoginEasterEggPhase } from './LoginEasterEggOverlay';

export type LoginField = 'username' | 'password';

interface LoginPanelProps {
  username: string;
  password: string;
  activeField: LoginField | null;
  isPasswordRequired: boolean;
  isVerifying: boolean;
  easterEggPhase: LoginEasterEggPhase;
  onActiveFieldChange: (field: LoginField) => void;
  onSubmit: () => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({
  username,
  password,
  activeField,
  isPasswordRequired,
  isVerifying,
  easterEggPhase,
  onActiveFieldChange,
  onSubmit,
}) => (
  <div className={`relative ${easterEggPhase !== 'IDLE' ? 'opacity-0 scale-95 blur-sm pointer-events-none' : 'opacity-100 scale-100'} transition-all duration-500 w-full flex-1 flex flex-col items-center justify-center`}>
    <div className={`relative w-full px-6 md:px-0 md:max-w-lg mx-auto transition-all duration-300 ${activeField ? '-translate-y-24 md:translate-y-0' : 'translate-y-0'}`}>
      <div className="absolute -top-6 left-6 md:left-0 text-[8px] text-cyan-800 tracking-widest font-bold">SYS_ID: 94-BETA</div>
      <div className="absolute -top-6 right-6 md:right-0 text-[8px] text-cyan-800 tracking-widest font-bold">SECURE_CHANNEL</div>
      <div className="absolute -bottom-6 left-6 md:left-0 text-[8px] text-cyan-900 tracking-widest font-bold">LAT: 34.0522 // LON: -118.2437</div>

      <div className="bg-black/60 p-5 md:p-12 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.05)] relative overflow-hidden cyber-shape-lg tech-border-corner">
        <div className="absolute inset-0 tech-dots opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-0.5 h-16 bg-cyan-500/50" />
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-0.5 h-16 bg-cyan-500/50" />

        <div className="mb-10 md:mb-16 text-center relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-400 neon-text tracking-widest md:tracking-[0.2em] mb-3 whitespace-nowrap">NEURO//RUNNER</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-cyan-800" />
            <div className="text-[6px] md:text-[7px] text-cyan-600 tracking-widest uppercase font-bold">Node Encryption Layer v9.4</div>
            <div className="h-px w-8 bg-cyan-800" />
          </div>
        </div>

        <div className="flex flex-col relative z-10 virtual-input-area">
          <div className="relative group mb-10">
            <div className="flex justify-between items-end mb-2">
              <label className="text-[9px] md:text-[10px] text-cyan-600 uppercase tracking-[0.3em] font-bold">RUNNER_ID</label>
              <span className="text-[7px] text-cyan-900">HEX: 0x4A</span>
            </div>
            <div
              className={`flex items-center border-b-2 ${activeField === 'username' ? 'border-cyan-400 bg-cyan-950/20' : 'border-cyan-900/30 bg-cyan-950/5'} transition-all pb-2 cursor-pointer px-2 h-10`}
              onClick={() => { audio.playClick(); onActiveFieldChange('username'); }}
            >
              <span className="text-cyan-700 mr-3 text-sm font-bold opacity-50 select-none">@</span>
              <div className="relative flex-1 flex items-center overflow-hidden">
                <span className="text-cyan-100 text-sm tracking-widest uppercase whitespace-nowrap">
                  {username}
                  {activeField === 'username' && <span className="terminal-cursor ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle" />}
                </span>
                {!username && activeField !== 'username' && <span className="text-cyan-900/50 text-xs italic">TAP_TO_ENTER_ID</span>}
              </div>
            </div>
          </div>

          <div className={`relative group overflow-hidden transition-all duration-500 ease-in-out ${isPasswordRequired ? 'max-h-32 opacity-100 mb-10' : 'max-h-0 opacity-0 mb-0'}`}>
            <div className="flex justify-between items-end mb-2">
              <label className="text-[9px] md:text-[10px] text-cyan-600 uppercase tracking-[0.3em] font-bold">PASSPHRASE</label>
              <span className="text-[7px] text-cyan-900">HEX: 0x9F</span>
            </div>
            <div
              className={`flex items-center border-b-2 ${activeField === 'password' ? 'border-cyan-400 bg-cyan-950/20' : 'border-cyan-900/30 bg-cyan-950/5'} transition-all pb-2 cursor-pointer px-2 h-10`}
              onClick={() => { audio.playClick(); onActiveFieldChange('password'); }}
            >
              <span className="text-cyan-700 mr-3 text-sm font-bold opacity-50 select-none">*</span>
              <div className="relative flex-1 flex items-center overflow-hidden">
                <span className="text-cyan-100 text-sm tracking-[0.5em] flex items-center min-h-[1.25rem]">
                  {password.split('').map((_, index) => <span key={index} className="leading-none">•</span>)}
                  {activeField === 'password' && <span className="terminal-cursor ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle" />}
                </span>
                {!password && activeField !== 'password' && <span className="text-cyan-900/50 text-xs italic tracking-normal">SECURE_KEY_REQUIRED</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={isVerifying || easterEggPhase !== 'IDLE'}
            className={`mt-4 py-4 md:py-5 transition-all uppercase tracking-[0.3em] md:tracking-[0.5em] text-[10px] font-bold border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-100 hover:border-cyan-400 cyber-shape relative group overflow-hidden ${isVerifying ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span className="relative z-10">{isPasswordRequired ? 'AUTHENTICATE_ADMIN' : 'INITIALIZE_BOOT'}</span>
            <div className="absolute inset-0 bg-cyan-400/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
