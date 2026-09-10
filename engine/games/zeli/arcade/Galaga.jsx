/**
 * 🎮 Game 40: 갤러거
 * 적 우주선이 대열을 지어 내려옵니다! 좌우 이동 + 발사!
 */
import { useCallback, useEffect, useRef, useState } from "react";

const W = 280, H = 400;

const Galaga = ({ onComplete }) => {
    const [px, setPx] = useState(W / 2);
    const [bullets, setBullets] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [wave, setWave] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameActive, setGameActive] = useState(true);
    const [eBullets, setEBullets] = useState([]);
    const scoreRef = useRef(0);
    const keysRef = useRef({});

    const spawnWave = useCallback((w) => {
        const es = [];
        const count = Math.min(4 + w, 8);
        for (let r = 0; r < 2; r++)
            for (let c = 0; c < count; c++)
                es.push({ x: 20 + c * (240 / count), y: 30 + r * 35, alive: true, dir: 1 });
        return es;
    }, []);

    useEffect(() => { setEnemies(spawnWave(1)); }, [spawnWave]);

    useEffect(() => {
        const kd = (e) => { keysRef.current[e.key] = true; e.preventDefault(); };
        const ku = (e) => { keysRef.current[e.key] = false; };
        window.addEventListener("keydown", kd);
        window.addEventListener("keyup", ku);
        return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
    }, []);

    useEffect(() => {
        if (!gameActive) return;
        const loop = setInterval(() => {
            setPx((x) => {
                if (keysRef.current["ArrowLeft"]) x -= 4;
                if (keysRef.current["ArrowRight"]) x += 4;
                return Math.max(12, Math.min(W - 12, x));
            });
            if (keysRef.current[" "] || keysRef.current["ArrowUp"]) {
                keysRef.current[" "] = false;
                keysRef.current["ArrowUp"] = false;
                setPx((x) => { setBullets((bs) => bs.length < 4 ? [...bs, { x, y: H - 45 }] : bs); return x; });
            }
            setBullets((bs) => bs.map((b) => ({ ...b, y: b.y - 7 })).filter((b) => b.y > 0));
            setEnemies((es) => es.map((e) => {
                if (!e.alive) return e;
                let nx = e.x + e.dir * 0.8;
                let nd = e.dir;
                if (nx < 10 || nx > W - 30) { nd = -nd; nx = e.x; }
                return { ...e, x: nx, dir: nd };
            }));
            setEnemies((es) => {
                const alive = es.filter((e) => e.alive);
                if (alive.length > 0 && Math.random() < 0.02) {
                    const shooter = alive[Math.floor(Math.random() * alive.length)];
                    setEBullets((eb) => [...eb, { x: shooter.x + 10, y: shooter.y + 20 }]);
                }
                return es;
            });
            setEBullets((eb) => eb.map((b) => ({ ...b, y: b.y + 4 })).filter((b) => b.y < H));
            setBullets((bs) => {
                let newBs = [...bs];
                setEnemies((es) => es.map((e) => {
                    if (!e.alive) return e;
                    const hit = newBs.findIndex((b) => Math.abs(b.x - e.x - 10) < 16 && Math.abs(b.y - e.y - 10) < 14);
                    if (hit >= 0) {
                        newBs.splice(hit, 1);
                        scoreRef.current += 10;
                        setScore(scoreRef.current);
                        return { ...e, alive: false };
                    }
                    return e;
                }));
                setBullets(newBs);
                return newBs;
            });
            setEBullets((eb) => {
                setPx((x) => {
                    const hit = eb.find((b) => Math.abs(b.x - x) < 14 && b.y > H - 50);
                    if (hit) {
                        setLives((l) => {
                            const nl = l - 1;
                            if (nl <= 0) {
                                setGameActive(false);
                                setTimeout(() => onComplete(Math.min(100, Math.round(scoreRef.current / 2))), 500);
                            }
                            return nl;
                        });
                        setEBullets((ebs) => ebs.filter((b) => b !== hit));
                    }
                    return x;
                });
                return eb;
            });
            setEnemies((es) => {
                if (es.length > 0 && es.every((e) => !e.alive)) {
                    const nw = wave + 1;
                    setWave(nw);
                    if (nw > 3) {
                        setGameActive(false);
                        setTimeout(() => onComplete(100), 500);
                        return es;
                    }
                    return spawnWave(nw);
                }
                return es;
            });
        }, 33);
        return () => clearInterval(loop);
    }, [gameActive, wave, spawnWave, onComplete]);

    const shoot = useCallback(() => {
        setPx((x) => { setBullets((bs) => bs.length < 4 ? [...bs, { x, y: H - 45 }] : bs); return x; });
    }, []);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <div style={{ fontSize: "13px" }}>💎 <span style={{ color: "#FFD700" }}>{score}</span> | ❤️ {"❤️".repeat(lives)} | Wave <span style={{ color: "#A855F7" }}>{wave}/3</span></div>
            <div style={{ width: W, height: H, background: "linear-gradient(180deg, #020015, #050520, #0a0a30)", borderRadius: "12px", position: "relative", overflow: "hidden", border: "2px solid rgba(255,255,255,0.06)" }}>
                {[15, 55, 95, 140, 185, 230, 45, 175, 260].map((s, i) => (
                    <div key={`s${i}`} style={{ position: "absolute", left: s, top: (i * 47 + 15) % H, width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, background: `rgba(255,255,255,${0.12 + (i % 3) * 0.08})`, borderRadius: "50%" }} />
                ))}
                {enemies.filter((e) => e.alive).map((e, i) => (
                    <div key={i} style={{ position: "absolute", left: e.x, top: e.y, fontSize: "20px", filter: "drop-shadow(0 0 4px rgba(200,100,255,0.3))" }}>🛸</div>
                ))}
                {bullets.map((b, i) => (
                    <div key={`pb${i}`} style={{ position: "absolute", left: b.x - 2, top: b.y, width: 4, height: 12, background: "#64ffda", borderRadius: "2px", boxShadow: "0 0 6px rgba(100,255,218,0.4)" }} />
                ))}
                {eBullets.map((b, i) => (
                    <div key={`eb${i}`} style={{ position: "absolute", left: b.x - 2, top: b.y, width: 4, height: 8, background: "#FF6B6B", borderRadius: "2px", boxShadow: "0 0 4px rgba(255,107,107,0.3)" }} />
                ))}
                <div style={{ position: "absolute", left: px - 12, top: H - 40, fontSize: "24px", filter: "drop-shadow(0 2px 4px rgba(100,255,218,0.3))" }}>🚀</div>
                {!gameActive && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: wave > 3 ? "#64ffda" : "#FF6B6B" }}>{wave > 3 ? "🏆 클리어!" : "💀 게임 오버"}</div>
                        <div style={{ color: "#FFD700" }}>{score}점</div>
                    </div>
                )}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
                <button onMouseDown={() => keysRef.current["ArrowLeft"] = true} onMouseUp={() => keysRef.current["ArrowLeft"] = false} style={cBtn}>◀</button>
                <button onClick={shoot} style={{ ...cBtn, width: 50 }}>🔫</button>
                <button onMouseDown={() => keysRef.current["ArrowRight"] = true} onMouseUp={() => keysRef.current["ArrowRight"] = false} style={cBtn}>▶</button>
            </div>
        </div>
    );
};

const cBtn = { width: 44, height: 36, fontSize: "16px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", cursor: "pointer" };

export default Galaga;
