import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { AppState, LogLevel } from '../types';
import { audio } from '../utils/audio';
import { VirtualKeyboard } from './VirtualKeyboard';

const FAKE_FILES = [
    "USER_DATA/PREFS.DAT",
    "SYS/ACHIEVEMENTS.DB",
    "CORE/MEMORY_DUMP.BIN",
    "SAVES/GAME_HISTORY.LOG",
    "NET/UPLINK_KEYS.AES",
    "USR/HIGH_SCORES.TBL",
    "SYS/KERNEL_PANIC.LOG",
    "ROOT/ACCESS_TOKENS.KEY"
];

type FieldType = 'username' | 'password';

export const LoginScreen: React.FC = () => {
  const login = useStore((s) => s.login);
  const addLog = useStore((s) => s.addLog);
  const savedUsername = useStore((s) => s.user.username);
  const setAppState = useStore((s) => s.setAppState);
  
  // Initialize username from Telegram WebApp data if available, otherwise store or default
  const [username, setUsername] = useState(() => {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      let initName = tgUser?.username || tgUser?.first_name || savedUsername || '';
      // Sanitize initial name to match our alphabet (Now allows spaces)
      return initName.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 16); 
  });

  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Custom Input State
  const [activeField, setActiveField] = useState<FieldType | null>(null);
  
  // Easter Egg States
  const [easterEggPhase, setEasterEggPhase] = useState<'IDLE' | 'INIT' | 'DELETING' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [abortShake, setAbortShake] = useState(false);
  
  // Derived state for password visibility
  const isPasswordRequired = username === 'ADMIN';

  useEffect(() => {
    // Force start ambient sound and try resume context
    audio.resume();
    audio.startAmbient('MENU');
  }, []);

  // Close keyboard if clicking outside
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (activeField && !(e.target as Element).closest('.virtual-input-area') && !(e.target as Element).closest('.virtual-keyboard-area')) {
              // Optional: Close keyboard on outside click. 
              // Removed to prevent accidental closing on mobile when missing a key.
              // setActiveField(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeField]);

  // Easter Egg Logic Sequence
  useEffect(() => {
      if (easterEggPhase === 'INIT') {
          // Force close keyboard
          setActiveField(null);
          
          // Phase 1: Initialization Animation
          const timer = setTimeout(() => {
              setEasterEggPhase('DELETING');
          }, 2000);
          return () => clearTimeout(timer);
      } 
      else if (easterEggPhase === 'DELETING') {
          // Phase 2: Fake Deletion Progress
          const interval = setInterval(() => {
              setProgress(prev => {
                  // Change file name randomly
                  if (Math.random() > 0.6) {
                      setCurrentFile(FAKE_FILES[Math.floor(Math.random() * FAKE_FILES.length)]);
                      audio.playTone(800 + Math.random() * 400, 'square', 0.02, 0.1);
                  }

                  // Increment progress
                  const increment = Math.random() * 1.5;
                  const next = prev + increment;

                  if (next >= 99) {
                      // Phase 3: Hang at 99%
                      clearInterval(interval);
                      setTimeout(() => {
                          setEasterEggPhase('ERROR');
                          audio.playCriticalHalt();
                          // Phase 4: Reboot after error
                          setTimeout(() => {
                              setAppState(AppState.BOOT);
                          }, 3000);
                      }, 2500); // Hang duration
                      return 99.0;
                  }
                  return next;
              });
          }, 50);
          return () => clearInterval(interval);
      }
  }, [easterEggPhase]);

  const handleSubmit = async () => {
    if (isVerifying || easterEggPhase !== 'IDLE') return;
    
    // Validate empty
    if (!username) {
        setActiveField('username');
        audio.playError();
        return;
    }

    // Ensure audio context is running on user interaction
    audio.resume();
    audio.playClick();

    // Admin Check
    if (username === 'ADMIN') {
        if (password === 'ADMIN') {
            setEasterEggPhase('INIT');
            addLog(LogLevel.WARN, "ADMIN_OVERRIDE: INITIATING PURGE");
            audio.playError();
            return;
        } else {
            // Password required for ADMIN
            if (!password) {
                setActiveField('password');
                return;
            }
            // Wrong password
            addLog(LogLevel.ERR, "ACCESS_DENIED: INVALID_HASH");
            audio.playError();
            setPassword('');
            return;
        }
    }

    // Regular User Login
    setIsVerifying(true);
    setActiveField(null); // Close keyboard

    setTimeout(() => {
        setIsVerifying(false);
        // Default login if not admin/password logic
        login(username);
    }, 500);
  };

  const handleAbort = () => {
      audio.playError();
      setAbortShake(true);
      setTimeout(() => setAbortShake(false), 200);
      addLog(LogLevel.ERR, "CMD_REJECTED: ABORT_LOCKED_BY_ADMIN");
  };

  // --- VIRTUAL KEYBOARD HANDLERS ---

  const handleKeyPress = (key: string) => {
      if (!activeField) return;
      
      if (activeField === 'username') {
          if (username.length < 16) {
              setUsername(prev => prev + key);
          } else {
              audio.playError(); // Max length
          }
      } else if (activeField === 'password') {
          if (password.length < 32) {
              setPassword(prev => prev + key);
          } else {
              audio.playError();
          }
      }
  };

  const handleDelete = () => {
      if (!activeField) return;
      if (activeField === 'username') setUsername(prev => prev.slice(0, -1));
      if (activeField === 'password') setPassword(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
      if (!activeField) return;
      if (activeField === 'username') setUsername('');
      if (activeField === 'password') setPassword('');
  };

  const handleNext = () => {
      if (activeField === 'username') {
          if (isPasswordRequired) {
              setActiveField('password');
          } else {
              // If no password needed, treat Next as Submit? 
              // Or just close? Let's just keep focus or close.
              // Logic: If user is ADMIN, go to password. If User, submit?
              // Let's verify username first.
              if (username === 'ADMIN') setActiveField('password');
              else setActiveField(null); // Or submit?
          }
      }
  };

  return (
    <div className={`flex flex-col items-center justify-center h-full w-full relative z-10 font-mono overflow-hidden bg-black pt-safe-top pb-safe-bottom`}>
      
      {/* EASTER EGG OVERLAY */}
      {easterEggPhase !== 'IDLE' && (
        <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-8 select-none">
            {/* PHASE 1: INIT */}
            {easterEggPhase === 'INIT' && (
                <div className="text-center animate-pulse border border-red-500/50 p-12 cyber-shape bg-red-950/20">
                    <div className="text-red-500 font-bold text-xl tracking-[0.2em] mb-4 neon-text-err">⚠ SYSTEM OVERRIDE ⚠</div>
                    <div className="text-red-400 font-mono text-sm tracking-widest uppercase">
                        Initializing Achievement Deletion Protocol...
                    </div>
                    <div className="text-[10px] text-red-700 mt-2">AUTH_BYPASS: ADMIN_ROOT</div>
                </div>
            )}

            {/* PHASE 2: DELETING */}
            {easterEggPhase === 'DELETING' && (
                <div className="w-full max-w-lg border-2 border-red-900/50 p-8 bg-red-950/10 relative overflow-hidden cyber-shape-lg shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                    <div className="text-red-500 font-bold text-lg tracking-[0.2em] mb-8 text-center uppercase animate-pulse neon-text-err">
                        PERMANENT DATA WIPE
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-red-400 font-bold mb-2 tracking-widest uppercase">
                        <span>DELETING: {currentFile}</span>
                        <span>{progress.toFixed(1)}%</span>
                    </div>

                    <div className="w-full h-4 bg-red-950/50 border border-red-900/30 mb-8 relative">
                        <div 
                            className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-all duration-75"
                            style={{ width: `${progress}%` }}
                        ></div>
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] w-full animate-[progress-scan_1s_infinite]"></div>
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={handleAbort}
                            className={`px-8 py-3 bg-red-600 text-black font-black uppercase tracking-[0.3em] hover:bg-red-500 active:bg-white transition-all cyber-shape ${abortShake ? 'translate-x-1' : ''}`}
                        >
                            ⚠ ABORT ⚠
                        </button>
                    </div>
                </div>
            )}

            {/* PHASE 3: ERROR */}
            {easterEggPhase === 'ERROR' && (
                <div className="relative z-50 flex flex-col items-center animate-in zoom-in duration-100">
                    <div className="text-6xl mb-4">💀</div>
                    <div className="text-red-500 font-black text-4xl tracking-tighter bg-black px-8 py-4 border-2 border-red-500 mb-6 cyber-shape shadow-[0_0_30px_#ef4444]">
                        FATAL ERROR
                    </div>
                    <div className="text-red-400 font-mono text-center space-y-2 text-xs tracking-widest font-bold bg-black/80 p-4 border-x border-red-900/50">
                        <p>RUNTIME_EXCEPTION: DELETION_THREAD_HANG (0x99)</p>
                        <p>UNABLE TO ERASE SECTOR 0000:FFFF</p>
                        <p className="animate-pulse mt-4 text-white">SYSTEM REBOOT INITIATED...</p>
                    </div>
                </div>
            )}
            
            <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwgMCwgMCwgMC4wNSkiLz4KPC9zdmc+')] z-10"></div>
        </div>
      )}

      {/* LOGIN UI */}
      <div className={`relative ${easterEggPhase !== 'IDLE' ? 'opacity-0 scale-95 blur-sm pointer-events-none' : 'opacity-100 scale-100'} transition-all duration-500 w-full flex-1 flex flex-col items-center justify-center`}>
        <div className={`relative w-full px-6 md:px-0 md:max-w-lg mx-auto transition-all duration-300 ${activeField ? '-translate-y-24 md:translate-y-0' : 'translate-y-0'}`}>
            
            {/* Technical Decorators */}
            <div className="absolute -top-6 left-6 md:left-0 text-[8px] text-cyan-800 tracking-widest font-bold">SYS_ID: 94-BETA</div>
            <div className="absolute -top-6 right-6 md:right-0 text-[8px] text-cyan-800 tracking-widest font-bold">SECURE_CHANNEL</div>
            <div className="absolute -bottom-6 left-6 md:left-0 text-[8px] text-cyan-900 tracking-widest font-bold">LAT: 34.0522 // LON: -118.2437</div>

            <div className="bg-black/60 p-5 md:p-12 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(0,240,255,0.05)] relative overflow-hidden cyber-shape-lg tech-border-corner">
                
                <div className="absolute inset-0 tech-dots opacity-10 pointer-events-none"></div>
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-0.5 h-16 bg-cyan-500/50"></div>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-0.5 h-16 bg-cyan-500/50"></div>

                <div className="mb-10 md:mb-16 text-center relative z-10">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-400 neon-text tracking-widest md:tracking-[0.2em] mb-3 whitespace-nowrap">
                        NEURO//RUNNER
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-px w-8 bg-cyan-800"></div>
                        <div className="text-[6px] md:text-[7px] text-cyan-600 tracking-widest uppercase font-bold">Node Encryption Layer v9.4</div>
                        <div className="h-px w-8 bg-cyan-800"></div>
                    </div>
                </div>

                <div className="flex flex-col relative z-10 virtual-input-area">
                  {/* FAKE INPUT: USERNAME */}
                  <div className="relative group mb-10">
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-[9px] md:text-[10px] text-cyan-600 uppercase tracking-[0.3em] font-bold">RUNNER_ID</label>
                        <span className="text-[7px] text-cyan-900">HEX: 0x4A</span>
                    </div>
                    <div 
                        className={`flex items-center border-b-2 ${activeField === 'username' ? 'border-cyan-400 bg-cyan-950/20' : 'border-cyan-900/30 bg-cyan-950/5'} transition-all pb-2 cursor-pointer px-2 h-10`} 
                        onClick={() => { audio.playClick(); setActiveField('username'); }}
                    >
                        <span className="text-cyan-700 mr-3 text-sm font-bold opacity-50 select-none">@</span>
                        <div className="relative flex-1 flex items-center overflow-hidden">
                            <span className="text-cyan-100 text-sm tracking-widest uppercase whitespace-nowrap">
                                {username}
                                {activeField === 'username' && <span className="terminal-cursor ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle"></span>}
                            </span>
                            {!username && activeField !== 'username' && (
                                <span className="text-cyan-900/50 text-xs italic">TAP_TO_ENTER_ID</span>
                            )}
                        </div>
                    </div>
                  </div>

                  {/* FAKE INPUT: PASSWORD (CONDITIONAL) */}
                  <div className={`relative group overflow-hidden transition-all duration-500 ease-in-out ${isPasswordRequired ? 'max-h-32 opacity-100 mb-10' : 'max-h-0 opacity-0 mb-0'}`}>
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-[9px] md:text-[10px] text-cyan-600 uppercase tracking-[0.3em] font-bold">PASSPHRASE</label>
                        <span className="text-[7px] text-cyan-900">HEX: 0x9F</span>
                    </div>
                    <div 
                        className={`flex items-center border-b-2 ${activeField === 'password' ? 'border-cyan-400 bg-cyan-950/20' : 'border-cyan-900/30 bg-cyan-950/5'} transition-all pb-2 cursor-pointer px-2 h-10`} 
                        onClick={() => { audio.playClick(); setActiveField('password'); }}
                    >
                        <span className="text-cyan-700 mr-3 text-sm font-bold opacity-50 select-none">*</span>
                        <div className="relative flex-1 flex items-center overflow-hidden">
                            <span className="text-cyan-100 text-sm tracking-[0.5em] flex items-center min-h-[1.25rem]">
                                {password.split('').map((_, i) => (
                                    <span key={i} className="leading-none">•</span>
                                ))}
                                {activeField === 'password' && <span className="terminal-cursor ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle"></span>}
                            </span>
                            {!password && activeField !== 'password' && (
                                <span className="text-cyan-900/50 text-xs italic tracking-normal">SECURE_KEY_REQUIRED</span>
                            )}
                        </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isVerifying || easterEggPhase !== 'IDLE'}
                    className={`mt-4 py-4 md:py-5 transition-all uppercase tracking-[0.3em] md:tracking-[0.5em] text-[10px] font-bold border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-100 hover:border-cyan-400 cyber-shape relative group overflow-hidden ${isVerifying ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <span className="relative z-10">{isPasswordRequired ? 'AUTHENTICATE_ADMIN' : 'INITIALIZE_BOOT'}</span>
                    <div className="absolute inset-0 bg-cyan-400/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                  </button>
                </div>
            </div>
        </div>
      </div>

      {/* VIRTUAL KEYBOARD LAYER */}
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
        @keyframes progress-scan {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .terminal-cursor {
          animation: blink 1s step-end infinite;
        }
        .pt-safe-top {
            padding-top: calc(var(--tg-safe-area-top, 0px) + 20px);
        }
        .pb-safe-bottom {
            padding-bottom: calc(var(--tg-safe-area-bottom, 0px) + 20px);
        }
      `}</style>
    </div>
  );
};