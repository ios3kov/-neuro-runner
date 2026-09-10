import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { useStore } from '../../store';
import { audio } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

// --- TUNING CONSTANTS (From Production Plan) ---
const LANE_WIDTH = 2.5; // Meters
const CAMERA_HEIGHT = 1.8;
const CAMERA_Z = -5;
const FOCAL_LENGTH = 300;
const GRAVITY = -35.0;
const JUMP_FORCE = 12;
const BASE_SPEED = 9.0;
const MAX_SPEED = 14.5;
const ACCEL = 0.5; // Ramp up speed

// --- TYPES ---
type ObstacleType = 'WALL' | 'BEAM' | 'GATE' | 'COIN' | 'FINISH';
type Lane = -1 | 0 | 1;

interface WorldObject {
    id: number;
    z: number;
    lane: Lane;
    type: ObstacleType;
    collected?: boolean;
    yOffset?: number; // 0=Ground, 1=Mid, 2=High
}

interface PlayerState {
    x: number; // -1 to 1 (current visual lane)
    y: number; // Height (jumping)
    z: number; // Distance ran
    lane: Lane; // Target lane
    vy: number;
    isGrounded: boolean;
    isSliding: boolean;
    slideTimer: number;
    speed: number;
}

// --- TUTORIAL SCRIPT (Glass Corridor 01) ---
// Distances are in meters relative to start
const TUTORIAL_LEVEL: WorldObject[] = [
    // BEAT 0: Warmup (Coins)
    { id: 1, z: 20, lane: 0, type: 'COIN' },
    { id: 2, z: 30, lane: 0, type: 'COIN' },
    { id: 3, z: 40, lane: 0, type: 'COIN' },

    // BEAT 1: Swipe (Wall in center) -> Force Left or Right
    { id: 10, z: 80, lane: 0, type: 'WALL' },
    { id: 11, z: 120, lane: -1, type: 'COIN' }, // Reward for swiping left
    { id: 12, z: 120, lane: 1, type: 'COIN' },  // Reward for swiping right

    // BEAT 2: Jump (Low Beam)
    { id: 20, z: 180, lane: 0, type: 'COIN', yOffset: 2 }, // Telegraph up
    { id: 21, z: 185, lane: 0, type: 'BEAM' }, // Jumpable

    // BEAT 3: Slide (High Gate)
    { id: 30, z: 260, lane: 0, type: 'COIN' }, // Telegraph down
    { id: 31, z: 265, lane: 0, type: 'GATE' }, // Slideable

    // BEAT 4: Combo (Lane -> Jump -> Slide)
    { id: 40, z: 340, lane: -1, type: 'WALL' }, // Block Left
    { id: 41, z: 340, lane: 1, type: 'WALL' },  // Block Right -> Must be Center
    
    { id: 42, z: 370, lane: 0, type: 'BEAM' },  // Jump Center
    
    { id: 43, z: 410, lane: 0, type: 'GATE' },  // Slide Center

    // BEAT 5: Mag-Rails Event (Visual rush, lots of coins)
    { id: 50, z: 480, lane: -1, type: 'COIN' },
    { id: 51, z: 490, lane: -1, type: 'COIN' },
    { id: 52, z: 500, lane: -1, type: 'COIN' },
    { id: 53, z: 520, lane: 1, type: 'COIN' },
    { id: 54, z: 530, lane: 1, type: 'COIN' },
    { id: 55, z: 540, lane: 1, type: 'COIN' },

    // BEAT 6: Finish
    { id: 999, z: 650, lane: 0, type: 'FINISH' }
];

