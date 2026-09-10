import React from 'react';
import type { FileNode, ViewMode } from '../../types';
import { HeaderStatus } from './FileSystemParts';

interface FileSystemChromeProps {
  username: string;
  sessionStartTime: number | null;
  viewMode: ViewMode;
  pathNodes: FileNode[];
  onViewChange: (mode: ViewMode) => void;
  onStatsOpen: () => void;
  onExitClick: () => void;
  onBreadcrumbClick: (index: number) => void;
}

const ViewButton: React.FC<{
  mode: ViewMode;
  activeMode: ViewMode;
  onClick: (mode: ViewMode) => void;
  children: React.ReactNode;
}> = ({ mode, activeMode, onClick, children }) => (
  <button
    onClick={() => onClick(mode)}
    className={`w-10 h-10 flex items-center justify-center border transition-all cyber-shape ${activeMode === mode ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-cyan-900/30 text-cyan-900 hover:text-cyan-500'}`}
    aria-label={`${mode.toLowerCase()} view`}
  >
    {children}
  </button>
);

export const FileSystemChrome: React.FC<FileSystemChromeProps> = ({
  username,
  sessionStartTime,
  viewMode,
  pathNodes,
  onViewChange,
  onStatsOpen,
  onExitClick,
  onBreadcrumbClick,
}) => (
  <>
    <div
      className="absolute top-0 left-0 w-full z-20 pointer-events-none"
      style={{ height: 'calc(var(--tg-safe-area-top, 0px) + 44px)' }}
    >
      <div className="absolute bottom-0 left-0 w-full h-[44px] flex items-center justify-center px-[72px]">
        <h1 className="text-xl font-black text-cyan-400 tracking-[0.2em] uppercase neon-text drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] leading-none truncate w-full text-center">
          NEURO<span className="text-white/50 mx-1">//</span>RUNNER
        </h1>
      </div>
    </div>

    <HeaderStatus username={username} sessionStartTime={sessionStartTime} />

    <div className="flex justify-between items-center w-full mb-5 gap-4 shrink-0">
      <div className="flex gap-2">
        <ViewButton mode="GRID" activeMode={viewMode} onClick={onViewChange}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4V6zm10 0h6v6h-6V6zm-10 10h6v6H4v-6zm10 0h6v6h-6v-6z" /></svg>
        </ViewButton>
        <ViewButton mode="LIST" activeMode={viewMode} onClick={onViewChange}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </ViewButton>
        <ViewButton mode="TREE" activeMode={viewMode} onClick={onViewChange}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6v4H9zm-5 14h6v4H4zm10 0h6v4h-6zM12 7v3M7 10h10M7 10v7M17 10v7" /></svg>
        </ViewButton>
      </div>

      <div className="flex gap-2">
        <button onClick={onStatsOpen} className="border border-cyan-500/30 w-10 h-10 flex items-center justify-center hover:bg-cyan-500/10 transition-all cyber-shape group relative overflow-hidden" aria-label="Open stats">
          <div className="absolute inset-0 bg-cyan-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <svg className="w-4 h-4 text-cyan-400 group-hover:text-cyan-200 relative z-10" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
        </button>
        <button onClick={onExitClick} className="border border-red-500/30 w-10 h-10 flex items-center justify-center hover:bg-red-500/10 transition-all cyber-shape group relative overflow-hidden" aria-label="Exit session">
          <div className="absolute inset-0 bg-red-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <svg className="w-5 h-5 text-red-500 group-hover:text-red-300 relative z-10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" /></svg>
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2 mb-6 text-[11px] font-bold text-cyan-700 bg-cyan-950/10 p-2 rounded-sm border border-cyan-500/5 relative z-10 shrink-0">
      {pathNodes.map((node, index) => (
        <React.Fragment key={node.id}>
          <span
            className={`cursor-pointer transition-colors ${index === pathNodes.length - 1 ? 'text-cyan-300' : 'hover:text-cyan-400'}`}
            onClick={() => onBreadcrumbClick(index)}
          >
            {node.name.toUpperCase()}
          </span>
          {index < pathNodes.length - 1 && <span className="opacity-30">/</span>}
        </React.Fragment>
      ))}
    </div>
  </>
);
