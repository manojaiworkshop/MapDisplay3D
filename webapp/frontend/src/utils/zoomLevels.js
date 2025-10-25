/**
 * Zoom Level System for Tiles-based Map Rendering
 * 
 * Maps zoom distance to discrete levels with area coverage
 * Each level represents a different level of detail for rendering
 */

// Zoom level configuration
export const ZOOM_LEVELS = [
  { level: 0.1, areaKm: 10, color: '#ff0000', name: 'Street Level' },      // Red - Very Close
  { level: 0.5, areaKm: 50, color: '#ff8800', name: 'City Block' },       // Orange - Close
  { level: 1, areaKm: 100, color: '#ffff00', name: 'City Level' },        // Yellow - Medium Close
  { level: 2, areaKm: 200, color: '#88ff00', name: 'Metro Area' },        // Light Green - Medium
  { level: 5, areaKm: 500, color: '#00ff00', name: 'State Level' },       // Green - Medium Far
  { level: 10, areaKm: 1000, color: '#00ff88', name: 'Regional' },        // Cyan Green - Far
  { level: 15, areaKm: 2000, color: '#00ffff', name: 'Multi-State' },     // Cyan - Very Far
  { level: 20, areaKm: 5000, color: '#0088ff', name: 'Country Level' },   // Blue - Maximum Detail
  { level: 25, areaKm: 10000, color: '#0000ff', name: 'Continental' },    // Dark Blue - Continental
  { level: 30, areaKm: 20000, color: '#8800ff', name: 'Satellite View' }, // Purple - Satellite
  { level: 35, areaKm: 33000, color: '#ff00ff', name: 'Global View' }     // Magenta - Maximum Range
];

// Convert zoom distance (from Three.js camera) to area coverage in km
export const zoomDistanceToAreaKm = (zoomDistance) => {
  return Math.round(zoomDistance * 220);
};

// Convert area coverage in km to zoom distance
export const areaKmToZoomDistance = (areaKm) => {
  return areaKm / 220;
};

// Get zoom level data based on current zoom distance
export const getZoomLevelFromDistance = (zoomDistance) => {
  const areaKm = zoomDistanceToAreaKm(zoomDistance);
  
  // Find the closest zoom level
  let closestLevel = ZOOM_LEVELS[0];
  let minDifference = Math.abs(areaKm - closestLevel.areaKm);
  
  for (const level of ZOOM_LEVELS) {
    const difference = Math.abs(areaKm - level.areaKm);
    if (difference < minDifference) {
      minDifference = difference;
      closestLevel = level;
    }
  }
  
  return {
    ...closestLevel,
    actualAreaKm: areaKm,
    zoomDistance,
    difference: minDifference
  };
};

// Get level of detail (LOD) index based on zoom level
export const getLODFromZoomLevel = (level) => {
  if (level <= 0.5) return 0; // Highest detail
  if (level <= 2) return 1;   // High detail
  if (level <= 10) return 2;  // Medium detail
  return 3;                   // Low detail
};

// Get debug color for background based on zoom level
export const getDebugBackgroundColor = (zoomDistance, opacity = 0.1) => {
  const levelData = getZoomLevelFromDistance(zoomDistance);
  const hex = levelData.color;
  
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Format area coverage for display
export const formatAreaCoverage = (areaKm) => {
  if (areaKm >= 1000) {
    return `${(areaKm / 1000).toFixed(1)}K km`;
  }
  return `${areaKm} km`;
};

// Get tile configuration for current zoom level
export const getTileConfig = (zoomDistance) => {
  const levelData = getZoomLevelFromDistance(zoomDistance);
  const lodLevel = getLODFromZoomLevel(levelData.level);
  
  return {
    ...levelData,
    lodLevel,
    tileSize: getTileSize(levelData.level),
    maxStations: getMaxStations(levelData.level),
    showDetails: levelData.level <= 5, // Show detailed info only at close zoom
    showLabels: levelData.level <= 10, // Show labels at medium zoom
    showTracks: levelData.level <= 2,  // Show railway tracks only at close zoom
  };
};

// Get tile size based on zoom level
const getTileSize = (level) => {
  if (level <= 1) return 1;   // 1km tiles for street level
  if (level <= 5) return 5;   // 5km tiles for city level
  if (level <= 15) return 20; // 20km tiles for regional
  return 50;                  // 50km tiles for country level
};

// Get maximum number of stations to render at this zoom level
const getMaxStations = (level) => {
  if (level <= 0.5) return 1000;  // Show all details
  if (level <= 2) return 500;     // Show major stations
  if (level <= 10) return 100;    // Show important stations
  return 20;                      // Show only HQ stations
};

export default {
  ZOOM_LEVELS,
  zoomDistanceToAreaKm,
  areaKmToZoomDistance,
  getZoomLevelFromDistance,
  getLODFromZoomLevel,
  getDebugBackgroundColor,
  formatAreaCoverage,
  getTileConfig
};