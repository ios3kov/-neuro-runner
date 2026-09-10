/**
 * 🎮 Game 31: 플래피 젤리 — 네온 파이프 + 별 배경 + 스코어 라벨
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 300, H = 400, GRAVITY = 0.5, JUMP = -7, PIPE_W = 40, GAP = 120, PIPE_SPEED = 2.5;

const FlappyJelly = ({ onComplete }) => {
    const [y, setY] = useState(H / 2);
    const [vy, setVy] = useState(0);
    const [pipes, setPipes] = useState([]);
    const [score, setScore] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const [started, setStarted] = useState(false);
    const scoreRef = useRef(0);
    const nextPipe = useRef(0);

    const jump = useCallback(() => {
        if (!gameActive) return;
        if (!started) setStarted(true);
        setVy(JUMP);
    }, [gameActive, started]);

    useEffect(() => {
        const kd = (e) => { if (e.code === "Space") { e.preventDefault(); jump(); } };
        window.addEventListener("keydown", kd);
        return () => window.removeEventListener("keydown", kd);
    }, [jump]);

    useEffect(() => {
        if (!started || !gameActive) return;
        const loop = setInterval(() => {
            setY((py) => {
                const ny = py + vy;
                if (ny < 0 || ny > H - 20) { endGame(); return py; }
                return ny;
            });
            setVy((v) => v + GRAVITY);
            setPipes((prev) => {
                let ps = prev.map((p) => ({ ...p, x: p.x - PIPE_SPEED }));
                nextPipe.current -= PIPE_SPEED;
                if (nextPipe.current <= 0) {
                    const gapY = 80 + Math.random() * (H - 160 - GAP);
                    ps.push({ x: W, gapY, passed: false });
                    nextPipe.current = 160;
                }
                ps = ps.map((p) => {
                    if (!p.passed && p.x + PIPE_W < 45) {
                        scoreRef.current += 1; setScore(scoreRef.current);
                        return { ...p, passed: true };
                    }
                    return p;
                });
                setY((cy) => {
                    for (const p of ps) {
                        if (p.x < 55 && p.x + PIPE_W > 25) {
                            if (cy < p.gapY || cy + 20 > p.gapY + GAP) { endGame(); }
                        }
                    }
                    return cy;
                });
                return ps.filter((p) => p.x > -PIPE_W);
            });
        }, 20);
        return () => clearInterval(loop);
    }, [started, gameActive, vy]);

    const endGame = () => {
        setGameActive(false);
        setTimeout(() => onComplete(Math.min(100, scoreRef.current * 8)), 500);
    };

    return (
        <div onClick={jump} style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white", cursor: "pointer", userSelect: "none" }}>
            <div style={{ fontSize: "14px" }}>
                🟣 <span style={{ color: "#FFD700", fontWeight: "bold" }}>{score}</span>
                {score >= 5 && <span style={{ color: "#A855F7", marginLeft: 8 }}>🔥 나이스!</span>}
            </div>
            <div style={{
                width: W, height: H, borderRadius: "12px", position: "relative", overflow: "hidden",
                background: "linear-gradient(180deg, #0a0a2e 0%, #1a1040 40%, #2d1b69 100%)",
                border: "2px solid rgba(124,58,237,0.2)",
            }}>
                {[...Array(12)].map((_, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        left: `${(i * 29 + 5) % 95}%`, top: `${(i * 17 + 3) % 40}%`,
                        width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
                        borderRadius: "50%", background: `rgba(255,255,255,${0.2 + (i % 3) * 0.15})`,
                    }} />
                ))}
                {pipes.map((p, i) => (
                    <div key={i}>
                        <div style={{
                            position: "absolute", left: p.x, top: 0, width: PIPE_W, height: p.gapY,
                            background: "linear-gradient(180deg, #22c55e, #15803d)",
                            borderRadius: "0 0 8px 8px",
                            boxShadow: "0 0 8px rgba(34,197,94,0.2)",
                        }} />
                        <div style={{
                            position: "absolute", left: p.x, top: p.gapY + GAP, width: PIPE_W, height: H - p.gapY - GAP,
                            background: "linear-gradient(0deg, #22c55e, #15803d)",
                            borderRadius: "8px 8px 0 0",
                            boxShadow: "0 0 8px rgba(34,197,94,0.2)",
                        }} />
                    </div>
                ))}
                <div style={{
                    position: "absolute", left: 30, top: y, fontSize: "22px",
                    filter: "drop-shadow(0 2px 6px rgba(124,58,237,0.5))",
                    transform: `rotate(${Math.min(30, vy * 3)}deg)`,
                    transition: "top 0.02s linear, transform 0.1s ease",
                }}>🟣</div>
                {!started && (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.4)",
                    }}>
                        <div style={{ fontSize: "36px", marginBottom: 8 }}>🟣</div>
                        <div style={{ fontSize: "14px" }}>클릭/스페이스로 시작!</div>
                    </div>
                )}
                {!gameActive && (
                    <div style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,0.5)",
                    }}>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FF6B6B" }}>💀 게임 오버!</div>
                        <div style={{ fontSize: "16px", color: "#FFD700" }}>{score}점</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlappyJelly;
