/**
 * 🎮 핑퐁 — AI 난이도 단계 + 파워업 공 + 스피드업 + 파티클
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 300, H = 400, PW = 60, PH = 10, BR = 6;

const PingPong = ({ onComplete }) => {
    const [playerX, setPlayerX] = useState(W / 2 - PW / 2);
    const [aiX, setAiX] = useState(W / 2 - PW / 2);
    const [ball, setBall] = useState({ x: W / 2, y: H / 2, dx: 2.5, dy: 3 });
    const [pScore, setPScore] = useState(0);
    const [aScore, setAScore] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const [rallies, setRallies] = useState(0);
    const [maxRally, setMaxRally] = useState(0);
    const [powerBall, setPowerBall] = useState(false);
    const [particles, setParticles] = useState([]);
    const [difficulty, setDifficulty] = useState("Easy");
    const pRef = useRef(0); const aRef = useRef(0);
    const rallyRef = useRef(0);

    const aiSpeed = pRef.current >= 4 ? 0.12 : pRef.current >= 2 ? 0.1 : 0.07;

    useEffect(() => {
        if (!gameActive) return;
        const loop = setInterval(() => {
            setBall((b) => {
                let { x, y, dx, dy } = b;
                x += dx; y += dy;
                if (x <= BR || x >= W - BR) dx = -dx;
                if (y >= H - 25 && y <= H - 15 && x >= playerX && x <= playerX + PW) {
                    dy = -Math.abs(dy);
                    dx = ((x - playerX - PW / 2) / (PW / 2)) * 4;
                    rallyRef.current++;
                    setRallies(rallyRef.current);
                    if (rallyRef.current > maxRally) setMaxRally(rallyRef.current);
                    if (rallyRef.current >= 5 && !powerBall) setPowerBall(true);
                    const speedMult = 1 + rallyRef.current * 0.02;
                    dy = dy * Math.min(speedMult, 1.5);
                    const pid = Date.now();
                    setParticles(p => [...p.slice(-8), { id: pid, x, y, color: powerBall ? "#FF6B6B" : "#64ffda" }]);
                    setTimeout(() => setParticles(p => p.filter(pp => pp.id !== pid)), 400);
                }
                if (y <= 25 && y >= 15 && x >= aiX && x <= aiX + PW) {
                    dy = Math.abs(dy);
                    dx = ((x - aiX - PW / 2) / (PW / 2)) * 4;
                    rallyRef.current++;
                    setRallies(rallyRef.current);
                }
                if (y < 0) {
                    pRef.current++; setPScore(pRef.current); rallyRef.current = 0; setRallies(0); setPowerBall(false);
                    x = W / 2; y = H / 2; dy = 3; dx = -2;
                    if (pRef.current >= 4) setDifficulty("Hard"); else if (pRef.current >= 2) setDifficulty("Normal");
                }
                if (y > H) {
                    aRef.current++; setAScore(aRef.current); rallyRef.current = 0; setRallies(0); setPowerBall(false);
                    x = W / 2; y = H / 2; dy = -3; dx = 2;
                }
                if (pRef.current >= 5 || aRef.current >= 5) {
                    setGameActive(false);
                    setTimeout(() => onComplete(pRef.current >= 5 ? 100 : Math.round(pRef.current * 15 + maxRally)), 500);
                }
                return { x, y, dx, dy };
            });
            setBall((b) => {
                setAiX((ax) => {
                    const diff = b.x - ax - PW / 2;
                    return Math.max(0, Math.min(W - PW, ax + diff * aiSpeed));
                });
                return b;
            });
        }, 16);
        return () => clearInterval(loop);
    }, [gameActive, playerX, aiX, maxRally, powerBall, aiSpeed, onComplete]);

    const handleMove = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        setPlayerX(Math.max(0, Math.min(W - PW, mx - PW / 2)));
    }, []);

    const rallyColor = rallies >= 5 ? "#FF6B6B" : rallies >= 3 ? "#FFD700" : "#8892b0";

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <style>{`
                @keyframes hitBurst { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3); opacity: 0; } }
                @keyframes powerPulse { 0%,100% { box-shadow: 0 0 12px rgba(255,107,107,0.5); } 50% { box-shadow: 0 0 25px rgba(255,107,107,0.8); } }
            `}</style>
            <div style={{ display: "flex", gap: "14px", fontSize: "13px", alignItems: "center" }}>
                <span>나 <span style={{ color: "#64ffda", fontWeight: "bold", fontSize: "18px" }}>{pScore}</span></span>
                <span style={{ color: "#8892b0" }}>vs</span>
                <span><span style={{ color: "#FF6B6B", fontWeight: "bold", fontSize: "18px" }}>{aScore}</span> AI</span>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "6px", background: difficulty === "Hard" ? "rgba(255,107,107,0.15)" : difficulty === "Normal" ? "rgba(255,215,0,0.15)" : "rgba(100,255,218,0.15)", color: difficulty === "Hard" ? "#FF6B6B" : difficulty === "Normal" ? "#FFD700" : "#64ffda" }}>{difficulty}</span>
            </div>
            {rallies > 0 && <div style={{ fontSize: "11px", color: rallyColor, fontWeight: rallies >= 3 ? "bold" : "normal" }}>🏓 {rallies} Rally {powerBall ? "🔥 POWER BALL!" : rallies >= 3 ? "연속!" : ""}</div>}
            <div onMouseMove={handleMove} onTouchMove={handleMove} style={{ width: W, height: H, borderRadius: "12px", position: "relative", overflow: "hidden", background: powerBall ? "linear-gradient(180deg, #0a0a2e, #1a0a1a)" : "linear-gradient(180deg, #0a0a2e, #0a0a1e)", border: "2px solid rgba(255,255,255,0.06)", cursor: "none" }}>
                <div style={{ position: "absolute", top: H / 2 - 1, width: W, height: 2, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ position: "absolute", top: H / 2 - 30, left: W / 2 - 30, width: 60, height: 60, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />
                <div style={{ position: "absolute", left: aiX, top: 15, width: PW, height: PH, background: difficulty === "Hard" ? "linear-gradient(90deg, #EF4444, #DC2626)" : "linear-gradient(90deg, #EF4444, #F97316)", borderRadius: "5px", boxShadow: `0 0 ${difficulty === "Hard" ? 15 : 10}px rgba(239,68,68,0.3)` }} />
                <div style={{ position: "absolute", left: playerX, top: H - 25, width: PW, height: PH, background: powerBall ? "linear-gradient(90deg, #FF6B6B, #FFD700)" : "linear-gradient(90deg, #3B82F6, #64ffda)", borderRadius: "5px", boxShadow: powerBall ? "0 0 15px rgba(255,107,107,0.5)" : "0 0 10px rgba(100,255,218,0.3)" }} />
                <div style={{ position: "absolute", left: ball.x - BR, top: ball.y - BR, width: BR * 2, height: BR * 2, borderRadius: "50%", background: powerBall ? "#FF6B6B" : "#FFD700", boxShadow: powerBall ? "0 0 15px rgba(255,107,107,0.7), 0 0 30px rgba(255,107,107,0.3)" : "0 0 12px rgba(255,215,0,0.5), 0 0 25px rgba(255,215,0,0.2)", animation: powerBall ? "powerPulse 0.5s infinite" : "none" }} />
                <div style={{ position: "absolute", left: ball.x - BR * 0.6, top: ball.y - BR * 0.6 + ball.dy * 2, width: BR * 1.2, height: BR * 1.2, borderRadius: "50%", background: powerBall ? "rgba(255,107,107,0.2)" : "rgba(255,215,0,0.15)" }} />
                {particles.map(p => <div key={p.id} style={{ position: "absolute", left: p.x - 5, top: p.y - 5, width: 10, height: 10, borderRadius: "50%", background: p.color, opacity: 0.6, animation: "hitBurst 0.4s ease forwards" }} />)}
                <div style={{ position: "absolute", right: 10, top: H / 2 - 25, fontSize: "36px", fontWeight: "bold", color: "rgba(255,255,255,0.04)" }}>{aScore}</div>
                <div style={{ position: "absolute", right: 10, top: H / 2 + 5, fontSize: "36px", fontWeight: "bold", color: "rgba(255,255,255,0.04)" }}>{pScore}</div>
            </div>
            <div style={{ fontSize: "11px", color: "#8892b0" }}>{gameActive ? (powerBall ? "🔥 파워볼! AI가 당황합니다!" : "마우스로 패들 이동! 5연속 랠리 → 파워볼!") : (pRef.current >= 5 ? "🏆 승리!" : `😢 패배 (최대 ${maxRally} 랠리)`)}</div>
        </div>
    );
};

export default PingPong;
