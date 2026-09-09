
import { useStore } from '../store';
import { CORE_STORE_CONSTANTS, DEFAULT_SETTINGS } from '../state/coreConfig';
import { normalizeExpanded } from '../state/coreUtils';
import { useGameStore } from '../gameStore';

const MIGRATION_KEY = 'netrunner_migration_v1';
const LEGACY_STORAGE_KEY = 'netrunner-storage';

export const performLegacyMigration = () => {
    // 1. Idempotency Check
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    // 2. Read Old Data
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);
        const oldState = parsed.state;
        if (!oldState || !oldState.user) return;

        // 3. Migrate Game Data
        const { stats, gameProgress, achievements } = oldState.user;
        if (stats || gameProgress || achievements) {
            useGameStore.setState(prev => ({
                ...prev,
                stats: stats || prev.stats,
                gameProgress: gameProgress || prev.gameProgress,
                achievements: achievements || prev.achievements
            }));
        }

        // 4. Migrate Core Settings
        const { user, viewMode, expandedNodes } = oldState;
        if (user) {
            // Safely merge defaults with potentially partial old settings
            const safeSettings = { ...DEFAULT_SETTINGS, ...user.settings };

            // Sanitize core fields using shared validators
            useStore.setState(prev => ({
                ...prev,
                viewMode: viewMode || prev.viewMode,
                expandedNodes: expandedNodes ? normalizeExpanded(expandedNodes) : [CORE_STORE_CONSTANTS.ROOT_ID],
                user: {
                    ...prev.user,
                    username: user.username || prev.user.username,
                    settings: safeSettings,
                    omniAttempts: Number.isFinite(user.omniAttempts) ? user.omniAttempts : 0,
                    omniDeleted: !!user.omniDeleted
                }
            }));
        }

        // 5. Cleanup & Lock
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.setItem(MIGRATION_KEY, 'true');
        
    } catch (e) {
        // Silent fail in production, data remains in fallback defaults
    }
};