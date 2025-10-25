import React from 'react';
import { getDebugBackgroundColor, getZoomLevelFromDistance } from '../utils/zoomLevels';

/**
 * DebugBackground - Adds a subtle colored overlay that changes with zoom level
 * Used for visual debugging to see zoom level changes
 */
const DebugBackground = ({ 
  zoomDistance, 
  enabled = true, 
  opacity = 0.05,
  style = {} 
}) => {
  if (!enabled || !zoomDistance) return null;

  const levelData = getZoomLevelFromDistance(zoomDistance);
  const backgroundColor = getDebugBackgroundColor(zoomDistance, opacity);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor,
        pointerEvents: 'none',
        zIndex: 10,
        transition: 'background-color 0.3s ease-in-out',
        ...style
      }}
    />
  );
};

/**
 * ZoomLevelIndicator - Shows current zoom level as a colored bar
 */
export const ZoomLevelIndicator = ({ 
  zoomDistance, 
  position = 'left',
  showLabel = true 
}) => {
  if (!zoomDistance) return null;

  const levelData = getZoomLevelFromDistance(zoomDistance);
  
  // Calculate position on the zoom range (0.045 to 150)
  const minZoom = 0.045;
  const maxZoom = 150;
  const progress = Math.log(zoomDistance / minZoom) / Math.log(maxZoom / minZoom);
  const percentage = Math.max(0, Math.min(100, progress * 100));

  const isLeft = position === 'left';
  
  const containerStyle = {
    position: 'absolute',
    [isLeft ? 'left' : 'right']: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '8px',
    height: '200px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    overflow: 'hidden'
  };

  const fillStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: `${percentage}%`,
    background: `linear-gradient(to top, ${levelData.color}, ${levelData.color}88)`,
    transition: 'height 0.3s ease-out, background 0.3s ease-out'
  };

  const labelStyle = {
    position: 'absolute',
    [isLeft ? 'left' : 'right']: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    border: `1px solid ${levelData.color}`,
    pointerEvents: 'none'
  };

  return (
    <div style={containerStyle}>
      <div style={fillStyle} />
      {showLabel && (
        <div style={labelStyle}>
          Level {levelData.level}
        </div>
      )}
    </div>
  );
};

export default DebugBackground;