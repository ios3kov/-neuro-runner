
import React, { useState, useEffect } from 'react';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { useStore } from '../../store';
import { LogLevel } from '../../types';
import { LORE_PASSWORD } from '../../data/fileSystem';
import { VirtualKeyboard } from '../VirtualKeyboard';

interface AuthModalProps {
    isOpen: boolean;
    targetName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen, targetName, onClose, onSuccess
}) => {
    const addLog = useStore((s) => s.addLog);
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [showKeyboard, setShowKeyboard] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError(false);
            // Delay keyboard slightly for animation smoothness
            setTimeout(() => setShowKeyboard(true), 100);
        } else {
            setShowKeyboard(false);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (password === LORE_PASSWORD) {
            audio.playSuccess();
            haptics.notificationSuccess();
            addLog(LogLevel.SUCCESS, `ACCESS GRANTED: ${targetName || 'UNKNOWN'}`);
            onSuccess();
        } else {
            audio.playError();
            haptics.notificationError();
            setError(true);
            setPassword('');
            addLog(LogLevel.ERR, `ACCESS DENIED: INVALID KEY`);
        }
    };

    // --- KEYBOARD HANDLERS ---
    const handleKeyPress = (key: string) => {
        if (password.length < 12) {
            setPassword(prev => prev + key);
            setError(false);
        } else {
            audio.playError();
            haptics.notificationWarning();
        }
    };

    const handleDelete = () => setPassword(prev => prev.slice(0, -1));
    const handleClear = () => setPassword('');

    if (!isOpen) return null;

    return (
        <>
            <div className="absolute inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-200">
                <div className={`border-2 p-8 w-full max-w-sm bg-black relative cyber-shape shadow-[0_0_50px_rgba(255,0,0,0.1)] transition-all duration-300 ${showKeyboard ? '-translate-y-12' : 'translate-y-0'} ${error ? 'border-red-500/80' : 'border-cyan-500/50'}`}>
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 mx-auto mb-4 text-red-500 border border-red-500 cyber-shape flex items-center justify-center text-xl bg-red-950/10">
                            🔒
                        </div>
                        <h2 className={`text-lg font-black tracking-[0.2em] mb-1 uppercase ${error ? 'text-red-500' : 'text-cyan-400'}`}>
                            {error ? 'ACCESS DENIED' : 'SECURE GATEWAY'}
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            ENTER DECRYPTION KEY
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* INPUT DISPLAY */}
                        <div 
                            onClick={() => { audio.playClick(); setShowKeyboard(true); }}
                            className={`w-full bg-black border-b-2 px-2 py-3 text-center cursor-pointer transition-colors ${error ? 'border-red-500 text-red-500 animate-pulse' : 'border-cyan-800 text-cyan-100 hover:border-cyan-400'}`}
                        >
                            {password ? (
                                <span className="text-lg tracking-[0.5em] font-bold flex justify-center items-center">
                                    {password.split('').map((_, i) => (
                                        <span key={i} className="leading-none">•</span>
                                    ))}
                                    {showKeyboard && <span className="terminal-cursor ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle"></span>}
                                </span>
                            ) : (
                                <span className="text-gray-800 text-xs italic tracking-normal uppercase">TAP_TO_ENTER_KEY</span>
                            )}
                        </div>
                        
                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-3 border border-red-900/30 text-red-700 hover:text-red-400 hover:border-red-500 hover:bg-red-950/20 font-bold text-[10px] uppercase tracking-widest transition-all cyber-shape">
                                CANCEL
                            </button>
                            <button onClick={handleSubmit} className="flex-1 py-3 bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold text-[10px] uppercase tracking-widest transition-all cyber-shape">
                                UNLOCK
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* INTEGRATED KEYBOARD */}
            {showKeyboard && (
                <VirtualKeyboard 
                    onKeyPress={handleKeyPress}
                    onDelete={handleDelete}
                    onClear={handleClear}
                    onNext={() => {}} 
                    onSubmit={handleSubmit}
                    onClose={() => setShowKeyboard(false)}
                    showSubmit={true}
                />
            )}
        </>
    );
};
