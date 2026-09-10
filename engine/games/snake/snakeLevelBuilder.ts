import type { SnakeArena, SnakePoint } from './snakeTypes';
import { getSnakeProfile } from './snakeConfig';

const keyOf = (point: SnakePoint) => `${point.x}:${point.y}`;

const addWallLine = (walls: SnakePoint[], from: SnakePoint, to: SnakePoint, gaps: SnakePoint[] = []) => {
  const gapSet = new Set(gaps.map(keyOf));
  if (from.x === to.x) {
    for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y += 1) {
      const point = { x: from.x, y };
      if (!gapSet.has(keyOf(point))) walls.push(point);
    }
    return;
  }

  for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x += 1) {
    const point = { x, y: from.y };
    if (!gapSet.has(keyOf(point))) walls.push(point);
  }
};

export const buildSnakeArena = (level: number): SnakeArena => {
  const profile = getSnakeProfile(level);
  const arena: SnakeArena = { walls: [], gates: [], tunnels: [], zones: [] };
  const wall = (from: SnakePoint, to: SnakePoint, gaps: SnakePoint[] = []) => addWallLine(arena.walls, from, to, gaps);

  if (profile.theme === 'TRAINING') {
    if (profile.level >= 2) {
      wall({ x: 5, y: 6 }, { x: 18, y: 6 }, [{ x: 11, y: 6 }, { x: 12, y: 6 }]);
      wall({ x: 5, y: 17 }, { x: 18, y: 17 }, [{ x: 11, y: 17 }, { x: 12, y: 17 }]);
    }
    if (profile.level === 3) {
      wall({ x: 5, y: 6 }, { x: 5, y: 17 }, [{ x: 5, y: 11 }, { x: 5, y: 12 }]);
      wall({ x: 18, y: 6 }, { x: 18, y: 17 }, [{ x: 18, y: 11 }, { x: 18, y: 12 }]);
    }
  }

  if (profile.theme === 'FIREWALL' || profile.theme === 'MALWARE') {
    [5, 11, 17].forEach((y, index) => {
      const x = 8 + index * 3;
      wall({ x: 3, y }, { x: 20, y }, [{ x, y }]);
      arena.gates.push({ x, y, active: index % 2 === 0 });
    });
  }

  if (profile.theme === 'VPN' || profile.theme === 'COMPRESSION') {
    wall({ x: 12, y: 2 }, { x: 12, y: 21 }, [{ x: 12, y: 5 }, { x: 12, y: 18 }]);
    arena.tunnels.push({ id: 1, x: 5, y: 5, linkId: 2, cooldown: 0 });
    arena.tunnels.push({ id: 2, x: 19, y: 18, linkId: 1, cooldown: 0 });
    if (profile.level >= 11) {
      arena.tunnels.push({ id: 3, x: 19, y: 5, linkId: 4, cooldown: 0 });
      arena.tunnels.push({ id: 4, x: 5, y: 18, linkId: 3, cooldown: 0 });
    }
  }

  if (profile.theme === 'TWO_FA') {
    wall({ x: 4, y: 4 }, { x: 19, y: 4 }, [{ x: 11, y: 4 }, { x: 12, y: 4 }]);
    wall({ x: 4, y: 19 }, { x: 19, y: 19 }, [{ x: 11, y: 19 }, { x: 12, y: 19 }]);
    wall({ x: 4, y: 4 }, { x: 4, y: 19 }, [{ x: 4, y: 11 }, { x: 4, y: 12 }]);
    wall({ x: 19, y: 4 }, { x: 19, y: 19 }, [{ x: 19, y: 11 }, { x: 19, y: 12 }]);
    arena.gates.push({ x: 4, y: 11, active: true }, { x: 19, y: 12, active: false });
  }

  if (profile.theme === 'OVERCLOCK') {
    wall({ x: 5, y: 5 }, { x: 18, y: 5 }, [{ x: 11, y: 5 }, { x: 12, y: 5 }]);
    wall({ x: 5, y: 18 }, { x: 18, y: 18 }, [{ x: 11, y: 18 }, { x: 12, y: 18 }]);
    wall({ x: 5, y: 5 }, { x: 5, y: 18 }, [{ x: 5, y: 11 }, { x: 5, y: 12 }]);
    wall({ x: 18, y: 5 }, { x: 18, y: 18 }, [{ x: 18, y: 11 }, { x: 18, y: 12 }]);
    arena.zones.push({ x: 8, y: 8, w: 8, h: 8, type: 'OVERCLOCK' });
  }

  if (profile.theme === 'GAUNTLET' || profile.theme === 'CORE') {
    wall({ x: 3, y: 6 }, { x: 20, y: 6 }, [{ x: 7, y: 6 }, { x: 16, y: 6 }]);
    wall({ x: 3, y: 17 }, { x: 20, y: 17 }, [{ x: 7, y: 17 }, { x: 16, y: 17 }]);
    wall({ x: 6, y: 3 }, { x: 6, y: 20 }, [{ x: 6, y: 10 }, { x: 6, y: 14 }]);
    wall({ x: 17, y: 3 }, { x: 17, y: 20 }, [{ x: 17, y: 9 }, { x: 17, y: 13 }]);
    arena.gates.push({ x: 7, y: 6, active: true }, { x: 16, y: 17, active: false });
    arena.tunnels.push({ id: 1, x: 3, y: 3, linkId: 2, cooldown: 0 }, { id: 2, x: 20, y: 20, linkId: 1, cooldown: 0 });
    arena.zones.push({ x: 9, y: 9, w: 6, h: 6, type: 'OVERCLOCK' });
    if (profile.theme === 'CORE') {
      arena.gates.push({ x: 16, y: 6, active: false }, { x: 7, y: 17, active: true });
      arena.tunnels.push({ id: 3, x: 20, y: 3, linkId: 4, cooldown: 0 }, { id: 4, x: 3, y: 20, linkId: 3, cooldown: 0 });
    }
  }

  arena.walls = arena.walls.filter((point) => !(point.y === 10 && point.x >= 7 && point.x <= 13));
  arena.gates = arena.gates.filter((point) => !(point.y === 10 && point.x >= 7 && point.x <= 13));
  return arena;
};
