
import React from 'react';
import { useOverscrollGuard } from '../../hooks/useOverscrollGuard';

interface FileViewerModalProps {
    isOpen: boolean;
    fileName?: string;
    fileIcon?: string;
    content?: string;
    onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ isOpen, fileName, fileIcon, content, onClose }) => {
    const scrollGuard = useOverscrollGuard();

    if (!isOpen || !fileName) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in duration-200">
            <div className="w-full max-w-2xl border border-cyan-500/30 bg-black relative cyber-shape-lg flex flex-col max-h-[calc(100vh-var(--tg-safe-area-top)-var(--tg-safe-area-bottom)-2rem)] shadow-[0_0_50px_rgba(0,240,255,0.05)]">
                {/* Viewer Header */}
                <div className="flex justify-between items-center border-b border-cyan-900/50 p-4 bg-cyan-950/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{fileIcon}</span>
                        <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs">{fileName}</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center text-red-500 border border-red-900/40 hover:bg-red-900/20 transition-all text-lg font-bold cyber-shape leading-none"
                    >
                        ✕
                    </button>
                </div>
                {/* Viewer Content */}
                <div 
                    {...scrollGuard}
                    className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-[10px] md:text-xs leading-relaxed text-cyan-100/80 whitespace-pre-wrap select-text overscroll-contain"
                >
                    {content}
                </div>
                {/* Viewer Footer */}
                <div className="p-2 border-t border-cyan-900/30 text-[8px] text-cyan-900 font-bold flex justify-between uppercase shrink-0">
                    <span>READ_ONLY // MODE</span>
                    <span>EOF_REACHED</span>
                </div>
            </div>
        </div>
    );
};