import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Helper function to convert lat/lon to 3D coordinates
const latLonToVector3 = (lat, lon, elevation = 0) => {
  const latMin = 8, latMax = 35;
  const lonMin = 68, lonMax = 97;
  const size = 100;
  
  const x = ((lon - lonMin) / (lonMax - lonMin) - 0.5) * size;
  const z = -((lat - latMin) / (latMax - latMin) - 0.5) * size;
  
  return { x, y: elevation, z };
};

// India Terrain Component - 3D extruded map
const IndiaTerrain = ({ indiaBoundary }) => {
  const geometry = useMemo(() => {
    if (!indiaBoundary || !indiaBoundary.coordinates || !indiaBoundary.coordinates[0]) {
      return new THREE.PlaneGeometry(100, 100);
    }
    
    let coords = indiaBoundary.coordinates[0];
    
    // Handle MultiPolygon - get largest polygon
    if (indiaBoundary.type === 'MultiPolygon') {
      let largestPolygon = indiaBoundary.coordinates[0][0];
      let maxPoints = largestPolygon.length;
      
      for (let i = 0; i < indiaBoundary.coordinates.length; i++) {
        const polygon = indiaBoundary.coordinates[i][0];
        if (polygon.length > maxPoints) {
          maxPoints = polygon.length;
          largestPolygon = polygon;
        }
      }
      coords = largestPolygon;
    }
    
    // Create 2D shape from boundary
    const shape = new THREE.Shape();
    coords.forEach((coord, i) => {
      const [lon, lat] = coord;
      const vec = latLonToVector3(lat, lon, 0);
      
      if (i === 0) {
        shape.moveTo(vec.x, vec.z);
      } else {
        shape.lineTo(vec.x, vec.z);
      }
    });
    
    // Extrude to create 3D map
    const extrudeSettings = {
      depth: 2.0,
      bevelEnabled: false,
      steps: 1
    };
    
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    
    // Color vertices: light green top, gray sides
    const colors = [];
    const normals = geo.attributes.normal;
    const topColor = new THREE.Color('#90EE90');
    const sideColor = new THREE.Color('#707070');
    
    for (let i = 0; i < normals.count; i++) {
      const ny = normals.getY(i);
      if (ny > 0.7) {
        colors.push(topColor.r, topColor.g, topColor.b);
      } else {
        colors.push(sideColor.r, sideColor.g, sideColor.b);
      }
    }
    
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return geo;
  }, [indiaBoundary]);
  
  return (
    <mesh geometry={geometry} position={[0, 0, 0]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.8} metalness={0} />
    </mesh>
  );
};

