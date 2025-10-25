import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getTileConfig, getZoomLevelFromDistance } from '../utils/zoomLevels';
import { BACKEND_URL } from '../config/constants';

/**
 * MultiLevelDataManager - Manages loading and rendering of multi-level GeoJSON data
 * Handles states, districts, cities, and dynamic assets based on zoom levels
 */
const MultiLevelDataManager = ({ 
  zoomDistance, 
  onDataUpdate,
  backendUrl = BACKEND_URL,
  debugMode = false
}) => {
  const [currentZoomLevel, setCurrentZoomLevel] = useState(5);
  const [loadedData, setLoadedData] = useState({
    states: [],
    districts: [],
    cities: [],
    assets: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchedZoom = useRef(-1);
  const fetchTimeouts = useRef({});

  // Update zoom level when distance changes
  useEffect(() => {
    if (!zoomDistance) return;

    const levelData = getZoomLevelFromDistance(zoomDistance);
    setCurrentZoomLevel(levelData.level);


    // Only fetch if zoom level changed significantly (reduced from 0.5 to 0.3 for more responsive updates)
    const zoomDiff = Math.abs(levelData.level - lastFetchedZoom.current);
    if (zoomDiff > 0.3 || lastFetchedZoom.current === -1) {
      lastFetchedZoom.current = levelData.level;
      fetchAllData(levelData.level);
    } else {
    }
  }, [zoomDistance, backendUrl]);

  const fetchAllData = async (zoomLevel) => {
    setLoading(true);
    setError(null);

    try {

      // Determine what data to fetch based on zoom level
      const dataTypes = getDataTypesForZoom(zoomLevel);
      const promises = [];

      // Fetch each data type
      for (const dataType of dataTypes) {
        promises.push(fetchDataType(dataType, zoomLevel));
      }

      const results = await Promise.allSettled(promises);
      const newData = { states: [], districts: [], cities: [], assets: [] };

      results.forEach((result, index) => {
        const dataType = dataTypes[index];
        if (result.status === 'fulfilled') {
          newData[dataType] = result.value;
        } else {
          console.error(`❌ [MultiLevel] Failed to fetch ${dataType}:`, result.reason);
        }
      });

      setLoadedData(newData);

      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate(newData, {
          zoomLevel,
          dataTypes,
          totalFeatures: Object.values(newData).reduce((sum, arr) => sum + arr.length, 0)
        });
      }


    } catch (error) {
      console.error('❌ [MultiLevel] Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataType = async (dataType, zoomLevel) => {
    try {
      const response = await fetch(`${backendUrl}/api/geojson/${dataType}/zoom/${zoomLevel}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.features || data.assets || [];
    } catch (error) {
      console.error(`❌ [MultiLevel] Error fetching ${dataType}:`, error);
      return [];
    }
  };

  const getDataTypesForZoom = (zoomLevel) => {
    const types = [];


    // States: show at medium to far zoom levels
    if (zoomLevel >= 5) {
      types.push('states');
    }

    // Districts: show at close to medium zoom levels  
    if (zoomLevel >= 2 && zoomLevel <= 20) {
      types.push('districts');
    }

    // Cities: show at ALL zoom levels to ensure visibility
    types.push('cities');

    // Assets: show at ALL zoom levels (they should be visible everywhere)
    types.push('assets');

    return types;
  };

  // This component doesn't render anything - it's a data manager
  return null;
};

/**
 * GeoJSONRenderer - Renders different types of GeoJSON data
 */
export const GeoJSONRenderer = ({ 
  data, 
  dataType, 
  zoomDistance,
  onFeatureClick 
}) => {
  const levelData = getZoomLevelFromDistance(zoomDistance || 5);


  if (!data || data.length === 0) {
    return null;
  }

  return (
    <group name={`${dataType}-group`}>
      {data.map((feature, index) => (
        <GeoJSONFeature 
          key={`${dataType}-${index}`}
          feature={feature}
          dataType={dataType}
          zoomLevel={levelData.level}
          onClick={onFeatureClick}
        />
      ))}
    </group>
  );
};

/**
 * Individual GeoJSON Feature Renderer  
 */
const GeoJSONFeature = ({ feature, dataType, zoomLevel, onClick }) => {
  const props = feature.properties || {};
  const geometry = feature.geometry;

  if (!geometry) return null;

  // Get position from geometry
  const getPosition = () => {
    if (geometry.type === 'Point') {
      const [lon, lat] = geometry.coordinates;
      return latLonToVector3(lat, lon);
    }
    return [0, 0, 0];
  };

  // Convert lat/lon to 3D coordinates (same as in Map3D)
  const latLonToVector3 = (lat, lon, elevation = 0) => {
    const minLat = 8.0, maxLat = 35.0;
    const minLon = 68.0, maxLon = 97.0;
    
    const x = ((lon - minLon) / (maxLon - minLon) - 0.5) * 100;
    const z = -((lat - minLat) / (maxLat - minLat) - 0.5) * 100;
    
    // Add elevation for different asset types
    let assetElevation = elevation;
    if (props.type === 'drone') assetElevation = 5;
    else if (props.type === 'aircraft') assetElevation = 15;
    else if (props.type === 'vehicle') assetElevation = 1;
    else if (props.type === 'train') assetElevation = 0.5;
    
    return [x, assetElevation, z];
  };

  const position = getPosition();
  const color = props.color || '#ffffff';
  // Make assets much larger and scale with zoom level
  let baseSize = (props.size || 1) * 2; // Increase base size
  
  // Scale assets based on zoom level - bigger at far zoom levels
  if (zoomLevel >= 20) baseSize *= 5; // Very far zoom
  else if (zoomLevel >= 10) baseSize *= 3; // Far zoom  
  else if (zoomLevel >= 5) baseSize *= 2; // Medium zoom
  
  const size = baseSize;

  // Get geometry shape based on asset type
  const getAssetGeometry = (assetType) => {
    switch (assetType) {
      case 'drone':
        return <octahedronGeometry args={[size, 0]} />;
      case 'aircraft':
        return <coneGeometry args={[size, size * 2, 3]} />;
      case 'vehicle':
        return <boxGeometry args={[size * 1.5, size * 0.5, size]} />;
      case 'train':
        return <cylinderGeometry args={[size * 0.5, size * 0.5, size * 3]} />;
      default:
        return <sphereGeometry args={[size, 8, 8]} />;
    }
  };

  // Render based on geometry type
  if (geometry.type === 'Point') {
    const isAsset = props.type && ['drone', 'aircraft', 'vehicle', 'train'].includes(props.type);
    
    return (
      <group>
        {/* Main mesh - assets get special geometry, others get spheres */}
        <mesh 
          position={position}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(feature, dataType);
          }}
        >
          {isAsset ? getAssetGeometry(props.type) : <sphereGeometry args={[size, 8, 8]} />}
          <meshStandardMaterial 
            color={color}
            emissive={isAsset ? color : '#000000'}
            emissiveIntensity={isAsset ? 0.5 : 0}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
        
        {/* Add glowing halo for assets */}
        {isAsset && (
          <>
            <mesh position={position}>
              <sphereGeometry args={[size * 2, 8, 8]} />
              <meshStandardMaterial 
                color={color}
                transparent={true}
                opacity={0.2}
                emissive={color}
                emissiveIntensity={0.1}
              />
            </mesh>
            <pointLight position={position} color={color} intensity={0.5} distance={size * 10} />
          </>
        )}
        
        {/* Asset label/name for close zoom levels */}
        {zoomLevel <= 10 && isAsset && props.name && (
          <mesh position={[position[0], position[1] + size + 2, position[2]]}>
            <planeGeometry args={[size * 4, size]} />
            <meshStandardMaterial 
              color="#000000"
              transparent={true}
              opacity={0.8}
            />
            {/* Text would need a text geometry or HTML overlay */}
          </mesh>
        )}
      </group>
    );
  }

  // For Polygon/LineString geometries - render as wireframe
  if (geometry.type === 'Polygon' || geometry.type === 'LineString') {
    const coordinates = geometry.type === 'Polygon' ? 
      geometry.coordinates[0] : geometry.coordinates;
    
    const points = coordinates.map(([lon, lat]) => {
      const [x, y, z] = latLonToVector3(lat, lon, 0.1);
      return new THREE.Vector3(x, y, z);
    });

    return (
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            count={points.length}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color={color} 
          linewidth={props.border_width || 1}
        />
      </line>
    );
  }

  return null;
};

/**
 * Dynamic Asset Animator - Handles movement of dynamic assets
 */
export const DynamicAssetAnimator = ({ 
  assets, 
  updateInterval = 1000,
  onAssetUpdate 
}) => {
  const [animatedAssets, setAnimatedAssets] = useState([]);
  const animationRef = useRef();

  useEffect(() => {
    setAnimatedAssets(assets.map(asset => ({
      ...asset,
      currentPosition: asset.geometry.coordinates,
      lastUpdate: Date.now()
    })));
  }, [assets]);

  useEffect(() => {
    const animate = () => {
      setAnimatedAssets(prevAssets => 
        prevAssets.map(asset => {
          const props = asset.properties;
          if (!props.movement || !props.movement.can_move) return asset;

          const now = Date.now();
          if (now - asset.lastUpdate < updateInterval) return asset;

          // Update position based on movement pattern
          const newPosition = updateAssetPosition(asset);
          
          return {
            ...asset,
            currentPosition: newPosition,
            lastUpdate: now,
            geometry: {
              ...asset.geometry,
              coordinates: newPosition
            }
          };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [updateInterval]);

  const updateAssetPosition = (asset) => {
    const props = asset.properties;
    const movement = props.movement;
    const [currentLon, currentLat] = asset.currentPosition;

    switch (movement.movement_pattern) {
      case 'patrol':
        return updatePatrolPosition(asset);
      case 'direct':
        return updateDirectPosition(asset);
      case 'road_patrol':
        return updateRoadPatrolPosition(asset);
      default:
        return asset.currentPosition;
    }
  };

  const updatePatrolPosition = (asset) => {
    const movement = asset.properties.movement;
    const waypoints = movement.waypoints;
    const currentWP = movement.current_waypoint || 0;
    const target = waypoints[currentWP];
    
    const [currentLon, currentLat] = asset.currentPosition;
    const [targetLon, targetLat] = target;
    
    const speed = movement.speed || 0.001;
    const newLon = currentLon + (targetLon - currentLon) * speed;
    const newLat = currentLat + (targetLat - currentLat) * speed;
    
    // Check if reached waypoint
    const distance = Math.sqrt(Math.pow(targetLon - newLon, 2) + Math.pow(targetLat - newLat, 2));
    if (distance < 0.001) {
      movement.current_waypoint = (currentWP + 1) % waypoints.length;
    }
    
    return [newLon, newLat];
  };

  const updateDirectPosition = (asset) => {
    const movement = asset.properties.movement;
    const startPoint = movement.start_point;
    const endPoint = movement.end_point;
    const progress = movement.current_progress || 0;
    const speed = movement.speed || 0.001;
    
    const newProgress = Math.min(1, progress + speed);
    movement.current_progress = newProgress;
    
    const [startLon, startLat] = startPoint;
    const [endLon, endLat] = endPoint;
    
    const newLon = startLon + (endLon - startLon) * newProgress;
    const newLat = startLat + (endLat - startLat) * newProgress;
    
    return [newLon, newLat];
  };

  const updateRoadPatrolPosition = (asset) => {
    // Simple road patrol - similar to patrol but with road constraints
    return updatePatrolPosition(asset);
  };

  return (
    <GeoJSONRenderer 
      data={animatedAssets}
      dataType="assets"
      zoomDistance={5}
    />
  );
};

export default MultiLevelDataManager;