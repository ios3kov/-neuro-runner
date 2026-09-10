import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState, GameCoreHandle } from '../GameCore';
import { audio } from '../../utils/audio';

// --- DATA LISTS ---

const FAKE_STUDIOS = [
    { name: "NULL_POINTER_INC", sub: "DE_REF_DREAMS" },
    { name: "INFINITE_LOOP_SYS", sub: "ONE_MORE_CYCLE" },
    { name: "STACK_OVERFLOW", sub: "COPY_PASTE_EXEC" },
    { name: "VOID_LOGIC_LLC", sub: "UNDEFINED_IS_NAN" },
    { name: "VAPOR_INTERACTIVE", sub: "COMING_SOON_TM" },
    { name: "GLITCH_CORP", sub: "IT_IS_A_FEATURE" },
    { name: "EARLY_ACCESS_OS", sub: "ALPHA_VER_0.0.1" },
    { name: "ASSET_FLIP_DB", sub: "DEFAULT_CUBE_V2" },
    { name: "SPAGHETTI_CODE", sub: "WEAVING_LOGIC" },
    { name: "MEMORY_LEAK_SYS", sub: "RAM_CONSUMED" }
];

const ASSET_NAMES = [
    "TEXTURE_GRASS_4K.DAT", "SHADER_WATER_V2.FX", "MODEL_HERO_LOD0.OBJ",
    "SFX_EXPLOSION.WAV", "AI_PATHFINDING.LUA", "SKYBOX_NIGHT.EXR",
    "ANIM_IDLE_LOOP.FBX", "PHYSICS_CFG.JSON", "FONT_COMIC.TTF",
    "LEVEL_01_FINAL.MAP", "PARTICLE_BLOOD.PFX", "DLC_ARMOR.PAK",
    "CUTSCENE_INTRO.MP4", "LOOTBOX_ODDS.JSON"
];

const TERMINAL_LOGS = [
    "ALLOC_MEM... 64GB OK", "GPU_CHECK... OUTDATED",
    "DL_PATCH... 120GB", "VERIFY... ERROR",
    "CONNECT_DC_EAST...", "HANDSHAKE... FAIL",
    "LOAD_KERNEL...", "BYPASS_SEC...", "MINING_CRYPTO...",
    "SEND_USER_DATA...", "COMPILE_SHADERS...",
    "DEL_OLD_SAVES...", "GEN_BUGS..."
];

const BIOS_LOGS = [
    "NEURO_BIOS v9.4",
    "CPU: UNKNOWN @ 99GHz",
    "RAM: 1048576K OK",
    "PRIM_MASTER: CORRUPT",
    "PRIM_SLAVE: NONE",
    "BOOT_NET...",
    "DHCP... /",
    "PXE-E53: NO_BOOT",
    "EXIT_ROM"
];

const EULA_TEXT = [
    "USER_LICENSE_AGREEMENT",
    "1. YOUR_SOUL_IS_OURS.",
    "2. WE_MONITOR_DREAMS.",
    "3. BUGS = MECHANICS.",
    "4. NO_REFUNDS.",
    "5. MINING_BG_CRYPTO.",
    "6. DATA_SOLD_TO_ALIENS.",
    "7. INSTANT_TERMINATION.",
    "8. TOO_FAST_TO_READ.",
    "9. YOU_OWE_US_$50.",
    "10. HAVE_A_NICE_DAY."
];

const LOBBY_STATUS = [
    "SEARCHING...", "EXPAND_RANGE...",
    "SKILL_GAP_ERR...", "CONNECT_HOST...",
    "MIGRATION...", "CONN_LOST...", "RETRY..."
];

// --- TYPES ---

type LoadingStyle = 'LOGO' | 'TERMINAL' | 'ASSETS' | 'SHADER' | 'SERVER' | 'BIOS' | 'UPDATE' | 'EULA' | 'INSTALL' | 'LOBBY';

interface GameState {
    style: LoadingStyle;
    timer: number;
    duration: number;
    progress: number;
    
    // Style Specifics
    textLines: string[];
    currentAsset: string;
    studioIndex: number;
    shaderCount: number;
    eulaScroll: number;
    lobbyStatus: string;
    
    screensSurvived: number;
}

