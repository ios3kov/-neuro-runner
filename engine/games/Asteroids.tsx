import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

interface Entity {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    active: boolean;
    type: 'ASTEROID' | 'BULLET' | 'PLAYER';
    vertices?: {x: number, y: number}[]; 
}

export const AsteroidsGame: React.FC = () => {
    const updateStats = useGameStore(s => s.updateStats);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [levelProgress, setLevelProgress] = useState(0);
    
    const generatePolygon = (radius: number, sides: number) => {
        const verts = [];
        for(let i=0; i<sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const r = radius * (0.8 + Math.random() * 0.4); 
            verts.push({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r
            });
        }
        return verts;
    };

    const state = useRef({
        entities: [{
            id: 0, x: 50, y: 50, vx: 0, vy: 0, 
            size: 2, rotation: 0, active: true, type: 'PLAYER'
        }] as Entity[],
        lastShot: 0,
        spawnTimer: 0,
        score: 0,
        level: 1,
        gameOver: false
    });

    const reset = (startLevel: number = 1) => {
        const lvl = startLevel || 1;
        state.current = {
            entities: [{
                id: 0, x: 50, y: 50, vx: 0, vy: 0, 
                size: 2, rotation: 0, active: true, type: 'PLAYER'
            }] as Entity[],
            lastShot: 0,
            spawnTimer: 0,
            score: (lvl - 1) * 500,
            level: lvl,
            gameOver: false
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
            setLevelProgress((loaded.score % 500) / 500);
        } catch(e) {}
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;
        if (s.gameOver) return;

        if (Math.floor(s.score / 500) > s.level - 1) {
            s.level++;
            setLevel(s.level);
            juice.levelUp(s.level, { score: s.score });
            haptics.notificationSuccess();
        }

        const player = s.entities.find(e => e.type === 'PLAYER');
        if (player) {
            if (input.keys.has('ArrowLeft')) player.rotation -= 5 * dt;
            if (input.keys.has('ArrowRight')) player.rotation += 5 * dt;

            if (input.keys.has('ArrowUp')) {
                player.vx += Math.cos(player.rotation) * 30 * dt;
                player.vy += Math.sin(player.rotation) * 30 * dt;
                if (Math.random() > 0.5) {
                     juice.emitParticles(player.x, player.y, '#0ff', 1);
                }
            }

            if (input.isTouching) {
                player.rotation += input.touchDeltaX * 0.08;
                if (Math.abs(input.touchDeltaX) > 0.1 || Math.abs(input.touchDeltaY) > 0.1) {
                    player.vx += Math.cos(player.rotation) * 20 * dt;
                    player.vy += Math.sin(player.rotation) * 20 * dt;
                    if (Math.random() > 0.3) juice.emitParticles(player.x, player.y, '#0ff', 1);
                }
            }

            player.vx *= 0.98;
            player.vy *= 0.98;

            s.lastShot += dt;
            if (input.keys.has('Space') || input.tapDetected || (input.isTouching && s.lastShot > 0.25)) {
                if (s.lastShot > 0.25) {
                    s.entities.push({
                        id: Math.random(),
                        x: player.x + Math.cos(player.rotation) * 3,
                        y: player.y + Math.sin(player.rotation) * 3,
                        vx: Math.cos(player.rotation) * 80,
                        vy: Math.sin(player.rotation) * 80,
                        size: 0.5,
                        rotation: player.rotation,
                        active: true,
                        type: 'BULLET'
                    });
                    s.lastShot = 0;
                    audio.playClick();
                    haptics.impactLight();
                    juice.addShake(1);
                }
            }
        }

        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            const side = Math.floor(Math.random() * 4);
            let startX = 0, startY = 0;
            if (side === 0) { startX = Math.random() * 100; startY = -5; }
            if (side === 1) { startX = 105; startY = Math.random() * 100; }
            if (side === 2) { startX = Math.random() * 100; startY = 105; }
            if (side === 3) { startX = -5; startY = Math.random() * 100; }

            const angle = Math.atan2(50 - startY, 50 - startX) + (Math.random() - 0.5);
            const speed = (10 + Math.random() * 20) * (1 + s.level * 0.1);

            s.entities.push({
                id: Math.random(),
                x: startX, y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 3,
                rotation: Math.random() * Math.PI * 2,
                active: true,
                type: 'ASTEROID',
                vertices: generatePolygon(4 + Math.random() * 3, 6)
            });
            s.spawnTimer = Math.max(0.5, 2 - (s.level * 0.1)); 
        }

        s.entities.forEach(e => {
            if (!e.active) return;
            e.x += e.vx * dt;
            e.y += e.vy * dt;

            if (e.x < -5) e.x = 105;
            if (e.x > 105) e.x = -5;
            if (e.y < -5) e.y = 105;
            if (e.y > 105) e.y = -5;

            if (e.type === 'BULLET') {
                if (e.x <= 0 || e.x >= 100 || e.y <= 0 || e.y >= 100) e.active = false;
            }
        });

        const bullets = s.entities.filter(e => e.type === 'BULLET' && e.active);
        const asteroids = s.entities.filter(e => e.type === 'ASTEROID' && e.active);
        
        if (player) {
            for (const ast of asteroids) {
                const dist = Math.hypot(player.x - ast.x, player.y - ast.y);
                if (dist < player.size + ast.size) {
                    s.gameOver = true;
                    setGameOver(true);
                    updateStats('ASTEROIDS', s.score, s.level);
                    audio.playError();
                    haptics.impactHeavy();
                    juice.addShake(15);
                    juice.addChromatic(10);
                    juice.emitParticles(player.x, player.y, '#f00', 30);
                    juice.triggerHitStop(100);
                }
            }
        }

        for (const bullet of bullets) {
            for (const ast of asteroids) {
                if (!bullet.active || !ast.active) continue;
                const dist = Math.hypot(bullet.x - ast.x, bullet.y - ast.y);
                if (dist < bullet.size + ast.size) {
                    bullet.active = false;
                    ast.active = false;
                    s.score += 10;
                    setScore(s.score);
                    
                    // Update Progress
                    setLevelProgress((s.score % 500) / 500);

                    audio.playExplosion();
                    haptics.impactMedium();
                    juice.addShake(3);
                    juice.emitParticles(ast.x, ast.y, '#f05', 10);
                    
                    if (ast.size > 2) {
                        for(let i=0; i<2; i++) {
                            const newSize = ast.size / 1.5;
                            s.entities.push({
                                id: Math.random(),
                                x: ast.x, y: ast.y,
                                vx: ast.vx + (Math.random() - 0.5) * 30,
                                vy: ast.vy + (Math.random() - 0.5) * 30,
                                size: newSize,
                                rotation: Math.random() * Math.PI,
                                active: true,
                                type: 'ASTEROID',
                                vertices: generatePolygon(newSize, 5)
                            });
                        }
                    }
                }
            }
        }

        s.entities = s.entities.filter(e => e.active);

    }, [updateStats]);

    // ... (Draw remains same) ...
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const w = (val: number) => (val / 100) * width;
        const h = (val: number) => (val / 100) * height;

        s.entities.forEach(e => {
            if (!e.active) return;
            
            ctx.save();
            ctx.translate(w(e.x), h(e.y));
            ctx.rotate(e.rotation);

            if (e.type === 'PLAYER') {
                ctx.strokeStyle = '#0ff';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#0ff';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(w(1.5), 0);
                ctx.lineTo(w(-1), w(1));
                ctx.lineTo(w(-0.5), 0);
                ctx.lineTo(w(-1), w(-1));
                ctx.closePath();
                ctx.stroke();
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(-1, -1, 2, 2);

            } else if (e.type === 'ASTEROID') {
                ctx.strokeStyle = '#f05';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#f05';
                ctx.shadowBlur = 5;
                
                if (e.vertices) {
                    ctx.beginPath();
                    const v0 = e.vertices[0];
                    ctx.moveTo(w(v0.x/3), w(v0.y/3)); 
                    for(let i=1; i<e.vertices.length; i++) {
                        ctx.lineTo(w(e.vertices[i].x/3), w(e.vertices[i].y/3));
                    }
                    ctx.closePath();
                    ctx.stroke();
                    
                    ctx.fillStyle = '#fff';
                    for(let i=0; i<e.vertices.length; i++) {
                         ctx.fillRect(w(e.vertices[i].x/3) - 1, w(e.vertices[i].y/3) - 1, 2, 2);
                    }
                }

            } else if (e.type === 'BULLET') {
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.fillRect(-w(1), -w(0.2), w(2), w(0.4));
            }

            ctx.restore();
        });
    }, []);

    const instructions = [
        "ROTATE SHIP: LEFT/RIGHT ARROWS OR TOUCH DRAG.",
        "THRUST: UP ARROW.",
        "FIRE: SPACE OR TAP.",
        "SURVIVE THE ASTEROID FIELD.",
        "LEVEL UP EVERY 500 POINTS."
    ];

    return <GameCore 
        gameId="ASTEROIDS"
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