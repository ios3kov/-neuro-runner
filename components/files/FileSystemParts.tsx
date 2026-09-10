import React, { useCallback, useMemo, useState } from 'react';
import type { FileNode } from '../../types';
import { getIcon } from '../../data/fileSystem';
import { useVisibleInterval } from '../../hooks/useVisibleInterval';

export const PARENT_ID = '..parent';

export interface ParentLinkNode {
    id: typeof PARENT_ID;
    name: string;
    type: 'FOLDER';
    isParentLink: true;
    description?: string;
    isHidden?: boolean;
    isPasswordProtected?: boolean;
    gameId?: undefined;
    children?: undefined;
}

export type NavigableNode = FileNode | ParentLinkNode;

export const isParentNode = (node: NavigableNode): node is ParentLinkNode => {
    return node.id === PARENT_ID;
};

interface FileGridItemProps {
    node: NavigableNode;
    isParent: boolean;
    isFocused: boolean;
    tileHeight?: number;
    addr?: string;
    size?: number;
    onNavigate: (node: FileNode) => void;
    onUpLevel: () => void;
}

interface FileListItemProps {
    node: NavigableNode;
    isParent: boolean;
    isFocused: boolean;
    size?: number;
    perm?: string;
    onNavigate: (node: FileNode) => void;
    onUpLevel: () => void;
}

// --- DECORATIVE LAYER (Memoized) ---
export const DecorLayer = React.memo(() => {
    const [tick, setTick] = useState(0);

    const advanceTick = useCallback(() => setTick((t) => t + 1), []);
    useVisibleInterval(advanceTick, 10000);

    const uptime = 0x829A + (tick * 15);
    const heap = 42 + (tick % 5);

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none opacity-30">
          <div className="absolute top-24 right-4 text-[6px] text-cyan-900 font-bold flex flex-col items-end gap-1">
              <span>MEM_ALLOC: 0x{uptime.toString(16).toUpperCase()}</span>
              <span>HEAP: {heap}%</span>
              <span>STACK: OK</span>
          </div>
          <div className="absolute bottom-40 left-6 text-[6px] text-cyan-900 font-bold -rotate-90 origin-bottom-left">
              SECURE_CONNECTION_ESTABLISHED_V4
          </div>
          <div className="absolute top-1/2 left-4 text-[6px] text-cyan-950 font-black tracking-widest border-l border-cyan-900/50 pl-2">
              <div>SYS_UPTIME: {12000 + tick * 5}</div>
              <div>NODE_ID: 77-4A</div>
          </div>
          <div className="absolute top-1/3 right-10 text-[6px] text-cyan-900/50 flex flex-col gap-2 font-mono">
              <span>0101001</span>
              <span>1100101</span>
              <span>0011100</span>
          </div>
      </div>
    );
});
DecorLayer.displayName = 'DecorLayer';

