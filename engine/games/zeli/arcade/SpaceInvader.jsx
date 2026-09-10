/**
 * 🎮 Game 37: 스페이스 인베이더 — 총알 글로우 + 적 파괴 파티클 + 점수 바
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 280, H = 380, PW = 20;

const SpaceInvader = ({ onComplete }) => {
    const [px, setPx] = useState(W / 2);
    const [bullets, setBullets] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [score, setScore] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const [particles, setParticles] = useState([]);
    const scoreRef = useRef(0);
    const keysRef = useRef({});
    const totalEnemies = 18;

    useEffect(() => {
        const es = [];
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 6; c++)
                es.push({ x: 30 + c * 38, y: 30 + r * 32, alive: true });
        setEnemies(es);
    }, []);

    useEffect(() => {
        const kd = (e) => { keysRef.current[e.key] = true; e.preventDefault(); };
        const ku = (e) => { keysRef.current[e.key] = false; };
        window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
        return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
    }, []);

    useEffect(() => {
        if (!gameActive) return;
        const loop = setInterval(() => {
            setPx((x) => {
                if (keysRef.current["ArrowLeft"]) x -= 4;
                if (keysRef.current["ArrowRight"]) x += 4;
                return Math.max(PW / 2, Math.min(W - PW / 2, x));
            });
            if (keysRef.current[" "] || keysRef.current["ArrowUp"]) {
                keysRef.current[" "] = false; keysRef.current["ArrowUp"] = false;
                setPx((x) => { setBullets((bs) => bs.length < 5 ? [...bs, { x, y: H - 40 }] : bs); return x; });
            }
            setBullets((bs) => bs.map((b) => ({ ...b, y: b.y - 6 })).filter((b) => b.y > 0));
            setBullets((bs) => {
                setEnemies((es) => {
                    let newBs = [...bs];
                    const nes = es.map((e) => {
                        if (!e.alive) return e;
                        const hit = newBs.findIndex((b) => Math.abs(b.x - e.x - 14) < 18 && Math.abs(b.y - e.y - 10) < 14);
                        if (hit >= 0) {
                            newBs.splice(hit, 1); scoreRef.current += 1; setScore(scoreRef.current);
                            setParticles((ps) => [...ps.slice(-8), { id: Date.now() + Math.random(), x: e.x + 14, y: e.y + 10 }]);
                            setTimeout(() => setParticles((ps) => ps.slice(1)), 400);
                            return { ...e, alive: false };
                        }
                        return e;
                    });
                    if (nes.every((e) => !e.alive)) { setGameActive(false); setTimeout(() => onComplete(100), 500); }
                    setBullets(newBs);
                    return nes;
                });
                return bs;
            });
            setEnemies((es) => {
                const ne = es.map((e) => ({ ...e, y: e.y + 0.1 }));
                if (ne.some((e) => e.alive && e.y > H - 60)) {
                    setGameActive(false);
                    setTimeout(() => onComplete(Math.round((scoreRef.current / totalEnemies) * 100)), 500);
                }
                return ne;
            });
        }, 33);
        return () => clearInterval(loop);
    }, [gameActive, onComplete]);

    const shoot = useCallback(() => {
        setPx((x) => { setBullets((bs) => bs.length < 5 ? [...bs, { x, y: H - 40 }] : bs); return x; });
    }, []);

    const progress = Math.round((score / totalEnemies) * 100);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <style>{`@keyframes explode { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }`}</style>
            <div style={{ fontSize: "13px" }}>
                👾 <span style={{ color: "#64ffda" }}>{score}</span>/{totalEnemies}
                <span style={{ color: "#8892b0", marginLeft: 8 }}>({progress}%)</span>
            </div>
            <div style={{ width: W, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #64ffda, #22C55E)", borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <div style={{
                width: W, height: H, borderRadius: "12px", position: "relative", overflow: "hidden",
                background: "linear-gradient(180deg, #020015 0%, #050520 60%, #0a0a30 100%)",
                border: "2px solid rgba(255,255,255,0.06)",
            }}>
                {[10, 50, 90, 130, 170, 200, 30, 250, 80, 220].map((s, i) => (
                    <div key={i} style={{ position: "absolute", left: s, top: (i * 43 + 20) % H, width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, background: `rgba(255,255,255,${0.15 + (i % 3) * 0.1})`, borderRadius: "50%" }} />
                ))}
                {enemies.filter((e) => e.alive).map((e, i) => (
                    <div key={i} style={{ position: "absolute", left: e.x, top: e.y, fontSize: "22px", filter: "drop-shadow(0 0 4px rgba(200,100,255,0.3))" }}>👾</div>
                ))}
                {particles.map((p) => (
                    <div key={p.id} style={{ position: "absolute", left: p.x - 8, top: p.y - 8, width: 16, height: 16, borderRadius: "50%", background: "rgba(255,200,0,0.6)", animation: "explode 0.4s ease forwards" }} />
                ))}
                {bullets.map((b, i) => (
                    <div key={i} style={{ position: "absolute", left: b.x - 2, top: b.y, width: 4, height: 12, background: "#FFD700", borderRadius: "2px", boxShadow: "0 0 8px rgba(255,215,0,0.5)" }} />
                ))}
                <div style={{ position: "absolute", left: px - PW / 2, top: H - 35, fontSize: "24px", filter: "drop-shadow(0 2px 4px rgba(100,255,218,0.3))" }}>🚀</div>
                {!gameActive && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: score >= totalEnemies ? "#64ffda" : "#FF6B6B" }}>{score >= totalEnemies ? "🏆 클리어!" : "💀 게임 오버"}</div>
                        <div style={{ color: "#FFD700" }}>{score}/{totalEnemies}</div>
                    </div>
                )}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
                <button onMouseDown={() => keysRef.current["ArrowLeft"] = true} onMouseUp={() => keysRef.current["ArrowLeft"] = false} onTouchStart={() => keysRef.current["ArrowLeft"] = true} onTouchEnd={() => keysRef.current["ArrowLeft"] = false} style={cBtn}>◀</button>
                <button onClick={shoot} style={{ ...cBtn, width: 50 }}>🔫</button>
                <button onMouseDown={() => keysRef.current["ArrowRight"] = true} onMouseUp={() => keysRef.current["ArrowRight"] = false} onTouchStart={() => keysRef.current["ArrowRight"] = true} onTouchEnd={() => keysRef.current["ArrowRight"] = false} style={cBtn}>▶</button>
            </div>
        </div>
    );
};

const cBtn = { width: 42, height: 34, fontSize: "14px", background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer" };

export default SpaceInvader;
