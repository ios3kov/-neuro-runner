export const UI_CONSTANTS = {
    GRID_PADDING_BOTTOM: 128,
    GRID_GAP: 12,
    GRID_TARGET_TILE_HEIGHT: 112,
    GRID_MIN_ROWS: 3
};

// Centralized Z-Index System
// Usage: className={`z-[${Z_LAYERS.OVERLAY}]`}
export const Z_LAYERS = {
    BASE: 0,
    CONTENT: 10,
    UI_CHROME: 40,
    FX: 50,
    MODAL_BACKDROP: 100,
    MODAL_CONTENT: 110,
    TOOL_LAYER: 120,
    OVERLAY: 9999
} as const;