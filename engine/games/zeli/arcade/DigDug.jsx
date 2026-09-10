/**
 * 🎮 Game 118: 디그더그
 * 땅을 파서 적을 제거하세요
 */
import { useState, useEffect, useRef } from "react";

const GRID = 12;
const CELL = 30;
const DIRT = 1, TUNNEL = 0, ENEMY = 2, PLAYER = 3;

const createLevel = () => {
    const map = Array.from({ length: GRID }, () => Array(GRID).fill(DIRT));
    map[0][0] = PLAYER;
    map[0][1] = TUNNEL;
    const enemies = [];
    for (let i = 0; i < 4; i++) {
        let r, c;
        do { r = 3 + Math.floor(Math.random() * (GRID - 4)); c = Math.floor(Math.random() * GRID); }
        while (map[r][c] !== DIRT);
        map[r][c] = ENEMY;
        enemies.push({ r, c, alive: true });
    }
    return { map, enemies };
};

const DigDug = ({ onComplete }) => {
    const [level] = useState(createLevel);
    const [map, setMap] = useState(level.map.map(r => [...r]));
    const [playerPos, setPlayerPos] = useState({ r: 0, c: 0 });
    const [enemies, setEnemies] = useState(level.enemies);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        const handleKey = (e) => {
            if (done) return;
            const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
            if (!dirs[e.key]) return;
            e.preventDefault();
            const [dr, dc] = dirs[e.key];
            setPlayerPos(prev => {
                const nr = prev.r + dr, nc = prev.c + dc;
                if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return prev;
                setMap(prevMap => {
                    const newMap = prevMap.map(r => [...r]);
                    newMap[prev.r][prev.c] = TUNNEL;
                    const enemyIdx = enemies.findIndex(e => e.alive && e.r === nr && e.c === nc);
                    if (enemyIdx >= 0) {
                        setEnemies(prevE => {
                            const newE = [...prevE];
                            newE[enemyIdx] = { ...newE[enemyIdx], alive: false };
                            const aliveCount = newE.filter(e => e.alive).length;
                            const newScore = score + 25;
                            setScore(newScore);
                            if (aliveCount === 0) {
                                setDone(true);
                                setTimeout(() => onComplete(Math.min(100, 50 + newScore)), 500);
                            }
                            return newE;
                        });
                    }
                    newMap[nr][nc] = PLAYER;
                    return newMap;
                });
                return { r: nr, c: nc };
            });
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [done, enemies, score, onComplete]);

    useEffect(() => {
        if (done) return;
        intervalRef.current = setInterval(() => {
            setEnemies(prev => {
                const newEnemies = prev.map(e => {
                    if (!e.alive) return e;
                    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dr, dc]) => {
                        const nr = e.r + dr, nc = e.c + dc;
                        return nr >= 0 && nr < GRID && nc >= 0 && nc < GRID;
                    });
                    if (dirs.length === 0) return e;
                    const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
                    const nr = e.r + dr, nc = e.c + dc;
                    if (nr === playerPos.r && nc === playerPos.c) {
                        setDone(true);
                        setTimeout(() => onComplete(Math.max(20, score * 5)), 500);
                        return e;
                    }
                    return { ...e, r: nr, c: nc };
                });
                setMap(prevMap => {
                    const newMap = prevMap.map(r => [...r]);
                    prev.forEach(e => { if (e.alive && newMap[e.r][e.c] === ENEMY) newMap[e.r][e.c] = TUNNEL; });
                    newEnemies.forEach(e => { if (e.alive) newMap[e.r][e.c] = ENEMY; });
                    return newMap;
                });
                return newEnemies;
            });
        }, 800);
        return () => clearInterval(intervalRef.current);
    }, [done, playerPos, score, onComplete]);

    const CELL_COLORS = { [DIRT]: "#8B6914", [TUNNEL]: "#3a2a0a", [ENEMY]: "#FF6B6B", [PLAYER]: "#4D96FF" };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: "white" }}>
            <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                <span>점수: <span style={{ color: "#FFD700" }}>{score}</span></span>
                <span>적: <span style={{ color: "#FF6B6B" }}>{enemies.filter(e => e.alive).length}</span></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID}, ${CELL}px)`, gap: "1px", padding: "4px", background: "#1a1a0a", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.1)" }}>
                {map.flat().map((cell, idx) => <div key={idx} style={{ width: CELL, height: CELL, borderRadius: "3px", background: CELL_COLORS[cell] || CELL_COLORS[TUNNEL], display: "flex", alignItems: "center", justifyContent: "center", fontSize: cell === PLAYER ? "16px" : cell === ENEMY ? "14px" : "0" }}>{cell === PLAYER ? "⛏️" : cell === ENEMY ? "👾" : ""}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 36px)", gap: "3px" }}>
                <div /><button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }))} style={dBtn}>↑</button><div />
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))} style={dBtn}>←</button>
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))} style={dBtn}>↓</button>
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))} style={dBtn}>→</button>
            </div>
            <div style={{ fontSize: "11px", color: "#8892b0" }}>방향키로 땅을 파고 적에게 접근해 제거!</div>
            {done && <div style={{ fontSize: "16px", color: enemies.every(e => !e.alive) ? "#64ffda" : "#FF6B6B", fontWeight: "bold" }}>{enemies.every(e => !e.alive) ? "🎉 모든 적 제거!" : "💀 적에게 잡혔어요!"}</div>}
        </div>
    );
};

const dBtn = { width: 36, height: 36, fontSize: "14px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", cursor: "pointer" };

export default DigDug;
