import React, { useCallback, useRef, useState, useMemo } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { useGameStore } from '../../gameStore';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { LogLevel } from '../../types';

// ... (Configuration Constants same as before) ...
const GRID_W = 24;
const GRID_H = 24;

type Point = { x: number, y: number };
type FoodType = 'DATA' | 'VIRUS' | 'ZIP' | 'KEY' | 'LOCKED_DATA';
type VirusEffect = 'NONE' | 'INPUT_HIJACK' | 'VIDEO_DRIVER_FAIL';

interface Gate {
    x: number;
    y: number;
    active: boolean; // true = RED (Deadly), false = GREY (Safe)
}

interface Tunnel {
    id: number;
    x: number;
    y: number;
    linkId: number;
    cooldown: number; // prevent immediate bounce back
}

interface Zone {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'OVERCLOCK';
}

interface SnakeState {
    snake: Point[];
    dir: Point;
    nextDir: Point;
    food: Point & { type: FoodType };
    keyItem: Point | null;
    walls: Point[];
    gates: Gate[];
    tunnels: Tunnel[];
    zones: Zone[];
    timer: number;
    speed: number;
    baseSpeed: number;
    score: number;
    level: number;
    gameOver: boolean;
    firewallTimer: number;
    firewallPhaseTime: number;
    firewallJustSwitched: boolean;
    virusEffect: VirusEffect;
    virusTimer: number;
    hasKey: boolean;
    inOverclock: boolean;
    overclockScoreTimer: number;
    history: Point[];
    ghostFrame: number;
    animTime: number;
    justTeleported: boolean;
    itemsCollected: number;
}

