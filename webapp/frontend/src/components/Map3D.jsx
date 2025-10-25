import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { MousePositionTracker, ZoomToCursorController, LODManager, WheelZoomHandler } from './ZoomToMouseController';
import { KeyboardCameraController, EnhancedZoomToCursor } from './KeyboardCameraController';
import ZoomLevelDisplay from './ZoomLevelDisplay';
import DebugBackground, { ZoomLevelIndicator } from './DebugBackground';
import EnhancedLODManager, { LODDebugPanel, TileGrid } from './EnhancedLODManager';
import MultiLevelDataManager, { GeoJSONRenderer, DynamicAssetAnimator } from './MultiLevelDataManager';
import LocationDataPanel from './LocationDataPanel';
import { BACKEND_URL } from '../config/constants';

import DebugOverlay from './DebugOverlay';
// Get current Indian time (IST = UTC+5:30)
const getIndianTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5)); // IST offset
  return istTime.getHours() + istTime.getMinutes() / 60;
};

// Check if it's daytime in India (6 AM to 6 PM)
const isDaytime = () => {
  const hour = getIndianTime();
  return hour >= 6 && hour < 18;
};

// Get sun/moon position based on time
const getCelestialPosition = () => {
  const hour = getIndianTime();
  const isDay = hour >= 6 && hour < 18;
  
  if (isDay) {
    // Sun position (6 AM = east, 12 PM = overhead, 6 PM = west)
    const sunProgress = (hour - 6) / 12; // 0 to 1
    const angle = sunProgress * Math.PI; // 0 to PI
    return {
      x: Math.sin(angle) * 200,
      y: Math.cos(angle) * 100 + 50,
      z: -100,
      isDay: true
    };
  } else {
    // Moon position (6 PM to 6 AM)
    const nightHour = hour < 6 ? hour + 24 : hour;
    const moonProgress = (nightHour - 18) / 12;
    const angle = moonProgress * Math.PI;
    return {
      x: Math.sin(angle) * 200,
      y: Math.cos(angle) * 80 + 40,
      z: -100,
      isDay: false
    };
  }
};

// Convert lat/lon to 3D coordinates
const latLonToVector3 = (lat, lon, elevation = 0) => {
  // Normalize to 0-1 range based on India's bounds
  const minLat = 8.0;
  const maxLat = 35.0;
  const minLon = 68.0;
  const maxLon = 97.0;
  
  const x = ((lon - minLon) / (maxLon - minLon) - 0.5) * 100;
  const z = -((lat - minLat) / (maxLat - minLat) - 0.5) * 100;
  
  return new THREE.Vector3(x, elevation, z);
};

// Simple custom starfield without shader issues
const SimpleStars = ({ count = 5000, radius = 300 }) => {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count, radius]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.5} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
};

// Dotted Line Component - connects location point to data panel
const DottedLine = ({ start, end }) => {
  const lineRef = useRef();
  
  const points = useMemo(() => {
    return [
      new THREE.Vector3(start[0], start[1], start[2]),
      new THREE.Vector3(end[0], end[1], end[2])
    ];
  }, [start, end]);
  
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);
  
  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }
  }, [points]);
  
  return (
    <line ref={lineRef} geometry={lineGeometry}>
      <lineDashedMaterial
        color="#64b5f6"
        dashSize={1}
        gapSize={0.5}
        linewidth={2}
        transparent
        opacity={0.7}
      />
    </line>
  );
};

// Animated Ocean Component with waves
const Ocean = () => {
  const meshRef = useRef();
  const [time, setTime] = useState(0);
  
  useFrame((state, delta) => {
    setTime(t => t + delta);
    
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      
      // Animate waves
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        
        const wave1 = Math.sin(x * 0.3 + time) * 0.3;
        const wave2 = Math.cos(z * 0.2 + time * 0.7) * 0.2;
        const y = wave1 + wave2;
        
        positions.setY(i, y);
      }
      
      positions.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });
  
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(150, 150, 64, 64);
  }, []);
  
  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -3, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#1e88e5"
        roughness={0.3}
        metalness={0.6}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// India Terrain Component with light green land - fills ONLY India boundary
