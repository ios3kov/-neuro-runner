import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { LogLevel } from '../../types';

type EnemyType = 'NORMAL' | 'FAST' | 'CORRUPTED';

interface Enemy {
    id: number;
    type: EnemyType;
    dist: number;
    angle: number;
    speed: number;
    rotation: number;
    active: boolean;
}

interface LevelConfig {
    spawnInterval: number;
    enemySpeed: number;
    maxEnemies: number;
    fastChance: number;
    corruptChance: number;
    shieldArcWidth: number;
    shieldTurnSpeed: number;
    coreDamage: number;
    scorePerBlock: number;
}

const CONFIG_TABLE: LevelConfig[] = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return {
        spawnInterval: 1600 - (t * 1200),
        enemySpeed: 18 + (t * 22),
        maxEnemies: 6 + Math.floor(t * 14),
        fastChance: i < 5 ? 0 : 0.1 + (t * 0.3),
        corruptChance: i < 12 ? 0 : 0.05 + (t * 0.2),
        shieldArcWidth: 1.0 - (t * 0.4),
        shieldTurnSpeed: 3.5 + (t * 1.5),
        coreDamage: 20,
        scorePerBlock: 10 + Math.floor(t * 10)
    };
});

export const DefenderGame: React.FC = () => {
    const addLog = useStore((s) => s.addLog);
    const updateStats = useGameStore(s => s.updateStats);
    
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [hp, setHp] = useState(100);
    const [gameOver, setGameOver] = useState(false);

    const state = useRef({
        shieldAngle: 0,
        enemies: [] as Enemy[],
        spawnTimer: 0,
        score: 0,
        level: 1,
        hp: 100,
        time: 0, // Time survived in seconds (approx)
        levelDuration: 0,
        gameOver: false
    });

    const reset = (startLevel: number = 1) => {
        const s = state.current;
        s.shieldAngle = 0;
        s.enemies = [];
        s.spawnTimer = 1.0;
        s.score = (startLevel - 1) * 200;
        s.level = startLevel;
        s.hp = 100;
        s.time = 0;
        s.levelDuration = 20 + (startLevel * 5); // Match store config
        s.gameOver = false;
        
        setScore(s.score);
        setLevel(s.level);
        setHp(100);
        setGameOver(false);
        addLog(LogLevel.SYS, `DEFENDER_INIT: LVL_${startLevel}`);
    };

    const spawn = (cfg: LevelConfig) => {
        const s = state.current;
        if (s.enemies.length >= cfg.maxEnemies) return;

        const roll = Math.random();
        let type: EnemyType = 'NORMAL';
        if (roll < cfg.corruptChance) type = 'CORRUPTED';
        else if (roll < cfg.corruptChance + cfg.fastChance) type = 'FAST';

        s.enemies.push({
            id: Math.random(),
            type,
            dist: 100,
            angle: Math.random() * Math.PI * 2,
            speed: cfg.enemySpeed * (type === 'FAST' ? 1.5 : type === 'CORRUPTED' ? 1.2 : 1),
            rotation: 0,
            active: true
        });
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;
        if (s.gameOver) return;

        s.time += dt;
        const cfg = CONFIG_TABLE[Math.min(24, s.level - 1)];

        if (input.isTouching) {
            s.shieldAngle += (input.touchDeltaX * 0.01) * (cfg.shieldTurnSpeed / 2);
        }

        if (input.keys.has('ArrowLeft')) s.shieldAngle -= cfg.shieldTurnSpeed * dt;
        if (input.keys.has('ArrowRight')) s.shieldAngle += cfg.shieldTurnSpeed * dt;

        s.shieldAngle = (s.shieldAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

        s.spawnTimer -= dt * 1000;
        if (s.spawnTimer <= 0) {
            spawn(cfg);
            s.spawnTimer = cfg.spawnInterval;
        }

        // Level Up Check by Time
        if (s.time >= s.levelDuration) {
             // Logic: Do not auto-advance level number internally for gameplay if we are finishing the stage
             // Just trigger the "Level Complete" state via juice handle
             juice.levelUp(s.level + 1, { timeSurvived: s.time, score: s.score });
             haptics.notificationSuccess();
             // Reset time to prevent multiple triggers
             s.time = -999; 
        }

        s.enemies.forEach(e => {
            if (!e.active) return;
            e.dist -= e.speed * dt;
            e.rotation += dt * 5;

            if (e.dist < 32 && e.dist > 28) {
                let diff = e.angle - s.shieldAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) < cfg.shieldArcWidth / 2) {
                    e.active = false;
                    s.score += cfg.scorePerBlock;
                    setScore(s.score);
                    audio.playSuccess();
                    haptics.impactMedium();
                    juice.emitParticles(50 + Math.cos(e.angle)*25, 50 + Math.sin(e.angle)*25, '#0ff', 10);
                }
            }

            if (e.dist <= 5) {
                e.active = false;
                s.hp -= cfg.coreDamage;
                setHp(s.hp);
                audio.playError();
                haptics.impactHeavy();
                juice.triggerHitStop(100);
                juice.emitParticles(50, 50, '#f00', 20);

                if (s.hp <= 0) {
                    s.gameOver = true;
                    setGameOver(true);
                    haptics.notificationError();
                    updateStats('DEFENDER', s.score, s.level);
                }
            }
        });

        s.enemies = s.enemies.filter(e => e.active);
    }, [updateStats]);

    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const cfg = CONFIG_TABLE[Math.min(24, s.level - 1)];
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.4;

        // Core
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = s.hp < 30 ? '#f00' : '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + Math.sin(s.time * 5) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Shield
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(s.shieldAngle);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, -cfg.shieldArcWidth/2, cfg.shieldArcWidth/2);
        ctx.stroke();
        ctx.restore();

        // Enemies
        s.enemies.forEach(e => {
            const eDist = radius * (e.dist / 100);
            const ex = cx + Math.cos(e.angle) * eDist;
            const ey = cy + Math.sin(e.angle) * eDist;
            
            ctx.save();
            ctx.translate(ex, ey);
            ctx.rotate(e.rotation);
            ctx.strokeStyle = e.type === 'CORRUPTED' ? '#ff0' : '#0ff';
            ctx.strokeRect(-8, -8, 16, 16);
            ctx.restore();
        });
        
        // Time Indicator
        const timeLeft = Math.max(0, s.levelDuration - s.time);
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SURVIVE: ${timeLeft.toFixed(1)}s`, cx, height - 20);

    }, []);

    return <GameCore 
        gameId="DEFENDER"
        update={update} 
        draw={draw} 
        onReset={reset} 
        isGameOver={gameOver} 
        score={score}
        level={level}
        progress={Math.min(1, state.current.time / state.current.levelDuration)}
        instructions={[
            "ROTATE SHIELD WITH TOUCH OR ARROWS.",
            "BLOCK INCOMING DATA PACKETS.",
            "SURVIVE UNTIL TIMER EXPIRES."
        ]}
    />;
};