import React from 'react';
import { useGameStore } from '../../gameStore';
import { Dialog } from '../Dialog';
export const StatsModal: React.FC<{isOpen:boolean;onClose:()=>void}> = ({isOpen,onClose}) => {
  const stats=useGameStore(s=>s.stats);
  return <Dialog open={isOpen} title="Archive history" onClose={onClose}><p className="nr-muted text-sm mb-5">Previous arcade scores remain on this device. CAT TERRITORY saves its progress on its own site and does not share it with this shell.</p>{Object.values(stats).length===0?<p className="text-sm">No previous arcade scores on this device.</p>:Object.values(stats).map(stat=><div key={stat.id} className="flex justify-between gap-3 py-3 border-b border-cyan-900"><div className="min-w-0"><p className="break-words">{stat.id}</p><p className="nr-muted text-xs">Plays: {stat.plays} · Level: {stat.maxLevelReached}</p></div><strong>{stat.highScore}</strong></div>)}</Dialog>;
};
