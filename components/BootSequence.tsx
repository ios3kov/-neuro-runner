import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { AppState, LogLevel } from '../types';

const TypewriterText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
    const [visibleCount, setVisibleCount] = useState(0);
    const [isTyping, setIsTyping] = useState(true);
    const hasStartedRef = useRef(false);
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        let index = 0;
        const speed = Math.random() * 6 + 4;
        const interval = setInterval(() => {
            index++;
            setVisibleCount(index);
            if (index >= text.length) {
                setIsTyping(false);
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text]);
    return <span>{text.split('').map((char, i) => <span key={i} className={`${i < visibleCount ? 'inline-block animate-char-fade' : 'hidden'}`}>{char}</span>)}{isTyping && <span className="inline-block w-2 h-3 bg-cyan-500/50 ml-[2px] translate-y-[2px]"></span>}</span>;
};

const BOOT_LOGS = [
    { msg: 'BIOS_CHECK_V9.4... OK', level: LogLevel.SYS },
    { msg: 'NEURAL_LINK_ESTABLISHED', level: LogLevel.SUCCESS },
    { msg: 'DECRYPTING_USER_DATA...', level: LogLevel.WARN },
    { msg: 'MEMORY_ALLOCATION... 64TB', level: LogLevel.SYS },
    { msg: 'LOADING_INTERFACE_GUI...', level: LogLevel.SYS },
    { msg: 'BYPASSING_SECURITY_NODE...', level: LogLevel.ERR },
    { msg: 'AUDIO_DRIVER_INIT... OK', level: LogLevel.SYS },
    { msg: 'SYSTEM READY', level: LogLevel.SUCCESS }
];

export const BootSequence: React.FC = () => {
  const { setAppState, addLog } = useStore();
  const [logs, setLogs] = useState<{id: string, timestamp: string, level: LogLevel, message: string}[]>([]);
  const [printedIds, setPrintedIds] = useState<Set<string>>(new Set());
  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const [isBootComplete, setIsBootComplete] = useState(false);
  useEffect(() => {
      setLogs(BOOT_LOGS.map((l, i) => ({ id: `boot-${i}`, timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }), level: l.level, message: l.msg })));
  }, []);
  useEffect(() => {
    if (currentTypingId) return;
    const nextToPrint = logs.find(log => !printedIds.has(log.id));
    if (nextToPrint) {
        const timeout = setTimeout(() => {
            setCurrentTypingId(nextToPrint.id);
            addLog(nextToPrint.level, nextToPrint.message);
        }, Math.random() * 90 + 40);
        return () => clearTimeout(timeout);
    } else if (logs.length > 0 && printedIds.size === logs.length && !isBootComplete) {
        setIsBootComplete(true);
        setTimeout(() => setAppState(AppState.LOGIN), 350);
    }
  }, [logs, printedIds, currentTypingId, isBootComplete, addLog, setAppState]);
  const handleLineComplete = (id: string) => {
      setPrintedIds(prev => { const next = new Set(prev); next.add(id); return next; });
      setCurrentTypingId(null);
  };
  const getColor = (level: LogLevel) => level === LogLevel.SYS ? 'text-cyan-400' : level === LogLevel.WARN ? 'text-yellow-400' : level === LogLevel.ERR ? 'text-pink-500' : level === LogLevel.SUCCESS ? 'text-green-400' : 'text-gray-400';
  return <div className="h-full w-full flex flex-col justify-between items-start bg-black px-6 font-mono text-xs md:text-sm overflow-hidden" style={{ paddingTop: 'calc(var(--tg-safe-area-top, 0px) + 20px)', paddingBottom: 'calc(var(--tg-safe-area-bottom, 0px) + 20px)' }}>
      <div className="w-full border-b border-cyan-900/30 py-4 mb-4 flex justify-between items-end opacity-50 animate-in fade-in duration-300"><div className="flex flex-col gap-1"><div className="text-[10px] text-cyan-700">MEM_CHECK: 64TB OK</div><div className="text-[10px] text-cyan-700">CPU_THREADS: 128 ACTIVE</div></div><div className="text-[10px] text-cyan-900 font-bold tracking-widest">NEURO_BOOT_LOADER v9.2</div></div>
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-1 flex-1 justify-end pb-16">{logs.map(log => { const isPrinted = printedIds.has(log.id); const isTyping = log.id === currentTypingId; if (!isPrinted && !isTyping) return null; return <div key={log.id} className="flex gap-3 opacity-90 digital-line"><span className="text-gray-600 shrink-0">[{log.timestamp}]</span><span className={`${getColor(log.level)} shrink-0 w-12`}>{log.level}</span><span className="text-gray-300 tracking-wide digital-text uppercase">{'>'} {isPrinted ? <span>{log.message.toUpperCase()}</span> : <TypewriterText text={log.message.toUpperCase()} onComplete={() => handleLineComplete(log.id)} />}</span></div>; })}</div>
      <style>{`@keyframes fadeInLine{from{opacity:0;transform:translateY(4px)}to{opacity:.9;transform:translateY(0)}}@keyframes charFade{from{opacity:0}to{opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}.digital-line{animation:fadeInLine .1s cubic-bezier(.4,0,.2,1) forwards;line-height:1.5rem}.digital-text{display:inline-block;vertical-align:bottom}.animate-char-fade{animation:charFade .08s ease-out forwards}.terminal-cursor{animation:blink .5s step-end infinite}`}</style>
  </div>;
};