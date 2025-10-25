import React, { useState, useEffect, useRef } from 'react';
import { getTileConfig, getZoomLevelFromDistance } from '../utils/zoomLevels';
import { BACKEND_URL } from '../config/constants';

/**
 * Enhanced LOD Manager with Tiles-based System
 * Manages level of detail based on zoom levels and area coverage
 */
const EnhancedLODManager = ({ 
  zoomDistance, 
  onStationsUpdate,
  backendUrl = BACKEND_URL,
  debugMode = false
}) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentTileConfig, setCurrentTileConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stations, setStations] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const lastFetchedLevel = useRef(-1);

  // Update tile configuration when zoom changes
  useEffect(() => {
    if (!zoomDistance) return;

    const tileConfig = getTileConfig(zoomDistance);
    const levelData = getZoomLevelFromDistance(zoomDistance);
    
    setCurrentTileConfig(tileConfig);
    
    if (debugMode) {
      setDebugInfo({
        zoomDistance: zoomDistance.toFixed(3),
        level: levelData.level,
        areaKm: levelData.actualAreaKm,
        lodLevel: tileConfig.lodLevel,
        tileSize: tileConfig.tileSize,
        maxStations: tileConfig.maxStations,
        color: levelData.color
      });
    }

    // Only fetch new data if LOD level changed significantly
    if (tileConfig.lodLevel !== lastFetchedLevel.current) {
      lastFetchedLevel.current = tileConfig.lodLevel;
      fetchStationsForLevel(tileConfig.lodLevel, tileConfig);
    }
    
  }, [zoomDistance, debugMode, backendUrl]);

  const fetchStationsForLevel = async (lodLevel, config) => {
    setIsLoading(true);
    
    try {
      
      const response = await fetch(`${backendUrl}/api/stations/level/${lodLevel}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      let stationData = data.stations || [];
      
      // Apply max stations limit
      if (stationData.length > config.maxStations) {
        // Sort by importance and take the most important ones
        stationData = stationData
          .sort((a, b) => (b.importance || 0) - (a.importance || 0))
          .slice(0, config.maxStations);
      }
      
      setStations(stationData);
      setCurrentLevel(lodLevel);
      
      // Update parent component
      if (onStationsUpdate) {
        onStationsUpdate(stationData, {
          level: lodLevel,
          config,
          totalAvailable: data.stations?.length || 0,
          displayed: stationData.length
        });
      }
      
      
    } catch (error) {
      console.error(`❌ [Enhanced LOD] Error fetching level ${lodLevel}:`, error);
      setStations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything - this is a data management component
  return null;
};

/**
 * TileGrid - Visual representation of tile system (for debugging)
 */
export const TileGrid = ({ 
  zoomDistance, 
  visible = false, 
  opacity = 0.1 
}) => {
  if (!visible || !zoomDistance) return null;

  const tileConfig = getTileConfig(zoomDistance);
  const levelData = getZoomLevelFromDistance(zoomDistance);
  
  // Calculate grid based on tile size
  const tileSize = tileConfig.tileSize;
  const gridLines = [];
  
  // Create vertical and horizontal lines
  for (let i = -50; i <= 50; i += tileSize) {
    gridLines.push(
      // Vertical line
      <line
        key={`v${i}`}
        x1={i}
        y1={-50}
        x2={i}
        y2={50}
        stroke={levelData.color}
        strokeWidth={0.1}
        opacity={opacity}
      />,
      // Horizontal line
      <line
        key={`h${i}`}
        x1={-50}
        y1={i}
        x2={50}
        y2={i}
        stroke={levelData.color}
        strokeWidth={0.1}
        opacity={opacity}
      />
    );
  }

  return (
    <mesh position={[0, 0.1, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color={levelData.color} transparent opacity={opacity / 2} />
      
      {/* SVG overlay for grid lines */}
      <mesh position={[0, 0.01, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={opacity}>
          <svg width="100" height="100" viewBox="-50 -50 100 100">
            {gridLines}
          </svg>
        </meshBasicMaterial>
      </mesh>
    </mesh>
  );
};

/**
 * LOD Debug Panel - Shows current LOD information
 */
export const LODDebugPanel = ({ 
  zoomDistance, 
  stations = [],
  position = 'top-left' 
}) => {
  if (!zoomDistance) return null;

  const tileConfig = getTileConfig(zoomDistance);
  const levelData = getZoomLevelFromDistance(zoomDistance);
  
  const positionStyles = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '80px', left: '20px' },
    'bottom-right': { bottom: '80px', right: '20px' }
  };

  return (
    <div style={{
      position: 'absolute',
      ...positionStyles[position],
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      border: `2px solid ${levelData.color}`,
      minWidth: '250px'
    }}>
      <div style={{ 
        color: levelData.color, 
        fontWeight: 'bold', 
        marginBottom: '8px' 
      }}>
        🎯 LOD Debug Panel
      </div>
      
      <div><strong>Zoom Level:</strong> {levelData.level}</div>
      <div><strong>Area Coverage:</strong> {levelData.actualAreaKm} km</div>
      <div><strong>LOD Level:</strong> {tileConfig.lodLevel}</div>
      <div><strong>Tile Size:</strong> {tileConfig.tileSize} km</div>
      <div><strong>Stations Rendered:</strong> {stations.length}/{tileConfig.maxStations}</div>
      
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#ccc' }}>
        <div>Show Details: {tileConfig.showDetails ? '✓' : '✗'}</div>
        <div>Show Labels: {tileConfig.showLabels ? '✓' : '✗'}</div>
        <div>Show Tracks: {tileConfig.showTracks ? '✓' : '✗'}</div>
      </div>
      
      <div style={{
        marginTop: '8px',
        padding: '4px',
        background: levelData.color + '20',
        borderRadius: '4px',
        fontSize: '10px'
      }}>
        Raw Distance: {zoomDistance.toFixed(3)}
      </div>
    </div>
  );
};

export default EnhancedLODManager;