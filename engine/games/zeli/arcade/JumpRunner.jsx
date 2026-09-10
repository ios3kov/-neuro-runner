/**
 * 🎮 Game 39: 점프 러너 — 구름+별 배경 + 스코어 이펙트
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 300, H = 200, GROUND = H - 40, GRAVITY = 0.6, JUMP_V = -10;

const JumpRunner = ({ onComplete }) => {
    const [py, setPy] = useState(GROUND);
    const [vy, setVy] = useState(0);
    const [obstacles, setObstacles] = useState([]);
    const [score, setScore] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const [started, setStarted] = useState(false);
    const scoreRef = useRef(0);
    const speedRef = useRef(4);
    const spawnRef = useRef(0);
    const jumping = useRef(false);

    const jump = useCallback(() => {
        if (!gameActive) return;
        if (!started) setStarted(true);
        if (!jumping.current) { setVy(JUMP_V); jumping.current = true; }
    }, [gameActive, started]);

    useEffect(() => {
        const kd = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); jump(); } };
        window.addEventListener("keydown", kd);
        return () => window.removeEventListener("keydown", kd);
    }, [jump]);

    useEffect(() => {
        if (!started || !gameActive) return;
        const loop = setInterval(() => {
            setPy((y) => {
                const ny = y + vy;
                if (ny >= GROUND) { jumping.current = false; setVy(0); return GROUND; }
                return ny;
            });
            setVy((v) => v + GRAVITY);
            scoreRef.current += 1;
            setScore(Math.floor(scoreRef.current / 5));
            speedRef.current = 4 + Math.floor(scoreRef.current / 100) * 0.5;
            spawnRef.current -= 1;
            if (spawnRef.current <= 0) {
                setObstacles((os) => [...os, { x: W + 10, h: 20 + Math.random() * 15, w: 12 + Math.random() * 10 }]);
                spawnRef.current = 40 + Math.floor(Math.random() * 30);
            }
            setObstacles((os) => {
                const nos = os.map((o) => ({ ...o, x: o.x - speedRef.current })).filter((o) => o.x > -30);
                setPy((cy) => {
                    for (const o of nos) {
                        if (o.x < 35 && o.x + o.w > 15 && cy + 20 > GROUND - o.h + 20) {
                            setGameActive(false);
                            setTimeout(() => onComplete(Math.min(100, Math.floor(scoreRef.current / 20))), 500);
                        }
                    }
                    return cy;
                });
                return nos;
            });
        }, 20);
        return () => clearInterval(loop);
    }, [started, gameActive, vy, onComplete]);

    return (
        <div onClick={jump} style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "white", cursor: "pointer", userSelect: "none" }}>
            <div style={{ fontSize: "14px" }}>
                🏃 <span style={{ color: "#FFD700", fontWeight: "bold" }}>{score}</span>m
                {score > 50 && <span style={{ color: "#EF4444", marginLeft: 8 }}>🔥 속도 UP!</span>}
            </div>
            <div style={{
                width: W, height: H, borderRadius: "12px", position: "relative", overflow: "hidden",
                background: "linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 50%, #2d1b4e 100%)",
                border: "2px solid rgba(255,255,255,0.08)",
            }}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        left: `${(i * 37 + 10) % 95}%`, top: `${(i * 23 + 5) % 40}%`,
                        width: 2, height: 2, borderRadius: "50%",
                        background: "rgba(255,255,255,0.4)",
                    }} />
                ))}
                <div style={{
                    position: "absolute", bottom: 0, width: W, height: 40,
                    background: "linear-gradient(180deg, #2d1b4e, #1a0a2e)",
                    borderTop: "2px solid rgba(100,255,218,0.15)",
                }} />
                <div style={{ position: "absolute", bottom: 38, width: W, height: 2, background: "rgba(100,255,218,0.1)" }} />
                <div style={{
                    position: "absolute", left: 20, top: py, fontSize: "20px",
                    filter: jumping.current ? "drop-shadow(0 4px 6px rgba(100,255,218,0.3))" : "none",
                    transition: "top 0.02s linear",
                }}>🏃</div>
                {obstacles.map((o, i) => (
                    <div key={i} style={{
                        position: "absolute", left: o.x, bottom: 40, width: o.w, height: o.h,
                        background: "linear-gradient(180deg, #EF4444, #B91C1C)",
                        borderRadius: "3px 3px 0 0",
                        boxShadow: "0 0 8px rgba(239,68,68,0.3)",
                    }} />
                ))}
                {!started && (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.4)", fontSize: "14px",
                    }}>
                        <div style={{ fontSize: "32px", marginBottom: 8 }}>🏃</div>
                        클릭/스페이스로 시작!
                    </div>
                )}
                {!gameActive && (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.5)",
                    }}>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#FF6B6B" }}>💀 게임 오버!</div>
                        <div style={{ fontSize: "16px", color: "#FFD700" }}>{score}m</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JumpRunner;
