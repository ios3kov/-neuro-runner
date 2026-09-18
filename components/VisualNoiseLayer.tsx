import React from 'react';

/** Static texture underneath content: no frame loop or readability-damaging overlay. */
export const VisualNoiseLayer = React.memo(function VisualNoiseLayer() {
  return <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{zIndex:0,opacity:0.035,backgroundImage:'radial-gradient(#00f0ff 0.5px, transparent 0.5px)',backgroundSize:'4px 4px'}} />;
});
