/**
 * 🎮 Game 40: 점프맨 — 플랫폼 점프 + 코인 수집 + 레벨 배경
 */
import { useEffect, useRef, useState } from "react";

const W = 300, H = 250, GRAVITY = 0.5, JUMP_V = -9;

const JumpMan = ({ onComplete }) => {
    const [py, setPy] = useState(180);
    const [px, setPx] = useState(40);
    const [vy, setVy] = useState(0);
    const [coins, setCoins] = useState([
        { x: 80, y: 120, id: 1 }, { x: 160, y: 80, id: 2 }, { x: 240, y: 140, id: 3 },
        { x: 120, y: 50, id: 4 }, { x: 200, y: 100, id: 5 },
    ]);
    const [score, setScore] = useState(0);
    const [platforms] = useState([
        { x: 0, y: 210, w: 300 }, { x: 60, y: 160, w: 80 }, { x: 180, y: 130, w: 70 },
        { x: 100, y: 90, w: 90 }, { x: 30, y: 50, w: 60 },
    ]);
    const [done, setDone] = useState(false);
    const keysRef = useRef({});
    const jumpRef = useRef(false);
    const scoreRef = useRef(0);

    useEffect(() => {
        const kd = (e) => { keysRef.current[e.key] = true; e.preventDefault(); };
        const ku = (e) => { keysRef.current[e.key] = false; };
        window.addEventListener("keydown", kd);
        window.addEventListener("keyup", ku);
        return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
    }, []);

    useEffect(() => {
        if (done) return;
        const loop = setInterval(() => {
            const keys = keysRef.current;
            let nx = px;
            if (keys.ArrowLeft || keys.a) nx -= 3;
            if (keys.ArrowRight || keys.d) nx += 3;
            nx = Math.max(0, Math.min(W - 16, nx));
            setPx(nx);

            let ny = py + vy;
            let nvy = vy + GRAVITY;
            let onGround = false;

            for (const p of platforms) {
                if (nx + 16 > p.x && nx < p.x + p.w && ny + 20 >= p.y && ny + 20 <= p.y + 8 && vy >= 0) {
                    ny = p.y - 20; nvy = 0; onGround = true;
                }
            }

            if ((keys.ArrowUp || keys.w || keys[" "]) && onGround && !jumpRef.current) {
                nvy = JUMP_V; jumpRef.current = true;
            }
            if (onGround) jumpRef.current = false;

            setPy(ny); setVy(nvy);

            setCoins((cs) => {
                const remaining = cs.filter((c) => {
                    if (Math.abs(nx - c.x) < 20 && Math.abs(ny - c.y) < 20) {
                        scoreRef.current++; setScore(scoreRef.current);
                        if (scoreRef.current >= 5) { setDone(true); setTimeout(() => onComplete(100), 500); }
                        return false;
                    }
                    return true;
                });
                return remaining;
            });

            if (ny > H + 20) { setDone(true); setTimeout(() => onComplete(Math.round((scoreRef.current / 5) * 100)), 500); }
        }, 20);
        return () => clearInterval(loop);
    }, [px, py, vy, done, platforms, onComplete]);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <div style={{ fontSize: "13px" }}>🪙 <span style={{ color: "#FFD700" }}>{score}/5</span></div>
            <div style={{
                width: W, height: H, borderRadius: "12px", position: "relative", overflow: "hidden",
                background: "linear-gradient(180deg, #1a1040, #0a0a2e)",
                border: "2px solid rgba(255,255,255,0.06)",
            }}>
                {platforms.map((p, i) => (
                    <div key={i} style={{
                        position: "absolute", left: p.x, top: p.y, width: p.w, height: 8,
                        background: i === 0 ? "linear-gradient(90deg, #4a3728, #6b4f3a)" : "linear-gradient(90deg, #3B82F6, #2563EB)",
                        borderRadius: "4px",
                        boxShadow: i > 0 ? "0 2px 6px rgba(59,130,246,0.2)" : "none",
                    }} />
                ))}
                {coins.map((c) => (
                    <div key={c.id} style={{
                        position: "absolute", left: c.x, top: c.y, fontSize: "16px",
                        animation: "foodPulse 1s ease infinite",
                        filter: "drop-shadow(0 0 4px rgba(255,215,0,0.5))",
                    }}>🪙</div>
                ))}
                <div style={{
                    position: "absolute", left: px, top: py, fontSize: "18px",
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                }}>🏃</div>
            </div>
            <style>{`@keyframes foodPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }`}</style>
            <div style={{ fontSize: "10px", color: "#8892b0" }}>{done ? (score >= 5 ? "🎉 클리어!" : "💀 떨어짐") : "방향키로 이동, ↑/스페이스로 점프"}</div>
        </div>
    );
};

export default JumpMan;
