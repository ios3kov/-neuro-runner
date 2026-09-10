import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';


interface Block {
    x: number;
    y: number;
    w: number;
    h: number;
    type: number;
    hp: number;
    active: boolean;
    hex: string;
}

interface BreakoutState {
    ball: { x: number; y: number; vx: number; vy: number };
    paddle: { x: number; w: number };
    blocks: Block[];
    score: number;
    level: number;
    lives: number;
    gameOver: boolean;
    totalBlocks: number;
    destroyedCount: number;
}

const isBreakoutState = (value: unknown): value is BreakoutState => {
    if (!value || typeof value !== 'object') return false;
    const state = value as Partial<BreakoutState>;
    return !!state.ball && !!state.paddle && Array.isArray(state.blocks)
        && typeof state.score === 'number' && typeof state.level === 'number'
        && typeof state.lives === 'number' && typeof state.gameOver === 'boolean'
        && typeof state.totalBlocks === 'number' && typeof state.destroyedCount === 'number';
};

export const BreakoutGame: React.FC = () => {
    const updateStats = useGameStore(s => s.updateStats);
    
    const createBlocks = (level: number): Block[] => {
        const blocks: Block[] = [];
        const rows = Math.min(8, 4 + Math.floor(level / 2));
        for(let r=0; r<rows; r++) {
            for(let c=0; c<8; c++) {
                const hex = "0x" + Math.floor(Math.random()*255).toString(16).toUpperCase();
                let type = 1;
                if (level > 1 && r < 2) type = 2;
                if (level > 3 && r === 2) type = 3; 
                
                blocks.push({
                    x: c * 12.5, y: r * 5 + 5, w: 11.5, h: 4, 
                    type: type, 
                    hp: type,
                    active: true,
                    hex: hex
                });
            }
        }
        return blocks;
    };

    const state = useRef<BreakoutState>({
        ball: { x: 50, y: 80, vx: 50, vy: -50 },
        paddle: { x: 40, w: 20 },
        blocks: createBlocks(1),
        score: 0,
        level: 1,
        lives: 3,
        gameOver: false,
        totalBlocks: 32,
        destroyedCount: 0
    });
    
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [levelProgress, setLevelProgress] = useState(0);

    const reset = (startLevel: number = 1) => {
        const lvl = startLevel || 1;
        const newBlocks = createBlocks(lvl);
        state.current = {
            ball: { x: 50, y: 80, vx: 50 + (lvl * 10), vy: -50 - (lvl * 10) },
            paddle: { x: 40, w: Math.max(10, 20 - lvl) },
            blocks: newBlocks,
            score: (lvl - 1) * 500,
            level: lvl,
            lives: 3,
            gameOver: false,
            totalBlocks: newBlocks.length,
            destroyedCount: 0
        };
        setScore(state.current.score);
        setLevel(lvl);
        setGameOver(false);
        setLevelProgress(0);
    };

    const nextLevel = (juice: GameCoreHandle) => {
        const s = state.current;
        s.level++;
        setLevel(s.level);
        juice.levelUp(s.level, { targetsDestroyed: s.destroyedCount });
        haptics.notificationSuccess();
        
        // Reset for next
        s.blocks = createBlocks(s.level);
        s.totalBlocks = s.blocks.length;
        s.destroyedCount = 0;
        s.ball = { x: 50, y: 80, vx: 50 + (s.level * 10), vy: -50 - (s.level * 10) };
        s.paddle.w = Math.max(10, 20 - s.level);
        setLevelProgress(0);
    };

    const saveState = () => {
        return JSON.stringify(state.current);
    };

    const loadState = (data: string) => {
        try {
            const loaded: unknown = JSON.parse(data);
            if (!isBreakoutState(loaded)) return;
            state.current = loaded;
            setScore(loaded.score);
            setLevel(loaded.level);
            setGameOver(loaded.gameOver);
            
            // Recalc progress
            const active = loaded.blocks.filter((b) => b.active).length;
            const progress = 1 - (active / loaded.totalBlocks);
            setLevelProgress(progress);
        } catch(e) {}
    };

    const destroyBlock = (index: number, juice: GameCoreHandle, s: BreakoutState) => {
        const block = s.blocks[index];
        if (!block.active) return;

        block.hp--;
        if (block.hp <= 0) {
            block.active = false;
            s.score += block.type * 10 * s.level;
            s.destroyedCount++;
            
            audio.playExplosion();
            haptics.impactMedium();
            const color = block.type === 3 ? '#f0f' : block.type === 2 ? '#ff0' : '#0f0';
            juice.emitParticles(block.x + block.w/2, block.y + block.h/2, color, 12);
            juice.addShake(block.type === 3 ? 5 : 2);
            
            // Update Progress
            const activeBlocks = s.blocks.filter((b) => b.active).length;
            const progress = 1 - (activeBlocks / s.totalBlocks);
            setLevelProgress(progress);

            if (block.type === 3) {
                juice.addChromatic(10);
                juice.triggerHitStop(50);
                s.blocks.forEach((other, i) => {
                    if (other.active && i !== index) {
                        const dx = Math.abs(other.x - block.x);
                        const dy = Math.abs(other.y - block.y);
                        if (dx < 14 && dy < 6) {
                            destroyBlock(i, juice, s);
                        }
                    }
                });
            }
        } else {
            audio.playClick();
            juice.addShake(1);
        }
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;
        if (s.gameOver) return;

        if (s.blocks.every((b) => !b.active)) {
            nextLevel(juice);
            return;
        }

        if (input.keys.has('ArrowLeft')) s.paddle.x -= 80 * dt;
        if (input.keys.has('ArrowRight')) s.paddle.x += 80 * dt;
        if (input.isTouching) {
            s.paddle.x += input.touchDeltaX * 1.5;
        }
        s.paddle.x = Math.max(0, Math.min(100 - s.paddle.w, s.paddle.x));

        s.ball.x += s.ball.vx * dt;
        s.ball.y += s.ball.vy * dt;

        if (s.ball.x <= 0 || s.ball.x >= 100) {
            s.ball.vx *= -1;
            juice.addShake(1);
        }
        if (s.ball.y <= 0) {
            s.ball.vy *= -1;
            juice.addShake(1);
        }

        if (s.ball.y >= 90 && s.ball.y <= 92 && s.ball.x >= s.paddle.x && s.ball.x <= s.paddle.x + s.paddle.w) {
            s.ball.vy = -Math.abs(s.ball.vy); 
            const hitPos = (s.ball.x - (s.paddle.x + s.paddle.w/2)) / (s.paddle.w/2);
            s.ball.vx = hitPos * 100 * (1 + s.level * 0.1);
            s.ball.y = 89.9;
            audio.playKeystroke();
            haptics.impactMedium();
            juice.addShake(2);
            juice.emitParticles(s.ball.x, s.ball.y, '#0ff', 5);
        }

        if (s.ball.y > 100) {
            s.lives--;
            if (s.lives <= 0) {
                s.gameOver = true;
                audio.playError();
                haptics.notificationError();
                juice.addShake(15);
                juice.addChromatic(15);
                juice.triggerHitStop(200);
                updateStats('BREAKOUT', s.score, s.level);
                setGameOver(true);
            } else {
                audio.playError();
                haptics.notificationWarning();
                s.ball = { x: 50, y: 80, vx: 50 + (s.level * 10), vy: -50 - (s.level * 10) };
                juice.addChromatic(5);
            }
        }

        s.blocks.forEach((b, i) => {
            if (!b.active) return;
            if (s.ball.x > b.x && s.ball.x < b.x + b.w && 
                s.ball.y > b.y && s.ball.y < b.y + b.h) {
                    s.ball.vy *= -1; 
                    destroyBlock(i, juice, s);
                    setScore(s.score);
            }
        });

    }, [updateStats]);

    // ... (Draw function remains same) ...
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const w = (val: number) => (val / 100) * width;
        const h = (val: number) => (val / 100) * height;

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#0ff';
        ctx.fillStyle = '#0ff';
        ctx.fillRect(w(s.paddle.x), h(90), w(s.paddle.w), h(2));
        ctx.fillStyle = '#000';
        ctx.fillRect(w(s.paddle.x + 2), h(90.5), w(s.paddle.w - 4), h(1));
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(w(s.ball.x), h(s.ball.y), w(1.5), 0, Math.PI*2);
        ctx.fill();

        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        
        s.blocks.forEach((b) => {
            if (!b.active) return;
            const color = b.type === 3 ? '#f0f' : b.type === 2 ? '#ff0' : '#0f0';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillStyle = color;
            ctx.strokeRect(w(b.x), h(b.y), w(b.w), h(b.h));
            ctx.globalAlpha = 0.2;
            ctx.fillRect(w(b.x), h(b.y), w(b.w), h(b.h));
            ctx.globalAlpha = 1.0;
            if (width > 400) { 
                ctx.fillStyle = color;
                ctx.fillText(b.hex, w(b.x + b.w/2), h(b.y + b.h/2 + 2));
            }
        });
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`LIVES: ${s.lives}`, w(2), h(98));
        ctx.textAlign = 'right';
        ctx.fillText(`TARGETS: ${s.totalBlocks - s.destroyedCount}`, width - w(2), h(98));

    }, []);

    const instructions = [
        "DESTROY ALL DATA BLOCKS TO ADVANCE.",
        "GREEN: SOFT DATA. YELLOW: REINFORCED. PURPLE: EXPLOSIVE.",
        "DON'T LET THE BALL DROP.",
        "LEVEL UP = FASTER BALL + MORE BLOCKS."
    ];

    return <GameCore 
        gameId="BREAKOUT"
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