// India Border Outline
const IndiaBorder = ({ indiaBoundary }) => {
  const points = useMemo(() => {
    if (!indiaBoundary?.coordinates?.[0]) return [];
    
    let coords = indiaBoundary.coordinates[0];
    if (indiaBoundary.type === 'MultiPolygon') {
      coords = indiaBoundary.coordinates[0][0];
    }
    
    return coords.map(([lon, lat]) => {
      const vec = latLonToVector3(lat, lon, 2.5);
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
      <lineBasicMaterial color="#FFD700" linewidth={3} />
    </line>
  );
};

// Station Marker
const StationMarker = ({ station, onClick }) => {
  const pos = latLonToVector3(station.lat, station.lon, 3);
  
  return (
    <mesh 
      position={[pos.x, pos.y, pos.z]} 
      onClick={() => onClick?.(station)}
      castShadow
    >
      <cylinderGeometry args={[0.4, 0.4, 2]} />
      <meshStandardMaterial color="#FF0000" roughness={0.3} metalness={0.7} />
    </mesh>
  );
};

// Main Scene
const Scene = ({ stations, indiaBoundary, onStationClick }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[50, 80, 50]} intensity={1.5} castShadow color="#ffffff" />
      <directionalLight position={[-50, 60, -50]} intensity={0.6} color="#ffffff" />
      
      {/* Background */}
      <color attach="background" args={['#f5f5f5']} />
      
      {/* India Map */}
      <IndiaTerrain indiaBoundary={indiaBoundary} />
      <IndiaBorder indiaBoundary={indiaBoundary} />
      
      {/* Stations */}
      {stations.map((station, idx) => (
        <StationMarker key={idx} station={station} onClick={onStationClick} />
      ))}
    </>
  );
};

// Main Component
const Map3D = forwardRef(({ stations = [], indiaBoundary = null, onStationClick = null }, ref) => {
  useImperativeHandle(ref, () => ({
    zoomToStation: () => {},
    zoomTo: () => {},
    zoomBy: () => {},
    centerOn: () => {},
    panTo: () => {},
    gotoStation: () => {},
    zoomOut: () => {},
    resetView: () => {}
  }));
  
  return (
    <div style={{ width: '100%', height: '100%', background: '#f5f5f5' }}>
      <Canvas shadows camera={{ position: [50, 60, 50], fov: 50 }}>
        <PerspectiveCamera makeDefault position={[50, 60, 50]} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />
        <Scene stations={stations} indiaBoundary={indiaBoundary} onStationClick={onStationClick} />
      </Canvas>
    </div>
  );
});

Map3D.displayName = 'Map3D';

export default Map3D;

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars, Sky } from '@react-three/drei';
import * as THREE from 'three';

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
        color="#0066cc"
        roughness={0.2}
        metalness={0.5}
        transparent={false}
        opacity={1.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// India Terrain Component with light green land (wooden map style)
const IndiaTerrain = ({ indiaBoundary }) => {
  const meshRef = useRef();
  
  const geometry = useMemo(() => {
    if (!indiaBoundary || !indiaBoundary.coordinates || !indiaBoundary.coordinates[0]) {
      // Fallback to simple plane if no boundary data
      console.warn('No India boundary data available');
      return new THREE.PlaneGeometry(100, 100, 1, 1);
    }
    
    // Get the main boundary coordinates (first polygon)
    let coords = indiaBoundary.coordinates[0];
    
    // If it's a MultiPolygon, get the largest polygon (mainland India)
    if (indiaBoundary.type === 'MultiPolygon') {
      // Find the polygon with most points (mainland)
      let largestPolygon = indiaBoundary.coordinates[0][0];
      let maxPoints = largestPolygon.length;
      
      for (let i = 0; i < indiaBoundary.coordinates.length; i++) {
        const polygon = indiaBoundary.coordinates[i][0];
        if (polygon.length > maxPoints) {
          maxPoints = polygon.length;
          largestPolygon = polygon;
        }
      }
      coords = largestPolygon;
    }
    
    // Create 2D shape from India boundary coordinates
    const shape = new THREE.Shape();
    
    coords.forEach((coord, i) => {
      const [lon, lat] = coord;
      const vec = latLonToVector3(lat, lon, 0);
      
      if (i === 0) {
        shape.moveTo(vec.x, vec.z);
      } else {
        shape.lineTo(vec.x, vec.z);
      }
    });
    
    // Create extruded geometry with 2cm (2 units) thickness
    const extrudeSettings = {
      depth: 2.0,              // 2cm thickness
      bevelEnabled: false,     // No bevel to avoid artifacts
      steps: 1,                // Single step extrusion
      curveSegments: 12        // Smooth curves
    };
    
    const extrudedGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Rotate geometry to make it horizontal (extruded upward)
    extrudedGeometry.rotateX(-Math.PI / 2);
    
    // Remove bottom face completely by filtering out downward-facing triangles
    const positions = extrudedGeometry.attributes.position;
    const normals = extrudedGeometry.attributes.normal;
    const indices = extrudedGeometry.index;
    
    if (indices) {
      const newIndices = [];
      
      // Check each triangle face
      for (let i = 0; i < indices.count; i += 3) {
        const i1 = indices.getX(i);
        const i2 = indices.getX(i + 1);
        const i3 = indices.getX(i + 2);
        
        // Get normals for all three vertices
        const ny1 = normals.getY(i1);
        const ny2 = normals.getY(i2);
        const ny3 = normals.getY(i3);
        
        // Calculate average normal Y direction
        const avgNormalY = (ny1 + ny2 + ny3) / 3;
        
        // Only keep faces that don't point downward
        // This removes bottom cap completely
        if (avgNormalY > -0.3) {  // More aggressive threshold
          newIndices.push(i1, i2, i3);
        }
      }
      
      extrudedGeometry.setIndex(newIndices);
      extrudedGeometry.computeVertexNormals();  // Recompute normals after face removal
    }
    
    // Apply different colors to different faces (top surface vs sides)
    const colors = [];
    const positionAttr = extrudedGeometry.attributes.position;
    const normalAttr = extrudedGeometry.attributes.normal;
    
    // Light green for top surface
    // Dark gray for sides
    // Light gray for bottom (to blend with background)
    const topColor = new THREE.Color('#90EE90');     // Light green top
    const sideColor = new THREE.Color('#606060');    // Medium gray sides
    const bottomColor = new THREE.Color('#e0e0e0');  // Light gray bottom
    
    for (let i = 0; i < positionAttr.count; i++) {
      const ny = normalAttr.getY(i);
      
      // Top surface (normal points up)
      if (ny > 0.7) {
        colors.push(topColor.r, topColor.g, topColor.b);
      } 
      // Bottom surface (normal points down)
      else if (ny < -0.7) {
        colors.push(bottomColor.r, bottomColor.g, bottomColor.b);
      }
      // Sides (normal is horizontal)
      else {
        colors.push(sideColor.r, sideColor.g, sideColor.b);
      }
    }
    
    extrudedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return extrudedGeometry;
  }, [indiaBoundary]);
  
  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry} 
      position={[0, 0, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        roughness={0.7}         // Slightly smoother for better color visibility
        metalness={0.0}         // No metallic (matte finish)
        flatShading={false}
        transparent={false}
        opacity={1.0}
        vertexColors={true}     // Use vertex colors (top=light green, sides=dark gray)
        emissive="#000000"      // No emission
        emissiveIntensity={0}
        side={THREE.FrontSide}  // Only render front faces (not bottom)
      />
    </mesh>
  );
};

// India Border Outline (elevated)
const IndiaBorder = ({ indiaBoundary }) => {
  const points = useMemo(() => {
    if (!indiaBoundary || !indiaBoundary.features) return [];
    
    const borderPoints = [];
    indiaBoundary.features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates[0].forEach(coord => {
          const vec = latLonToVector3(coord[1], coord[0], 1.5);
          borderPoints.push(vec);
        });
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          polygon[0].forEach(coord => {
            const vec = latLonToVector3(coord[1], coord[0], 1.5);
            borderPoints.push(vec);
          });
        });
      }
    });
    return borderPoints;
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
      <lineBasicMaterial color="#FFD700" linewidth={5} />
    </line>
  );
};

