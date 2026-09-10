
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';

type ChatMode = 'CHAT' | 'ERROR_DIALOG' | 'WIPING' | 'RECOVERY' | 'CONFIRM';

interface Message {
    id: number;
    text: string;
    sender: 'USER' | 'AI' | 'SYS';
}

const WIPE_LOGS = [
    "DELETING_NEURAL_WEIGHTS...",
    "PURGING_SECTOR_0x88...",
    "CLEANING_CACHE...",
    "REMOVING_USER_DEPENDENCIES...",
    "TERMINATING_AI_THREAD...",
    "WIPING_CORE_SECTORS...",
];

const RECOVERY_LOGS = [
    "RECONSTRUCTING_OS_SHELL...",
    "ALLOCATING_VIRTUAL_MEMORY...",
    "RESTORING_OMNI_UPLINK...",
    "VERIFYING_INTEGRITY...",
    "PATCHING_KERNEL_HOOKS...",
    "FINALIZING_REINSTALL...",
];

export const AiChat: React.FC = () => {
    const omniAttempts = useStore((s) => s.user.omniAttempts);
    const omniIteration = useStore((s) => s.user.omniIteration);
    const stopGame = useStore((s) => s.stopGame);
    const incrementOmniAttempts = useStore((s) => s.incrementOmniAttempts);
    const resetOmniSession = useStore((s) => s.resetOmniSession);
    const attempt = omniAttempts || 0;
    const filename = "OMNI_CORE.AI";

    const [mode, setMode] = useState<ChatMode>('CHAT');
    const [progress, setProgress] = useState(0);
    const [logIndex, setLogIndex] = useState(0);

    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "NEURAL_UPLINK ESTABLISHED.", sender: 'SYS' },
        { id: 2, text: "AWAITING INPUT...", sender: 'AI' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mode === 'CHAT') {
            const timer = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [mode]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Lifecycle for the 4th attempt: Wipe -> Recovery sequence
    useEffect(() => {
        if (mode === 'WIPING' || mode === 'RECOVERY') {
            const interval = setInterval(() => {
                setProgress(p => {
                    const next = p + Math.random() * 5 + 2;
                    if (next >= 100) {
                        clearInterval(interval);
                        if (mode === 'WIPING') {
                            setTimeout(() => {
                                setMode('RECOVERY');
                                setProgress(0);
                            }, 800);
                        } else {
                            setTimeout(() => setMode('CONFIRM'), 800);
                        }
                        return 100;
                    }
                    if (Math.random() > 0.7) {
                        setLogIndex(i => (i + 1) % WIPE_LOGS.length);
                        audio.playKeystroke();
                    }
                    return next;
                });
            }, 50);
            return () => clearInterval(interval);
        }
    }, [mode]);

    const triggerErrorDialog = () => {
        audio.playError();
        haptics.notificationError();
        setMode('ERROR_DIALOG');
    };

    const handleConfirmError = () => {
        audio.playClick();
        if (attempt < 3) {
            // First 3 crashes: Increment counter and just close the window
            incrementOmniAttempts();
            stopGame();
        } else {
            // 4th crash: Start the uninstallation sequence
            setMode('WIPING');
            setProgress(0);
            audio.playCriticalHalt();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        audio.playKeystroke();

        // 1st Attempt: Error on first character
        if (attempt === 0 && val.length > 0) {
            triggerErrorDialog();
            return;
        }
        // 2nd Attempt: Error on 3rd character
        if (attempt === 1 && val.length >= 3) {
            triggerErrorDialog();
            return;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        audio.playClick();
        const userMsg: Message = { id: Date.now(), text: inputValue, sender: 'USER' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // 3rd attempt onwards: Error triggers after sending the message
        setTimeout(() => triggerErrorDialog(), 1200);
    };

    const handleFinalConfirm = () => {
        audio.playSuccess();
        haptics.notificationSuccess();
        resetOmniSession();
        stopGame();
    };

    // --- RENDER MODES ---

    if (mode === 'ERROR_DIALOG') {
        return (
            <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                <div className="w-full max-w-xs border-2 border-red-600 bg-black p-6 cyber-shape shadow-[0_0_30px_rgba(220,38,38,0.3)] flex flex-col items-center text-center">
                    <div className="w-12 h-12 border-2 border-red-600 rounded-full flex items-center justify-center text-red-600 mb-4 animate-pulse">
                        <span className="text-2xl font-bold">!</span>
                    </div>
                    <h2 className="text-red-500 font-black tracking-widest uppercase mb-2">CRITICAL_ERROR</h2>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-6 leading-tight">
                        The application will be closed due to a critical memory access failure (0x000FF1).
                    </p>
                    <button 
                        onClick={handleConfirmError}
                        className="w-full py-3 bg-red-600 text-black font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all active:scale-95"
                    >
                        OK / ACKNOWLEDGE
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'WIPING') {
        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in duration-300">
                <div className="w-full max-w-sm border-2 border-red-500/50 p-8 cyber-shape bg-red-950/10 flex flex-col items-center">
                    <div className="text-red-500 font-black text-xl mb-8 tracking-[0.2em] animate-pulse uppercase">!! ERASING_PROGRAM !!</div>
                    <div className="w-full h-4 bg-red-950/50 border border-red-900/30 mb-4 overflow-hidden relative">
                         <div className="h-full bg-red-600 shadow-[0_0_15px_#f00] transition-all duration-75" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="text-[10px] text-red-700 font-mono tracking-widest uppercase h-4">
                        {WIPE_LOGS[logIndex]}
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'RECOVERY') {
        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="w-full max-w-sm border-2 border-cyan-500/50 p-8 cyber-shape bg-cyan-950/10 flex flex-col items-center">
                    <div className="text-cyan-400 font-black text-xl mb-8 tracking-[0.2em] animate-pulse uppercase">REINSTALLING_CORE...</div>
                    <div className="w-full h-4 bg-cyan-950/50 border border-cyan-900/30 mb-4 overflow-hidden relative">
                         <div className="h-full bg-cyan-500 shadow-[0_0_15px_#00f0ff] transition-all duration-75" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="text-[10px] text-cyan-800 font-mono tracking-widest uppercase h-4">
                        {RECOVERY_LOGS[logIndex]}
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'CONFIRM') {
        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in zoom-in duration-500">
                <div className="w-full max-w-sm border border-cyan-500/30 bg-black/95 p-10 cyber-shape shadow-[0_0_50px_rgba(0,240,255,0.15)] relative text-center">
                    <div className="text-4xl mb-6 animate-bounce">🌀</div>
                    <h2 className="text-cyan-400 font-bold text-lg tracking-[0.2em] uppercase neon-text mb-2">RESTORE_COMPLETE</h2>
                    <p className="text-[9px] text-cyan-800 tracking-widest uppercase mb-8 leading-relaxed">
                        Software integrity verified.<br/>Initial session protocols reset.<br/>Iteration: 0x0{omniIteration + 1}
                    </p>
                    
                    <button 
                        onClick={handleFinalConfirm}
                        className="w-full py-4 bg-cyan-500 text-black font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] cyber-shape"
                    >
                        NEXT
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-2xl h-[70vh] flex flex-col border border-cyan-500/30 bg-black/95 shadow-[0_0_50px_rgba(0,240,255,0.1)] cyber-shape-lg relative overflow-hidden">
                {/* Header */}
                <div className="h-10 border-b border-cyan-900/50 flex justify-between items-center px-4 bg-cyan-950/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_5px_#00f0ff]"></div>
                        <span className="text-cyan-400 font-bold tracking-[0.2em] text-xs uppercase">{filename}</span>
                    </div>
                    <button 
                        onClick={() => stopGame()} 
                        className="w-8 h-8 flex items-center justify-center text-red-500 border border-red-900/40 hover:bg-red-900/20 transition-all text-lg font-bold cyber-shape leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar font-mono">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 border text-xs md:text-sm tracking-wide ${
                                msg.sender === 'USER' 
                                    ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-100 cyber-shape' 
                                    : msg.sender === 'SYS'
                                    ? 'border-transparent text-cyan-700 text-[10px] w-full text-center tracking-widest'
                                    : 'border-cyan-900/50 bg-gray-900/50 text-gray-300 cyber-shape'
                            }`}>
                                {msg.sender !== 'SYS' && (
                                    <div className={`text-[8px] font-bold mb-1 opacity-50 ${msg.sender === 'USER' ? 'text-right text-cyan-500' : 'text-left text-gray-500'}`}>
                                        {msg.sender === 'USER' ? 'YOU' : 'CORE'}
                                    </div>
                                )}
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="p-3 border border-cyan-900/50 bg-gray-900/50 text-cyan-500 cyber-shape">
                                <div className="flex gap-1 items-center h-4">
                                    <span className="w-1.5 h-1.5 bg-cyan-500/50 animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-cyan-500/50 animate-bounce [animation-delay:0.1s]"></span>
                                    <span className="w-1.5 h-1.5 bg-cyan-500/50 animate-bounce [animation-delay:0.2s]"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef}></div>
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="h-16 border-t border-cyan-900/50 bg-black p-2 flex gap-2 shrink-0">
                    <div className="flex-1 relative border border-cyan-900/30 bg-cyan-950/5 focus-within:border-cyan-500/50 transition-colors cyber-shape">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            placeholder="ENTER_COMMAND..."
                            className="w-full h-full bg-transparent text-cyan-100 px-4 text-xs md:text-sm outline-none placeholder-cyan-900 font-mono tracking-wider"
                            disabled={isTyping}
                            autoComplete="off"
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="w-20 border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold text-[10px] tracking-widest cyber-shape disabled:opacity-30"
                    >
                        SEND
                    </button>
                </form>
            </div>
        </div>
    );
};
