
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, GameId, LogEntry, LogLevel, UserSession, ViewMode, SuspendReason, VALID_VIEW_MODES } from './types';
import { audio } from './utils/audio';
import { haptics } from './utils/haptics';
import { CORE_STORE_CONSTANTS, DEFAULT_SETTINGS, type ModalType } from './state/coreConfig';
import { formatLogTimestamp, generateRuntimeId, isValidId, normalizeExpanded, normalizePath, reconcileExpanded, safeCounter } from './state/coreUtils';
import { subscribeSystemLog } from './utils/systemEvents';

// --- 1. TYPES ---

interface PersistedState {
    user: {
        username: string;
        settings: UserSession['settings'];
        omniAttempts: number;
        omniDeleted: boolean;
        omniIteration: number;
    };
    viewMode: ViewMode;
    expandedNodes: string[];
}

interface StoreState {
    // Data
    appState: AppState;
    logs: LogEntry[];
    currentGame: GameId | null;
    user: UserSession;
    viewMode: ViewMode;
    navigationPath: string[];
    expandedNodes: string[];
    openedFileId: string | null;
    isKeyboardOpen: boolean;
    activeModal: ModalType;
    authTargetId: string | null;
    
    // Runtime
    suspendReasons: Record<SuspendReason, boolean>;
    isSuspended: boolean;
    isRuntimeInitialized: boolean;

    // Actions
    login: (username: string) => void;
    logout: () => void;
    setAppState: (state: AppState) => void;
    startGame: (id: GameId) => void;
    stopGame: () => void;
    addLog: (level: LogLevel, message: string) => void;
    
    incrementOmniAttempts: () => void;
    markOmniDeleted: () => void;
    // Added resetOmniSession to match usage in components
    resetOmniSession: () => void;
    
    toggleSound: () => void;
    toggleMusic: () => void;
    toggleHidden: () => void;
    toggleHaptics: () => void;
    toggleLowPower: () => void;
    
    setViewMode: (mode: ViewMode) => void;
    setNavigationPath: (pathIds: string[]) => void;
    navigateDown: (id: string) => void;
    navigateUp: () => void;
    navigateBreadcrumb: (index: number) => void;
    
    setOpenedFileId: (id: string | null) => void;
    toggleNodeExpansion: (id: string) => void;
    setExpandedNodes: (ids: string[]) => void;
    setKeyboardOpen: (isOpen: boolean) => void;
    
    openModal: (type: ModalType, targetId?: string) => void;
    consumeAuthTarget: () => string | null;
    closeModal: () => void;
    handleGoBack: () => void;
    
    setSuspendReasons: (updates: Partial<Record<SuspendReason, boolean>>) => void;
    initRuntime: () => void;
}

// --- 4. EFFECTS ORCHESTRATION ---

// Tracks the actual state of the engine to avoid redundant calls
const engineState = {
    sound: null as boolean | null,
    music: null as boolean | null,
    haptics: null as boolean | null,
    lowPower: null as boolean | null,
    ambient: 'NONE' as 'NONE' | 'MENU'
};

const getEffectsGate = (state: StoreState) => {
    // Silent mode: Suspended or not yet initialized
    const silent = state.isSuspended || !state.isRuntimeInitialized;
    const s = state.user.settings;

    // SAFE DEFAULT POLICY: undefined/null -> true (Enabled)
    const sound = s.soundEnabled ?? true;
    const music = s.musicEnabled ?? true;
    const haptics = s.hapticsEnabled ?? true;
    const lowPower = s.lowPowerMode ?? false;

    return {
        silent,
        allowSound: !silent && sound,
        allowMusic: !silent && music,
        allowHaptics: !silent && !lowPower && haptics,
        isMenuState: [AppState.LOGIN, AppState.DESKTOP, AppState.SETTINGS].includes(state.appState)
    };
};

