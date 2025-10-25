import React from 'react';
import { getZoomLevelFromDistance, formatAreaCoverage, getTileConfig } from '../utils/zoomLevels';

/**
 * ZoomLevelDisplay - Shows current zoom level information in bottom-right corner
 * Displays zoom level, area coverage, and debug information
 */
const ZoomLevelDisplay = ({ 
  zoomDistance, 
  showDebug = true, 
  position = 'bottom-right',
  style = {} 
}) => {
  if (!zoomDistance) return null;

  const levelData = getZoomLevelFromDistance(zoomDistance);
  const tileConfig = getTileConfig(zoomDistance);
  
  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' }
  };

  const baseStyle = {
    position: 'absolute',
    ...positionStyles[position],
    background: showDebug 
      ? `linear-gradient(135deg, ${levelData.color}20, rgba(0, 0, 0, 0.8))`
      : 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: 'monospace',
    border: showDebug 
      ? `2px solid ${levelData.color}80`
      : '2px solid rgba(255, 215, 0, 0.5)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    minWidth: '200px',
    backdropFilter: 'blur(5px)',
    ...style
  };

  return (
    <div style={baseStyle}>
      {/* Main zoom info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
          📏 Level {levelData.level}
        </div>
        <div style={{ 
          background: levelData.color,
          color: '#000',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          {levelData.name}
        </div>
      </div>

      {/* Area coverage */}
      <div style={{ marginBottom: '6px' }}>
        <strong>Coverage:</strong> {formatAreaCoverage(levelData.actualAreaKm)}
        {levelData.difference > 0 && (
          <span style={{ color: '#ffaa00', fontSize: '11px', marginLeft: '8px' }}>
            (±{levelData.difference}km)
          </span>
        )}
      </div>

      {/* Altitude */}
      <div style={{ marginBottom: showDebug ? '6px' : '0' }}>
        <strong>Altitude:</strong> {Math.round(zoomDistance * 220)} km
      </div>

      {/* Debug information */}
      {showDebug && (
        <>
          <div style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            paddingTop: '6px',
            fontSize: '11px',
            color: '#cccccc'
          }}>
            <div><strong>LOD:</strong> {tileConfig.lodLevel}</div>
            <div><strong>Tile Size:</strong> {tileConfig.tileSize}km</div>
            <div><strong>Max Stations:</strong> {tileConfig.maxStations}</div>
            <div>
              <strong>Details:</strong> {tileConfig.showDetails ? '✓' : '✗'} | 
              <strong> Labels:</strong> {tileConfig.showLabels ? '✓' : '✗'} | 
              <strong> Tracks:</strong> {tileConfig.showTracks ? '✓' : '✗'}
            </div>
          </div>

          {/* Zoom distance raw value */}
          <div style={{ 
            fontSize: '10px', 
            color: '#999',
            marginTop: '4px'
          }}>
            Raw: {zoomDistance.toFixed(3)} | Color: {levelData.color}
          </div>
        </>
      )}
    </div>
  );
};

export default ZoomLevelDisplay;