// --- HEADER STATUS (Memoized) ---
export const HeaderStatus = React.memo(function HeaderStatus({
  username,
  sessionStartTime,
}: {
  username: string;
  sessionStartTime?: number | null;
}) {
  const [headerToggle, setHeaderToggle] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const toggleHeader = useCallback(() => setHeaderToggle((p) => !p), []);
  const refreshTime = useCallback(() => setCurrentTime(Date.now()), []);
  useVisibleInterval(toggleHeader, 4000);
  useVisibleInterval(refreshTime, 1000);

  const sessionDuration = useMemo(() => {
    if (!sessionStartTime) return '00:00:00';
    const diff = currentTime - sessionStartTime;
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [currentTime, sessionStartTime]);

  return (
    <div className="flex flex-col w-full mb-3 border-b border-cyan-900/30 pb-1 h-[34px] justify-center relative overflow-hidden shrink-0">
      <div
        className={`absolute w-full flex flex-col transition-all duration-500 ${
          !headerToggle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <span className="text-cyan-800 text-[10px] tracking-[0.2em] uppercase font-bold">
          Runner: {username}
        </span>
        <span className="text-[8px] text-cyan-900 uppercase tracking-widest">
          Sys_Node_01 // Online
        </span>
      </div>

      <div
        className={`absolute w-full flex flex-col transition-all duration-500 ${
          headerToggle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-500 animate-[pulse_1s_infinite] cyber-shape" />
          <span className="text-red-500/80 text-[10px] tracking-[0.2em] uppercase font-bold">
            REC_IN_PROGRESS
          </span>
        </div>
        <span className="text-[8px] text-red-900/60 uppercase tracking-widest font-mono">
          SESSION: {sessionDuration}
        </span>
      </div>
    </div>
  );
});
HeaderStatus.displayName = 'HeaderStatus';

// --- MEMOIZED ITEMS ---

export const FileGridItem = React.memo(function FileGridItem({ 
    node, isParent, isFocused, tileHeight, addr = '0x00', size = 0, onNavigate, onUpLevel 
}: FileGridItemProps) {
    if (isParent) {
        return (
            <div id={`node-${node.id}`} onClick={onUpLevel}
                style={{ height: tileHeight }}
                className={`group border border-cyan-500/10 p-4 flex flex-col justify-center items-center gap-2 cursor-pointer transition-all cyber-shape relative overflow-hidden
                ${isFocused ? 'ring-1 ring-cyan-400 bg-cyan-500/10 scale-[1.02]' : 'hover:bg-cyan-500/5'}`}>
                <div className="w-8 flex justify-center shrink-0">
                        <span className="text-xl group-hover:-translate-y-1 transition-transform leading-none">↑</span>
                </div>
                <span className="text-[9px] font-bold tracking-widest uppercase text-cyan-800">..PARENT DIRECTORY</span>
                <div className="absolute inset-0 bg-cyan-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
            </div>
        );
    }

    return (
        <div id={`node-${node.id}`} onClick={() => onNavigate(node as FileNode)}
            style={{ height: tileHeight }}
            className={`group border p-3 flex flex-col justify-between cursor-pointer transition-all cyber-shape relative overflow-hidden 
                ${isFocused ? 'ring-1 ring-cyan-400 bg-cyan-500/10 scale-[1.02]' : ''} 
                ${node.type === 'FOLDER' ? 'border-cyan-500/30 hover:bg-cyan-500/10' : node.isHidden ? 'border-yellow-500/20 hover:bg-yellow-500/5' : 'border-cyan-500/10 hover:bg-white/5'}`}>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/20"></div>
            <div className="flex justify-between items-start mb-2">
                <div className="w-8 flex justify-center shrink-0">
                    <span className={`text-2xl filter grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100 leading-none ${node.isHidden ? 'text-yellow-500' : ''}`}>{getIcon(node as FileNode)}</span>
                </div>
                <div className="text-[6px] text-cyan-900 font-bold border border-cyan-900/30 px-1 tracking-tighter">{addr}</div>
            </div>
            <div className="flex flex-col z-10 mb-2">
                <span className={`text-[9px] font-black transition-colors uppercase tracking-wider truncate ${node.isHidden ? 'text-yellow-500/80 group-hover:text-yellow-400' : 'text-cyan-100 group-hover:text-cyan-400'}`} title={node.name}>{node.name}</span>
                {node.description && <span className="text-[6px] text-cyan-800 uppercase mt-0.5 font-bold truncate leading-none">{node.description}</span>}
            </div>
            <div className="mt-auto pt-2 border-t border-cyan-500/10 flex flex-wrap justify-between items-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-[5px] text-cyan-700 font-mono tracking-tight">{node.type === 'FOLDER' ? 'DIR' : 'BIN'}</span>
                <span className="text-[5px] text-cyan-700 font-mono tracking-tight">{size}KB</span>
            </div>
            <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none ${node.isHidden ? 'bg-yellow-500/5' : 'bg-cyan-400/5'}`}></div>
        </div>
    );
});
FileGridItem.displayName = 'FileGridItem';

export const FileListItem = React.memo(function FileListItem({ 
    node, isParent, isFocused, size = 0, perm = '', onNavigate, onUpLevel 
}: FileListItemProps) {
    if (isParent) {
        return (
            <div id={`node-${node.id}`} onClick={onUpLevel}
                className={`grid grid-cols-12 items-center p-3 border-b border-cyan-900/30 cursor-pointer text-cyan-600 group transition-colors
                ${isFocused ? 'bg-cyan-900/20 border-cyan-500/40' : 'hover:bg-cyan-900/10'}`}>
                <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                    <div className="w-8 flex justify-center shrink-0">
                        <span className="text-lg group-hover:-translate-x-1 transition-transform leading-none">←</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate">..</span>
                        <span className="text-[8px] text-cyan-800 truncate">PARENT_DIRECTORY</span>
                    </div>
                </div>
                <div className="col-span-2 text-[10px] text-cyan-800 font-mono">DIR</div>
                <div className="col-span-2 text-[10px] text-cyan-800 font-mono"></div>
                <div className="col-span-2 text-[10px] text-cyan-800 font-mono text-right">r-x</div>
            </div>
        );
    }

    return (
        <div id={`node-${node.id}`} onClick={() => onNavigate(node as FileNode)}
                className={`grid grid-cols-12 items-center p-3 border-b cursor-pointer group transition-colors 
                ${isFocused ? 'bg-cyan-500/10 border-cyan-500/40' : 'hover:bg-cyan-500/5'}
                ${node.isHidden ? 'border-yellow-900/10' : 'border-cyan-900/10'}`}>
            <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                <div className="w-8 flex justify-center shrink-0">
                    <span className="text-lg filter grayscale group-hover:grayscale-0 transition-all leading-none">{getIcon(node as FileNode)}</span>
                </div>
                <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-bold truncate transition-colors ${node.isHidden ? 'text-yellow-600 group-hover:text-yellow-400' : 'text-cyan-300 group-hover:text-cyan-100'}`}>{node.name}</span>
                        <span className="text-[8px] text-cyan-800 truncate">{node.description}</span>
                </div>
            </div>
            <div className="col-span-2 text-[10px] text-cyan-700 font-mono">{node.type}</div>
            <div className="col-span-2 text-[10px] text-cyan-700 font-mono">{size} KB</div>
            <div className="col-span-2 text-[10px] text-cyan-700 font-mono text-right">{perm}</div>
        </div>
    );
});
FileListItem.displayName = 'FileListItem';