const IndiaTerrain = ({ indiaBoundary }) => {
  const meshRef = useRef();
  
  const geometry = useMemo(() => {
    // Check if we have valid boundary data
    if (!indiaBoundary) {
      console.warn('IndiaTerrain: No indiaBoundary data');
      return new THREE.PlaneGeometry(100, 100);
    }
    
    // Handle both GeoJSON Feature Collection and direct geometry
    let coordinates = null;
    
    if (indiaBoundary.features) {
      // It's a FeatureCollection - find the main polygon
      const mainFeature = indiaBoundary.features.find(f => 
        f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      
      if (mainFeature) {
        coordinates = mainFeature.geometry.coordinates;
      }
    } else if (indiaBoundary.coordinates) {
      // Direct geometry object
      coordinates = indiaBoundary.coordinates;
    }
    
    if (!coordinates) {
      console.warn('IndiaTerrain: No valid coordinates found');
      return new THREE.PlaneGeometry(100, 100);
    }
    
    // Get the first/largest polygon
    let polygonCoords = coordinates[0];
    if (Array.isArray(coordinates[0][0][0])) {
      // MultiPolygon - find largest
      let largest = coordinates[0][0];
      let maxLen = largest.length;
      
      for (let poly of coordinates) {
        if (poly[0].length > maxLen) {
          largest = poly[0];
          maxLen = largest.length;
        }
      }
      polygonCoords = largest;
    }
    
    // Reverse coordinates to match border winding order
    const reversedCoords = [...polygonCoords].reverse();
    
    const shape = new THREE.Shape();
    
    reversedCoords.forEach((coord, i) => {
      const [lon, lat] = coord;
      const vec = latLonToVector3(lat, lon, 0);
      
      if (i === 0) {
        shape.moveTo(vec.x, vec.z);
      } else {
        shape.lineTo(vec.x, vec.z);
      }
    });
    
    // Create flat geometry from shape
    const shapeGeo = new THREE.ShapeGeometry(shape);
    
    // Rotate to horizontal, then flip vertically to match border orientation
    shapeGeo.rotateX(-Math.PI / 2);
    shapeGeo.scale(1, 1, -1); // Flip along Z-axis (vertical flip)
    
    return shapeGeo;
  }, [indiaBoundary]);
  
  // Google Earth style satellite texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Create a satellite-like texture with varied terrain colors
    // Base: darker green for vegetation
    const gradient = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1024);
    gradient.addColorStop(0, '#8b9d7c');    // Center: lighter greenish-brown
    gradient.addColorStop(0.3, '#7a8a65');  // Mid: darker green
    gradient.addColorStop(0.6, '#6b7a54');  // Edge: even darker
    gradient.addColorStop(1, '#5c6b45');    // Far edge: darkest green
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 2048);
    
    // Add noise/texture for realistic satellite look
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const size = Math.random() * 3;
      const brightness = Math.random() * 40 - 20;
      ctx.fillStyle = `rgba(${100 + brightness}, ${120 + brightness}, ${80 + brightness}, 0.3)`;
      ctx.fillRect(x, y, size, size);
    }
    
    // Add subtle grid lines for tile appearance
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const pos = (i / 16) * 2048;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, 2048);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(2048, pos);
      ctx.stroke();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);
  
  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      position={[0, 0, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// India Border Outline (elevated) - MUST match IndiaTerrain exactly
const IndiaBorder = ({ indiaBoundary }) => {
  const points = useMemo(() => {
    if (!indiaBoundary) {
      console.warn('IndiaBorder: No indiaBoundary data');
      return [];
    }
    
    
    // Use EXACT same logic as IndiaTerrain
    let coordinates = null;
    
    if (indiaBoundary.features) {
      const mainFeature = indiaBoundary.features.find(f => 
        f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      if (mainFeature) {
        coordinates = mainFeature.geometry.coordinates;
      }
    } else if (indiaBoundary.coordinates) {
      coordinates = indiaBoundary.coordinates;
    }
    
    if (!coordinates) {
      console.warn('IndiaBorder: No valid coordinates');
      return [];
    }
    
    // Get the first/largest polygon (EXACT same as IndiaTerrain)
    let polygonCoords = coordinates[0];
    if (Array.isArray(coordinates[0][0][0])) {
      let largest = coordinates[0][0];
      let maxLen = largest.length;
      
      for (let poly of coordinates) {
        if (poly[0].length > maxLen) {
          largest = poly[0];
          maxLen = largest.length;
        }
      }
      polygonCoords = largest;
    }
    
    // DON'T reverse - use same order as terrain
    return polygonCoords.map(([lon, lat]) => {
      const vec = latLonToVector3(lat, lon, 0.5);
      return new THREE.Vector3(vec.x, vec.y, vec.z);
    });
  }, [indiaBoundary]);
  
  if (points.length === 0) return null;
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ffd700" linewidth={5} />
    </line>
  );
};

// Railway Station Marker (3D cylinder) with zoom-based scaling
const StationMarker = ({ station, onClick, isHighlighted, highlightColor, zoomDistance }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Place station on terrain surface (y = 0.5) - NO SCALING to keep within bounds
  const position = latLonToVector3(station.lat, station.lon, 0.5);
  
  // Calculate marker size based on zoom level (closer = bigger markers)
  const altitudeKm = zoomDistance * 220;
  const markerScale = Math.max(0.3, Math.min(2, 50 / altitudeKm));
  
  useFrame((state) => {
    if (meshRef.current && (isHighlighted || hovered)) {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });
  
  const color = isHighlighted ? highlightColor : (hovered ? '#ffff00' : '#ea4335');
  
  // Google Earth style pin: cone on top of sphere with size based on zoom
  return (
    <group
      position={[position.x, position.y, position.z]}
      onClick={() => onClick && onClick(station)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={[markerScale, markerScale, markerScale]}
    >
      {/* Pin stem/cone pointing down */}
      <mesh ref={meshRef} position={[0, 1, 0]} castShadow>
        <coneGeometry args={[0.4, 2, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.6 : 0.3}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      
      {/* Pin head/sphere on top */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.7 : 0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      {/* Shadow circle on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.3}
        />
      </mesh>
    </group>
  );
};

// Railway Track between stations (LOD: Medium zoom)
const RailwayTrack = ({ start, end, zoomDistance }) => {
  const altitudeKm = zoomDistance * 220;
  
  // Only show tracks at medium zoom (below 12000 km altitude)
  if (altitudeKm > 12000) return null;
  
  const startPos = latLonToVector3(start.lat, start.lon, 0.8);
  const endPos = latLonToVector3(end.lat, end.lon, 0.8);
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([
            startPos.x, startPos.y, startPos.z,
            endPos.x, endPos.y, endPos.z
          ])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#d84315" linewidth={2} />
    </line>
  );
};

// City markers (LOD: Close zoom 5000-1000 km)
const CityMarker = ({ lat, lon, name, zoomDistance }) => {
  const altitudeKm = zoomDistance * 220;
  
  // Only show cities at close zoom (below 5000 km)
  if (altitudeKm > 5000 || altitudeKm < 1000) return null;
  
  const position = latLonToVector3(lat, lon, 0.5);
  
  return (
    <mesh position={[position.x, position.y + 0.5, position.z]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#757575" roughness={0.7} />
    </mesh>
  );
};

// Building clusters (LOD: Very close zoom <1000 km)
const BuildingCluster = ({ lat, lon, zoomDistance }) => {
  const altitudeKm = zoomDistance * 220;
  
  // Only show buildings at very close zoom (below 1000 km)
  if (altitudeKm > 1000) return null;
  
  const position = latLonToVector3(lat, lon, 0.5);
  
  // Create small cluster of buildings
  return (
    <group position={[position.x, position.y, position.z]}>
      {[...Array(5)].map((_, i) => {
        const offsetX = (Math.random() - 0.5) * 0.5;
        const offsetZ = (Math.random() - 0.5) * 0.5;
        const height = 0.3 + Math.random() * 0.7;
        
        return (
          <mesh key={i} position={[offsetX, height / 2, offsetZ]} castShadow>
            <boxGeometry args={[0.15, height, 0.15]} />
            <meshStandardMaterial 
              color={`hsl(${200 + i * 10}, 20%, ${60 + i * 5}%)`}
              roughness={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Animated Train Engine
const TrainEngine = ({ position, rotation }) => {
  return (
    <group position={[position.x, position.y + 2, position.z]} rotation={[0, rotation, 0]}>
      {/* Main body */}
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.2, 2.5]} />
        <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 0.8, -0.5]} castShadow>
        <boxGeometry args={[1.2, 0.8, 1.5]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Chimney */}
      <mesh position={[0, 1.5, 0.8]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Wheels */}
      {[-0.8, 0, 0.8].map((z, i) => (
        <React.Fragment key={i}>
          <mesh position={[-0.6, -0.8, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0.6, -0.8, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
          </mesh>
        </React.Fragment>
      ))}
      
      {/* Headlight */}
      <pointLight position={[0, 0, 1.5]} intensity={2} distance={10} color="#ffff00" />
    </group>
  );
};

// Trip Animation Manager
const TripAnimation = ({ stations, tripState, onComplete }) => {
  const { camera } = useThree();
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  
  useFrame((state, delta) => {
    if (!tripState.isActive || !tripState.path || tripState.path.length === 0) return;
    
    const progress = tripState.progress;
    const pathLength = tripState.path.length - 1;
    const segmentIndex = Math.min(Math.floor(progress * pathLength), pathLength - 1);
    const segmentProgress = (progress * pathLength) % 1;
    
    const startStation = stations[tripState.path[segmentIndex]];
    const endStation = stations[tripState.path[Math.min(segmentIndex + 1, pathLength)]];
    
    if (!startStation || !endStation) return;
    
    const startPos = latLonToVector3(startStation.lat, startStation.lon, 0);
    const endPos = latLonToVector3(endStation.lat, endStation.lon, 0);
    
    // Interpolate position
    const pos = new THREE.Vector3().lerpVectors(startPos, endPos, segmentProgress);
    setCurrentPosition(pos);
    
    // Calculate rotation (face direction of movement)
    const angle = Math.atan2(endPos.x - startPos.x, endPos.z - startPos.z);
    setCurrentRotation(angle);
    
    // Camera follows train with smooth offset
    const cameraOffset = new THREE.Vector3(15, 20, 15);
    const targetCameraPos = pos.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(pos);
  });
  
  if (!currentPosition) return null;
  
  return <TrainEngine position={currentPosition} rotation={currentRotation} />;
};

// Sun Component
const Sun = ({ position }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });
  
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#FDB813" />
      </mesh>
      {/* Sun glow */}
      <pointLight intensity={2} color="#FDB813" distance={300} />
    </group>
  );
};

// Moon Component
const Moon = ({ position }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });
  
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshStandardMaterial color="#E8E8E8" emissive="#CCCCCC" emissiveIntensity={0.5} />
      </mesh>
      {/* Moonlight */}
      <pointLight intensity={0.5} color="#B0C4DE" distance={200} />
    </group>
  );
};

