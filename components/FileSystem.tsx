
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { useGameStore } from '../gameStore';
import { FileNode, ViewMode } from '../types';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { AuthModal } from './modals/AuthModal';
import { ExitConfirmModal } from './modals/ExitConfirmModal';
import { StatsModal } from './modals/StatsModal';
import { FileViewerModal } from './modals/FileViewerModal';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useGridTileSizing } from '../hooks/useGridTileSizing';
import { useOverscrollGuard } from '../hooks/useOverscrollGuard';
import { useTelegramGuards } from '../hooks/useTelegramGuards';
import { 
    fileSystemData, 
    resolvePath, 
    getFileContent, 
    getIcon, 
    getDecorStats, 
    findNodeById
} from '../data/fileSystem';

// --- TYPES ---
const PARENT_ID = '..parent';

interface ParentLinkNode {
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

type NavigableNode = FileNode | ParentLinkNode;

const isParentNode = (node: NavigableNode): node is ParentLinkNode => {
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
const DecorLayer = React.memo(() => {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 5000); 
        return () => clearInterval(interval);
    }, []);

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
const HeaderStatus = React.memo(function HeaderStatus({
  username,
  sessionStartTime,
}: {
  username: string;
  sessionStartTime?: number | null;
}) {
  const [headerToggle, setHeaderToggle] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const toggleInterval = setInterval(() => setHeaderToggle((p) => !p), 4000);
    const timeInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => {
      clearInterval(toggleInterval);
      clearInterval(timeInterval);
    };
  }, []);

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

const FileGridItem = React.memo(function FileGridItem({ 
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
                    <span className={`text-2xl filter grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100 leading-none ${node.isHidden ? 'text-yellow-500' : ''}`}>{getIcon(node as any)}</span>
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

const FileListItem = React.memo(function FileListItem({ 
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
                    <span className="text-lg filter grayscale group-hover:grayscale-0 transition-all leading-none">{getIcon(node as any)}</span>
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

export const FileSystem: React.FC = () => {
  // --- CORE UI STATE ---
  const { 
    startGame, navigationPath, navigateDown, navigateUp, navigateBreadcrumb,
    viewMode, setViewMode, openedFileId, setOpenedFileId, expandedNodes, 
    toggleNodeExpansion, activeModal, authTargetId, openModal, closeModal, 
    consumeAuthTarget, handleGoBack, logout 
  } = useStore();

  const username = useStore((s) => s.user.username);
  const sessionStartTime = useStore((s) => s.user.sessionStartTime);
  const showHidden = useStore((s) => s.user.settings.showHidden);

  // Cache for decorative stats
  const decorCache = useRef<Map<string, ReturnType<typeof getDecorStats>>>(new Map());
  
  useEffect(() => {
      return () => {
          decorCache.current.clear();
      };
  }, []);

  const getCachedDecorStats = useCallback((id: string) => {
      if (!decorCache.current.has(id)) {
          decorCache.current.set(id, getDecorStats(id));
      }
      return decorCache.current.get(id)!;
  }, []);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const tileHeight = useGridTileSizing(gridContainerRef, viewMode);
  
  const scrollGuard = useOverscrollGuard();
  useTelegramGuards();

  const pathNodes = useMemo(() => resolvePath(navigationPath, fileSystemData), [navigationPath]); 
  const currentFolder = pathNodes[pathNodes.length - 1] || fileSystemData;
  const expandedSet = useMemo(() => new Set(expandedNodes), [expandedNodes]);
  const currentFolderChildren = currentFolder.children;
  
  const navigableItems = useMemo<NavigableNode[]>(() => {
      const visible = (currentFolderChildren || []).filter(node => !node.isHidden || showHidden);
      
      if (navigationPath.length > 1) {
          const parentNode: ParentLinkNode = {
              id: PARENT_ID, 
              name: '..PARENT_DIRECTORY', 
              type: 'FOLDER', 
              isParentLink: true 
          };
          return [parentNode, ...visible];
      }
      return visible;
  }, [currentFolderChildren, showHidden, navigationPath.length]);

  const executeNode = useCallback((node: FileNode) => {
      if (node.type === 'FOLDER') {
          navigateDown(node.id);
      } else if (node.type === 'EXE') {
          if (node.gameId) {
              startGame(node.gameId);
          } else {
              setOpenedFileId(node.id);
          }
      } else {
          setOpenedFileId(node.id);
      }
  }, [navigateDown, startGame, setOpenedFileId]);

  const handleNavigate = useCallback((node: FileNode) => {
    audio.playClick();
    haptics.impactLight();
    
    if (node.isPasswordProtected) {
        openModal('AUTH', node.id);
        return;
    }
    executeNode(node);
  }, [openModal, executeNode]);

  const handleUpLevel = useCallback(() => {
    audio.playClick();
    haptics.impactLight();
    navigateUp();
  }, [navigateUp]);

  const onKeyboardNavigate = useCallback((node: NavigableNode) => {
      if (isParentNode(node)) handleUpLevel();
      else handleNavigate(node);
  }, [handleUpLevel, handleNavigate]);

  const { focusedId, setFocusedId } = useKeyboardNavigation<NavigableNode>({
      items: navigableItems,
      viewMode,
      isActive: activeModal === 'NONE' && !openedFileId,
      onNavigate: onKeyboardNavigate
  });

  useEffect(() => {
      const handleGlobalKeys = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.isComposing) return;
          if (e.repeat) return;

          if (e.key === 'Backspace') {
              const active = document.activeElement as HTMLElement | null;
              const tagName = (active?.tagName || '').toUpperCase();
              const isInput = 
                  tagName === 'INPUT' || 
                  tagName === 'TEXTAREA' || 
                  active?.isContentEditable || 
                  active?.closest?.('[contenteditable="true"]') != null ||
                  active?.getAttribute?.('role') === 'textbox';
              
              if (isInput) return;
          }

          if (e.key === 'Escape' || e.key === 'Backspace') {
              e.preventDefault();
              audio.playClick();
              haptics.impactLight();
              handleGoBack();
          }
      };
      window.addEventListener('keydown', handleGlobalKeys);
      return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [handleGoBack]);

  useEffect(() => {
      setFocusedId(null);
  }, [navigationPath, setFocusedId]);

  const openedFileNode = useMemo(() => {
      if (!openedFileId) return null;
      return findNodeById(openedFileId, fileSystemData);
  }, [openedFileId]);

  const authTargetNode = useMemo(() => {
      if (!authTargetId) return null;
      return findNodeById(authTargetId, fileSystemData);
  }, [authTargetId]);

  const handleAuthSuccess = useCallback(() => {
      const targetId = consumeAuthTarget();
      if (!targetId) return;

      const node = findNodeById(targetId, fileSystemData);
      if (node) {
          executeNode(node);
          haptics.notificationSuccess();
      }
  }, [consumeAuthTarget, executeNode]);

  const handleBreadcrumbClick = useCallback((i: number) => {
    audio.playClick();
    haptics.impactLight();
    navigateBreadcrumb(i);
  }, [navigateBreadcrumb]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    audio.playClick();
    haptics.impactLight();
    setViewMode(mode);
  }, [setViewMode]);

  const handleStatsOpen = useCallback(() => {
      audio.playClick();
      haptics.impactLight();
      openModal('STATS');
  }, [openModal]);

  const handleExitClick = useCallback((e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      audio.playClick();
      haptics.impactMedium();
      openModal('EXIT_CONFIRM');
  }, [openModal]);

  const confirmExit = useCallback(() => {
      audio.playClick();
      haptics.impactLight();
      logout(); // Return to LOGIN state
      closeModal();
  }, [closeModal, logout]);

  const toggleExpand = useCallback((e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      audio.playHover();
      haptics.impactLight();
      toggleNodeExpansion(nodeId);
  }, [toggleNodeExpansion]);
  
  const handleFileViewerClose = useCallback(() => {
      setOpenedFileId(null);
  }, [setOpenedFileId]);

  const renderGrid = () => (
    <div 
        ref={gridContainerRef}
        {...scrollGuard}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto pb-32 custom-scrollbar absolute inset-0 z-10 pr-2 overscroll-contain content-start"
    >
        {navigableItems.map(node => {
            const isParent = isParentNode(node);
            const isFocused = node.id === focusedId;
            const stats = !isParent ? getCachedDecorStats(node.id) : undefined;

            return (
                <FileGridItem
                    key={node.id}
                    node={node}
                    isParent={isParent}
                    isFocused={isFocused}
                    tileHeight={tileHeight}
                    addr={stats?.addr}
                    size={stats?.size}
                    onNavigate={handleNavigate}
                    onUpLevel={handleUpLevel}
                />
            );
        })}
    </div>
  );

  const renderList = () => (
    <div 
        {...scrollGuard}
        className="flex flex-col gap-1 overflow-y-auto pb-32 custom-scrollbar absolute inset-0 z-10 pr-2 overscroll-contain"
    >
        <div className="grid grid-cols-12 px-3 py-2 text-[8px] text-cyan-800 uppercase tracking-widest font-bold border-b border-cyan-900/50 sticky top-0 bg-black z-20">
            <div className="col-span-6">Filename</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2 text-right">Auth</div>
        </div>

        {navigableItems.map(node => {
            const isParent = isParentNode(node);
            const isFocused = node.id === focusedId;
            const stats = !isParent ? getCachedDecorStats(node.id) : undefined;

            return (
                <FileListItem
                    key={node.id}
                    node={node}
                    isParent={isParent}
                    isFocused={isFocused}
                    size={stats?.size}
                    perm={stats?.perm}
                    onNavigate={handleNavigate}
                    onUpLevel={handleUpLevel}
                />
            );
        })}
    </div>
  );

  const currentPathId = navigationPath[navigationPath.length - 1];
  
  const renderRecursiveTree = (node: FileNode, depth: number) => {
      const isExpanded = expandedSet.has(node.id);
      const isCurrent = currentPathId === node.id;
      const isFocused = node.id === focusedId;
      
      const visibleKids = node.children?.filter(c => !c.isHidden || showHidden) || [];
      const hasChildren = visibleKids.length > 0;

      return (
        <div key={node.id}>
            <div 
                id={`node-${node.id}`}
                className={`flex items-center py-1 cursor-pointer transition-colors border-l-2 
                    ${isFocused ? 'bg-cyan-500/10 border-cyan-400' : isCurrent ? 'bg-cyan-900/30 border-cyan-400' : 'border-transparent hover:bg-cyan-900/10'}`}
                style={{ paddingLeft: `${depth * 16}px` }}
                onClick={() => handleNavigate(node)}
            >
                <div 
                    onClick={(e) => hasChildren && toggleExpand(e, node.id)}
                    className={`w-4 h-4 mr-2 flex items-center justify-center border border-cyan-700/50 bg-black text-[9px] font-bold text-cyan-500 transition-colors cyber-shape ${hasChildren ? 'hover:bg-cyan-900/40 cursor-pointer' : 'opacity-20 pointer-events-none border-none'}`}
                >
                    {isExpanded ? '−' : '+'}
                </div>

                <div className="w-5 flex justify-center mr-2 opacity-80 filter grayscale shrink-0">
                     <span className="text-sm leading-none">{getIcon(node)}</span>
                </div>
                
                <span className={`text-xs font-bold tracking-wider truncate ${node.type === 'FOLDER' ? (isCurrent ? 'text-white' : 'text-cyan-400') : node.isHidden ? 'text-yellow-500' : 'text-cyan-200'}`}>
                    {node.name}
                </span>
            </div>

            {hasChildren && isExpanded && (
                <div className="border-l border-cyan-900/10 ml-[8px]" style={{ marginLeft: `${depth * 16 + 8}px` }}>
                    {visibleKids.map((child) => renderRecursiveTree(child, depth + 1))}
                </div>
            )}
        </div>
      );
  };

  const renderTree = () => (
      <div 
        {...scrollGuard}
        className="flex flex-col overflow-y-auto pb-32 custom-scrollbar font-mono select-none absolute inset-0 z-10 pr-2 overscroll-contain"
      >
          <div className="mb-2 text-[9px] text-cyan-800 uppercase tracking-widest border-b border-cyan-900/30 pb-1">Hierarchy // Mode</div>
          {renderRecursiveTree(fileSystemData, 0)}
      </div>
  );

  return (
    <div className="flex flex-col h-full font-mono select-none overflow-hidden animate-in fade-in duration-700 relative bg-black">
        <DecorLayer />
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

        <div 
            className="flex flex-col h-full px-6 pb-6 md:px-12 relative z-10"
            style={{ paddingTop: 'calc(var(--tg-safe-area-top, 0px) + 56px)' }} 
        >
            <HeaderStatus username={username} sessionStartTime={sessionStartTime} />

            <div className="flex justify-between items-center w-full mb-5 gap-4 shrink-0">
                <div className="flex gap-2">
                    <button onClick={() => handleViewChange('GRID')} className={`w-10 h-10 flex items-center justify-center border transition-all cyber-shape ${viewMode === 'GRID' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-cyan-900/30 text-cyan-900 hover:text-cyan-500'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4V6zm10 0h6v6h-6V6zm-10 10h6v6H4v-6zm10 0h6v6h-6v-6z" /></svg>
                    </button>
                    <button onClick={() => handleViewChange('LIST')} className={`w-10 h-10 flex items-center justify-center border transition-all cyber-shape ${viewMode === 'LIST' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-cyan-900/30 text-cyan-900 hover:text-cyan-500'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <button onClick={() => handleViewChange('TREE')} className={`w-10 h-10 flex items-center justify-center border transition-all cyber-shape ${viewMode === 'TREE' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-cyan-900/30 text-cyan-900 hover:text-cyan-500'}`}>
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6v4H9zm-5 14h6v4H4zm10 0h6v4h-6zM12 7v3M7 10h10M7 10v7M17 10v7" /></svg>
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleStatsOpen} className="border border-cyan-500/30 w-10 h-10 flex items-center justify-center hover:bg-cyan-500/10 transition-all cyber-shape group relative overflow-hidden">
                         <div className="absolute inset-0 bg-cyan-400/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <svg className="w-4 h-4 text-cyan-400 group-hover:text-cyan-200 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                    </button>
                    <button onClick={handleExitClick} className="border border-red-500/30 w-10 h-10 flex items-center justify-center hover:bg-red-500/10 transition-all cyber-shape group relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <svg className="w-5 h-5 text-red-500 group-hover:text-red-300 relative z-10" viewBox="0 0 24 24" fill="currentColor">
                             <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6 text-[11px] font-bold text-cyan-700 bg-cyan-950/10 p-2 rounded-sm border border-cyan-500/5 relative z-10 shrink-0">
                {pathNodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                        <span 
                          className={`cursor-pointer transition-colors ${i === pathNodes.length - 1 ? 'text-cyan-300' : 'hover:text-cyan-400'}`}
                          onClick={() => handleBreadcrumbClick(i)}
                        >
                            {node.name.toUpperCase()}
                        </span>
                        {i < pathNodes.length - 1 && <span className="opacity-30">/</span>}
                    </React.Fragment>
                ))}
            </div>

            <div className="flex-1 min-h-0 relative">
                {viewMode === 'GRID' && renderGrid()}
                {viewMode === 'LIST' && renderList()}
                {viewMode === 'TREE' && renderTree()}
            </div>

            <AuthModal 
                isOpen={activeModal === 'AUTH' && !!authTargetNode}
                targetName={authTargetNode?.name}
                onClose={closeModal}
                onSuccess={handleAuthSuccess}
            />
            
            <ExitConfirmModal 
                isOpen={activeModal === 'EXIT_CONFIRM'}
                onCancel={closeModal}
                onConfirm={confirmExit}
            />

            <StatsModal 
                isOpen={activeModal === 'STATS'}
                onClose={closeModal}
            />

            <FileViewerModal 
                isOpen={!!openedFileId}
                fileName={openedFileNode?.name}
                fileIcon={openedFileNode ? getIcon(openedFileNode) : undefined}
                content={openedFileNode ? getFileContent(openedFileNode.id) : undefined}
                onClose={handleFileViewerClose}
            />
        </div>
    </div>
  );
};
