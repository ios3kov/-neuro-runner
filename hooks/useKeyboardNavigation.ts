import { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { audio } from '../utils/audio';
import { haptics } from '../utils/haptics';

interface Identifiable {
    id: string;
}

interface UseKeyboardNavigationProps<T extends Identifiable> {
    items: T[];
    viewMode: ViewMode;
    isActive: boolean;
    onNavigate: (item: T) => void;
}

export const useKeyboardNavigation = <T extends Identifiable>({
    items,
    viewMode,
    isActive,
    onNavigate
}: UseKeyboardNavigationProps<T>) => {
    const [focusedId, setFocusedId] = useState<string | null>(null);

    // Haptic feedback effect for selection change
    // Using effect decoupled from the handler ensures it triggers on all focus changes
    // while the HapticEngine class handles throttling
    useEffect(() => {
        if (focusedId) {
            haptics.selection();
        }
    }, [focusedId]);

    // Ensure focus is valid relative to current items
    useEffect(() => {
        if (focusedId && !items.find(i => i.id === focusedId)) {
            setFocusedId(null);
        }
    }, [items, focusedId]);

    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (items.length === 0) return;

            // Navigation Keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                
                if (!focusedId) {
                    const first = items[0];
                    setFocusedId(first.id);
                    audio.playHover();
                    scrollToId(first.id);
                    return;
                }

                const idx = items.findIndex(i => i.id === focusedId);
                if (idx === -1) {
                    setFocusedId(items[0].id);
                    return;
                }

                let nextIdx = idx;

                if (viewMode === 'GRID') {
                    const cols = getGridCols();
                    if (e.key === 'ArrowRight') nextIdx++;
                    if (e.key === 'ArrowLeft') nextIdx--;
                    if (e.key === 'ArrowDown') nextIdx += cols;
                    if (e.key === 'ArrowUp') nextIdx -= cols;
                } else {
                    // LIST or TREE
                    if (e.key === 'ArrowDown') nextIdx++;
                    if (e.key === 'ArrowUp') nextIdx--;
                }

                // Boundary Checks
                if (nextIdx < 0) nextIdx = 0;
                if (nextIdx >= items.length) nextIdx = items.length - 1;

                if (nextIdx !== idx) {
                    const nextItem = items[nextIdx];
                    setFocusedId(nextItem.id);
                    audio.playHover();
                    scrollToId(nextItem.id);
                }
            }

            // Enter -> Activate
            if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedId) {
                    const item = items.find(i => i.id === focusedId);
                    if (item) onNavigate(item);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, items, viewMode, focusedId, onNavigate]);

    return { focusedId, setFocusedId };
};

// Helper to calculate grid columns matching Tailwind breakpoints
function getGridCols() {
    const width = window.innerWidth;
    if (width >= 1280) return 6; // xl
    if (width >= 1024) return 5; // lg
    if (width >= 768) return 4;  // md
    if (width >= 640) return 3;  // sm
    return 2;                    // default
}

function scrollToId(id: string) {
    document.getElementById(`node-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}