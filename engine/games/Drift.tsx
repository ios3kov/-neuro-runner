import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

interface Gate {
    y: number;
    x: number;
    width: number;
    passed: boolean;
}

export const DriftGame: React.FC = () => {
    const updateStats = useGameStore(s => s.updateStats);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [levelProgress, setLevelProgress] = useState(0);
    
    const state = useRef({
        playerX: 50,
        speed: 40,
        gates: [] as Gate[],
        gateTimer: 0,
        combo: 0,
        score: 0,
        level: 1,
        gameOver: false,
        distance: 0
    });

    const reset = () => {
        state.current = {
            playerX: 50,
            speed: 40,
            gates: [],
            gateTimer: 0,
            combo: 0,
            score: 0,
            level: 1,
            gameOver: false,
            distance: 0
        };
        setScore(0);
        setLevel(1);
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
            setLevelProgress((loaded.speed % 20) / 20);
        } catch(e) {}
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;
        if (s.gameOver) return;
        s.distance += s.speed * dt;

        // Level Up based on Speed
        const newLevel = 1 + Math.floor(s.speed / 20);
        if (newLevel > s.level) {
            s.level = newLevel;
            setLevel(s.level);
            juice.levelUp(s.level, { score: s.score });
            haptics.notificationSuccess();
        }
        
        // Update Progress based on speed threshold
        setLevelProgress((s.speed % 20) / 20);

        // Player Move
        if (input.keys.has('ArrowLeft')) s.playerX -= 60 * dt;
        if (input.keys.has('ArrowRight')) s.playerX += 60 * dt;
        if (input.isTouching) {
            // Relative move based on touch delta
            s.playerX += input.touchDeltaX * 1.5;
        }
        s.playerX = Math.max(0, Math.min(100, s.playerX));

        s.speed += dt * 0.5; // Acceleration

        s.gateTimer -= dt;
        if (s.gateTimer <= 0) {
            const gapWidth = Math.max(15, 30 - s.speed / 5);
            const gapCenter = 10 + Math.random() * 80;
            s.gates.push({
                y: -10,
                x: gapCenter,
                width: gapWidth,
                passed: false
            });
            s.gateTimer = 3000 / (s.speed * 1.5); 
        }

        s.gates.forEach(g => {
            g.y += s.speed * dt;
        });

        const playerY = 85;

        for (const g of s.gates) {
            if (g.y > playerY - 2 && g.y < playerY + 2 && !g.passed) {
                const gapLeft = g.x - g.width / 2;
                const gapRight = g.x + g.width / 2;

                if (s.playerX < gapLeft || s.playerX > gapRight) {
                    s.gameOver = true;
                    setGameOver(true);
                    updateStats('DRIFT', s.score, s.level);
                    audio.playError();
                    haptics.impactHeavy();
                    juice.addShake(15);
                    juice.addChromatic(15);
                    juice.emitParticles(s.playerX, 85, '#0ff', 20);
                } else {
                    g.passed = true;
                    s.combo++;
                    s.score += Math.floor(s.speed / 10) * s.combo;
                    setScore(s.score);
                    audio.playHover();
                    haptics.impactLight();
                }
            }
        }
        s.gates = s.gates.filter(g => g.y < 110);

    }, [updateStats]);

    // ... (Draw remains same) ...
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const w = (val: number) => (val / 100) * width;
        const h = (val: number) => (val / 100) * height;

        // Floor Grid Effect
        ctx.strokeStyle = '#004455';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=100; i+=10) {
            const x = w(i);
            const centerX = width/2;
            ctx.moveTo(centerX + (x - centerX) * 0.1, 0); 
            ctx.lineTo(x, height);
        }
        ctx.stroke();
        
        const offset = (s.distance % 20) / 20;
        for(let i=0; i<10; i++) {
            const yPct = (i + offset) * 10;
            const yScreen = h(yPct * yPct / 100 + 20); 
            if(yScreen < height) {
                ctx.beginPath();
                ctx.moveTo(0, yScreen);
                ctx.lineTo(width, yScreen);
                ctx.stroke();
            }
        }

        s.gates.forEach(g => {
            const yScreen = h(g.y);
            const gapLeft = w(g.x - g.width/2);
            const gapRight = w(g.x + g.width/2);

            ctx.fillStyle = g.passed ? '#0f0' : '#f05';
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            
            ctx.fillRect(0, yScreen, gapLeft, h(2));
            ctx.fillRect(gapRight, yScreen, width - gapRight, h(2));
        });
        ctx.shadowBlur = 0;

        const px = w(s.playerX);
        const py = h(85);
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0ff';
        ctx.fillStyle = '#0ff';
        
        ctx.beginPath();
        ctx.moveTo(px, py - h(2));
        ctx.lineTo(px - w(2), py + h(2));
        ctx.lineTo(px + w(2), py + h(2));
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(px - w(0.5), py, w(1), h(2));
        ctx.shadowBlur = 0;

    }, []);

    const instructions = [
        "NAVIGATE THROUGH THE NEON GATES.",
        "AVOID WALL IMPACTS.",
        "SPEED INCREASES OVER TIME.",
        "MAINTAIN COMBO FOR HIGH SCORES."
    ];

    return <GameCore 
        gameId="DRIFT"
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