/**
 * 🎮 Game 117: 프로거
 * 차를 피해 강을 건너기
 */
import { useState, useEffect, useRef } from "react";

const CANVAS_W = 300;
const CANVAS_H = 420;
const CELL = 42;
const ROWS = 10;
const COLS = 7;

const LANE_TYPES = ["safe", "road", "road", "road", "water", "water", "water", "road", "road", "safe"];
const LANE_SPEEDS = [0, 1.5, -2, 1.2, -1.8, 1.4, -1.6, 2, -1.3, 0];
const LANE_COLORS = {
    safe: "#2d4a2d", road: "#333", water: "#1a3a5c",
};

const Frogger = ({ onComplete }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        px: 3, py: 9, lives: 3, score: 0,
        gameOver: false, won: false, frame: 0,
        obstacles: LANE_TYPES.map((type, row) => {
            if (type === "safe") return [];
            const items = [];
            const count = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                items.push({ x: i * (CANVAS_W / count) + Math.random() * 30, w: 30 + Math.random() * 30 });
            }
            return items;
        }),
    });
    const [display, setDisplay] = useState({ score: 0, lives: 3 });

    useEffect(() => {
        const handleKey = (e) => {
            const s = stateRef.current;
            if (s.gameOver) return;
            if (e.key === "ArrowUp" && s.py > 0) s.py--;
            if (e.key === "ArrowDown" && s.py < ROWS - 1) s.py++;
            if (e.key === "ArrowLeft" && s.px > 0) s.px--;
            if (e.key === "ArrowRight" && s.px < COLS - 1) s.px++;
            e.preventDefault();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const loop = () => {
            const s = stateRef.current;
            if (s.gameOver) return;
            s.frame++;

            s.obstacles.forEach((lane, row) => {
                const speed = LANE_SPEEDS[row];
                lane.forEach(ob => {
                    ob.x += speed;
                    if (ob.x > CANVAS_W + 40) ob.x = -ob.w;
                    if (ob.x < -ob.w - 40) ob.x = CANVAS_W;
                });
            });

            const playerX = s.px * CELL + CELL / 2;
            const playerY = s.py * CELL;
            const laneType = LANE_TYPES[s.py];
            const laneObs = s.obstacles[s.py];

            if (laneType === "road") {
                for (const ob of laneObs) {
                    if (playerX > ob.x - 5 && playerX < ob.x + ob.w + 5) {
                        s.lives--;
                        s.px = 3; s.py = 9;
                        if (s.lives <= 0) {
                            s.gameOver = true;
                            setDisplay({ score: s.score, lives: 0 });
                            setTimeout(() => onComplete(Math.max(20, s.score * 5)), 500);
                            return;
                        }
                        break;
                    }
                }
            }

            if (laneType === "water") {
                const onLog = laneObs.some(ob => playerX > ob.x && playerX < ob.x + ob.w);
                if (!onLog) {
                    s.lives--;
                    s.px = 3; s.py = 9;
                    if (s.lives <= 0) {
                        s.gameOver = true;
                        setDisplay({ score: s.score, lives: 0 });
                        setTimeout(() => onComplete(Math.max(20, s.score * 5)), 500);
                        return;
                    }
                } else {
                    const log = laneObs.find(ob => playerX > ob.x && playerX < ob.x + ob.w);
                    if (log) {
                        const drift = LANE_SPEEDS[s.py] * 0.3;
                        s.px = Math.max(0, Math.min(COLS - 1, s.px + drift * 0.1));
                    }
                }
            }

            if (s.py === 0) {
                s.won = true;
                s.gameOver = true;
                s.score += 10;
                setDisplay({ score: s.score, lives: s.lives });
                setTimeout(() => onComplete(Math.min(100, 50 + s.lives * 15)), 500);
                return;
            }

            s.score = Math.max(s.score, 9 - s.py);
            setDisplay({ score: s.score, lives: s.lives });

            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            for (let row = 0; row < ROWS; row++) {
                ctx.fillStyle = LANE_COLORS[LANE_TYPES[row]];
                ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
            }

            s.obstacles.forEach((lane, row) => {
                const type = LANE_TYPES[row];
                lane.forEach(ob => {
                    ctx.fillStyle = type === "road" ? "#FF6B6B" : "#8B4513";
                    ctx.fillRect(ob.x, row * CELL + 6, ob.w, CELL - 12);
                    if (type === "road") {
                        ctx.fillStyle = "#FFD700";
                        ctx.fillRect(ob.x + 2, row * CELL + 8, 6, 4);
                        ctx.fillRect(ob.x + ob.w - 8, row * CELL + 8, 6, 4);
                    }
                });
            });

            ctx.fillStyle = "#6BCB77";
            ctx.beginPath();
            ctx.arc(Math.round(s.px) * CELL + CELL / 2, s.py * CELL + CELL / 2, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "16px sans-serif";
            ctx.fillText("🐸", Math.round(s.px) * CELL + CELL / 2 - 8, s.py * CELL + CELL / 2 + 5);

            ctx.fillStyle = "#64ffda";
            ctx.font = "14px sans-serif";
            ctx.fillText("🏠 안전!", CANVAS_W / 2 - 25, 20);

            animRef.current = requestAnimationFrame(loop);
        };

        const animRef = { current: requestAnimationFrame(loop) };
        return () => cancelAnimationFrame(animRef.current);
    }, [onComplete]);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "white" }}>
            <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                <span>진행: <span style={{ color: "#FFD700" }}>{display.score}</span></span>
                <span>생명: <span style={{ color: "#FF6B6B" }}>{"❤️".repeat(display.lives)}</span></span>
            </div>
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                style={{ borderRadius: "10px", border: "2px solid rgba(255,255,255,0.1)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 40px)", gap: "4px" }}>
                <div />
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }))} style={movBtn}>↑</button>
                <div />
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))} style={movBtn}>←</button>
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))} style={movBtn}>↓</button>
                <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))} style={movBtn}>→</button>
            </div>
        </div>
    );
};

const movBtn = {
    width: 40, height: 40, fontSize: "16px",
    background: "rgba(255,255,255,0.1)", color: "white",
    border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", cursor: "pointer",
};

export default Frogger;
