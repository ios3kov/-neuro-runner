import { useEffect } from 'react';
import type React from 'react';
import { useStore } from '../../store';
import { syncCanvasViewport } from '../core/canvasViewport';
import type { GameCoreHandle, GameState, InputState, Particle } from '../core/gameTypes';
import type { JuiceState } from '../../types';
import { drawGlobalGameFx } from '../visuals/canvasFx';

interface UseGameLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  inputRef: React.MutableRefObject<InputState>;
  juiceRef: React.MutableRefObject<JuiceState>;
  particlesRef: React.MutableRefObject<Particle[]>;
  gameState: GameState;
  lowPowerMode: boolean;
  update: (dt: number, input: InputState, juice: GameCoreHandle) => void;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  juiceHandle: GameCoreHandle;
  clearAllInput: () => void;
  resetTransientInput: () => void;
}

export const useGameLoop = ({
  canvasRef,
  inputRef,
  juiceRef,
  particlesRef,
  gameState,
  lowPowerMode,
  update,
  draw,
  juiceHandle,
  clearAllInput,
  resetTransientInput,
}: UseGameLoopOptions): void => {
  useEffect(() => {
    let animationFrameId = 0;
    let lastTime = performance.now();
    let visualTime = 0;

    const loop = (time: number) => {
      if (useStore.getState().isSuspended) {
        lastTime = time;
        clearAllInput();
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      let dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      visualTime += dt;

      if (juiceRef.current.shake > 0) {
        juiceRef.current.shake *= 0.9;
        if (juiceRef.current.shake < 0.5) juiceRef.current.shake = 0;
      }
      if (juiceRef.current.chromaticAberration > 0) {
        juiceRef.current.chromaticAberration *= 0.92;
        if (juiceRef.current.chromaticAberration < 0.5) juiceRef.current.chromaticAberration = 0;
      }

      if (gameState === 'PLAYING') {
        if (juiceRef.current.hitStop > 0) {
          juiceRef.current.hitStop -= dt * 1000;
          dt = 0;
        }

        for (const particle of particlesRef.current) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.life -= dt * 1.2;
        }
        particlesRef.current = particlesRef.current.filter((particle) => particle.life > 0);

        update(dt, inputRef.current, juiceHandle);
        inputRef.current.touchDeltaX *= 0.5;
        inputRef.current.touchDeltaY *= 0.5;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const viewport = syncCanvasViewport(canvas, lowPowerMode ? 1 : 3);
        if (viewport) {
          const { ctx, width, height } = viewport;
          ctx.save();
          ctx.fillStyle = '#030303';
          ctx.fillRect(0, 0, width, height);

          if (juiceRef.current.shake > 0) {
            const dx = (Math.random() - 0.5) * juiceRef.current.shake;
            const dy = (Math.random() - 0.5) * juiceRef.current.shake;
            ctx.translate(dx, dy);
          }

          if (juiceRef.current.chromaticAberration > 2) {
            ctx.shadowColor = 'rgba(255,0,0,0.5)';
            ctx.shadowOffsetX = Math.random() * 4 - 2;
            ctx.shadowOffsetY = Math.random() * 4 - 2;
          }

          draw(ctx, width, height);

          const w = (value: number) => (value / 100) * width;
          const h = (value: number) => (value / 100) * height;
          for (const particle of particlesRef.current) {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.fillRect(w(particle.x), h(particle.y), particle.size, particle.size);
          }
          ctx.globalAlpha = 1;
          ctx.shadowColor = 'transparent';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          drawGlobalGameFx(ctx, width, height, {
            time: visualTime,
            lowPowerMode,
            intensity: gameState === 'PLAYING' ? 1 : 0.72,
          });
          ctx.restore();
        }
      }

      resetTransientInput();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    canvasRef,
    clearAllInput,
    draw,
    gameState,
    inputRef,
    juiceHandle,
    juiceRef,
    lowPowerMode,
    particlesRef,
    resetTransientInput,
    update,
  ]);
};