const syncEffects = (state: StoreState) => {
    const gate = getEffectsGate(state);
    const { lowPowerMode } = state.user.settings;

    // 1. Ambient Hard Stop (P0 Rule)
    // If silent, immediately stop all ambient sound
    if (gate.silent) {
        audio.stopAmbient();
        engineState.ambient = 'NONE';
    }

    // 2. Sync Engines (Idempotent updates)
    if (engineState.sound !== gate.allowSound) {
        audio.setEnabled(gate.allowSound);
        engineState.sound = gate.allowSound;
    }
    if (engineState.music !== gate.allowMusic) {
        audio.setMusicEnabled(gate.allowMusic);
        engineState.music = gate.allowMusic;
    }
    if (engineState.haptics !== gate.allowHaptics) {
        haptics.setEnabled(gate.allowHaptics);
        engineState.haptics = gate.allowHaptics;
    }
    if (engineState.lowPower !== (lowPowerMode ?? false)) {
        engineState.lowPower = lowPowerMode ?? false;
    }

    // 3. Ambient Start
    // Only if NOT silent and music is allowed
    if (!gate.silent) {
        const targetAmbient = (gate.allowMusic && gate.isMenuState) ? 'MENU' : 'NONE';

        if (engineState.ambient !== targetAmbient) {
            targetAmbient === 'MENU' ? audio.startAmbient('MENU') : audio.stopAmbient();
            engineState.ambient = targetAmbient;
        }
    }
};

