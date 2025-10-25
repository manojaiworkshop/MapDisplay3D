import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Aircraft3D, FlightTrail, FlightLabel } from './AssetComponents';

/**
 * Flight Simulator Component
 * Animates aircraft along configured route with realistic physics
 */
export const FlightSimulator = ({ route, enabled = true, speedMultiplier = 100 }) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentRotation, setCurrentRotation] = useState(new THREE.Euler(0, 0, 0));
  const [trailPoints, setTrailPoints] = useState([]);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentAltitude, setCurrentAltitude] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  
  const startTimeRef = useRef(Date.now());
  const lastPositionRef = useRef(null);

  // Convert lat/lon to 3D world coordinates - SAME as Map3D
  const latLonToVector3 = (lat, lon, altitude = 0) => {
    // Use SAME projection as Map3D - flat map focused on India bounds
    const minLat = 8.0;
    const maxLat = 35.0;
    const minLon = 68.0;
    const maxLon = 97.0;
    
    const x = ((lon - minLon) / (maxLon - minLon) - 0.5) * 100;
    const z = -((lat - minLat) / (maxLat - minLat) - 0.5) * 100;
    const y = altitude / 220; // Convert meters to Three.js units (220m = 1 unit)
    
    return new THREE.Vector3(x, y, z);
  };

  // Calculate rotation to face direction of travel
  const calculateRotation = (from, to) => {
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const euler = new THREE.Euler();
    
    // Calculate heading (yaw)
    const heading = Math.atan2(direction.x, direction.z);
    
    // Calculate pitch based on altitude change
    const horizontalDistance = Math.sqrt(direction.x ** 2 + direction.z ** 2);
    const pitch = Math.atan2(direction.y, horizontalDistance);
    
    euler.set(pitch, heading, 0, 'YXZ');
    return euler;
  };

  // Interpolate between waypoints using Catmull-Rom spline
  const interpolateWaypoint = (waypoints, t) => {
    const numPoints = waypoints.length;
    const scaledT = t * (numPoints - 1);
    const index = Math.floor(scaledT);
    const localT = scaledT - index;

    if (index >= numPoints - 1) {
      const lastWp = waypoints[numPoints - 1];
      return {
        position: latLonToVector3(lastWp.lat, lastWp.lon, lastWp.altitude),
        speed: lastWp.speed,
        altitude: lastWp.altitude,
        action: lastWp.action || 'cruise'
      };
    }

    const wp1 = waypoints[Math.max(0, index - 1)];
    const wp2 = waypoints[index];
    const wp3 = waypoints[index + 1];
    const wp4 = waypoints[Math.min(numPoints - 1, index + 2)];

    // Catmull-Rom spline interpolation
    const t2 = localT * localT;
    const t3 = t2 * localT;

    const pos1 = latLonToVector3(wp1.lat, wp1.lon, wp1.altitude);
    const pos2 = latLonToVector3(wp2.lat, wp2.lon, wp2.altitude);
    const pos3 = latLonToVector3(wp3.lat, wp3.lon, wp3.altitude);
    const pos4 = latLonToVector3(wp4.lat, wp4.lon, wp4.altitude);

    const position = new THREE.Vector3();
    position.x = 0.5 * (
      (2 * pos2.x) +
      (-pos1.x + pos3.x) * localT +
      (2 * pos1.x - 5 * pos2.x + 4 * pos3.x - pos4.x) * t2 +
      (-pos1.x + 3 * pos2.x - 3 * pos3.x + pos4.x) * t3
    );
    position.y = 0.5 * (
      (2 * pos2.y) +
      (-pos1.y + pos3.y) * localT +
      (2 * pos1.y - 5 * pos2.y + 4 * pos3.y - pos4.y) * t2 +
      (-pos1.y + 3 * pos2.y - 3 * pos3.y + pos4.y) * t3
    );
    position.z = 0.5 * (
      (2 * pos2.z) +
      (-pos1.z + pos3.z) * localT +
      (2 * pos1.z - 5 * pos2.z + 4 * pos3.z - pos4.z) * t2 +
      (-pos1.z + 3 * pos2.z - 3 * pos3.z + pos4.z) * t3
    );

    // Interpolate other properties
    const speed = THREE.MathUtils.lerp(wp2.speed, wp3.speed, localT);
    const altitude = THREE.MathUtils.lerp(wp2.altitude, wp3.altitude, localT);
    const action = localT < 0.5 ? (wp2.action || 'cruise') : (wp3.action || 'cruise');

    return { position, speed, altitude, action };
  };

  // Animation loop
  useFrame((state, delta) => {
    if (!enabled || !route || !route.waypoints || route.waypoints.length < 2) return;

    const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
    const totalDuration = route.waypoints.length * 30 / speedMultiplier; // Adjust based on speed multiplier
    
    let t = (elapsed % totalDuration) / totalDuration;
    
    // Apply simulation loop
    if (route.simulation?.loop && t >= 1) {
      t = 0;
      startTimeRef.current = Date.now();
      setTrailPoints([]);
    }

    const interpolated = interpolateWaypoint(route.waypoints, t);
    
    // Update state
    setCurrentPosition(interpolated.position);
    setCurrentSpeed(interpolated.speed);
    setCurrentAltitude(interpolated.altitude);
    setCurrentAction(interpolated.action);
    setProgress(t);

    // Calculate rotation
    if (lastPositionRef.current) {
      const rotation = calculateRotation(lastPositionRef.current, interpolated.position);
      setCurrentRotation(rotation);
    }
    lastPositionRef.current = interpolated.position.clone();

    // Update trail
    setTrailPoints(prev => {
      const maxTrailLength = 50;
      const newTrail = [...prev, interpolated.position.clone()];
      return newTrail.length > maxTrailLength 
        ? newTrail.slice(-maxTrailLength) 
        : newTrail;
    });
  });

  if (!enabled || !currentPosition) return null;

  const { aircraft, departure, arrival } = route;

  return (
    <group>
      {/* Aircraft model */}
      <Aircraft3D
        position={currentPosition}
        rotation={currentRotation}
        color={aircraft.color || '#FFFFFF'}
        scale={0.3}
        type={aircraft.type}
      />

      {/* Flight trail */}
      {trailPoints.length > 1 && (
        <FlightTrail
          points={trailPoints}
          color={aircraft.color || '#00FFFF'}
          opacity={0.6}
        />
      )}

      {/* Flight label */}
      <FlightLabel
        position={currentPosition}
        registration={aircraft.registration}
        altitude={currentAltitude}
        speed={currentSpeed}
        action={currentAction}
      />
    </group>
  );
};

export default FlightSimulator;
