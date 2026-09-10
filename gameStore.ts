
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameId, GameProgress, GameStats, LevelResult, PlayerData, LevelState, LogLevel } from './types';
import { GAME_CONFIGS, ACHIEVEMENTS_DATA } from './data/gameConfig';
import { normalizeGameProgress, sanitizeGameProgress, STATE_PRIORITY } from './utils/progress';
import { audio } from './utils/audio';
import { haptics } from './utils/haptics';
import { emitSystemLog } from './utils/systemEvents';
import { isRecord } from './state/coreUtils';


interface GameStoreState extends PlayerData {
    // Actions
    submitLevelResult: (result: LevelResult) => void;
    updateStats: (gameId: string, score: number, levelReached: number) => void;
    unlockAchievement: (id: string) => void;
}

export const useGameStore = create<GameStoreState>()(
    persist(
        (set, get) => ({
            stats: {},
            gameProgress: {},
            achievements: [],

            submitLevelResult: (result) => {
                const { gameId, levelId, status, score, durationMs } = result;
                const state = get();

                const config = GAME_CONFIGS[gameId];
                if (!config) return;

                const levelSpec = config.levels.find(l => l.levelId === levelId);
                if (!levelSpec) return;

                const nextGameProgress = { ...state.gameProgress };
                const currentProg = sanitizeGameProgress(gameId, nextGameProgress[gameId]);
                const nextLevels = { ...currentProg.levels };

                // Validation
                const validLevelIds = new Set(config.levels.map(l => l.levelId));
                const nextUnlockedSet = new Set(
                    currentProg.unlockedLevels.filter(id => validLevelIds.has(id))
                );

                // Check unlocked status
                const isUnlocked = nextUnlockedSet.has(levelId) ||
                    (nextLevels[levelId]?.state !== 'LOCKED') ||
                    levelId === `${gameId}_1`;

                if (!isUnlocked) return;

                // Update Level Record
                const prevLevelProg = nextLevels[levelId] || {
                    state: 'UNLOCKED', bestScore: 0, bestTimeMs: 0, timesPlayed: 0
                };

                const nextLevelProg = { ...prevLevelProg };
                const isSuccess = status === 'COMPLETED' || status === 'PERFECT';

                // State Transition
                const currentPriority = STATE_PRIORITY[prevLevelProg.state] ?? 0;
                let targetState: LevelState = 'UNLOCKED';
                if (status === 'COMPLETED') targetState = 'COMPLETED';
                if (status === 'PERFECT') targetState = 'PERFECT';

                const newPriority = STATE_PRIORITY[targetState] ?? 0;
                if (newPriority > currentPriority) {
                    nextLevelProg.state = targetState;
                }

                nextLevelProg.bestScore = Math.max(nextLevelProg.bestScore, Math.floor(Math.max(0, score)));
                nextLevelProg.timesPlayed += 1;

                if (isSuccess) {
                    const safeDur = Math.max(0, durationMs || 0);
                    if (nextLevelProg.bestTimeMs === 0 || safeDur < nextLevelProg.bestTimeMs) {
                        nextLevelProg.bestTimeMs = safeDur;
                    }
                }

                nextLevels[levelId] = nextLevelProg;

                // Unlock Logic
                if (isSuccess && levelSpec.unlocksOnComplete) {
                    levelSpec.unlocksOnComplete.forEach(nextId => {
                        if (validLevelIds.has(nextId)) {
                            nextUnlockedSet.add(nextId);
                            if (!nextLevels[nextId]) {
                                nextLevels[nextId] = { state: 'UNLOCKED', bestScore: 0, bestTimeMs: 0, timesPlayed: 0 };
                            }
                        }
                    });
                }

                const orderedUnlocked = config.levels
                    .map(l => l.levelId)
                    .filter(id => nextUnlockedSet.has(id));

                nextGameProgress[gameId] = {
                    levels: nextLevels,
                    unlockedLevels: orderedUnlocked
                };

                // Update Stats
                const nextStats = { ...state.stats };
                const currentStats = nextStats[gameId] || { id: gameId, plays: 0, highScore: 0, lastPlayed: 0, maxLevelReached: 1 };

                const nextMaxLevel = isSuccess
                    ? Math.max(1, (levelSpec.index || 0) + 1)
                    : currentStats.maxLevelReached;

                nextStats[gameId] = {
                    ...currentStats,
                    plays: currentStats.plays + 1,
                    highScore: Math.max(currentStats.highScore, Math.floor(Math.max(0, score))),
                    lastPlayed: Date.now(),
                    maxLevelReached: Math.max(currentStats.maxLevelReached, nextMaxLevel)
                };

                set({
                    gameProgress: nextGameProgress,
                    stats: nextStats
                });

                if (isSuccess && levelSpec.index >= 5) {
                    get().unlockAchievement(`${gameId}_EXPERT`);
                }
            },

            updateStats: (gameId, score, levelReached) => {
                set(state => {
                    const currentStats = state.stats[gameId] || { id: gameId, plays: 0, highScore: 0, lastPlayed: 0, maxLevelReached: 1 };
                    return {
                        stats: {
                            ...state.stats,
                            [gameId]: {
                                ...currentStats,
                                plays: currentStats.plays + 1,
                                highScore: Math.max(currentStats.highScore, Math.floor(Math.max(0, score))),
                                lastPlayed: Date.now(),
                                maxLevelReached: Math.max(currentStats.maxLevelReached, Math.floor(Math.max(1, levelReached)))
                            }
                        }
                    };
                });
            },

            unlockAchievement: (id) => {
                const state = get();
                if (!state.achievements.includes(id)) {
                    set({ achievements: [...state.achievements, id] });
                    
                    // Side Effects (using utils directly or Core Store)
                    // We can't access Core Store inside this pure function easily without circular deps
                    // So we rely on the component calling this to handle the Log, OR we use the audio/haptic utils directly
                    audio.playSuccess();
                    haptics.notificationSuccess();
                    
                    // Use Core Store imperatively for log if needed (safe for loose coupling)
                    emitSystemLog(LogLevel.SUCCESS, `ACHIEVEMENT: ${ACHIEVEMENTS_DATA.find(a => a.id === id)?.name || id}`);
                }
            }
        }),
        {
            name: 'netrunner-game-storage', // SEPARATE STORAGE KEY
            version: 1,
            migrate: (persistedState: unknown) => {
                const source = isRecord(persistedState) ? persistedState : {};
                return {
                    ...source,
                    gameProgress: normalizeGameProgress(source.gameProgress),
                    stats: isRecord(source.stats) ? source.stats : {},
                    achievements: Array.isArray(source.achievements)
                        ? source.achievements.filter((id): id is string => typeof id === 'string')
                        : [],
                };
            }
        }
    )
);