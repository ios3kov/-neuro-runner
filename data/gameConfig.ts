import { GameConfig, GoalSpec, LevelSpec } from '../types';

// Helper to reduce object literal noise and bundle size
const goal = (type: any, target: number, label: string): GoalSpec => ({
  id: 'g1', type, required: true, target, label
});

const STRATEGIES: Record<string, (l: number) => GoalSpec> = {
  SNAKE: () => goal('collect_items', 10, 'EAT 10 DATA'),
  BREAKOUT: (l) => goal('destroy_targets', Math.min(64, (4 + Math.floor(l/2)) * 8), 'CLEAR BLOCKS'),
  DEFENDER: (l) => goal('survive_seconds', 20 + l*5, `SURVIVE ${20+l*5}s`),
  ASTEROIDS: (l) => goal('score_at_least', l*500, `SCORE ${l*500}`),
  DRIFT: (l) => goal('finish_level', 1, `SPEED ${20+l*20}`),
  PONG: (l) => goal('score_at_least', l*300, `SCORE ${l*300}`),
  RUNNER: (l) => goal('finish_level', 1, 'COMPLETE TRAINING'),
  VAPORWARE: (l) => goal('finish_level', 1, 'ESCAPE THE LOOP')
};

const levels = (id: string, count: number): LevelSpec[] => 
  Array.from({ length: count }, (_, i) => {
    const l = i + 1;
    return {
      levelId: `${id}_${l}`,
      index: l,
      // Compact name for mobile UI (e.g. "NODE 01")
      name: `NODE ${l.toString().padStart(2, '0')}`,
      description: `SECTOR ${l}`,
      difficulty: l <= 5 ? 'EASY' : l <= 15 ? 'NORMAL' : l <= 20 ? 'HARD' : 'EXPERT',
      goals: [STRATEGIES[id](l)],
      unlocksOnComplete: i < count - 1 ? [`${id}_${l+1}`] : []
    };
  });

export const GAME_CONFIGS: Record<string, GameConfig> = {
  SNAKE: { gameId: 'SNAKE', title: 'SERPENT', levels: levels('SNAKE', 25) },
  PONG: { gameId: 'PONG', title: 'PONG', levels: levels('PONG', 20) }, 
  BREAKOUT: { gameId: 'BREAKOUT', title: 'BREAKOUT', levels: levels('BREAKOUT', 20) },
  ASTEROIDS: { gameId: 'ASTEROIDS', title: 'ASTEROIDS', levels: levels('ASTEROIDS', 20) },
  DRIFT: { gameId: 'DRIFT', title: 'DRIFT', levels: levels('DRIFT', 20) },
  DEFENDER: { gameId: 'DEFENDER', title: 'DEFENDER', levels: levels('DEFENDER', 25) },
  RUNNER: { gameId: 'RUNNER', title: 'AERO_RUN', levels: levels('RUNNER', 1) }, 
  VAPORWARE: { 
      gameId: 'VAPORWARE', 
      title: 'VAPORWARE',
      skipLevelSelect: true, 
      levels: [{
          levelId: 'VAPORWARE_1',
          index: 1,
          name: 'THE_LOOP',
          description: 'INFINITE_LOADING',
          difficulty: 'NORMAL',
          goals: [goal('finish_level', 1, 'FIND THE EXIT')]
      }] 
  },
};

export const ACHIEVEMENTS_DATA = [
  { id: 'AUTH_ESTABLISHED', name: 'ACCESS_GRANTED', description: 'System unlocked.' },
  { id: 'FIRST_EXECUTION', name: 'HELLO_WORLD', description: 'Run a protocol.' },
  { id: 'SNAKE_EXPERT', name: 'SERPENT_MASTER', description: 'Snake: Beat Lvl 5.' },
  { id: 'PONG_EXPERT', name: 'REFLEX_GOD', description: 'Pong: Beat Lvl 5.' },
  { id: 'BREAKOUT_EXPERT', name: 'BLOCK_BUSTER', description: 'Breakout: Beat Lvl 5.' },
  { id: 'ASTEROIDS_EXPERT', name: 'SPACE_ACE', description: 'Asteroids: Beat Lvl 5.' },
  { id: 'DRIFT_EXPERT', name: 'SPEED_DEMON', description: 'Drift: Beat Lvl 5.' },
  { id: 'DEFENDER_EXPERT', name: 'GUARDIAN', description: 'Defender: Beat Lvl 5.' }
];