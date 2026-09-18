import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import type { FileNode, ViewMode } from '../types';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { activateFileNode } from '../utils/fileActivation';
import { AuthModal } from './modals/AuthModal';
import { ExitConfirmModal } from './modals/ExitConfirmModal';
import { StatsModal } from './modals/StatsModal';
import { FileViewerModal } from './modals/FileViewerModal';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useGridTileSizing } from '../hooks/useGridTileSizing';
import { useOverscrollGuard } from '../hooks/useOverscrollGuard';
import { useTelegramGuards } from '../hooks/useTelegramGuards';
import {
  DecorLayer,
  FileGridItem,
  FileListItem,
  PARENT_ID,
  isParentNode,
  type NavigableNode,
  type ParentLinkNode,
} from './files/FileSystemParts';
import { FileSystemChrome } from './files/FileSystemChrome';
import { EmbeddedGameView } from './EmbeddedGameView';
import {
  fileSystemData,
  resolvePath,
  getFileContent,
  getIcon,
  getDecorStats,
  findNodeById,
} from '../data/fileSystem';

export const FileSystem: React.FC = () => {
  const {
    startGame,
    navigationPath,
    navigateDown,
    navigateUp,
    navigateBreadcrumb,
    viewMode,
    setViewMode,
    openedFileId,
    setOpenedFileId,
    embeddedGameUrl,
    openEmbeddedGame,
    closeEmbeddedGame,
    expandedNodes,
    toggleNodeExpansion,
    activeModal,
    authTargetId,
    openModal,
    closeModal,
    consumeAuthTarget,
    handleGoBack,
    logout,
  } = useStore(useShallow((state) => ({
    startGame: state.startGame,
    navigationPath: state.navigationPath,
    navigateDown: state.navigateDown,
    navigateUp: state.navigateUp,
    navigateBreadcrumb: state.navigateBreadcrumb,
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
    openedFileId: state.openedFileId,
    setOpenedFileId: state.setOpenedFileId,
    embeddedGameUrl: state.embeddedGameUrl,
    openEmbeddedGame: state.openEmbeddedGame,
    closeEmbeddedGame: state.closeEmbeddedGame,
    expandedNodes: state.expandedNodes,
    toggleNodeExpansion: state.toggleNodeExpansion,
    activeModal: state.activeModal,
    authTargetId: state.authTargetId,
    openModal: state.openModal,
    closeModal: state.closeModal,
    consumeAuthTarget: state.consumeAuthTarget,
    handleGoBack: state.handleGoBack,
    logout: state.logout,
  })));

  const username = useStore((state) => state.user.username);
  const sessionStartTime = useStore((state) => state.user.sessionStartTime);
  const showHidden = useStore((state) => state.user.settings.showHidden);

  const decorCache = useRef<Map<string, ReturnType<typeof getDecorStats>>>(new Map());
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const tileHeight = useGridTileSizing(gridContainerRef, viewMode);
  const scrollGuard = useOverscrollGuard();
  useTelegramGuards();

  useEffect(() => () => decorCache.current.clear(), []);

  const getCachedDecorStats = useCallback((id: string) => {
    if (!decorCache.current.has(id)) decorCache.current.set(id, getDecorStats(id));
    return decorCache.current.get(id)!;
  }, []);

  const pathNodes = useMemo(() => resolvePath(navigationPath, fileSystemData), [navigationPath]);
  const currentFolder = pathNodes[pathNodes.length - 1] || fileSystemData;
  const expandedSet = useMemo(() => new Set(expandedNodes), [expandedNodes]);

  const navigableItems = useMemo<NavigableNode[]>(() => {
    const visible = (currentFolder.children || []).filter((node) => !node.isHidden || showHidden);
    if (navigationPath.length <= 1) return visible;
    const parentNode: ParentLinkNode = {
      id: PARENT_ID,
      name: '..PARENT_DIRECTORY',
      type: 'FOLDER',
      isParentLink: true,
    };
    return [parentNode, ...visible];
  }, [currentFolder.children, navigationPath.length, showHidden]);

  const executeNode = useCallback((node: FileNode) => {
    activateFileNode(node, {
      navigateDown,
      startGame,
      openFile: setOpenedFileId,
      openEmbeddedUrl: openEmbeddedGame,
    });
  }, [navigateDown, openEmbeddedGame, setOpenedFileId, startGame]);

  const handleNavigate = useCallback((node: FileNode) => {
    audio.playClick();
    haptics.impactLight();
    if (node.isPasswordProtected) {
      openModal('AUTH', node.id);
      return;
    }
    executeNode(node);
  }, [executeNode, openModal]);

  const handleUpLevel = useCallback(() => {
    audio.playClick();
    haptics.impactLight();
    navigateUp();
  }, [navigateUp]);

  const onKeyboardNavigate = useCallback((node: NavigableNode) => {
    if (isParentNode(node)) handleUpLevel();
    else handleNavigate(node);
  }, [handleNavigate, handleUpLevel]);

  const { focusedId, setFocusedId } = useKeyboardNavigation<NavigableNode>({
    items: navigableItems,
    viewMode,
    isActive: activeModal === 'NONE' && !openedFileId && !embeddedGameUrl,
    onNavigate: onKeyboardNavigate,
  });

  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      if (embeddedGameUrl && (event.key === 'Escape' || event.key === 'Backspace')) {
        event.preventDefault();
        closeEmbeddedGame();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
      if (event.key === 'Backspace') {
        const active = document.activeElement as HTMLElement | null;
        const tagName = (active?.tagName || '').toUpperCase();
        const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || active?.isContentEditable || active?.closest?.('[contenteditable="true"]') != null || active?.getAttribute?.('role') === 'textbox';
        if (isInput) return;
      }
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        audio.playClick();
        haptics.impactLight();
        handleGoBack();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [closeEmbeddedGame, embeddedGameUrl, handleGoBack]);

  useEffect(() => setFocusedId(null), [navigationPath, setFocusedId]);

  const openedFileNode = useMemo(() => openedFileId ? findNodeById(openedFileId, fileSystemData) : null, [openedFileId]);
  const authTargetNode = useMemo(() => authTargetId ? findNodeById(authTargetId, fileSystemData) : null, [authTargetId]);

  const handleAuthSuccess = useCallback(() => {
    const targetId = consumeAuthTarget();
    if (!targetId) return;
    const node = findNodeById(targetId, fileSystemData);
    if (!node) return;
    executeNode(node);
    haptics.notificationSuccess();
  }, [consumeAuthTarget, executeNode]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    audio.playClick();
    haptics.impactLight();
    navigateBreadcrumb(index);
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

  const handleExitClick = useCallback(() => {
    audio.playClick();
    haptics.impactMedium();
    openModal('EXIT_CONFIRM');
  }, [openModal]);

  const confirmExit = useCallback(() => {
    audio.playClick();
    haptics.impactLight();
    logout();
    closeModal();
  }, [closeModal, logout]);

  const toggleExpand = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.stopPropagation();
    audio.playHover();
    haptics.impactLight();
    toggleNodeExpansion(nodeId);
  }, [toggleNodeExpansion]);

  const handleFileViewerClose = useCallback(() => setOpenedFileId(null), [setOpenedFileId]);

  const renderGrid = () => (
    <div
      ref={gridContainerRef}
      {...scrollGuard}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto pb-32 custom-scrollbar absolute inset-0 z-10 pr-2 overscroll-contain content-start"
    >
      {navigableItems.map((node) => {
        const isParent = isParentNode(node);
        const stats = !isParent ? getCachedDecorStats(node.id) : undefined;
        return (
          <FileGridItem
            key={node.id}
            node={node}
            isParent={isParent}
            isFocused={node.id === focusedId}
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
    <div {...scrollGuard} className="flex flex-col gap-1 overflow-y-auto pb-32 custom-scrollbar absolute inset-0 z-10 pr-2 overscroll-contain">
      <div className="grid grid-cols-12 px-3 py-2 text-[8px] text-cyan-800 uppercase tracking-widest font-bold border-b border-cyan-900/50 sticky top-0 bg-black z-20">
        <div className="col-span-6">Filename</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-2 text-right">Auth</div>
      </div>
      {navigableItems.map((node) => {
        const isParent = isParentNode(node);
        const stats = !isParent ? getCachedDecorStats(node.id) : undefined;
        return (
          <FileListItem
            key={node.id}
            node={node}
            isParent={isParent}
            isFocused={node.id === focusedId}
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

  const renderRecursiveTree = (node: FileNode, depth: number): React.ReactNode => {
    const isExpanded = expandedSet.has(node.id);
    const isCurrent = currentPathId === node.id;
    const isFocused = node.id === focusedId;
    const visibleKids = node.children?.filter((child) => !child.isHidden || showHidden) || [];
    const hasChildren = visibleKids.length > 0;

    return (
      <div key={node.id}>
        <div
          id={`node-${node.id}`}
          className={`flex items-center py-1 cursor-pointer transition-colors border-l-2 ${isFocused ? 'bg-cyan-500/10 border-cyan-400' : isCurrent ? 'bg-cyan-900/30 border-cyan-400' : 'border-transparent hover:bg-cyan-900/10'}`}
          style={{ paddingLeft: `${depth * 16}px` }}
          onClick={() => handleNavigate(node)}
        >
          <div
            onClick={(event) => hasChildren && toggleExpand(event, node.id)}
            className={`w-4 h-4 mr-2 flex items-center justify-center border border-cyan-700/50 bg-black text-[9px] font-bold text-cyan-500 transition-colors cyber-shape ${hasChildren ? 'hover:bg-cyan-900/40 cursor-pointer' : 'opacity-20 pointer-events-none border-none'}`}
          >
            {isExpanded ? '−' : '+'}
          </div>
          <div className="w-5 flex justify-center mr-2 opacity-80 filter grayscale shrink-0"><span className="text-sm leading-none">{getIcon(node)}</span></div>
          <span className={`text-xs font-bold tracking-wider truncate ${node.type === 'FOLDER' ? (isCurrent ? 'text-white' : 'text-cyan-400') : node.isHidden ? 'text-yellow-500' : 'text-cyan-200'}`}>{node.name}</span>
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
    <div {...scrollGuard} className="flex flex-col overflow-y-auto pb-32 custom-scrollbar font-mono select-none absolute inset-0 z-10 pr-2 overscroll-contain">
      <div className="mb-2 text-[9px] text-cyan-800 uppercase tracking-widest border-b border-cyan-900/30 pb-1">Hierarchy // Mode</div>
      {renderRecursiveTree(fileSystemData, 0)}
    </div>
  );

  return (
    <div className="flex flex-col h-full font-mono select-none overflow-hidden animate-in fade-in duration-700 relative bg-black">
      {embeddedGameUrl && <EmbeddedGameView url={embeddedGameUrl} onClose={closeEmbeddedGame} />}
      <DecorLayer />
      <div
        className="flex flex-col h-full px-6 pb-6 md:px-12 relative z-10"
        style={{ paddingTop: 'calc(var(--tg-safe-area-top, 0px) + 56px)' }}
      >
        <FileSystemChrome
          username={username}
          sessionStartTime={sessionStartTime}
          viewMode={viewMode}
          pathNodes={pathNodes}
          onViewChange={handleViewChange}
          onStatsOpen={handleStatsOpen}
          onExitClick={handleExitClick}
          onBreadcrumbClick={handleBreadcrumbClick}
        />

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
        <ExitConfirmModal isOpen={activeModal === 'EXIT_CONFIRM'} onCancel={closeModal} onConfirm={confirmExit} />
        <StatsModal isOpen={activeModal === 'STATS'} onClose={closeModal} />
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
