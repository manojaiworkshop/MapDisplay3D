/**
 * Map coordinate utilities - replicates MapWidget coordinate conversion logic
 */

/**
 * Convert geographic coordinates (lat, lon) to screen coordinates (x, y)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} centerLat - Map center latitude
 * @param {number} centerLon - Map center longitude
 * @param {number} scale - Zoom scale
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {{x: number, y: number}} Screen coordinates
 */
export function geoToScreen(lat, lon, centerLat, centerLon, scale, width, height) {
  // Mercator projection (similar to MapWidget)
  const x = (lon - centerLon) * scale + width / 2;
  const y = (centerLat - lat) * scale + height / 2;
  
  return { x, y };
}

/**
 * Convert screen coordinates (x, y) to geographic coordinates (lat, lon)
 * @param {number} x - Screen x coordinate
 * @param {number} y - Screen y coordinate
 * @param {number} centerLat - Map center latitude
 * @param {number} centerLon - Map center longitude
 * @param {number} scale - Zoom scale
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {{lat: number, lon: number}} Geographic coordinates
 */
export function screenToGeo(x, y, centerLat, centerLon, scale, width, height) {
  const lon = (x - width / 2) / scale + centerLon;
  const lat = centerLat - (y - height / 2) / scale;
  
  return { lat, lon };
}

/**
 * Calculate bounds of geographic data
 * @param {Array} coordinates - Array of [lon, lat] coordinates
 * @returns {{minLat: number, maxLat: number, minLon: number, maxLon: number}}
 */
export function calculateBounds(coordinates) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  coordinates.forEach(coord => {
    const [lon, lat] = coord;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });
  
  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Fit map to view based on bounds
 * @param {object} bounds - Geographic bounds
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} padding - Padding percentage (0-1)
 * @returns {{centerLat: number, centerLon: number, scale: number}}
 */
export function fitMapToView(bounds, width, height, padding = 0.1) {
  const { minLat, maxLat, minLon, maxLon } = bounds;
  
  // Calculate center
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  
  // Calculate required scale to fit bounds
  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  
  const scaleForLat = height / latRange * (1 - padding);
  const scaleForLon = width / lonRange * (1 - padding);
  
  const scale = Math.min(scaleForLat, scaleForLon);
  
  return { centerLat, centerLon, scale };
}

/**
 * Calculate distance between two points on screen
 * @param {{x: number, y: number}} p1 - First point
 * @param {{x: number, y: number}} p2 - Second point
 * @returns {number} Distance in pixels
 */
export function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Constrain value between min and max
 * @param {number} value - Value to constrain
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Constrained value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Smooth easing function for animations
 * @param {number} t - Time parameter (0-1)
 * @returns {number} Eased value
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
