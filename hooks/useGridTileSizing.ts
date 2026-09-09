import { useState, useEffect, RefObject } from 'react';
import { ViewMode } from '../types';
import { UI_CONSTANTS } from '../constants/ui';

export const useGridTileSizing = (
    containerRef: RefObject<HTMLElement | null>,
    viewMode: ViewMode
) => {
    const [tileHeight, setTileHeight] = useState(UI_CONSTANTS.GRID_TARGET_TILE_HEIGHT);

    useEffect(() => {
        if (viewMode !== 'GRID' || !containerRef.current) return;

        const calcHeight = () => {
            if (!containerRef.current) return;
            
            const { GRID_PADDING_BOTTOM, GRID_GAP, GRID_TARGET_TILE_HEIGHT, GRID_MIN_ROWS } = UI_CONSTANTS;
            const h = containerRef.current.clientHeight;
            
            // Safety check if height is 0 (hidden or not laid out)
            if (h === 0) return;

            const availableH = h - GRID_PADDING_BOTTOM;

            if (availableH <= GRID_TARGET_TILE_HEIGHT) {
                setTileHeight(GRID_TARGET_TILE_HEIGHT);
                return;
            }

            let rows = Math.floor((availableH + GRID_GAP) / (GRID_TARGET_TILE_HEIGHT + GRID_GAP));
            if (rows < GRID_MIN_ROWS) rows = GRID_MIN_ROWS;

            const exactH = Math.floor((availableH - (rows - 1) * GRID_GAP) / rows);
            // Ensure we don't return negative or zero height
            setTileHeight(exactH > 0 ? exactH : GRID_TARGET_TILE_HEIGHT);
        };

        const observer = new ResizeObserver(calcHeight);
        observer.observe(containerRef.current);
        
        // Initial calculation
        calcHeight();
        
        // Fallback for layout settling (animations, etc.)
        const timer = setTimeout(calcHeight, 50);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [viewMode, containerRef]);

    return tileHeight;
};