import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import type { InputState } from '../core/gameTypes';

interface UseGameInputOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onEscape: () => void;
  onEngage: () => void;
  isWaitingToStart: boolean;
}

const EDGE_MARGIN = 25;
const SWIPE_THRESHOLD = 25;
const TAP_THRESHOLD = 15;

export const useGameInput = ({
  canvasRef,
  onEscape,
  onEngage,
  isWaitingToStart,
}: UseGameInputOptions) => {
  const inputRef = useRef<InputState>({
    keys: new Set(),
    swipeDirection: null,
    touchX: 0,
    touchY: 0,
    touchDeltaX: 0,
    touchDeltaY: 0,
    isTouching: false,
    tapDetected: false,
  });

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const toLocalPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };
  }, [canvasRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      inputRef.current.keys.add(event.code);
      if (event.code === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
      if (isWaitingToStart) onEngage();
    };
    const handleKeyUp = (event: KeyboardEvent) => inputRef.current.keys.delete(event.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isWaitingToStart, onEngage, onEscape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventGesture = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    canvas.addEventListener('gesturestart', preventGesture, { passive: false });
    return () => canvas.removeEventListener('gesturestart', preventGesture);
  }, [canvasRef]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.cancelable) event.preventDefault();
    if (isWaitingToStart) {
      onEngage();
      return;
    }
    const touch = event.touches[0];
    const point = toLocalPoint(touch.clientX, touch.clientY);
    if (!point) return;
    if (
      point.x < EDGE_MARGIN || point.x > point.width - EDGE_MARGIN ||
      point.y < EDGE_MARGIN || point.y > point.height - EDGE_MARGIN
    ) return;

    touchStartRef.current = { x: point.x, y: point.y };
    lastTouchRef.current = { x: point.x, y: point.y };
    inputRef.current.isTouching = true;
    inputRef.current.touchX = point.x;
    inputRef.current.touchY = point.y;
  }, [isWaitingToStart, onEngage, toLocalPoint]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    const point = toLocalPoint(touch.clientX, touch.clientY);
    if (!point) return;

    if (lastTouchRef.current) {
      inputRef.current.touchDeltaX = ((point.x - lastTouchRef.current.x) / point.width) * 200;
      inputRef.current.touchDeltaY = ((point.y - lastTouchRef.current.y) / point.height) * 200;
    }

    const touchStart = touchStartRef.current;
    if (touchStart) {
      const dx = point.x - touchStart.x;
      const dy = point.y - touchStart.y;
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
        inputRef.current.swipeDirection = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'RIGHT' : 'LEFT')
          : (dy > 0 ? 'DOWN' : 'UP');
        touchStartRef.current = { x: point.x, y: point.y };
      }
    }

    lastTouchRef.current = { x: point.x, y: point.y };
    inputRef.current.touchX = point.x;
    inputRef.current.touchY = point.y;
  }, [toLocalPoint]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.cancelable) event.preventDefault();
    inputRef.current.isTouching = false;
    const touchStart = touchStartRef.current;
    const touch = event.changedTouches[0];
    const point = touch ? toLocalPoint(touch.clientX, touch.clientY) : null;
    if (touchStart && point) {
      const dx = point.x - touchStart.x;
      const dy = point.y - touchStart.y;
      if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
        inputRef.current.tapDetected = true;
      }
    }
    touchStartRef.current = null;
    lastTouchRef.current = null;
  }, [toLocalPoint]);

  const resetTransientInput = useCallback(() => {
    inputRef.current.swipeDirection = null;
    inputRef.current.tapDetected = false;
  }, []);

  const clearAllInput = useCallback(() => {
    inputRef.current.keys.clear();
    inputRef.current.swipeDirection = null;
    inputRef.current.tapDetected = false;
    inputRef.current.isTouching = false;
    inputRef.current.touchDeltaX = 0;
    inputRef.current.touchDeltaY = 0;
  }, []);

  return {
    inputRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetTransientInput,
    clearAllInput,
  };
};
