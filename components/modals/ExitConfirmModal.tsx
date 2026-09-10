
import React from 'react';

interface ExitConfirmModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ isOpen, onCancel, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="border-2 border-red-600 p-8 w-full max-w-sm bg-black relative cyber-shape shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 border-2 border-red-600 text-red-600 mb-6 flex items-center justify-center text-2xl font-bold cyber-shape">
                        !
                    </div>
                    <h2 className="text-xl font-black text-red-500 tracking-[0.2em] mb-2 uppercase">TERMINATE SESSION?</h2>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-8 leading-tight">
                        You will be returned to the authentication screen.<br/>All progress is saved to local storage.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={onCancel} 
                            className="flex-1 py-3 border border-cyan-900/50 text-cyan-700 hover:text-cyan-400 hover:border-cyan-500 hover:bg-cyan-950/20 font-bold text-[10px] uppercase tracking-widest transition-all cyber-shape"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={onConfirm} 
                            className="flex-1 py-3 bg-red-600 text-black hover:bg-white font-black text-[10px] uppercase tracking-widest transition-all cyber-shape"
                        >
                            LOG OUT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