// Zoom Level Tracker Component  
const ZoomTracker = ({ onZoomChange }) => {
  const { camera } = useThree();
  
  useFrame(() => {
    // Calculate distance from camera to center (origin)
    const dist = camera.position.length();
    onZoomChange(dist);
  });
  
  return null;
};

// Camera Controller Component - smooth camera animation
const CameraController = ({ targetPosition, targetLookAt, duration = 2000, onComplete }) => {
  const { camera, gl } = useThree();
  const [animating, setAnimating] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [startTarget, setStartTarget] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const controlsRef = useRef(null);
  
  // Get controls reference on each frame
  useFrame(({ controls }) => {
    if (controls && !controlsRef.current) {
      controlsRef.current = controls;
    }
  });
  
  useEffect(() => {
    if (targetPosition) {
      const start = camera.position.clone();
      const target = new THREE.Vector3(0, 0, 0); // Default look-at center
      setStartPos(start);
      setStartTarget(target);
      setStartTime(Date.now());
      setAnimating(true);
    }
  }, [targetPosition, camera]);
  
  useFrame(() => {
    if (!animating || !startPos || !startTime) return;
    
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing function (ease-in-out)
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    // Interpolate camera position
    camera.position.lerpVectors(startPos, targetPosition, easeProgress);
    
    // Interpolate look-at target if provided
    if (targetLookAt && startTarget && controlsRef.current) {
      controlsRef.current.target.lerpVectors(startTarget, targetLookAt, easeProgress);
      controlsRef.current.update();
    }
    
    if (progress >= 1) {
      setAnimating(false);
      if (onComplete) onComplete();
    }
  });
  
  return null;
};

