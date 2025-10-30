/**
 * Application Configuration Constants
 * Centralized configuration for the Railway Map Application
 */

// Backend API Configuration
export const BACKEND_URL = "http://192.168.1.2:8091";

// API Endpoints
export const API_ENDPOINTS = {
  LOCATION: (locationName) => `${BACKEND_URL}/api/location/${locationName}`,
  CHAT: `${BACKEND_URL}/api/chat`,
  STATIONS: `${BACKEND_URL}/api/stations`,
  LOD_STATIONS: (level) => `${BACKEND_URL}/api/stations/lod/${level}`,
  STATES: `${BACKEND_URL}/api/geojson/states`,
  DISTRICTS: `${BACKEND_URL}/api/geojson/districts`,
  CITIES: `${BACKEND_URL}/api/geojson/cities`,
};

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 50,
  MIN_ZOOM: 0.045,  // 10 km
  MAX_ZOOM: 150,    // 33,000 km
  DEFAULT_CAMERA_POSITION: [30, 40, 30],
  DEFAULT_FOV: 60,
};

// Location Data Panel Configuration
export const PANEL_CONFIG = {
  DEFAULT_ALTITUDE: 5000,  // km
  CAMERA_DISTANCE: 15,     // distance units
  ANIMATION_DURATION: 2000, // ms
  PANEL_WIDTH_RATIO: 0.8,  // 80% of screen width
  PANEL_MAX_HEIGHT: 600,   // px
};

// India Geographic Bounds
export const INDIA_BOUNDS = {
  MIN_LAT: 8.0,
  MAX_LAT: 35.0,
  MIN_LON: 68.0,
  MAX_LON: 97.0,
};

// LOD Levels Configuration
export const LOD_LEVELS = {
  VERY_FAR: { min: 100, max: Infinity, name: "Very Far" },
  FAR: { min: 50, max: 100, name: "Far" },
  MEDIUM: { min: 20, max: 50, name: "Medium" },
  CLOSE: { min: 5, max: 20, name: "Close" },
  VERY_CLOSE: { min: 0, max: 5, name: "Very Close" },
};

export default {
  BACKEND_URL,
  API_ENDPOINTS,
  MAP_CONFIG,
  PANEL_CONFIG,
  INDIA_BOUNDS,
  LOD_LEVELS,
};
