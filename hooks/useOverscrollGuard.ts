import type { CSSProperties } from 'react';
const scrollStyle: CSSProperties = { overscrollBehavior: 'contain', touchAction: 'pan-y pinch-zoom' };
export const useOverscrollGuard = () => ({ style: scrollStyle });
