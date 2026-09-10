import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

interface Trail {
    x: number;
    y: number;
    alpha: number;
}

export const PongGame: React.FC = () => {
    const updateStats = useGameStore(s => s.updateStats);
    const state = useRef({
        ball: { x: 50, y: 50, vx: 50, vy: 100, size: 2 },
        p1: { x: 42.5, w: 15, score: 0 }, // Player (Bottom)
        p2: { x: 42.5, w: 15, score: 0 }, // AI (Top)
        score: 0,
        level: 1,
        gameOver: false,
        trails: [] as Trail[]
    });
    
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [levelProgress, setLevelProgress] = useState(0);

    const reset = (startLevel: number = 1) => {
        const lvl = startLevel || 1;
        state.current = {
            ball: { 
                x: 50, 
                y: 50, 
                vx: (Math.random() - 0.5) * 120, 
                vy: (100 + lvl * 10) * (Math.random() > 0.5 ? 1 : -1), 
                size: 2 
            },
            p1: { x: 42.5, w: 15, score: 0 },
            p2: { x: 42.5, w: 15, score: 0 },
            score: (lvl - 1) * 300,
            level: lvl,
            gameOver: false,
            trails: []
        };
        setScore(state.current.score);
        setLevel(lvl);
        setGameOver(false);
        setLevelProgress(0);
    };

    const saveState = () => JSON.stringify(state.current);
    const loadState = (data: string) => {
        try {
            const loaded = JSON.parse(data);
            state.current = loaded;
            setScore(loaded.score);
            setLevel(loaded.level);
            setGameOver(loaded.gameOver);
            setLevelProgress(loaded.p1.score / 3);
        } catch(e) {}
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;
        if (s.gameOver) return;

        // Player movement (Horizontal for vertical Pong)
        if (input.keys.has('ArrowLeft') || input.swipeDirection === 'LEFT') s.p1.x -= 90 * dt;
        if (input.keys.has('ArrowRight') || input.swipeDirection === 'RIGHT') s.p1.x += 90 * dt;
        if (input.isTouching) {
            s.p1.x += input.touchDeltaX * 1.5;
        }
        s.p1.x = Math.max(0, Math.min(100 - s.p1.w, s.p1.x));

        // AI movement
        const targetX = s.ball.x - s.p2.w / 2;
        const aiSpeed = 2.5 + (s.level * 1.8);
        s.p2.x += (targetX - s.p2.x) * aiSpeed * dt;
        s.p2.x = Math.max(0, Math.min(100 - s.p2.w, s.p2.x));

        s.ball.x += s.ball.vx * dt;
        s.ball.y += s.ball.vy * dt;

        s.trails.push({x: s.ball.x, y: s.ball.y, alpha: 0.6});
        if (s.trails.length > 12) s.trails.shift();
        s.trails.forEach(t => t.alpha -= dt * 2.5);

        // Side wall bounce
        if (s.ball.x <= 0 || s.ball.x >= 100) {
            s.ball.vx *= -1;
            s.ball.x = s.ball.x <= 0 ? 0.1 : 99.9;
            audio.playClick();
            juice.addShake(2);
        }

        // Paddle Collision - Bottom (P1)
        if (s.ball.y > 94 && s.ball.y < 97 && s.ball.x > s.p1.x && s.ball.x < s.p1.x + s.p1.w) {
            s.ball.vy = -Math.abs(s.ball.vy) * 1.05; 
            const hitOffset = (s.ball.x - (s.p1.x + s.p1.w/2)) / (s.p1.w/2);
            s.ball.vx += hitOffset * 60; 
            s.ball.y = 93.9;
            audio.playHover();
            haptics.impactMedium();
            juice.addShake(4);
            juice.emitParticles(s.ball.x, s.ball.y, '#0ff', 10);
        }

        // Paddle Collision - Top (P2)
        if (s.ball.y < 6 && s.ball.y > 3 && s.ball.x > s.p2.x && s.ball.x < s.p2.x + s.p2.w) {
            s.ball.vy = Math.abs(s.ball.vy) * 1.05;
            const hitOffset = (s.ball.x - (s.p2.x + s.p2.w/2)) / (s.p2.w/2);
            s.ball.vx += hitOffset * 60;
            s.ball.y = 6.1;
            audio.playHover();
            juice.addShake(4);
            juice.emitParticles(s.ball.x, s.ball.y, '#f05', 10);
        }

        const resetBall = () => {
             s.ball.x = 50;
             s.ball.y = 50;
             s.ball.vx = (Math.random() - 0.5) * 120;
             s.ball.vy = (100 + s.level * 10) * (Math.random() > 0.5 ? 1 : -1);
             s.trails = [];
        };

        // Scoring - Top boundary (AI missed)
        if (s.ball.y < 0) {
            s.p1.score++;
            s.score += 100 * s.level;
            setScore(s.score);
            audio.playSuccess();
            haptics.notificationSuccess();
            juice.addShake(5);
            resetBall();
            
            setLevelProgress(s.p1.score / 3);

            if (s.p1.score >= 3) {
                s.level++;
                setLevel(s.level);
                juice.levelUp(s.level, { score: s.score });
                s.p1.score = 0;
                s.p2.score = 0;
                setLevelProgress(0);
            }
        }
        
        // Scoring - Bottom boundary (Player missed)
        if (s.ball.y > 100) {
            s.p2.score++;
            audio.playError();
            haptics.notificationWarning();
            juice.addShake(15);
            resetBall();
            if (s.p2.score >= 3) {
                s.gameOver = true;
                haptics.notificationError();
                updateStats('PONG', s.score, s.level);
                setGameOver(true);
            }
        }

    }, [updateStats]);

    // ... (Draw remains same) ...
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const w = (val: number) => (val / 100) * width;
        const h = (val: number) => (val / 100) * height;

        // Middle Divider
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height/2);
        ctx.lineTo(width, height/2);
        ctx.stroke();

        const drawPaddle = (xPct: number, yPct: number, wPct: number, color: string) => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillRect(w(xPct), h(yPct), w(wPct), h(1.5));
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(w(xPct) + 5, h(yPct) + h(0.5), w(wPct) - 10, h(0.3));
            ctx.globalAlpha = 1.0;
        };

        drawPaddle(s.p1.x, 95, s.p1.w, '#0ff'); // Player (Bottom)
        drawPaddle(s.p2.x, 3.5, s.p2.w, '#f05'); // AI (Top)
        ctx.shadowBlur = 0;

        s.trails.forEach(t => {
            ctx.fillStyle = `rgba(0, 240, 255, ${t.alpha * 0.4})`;
            ctx.fillRect(w(t.x) - w(0.75), h(t.y) - w(0.75), w(1.5), w(1.5));
        });

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(w(s.ball.x), h(s.ball.y), w(1.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = 'bold 24px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillText(s.p1.score.toString(), width*0.15, height*0.75); // Player score at bottom quadrant
        ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
        ctx.fillText(s.p2.score.toString(), width*0.15, height*0.25); // AI score at top quadrant

    }, []);

    const instructions = [
        "DEFLECT THE PACKET PAST THE OPPONENT'S FIREWALL.",
        "SECURE 3 SCORES TO UPGRADE THREAT LEVEL.",
        "AI CAPABILITIES EVOLVE WITH EACH LEVEL.",
        "USE ARROWS OR HORIZONTAL TOUCH DRAG."
    ];

    return <GameCore 
        gameId="PONG"
        update={update} 
        draw={draw} 
        onReset={reset} 
        isGameOver={gameOver} 
        score={score}
        level={level}
        progress={levelProgress}
        instructions={instructions}
        onSave={saveState}
        onLoad={loadState}
    />;
};