export const SnakeGame: React.FC = () => {
    const addLog = useStore((s) => s.addLog);
    const updateStats = useGameStore(s => s.updateStats);
    const ghostMemory = useRef<Point[]>([]); 

    const state = useRef<SnakeState>({
        snake: [{x: 10, y: 10}],
        dir: {x: 1, y: 0},
        nextDir: {x: 1, y: 0}, 
        food: {x: 15, y: 10, type: 'DATA' as FoodType},
        keyItem: null as Point | null,
        walls: [] as Point[],
        gates: [] as Gate[],
        tunnels: [] as Tunnel[],
        zones: [] as Zone[],
        timer: 0,
        speed: 0.12,
        baseSpeed: 0.12,
        score: 0,
        level: 1,
        gameOver: false,
        firewallTimer: 0,
        firewallPhaseTime: 2.0,
        firewallJustSwitched: false,
        virusEffect: 'NONE' as VirusEffect,
        virusTimer: 0,
        hasKey: false,
        inOverclock: false,
        overclockScoreTimer: 0,
        history: [] as Point[],
        ghostFrame: 0,
        animTime: 0,
        justTeleported: false,
        
        // Metrics
        itemsCollected: 0
    });
    
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [hasKey, setHasKey] = useState(false);
    const [levelProgress, setLevelProgress] = useState(0);

    const generateLevel = (lvl: number) => {
        const s = state.current;
        s.walls = [];
        s.gates = [];
        s.tunnels = [];
        s.zones = [];
        s.hasKey = false;
        s.keyItem = null;
        setHasKey(false);

        const useFirewall = (lvl >= 4 && lvl <= 6) || (lvl >= 22 && Math.random() > 0.4);
        const useVPN = (lvl >= 10 && lvl <= 12) || (lvl >= 22 && Math.random() > 0.6);
        const useOverclock = (lvl >= 19 && lvl <= 21) || (lvl >= 22 && Math.random() > 0.7);

        if (lvl <= 3) {
            if (lvl >= 2) {
                for(let x=8; x<16; x++) { s.walls.push({x, y: 8}); s.walls.push({x, y: 15}); }
            }
        }
        else if (useFirewall && !useVPN) {
             for (let y = 6; y < 18; y+=4) {
                 for(let x=4; x<20; x++) s.walls.push({x, y});
                 s.walls = s.walls.filter(w => w.x !== 12 || w.y !== y);
                 s.gates.push({x: 12, y, active: (y%8 !== 2)}); 
             }
        }
        else if (useVPN) {
             for (let y=0; y<GRID_H; y++) if(y%3!==0) s.walls.push({x: 12, y});
             s.tunnels.push({id: 1, x: 5, y: 12, linkId: 2, cooldown: 0});
             s.tunnels.push({id: 2, x: 19, y: 12, linkId: 1, cooldown: 0});
             if (useFirewall) {
                 s.gates.push({x: 12, y: 3, active: true});
                 s.gates.push({x: 12, y: 21, active: false});
             }
        }
        else if (lvl <= 9) {
             for(let i=0; i<20; i++) {
                 s.walls.push({
                     x: Math.floor(Math.random()*(GRID_W-4))+2, 
                     y: Math.floor(Math.random()*(GRID_H-4))+2
                 });
             }
        }
        else if (lvl <= 15) {
             for (let x=4; x<20; x+=4) {
                 for (let y=4; y<20; y++) s.walls.push({x, y});
             }
        }
        else if (lvl <= 18) {
            for(let x=0; x<GRID_W; x++) {
                if(x!==12 && x!==11 && x!==13) s.walls.push({x, y: 12});
            }
            s.gates.push({x: 12, y: 12, active: true}); 
        }
        else if (useOverclock) {
            for(let x=6; x<18; x++) { s.walls.push({x, y:6}); s.walls.push({x, y:18}); }
            for(let y=6; y<18; y++) { s.walls.push({x:6, y}); s.walls.push({x:18, y}); }
            s.zones.push({x: 8, y: 8, w: 8, h: 8, type: 'OVERCLOCK'});
        }

        s.walls = s.walls.filter(w => Math.abs(w.x - 10) > 3 || Math.abs(w.y - 10) > 3);
        s.gates = s.gates.filter(g => Math.abs(g.x - 10) > 3 || Math.abs(g.y - 10) > 3);
    };

    const reset = (startLevel: number = 1) => {
        const baseTick = Math.max(0.08, 0.12 - (Math.floor(startLevel / 3) * 0.005));

        state.current = {
            snake: [{x: 10, y: 10}, {x:9, y:10}, {x:8, y:10}], 
            dir: {x: 1, y: 0},
            nextDir: {x: 1, y: 0},
            food: {x: 15, y: 10, type: 'DATA'},
            keyItem: null,
            walls: [],
            gates: [],
            tunnels: [],
            zones: [],
            timer: 0,
            speed: baseTick,
            baseSpeed: baseTick,
            score: (startLevel - 1) * 500,
            level: startLevel,
            gameOver: false,
            firewallTimer: 0,
            firewallPhaseTime: Math.max(1.8, 3.2 - (startLevel * 0.1)), 
            firewallJustSwitched: false,
            virusEffect: 'NONE',
            virusTimer: 0,
            hasKey: false,
            inOverclock: false,
            overclockScoreTimer: 0,
            history: [],
            ghostFrame: 0,
            animTime: 0,
            justTeleported: false,
            itemsCollected: 0
        };
        
        generateLevel(startLevel);
        spawnFood();
        setScore(state.current.score);
        setLevel(startLevel);
        setHasKey(false);
        setGameOver(false);
        setLevelProgress(0);

        if (startLevel >= 4) addLog(LogLevel.WARN, "FIREWALL_GATES_DETECTED");
        if (startLevel >= 7) addLog(LogLevel.WARN, "BAD_DATA_PACKETS_IN_STREAM");
        if (startLevel >= 10) addLog(LogLevel.SYS, "VPN_TUNNELING_ENABLED");
        if (startLevel >= 13) addLog(LogLevel.SYS, "ZIP_ALGORITHM_AVAILABLE");
        if (startLevel >= 16) addLog(LogLevel.WARN, "2FA_SECURITY_ACTIVE");
        if (startLevel >= 19) addLog(LogLevel.WARN, "OVERCLOCK_ZONES_DETECTED");
    };

    const isPosOccupied = (x: number, y: number, s: SnakeState) => {
        if (s.snake.some((p) => p.x === x && p.y === y)) return true;
        if (s.walls.some((p) => p.x === x && p.y === y)) return true;
        if (s.gates.some((p) => p.x === x && p.y === y)) return true;
        if (s.tunnels.some((p) => p.x === x && p.y === y)) return true;
        return false;
    };

    const spawnFood = () => {
        const s = state.current;
        let valid = false;
        let attempts = 0;
        
        const is2FA = ((s.level >= 16 && s.level <= 18) || (s.level >= 22 && Math.random() > 0.7)) && !s.hasKey;

        while (!valid && attempts < 100) {
            const x = Math.floor(Math.random() * GRID_W);
            const y = Math.floor(Math.random() * GRID_H);
            
            if (!isPosOccupied(x, y, s)) {
                let type: FoodType = 'DATA';
                
                if (is2FA) {
                    type = 'LOCKED_DATA';
                    spawnKey(x, y); 
                } else {
                    const roll = Math.random();
                    const virusChance = s.level >= 7 ? 0.06 + ((s.level-7)*0.01) : 0;
                    const zipChance = (s.level >= 13 && s.snake.length > 8) ? 0.06 : 0;

                    if (roll < virusChance) type = 'VIRUS';
                    else if (roll < virusChance + zipChance) type = 'ZIP';
                }

                s.food = { x, y, type };
                valid = true;
            }
            attempts++;
        }
        if (!valid) s.food = { x: 0, y: 0, type: 'DATA' };
    };

    const spawnKey = (excludeX: number, excludeY: number) => {
        const s = state.current;
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            const x = Math.floor(Math.random() * GRID_W);
            const y = Math.floor(Math.random() * GRID_H);
            const dist = Math.abs(x - excludeX) + Math.abs(y - excludeY);
            if (!isPosOccupied(x, y, s) && dist > 8) {
                s.keyItem = { x, y };
                valid = true;
            }
            attempts++;
        }
    };

    const saveState = () => JSON.stringify(state.current);
    const loadState = (data: string) => {
        try {
            const loaded = JSON.parse(data);
            state.current = { ...state.current, ...loaded };
            setScore(loaded.score);
            setLevel(loaded.level);
            setHasKey(loaded.hasKey);
            setGameOver(loaded.gameOver);
            setLevelProgress((loaded.snake.length % 10) / 10);
        } catch(e) {}
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;
        s.animTime += dt;
        if (s.gameOver) return;

        if (s.gates.length > 0) {
            s.firewallTimer += dt;
            s.firewallJustSwitched = false;
            if (s.firewallTimer > s.firewallPhaseTime) {
                s.firewallTimer = 0;
                s.gates.forEach(g => g.active = !g.active);
                s.firewallJustSwitched = true; 
                audio.playTone(200, 'sawtooth', 0.05, 0.05);
            }
        }

        if (s.virusTimer > 0) {
            s.virusTimer -= dt;
            if (s.virusTimer <= 0) {
                s.virusEffect = 'NONE';
                addLog(LogLevel.SUCCESS, "SYSTEM_STABILIZED");
                haptics.notificationSuccess();
            } else {
                if (s.virusEffect === 'VIDEO_DRIVER_FAIL') {
                    if (Math.random() > 0.85) juice.addChromatic(4);
                    if (Math.random() > 0.95) juice.addShake(1);
                }
            }
        }

        let reqDir = null;
        if (input.keys.has('ArrowUp') || input.swipeDirection === 'UP') reqDir = {x: 0, y: -1};
        if (input.keys.has('ArrowDown') || input.swipeDirection === 'DOWN') reqDir = {x: 0, y: 1};
        if (input.keys.has('ArrowLeft') || input.swipeDirection === 'LEFT') reqDir = {x: -1, y: 0};
        if (input.keys.has('ArrowRight') || input.swipeDirection === 'RIGHT') reqDir = {x: 1, y: 0};

        if (s.virusEffect === 'INPUT_HIJACK' && reqDir) {
            reqDir.x *= -1;
            reqDir.y *= -1;
        }

        if (reqDir) {
            if (reqDir.x !== -s.dir.x && reqDir.y !== -s.dir.y) {
                s.nextDir = reqDir;
            }
        }

        let currentSpeed = s.speed;
        s.inOverclock = false;
        
        const head = s.snake[0];
        const inZone = s.zones.some(z => 
            z.type === 'OVERCLOCK' && 
            head.x >= z.x && head.x < z.x + z.w && 
            head.y >= z.y && head.y < z.y + z.h
        );
        
        if (inZone) {
            s.inOverclock = true;
            currentSpeed = s.speed * 0.5;
            
            s.overclockScoreTimer += dt;
            if (s.overclockScoreTimer > 1.0) {
                s.overclockScoreTimer = 0;
                s.score += 6; 
                setScore(s.score);
            }
        }

        s.timer += dt;
        if (s.timer > currentSpeed) {
            s.timer = 0;
            s.dir = s.nextDir;
            s.justTeleported = false;

            s.tunnels.forEach(t => { if(t.cooldown > 0) t.cooldown--; });

            s.ghostFrame++;
            s.history.push({ ...s.snake[0] });

            let newHead = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

            let collision = false;
            let hitType = 'NONE';

            const tunnelEntry = s.tunnels.find(t => t.x === newHead.x && t.y === newHead.y);
            if (tunnelEntry && tunnelEntry.cooldown === 0) {
                const target = s.tunnels.find(t => t.id === tunnelEntry.linkId);
                if (target) {
                    newHead.x = target.x;
                    newHead.y = target.y;
                    target.cooldown = 4;
                    s.justTeleported = true;
                    audio.playTone(1200, 'sine', 0.1, 0.1);
                    haptics.impactMedium();
                    juice.emitParticles((tunnelEntry.x + 0.5) * (100/GRID_W), (tunnelEntry.y + 0.5) * (100/GRID_H), '#00f', 15);
                    juice.emitParticles((target.x + 0.5) * (100/GRID_W), (target.y + 0.5) * (100/GRID_H), '#00f', 15);
                }
            }

            const outOfBounds = newHead.x < 0 || newHead.x >= GRID_W || newHead.y < 0 || newHead.y >= GRID_H;
            const hitWall = s.walls.some(o => o.x === newHead.x && o.y === newHead.y);
            const hitActiveGate = s.gates.some(g => g.x === newHead.x && g.y === newHead.y && g.active);
            
            let hitLockedData = false;
            if (s.food.type === 'LOCKED_DATA' && newHead.x === s.food.x && newHead.y === s.food.y && !s.hasKey) {
                hitLockedData = true;
            }

            if (outOfBounds || hitWall || hitActiveGate || hitLockedData) {
                if (hitActiveGate && s.firewallJustSwitched) {
                    // Grace period
                } else {
                    collision = true;
                    if (hitActiveGate) hitType = 'FIREWALL';
                    else if (hitLockedData) hitType = 'ENCRYPTION_LOCK';
                    else hitType = 'WALL';
                }
            }

            if (!collision) {
                if (s.snake.some((p, i) => i !== s.snake.length - 1 && p.x === newHead.x && p.y === newHead.y)) {
                    collision = true;
                    hitType = 'SELF';
                }
            }

            if (collision) {
                handleDeath(juice, hitType);
                return;
            }

            s.snake.unshift(newHead);

            if (s.keyItem && newHead.x === s.keyItem.x && newHead.y === s.keyItem.y) {
                s.hasKey = true;
                setHasKey(true);
                s.keyItem = null;
                audio.playSuccess();
                haptics.notificationSuccess();
                juice.emitParticles((newHead.x + 0.5) * (100/GRID_W), (newHead.y + 0.5) * (100/GRID_H), '#ff0', 15);
                addLog(LogLevel.SUCCESS, "AUTH_KEY_ACQUIRED");
            }

            if (newHead.x === s.food.x && newHead.y === s.food.y) {
                handleEat(juice);
            } else {
                s.snake.pop();
            }
        }

    }, [updateStats]);

    const handleEat = (juice: GameCoreHandle) => {
        const s = state.current;
        
        audio.playSuccess();
        juice.addShake(2);
        haptics.impactLight();
        
        let scoreAdd = (s.level * 10);

        if (s.food.type === 'VIRUS') {
            scoreAdd *= 4;
            s.virusTimer = 5.0;
            s.virusEffect = Math.random() > 0.5 ? 'INPUT_HIJACK' : 'VIDEO_DRIVER_FAIL';
            addLog(LogLevel.ERR, `WARNING: ${s.virusEffect}`);
            audio.playError();
            haptics.notificationError();
            juice.addChromatic(20);
            juice.addShake(5);
            juice.emitParticles((s.food.x + 0.5) * (100/GRID_W), (s.food.y + 0.5) * (100/GRID_H), '#f00', 30);
        }
        else if (s.food.type === 'ZIP') {
            scoreAdd = 0;
            const cutAmount = Math.min(5, Math.max(0, s.snake.length - 3));
            for(let i=0; i<cutAmount; i++) s.snake.pop();
            addLog(LogLevel.INFO, `COMPRESSION: -${cutAmount} SEGMENTS`);
            audio.playTone(600, 'sine', 0.1, 0.1);
            haptics.impactMedium();
            juice.emitParticles((s.food.x + 0.5) * (100/GRID_W), (s.food.y + 0.5) * (100/GRID_H), '#00f', 20);
        }
        else if (s.food.type === 'LOCKED_DATA' || s.food.type === 'DATA') {
             scoreAdd += s.snake.length * 2;
             s.itemsCollected += 1; // Track metric
             if (s.food.type === 'LOCKED_DATA') {
                 scoreAdd += 50; 
                 s.hasKey = false;
                 setHasKey(false);
             }
             juice.emitParticles((s.food.x + 0.5) * (100/GRID_W), (s.food.y + 0.5) * (100/GRID_H), '#0f0', 10);
        }
        
        s.score += scoreAdd;
        setScore(s.score);
        
        // Progression
        const currentLength = s.snake.length;
        const progress = (s.itemsCollected % 10) / 10;
        setLevelProgress(progress);

        // Level Up Logic (Every 10 items)
        if (s.itemsCollected > 0 && s.itemsCollected % 10 === 0) {
             s.baseSpeed = Math.max(0.04, s.baseSpeed * 0.95);
             s.speed = s.baseSpeed;
             addLog(LogLevel.SYS, "PROCESS_SPEED_INCREMENT");
             haptics.notificationSuccess();
             
             // Unlock next level in stats with metrics
             if (s.level < 21) {
                 s.level++; 
                 setLevel(s.level);
                 juice.levelUp(s.level, { itemsCollected: s.itemsCollected });
             } else {
                 juice.levelUp(s.level + 1, { itemsCollected: s.itemsCollected });
             }
        }

        spawnFood();
    };

    const handleDeath = (juice: GameCoreHandle, cause: string) => {
        const s = state.current;
        s.gameOver = true;
        setGameOver(true);
        audio.playError();
        haptics.impactHeavy();
        
        juice.addShake(20);
        juice.addChromatic(20);
        juice.triggerHitStop(300);
        juice.emitParticles((s.snake[0].x + 0.5) * (100/GRID_W), (s.snake[0].y + 0.5) * (100/GRID_H), '#f00', 40);

        if (s.history.length > ghostMemory.current.length) {
            ghostMemory.current = [...s.history];
        } 

        addLog(LogLevel.ERR, `PROCESS_TERMINATED: ${cause}`);
        updateStats('SNAKE', s.score, s.level);
    };

    // ... (Draw function remains same) ...
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const cellSize = Math.floor(Math.min(width, height) / GRID_W);
        const offsetX = (width - cellSize * GRID_W) / 2;
        const offsetY = (height - cellSize * GRID_H) / 2;

        if (s.virusEffect === 'VIDEO_DRIVER_FAIL') {
             const jitterX = (Math.random() - 0.5) * 4;
             ctx.translate(jitterX, 0);
        }

        s.zones.forEach(z => {
            if (z.type === 'OVERCLOCK') {
                const zx = offsetX + z.x * cellSize;
                const zy = offsetY + z.y * cellSize;
                const zw = z.w * cellSize;
                const zh = z.h * cellSize;
                
                ctx.fillStyle = `rgba(255, 165, 0, ${0.1 + Math.sin(s.animTime * 10) * 0.05})`;
                ctx.fillRect(zx, zy, zw, zh);
                
                ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
                ctx.beginPath();
                for(let i=0; i<z.w; i+=2) {
                    ctx.moveTo(zx + i*cellSize, zy);
                    ctx.lineTo(zx + (i+1)*cellSize, zy + zh);
                }
                ctx.stroke();
                
                if (s.inOverclock) {
                     ctx.shadowColor = '#fea';
                     ctx.shadowBlur = 10;
                     ctx.strokeStyle = '#fff';
                     ctx.strokeRect(zx, zy, zw, zh);
                     ctx.shadowBlur = 0;
                }
            }
        });

        ctx.strokeStyle = '#002222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= GRID_W; i++) {
            ctx.moveTo(offsetX + i * cellSize, offsetY);
            ctx.lineTo(offsetX + i * cellSize, offsetY + GRID_H * cellSize);
        }
        for (let i = 0; i <= GRID_H; i++) {
            ctx.moveTo(offsetX, offsetY + i * cellSize);
            ctx.lineTo(offsetX + GRID_W * cellSize, offsetY + i * cellSize);
        }
        ctx.stroke();

        s.tunnels.forEach(t => {
            const tx = offsetX + t.x * cellSize;
            const ty = offsetY + t.y * cellSize;
            ctx.fillStyle = t.cooldown > 0 ? '#000055' : '#0000AA';
            ctx.fillRect(tx + 2, ty + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = '#0088FF';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx + 4, ty + 4, cellSize - 8, cellSize - 8);
        });

        ctx.fillStyle = '#004444';
        s.walls.forEach(o => {
            ctx.fillRect(offsetX + o.x * cellSize + 1, offsetY + o.y * cellSize + 1, cellSize - 2, cellSize - 2);
            ctx.fillStyle = '#006666';
            ctx.fillRect(offsetX + o.x * cellSize + 4, offsetY + o.y * cellSize + 4, cellSize - 8, cellSize - 8);
            ctx.fillStyle = '#004444';
        });

        s.gates.forEach(g => {
            const gx = offsetX + g.x * cellSize;
            const gy = offsetY + g.y * cellSize;
            
            if (g.active) {
                ctx.fillStyle = `rgba(255, 0, 0, ${0.4 + Math.sin(s.animTime * 10) * 0.2})`;
                ctx.shadowColor = '#f00';
                ctx.shadowBlur = 10;
                ctx.fillRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4);
                
                ctx.strokeStyle = '#f00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(gx + 4, gy + 4); ctx.lineTo(gx + cellSize - 4, gy + cellSize - 4);
                ctx.moveTo(gx + cellSize - 4, gy + 4); ctx.lineTo(gx + 4, gy + cellSize - 4);
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(gx + 4, gy + 4, cellSize - 8, cellSize - 8);
                ctx.strokeStyle = '#555';
                ctx.strokeRect(gx + 4, gy + 4, cellSize - 8, cellSize - 8);
            }
        });

        const drawItem = (x: number, y: number, type: string) => {
            const fx = offsetX + x * cellSize + cellSize/2;
            const fy = offsetY + y * cellSize + cellSize/2;
            ctx.save();
            ctx.translate(fx, fy);
            
            if (type === 'KEY') {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#fd0';
                ctx.fillStyle = '#fd0';
                ctx.fillRect(-cellSize/6, -cellSize/3, cellSize/3, cellSize/1.5);
                ctx.fillRect(-cellSize/3, -cellSize/3, cellSize/1.5, cellSize/4);
            } 
            else if (type === 'LOCKED_DATA') {
                ctx.fillStyle = '#555';
                if (!s.hasKey) ctx.strokeStyle = '#f00';
                else ctx.strokeStyle = '#0f0';
                
                ctx.lineWidth = 2;
                ctx.fillRect(-cellSize/3, 0, cellSize/1.5, cellSize/2.5);
                ctx.strokeRect(-cellSize/3, 0, cellSize/1.5, cellSize/2.5);
                ctx.beginPath();
                ctx.arc(0, 0, cellSize/4, Math.PI, 0);
                ctx.stroke();
            }
            else if (type === 'ZIP') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00f';
                ctx.fillStyle = '#00f';
                ctx.scale(0.8 + Math.sin(s.animTime * 5)*0.1, 0.8 + Math.sin(s.animTime * 5)*0.1);
                ctx.fillRect(-cellSize/3, -cellSize/3, cellSize/3, cellSize/6);
                ctx.fillRect(0, -cellSize/6, cellSize/3, cellSize/6);
                ctx.fillRect(-cellSize/3, 0, cellSize/3, cellSize/6);
                ctx.fillRect(0, cellSize/6, cellSize/3, cellSize/6);
            }
            else if (type === 'VIRUS') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f00';
                ctx.fillStyle = '#f00';
                if (Math.random() > 0.8) ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
                ctx.fillRect(-cellSize/3, -cellSize/3, cellSize/1.5, cellSize/1.5);
            } 
            else { 
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#0f0';
                ctx.fillStyle = '#0f0';
                ctx.beginPath();
                ctx.arc(0, 0, cellSize/4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        };

        if (s.keyItem) drawItem(s.keyItem.x, s.keyItem.y, 'KEY');
        drawItem(s.food.x, s.food.y, s.food.type);

        s.snake.forEach((part, i) => {
            const px = offsetX + part.x * cellSize;
            const py = offsetY + part.y * cellSize;

            if (i === 0) { 
                ctx.shadowBlur = 15;
                ctx.shadowColor = s.virusEffect !== 'NONE' ? '#f00' : '#0ff'; 
                ctx.fillStyle = s.virusEffect !== 'NONE' ? '#f00' : '#0ff';
                ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            } else { 
                const alpha = Math.max(0.2, 1 - (i / s.snake.length));
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
                if (s.virusEffect !== 'NONE') ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                
                ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
                
                const prev = s.snake[i-1];
                if (prev) {
                    const dx = prev.x - part.x;
                    const dy = prev.y - part.y;
                    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                        ctx.fillRect(px + 2 + dx*2, py + 2 + dy*2, cellSize - 4, cellSize - 4);
                    }
                }
            }
        });
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        if (s.virusEffect !== 'NONE') {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#f00';
            ctx.textAlign = 'center';
            ctx.fillText(`WARNING: ${s.virusEffect}`, width/2, height - 30);
        }

        if (s.inOverclock) {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#fa0';
            ctx.textAlign = 'right';
            ctx.fillText(`>> OVERCLOCK ACTIVE <<`, width - 10, height - 10);
        }

        if (s.hasKey) {
            ctx.fillStyle = '#fd0';
            ctx.textAlign = 'left';
            ctx.fillText(`KEY: ACQUIRED`, 10, height - 10);
        }

        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'left';
        ctx.fillText(`DATA: ${s.itemsCollected}/10`, 10, 20);

    }, []);

    const instructions = useMemo(() => {
        return [
            "COLLECT 10 DATA PACKETS TO ADVANCE.",
            "L1-3: BASIC. L4-6: FIREWALL GATES.",
            "L7-9: AVOID RED VIRUS DATA.",
            "L10-12: USE BLUE VPN TUNNELS.",
            "L13-15: ZIP (BLUE) COMPRESSES SNAKE.",
            "L16-18: KEY (GOLD) UNLOCKS DATA."
        ];
    }, []);

    return <GameCore 
        gameId="SNAKE"
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