// Dynamic Scene with day/night cycle
const Scene = ({ 
  stations, 
  indiaBoundary, 
  onStationClick, 
  tripState, 
  highlightedStations, 
  onZoomChange, 
  zoomDistance, 
  cameraTarget, 
  onDebugLog, 
  onStationsUpdate,
  onMultiLevelDataUpdate,
  multiLevelData,
  locationDataPanels,  // Array of location panels
  mapRef  // Reference to access hideLocationData method
}) => {
  const [celestialPos, setCelestialPos] = useState(getCelestialPosition());
  const [isDay, setIsDay] = useState(isDaytime());
  
  // Local state for multi-level data within Scene
  const [sceneMultiLevelData, setSceneMultiLevelData] = useState({
    states: [],
    districts: [],
    cities: [],
    assets: []
  });
  
  // Handler for multi-level data updates within Scene
  const handleSceneMultiLevelDataUpdate = (newData, metadata) => {
    setSceneMultiLevelData(newData);
    
    // Also notify parent
    if (onMultiLevelDataUpdate) {
      onMultiLevelDataUpdate(newData, metadata);
    }
  };
  
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCelestialPos(getCelestialPosition());
      setIsDay(isDaytime());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      {/* Zoom tracker */}
      <ZoomTracker onZoomChange={onZoomChange} />
      
      {/* Enhanced LOD System with Tiles-based Zoom Levels */}
      <EnhancedLODManager 
        zoomDistance={zoomDistance || 50} 
        onStationsUpdate={onStationsUpdate}
        backendUrl={BACKEND_URL}
        debugMode={true}
      />
      
      {/* Multi-Level GeoJSON Data Manager */}
      <MultiLevelDataManager 
        zoomDistance={zoomDistance || 50}
        onDataUpdate={handleSceneMultiLevelDataUpdate}
        backendUrl={BACKEND_URL}
        debugMode={true}
      />
      
      {/* Optional: Tile Grid Visualization (for debugging) */}
      <TileGrid 
        zoomDistance={zoomDistance || 50}
        visible={false}  // Set to true to see tile grid
        opacity={0.1}
      />
      
      {/* Legacy LOD Manager (commented out - keeping for reference) */}
      {/* <LODManager 
        zoomDistance={zoomDistance || 50} 
        backendUrl={BACKEND_URL}
      /> */}
      
      {/* Camera controller for smooth movement */}
      {cameraTarget && (
        <CameraController
          targetPosition={cameraTarget.position}
          targetLookAt={cameraTarget.lookAt}
          duration={cameraTarget.duration || 2000}
      
          onComplete={cameraTarget.onComplete}
        />
      )}
      
      {/* Google Earth style lighting - softer and more natural */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight 
        args={['#e8f4ff', '#4a5f3a', 0.5]}
        position={[0, 50, 0]}
      />
      
      {/* Atmospheric sky gradient */}
      <color attach="background" args={['#d4e5f7']} />
      
      {/* Sun or Moon */}
      {isDay ? <Sun position={celestialPos} /> : <Moon position={celestialPos} />}
      
      {/* Simple starfield at night (custom implementation without shader issues) */}
      {!isDay && <SimpleStars count={5000} radius={300} />}
      
      {/* Fog for atmospheric depth */}
      <fog attach="fog" args={[isDay ? '#d4e5f7' : '#0a0a1a', 100, 300]} />
      
      {/* Google Earth style ground plane - large terrain base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial 
          color="#4a5f3a"
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      
      {/* Ocean with waves */}
      <Ocean />
      
      {/* Terrain */}
      <IndiaTerrain indiaBoundary={indiaBoundary} />
      
      {/* Border */}
      <IndiaBorder indiaBoundary={indiaBoundary} />
      
      {/* Stations */}
      {stations.map((station, idx) => {
        const highlighted = highlightedStations?.find(h => h.index === idx);
  
        return (
          <StationMarker
            key={station.code || station.name || idx}
            station={station}
            onClick={onStationClick}
            isHighlighted={!!highlighted}
            highlightColor={highlighted?.color || '#00ff00'}
            zoomDistance={zoomDistance}
          />
        );
      })}
      
      {/* Railway Tracks - LOD: Show at medium zoom (below 12000 km) */}
      {stations.map((station, idx) => {
        // Connect each station to nearest neighbors
        if (idx === stations.length - 1) return null;
        const nextStation = stations[idx + 1];
        return (
          <RailwayTrack
            key={`track-${idx}`}
            start={station}
            end={nextStation}
            zoomDistance={zoomDistance}
          />
        );
      })}
      
      {/* Cities - LOD: Show at close zoom (5000-1000 km) */}
      {stations.slice(0, 10).map((station, idx) => (
        <CityMarker
          key={`city-${idx}`}
          lat={station.lat + (Math.random() - 0.5) * 0.5}
          lon={station.lon + (Math.random() - 0.5) * 0.5}
          name={`City-${idx}`}
          zoomDistance={zoomDistance}
        />
      ))}
      
      {/* Buildings - LOD: Show at very close zoom (<1000 km) */}
      {stations.slice(0, 5).map((station, idx) => (
        <BuildingCluster
          key={`building-${idx}`}
          lat={station.lat + (Math.random() - 0.5) * 0.3}
          lon={station.lon + (Math.random() - 0.5) * 0.3}
          zoomDistance={zoomDistance}
        />
      ))}
      
      {/* Active Trip Tracks (draw tracks between stations in trip path) */}
      {tripState?.stationPath?.map((stationIdx, i) => {
        if (i === tripState.stationPath.length - 1) return null;
        const nextStationIdx = tripState.stationPath[i + 1];
        return (
          <RailwayTrack
            key={`track-${i}`}
            start={stations[stationIdx]}
            end={stations[nextStationIdx]}
          />
        );
      })}
      
      {/* Multi-Level GeoJSON Renderers - Temporarily disabled to see base map */}
      
      {/* States Renderer */}
      {/* <GeoJSONRenderer 
        data={sceneMultiLevelData?.states || []}
        dataType="states"
        zoomDistance={zoomDistance}
      /> */}
      
      {/* Districts Renderer */}
      {/* <GeoJSONRenderer 
        data={sceneMultiLevelData?.districts || []}
        dataType="districts"
        zoomDistance={zoomDistance}
      /> */}
      
      {/* Cities Renderer */}
      {/* <GeoJSONRenderer 
        data={sceneMultiLevelData?.cities || []}
        dataType="cities"  
        zoomDistance={zoomDistance}  
      /> */}
      
      {/* Dynamic Assets with Animation */}
      {/* <DynamicAssetAnimator 
        assets={sceneMultiLevelData?.assets || []}
        updateInterval={1000}
      /> */}

      {/* Trip Animation */}
      {tripState?.isActive && (
        <TripAnimation
          stations={stations}
          tripState={tripState}
        />
      )}
      
      {/* Location Data Panels - Multiple 3D-styled panels dynamically positioned */}
      {locationDataPanels.map((panel) => {
        
        if (!panel.visible || !panel.data || panel.data.length === 0 || !panel.target) {
          return null;
        }
        
        // Calculate location point position (on ground level)
        const locationVec = latLonToVector3(
          panel.target.lat, 
          panel.target.lon, 
          0  // Ground level
        );
        
        // Calculate panel position at altitude 5000 km
        const panelVec = latLonToVector3(
          panel.target.lat, 
          panel.target.lon, 
          5000 / 220  // Altitude 5000 km converted to distance units
        );
        
        const locationPoint = [locationVec.x, locationVec.y, locationVec.z];
        const panelPosition = [panelVec.x, panelVec.y, panelVec.z];
        
        
        return (
          <React.Fragment key={panel.id}>
            {/* Dotted line from location to panel */}
            <DottedLine start={locationPoint} end={panelPosition} />
            
            {/* Data panel */}
            <LocationDataPanel
              data={panel.data}
              visible={panel.visible}
              onClose={() => {
                // Call hideLocationData with panel ID
                if (mapRef.current) {
                  mapRef.current.hideLocationData(panel.id);
                }
              }}
              position={panelPosition}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}; // Close Scene component

// Main Map3D Component
const Map3D = forwardRef(({
  stations = [],
  indiaBoundary = null,
  stateBoundaries = null,
  onStationClick = null
}, ref) => {
  const [tripState, setTripState] = useState({
    isActive: false,
    path: [],
    stationPath: [],
    progress: 0,
    speed: 3.0
  });
  
  const [highlightedStations, setHighlightedStations] = useState([]);
  const animationRef = useRef(null);
  
  // Zoom state (distance from camera to center)
  const [zoomDistance, setZoomDistance] = useState(50);
  
  // Location data state for multiple panels (array of location objects)
  const [locationDataPanels, setLocationDataPanels] = useState([]);
  
  // Camera control state
  
  // Debug logs state
  const [debugLogs, setDebugLogs] = useState([]);
  
  const handleDebugLog = (log) => {
    setDebugLogs(prev => [...prev, log]);
  };
  const [cameraTarget, setCameraTarget] = useState(null);
  
  // LOD state - stations loaded from backend based on zoom level
  const [lodStations, setLodStations] = useState([]);
  const [currentLodLevel, setCurrentLodLevel] = useState(0);
  
  // Multi-level GeoJSON data state
  const [multiLevelData, setMultiLevelData] = useState({
    states: [],
    districts: [],
    cities: [],
    assets: []
  });
  
  // Use LOD stations if available, fallback to prop stations  
  const displayStations = lodStations.length > 0 ? lodStations : stations;
  
  
  // Handler for LOD station updates from backend
  const handleStationsUpdate = (newStations, metadata) => {
    
    if (newStations.length > 0) {
    }
    
    setLodStations(newStations);
    setCurrentLodLevel(metadata?.level || 0);
    
  };

  // Handler for multi-level data updates
  const handleMultiLevelDataUpdate = (newData, metadata) => {
    
    setMultiLevelData(newData);
    
  };
  
  // Helper: Find path through stations (same as 2D version)
  const findStationPath = (srcIdx, dstIdx, stations) => {
    if (srcIdx === dstIdx) return [srcIdx];
    
    const src = stations[srcIdx];
    const dst = stations[dstIdx];
    const visited = new Set([srcIdx]);
    const path = [srcIdx];
    let current = srcIdx;
    
    while (current !== dstIdx) {
      const currentStation = stations[current];
      const dstStation = stations[dstIdx];
      
      const distToDst = Math.sqrt(
        Math.pow(dstStation.lat - currentStation.lat, 2) + 
        Math.pow(dstStation.lon - currentStation.lon, 2)
      );
      
      let bestNext = -1;
      let bestScore = Infinity;
      
      for (let i = 0; i < stations.length; i++) {
        if (visited.has(i)) continue;
        
        const candidate = stations[i];
        const distFromCurrent = Math.sqrt(
          Math.pow(candidate.lat - currentStation.lat, 2) + 
          Math.pow(candidate.lon - currentStation.lon, 2)
        );
        const distCandidateToDst = Math.sqrt(
          Math.pow(dstStation.lat - candidate.lat, 2) + 
          Math.pow(dstStation.lon - candidate.lon, 2)
        );
        
        const progressScore = distCandidateToDst < distToDst ? 0 : (distCandidateToDst - distToDst) * 2;
        const score = distFromCurrent + progressScore;
        
        if (distFromCurrent < 5.0 && score < bestScore) {
          bestScore = score;
          bestNext = i;
        }
      }
      
      if (bestNext === -1 || distToDst < 2.0) {
        path.push(dstIdx);
        break;
      }
      
      visited.add(bestNext);
      path.push(bestNext);
      current = bestNext;
      
      if (path.length > stations.length) {
        path.push(dstIdx);
        break;
      }
    }
    
    return path;
  };
  
  // Start trip animation
  const startTrip = ({ source, destination, speed = 3.0 }) => {
    const srcIdx = stations.findIndex(s => 
      s.name.toLowerCase().includes(source.toLowerCase()) || 
      s.code?.toLowerCase() === source.toLowerCase()
    );
    const dstIdx = stations.findIndex(s => 
      s.name.toLowerCase().includes(destination.toLowerCase()) || 
      s.code?.toLowerCase() === destination.toLowerCase()
    );
    
    if (srcIdx === -1 || dstIdx === -1) {
      console.warn('Trip start failed: stations not found', source, destination);
      return;
    }
    
    const stationPath = findStationPath(srcIdx, dstIdx, stations);
    
    // Highlight stations along route
    const highlighted = stationPath.map((idx, i) => ({
      index: idx,
      color: i === 0 ? '#00ff00' : (i === stationPath.length - 1 ? '#ff0000' : '#ffd700')
    }));
    
    setHighlightedStations(highlighted);
    setTripState({
      isActive: true,
      path: stationPath,
      stationPath: stationPath,
      progress: 0,
      speed: speed
    });
    
    // Animation loop
    const animate = () => {
      setTripState(prev => {
        if (!prev.isActive) return prev;
        
        const newProgress = prev.progress + (0.001 * prev.speed);
        
        if (newProgress >= 1.0) {
          return { ...prev, isActive: false, progress: 1.0 };
        }
        
        return { ...prev, progress: newProgress };
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };
  
  // Stop trip animation
  const stopTrip = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setTripState(prev => ({ ...prev, isActive: false }));
    setHighlightedStations([]);
  };
  
  // Camera movement methods
  const moveCamera = ({ direction, distance = 10, duration = 2000 }) => {
    // Get current camera position (we'll use a default position for now)
    const currentPos = new THREE.Vector3(30, 40, 30); // Default camera position
    let newPos = currentPos.clone();
    
    switch(direction?.toLowerCase()) {
      case 'left':
        newPos.x -= distance;
        break;
      case 'right':
        newPos.x += distance;
        break;
      case 'up':
        newPos.y += distance;
        break;
      case 'down':
        newPos.y -= distance;
        break;
      case 'forward':
        newPos.z -= distance;
        break;
      case 'backward':
        newPos.z += distance;
        break;
      default:
        console.warn('⚠️ Unknown direction:', direction);
        return;
    }
    
    setCameraTarget({
      position: newPos,
      lookAt: new THREE.Vector3(0, 0, 0),
      duration,
      onComplete: () => {
        setCameraTarget(null);
      }
    });
  };
  
  const gotoLocation = ({ lat, lon, altitude = 50, duration = 2000 }) => {
    const targetPos = latLonToVector3(lat, lon, 0);
    const cameraPos = new THREE.Vector3(
      targetPos.x,
      altitude,
      targetPos.z + altitude * 0.5
    );
    
    
    setCameraTarget({
      position: cameraPos,
      lookAt: new THREE.Vector3(targetPos.x, 0, targetPos.z),
      duration,
      onComplete: () => {
        setCameraTarget(null);
      }
    });
  };
  
  const gotoStation = ({ stationName, altitude = 30, duration = 2000 }) => {
    const station = stations.find(s => 
      s.name.toLowerCase().includes(stationName.toLowerCase()) ||
      s.code?.toLowerCase() === stationName.toLowerCase()
    );
    
    if (!station) {
      console.warn('⚠️ Station not found:', stationName);
      return;
    }
    
    gotoLocation({ lat: station.lat, lon: station.lon, altitude, duration });
  };
  
  const moveCameraByOffset = ({ x = 0, y = 0, z = 0, duration = 2000 }) => {
    const currentPos = new THREE.Vector3(30, 40, 30);
    const newPos = new THREE.Vector3(
      currentPos.x + x,
      currentPos.y + y,
      currentPos.z + z
    );
    
    setCameraTarget({
      position: newPos,
      lookAt: new THREE.Vector3(0, 0, 0),
      duration,
      onComplete: () => setCameraTarget(null)
    });
  };
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    startTrip,
    stopTrip,
    moveCamera,
    gotoLocation,
    gotoStation,
    moveCameraByOffset,
    // New methods for location data panel
    showLocationData: (data, targetLatLon, altitude = 17000) => {
      
      // Create new panel with unique ID
      const newPanel = {
        id: Date.now(), // Unique ID based on timestamp
        visible: true,
        data: data,
        target: targetLatLon,
        altitude: altitude,
        locationName: data[0]?.name || targetLatLon?.name || 'Location'
      };
      
      // Add new panel to array (don't replace existing ones)
      setLocationDataPanels(prev => [...prev, newPanel]);
      
      
      // Animate camera to view the table from close distance
      if (targetLatLon && targetLatLon.lat && targetLatLon.lon) {
        // Calculate panel position in 3D space (5000 km altitude)
        const panelVec = latLonToVector3(
          targetLatLon.lat, 
          targetLatLon.lon, 
          5000 / 220  // Altitude 5000 km converted to distance units
        );
        
        // Position camera much further back from the table for better view
        // Increase distance to 15 units for slightly farther view
        const cameraDistance = 15; // 15 distance units back
        
        const cameraPos = new THREE.Vector3(
          panelVec.x,
          panelVec.y, // Same height as table
          panelVec.z + cameraDistance // Move back significantly along Z-axis
        );
        
        
        // Use direct camera positioning instead of gotoLocation
        setCameraTarget({
          position: cameraPos,
          lookAt: panelVec, // Look directly at the table position
          duration: 2000,
          onComplete: () => {
            setCameraTarget(null);
          }
        });
      }
    },
    hideLocationData: (panelId) => {
      // Remove specific panel by ID
      setLocationDataPanels(prev => prev.filter(panel => panel.id !== panelId));
    },
    viewLocationTable: (locationName, duration = 2000) => {
      
      // Find panel by location name (case-insensitive partial match)
      const locationLower = locationName.toLowerCase();
      const panel = locationDataPanels.find(p => 
        p.locationName?.toLowerCase().includes(locationLower) ||
        p.target?.name?.toLowerCase().includes(locationLower) ||
        p.data?.some(d => d.name?.toLowerCase().includes(locationLower))
      );
      
      if (!panel) {
        console.warn('⚠️ [Map3D] No open table found for location:', locationName);
        return;
      }
      
      
      // Calculate panel position
      const panelVec = latLonToVector3(
        panel.target.lat,
        panel.target.lon,
        5000 / 220
      );
      
      // Position camera 15 units back from the table
      const cameraDistance = 15;
      const cameraPos = new THREE.Vector3(
        panelVec.x,
        panelVec.y,
        panelVec.z + cameraDistance
      );
      
      
      // Animate camera to table
      setCameraTarget({
        position: cameraPos,
        lookAt: panelVec,
        duration: duration,
        onComplete: () => {
          setCameraTarget(null);
        }
      });
    },
    // Stub methods for compatibility with 2D map
    zoomTo: () => {},
    zoomBy: () => {},
    centerOn: () => {},
    panTo: () => {},
    zoomOut: () => {},
    resetView: () => {}
  }));
  
  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a' }}>
      <Canvas
        shadows
        camera={{ position: [30, 40, 30], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        <PerspectiveCamera makeDefault position={[30, 40, 30]} />
        <OrbitControls
          makeDefault              // Make controls available to useThree() hook
          enableDamping
          dampingFactor={0.05}
          minDistance={0.045}    // 10 km (0.045 * 220 ≈ 10 km)
          maxDistance={150}      // 33,000 km (150 * 220 = 33,000 km)
          maxPolarAngle={Math.PI / 2.2}
          enableZoom={false}     // Disable OrbitControls zoom - we handle it with cursor position
        />
        
        {/* Keyboard Camera Controller - Arrow keys + U/D for elevation */}
        <KeyboardCameraController moveSpeed={0.5} enabled={true} />
        
        {/* Enhanced Zoom to Cursor - Zoom toward mouse position */}
        <EnhancedZoomToCursor enabled={true} zoomSpeed={0.3} />
        
        <Scene
          stations={displayStations}
          indiaBoundary={indiaBoundary}
          tripState={tripState}  
          onStationClick={onStationClick}
          highlightedStations={highlightedStations}
          zoomDistance={zoomDistance}
          onZoomChange={setZoomDistance}
          cameraTarget={cameraTarget}
          onStationsUpdate={handleStationsUpdate}
          onMultiLevelDataUpdate={handleMultiLevelDataUpdate}
          multiLevelData={multiLevelData}
          locationDataPanels={locationDataPanels}
          mapRef={ref}
        />
      </Canvas>
      
      {/* Debug Background - Changes color based on zoom level */}
      <DebugBackground 
        zoomDistance={zoomDistance} 
        enabled={true}
        opacity={0.03}
      />
      
      {/* Enhanced Zoom Level Display - bottom right */}
      <ZoomLevelDisplay 
        zoomDistance={zoomDistance}
        showDebug={true}
        position="bottom-right"
      />
      
      {/* Zoom Level Indicator Bar - left side */}
      <ZoomLevelIndicator 
        zoomDistance={zoomDistance}
        position="left"
        showLabel={true}
      />
      
      {/* LOD Debug Panel - top left (optional, can be toggled) */}
      <LODDebugPanel 
        zoomDistance={zoomDistance}
        stations={displayStations}
        position="top-left"
      />
      
      {/* Progress indicator */}
      {tripState.isActive && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          🚂 Journey Progress: {Math.round(tripState.progress * 100)}%
        </div>
      )}
      
      {/* Debug Overlay */}
      <DebugOverlay logs={debugLogs} maxLogs={15} />
    </div>
  );
}); // First } closes arrow function body, second } with ); closes forwardRef

export default Map3D;