export const VaporwareGame: React.FC = () => {
    const state = useRef<GameState>({
        style: 'LOGO',
        timer: 0,
        duration: 2,
        progress: 0,
        textLines: [],
        currentAsset: '',
        studioIndex: 0,
        shaderCount: 0,
        eulaScroll: 0,
        lobbyStatus: '',
        screensSurvived: 0,
    });

    const [score, setScore] = useState(0);

    // --- LOGIC ---

    const pickNewStyle = () => {
        const s = state.current;
        const styles: LoadingStyle[] = [
            'LOGO', 'TERMINAL', 'ASSETS', 'SHADER', 'SERVER', 
            'BIOS', 'UPDATE', 'EULA', 'INSTALL', 'LOBBY'
        ];
        
        let nextStyle = styles[Math.floor(Math.random() * styles.length)];
        if (nextStyle === s.style) nextStyle = styles[Math.floor(Math.random() * styles.length)];
        
        s.style = nextStyle;
        s.timer = 0;
        // Faster duration: 1.5s to 3.5s
        s.duration = 1.5 + Math.random() * 2.0;
        s.progress = 0;
        
        s.screensSurvived++;
        
        // Init Style Data
        if (s.style === 'LOGO') {
            s.studioIndex = Math.floor(Math.random() * FAKE_STUDIOS.length);
        } else if (s.style === 'TERMINAL') {
            s.textLines = [];
        } else if (s.style === 'ASSETS') {
            s.currentAsset = "INIT_VFS...";
        } else if (s.style === 'SHADER') {
            s.shaderCount = 0;
        } else if (s.style === 'BIOS') {
            s.textLines = [...BIOS_LOGS];
        } else if (s.style === 'EULA') {
            s.eulaScroll = 80;
        } else if (s.style === 'LOBBY') {
            s.lobbyStatus = LOBBY_STATUS[0];
        } else if (s.style === 'UPDATE') {
             s.duration = Math.max(s.duration, 2.5); // Slightly longer for updates
        }

        setScore(s.screensSurvived);
        
        // FX on transition
        if (s.screensSurvived > 0) audio.playClick();
    };

    const reset = () => {
        state.current.screensSurvived = -1;
        pickNewStyle();
    };

    const update = useCallback((dt: number, input: InputState, juice: GameCoreHandle) => {
        const s = state.current;

        s.timer += dt;
        
        // Progression Logic
        if (s.timer > s.duration) {
            juice.addChromatic(4);
            pickNewStyle();
            return;
        }

        // Style Specific Updates
        const pct = Math.min(100, (s.timer / s.duration) * 100);
        s.progress = pct;

        if (s.style === 'TERMINAL') {
            if (Math.random() > 0.85) {
                const line = TERMINAL_LOGS[Math.floor(Math.random() * TERMINAL_LOGS.length)];
                s.textLines.push(`> ${line}`);
                if (s.textLines.length > 8) s.textLines.shift();
                audio.playKeystroke();
            }
        }
        else if (s.style === 'ASSETS') {
            if (Math.random() > 0.80) {
                s.currentAsset = ASSET_NAMES[Math.floor(Math.random() * ASSET_NAMES.length)];
            }
        }
        else if (s.style === 'SHADER') {
            if (Math.random() > 0.8) {
                s.shaderCount += Math.floor(Math.random() * 150);
            }
        }
        else if (s.style === 'EULA') {
            s.eulaScroll -= dt * 60; 
        }
        else if (s.style === 'LOBBY') {
            const statusIdx = Math.floor((s.timer / s.duration) * LOBBY_STATUS.length);
            s.lobbyStatus = LOBBY_STATUS[Math.min(statusIdx, LOBBY_STATUS.length - 1)];
        }
        else if (s.style === 'UPDATE') {
             if (Math.random() > 0.95) s.duration += 0.1; // Tiny stutter
        }

    }, []);

    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const s = state.current;
        const w = (val: number) => (val / 100) * width;
        const h = (val: number) => (val / 100) * height;
        const cx = width / 2;
        const cy = height / 2;

        // --- UNIFIED BACKGROUND (Neuro OS Style) ---
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Subtle Grid
        ctx.strokeStyle = '#001a1c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i,height); }
        for(let i=0; i<height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(width,i); }
        ctx.stroke();

        // --- STYLES ---

        if (s.style === 'LOGO') {
            const studio = FAKE_STUDIOS[s.studioIndex];
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 10;
            ctx.fillText(studio.name, cx, cy - 20);
            
            ctx.shadowBlur = 0;
            ctx.font = '12px monospace';
            ctx.fillStyle = '#0ff';
            ctx.fillText(studio.sub, cx, cy + 10);

            // Cyber Bar
            const barW = w(60);
            ctx.strokeStyle = '#003333';
            ctx.strokeRect(cx - barW/2, cy + 40, barW, h(1));
            ctx.fillStyle = '#0ff';
            ctx.fillRect(cx - barW/2, cy + 40, barW * (s.progress/100), h(1));
        }

        else if (s.style === 'TERMINAL') {
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#0f0';
            ctx.shadowColor = '#0f0';
            ctx.shadowBlur = 4;
            
            let y = h(20);
            s.textLines.forEach(line => {
                ctx.fillText(line, w(5), y);
                y += 20;
            });
            if (Math.floor(Date.now() / 200) % 2 === 0) ctx.fillRect(w(5), y, 8, 12);
        }

        else if (s.style === 'ASSETS') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0ff';
            ctx.font = '10px monospace';
            ctx.fillText("CACHING_ASSETS...", cx, cy - 20);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 5;
            ctx.fillText(s.currentAsset, cx, cy);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#0ff';
            ctx.font = '10px monospace';
            ctx.fillText(`[ ${Math.floor(s.progress)}% ]`, cx, cy + 20);
        }

        else if (s.style === 'SHADER') {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.font = '12px monospace';
            ctx.fillText(`WARMING_PIPELINE [${s.shaderCount}]`, w(5), h(90));
            
            // Segmented Bar
            const segs = 20;
            const filled = Math.floor((s.progress/100) * segs);
            for(let i=0; i<segs; i++) {
                ctx.fillStyle = i < filled ? '#0ff' : '#111';
                ctx.fillRect(i * (width/segs), h(92), (width/segs)-2, h(2));
            }
        }

        else if (s.style === 'SERVER') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0ff';
            
            // Rotating Hex
            ctx.save();
            ctx.translate(cx, cy - 20);
            ctx.rotate(Date.now() / 500);
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                const angle = (i/6)*Math.PI*2;
                ctx.lineTo(Math.cos(angle)*20, Math.sin(angle)*20);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            ctx.font = '12px monospace';
            ctx.fillText("ESTABLISHING_UPLINK...", cx, cy + 20);
            ctx.fillStyle = '#044';
            ctx.fillText("LATENCY: 999ms", cx, cy + 40);
        }

        else if (s.style === 'BIOS') {
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#00f0ff'; 
            let y = h(10);
            s.textLines.forEach(line => {
                ctx.fillText(`> ${line}`, w(5), y);
                y += 18;
            });
            if (s.progress > 80) {
                ctx.fillStyle = '#f00';
                ctx.shadowColor = '#f00';
                ctx.shadowBlur = 5;
                ctx.fillText("CRITICAL_ERR // RETRY", w(5), y + 20);
            }
        }

        else if (s.style === 'UPDATE') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0ff';
            ctx.font = 'bold 40px monospace';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 10;
            ctx.fillText(`${Math.floor(s.progress)}%`, cx, cy);
            ctx.shadowBlur = 0;
            
            ctx.font = '14px monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText(`SYSTEM_PATCHING...`, cx, cy + 40);
            
            ctx.font = '10px monospace';
            ctx.fillStyle = '#444';
            ctx.fillText("DO_NOT_POWER_OFF", cx, height - 30);
        }

        else if (s.style === 'EULA') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0ff';
            ctx.font = 'bold 16px monospace';
            ctx.fillText("NEURO_CONTRACT_V9", cx, h(10));
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(w(10), h(15), w(80), h(70));
            ctx.clip();
            
            ctx.font = '12px monospace';
            ctx.fillStyle = '#005555';
            let y = h(15) + s.eulaScroll;
            EULA_TEXT.forEach(line => {
                ctx.fillText(line, cx, y);
                y += 20;
            });
            ctx.restore();
            
            ctx.strokeStyle = '#0ff';
            ctx.strokeRect(w(10), h(15), w(80), h(70));
            
            // Static Footer instead of buttons
            ctx.fillStyle = '#003333';
            ctx.fillRect(w(10), h(90), w(80), h(5));
            ctx.fillStyle = '#0ff';
            ctx.font = '10px monospace';
            ctx.fillText("AUTO_ACCEPTING_TERMS...", cx, h(93.5));
        }

        else if (s.style === 'INSTALL') {
            // Window Frame
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - w(40), cy - h(15), w(80), h(30));
            
            // Header
            ctx.fillStyle = '#003333';
            ctx.fillRect(cx - w(40), cy - h(15), w(80), h(5));
            ctx.fillStyle = '#0ff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText("MODULE_INSTALLER.EXE", cx - w(38), cy - h(11.5));
            
            // Progress
            const barW = w(70);
            ctx.fillStyle = '#001111';
            ctx.fillRect(cx - barW/2, cy, barW, h(4));
            
            // Blocks
            const blocks = 10;
            const active = Math.floor((s.progress/100) * blocks);
            ctx.fillStyle = '#0ff';
            const blockW = (barW / blocks) - 2;
            for(let i=0; i<active; i++) {
                ctx.fillRect((cx - barW/2) + i*(blockW+2), cy + 2, blockW, h(4)-4);
            }
            
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '10px monospace';
            ctx.fillText("UNPACKING_DATA...", cx, cy - h(3));
        }

        else if (s.style === 'LOBBY') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = '14px monospace';
            ctx.fillText("NET_SCANNING...", cx, h(20));
            
            // Radar
            const r = 40;
            ctx.strokeStyle = '#005555';
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, r*0.6, 0, Math.PI*2); ctx.stroke();
            
            // Sweep
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Date.now() / 150);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.arc(0, 0, r, 0, 0.5);
            ctx.lineTo(0,0);
            ctx.fill();
            ctx.restore();
            
            ctx.font = '12px monospace';
            ctx.fillStyle = '#0ff';
            ctx.fillText(s.lobbyStatus, cx, cy + 60);
        }

    }, []);

    const instructions = [
        "ENDLESS LOADING SIMULATOR.",
        "PLEASE WAIT...",
        "AND WAIT...",
        "AND WAIT..."
    ];

    return <GameCore 
        gameId="VAPORWARE"
        update={update} 
        draw={draw} 
        onReset={reset} 
        isGameOver={false} 
        score={score}
        level={1}
        instructions={instructions}
    />;
};