export const RunnerGame: React.FC = () => {
    // Game State Refs
    const player = useRef<PlayerState>({
        x: 0, y: 0, z: 0, lane: 0, vy: 0,
        isGrounded: true, isSliding: false, slideTimer: 0,
        speed: BASE_SPEED
    });

    const objects = useRef<WorldObject[]>(JSON.parse(JSON.stringify(TUTORIAL_LEVEL)));
    const worldZ = useRef(0); 
    const prompt = useRef<string | null>(null);
    
    // React State for UI
    const [score, setScore] = useState(0);
    const [distance, setDistance] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [msg, setMsg] = useState("INIT: GLASS CORRIDOR 01");

    const reset = () => {
        player.current = {
            x: 0, y: 0, z: 0, lane: 0, vy: 0,
            isGrounded: true, isSliding: false, slideTimer: 0,
            speed: BASE_SPEED
        };
        objects.current = JSON.parse(JSON.stringify(TUTORIAL_LEVEL));
        worldZ.current = 0;
        prompt.current = null;
        setScore(0);
        setDistance(0);
        setGameOver(false);
        setMsg("INIT: GLASS CORRIDOR 01");
    };

    // --- PHYSICS & LOGIC ---
    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const p = player.current;
        if (gameOver) return;

        // 1. Acceleration
        if (p.speed < MAX_SPEED) {
            p.speed += ACCEL * dt;
        }
        
        // Mag-Rail Event Boost (Beat 5)
        if (worldZ.current > 450 && worldZ.current < 550) {
            p.speed = Math.min(p.speed + 15 * dt, 25); // Temporary speed burst
            if (Math.random() > 0.8) juice.addShake(1);
        } else if (worldZ.current > 550) {
            p.speed += (MAX_SPEED - p.speed) * dt; // Decelerate back
        }

        worldZ.current += p.speed * dt;
        setDistance(Math.floor(worldZ.current));

        // 2. Input Handling
        // Lane Switching
        if (input.swipeDirection === 'LEFT' || input.keys.has('ArrowLeft')) {
            if (p.lane > -1) {
                p.lane--;
                input.swipeDirection = null; // Consume
                input.keys.delete('ArrowLeft');
                audio.playClick();
                haptics.selection();
            }
        } else if (input.swipeDirection === 'RIGHT' || input.keys.has('ArrowRight')) {
            if (p.lane < 1) {
                p.lane++;
                input.swipeDirection = null;
                input.keys.delete('ArrowRight');
                audio.playClick();
                haptics.selection();
            }
        }

        // Jump
        if ((input.swipeDirection === 'UP' || input.keys.has('ArrowUp') || input.tapDetected) && p.isGrounded && !p.isSliding) {
            p.vy = JUMP_FORCE;
            p.isGrounded = false;
            input.swipeDirection = null;
            input.keys.delete('ArrowUp');
            input.tapDetected = false;
            audio.playHover();
        }

        // Slide
        if ((input.swipeDirection === 'DOWN' || input.keys.has('ArrowDown')) && p.isGrounded) {
            p.isSliding = true;
            p.slideTimer = 0.9; 
            input.swipeDirection = null;
            input.keys.delete('ArrowDown');
            audio.playHover();
        }

        // 3. Player Physics
        // Lerp X to lane
        p.x += (p.lane - p.x) * 10 * dt;

        // Gravity
        if (!p.isGrounded) {
            p.vy += GRAVITY * dt;
            p.y += p.vy * dt;
            if (p.y <= 0) {
                p.y = 0;
                p.vy = 0;
                p.isGrounded = true;
                haptics.impactLight();
            }
        }

        // Slide Timer
        if (p.isSliding) {
            p.slideTimer -= dt;
            if (p.slideTimer <= 0) {
                p.isSliding = false;
            }
        }

        // 4. Collision & Interaction
        objects.current.forEach(obj => {
            if (obj.collected) return;

            // Distance relative to player
            const dz = obj.z - worldZ.current;

            // Tutorial Prompts
            if (dz < 40 && dz > 30) {
                if (obj.type === 'WALL' && prompt.current !== 'SWIPE') {
                    prompt.current = 'SWIPE';
                    setMsg("<< SWIPE >>");
                }
                if (obj.type === 'BEAM' && prompt.current !== 'JUMP') {
                    prompt.current = 'JUMP';
                    setMsg("^^ JUMP ^^");
                }
                if (obj.type === 'GATE' && prompt.current !== 'SLIDE') {
                    prompt.current = 'SLIDE';
                    setMsg("vv SLIDE vv");
                }
            }

            // Hitbox Logic
            if (dz < 0.5 && dz > -1.5) {
                const laneMatch = Math.abs(obj.lane - p.lane) < 0.5;
                
                if (laneMatch) {
                    if (obj.type === 'COIN') {
                        obj.collected = true;
                        setScore(s => s + 10);
                        audio.playClick();
                        juice.emitParticles(0, 0, '#0f0', 5);
                    } 
                    else if (obj.type === 'FINISH') {
                        obj.collected = true;
                        setGameOver(true);
                        juice.levelUp(1, { score: score + 1000 });
                        setMsg("TRAINING COMPLETE");
                    }
                    else if (obj.type === 'WALL') {
                        handleCrash(juice);
                        obj.collected = true;
                    }
                    else if (obj.type === 'BEAM') {
                        if (p.y < 1.0) { // Failed to jump
                            handleCrash(juice);
                            obj.collected = true;
                        }
                    }
                    else if (obj.type === 'GATE') {
                        if (!p.isSliding) { // Failed to slide
                            handleCrash(juice);
                            obj.collected = true;
                        }
                    }
                }
            }
        });

    }, [gameOver, score]);

    const handleCrash = (juice: GameCoreHandle) => {
        // Tutorial Fail-Safe: Don't die, just glitch and slow down
        audio.playError();
        haptics.impactHeavy();
        juice.addShake(10);
        juice.addChromatic(20);
        juice.triggerHitStop(150);
        setMsg("!! WARNING: IMPACT !!");
        player.current.speed *= 0.5;
    };

    // --- RENDERING (PSEUDO 3D) ---
    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const p = player.current;
        const cx = width / 2;
        const cy = height / 2;
        
        // 1. Background
        const grd = ctx.createLinearGradient(0, 0, 0, height);
        grd.addColorStop(0, "#000");
        grd.addColorStop(0.5, "#001a1c");
        grd.addColorStop(0.51, "#002222");
        grd.addColorStop(1, "#000");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        // 2. 3D Projection Helper
        const project = (x: number, y: number, z: number) => {
            const relZ = z - (worldZ.current + CAMERA_Z);
            if (relZ <= 0) return null;
            
            const scale = FOCAL_LENGTH / relZ;
            const screenX = cx + (x * LANE_WIDTH * 100) * (scale / 100); 
            const screenY = cy + (-y * 100 + CAMERA_HEIGHT * 50) * (scale / 100);
            return { x: screenX, y: screenY, scale: scale };
        };

        // 3. Grid Lines (Speed Effect)
        ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
        ctx.lineWidth = 1;
        
        [-1.5, -0.5, 0.5, 1.5].forEach(laneX => {
            const start = project(laneX, 0, worldZ.current); 
            const end = project(laneX, 0, worldZ.current + 200);
            if (start && end) {
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        });

        // Horizontal Moving Lines
        const gridSize = 10;
        const firstLineZ = Math.floor(worldZ.current / gridSize) * gridSize;
        for (let i = 0; i < 20; i++) {
            const z = firstLineZ + i * gridSize;
            const p1 = project(-5, 0, z);
            const p2 = project(5, 0, z);
            if (p1 && p2) {
                const alpha = Math.max(0, 1 - (z - worldZ.current)/100);
                ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }

        // 4. Draw Objects (Painter's Algo)
        const visibleObjs = objects.current.filter(o => 
            !o.collected && 
            o.z > worldZ.current - 2 && 
            o.z < worldZ.current + 150
        ).sort((a, b) => b.z - a.z);

        visibleObjs.forEach(obj => {
            const proj = project(obj.lane, obj.yOffset || 0, obj.z);
            if (!proj) return;

            const s = proj.scale;
            const w = 80 * (s / 100); 
            const h = 80 * (s / 100);

            if (obj.type === 'COIN') {
                ctx.fillStyle = '#ff0';
                ctx.shadowColor = '#ff0';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y - h/2, w/4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } 
            else if (obj.type === 'WALL') {
                ctx.fillStyle = '#f00';
                ctx.shadowColor = '#f00';
                ctx.shadowBlur = 10;
                ctx.fillRect(proj.x - w/2, proj.y - h, w, h);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(proj.x - w/2, proj.y - h, w, h);
                ctx.shadowBlur = 0;
            }
            else if (obj.type === 'BEAM') {
                ctx.fillStyle = '#f50';
                ctx.shadowColor = '#f50';
                ctx.shadowBlur = 10;
                ctx.fillRect(proj.x - w/2, proj.y - h/3, w, h/3);
                ctx.shadowBlur = 0;
            }
            else if (obj.type === 'GATE') {
                ctx.fillStyle = '#0f0';
                ctx.shadowColor = '#0f0';
                ctx.shadowBlur = 10;
                ctx.fillRect(proj.x - w/2, proj.y - h*1.2, w, h/2);
                ctx.fillRect(proj.x - w/2, proj.y - h*1.2, w/4, h);
                ctx.fillRect(proj.x + w/4, proj.y - h*1.2, w/4, h);
                ctx.shadowBlur = 0;
            }
            else if (obj.type === 'FINISH') {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                ctx.fillRect(proj.x - w*2, proj.y - h*5, w*4, h*5);
                ctx.fillStyle = '#fff';
                ctx.font = `${h}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText("FINISH", proj.x, proj.y - h*2);
            }
        });

        // 5. Draw Player
        const playerProj = project(p.x, p.y, worldZ.current + 3);
        if (playerProj) {
            const pw = 40 * (playerProj.scale / 100);
            const ph = 60 * (playerProj.scale / 100);
            
            ctx.save();
            ctx.translate(playerProj.x, playerProj.y);
            
            const tilt = (p.lane - p.x) * 0.5;
            ctx.rotate(tilt);

            if (p.isSliding) {
                ctx.fillStyle = '#0ff';
                ctx.fillRect(-pw/2, -ph/2, pw, ph/2);
            } else {
                ctx.fillStyle = '#0ff';
                ctx.fillRect(-pw/2, -ph, pw, ph);
            }
            
            if (p.speed > 12) {
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
                ctx.beginPath();
                ctx.moveTo(-pw, -ph/2);
                ctx.lineTo(-pw*2, -ph/2 + 20);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pw, -ph/2);
                ctx.lineTo(pw*2, -ph/2 + 20);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 6. UI
        ctx.fillStyle = '#0ff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`DIST: ${distance}m`, 10, 20);
        ctx.fillText(`SPD: ${p.speed.toFixed(1)} m/s`, 10, 35);
        
        if (msg) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px monospace';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 5;
            ctx.fillText(msg, width/2, height/4);
            ctx.shadowBlur = 0;
        }

    }, [msg, distance]);

    return <GameCore 
        gameId="RUNNER"
        update={update} 
        draw={draw} 
        onReset={reset} 
        isGameOver={gameOver} 
        score={score}
        level={1}
        progress={Math.min(1, distance / 650)}
        instructions={[
            "SWIPE LEFT/RIGHT TO SWITCH LANES",
            "SWIPE UP TO JUMP (LOW BEAMS)",
            "SWIPE DOWN TO SLIDE (HIGH GATES)",
            "REACH THE END OF THE CORRIDOR"
        ]}
    />;
};