// --- 5. STORE IMPLEMENTATION ---

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
        // Initial Data State
        appState: AppState.BOOT,
        logs: [],
        currentGame: null,
        user: {
            username: 'User',
            sessionToken: '',
            sessionStartTime: null,
            omniAttempts: 0,
            omniDeleted: false,
            omniIteration: 0,
            settings: { ...DEFAULT_SETTINGS }
        },
        viewMode: 'GRID',
        navigationPath: [CORE_STORE_CONSTANTS.ROOT_ID],
        expandedNodes: [CORE_STORE_CONSTANTS.ROOT_ID],
        openedFileId: null,
        isKeyboardOpen: false,
        activeModal: 'NONE',
        authTargetId: null,
        
        // Runtime State
        suspendReasons: { LANDSCAPE: false, BACKGROUND: false, PAGEHIDE: false },
        isSuspended: false,
        isRuntimeInitialized: false,

        // --- ACTIONS ---

        setAppState: (s) => set({ appState: s }),

        login: (username) => {
            const s = get();
            const token = Math.random().toString(16).substr(2, 8).toUpperCase();
            
            const nextUser = { 
                ...s.user,
                username: username,
                sessionToken: `SESSION: ${token}`,
                sessionStartTime: Date.now(),
                omniAttempts: safeCounter(s.user.omniAttempts),
                omniIteration: safeCounter(s.user.omniIteration)
            };
            
            // Omni Reset Logic
            if (nextUser.omniDeleted) {
                nextUser.omniDeleted = false;
                nextUser.omniAttempts = 0;
                nextUser.omniIteration += 1;
            }

            set({ user: nextUser, appState: AppState.DESKTOP });
            s.addLog(LogLevel.SUCCESS, `AUTH_TOKEN: ${token}`);
            s.addLog(LogLevel.SYS, `WELCOME, ${username.toUpperCase()}`);
            
            if (getEffectsGate(get()).allowHaptics) haptics.notificationSuccess();
        },

        logout: () => {
            set(s => ({ 
                user: { ...s.user, sessionToken: '', sessionStartTime: null }, 
                openedFileId: null,
                appState: AppState.LOGIN 
            }));
            get().addLog(LogLevel.WARN, 'SESSION TERMINATED');
        },

        startGame: (id) => {
            if (id === 'SETTINGS') {
                set({ appState: AppState.SETTINGS });
                return;
            }
            set({ currentGame: id, appState: AppState.GAME });
            get().addLog(LogLevel.SYS, `EXECUTING ${id}_PROTOCOL.EXE...`);
            if (getEffectsGate(get()).allowHaptics) haptics.impactMedium();
        },

        stopGame: () => {
            set({ currentGame: null, appState: AppState.DESKTOP });
            get().addLog(LogLevel.INFO, 'PROCESS TERMINATED');
            if (getEffectsGate(get()).allowHaptics) haptics.impactLight();
        },

        addLog: (level, message) => {
            // FIX: Keystroke sound depends strictly on allowSound gate
            if (getEffectsGate(get()).allowSound) audio.playKeystroke();
            
            set(s => ({
                logs: [...s.logs.slice(-(CORE_STORE_CONSTANTS.LOG_LIMIT - 1)), { 
                    id: generateRuntimeId(), 
                    timestamp: formatLogTimestamp(), 
                    level, 
                    message 
                }]
            }));
        },

        incrementOmniAttempts: () => set(s => ({ 
            user: { ...s.user, omniAttempts: safeCounter(s.user.omniAttempts) + 1 } 
        })),

        markOmniDeleted: () => set(s => ({ user: { ...s.user, omniDeleted: true } })),

        // Added resetOmniSession to fix Property 'resetOmniSession' does not exist on type 'StoreState'
        resetOmniSession: () => set(s => ({
            user: {
                ...s.user,
                omniAttempts: 0,
                omniIteration: safeCounter(s.user.omniIteration) + 1,
                omniDeleted: false
            }
        })),

        // --- SETTINGS ACTIONS ---
        // Always flip the boolean, treating null/undefined as true (Default Policy)

        toggleSound: () => set(s => ({ 
            user: { ...s.user, settings: { ...s.user.settings, soundEnabled: !(s.user.settings.soundEnabled ?? true) } } 
        })),
        
        toggleMusic: () => set(s => ({ 
            user: { ...s.user, settings: { ...s.user.settings, musicEnabled: !(s.user.settings.musicEnabled ?? true) } } 
        })),
        
        toggleHidden: () => {
            const s = get();
            const next = !(s.user.settings.showHidden ?? true);
            set({ user: { ...s.user, settings: { ...s.user.settings, showHidden: next } } });
            s.addLog(LogLevel.SYS, `HIDDEN_RESOURCES: ${next ? 'UNSHROUDED' : 'CONCEALED'}`);
        },
        
        toggleHaptics: () => {
            const s = get();
            // Default enabled
            const current = s.user.settings.hapticsEnabled ?? true;
            const next = !current;
            
            set({ user: { ...s.user, settings: { ...s.user.settings, hapticsEnabled: next } } });
            
            // FEEDBACK FIX: Check gate on the *new* state
            const gate = getEffectsGate(get());
            if (next && gate.allowHaptics) {
                haptics.impactMedium();
            }
        },
        
        toggleLowPower: () => {
            const s = get();
            // Default disabled
            const next = !(s.user.settings.lowPowerMode ?? false);
            set({ user: { ...s.user, settings: { ...s.user.settings, lowPowerMode: next } } });
            s.addLog(LogLevel.SYS, `POWER_SAVER: ${next ? 'ENABLED' : 'DISABLED'}`);
        },

        // --- NAVIGATION ACTIONS ---

        setViewMode: (mode) => {
            if (VALID_VIEW_MODES.includes(mode)) set({ viewMode: mode });
            else set({ viewMode: 'GRID' });
        },

        setNavigationPath: (ids) => set(s => {
            const path = normalizePath(ids);
            
            // No-op check (Deep equality for path array)
            if (path.length === s.navigationPath.length && path.every((id, i) => id === s.navigationPath[i])) {
                return {};
            }

            const expandedNodes = reconcileExpanded(s.expandedNodes, path);
            return { navigationPath: path, expandedNodes };
        }),

        navigateDown: (id) => {
            if (!isValidId(id)) return {};
            
            return set(s => {
                const raw = [...s.navigationPath, id];
                const path = normalizePath(raw);
                
                // Dedup check: if path ends up same length/last item, ignore
                if (path.length === s.navigationPath.length && path[path.length - 1] === s.navigationPath[s.navigationPath.length - 1]) {
                    return {};
                }

                const expandedNodes = reconcileExpanded(s.expandedNodes, path);
                return { navigationPath: path, expandedNodes };
            });
        },

        navigateUp: () => set(s => {
            if (s.navigationPath.length <= 1) return {};
            const path = normalizePath(s.navigationPath.slice(0, -1));
            return { navigationPath: path };
        }),

        navigateBreadcrumb: (index) => set(s => ({
            navigationPath: normalizePath(s.navigationPath.slice(0, index + 1))
        })),

        setOpenedFileId: (id) => {
            if (id === null) { 
                set({ openedFileId: null }); 
                return; 
            }
            if (isValidId(id)) {
                set({ openedFileId: id });
            }
        },

        toggleNodeExpansion: (id) => {
            if (id === CORE_STORE_CONSTANTS.ROOT_ID || !isValidId(id)) return;
            set(s => {
                const next = new Set(s.expandedNodes);
                if (next.has(id)) next.delete(id); else next.add(id);
                return { expandedNodes: normalizeExpanded(Array.from(next)) };
            });
        },

        setExpandedNodes: (ids) => set({ expandedNodes: normalizeExpanded(ids) }),
        setKeyboardOpen: (isOpen) => set({ isKeyboardOpen: isOpen }),

        // --- OVERLAY ACTIONS ---

        openModal: (type, targetId) => {
            if (type === 'AUTH') {
                if (isValidId(targetId)) {
                    set({ activeModal: 'AUTH', authTargetId: targetId });
                }
            } else {
                set({ activeModal: type, authTargetId: null });
            }
        },

        consumeAuthTarget: () => {
            const id = get().authTargetId;
            set({ authTargetId: null });
            return id;
        },

        closeModal: () => set({ activeModal: 'NONE', authTargetId: null }),

        handleGoBack: () => {
            const s = get();
            const { appState, activeModal, openedFileId, navigationPath } = s;
            const gate = getEffectsGate(s);

            // Priority 1: Game -> Stop
            if (appState === AppState.GAME) {
                s.stopGame();
                return;
            }
            // Priority 2: Settings -> Desktop
            if (appState === AppState.SETTINGS) {
                if (gate.allowHaptics) haptics.impactLight();
                set({ appState: AppState.DESKTOP });
                return;
            }
            // Priority 3: Modal -> Close
            if (activeModal !== 'NONE') {
                if (gate.allowHaptics) haptics.impactLight();
                set({ activeModal: 'NONE', authTargetId: null });
                return;
            }
            // Priority 4: File -> Close
            if (openedFileId) {
                if (gate.allowHaptics) haptics.impactLight();
                set({ openedFileId: null });
                return;
            }
            // Priority 5: Path -> Up
            if (navigationPath.length > 1) {
                if (gate.allowHaptics) haptics.impactLight();
                s.navigateUp();
                return;
            }
            // Priority 6: Desktop -> Exit Confirm
            if (appState === AppState.DESKTOP) {
                if (gate.allowHaptics) haptics.impactLight();
                s.openModal('EXIT_CONFIRM');
            }
        },

        // --- RUNTIME ACTIONS ---

        setSuspendReasons: (updates) => {
            const s = get();
            
            // Shallow compare to prevent updates if values match
            let hasChanges = false;
            for (const key in updates) {
                if (s.suspendReasons[key as SuspendReason] !== updates[key as SuspendReason]) {
                    hasChanges = true;
                    break;
                }
            }
            if (!hasChanges) return;

            const next = { ...s.suspendReasons, ...updates };
            const isSuspended = Object.values(next).some(Boolean);
            set({ suspendReasons: next, isSuspended });
        },

        initRuntime: () => {
            const s = get();
            if (s.isRuntimeInitialized) return;
            // Calculate initial suspend state atomically based on whatever reasons are currently set
            const isSuspended = Object.values(s.suspendReasons).some(Boolean);
            set({ isRuntimeInitialized: true, isSuspended });
        }
    }),
    
    // --- 6. PERSISTENCE CONFIG ---
    
    {
      name: 'netrunner-core-storage',
      version: 1,
      
      partialize: (state): PersistedState => ({
          user: {
              username: state.user.username,
              settings: state.user.settings,
              omniAttempts: state.user.omniAttempts,
              omniDeleted: state.user.omniDeleted,
              omniIteration: state.user.omniIteration,
          },
          viewMode: state.viewMode,
          expandedNodes: state.expandedNodes,
      }),

      migrate: (persisted: any, version: number): PersistedState => {
          // Default Fallback
          const defaults = {
              user: { 
                  username: 'User', 
                  settings: { ...DEFAULT_SETTINGS },
                  omniAttempts: 0, omniDeleted: false, omniIteration: 0
              },
              viewMode: 'GRID' as ViewMode,
              expandedNodes: [CORE_STORE_CONSTANTS.ROOT_ID]
          };

          if (!persisted || typeof persisted !== 'object') return defaults;

          const p = persisted;
          const u = p.user || {};
          const s = u.settings || {};

          // Safe Defaults Policy: 
          // undefined/null for features -> true (enabled)
          // undefined/null for lowPower -> false (disabled)
          return {
              user: {
                  username: (typeof u.username === 'string' ? u.username.trim().slice(0, 32) : '') || defaults.user.username,
                  settings: {
                      soundEnabled: typeof s.soundEnabled === 'boolean' ? s.soundEnabled : true,
                      musicEnabled: typeof s.musicEnabled === 'boolean' ? s.musicEnabled : true,
                      showHidden: typeof s.showHidden === 'boolean' ? s.showHidden : true,
                      hapticsEnabled: typeof s.hapticsEnabled === 'boolean' ? s.hapticsEnabled : true,
                      lowPowerMode: typeof s.lowPowerMode === 'boolean' ? s.lowPowerMode : false,
                  },
                  omniAttempts: safeCounter(u.omniAttempts),
                  omniDeleted: !!u.omniDeleted,
                  omniIteration: safeCounter(u.omniIteration),
              },
              viewMode: VALID_VIEW_MODES.includes(p.viewMode) ? p.viewMode : defaults.viewMode,
              expandedNodes: normalizeExpanded(p.expandedNodes)
          };
      },

      onRehydrateStorage: () => (state) => {
          if (state) syncEffects(state);
      }
    }
  )
);

