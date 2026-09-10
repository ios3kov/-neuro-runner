import React from 'react';

export type LoginEasterEggPhase = 'IDLE' | 'INIT' | 'DELETING' | 'ERROR';

interface LoginEasterEggOverlayProps {
  phase: Exclude<LoginEasterEggPhase, 'IDLE'>;
  progress: number;
  currentFile: string;
  abortShake: boolean;
  onAbort: () => void;
}

export const LoginEasterEggOverlay: React.FC<LoginEasterEggOverlayProps> = ({
  phase,
  progress,
  currentFile,
  abortShake,
  onAbort,
}) => (
  <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-8 select-none">
    {phase === 'INIT' && (
      <div className="text-center animate-pulse border border-red-500/50 p-12 cyber-shape bg-red-950/20">
        <div className="text-red-500 font-bold text-xl tracking-[0.2em] mb-4 neon-text-err">⚠ SYSTEM OVERRIDE ⚠</div>
        <div className="text-red-400 font-mono text-sm tracking-widest uppercase">Initializing Achievement Deletion Protocol...</div>
        <div className="text-[10px] text-red-700 mt-2">AUTH_BYPASS: ADMIN_ROOT</div>
      </div>
    )}

    {phase === 'DELETING' && (
      <div className="w-full max-w-lg border-2 border-red-900/50 p-8 bg-red-950/10 relative overflow-hidden cyber-shape-lg shadow-[0_0_50px_rgba(220,38,38,0.2)]">
        <div className="text-red-500 font-bold text-lg tracking-[0.2em] mb-8 text-center uppercase animate-pulse neon-text-err">PERMANENT DATA WIPE</div>
        <div className="flex justify-between text-[10px] text-red-400 font-bold mb-2 tracking-widest uppercase">
          <span>DELETING: {currentFile}</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full h-4 bg-red-950/50 border border-red-900/30 mb-8 relative">
          <div className="h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-all duration-75" style={{ width: `${progress}%` }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] w-full animate-[progress-scan_1s_infinite]" />
        </div>
        <div className="flex justify-center">
          <button onClick={onAbort} className={`px-8 py-3 bg-red-600 text-black font-black uppercase tracking-[0.3em] hover:bg-red-500 active:bg-white transition-all cyber-shape ${abortShake ? 'translate-x-1' : ''}`}>⚠ ABORT ⚠</button>
        </div>
      </div>
    )}

    {phase === 'ERROR' && (
      <div className="relative z-50 flex flex-col items-center animate-in zoom-in duration-100">
        <div className="text-6xl mb-4">💀</div>
        <div className="text-red-500 font-black text-4xl tracking-tighter bg-black px-8 py-4 border-2 border-red-500 mb-6 cyber-shape shadow-[0_0_30px_#ef4444]">FATAL ERROR</div>
        <div className="text-red-400 font-mono text-center space-y-2 text-xs tracking-widest font-bold bg-black/80 p-4 border-x border-red-900/50">
          <p>RUNTIME_EXCEPTION: DELETION_THREAD_HANG (0x99)</p>
          <p>UNABLE TO ERASE SECTOR 0000:FFFF</p>
          <p className="animate-pulse mt-4 text-white">SYSTEM REBOOT INITIATED...</p>
        </div>
      </div>
    )}

    <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwgMCwgMCwgMC4wNSkiLz4KPC9zdmc+')] z-10" />
  </div>
);
