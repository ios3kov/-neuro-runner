import type { GoalSpec, LevelResult, LevelSpec } from '../../types';

export type LevelMetrics = Record<string, number>;

const isGoalComplete = (
  goal: GoalSpec,
  score: number,
  metrics: LevelMetrics,
): boolean => {
  switch (goal.type) {
    case 'score_at_least':
      return score >= goal.target;
    case 'collect_items':
      return (metrics.itemsCollected ?? 0) >= goal.target;
    case 'survive_seconds':
      return (metrics.timeSurvived ?? 0) >= goal.target;
    case 'destroy_targets':
      return (metrics.targetsDestroyed ?? 0) >= goal.target;
    case 'finish_level':
      return true;
    default:
      return true;
  }
};

export const buildCompletedLevelResult = ({
  gameId,
  levelId,
  levelSpec,
  score,
  metrics,
  startedAt,
  completedAt = Date.now(),
}: {
  gameId: string;
  levelId: string;
  levelSpec?: LevelSpec;
  score: number;
  metrics: LevelMetrics;
  startedAt: number;
  completedAt?: number;
}): LevelResult => {
  const goalsCompleted: Record<string, boolean> = {};

  levelSpec?.goals.forEach((goal) => {
    goalsCompleted[goal.id] = isGoalComplete(goal, score, metrics);
  });

  return {
    gameId,
    levelId,
    status: 'COMPLETED',
    score,
    durationMs: Math.max(0, completedAt - startedAt),
    goalsCompleted,
    timestamp: completedAt,
  };
};