// --- 7. SELECTIVE SUBSCRIPTION (HMR Safe) ---

const SUB_KEY = '__NETRUNNER_STORE_SUB_V3__';
const g = globalThis as any;

if (g[SUB_KEY]) {
    g[SUB_KEY]();
    g[SUB_KEY] = undefined;
}

// Track minimal state needed for effects to avoid "JSON.stringify" overhead
let lastEffectsFingerprint = {
    susp: false,
    init: false,
    app: AppState.BOOT,
    s: true, m: true, h: true, lp: false
};

g[SUB_KEY] = useStore.subscribe((state) => {
    const { isSuspended, isRuntimeInitialized, appState, user } = state;
    const { settings } = user;

    // Manual Shallow Comparison (Optimized)
    const hasChanged = 
        lastEffectsFingerprint.susp !== isSuspended ||
        lastEffectsFingerprint.init !== isRuntimeInitialized ||
        lastEffectsFingerprint.app !== appState ||
        lastEffectsFingerprint.s !== settings.soundEnabled ||
        lastEffectsFingerprint.m !== settings.musicEnabled ||
        lastEffectsFingerprint.h !== settings.hapticsEnabled ||
        lastEffectsFingerprint.lp !== settings.lowPowerMode;

    if (hasChanged) {
        lastEffectsFingerprint = {
            susp: isSuspended,
            init: isRuntimeInitialized,
            app: appState,
            s: settings.soundEnabled ?? true,
            m: settings.musicEnabled ?? true,
            h: settings.hapticsEnabled ?? true,
            lp: settings.lowPowerMode ?? false
        };
        syncEffects(state);
    }
});


const LOG_SUB_KEY = '__NETRUNNER_SYSTEM_LOG_SUB_V1__';
if (g[LOG_SUB_KEY]) g[LOG_SUB_KEY]();
g[LOG_SUB_KEY] = subscribeSystemLog(({ level, message }) => {
    useStore.getState().addLog(level, message);
});