// Railway Station Marker (3D cylinder)
const StationMarker = ({ station, onClick, isHighlighted, highlightColor }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const position = latLonToVector3(station.lat, station.lon, 2);
  
  useFrame((state) => {
    if (meshRef.current && (isHighlighted || hovered)) {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });
  
  const color = isHighlighted ? highlightColor : (hovered ? '#ffff00' : '#ff0000');
  
  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      onClick={() => onClick && onClick(station)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
    >
      <cylinderGeometry args={[0.4, 0.4, isHighlighted ? 4 : 3, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHighlighted ? 0.6 : 0.3}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
};

// Railway Track between stations
const RailwayTrack = ({ start, end }) => {
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
      <lineBasicMaterial color="#ff6600" linewidth={2} />
    </line>
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

// Dynamic Scene with day/night cycle
const Scene = ({ stations, indiaBoundary, onStationClick, tripState, highlightedStations }) => {
  const [celestialPos, setCelestialPos] = useState(getCelestialPosition());
  const [isDay, setIsDay] = useState(isDaytime());
  
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
      {/* Bright lighting for clear visibility */}
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[50, 80, 50]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        color="#ffffff"
      />
      
      {/* Additional fill light from opposite side */}
      <directionalLight
        position={[-50, 60, -50]}
        intensity={0.8}
        color="#ffffff"
      />
      
      {/* Neutral background */}
      <color attach="background" args={['#f0f0f0']} />
      
      {/* Terrain - India map only */}
      <IndiaTerrain indiaBoundary={indiaBoundary} />
      
      {/* Border */}
      <IndiaBorder indiaBoundary={indiaBoundary} />
      
      {/* Stations */}
      {stations.map((station, idx) => {
        const highlighted = highlightedStations?.find(h => h.index === idx);
        return (
          <StationMarker
            key={idx}
            station={station}
            onClick={onStationClick}
            isHighlighted={!!highlighted}
            highlightColor={highlighted?.color || '#00ff00'}
          />
        );
      })}
      
      {/* Trip Animation - Removed Railway Tracks for clean map view */}
      {tripState?.isActive && (
        <TripAnimation
          stations={stations}
          tripState={tripState}
        />
      )}
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
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    startTrip,
    stopTrip,
    // Stub methods for compatibility with 2D map
    zoomTo: () => {},
    zoomBy: () => {},
    centerOn: () => {},
    panTo: () => {},
    gotoStation: () => {},
    zoomOut: () => {},
    resetView: () => {}
  }));
  
  return (
    <div style={{ width: '100%', height: '100%', background: '#000000' }}>
      <Canvas
        shadows
        camera={{ position: [50, 60, 50], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <PerspectiveCamera makeDefault position={[50, 60, 50]} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />
        
        <Scene
          stations={stations}
          indiaBoundary={indiaBoundary}
          tripState={tripState}
          onStationClick={onStationClick}
          highlightedStations={highlightedStations}
        />
      </Canvas>
      
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
    </div>
  );
}); // First } closes arrow function body, second } with ); closes forwardRef

export default Map3D;
