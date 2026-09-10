import React, { useCallback, useRef, useState } from 'react';
import { GameCore, InputState } from '../GameCore';

export const PlaceholderGame: React.FC<{name: string}> = ({name}) => {
    // Simple particle demo for placeholders
    const state = useRef({
        particles: [] as {x: number, y: number, vx: number, vy: number, life: number}[]
    });

    const update = useCallback((dt: number, input: InputState) => {
        const s = state.current;
        if (Math.random() > 0.9) {
            s.particles.push({
                x: 50, y: 50,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 1
            });
        }
        s.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        s.particles = s.particles.filter(p => p.life > 0);
    }, []);

    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const w = (val: number) => (val / 100) * width;
        const h = (val: number) => (val / 100) * height;

        ctx.fillStyle = '#444';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`MODULE: ${name}`, width/2, height/2 - 20);
        ctx.fillText("SIMULATION OFFLINE", width/2, height/2 + 20);

        state.current.particles.forEach(p => {
            ctx.fillStyle = `rgba(0, 240, 255, ${p.life})`;
            ctx.fillRect(w(p.x), h(p.y), 2, 2);
        });
    }, [name]);

    return <GameCore 
        gameId={name}
        update={update} 
        draw={draw} 
        onReset={() => {}} 
        isGameOver={false} 
        score={0} 
        level={1}
        instructions={["MODULE NOT FOUND", "PLEASE CONTACT SYSADMIN"]}
    />;
};