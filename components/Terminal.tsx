import React, { useState } from 'react';
import { useStore } from '../store';

/** Bounded event history; no idle generators, nested timers or per-character DOM updates. */
export const Terminal: React.FC = () => {
  const logs = useStore(s => s.logs);
  const [open, setOpen] = useState(false);
  return <aside className="nr-terminal" aria-label="Local system log"><button className="nr-terminal-toggle" aria-expanded={open} aria-controls="system-log" onClick={()=>setOpen(value=>!value)}><span>TERMINAL <span className="nr-muted">/ LOCAL EVENTS</span></span><span aria-hidden="true">{open?'−':'+'}</span></button>
    {open && <div id="system-log" className="nr-terminal-log custom-scrollbar" tabIndex={0} role="log" aria-live="off">{logs.slice(-8).map(log=><div key={log.id} className="flex gap-3"><span className="nr-muted shrink-0">{log.timestamp}</span><span className="text-cyan-400 shrink-0">{log.level}</span><span className="break-words min-w-0">{log.message}</span></div>)}{logs.length===0 && <p>No local events yet.</p>}</div>}
  </aside>;
};
