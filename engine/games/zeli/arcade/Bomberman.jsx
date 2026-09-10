/**
 * 🎮 Game 120: 봄버맨
 * 폭탄으로 벽과 적을 제거하세요
 */
import { useState, useEffect, useRef, useCallback } from "react";

const SIZE = 9;
const CELL = 36;
const EMPTY = 0, WALL = 1, BRICK = 2, BOMB = 3, EXPLOSION = 4;

const createLevel = () => {
    const map = Array.from({ length: SIZE }, (_, r) =>
        Array.from({ length: SIZE }, (_, c) => {
            if (r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1) return WALL;
            if (r % 2 === 0 && c % 2 === 0) return WALL;
            if ((r <= 1 && c <= 1) || (r <= 1 && c === 2) || (r === 2 && c <= 1)) return EMPTY;
            return Math.random() < 0.4 ? BRICK : EMPTY;
        })
    );
    const enemies = [];
    for (let i = 0; i < 3; i++) {
        let r, c;
        do { r = 2 + Math.floor(Math.random() * (SIZE - 4)); c = 2 + Math.floor(Math.random() * (SIZE - 4)); }
        while (map[r][c] !== EMPTY || (r <= 2 && c <= 2));
        enemies.push({ r, c, alive: true });
    }
    return { map, enemies };
};

const Bomberman = ({ onComplete }) => {
    const [level] = useState(createLevel);
    const [map, setMap] = useState(level.map.map(r => [...r]));
    const [player, setPlayer] = useState({ r: 1, c: 1 });
    const [enemies, setEnemies] = useState(level.enemies);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const [bombs, setBombs] = useState([]);
    const enemyIntervalRef = useRef(null);

    const placeBomb = useCallback(() => {
        if (done || bombs.length >= 2) return;
        const newBombs = [...bombs, { r: player.r, c: player.c, timer: 3 }];
        setBombs(newBombs);

        const newMap = map.map(r => [...r]);
        newMap[player.r][player.c] = BOMB;
        setMap(newMap);
    }, [done, bombs, player, map]);

    useEffect(() => {
        if (done || bombs.length === 0) return;
        const t = setTimeout(() => {
            setBombs(prev => {
                const updated = prev.map(b => ({ ...b, timer: b.timer - 1 }));
                const exploding = updated.filter(b => b.timer <= 0);
                const remaining = updated.filter(b => b.timer > 0);
                if (exploding.length > 0) {
                    setMap(prevMap => {
                        const newMap = prevMap.map(r => [...r]);
                        exploding.forEach(bomb => {
                            newMap[bomb.r][bomb.c] = EXPLOSION;
                            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                                for (let i = 1; i <= 2; i++) {
                                    const nr = bomb.r + dr * i, nc = bomb.c + dc * i;
                                    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
                                    if (newMap[nr][nc] === WALL) break;
                                    if (newMap[nr][nc] === BRICK) { newMap[nr][nc] = EXPLOSION; break; }
                                    newMap[nr][nc] = EXPLOSION;
                                }
                            }
                        });
                        if (newMap[player.r][player.c] === EXPLOSION) {
                            setDone(true);
                            setTimeout(() => onComplete(Math.max(20, score * 10)), 500);
                        }
                        setEnemies(prevE => {
                            const newE = prevE.map(e => {
                                if (e.alive && newMap[e.r][e.c] === EXPLOSION) {
                                    setScore(s => s + 25);
                                    return { ...e, alive: false };
                                }
                                return e;
                            });
                            if (newE.every(e => !e.alive)) {
                                setDone(true);
                                setTimeout(() => onComplete(100), 500);
                            }
                            return newE;
                        });
                        setTimeout(() => {
                            setMap(m => m.map(r => r.map(c => c === EXPLOSION ? EMPTY : c)));
                        }, 400);
                        return newMap;
                    });
                }
                return remaining;
            });
        }, 1000);
        return () => clearTimeout(t);
    }, [bombs, done, player, score, onComplete]);

    useEffect(() => {
        const handleKey = (e) => {
            if (done) return;
            if (e.key === " ") { e.preventDefault(); placeBomb(); return; }
            const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
            if (!dirs[e.key]) return;
            e.preventDefault();
            const [dr, dc] = dirs[e.key];
            setPlayer(prev => {
                const nr = prev.r + dr, nc = prev.c + dc;
                if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return prev;
                if (map[nr][nc] === WALL || map[nr][nc] === BRICK || map[nr][nc] === BOMB) return prev;
                return { r: nr, c: nc };
            });
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [done, map, placeBomb]);

    useEffect(() => {
        if (done) return;
        enemyIntervalRef.current = setInterval(() => {
            setEnemies(prev => prev.map(e => {
                if (!e.alive) return e;
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dr, dc]) => {
                    const nr = e.r + dr, nc = e.c + dc;
                    return nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && map[nr][nc] !== WALL && map[nr][nc] !== BRICK && map[nr][nc] !== BOMB;
                });
                if (dirs.length === 0) return e;
                const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
                const newPos = { r: e.r + dr, c: e.c + dc };
                if (newPos.r === player.r && newPos.c === player.c) {
                    setDone(true);
                    setTimeout(() => onComplete(Math.max(20, score * 10)), 500);
                }
                return { ...e, ...newPos };
            }));
        }, 700);
        return () => clearInterval(enemyIntervalRef.current);
    }, [done, map, player, score, onComplete]);

    const COLORS = { [EMPTY]: "rgba(255,255,255,0.03)", [WALL]: "#555", [BRICK]: "#8B6914", [BOMB]: "#333", [EXPLOSION]: "#FF6B6B" };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "white" }}>
            <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                <span>점수: <span style={{ color: "#FFD700" }}>{score}</span></span>
                <span>적: <span style={{ color: "#FF6B6B" }}>{enemies.filter(e => e.alive).length}</span></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`, gap: "1px", padding: "4px", background: "#0a0a1a", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.1)" }}>
                {map.flat().map((cell, idx) => {
                    const r = Math.floor(idx / SIZE), c = idx % SIZE;
                    const isPlayer = player.r === r && player.c === c;
                    const enemy = enemies.find(e => e.alive && e.r === r && e.c === c);
                    return <div key={idx} style={{ width: CELL, height: CELL, borderRadius: "3px", background: COLORS[cell], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{isPlayer ? "😎" : enemy ? "👾" : cell === BOMB ? "💣" : cell === EXPLOSION ? "💥" : ""}</div>;
                })}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
                {[["↑", "ArrowUp"], ["←", "ArrowLeft"], ["↓", "ArrowDown"], ["→", "ArrowRight"], ["💣", " "]].map(([label, key]) => (
                    <button key={label} onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key }))} style={{ width: 38, height: 38, fontSize: "14px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", cursor: "pointer" }}>{label}</button>
                ))}
            </div>
            <div style={{ fontSize: "11px", color: "#8892b0" }}>방향키 이동 | Space 폭탄 설치</div>
        </div>
    );
};

export default Bomberman;
