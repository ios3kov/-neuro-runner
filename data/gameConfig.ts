import { GameConfig, GoalSpec, LevelSpec } from '../types';

const goal = (type: GoalSpec['type'], target: number, label: string): GoalSpec => ({
  id: 'g1', type, required: true, target, label
});

const snakeTarget = (level: number) => Math.min(15, 8 + Math.floor((level - 1) / 4));
const pongTarget = (level: number) => 3 + Math.floor((level - 1) / 5);
const breakoutRows = (level: number) => Math.min(9, 4 + Math.floor((level - 1) / 2));
const breakoutTarget = (level: number) => breakoutRows(level) * 8;
const asteroidsTarget = (level: number) => 12 + Math.floor((level - 1) * 1.8);
const driftTarget = (level: number) => 10 + Math.floor((level - 1) * 1.25);
const runnerDistance = (level: number) => 520 + level * 32;
const vaporTarget = (level: number) => 8 + Math.floor((level - 1) * 1.4);

const STRATEGIES: Record<string, (l: number) => GoalSpec> = {
  SNAKE: (l) => goal('collect_items', snakeTarget(l), `COLLECT ${snakeTarget(l)} DATA`),
  BREAKOUT: (l) => goal('destroy_targets', breakoutTarget(l), `CLEAR ${breakoutTarget(l)} BLOCKS`),
  DEFENDER: (l) => goal('survive_seconds', 20 + l*5, `SURVIVE ${20+l*5}s`),
  ASTEROIDS: (l) => goal('destroy_targets', asteroidsTarget(l), `NEUTRALIZE ${asteroidsTarget(l)} THREATS`),
  DRIFT: (l) => goal('destroy_targets', driftTarget(l), `CLEAR ${driftTarget(l)} GATES`),
  PONG: (l) => goal('finish_level', 1, `WIN FIRST-TO-${pongTarget(l)} DUEL`),
  RUNNER: (l) => goal('finish_level', 1, `COMPLETE ${runnerDistance(l)}m RUN`),
  VAPORWARE: (l) => goal('collect_items', vaporTarget(l), `BREACH ${vaporTarget(l)} COMMANDS AND ESCAPE`)
};

const levels = (id: string, count: number): LevelSpec[] =>
  Array.from({ length: count }, (_, i) => {
    const l = i + 1;
    return {
      levelId: `${id}_${l}`,
      index: l,
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
  RUNNER: { gameId: 'RUNNER', title: 'AERO_RUN', levels: levels('RUNNER', 20) },
  VAPORWARE: { gameId: 'VAPORWARE', title: 'VAPORWARE', levels: levels('VAPORWARE', 10) },
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
