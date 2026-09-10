/**
 * 🎮 Game 119: 아스테로이드
 * 우주선으로 소행성을 파괴하세요
 */
import { useState, useEffect, useRef } from "react";

const W = 320, H = 420;

const Asteroids = ({ onComplete }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        ship: { x: W / 2, y: H / 2, angle: 0, vx: 0, vy: 0 },
        bullets: [], asteroids: [], score: 0, lives: 3,
        gameOver: false, frame: 0,
    });
    const keysRef = useRef({});
    const [display, setDisplay] = useState({ score: 0, lives: 3 });

    useEffect(() => {
        // Spawn initial asteroids
        const s = stateRef.current;
        for (let i = 0; i < 5; i++) {
            s.asteroids.push({
                x: Math.random() * W, y: Math.random() * H * 0.3,
                vx: (Math.random() - 0.5) * 2, vy: 0.5 + Math.random() * 1.5,
                size: 20 + Math.random() * 15, hp: 1,
            });
        }
    }, []);

    useEffect(() => {
        const handle = (e) => {
            keysRef.current[e.key] = e.type === "keydown";
            if (e.key === " " && e.type === "keydown") {
                const s = stateRef.current;
                if (!s.gameOver) {
                    const angle = s.ship.angle;
                    s.bullets.push({
                        x: s.ship.x, y: s.ship.y,
                        vx: Math.sin(angle) * 6, vy: -Math.cos(angle) * 6,
                        life: 40,
                    });
                }
            }
        };
        window.addEventListener("keydown", handle);
        window.addEventListener("keyup", handle);
        return () => { window.removeEventListener("keydown", handle); window.removeEventListener("keyup", handle); };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const loop = () => {
            const s = stateRef.current;
            const keys = keysRef.current;
            if (s.gameOver) return;
            s.frame++;

            // Ship controls
            if (keys["ArrowLeft"]) s.ship.angle -= 0.08;
            if (keys["ArrowRight"]) s.ship.angle += 0.08;
            if (keys["ArrowUp"]) {
                s.ship.vx += Math.sin(s.ship.angle) * 0.15;
                s.ship.vy -= Math.cos(s.ship.angle) * 0.15;
            }
            s.ship.vx *= 0.98; s.ship.vy *= 0.98;
            s.ship.x = (s.ship.x + s.ship.vx + W) % W;
            s.ship.y = (s.ship.y + s.ship.vy + H) % H;

            // Bullets
            s.bullets = s.bullets.filter(b => {
                b.x += b.vx; b.y += b.vy; b.life--;
                return b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H;
            });

            // Asteroids
            if (s.frame % 60 === 0 && s.asteroids.length < 8) {
                s.asteroids.push({
                    x: Math.random() * W, y: -20,
                    vx: (Math.random() - 0.5) * 2, vy: 0.5 + Math.random(),
                    size: 18 + Math.random() * 15, hp: 1,
                });
            }

            s.asteroids.forEach(a => {
                a.x = (a.x + a.vx + W) % W;
                a.y += a.vy;
                if (a.y > H + 30) { a.y = -20; a.x = Math.random() * W; }
            });

            // Bullet-asteroid collision
            s.bullets.forEach(b => {
                s.asteroids.forEach(a => {
                    if (a.hp > 0) {
                        const dx = b.x - a.x, dy = b.y - a.y;
                        if (Math.sqrt(dx * dx + dy * dy) < a.size) {
                            a.hp = 0; b.life = 0;
                            s.score += 10;
                        }
                    }
                });
            });
            s.asteroids = s.asteroids.filter(a => a.hp > 0);

            // Ship-asteroid collision
            for (const a of s.asteroids) {
                const dx = s.ship.x - a.x, dy = s.ship.y - a.y;
                if (Math.sqrt(dx * dx + dy * dy) < a.size + 8) {
                    s.lives--;
                    s.ship.x = W / 2; s.ship.y = H / 2; s.ship.vx = 0; s.ship.vy = 0;
                    a.hp = 0;
                    if (s.lives <= 0) {
                        s.gameOver = true;
                        setDisplay({ score: s.score, lives: 0 });
                        setTimeout(() => onComplete(Math.min(100, Math.max(20, s.score))), 500);
                        return;
                    }
                    break;
                }
            }
            s.asteroids = s.asteroids.filter(a => a.hp > 0);

            if (s.score >= 100) {
                s.gameOver = true;
                setDisplay({ score: s.score, lives: s.lives });
                setTimeout(() => onComplete(Math.min(100, 60 + s.lives * 12)), 500);
                return;
            }

            setDisplay({ score: s.score, lives: s.lives });

            // Draw
            ctx.fillStyle = "#050510";
            ctx.fillRect(0, 0, W, H);

            // Stars
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            for (let i = 0; i < 30; i++) {
                const sx = (i * 97 + s.frame * 0.1) % W;
                const sy = (i * 53 + s.frame * 0.05) % H;
                ctx.fillRect(sx, sy, 1, 1);
            }

            // Ship
            ctx.save();
            ctx.translate(s.ship.x, s.ship.y);
            ctx.rotate(s.ship.angle);
            ctx.fillStyle = "#4D96FF";
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(-8, 10);
            ctx.lineTo(8, 10);
            ctx.closePath();
            ctx.fill();
            if (keys["ArrowUp"]) {
                ctx.fillStyle = "#FFD93D";
                ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(0, 18); ctx.lineTo(4, 10); ctx.fill();
            }
            ctx.restore();

            // Bullets
            ctx.fillStyle = "#FFD93D";
            s.bullets.forEach(b => { ctx.fillRect(b.x - 1, b.y - 3, 2, 6); });

            // Asteroids
            s.asteroids.forEach(a => {
                ctx.fillStyle = "#8B7355";
                ctx.beginPath(); ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#666";
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            animRef.current = requestAnimationFrame(loop);
        };
        const animRef = { current: requestAnimationFrame(loop) };
        return () => cancelAnimationFrame(animRef.current);
    }, [onComplete]);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "white" }}>
            <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                <span>점수: <span style={{ color: "#FFD700" }}>{display.score}/100</span></span>
                <span>생명: <span style={{ color: "#FF6B6B" }}>{"❤️".repeat(display.lives)}</span></span>
            </div>
            <canvas ref={canvasRef} width={W} height={H}
                style={{ borderRadius: "10px", border: "2px solid rgba(255,255,255,0.1)" }} />
            <div style={{ fontSize: "11px", color: "#8892b0" }}>←→ 회전 | ↑ 가속 | Space 발사</div>
        </div>
    );
};

export default Asteroids;
