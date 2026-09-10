import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import type { InputState } from '../core/gameTypes';
import { getInputTuning, isEditableTarget } from '../core/inputTuning';

interface UseGameInputOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onEscape: () => void;
  onEngage: () => void;
  isWaitingToStart: boolean;
}

const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

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

  const clearAllInput = useCallback(() => {
    inputRef.current.keys.clear();
    inputRef.current.swipeDirection = null;
    inputRef.current.tapDetected = false;
    inputRef.current.isTouching = false;
    inputRef.current.touchDeltaX = 0;
    inputRef.current.touchDeltaY = 0;
    touchStartRef.current = null;
    lastTouchRef.current = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.code === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if (GAME_KEYS.has(event.code)) event.preventDefault();
      inputRef.current.keys.add(event.code);
      if (isWaitingToStart) onEngage();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      inputRef.current.keys.delete(event.code);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearAllInput);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearAllInput);
    };
  }, [clearAllInput, isWaitingToStart, onEngage, onEscape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventGesture = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    canvas.addEventListener('gesturestart', preventGesture, { passive: false });
    canvas.addEventListener('contextmenu', preventGesture);
    return () => {
      canvas.removeEventListener('gesturestart', preventGesture);
      canvas.removeEventListener('contextmenu', preventGesture);
    };
  }, [canvasRef]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.cancelable) event.preventDefault();
    if (isWaitingToStart) {
      onEngage();
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;
    const point = toLocalPoint(touch.clientX, touch.clientY);
    if (!point) return;
    const tuning = getInputTuning(point.width, point.height);

    if (
      point.x < tuning.edgeMargin || point.x > point.width - tuning.edgeMargin ||
      point.y < tuning.edgeMargin || point.y > point.height - tuning.edgeMargin
    ) return;

    touchStartRef.current = { x: point.x, y: point.y };
    lastTouchRef.current = { x: point.x, y: point.y };
    inputRef.current.isTouching = true;
    inputRef.current.touchX = point.x;
    inputRef.current.touchY = point.y;
    inputRef.current.touchDeltaX = 0;
    inputRef.current.touchDeltaY = 0;
  }, [isWaitingToStart, onEngage, toLocalPoint]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    const point = toLocalPoint(touch.clientX, touch.clientY);
    if (!point) return;
    const tuning = getInputTuning(point.width, point.height);

    if (lastTouchRef.current) {
      inputRef.current.touchDeltaX = (point.x - lastTouchRef.current.x) * tuning.deltaMultiplier;
      inputRef.current.touchDeltaY = (point.y - lastTouchRef.current.y) * tuning.deltaMultiplier;
    }

    const touchStart = touchStartRef.current;
    if (touchStart) {
      const dx = point.x - touchStart.x;
      const dy = point.y - touchStart.y;
      if (Math.abs(dx) > tuning.swipeThreshold || Math.abs(dy) > tuning.swipeThreshold) {
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
      const tuning = getInputTuning(point.width, point.height);
      const dx = point.x - touchStart.x;
      const dy = point.y - touchStart.y;
      if (Math.abs(dx) < tuning.tapThreshold && Math.abs(dy) < tuning.tapThreshold) {
        inputRef.current.tapDetected = true;
      }
    }
    touchStartRef.current = null;
    lastTouchRef.current = null;
    inputRef.current.touchDeltaX = 0;
    inputRef.current.touchDeltaY = 0;
  }, [toLocalPoint]);

  const resetTransientInput = useCallback(() => {
    inputRef.current.swipeDirection = null;
    inputRef.current.tapDetected = false;
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
