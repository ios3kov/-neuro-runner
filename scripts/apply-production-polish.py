"""One-time, assertion-checked migration on the audit branch only."""
from pathlib import Path
import re
import shutil

def read(name): return Path(name).read_text()
def write(name, text): Path(name).write_text(text)
def replace(text, old, new):
    assert text.count(old) == 1, f'Expected exactly one occurrence: {old[:100]}'
    return text.replace(old, new, 1)

s=read('store.ts')
s=replace(s,"import { persist } from 'zustand/middleware';","import { persist, createJSONStorage } from 'zustand/middleware';\nimport { safeStorage } from './utils/safeStorage';\nimport { sanitizeCore } from './state/persistedCore';")
s=replace(s,'    const gate = getEffectsGate(state);','    const gate = getEffectsGate(state);\n    audio.setSuspended(gate.silent);')
s=replace(s,'set({ authTargetId: null });','set({ activeModal: \'NONE\', authTargetId: null });')
s=replace(s,'set({ user: nextUser, appState: AppState.DESKTOP });',"set({ user: nextUser, appState: AppState.DESKTOP, currentGame: null, activeModal: 'NONE', authTargetId: null, openedFileId: null, isKeyboardOpen: false, navigationPath: [CORE_STORE_CONSTANTS.ROOT_ID] });")
start=s.index('        logout: () => {')
end=s.index('        startGame: (id) => {',start)
s=s[:start]+'''        logout: () => {
            set(state => ({ user: { ...state.user, sessionToken: '', sessionStartTime: null }, appState: AppState.LOGIN,
                currentGame: null, activeModal: 'NONE', authTargetId: null, openedFileId: null, isKeyboardOpen: false,
                navigationPath: [CORE_STORE_CONSTANTS.ROOT_ID] }));
            get().addLog(LogLevel.INFO, 'SESSION CLOSED');
        },

'''+s[end:]
s=replace(s,'            set({ currentGame: id, appState: AppState.GAME });',"            if (id !== 'AI_CHAT') return;\n            set({ currentGame: id, appState: AppState.GAME });")
start=s.index('      migrate: (persisted: unknown, _version: number): PersistedState => {')
end=s.index('      onRehydrateStorage:',start)
s=s[:start]+'''      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted: unknown) => sanitizeCore(persisted),
      merge: (persisted, current) => {
          const normalized = sanitizeCore(persisted);
          return { ...current, ...normalized, user: { ...current.user, ...normalized.user } };
      },

'''+s[end:]
write('store.ts',s)

s=read('gameStore.ts')
s=replace(s,"import { persist } from 'zustand/middleware';","import { persist, createJSONStorage } from 'zustand/middleware';\nimport { safeStorage } from './utils/safeStorage';\nimport { sanitizeHistory } from './utils/history';")
start=s.index('            migrate: (persistedState: unknown) => {')
end=s.index('\n        }\n    )',start)
s=s[:start]+'''            storage: createJSONStorage(() => safeStorage),
            partialize: state => ({ stats: state.stats, gameProgress: state.gameProgress, achievements: state.achievements }),
            migrate: (persisted: unknown) => sanitizeHistory(persisted),
            merge: (persisted, current) => ({ ...current, ...sanitizeHistory(persisted) })
'''+s[end:]
write('gameStore.ts',s)

