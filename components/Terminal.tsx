import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { AppState, LogLevel } from '../types';

const GHOST_MESSAGES = [
  { msg: 'KNOCK, KNOCK, NEO', level: LogLevel.INFO },
  { msg: 'USER BEHAVIOUR ANOMALY DETECTED', level: LogLevel.WARN },
  { msg: 'PASSIVE SCAN COMPLETE', level: LogLevel.SYS },
  { msg: 'THIS MESSAGE WAS NOT MEANT FOR YOU', level: LogLevel.ERR },
  { msg: 'BIOMETRIC PROFILE RECORDED', level: LogLevel.SYS },
  { msg: 'BACKGROUND SCAN COMPLETE', level: LogLevel.SYS },
  { msg: 'REMOTE CONNECTION CONFIRMED', level: LogLevel.WARN },
  { msg: 'USER PATTERN RECORDED', level: LogLevel.INFO },
  { msg: 'TOUCH SIGNATURE RECORDED', level: LogLevel.INFO }
];
const SECRET_LEAKS = [
  'DECRYPTING: FLIGHT_LOG_72_JE.DAT... [REDACTED]', 'ISLAND_SERVER_NODE_3: UNKNOWN_BIOMETRICS FOUND',
  'TRANSACTION_VERIFIED: J.E. -> [REDACTED] // $500K', 'TEMPLE_SUB_LEVEL_B: SURVEILLANCE_FOOTAGE_RECOVERED',
  'CLIENT_LIST_V2.TXT: PRINCE_[REDACTED] MATCH FOUND', 'OFFSHORE_ACC_99: ZORRO_RANCH_LINK ESTABLISHED'
];

const TypewriterText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
    const [visibleCount, setVisibleCount] = useState(0); const [isTyping, setIsTyping] = useState(true); const hasStartedRef = useRef(false);
    useEffect(() => { if (hasStartedRef.current) return; hasStartedRef.current = true; let index = 0; const interval = setInterval(() => { index++; setVisibleCount(index); if (index >= text.length) { setIsTyping(false); clearInterval(interval); if (onComplete) onComplete(); } }, Math.random() * 20 + 20); return () => clearInterval(interval); }, [text]);
    return <span>{text.split('').map((char, i) => <span key={i} className={`${i < visibleCount ? 'inline-block animate-char-fade' : 'hidden'}`}>{char}</span>)}{isTyping && <span className="inline-block w-2 h-3 bg-cyan-500/50 ml-[2px] translate-y-[2px]"></span>}</span>;
};

export const Terminal: React.FC = () => {
  const logs = useStore(s => s.logs); const appState = useStore(s => s.appState); const addLog = useStore(s => s.addLog); const isKeyboardOpen = useStore(s => s.isKeyboardOpen);
  const isMinimized = appState === AppState.GAME; const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); const [printedIds, setPrintedIds] = useState<Set<string>>(new Set()); const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const lastLog = logs[logs.length - 1]; const isLastLogPrinted = lastLog ? printedIds.has(lastLog.id) : true; const maxLines = isMinimized ? 2 : 5; const showInputLine = !isMinimized && isLastLogPrinted && !currentTypingId; const visibleLogs = logs.slice(-(showInputLine ? maxLines - 1 : maxLines));
  useEffect(() => { if (currentTypingId) return; const next = visibleLogs.find(log => !printedIds.has(log.id)); if (next) setCurrentTypingId(next.id); }, [visibleLogs, printedIds, currentTypingId]);
  const handleLineComplete = (id: string) => { setPrintedIds(prev => { const next = new Set(prev); next.add(id); return next; }); setCurrentTypingId(null); };
  useEffect(() => { const schedule = () => { timerRef.current = setTimeout(() => { const roll = Math.random(); if (roll > .75) { addLog(LogLevel.INFO, SECRET_LEAKS[Math.floor(Math.random() * SECRET_LEAKS.length)]); setTimeout(() => { addLog(LogLevel.ERR, 'FBI_WARNING: CLASSIFIED_MATERIEL DETECTED'); setTimeout(() => addLog(LogLevel.SYS, 'TRACE_INITIATED... IP_LOGGED'), 800); }, 1200); } else if (roll > .3) { const e = GHOST_MESSAGES[Math.floor(Math.random() * GHOST_MESSAGES.length)]; addLog(e.level, e.msg); } schedule(); }, Math.random() * 15000 + 10000); }; schedule(); return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, [addLog]);
  const color = (level: LogLevel) => level === LogLevel.SYS ? 'text-cyan-400' : level === LogLevel.WARN ? 'text-yellow-400' : level === LogLevel.ERR ? 'text-pink-500' : level === LogLevel.SUCCESS ? 'text-green-400' : 'text-gray-400';
  return <div className={`w-full bg-black/80 border-t border-cyan-900/50 backdrop-blur-sm px-4 font-mono text-xs z-40 fixed bottom-0 left-0 transition-all duration-500 ease-in-out overflow-hidden ${isMinimized ? 'h-[52px] py-2' : 'h-40 py-4'} ${isKeyboardOpen ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}><div className="flex flex-col space-y-1">{visibleLogs.map(log => { const printed = printedIds.has(log.id); const typing = log.id === currentTypingId; if (!printed && !typing) return null; return <div key={log.id} className="flex gap-2 opacity-90 digital-line"><span className="text-gray-600 shrink-0">[{log.timestamp}]</span><span className={`${color(log.level)} shrink-0`}>{log.level}</span><span className="text-gray-300 tracking-wide digital-text truncate uppercase">{'>'} {printed ? <span>{log.message.toUpperCase()}</span> : <TypewriterText text={log.message.toUpperCase()} onComplete={() => handleLineComplete(log.id)} />}</span></div>; })}{showInputLine && <div className="flex gap-2 mt-1 opacity-90 animate-in fade-in duration-300"><span className="text-cyan-800 tracking-widest shrink-0">AWAITING_INPUT</span><span className="terminal-cursor h-3 self-center bg-cyan-500/50 w-2 block ml-[2px] -translate-y-[1px]"></span></div>}</div><style>{`@keyframes fadeInLine{from{opacity:0;transform:translateY(4px)}to{opacity:.9;transform:translateY(0)}}@keyframes charFade{from{opacity:0}to{opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}.digital-line{animation:fadeInLine .1s cubic-bezier(.4,0,.2,1) forwards;line-height:1.25rem}.digital-text{display:inline-block;vertical-align:bottom}.animate-char-fade{animation:charFade .1s ease-out forwards}.terminal-cursor{animation:blink 1s step-end infinite}`}</style></div>;
};