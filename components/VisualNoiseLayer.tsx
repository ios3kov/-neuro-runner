import React from 'react';
import { useStore } from '../store';
import { Z_LAYERS } from '../constants/ui';

export const VisualNoiseLayer: React.FC = () => {
    const lowPowerMode = useStore(state => state.user.settings.lowPowerMode);

    if (lowPowerMode) return null;

    return (
        <div 
            className="absolute inset-0 pointer-events-none opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyIiBoZWlnaHQ9IjIiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDBmMGZmIi8+Cjwvc3ZnPg==')]"
            style={{ 
                zIndex: Z_LAYERS.FX,
                pointerEvents: 'none'
            }}
        ></div>
    );
};