s=read('components/FileSystem.tsx')
s=replace(s,"import type { FileNode, ViewMode } from '../types';","import { AppState, type FileNode, type ViewMode } from '../types';")
s=replace(s,"import { useTelegramGuards } from '../hooks/useTelegramGuards';\n",'')
s=replace(s,'  useTelegramGuards();\n','')
s=replace(s,"import { useGridTileSizing } from '../hooks/useGridTileSizing';\n",'')
s=replace(s,'  const tileHeight = useGridTileSizing(gridContainerRef, viewMode);\n','')
s=replace(s,'            tileHeight={tileHeight}\n','')
s=replace(s,'  const username = useStore((state) => state.user.username);','  const appState = useStore(state => state.appState);\n  const username = useStore((state) => state.user.username);')
s=replace(s,"isActive: activeModal === 'NONE' && !openedFileId,","isActive: appState === AppState.DESKTOP && activeModal === 'NONE' && !openedFileId,")
s=replace(s,'    const handleGlobalKeys = (event: KeyboardEvent) => {',"    const handleGlobalKeys = (event: KeyboardEvent) => {\n      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;")
s=replace(s,'flex flex-col h-full font-mono select-none overflow-hidden animate-in fade-in duration-700 relative bg-black','flex flex-col flex-1 min-h-0 font-mono overflow-hidden relative')
s=replace(s,'flex flex-col h-full px-6 pb-6 md:px-12 relative z-10','flex flex-col h-full min-h-0 p-4 md:px-8 relative z-10')
s=replace(s,"        style={{ paddingTop: 'calc(var(--tg-safe-area-top, 0px) + 56px)' }}\n",'')
s=s.replace('pb-32','pb-4')
start=s.index('      <div className="grid grid-cols-12 px-3')
end=s.index('      {navigableItems.map',start)
s=s[:start]+'      <div className="nr-kicker p-3">FILES / {currentFolder.name}</div>\n'+s[end:]
start=s.index('  const renderRecursiveTree =')
end=s.index('  const renderTree =',start)
s=s[:start]+'''  const renderRecursiveTree = (node: FileNode, depth: number): React.ReactNode => {
    const expanded = expandedSet.has(node.id);
    const children = node.children?.filter(child => !child.isHidden || showHidden) || [];
    return <div key={node.id}>
      <div className="flex items-center gap-1" style={{ paddingLeft: `${Math.min(depth, 5) * 12}px` }}>
        {children.length > 0 && node.id !== 'root'
          ? <button type="button" className="nr-icon-button" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`} aria-expanded={expanded} onClick={event => toggleExpand(event, node.id)}>{expanded ? '−' : '+'}</button>
          : <span className="w-11 shrink-0" aria-hidden="true" />}
        <button data-tree-node type="button" id={`node-${node.id}`} className="nr-file-row min-w-0" aria-label={node.name} onClick={() => node.id === 'root' ? navigateBreadcrumb(0) : handleNavigate(node)}>
          <span aria-hidden="true">{getIcon(node)}</span><span className="nr-file-name">{node.name}</span>{node.externalUrl && <span aria-hidden="true">↗</span>}
        </button>
      </div>
      {expanded && children.map(child => renderRecursiveTree(child, depth + 1))}
    </div>;
  };

'''+s[end:]
write('components/FileSystem.tsx',s)

s=read('components/AppContent.tsx')
s=replace(s,"import React, { useEffect } from 'react';","import React, { Suspense, lazy, useEffect } from 'react';")
s=replace(s,"import { AiChat } from './AiChat';","const AiChat = lazy(() => import('./AiChat').then(module => ({ default: module.AiChat })));")
s=replace(s,"return currentGame === 'AI_CHAT' ? <AiChat /> : null;","return currentGame === 'AI_CHAT' ? <Suspense fallback={<div role=\"status\" className=\"nr-login\">Opening OMNI…</div>}><AiChat /></Suspense> : null;")
s=s.replace('h-full flex flex-col relative animate-in fade-in zoom-in-95 duration-700','h-full min-h-0 flex flex-col relative')
write('components/AppContent.tsx',s)

s=read('types.ts')
s,n=re.subn(r'export type GameId =.*?;', "export type GameId = 'SETTINGS' | 'AI_CHAT';",s,count=1,flags=re.S)
assert n==1
write('types.ts',s)

removed_tests={'tests/gameArtDirection.test.ts','tests/inputTuning.test.ts','tests/levelResults.test.ts'}
for path in Path('.').rglob('*.tsx'):
    if 'node_modules' in path.parts or 'engine' in path.parts: continue
    assert not re.search(r"from ['\"][^'\"]*engine/",path.read_text()),f'Unexpected engine consumer {path}'
shutil.rmtree('engine')
for name in removed_tests | {'components/OrientationLockOverlay.tsx','components/VirtualKeyboard.tsx','components/login/LoginEasterEggOverlay.tsx','hooks/useHardwareKeyboard.ts','hooks/useTelegramGuards.ts','hooks/useGridTileSizing.ts','docs/BREAKOUT_PLAN.md','docs/PONG_DESIGN.md'}:
    Path(name).unlink(missing_ok=True)
print('Applied scoped source migration. Main and CAT TERRITORY were not modified.')
