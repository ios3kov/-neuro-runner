
import React from 'react';
import { useGameStore } from '../../gameStore';
import { GameStats } from '../../types';
import { useOverscrollGuard } from '../../hooks/useOverscrollGuard';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
    const stats = useGameStore((s) => s.stats);
    const scrollGuard = useOverscrollGuard();

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-300">
            <div className="border border-cyan-500/30 p-8 w-full max-w-xl bg-black relative cyber-shape-lg shadow-[0_0_50px_rgba(0,240,255,0.05)]">
                <div className="flex justify-between items-center mb-8 border-b border-cyan-500/20 pb-4">
                    <h2 className="text-2xl font-black text-cyan-400 tracking-[0.4em] uppercase">Core_Metrics</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-red-500 border border-red-900/40 hover:bg-red-900/20 transition-all text-lg font-bold cyber-shape leading-none">✕</button>
                </div>
                <div {...scrollGuard} className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar overscroll-contain">
                    {Object.values(stats).length === 0 ? (
                        <div className="text-cyan-900 text-xs italic">NO_SIMULATION_DATA_DETECTED...</div>
                    ) : (
                        Object.values(stats).map((stat: GameStats) => (
                            <div key={stat.id} className="border border-cyan-500/10 p-5 bg-cyan-950/5 flex justify-between items-center group hover:bg-cyan-500/5 transition-all cyber-shape">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-cyan-100 uppercase tracking-widest">{stat.id}</span>
                                    <span className="text-[9px] text-cyan-800 uppercase mt-1">Executions: {stat.plays} // Max_Level: {stat.maxLevelReached}</span>
                                </div>
                                <div className="text-xl font-bold text-cyan-400 font-mono group-hover:scale-110 transition-transform">{stat.highScore}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};