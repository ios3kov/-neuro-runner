/**
 * 🎮 Game 116: 동키콩
 * 사다리와 점프로 꼭대기 도달!
 */
import { useState, useEffect, useRef, useCallback } from "react";

const CANVAS_W = 320;
const CANVAS_H = 440;
const PLAT_H = 10;
const PLAYER_W = 20;
const PLAYER_H = 24;

const PLATFORMS = [
    { x: 0, y: 420, w: 320 },
    { x: 40, y: 350, w: 240 },
    { x: 20, y: 280, w: 260 },
    { x: 40, y: 210, w: 240 },
    { x: 20, y: 140, w: 260 },
    { x: 60, y: 70, w: 200 },
];

const LADDERS = [
    { x: 250, y: 350, h: 70 },
    { x: 60, y: 280, h: 70 },
    { x: 220, y: 210, h: 70 },
    { x: 80, y: 140, h: 70 },
    { x: 180, y: 70, h: 70 },
];

const DonkeyKong = ({ onComplete }) => {
    const canvasRef = useRef(null);
    const stateRef = useRef({ px: 160, py: 396, vx: 0, vy: 0, onGround: true, climbing: false, barrels: [], score: 0, lives: 3, gameOver: false, won: false, frameCount: 0 });
    const keysRef = useRef({});
    const animRef = useRef(null);
    const [display, setDisplay] = useState({ score: 0, lives: 3 });

    useEffect(() => {
        const handle = (e) => { keysRef.current[e.key] = e.type === "keydown"; };
        window.addEventListener("keydown", handle);
        window.addEventListener("keyup", handle);
        return () => { window.removeEventListener("keydown", handle); window.removeEventListener("keyup", handle); };
    }, []);

    const spawnBarrel = useCallback(() => ({ x: 100 + Math.random() * 120, y: 60, vx: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random()), vy: 0, onPlatform: false, active: true }), []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const loop = () => {
            const s = stateRef.current;
            const keys = keysRef.current;
            if (s.gameOver) return;
            s.frameCount++;
            if (s.frameCount % 90 === 0) s.barrels.push(spawnBarrel());
            if (!s.climbing) {
                if (keys["ArrowLeft"]) s.px -= 3;
                if (keys["ArrowRight"]) s.px += 3;
                if ((keys["ArrowUp"] || keys[" "]) && s.onGround) { s.vy = -8; s.onGround = false; }
                s.vy += 0.4; s.py += s.vy;
            }
            const onLadder = LADDERS.find(l => Math.abs(s.px - l.x) < 15 && s.py >= l.y - l.h && s.py <= l.y + 10);
            if (onLadder && keys["ArrowUp"]) { s.climbing = true; s.py -= 3; s.vy = 0; }
            if (onLadder && keys["ArrowDown"] && s.climbing) { s.py += 3; }
            if (s.climbing && !onLadder) { s.climbing = false; }
            s.onGround = false;
            for (const p of PLATFORMS) {
                if (s.py + PLAYER_H >= p.y && s.py + PLAYER_H <= p.y + PLAT_H + 4 && s.px + PLAYER_W / 2 > p.x && s.px - PLAYER_W / 2 < p.x + p.w && s.vy >= 0) {
                    s.py = p.y - PLAYER_H; s.vy = 0; s.onGround = true;
                }
            }
            s.px = Math.max(10, Math.min(CANVAS_W - 10, s.px));
            if (s.py > CANVAS_H) { s.py = 396; s.lives--; }
            for (const b of s.barrels) {
                if (!b.active) continue;
                b.vy += 0.3; b.x += b.vx; b.y += b.vy;
                for (const p of PLATFORMS) {
                    if (b.y + 12 >= p.y && b.y + 12 <= p.y + PLAT_H + 4 && b.x > p.x && b.x < p.x + p.w && b.vy >= 0) { b.y = p.y - 12; b.vy = 0; b.onPlatform = true; }
                }
                if (b.x < 0 || b.x > CANVAS_W || b.y > CANVAS_H) b.active = false;
                if (Math.abs(b.x - s.px) < 18 && Math.abs(b.y - s.py) < 20) { s.lives--; b.active = false; s.px = 160; s.py = 396; }
            }
            s.barrels = s.barrels.filter(b => b.active);
            if (s.py < 80) { s.won = true; s.gameOver = true; s.score += 500; setDisplay({ score: s.score, lives: s.lives }); setTimeout(() => onComplete(Math.min(100, 60 + s.lives * 10)), 500); return; }
            if (s.lives <= 0) { s.gameOver = true; setDisplay({ score: s.score, lives: 0 }); setTimeout(() => onComplete(Math.max(20, Math.min(100, s.score / 10))), 500); return; }
            s.score = Math.floor(s.frameCount / 10); setDisplay({ score: s.score, lives: s.lives });
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.fillStyle = "#8B4513"; for (const p of PLATFORMS) ctx.fillRect(p.x, p.y, p.w, PLAT_H);
            ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 3;
            for (const l of LADDERS) {
                ctx.beginPath(); ctx.moveTo(l.x - 8, l.y); ctx.lineTo(l.x - 8, l.y - l.h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(l.x + 8, l.y); ctx.lineTo(l.x + 8, l.y - l.h); ctx.stroke();
                for (let ry = l.y; ry > l.y - l.h; ry -= 12) { ctx.beginPath(); ctx.moveTo(l.x - 8, ry); ctx.lineTo(l.x + 8, ry); ctx.stroke(); }
            }
            ctx.fillStyle = "#FF6B6B";
            for (const b of s.barrels) { ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#000"; ctx.fillText("B", b.x - 4, b.y + 4); ctx.fillStyle = "#FF6B6B"; }
            ctx.fillStyle = "#4D96FF"; ctx.fillRect(s.px - PLAYER_W / 2, s.py, PLAYER_W, PLAYER_H); ctx.fillStyle = "#FFD93D"; ctx.beginPath(); ctx.arc(s.px, s.py - 4, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#64ffda"; ctx.font = "20px sans-serif"; ctx.fillText("🏆", 145, 60);
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animRef.current);
    }, [onComplete, spawnBarrel]);

    return <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "white" }}><div style={{ display: "flex", gap: "16px", fontSize: "13px" }}><span>점수: <span style={{ color: "#FFD700" }}>{display.score}</span></span><span>생명: <span style={{ color: "#FF6B6B" }}>{"❤️".repeat(display.lives)}</span></span></div><canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ borderRadius: "10px", border: "2px solid rgba(255,255,255,0.1)" }} /><div style={{ fontSize: "11px", color: "#8892b0" }}>←→ 이동 | ↑ 사다리/점프 | 꼭대기 도달!</div></div>;
};

export default DonkeyKong;
