/**
 * 🎮 Game 35: 미니 팩맨 — 벽 그라데이션 + 도트 글로우 + 진행률 바
 */
import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 11, CELL = 28;
const WALL = 1, DOT = 2, EMPTY = 0;
const LEVEL = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1],
    [1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1], [1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1], [1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 1],
    [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1], [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], [1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const MiniPacman = ({ onComplete }) => {
    const [grid, setGrid] = useState(() => LEVEL.map((r) => [...r]));
    const [pac, setPac] = useState({ x: 1, y: 1 });
    const [ghosts, setGhosts] = useState([{ x: 5, y: 5, emoji: "👻" }, { x: 9, y: 9, emoji: "👹" }]);
    const [score, setScore] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const dirRef = useRef({ x: 1, y: 0 });
    const scoreRef = useRef(0);

    const totalDots = LEVEL.flat().filter((c) => c === DOT).length;

    useEffect(() => {
        const kd = (e) => {
            if (e.key === "ArrowUp") dirRef.current = { x: 0, y: -1 };
            if (e.key === "ArrowDown") dirRef.current = { x: 0, y: 1 };
            if (e.key === "ArrowLeft") dirRef.current = { x: -1, y: 0 };
            if (e.key === "ArrowRight") dirRef.current = { x: 1, y: 0 };
            e.preventDefault();
        };
        window.addEventListener("keydown", kd);
        return () => window.removeEventListener("keydown", kd);
    }, []);

    useEffect(() => {
        if (!gameActive) return;
        const loop = setInterval(() => {
            setPac((p) => {
                const d = dirRef.current;
                const nx = p.x + d.x, ny = p.y + d.y;
                if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && grid[ny][nx] !== WALL) {
                    if (grid[ny][nx] === DOT) {
                        setGrid((g) => { const ng = g.map((r) => [...r]); ng[ny][nx] = EMPTY; return ng; });
                        scoreRef.current += 1; setScore(scoreRef.current);
                        if (scoreRef.current >= totalDots) { setGameActive(false); setTimeout(() => onComplete(100), 500); }
                    }
                    return { x: nx, y: ny };
                }
                return p;
            });
            setGhosts((gs) => gs.map((g) => {
                const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
                const valid = dirs.filter((d) => { const nx = g.x + d.x, ny = g.y + d.y; return nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && grid[ny][nx] !== WALL; });
                if (valid.length === 0) return g;
                const d = valid[Math.floor(Math.random() * valid.length)];
                return { ...g, x: g.x + d.x, y: g.y + d.y };
            }));
            setPac((p) => { setGhosts((gs) => { if (gs.some((g) => g.x === p.x && g.y === p.y)) { setGameActive(false); setTimeout(() => onComplete(Math.round((scoreRef.current / totalDots) * 100)), 500); } return gs; }); return p; });
        }, 250);
        return () => clearInterval(loop);
    }, [gameActive, grid, totalDots, onComplete]);

    const handleDir = useCallback((dx, dy) => { dirRef.current = { x: dx, y: dy }; }, []);
    const progress = Math.round((score / totalDots) * 100);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <div style={{ fontSize: "13px" }}>
                🍬 <span style={{ color: "#FFD700" }}>{score}</span>/{totalDots}
                <span style={{ color: "#8892b0", marginLeft: 8 }}>({progress}%)</span>
            </div>
            <div style={{ width: SIZE * CELL, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#FFD700", borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <div style={{
                display: "grid", gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`,
                background: "#0a0a2e", borderRadius: "8px", padding: "2px",
                border: progress === 100 ? "3px solid #64ffda" : "2px solid rgba(255,255,255,0.06)",
            }}>
                {grid.map((row, y) => row.map((cell, x) => (
                    <div key={`${y}-${x}`} style={{
                        width: CELL, height: CELL, display: "flex", alignItems: "center", justifyContent: "center",
                        background: cell === WALL ? "linear-gradient(135deg, #1a3a7e, #0d2463)" : "transparent",
                        borderRadius: cell === WALL ? "3px" : 0,
                        boxShadow: cell === WALL ? "inset 0 1px 3px rgba(0,0,0,0.3)" : "none",
                    }}>
                        {pac.x === x && pac.y === y ? <span style={{ fontSize: "18px", filter: "drop-shadow(0 0 4px rgba(255,215,0,0.4))" }}>😃</span> :
                            ghosts.find((g) => g.x === x && g.y === y) ? <span style={{ fontSize: "16px", filter: "drop-shadow(0 0 4px rgba(255,0,0,0.3))" }}>{ghosts.find((g) => g.x === x && g.y === y).emoji}</span> :
                                cell === DOT ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFD700", boxShadow: "0 0 4px rgba(255,215,0,0.3)" }} /> : null}
                    </div>
                )))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <button onClick={() => handleDir(0, -1)} style={dBtn}>▲</button>
                <div style={{ display: "flex", gap: "2px" }}>
                    <button onClick={() => handleDir(-1, 0)} style={dBtn}>◀</button>
                    <button onClick={() => handleDir(0, 1)} style={dBtn}>▼</button>
                    <button onClick={() => handleDir(1, 0)} style={dBtn}>▶</button>
                </div>
            </div>
        </div>
    );
};

const dBtn = { width: 32, height: 28, fontSize: "12px", background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", cursor: "pointer" };

export default MiniPacman;
