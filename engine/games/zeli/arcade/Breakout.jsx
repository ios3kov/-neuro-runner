/**
 * 🎮 Game 32: 벽돌깨기 — 파괴 이펙트 + 네온 스타일
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 300, H = 400, PADDLE_W = 60, PADDLE_H = 10, BALL_R = 6;
const BRICK_ROWS = 4, BRICK_COLS = 6, BRICK_W = 46, BRICK_H = 16;
const COLORS = ["#FF6B6B", "#FFD700", "#64ffda", "#0cbfff"];

const Breakout = ({ onComplete }) => {
    const [paddleX, setPaddleX] = useState(W / 2 - PADDLE_W / 2);
    const [ball, setBall] = useState({ x: W / 2, y: H - 40, dx: 2, dy: -3 });
    const [bricks, setBricks] = useState([]);
    const [score, setScore] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const [particles, setParticles] = useState([]);
    const scoreRef = useRef(0);
    const totalBricks = BRICK_ROWS * BRICK_COLS;

    useEffect(() => {
        const b = [];
        for (let r = 0; r < BRICK_ROWS; r++)
            for (let c = 0; c < BRICK_COLS; c++)
                b.push({ x: c * (BRICK_W + 4) + 6, y: r * (BRICK_H + 4) + 30, alive: true, color: COLORS[r] });
        setBricks(b);
    }, []);

    useEffect(() => {
        if (!gameActive) return;
        const loop = setInterval(() => {
            setBall((b) => {
                let { x, y, dx, dy } = b;
                x += dx; y += dy;
                if (x <= BALL_R || x >= W - BALL_R) dx = -dx;
                if (y <= BALL_R) dy = -dy;
                if (y >= H) { setGameActive(false); setTimeout(() => onComplete(Math.round((scoreRef.current / totalBricks) * 100)), 500); return b; }
                setPaddleX((px) => {
                    if (y + BALL_R >= H - 20 && y + BALL_R <= H - 10 && x >= px && x <= px + PADDLE_W) {
                        dy = -Math.abs(dy);
                        dx = ((x - px - PADDLE_W / 2) / (PADDLE_W / 2)) * 4;
                    }
                    return px;
                });
                setBricks((bs) => {
                    let hit = false;
                    const nb = bs.map((br) => {
                        if (!br.alive || hit) return br;
                        if (x + BALL_R > br.x && x - BALL_R < br.x + BRICK_W && y + BALL_R > br.y && y - BALL_R < br.y + BRICK_H) {
                            hit = true; scoreRef.current += 1; setScore(scoreRef.current);
                            dy = -dy;
                            setParticles((ps) => [...ps.slice(-10), { id: Date.now(), x: br.x + BRICK_W / 2, y: br.y, color: br.color }]);
                            setTimeout(() => setParticles((ps) => ps.slice(1)), 500);
                            if (scoreRef.current >= totalBricks) { setGameActive(false); setTimeout(() => onComplete(100), 500); }
                            return { ...br, alive: false };
                        }
                        return br;
                    });
                    return nb;
                });
                return { x, y, dx, dy };
            });
        }, 16);
        return () => clearInterval(loop);
    }, [gameActive, onComplete, totalBricks]);

    const handleMove = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        setPaddleX(Math.max(0, Math.min(W - PADDLE_W, mx - PADDLE_W / 2)));
    }, []);

    const progress = Math.round((score / totalBricks) * 100);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <style>{`@keyframes brickExplode { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }`}</style>
            <div style={{ fontSize: "13px" }}>🧱 <span style={{ color: "#64ffda" }}>{score}</span>/{totalBricks}<span style={{ color: "#8892b0", marginLeft: 8 }}>({progress}%)</span></div>
            <div onMouseMove={handleMove} onTouchMove={handleMove} style={{ width: W, height: H, borderRadius: "12px", position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #0a0a2e, #0a0a1e)", cursor: "none", border: "2px solid rgba(255,255,255,0.06)" }}>
                {bricks.filter((b) => b.alive).map((b, i) => <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: BRICK_W, height: BRICK_H, background: `linear-gradient(135deg, ${b.color}, ${b.color}cc)`, borderRadius: "3px", boxShadow: `0 1px 4px ${b.color}33, inset 0 1px 2px rgba(255,255,255,0.2)` }} />)}
                {particles.map((p) => <div key={p.id} style={{ position: "absolute", left: p.x - 8, top: p.y - 8, width: 16, height: 16, borderRadius: "50%", background: p.color, opacity: 0.8, animation: "brickExplode 0.4s ease forwards" }} />)}
                <div style={{ position: "absolute", left: ball.x - BALL_R, top: ball.y - BALL_R, width: BALL_R * 2, height: BALL_R * 2, borderRadius: "50%", background: "white", boxShadow: "0 0 10px white, 0 0 20px rgba(255,255,255,0.3)" }} />
                <div style={{ position: "absolute", left: paddleX, top: H - 20, width: PADDLE_W, height: PADDLE_H, background: "linear-gradient(90deg, #7C3AED, #A855F7)", borderRadius: "5px", boxShadow: "0 0 10px rgba(124,58,237,0.4)" }} />
            </div>
            <div style={{ fontSize: "11px", color: "#8892b0" }}>{gameActive ? "마우스/터치로 패들 이동!" : "게임 오버!"}</div>
        </div>
    );
};

export default Breakout;
