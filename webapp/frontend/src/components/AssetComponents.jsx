import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';

/**
 * Airport Boundary Component
 * Renders airport perimeter from GeoJSON polygon
 */
export const AirportBoundary = ({ coordinates, name, color = '#FFD700', opacity = 0.3 }) => {
  const latLonToVector3 = (lat, lon, elevation = 0) => {
    // Use SAME projection as Map3D - flat map focused on India bounds
    const minLat = 8.0;
    const maxLat = 35.0;
    const minLon = 68.0;
    const maxLon = 97.0;
    
    const x = ((lon - minLon) / (maxLon - minLon) - 0.5) * 100;
    const z = -((lat - minLat) / (maxLat - minLat) - 0.5) * 100;
    
    return new THREE.Vector3(x, elevation, z);
  };

  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  const points = coordinates[0].map(([lon, lat]) => latLonToVector3(lat, lon, 0.1));
  
  
  const shape = new THREE.Shape();
  points.forEach((point, i) => {
    if (i === 0) {
      shape.moveTo(point.x, point.z);
    } else {
      shape.lineTo(point.x, point.z);
    }
  });

  return (
    <group>
      {/* Airport boundary fill */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.1, 0]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Airport boundary line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, 0.15, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>
      
      {/* Airport name label */}
      {name && (
        <Text
          position={[points[0].x, 3, points[0].z]}
          fontSize={2}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      )}
    </group>
  );
};

/**
 * ATC Tower Component - Enhanced with Zoom Scaling
 * Renders control tower at specified position with proper real-world scaling
 */
export const ATCTower = ({ lat, lon, height, name, frequency, scaleFactor = 1 }) => {
  const latLonToVector3 = (lat, lon, elevation = 0) => {
    // Use SAME projection as Map3D - flat map focused on India bounds
    const minLat = 8.0;
    const maxLat = 35.0;
    const minLon = 68.0;
    const maxLon = 97.0;
    
    const x = ((lon - minLon) / (maxLon - minLon) - 0.5) * 100;
    const z = -((lat - minLat) / (maxLat - minLat) - 0.5) * 100;
    
    return new THREE.Vector3(x, elevation, z);
  };

  const position = latLonToVector3(lat, lon, 0.5); // Place on terrain surface
  
  // Real-world scaling: height in meters to Three.js units
  // 1 Three.js unit = 220km, so 1m = 1/220000 units
  // But we need it visible, so we use a reasonable scale factor
  const realHeight = (height || 80) / 220000; // Convert meters to Three.js units  
  const visualHeight = Math.max(0.1, realHeight * 10000); // Make it visible (min 0.1 units)
  

  return (
    <group position={position} scale={[scaleFactor, scaleFactor, scaleFactor]}>
      {/* Tower base */}
      <mesh position={[0, visualHeight * 0.35, 0]}>
        <cylinderGeometry args={[0.2, 0.3, visualHeight * 0.7, 8]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      
      {/* Control room */}
      <mesh position={[0, visualHeight * 0.75, 0]}>
        <cylinderGeometry args={[0.3, 0.2, visualHeight * 0.3, 8]} />
        <meshStandardMaterial color="#1E90FF" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Antenna */}
      <mesh position={[0, visualHeight * 0.95, 0]}>
        <cylinderGeometry args={[0.02, 0.02, visualHeight * 0.2, 4]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Flashing beacon light */}
      <pointLight
        position={[0, towerHeight * 0.8, 0]}
        color="#FF0000"
        intensity={1}
        distance={5}
      />
      
      {/* Tower label */}
      <Text
        position={[0, visualHeight + 0.5, 0]}
        fontSize={0.5}
        color="#FFFF00"
        anchorX="center"
        anchorY="bottom"
      >
        {name || 'ATC'}
        {frequency && `\n${frequency} MHz`}
      </Text>
    </group>
  );
};

/**
 * Aircraft 3D Model Component
 * Renders a simplified 3D aircraft model
 */
export const Aircraft3D = ({ 
  position, 
  rotation, 
  color = '#FFFFFF', 
  scale = 1,
  type = 'boeing_737'
}) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Fuselage */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 2, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* Nose cone */}
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.15, 0.4, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[0, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[3, 0.05, 0.6]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Winglets */}
      <mesh position={[1.5, -0.2, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.3, 0.05, 0.2]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-1.5, -0.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.3, 0.05, 0.2]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Tail */}
      <mesh position={[0, -1.0, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Horizontal stabilizer */}
      <mesh position={[0, -0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.2, 0.05, 0.3]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Engines */}
      <mesh position={[0.8, -0.3, -0.3]}>
        <cylinderGeometry args={[0.12, 0.15, 0.6, 16]} />
        <meshStandardMaterial color="#404040" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.8, -0.3, -0.3]}>
        <cylinderGeometry args={[0.12, 0.15, 0.6, 16]} />
        <meshStandardMaterial color="#404040" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Navigation lights */}
      <pointLight position={[1.5, -0.2, 0]} color="#00FF00" intensity={0.5} distance={2} />
      <pointLight position={[-1.5, -0.2, 0]} color="#FF0000" intensity={0.5} distance={2} />
      <pointLight position={[0, -1.3, 0]} color="#FFFFFF" intensity={0.3} distance={2} />
    </group>
  );
};

/**
 * Flight Path Trail Component
 */
export const FlightTrail = ({ points, color = '#00FFFF', opacity = 0.5 }) => {
  if (!points || points.length < 2) return null;

  const positions = new Float32Array(points.flatMap(p => [p.x, p.y, p.z]));

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        linewidth={2}
      />
    </line>
  );
};

/**
 * Flight Label Component
 * Shows flight info above aircraft
 */
export const FlightLabel = ({ position, registration, altitude, speed, action }) => {
  return (
    <Text
      position={[position.x, position.y + 0.5, position.z]}
      fontSize={0.25}
      color="#00FFFF"
      anchorX="center"
      anchorY="bottom"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {`${registration}\n${Math.round(altitude)}m\n${Math.round(speed)} kts\n${action}`}
    </Text>
  );
};

export default {
  AirportBoundary,
  ATCTower,
  Aircraft3D,
  FlightTrail,
  FlightLabel
};
