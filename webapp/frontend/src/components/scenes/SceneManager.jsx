import React, { useEffect, useState } from 'react';
import { BACKEND_URL } from '../../config/constants';

/**
 * SceneManager - Fetches and manages 3D scenes from backend
 * Automatically loads scenes based on camera position and zoom
 */
export const useSceneManager = (cameraPosition, zoomLevel) => {
  const [scenes, setScenes] = useState([]);
  const [activeScenes, setActiveScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all scenes on mount
  useEffect(() => {
    const fetchScenes = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/scenes`);
        const data = await response.json();
        setScenes(data.scenes || []);
      } catch (err) {
        console.error('Failed to fetch scenes:', err);
        setError(err);
      }
    };

    fetchScenes();
  }, []);

  // Check which scenes should be active based on camera position and zoom
  useEffect(() => {
    if (!cameraPosition || scenes.length === 0) return;

    const checkActiveScenes = () => {
      const active = scenes.filter(scene => {
        const { lat, lon } = scene.location;
        const { minZoom, maxZoom, radius } = scene.trigger || {};

        // Calculate distance from camera to scene
        const latDiff = Math.abs(cameraPosition.lat - lat);
        const lonDiff = Math.abs(cameraPosition.lon - lon);
        const distanceKm = Math.sqrt(latDiff ** 2 + lonDiff ** 2) * 111; // Rough approximation

        // Check if within radius (convert meters to km)
        const radiusKm = (radius || 1000) / 1000;
        const withinRadius = distanceKm <= radiusKm;

        // Check zoom level (smaller zoomLevel = more zoomed in)
        // zoomLevel is the distance from camera to center
        const withinZoom = zoomLevel <= (maxZoom || 100) && zoomLevel >= (minZoom || 0);

        const isActive = withinRadius && withinZoom;
        
        // Debug logging
        if (scene.id === 'mumbai-metro-station-1') {
          console.log('🎬 Mumbai Metro Scene Check:', {
            cameraPos: cameraPosition,
            scenePos: { lat, lon },
            distanceKm: distanceKm.toFixed(3),
            radiusKm: radiusKm.toFixed(3),
            withinRadius,
            zoomLevel,
            minZoom: minZoom || 0,
            maxZoom: maxZoom || 100,
            withinZoom,
            isActive
          });
        }

        return isActive;
      });

      setActiveScenes(active);
    };

    checkActiveScenes();
  }, [cameraPosition, zoomLevel, scenes]);

  // Fetch scenes at a specific location
  const fetchScenesAtLocation = async (lat, lon, zoom) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/scenes/at-location?lat=${lat}&lon=${lon}&zoom=${zoom}`
      );
      const data = await response.json();
      return data.scenes || [];
    } catch (err) {
      console.error('Failed to fetch scenes at location:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific scene by ID
  const fetchScene = async (sceneId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scenes/${sceneId}`);
      return await response.json();
    } catch (err) {
      console.error(`Failed to fetch scene ${sceneId}:`, err);
      return null;
    }
  };

  return {
    scenes,
    activeScenes,
    loading,
    error,
    fetchScenesAtLocation,
    fetchScene
  };
};

/**
 * SceneDebugPanel - Shows active scenes for debugging
 */
export const SceneDebugPanel = ({ activeScenes, loading, error, cameraPosition, zoomDistance }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Safe check for activeScenes
  const scenes = activeScenes || [];
  const sceneCount = scenes.length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition z-50"
      >
        🎬 Scenes ({sceneCount})
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-md z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Active 3D Scenes</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {/* Camera Info */}
      {cameraPosition && (
        <div className="mb-3 text-xs bg-gray-100 p-2 rounded">
          <div>📍 Camera: {cameraPosition.lat?.toFixed(4)}°N, {cameraPosition.lon?.toFixed(4)}°E</div>
          <div>🔍 Zoom: {zoomDistance?.toFixed(2)}</div>
        </div>
      )}
      
      {/* Loading/Error States */}
      {loading && (
        <div className="text-blue-600 text-sm mb-2">🔄 Loading scenes...</div>
      )}
      {error && (
        <div className="text-red-600 text-sm mb-2">❌ Error: {error}</div>
      )}

      {sceneCount === 0 ? (
        <p className="text-gray-500 text-sm">
          No scenes active at this location/zoom level.
          <br />
          Try zooming closer to Mumbai (19.12°N, 72.85°E)!
        </p>
      ) : (
        <div className="space-y-3">
          {scenes.map(scene => (
            <div key={scene.id} className="border border-gray-200 rounded p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{scene.name}</h4>
                  <p className="text-xs text-gray-600">{scene.type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {scene.location.lat.toFixed(4)}, {scene.location.lon.toFixed(4)}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Active"></div>
              </div>
              
              <div className="mt-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Objects:</span>
                  <span className="font-medium">{scene.objects?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lights:</span>
                  <span className="font-medium">{scene.lighting?.point_lights?.length || 0} point</span>
                </div>
              </div>

              {scene.description && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  {scene.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 Scenes load automatically when you zoom to their location
        </p>
      </div>
    </div>
  );
};

export default useSceneManager;
