import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BACKEND_URL } from '../config/constants';

/**
 * Mouse Position Tracker with 3D Raycasting
 */
export const MousePositionTracker = ({ onMousePosition, onMouseMove2D }) => {
  const { camera, gl, raycaster } = useThree();
  const [mouse2D, setMouse2D] = useState(new THREE.Vector2());
  
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      
      // Normalized device coordinates (-1 to +1)
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      setMouse2D(new THREE.Vector2(x, y));
      
      if (onMouseMove2D) {
        onMouseMove2D({ x, y, screenX: event.clientX, screenY: event.clientY });
      }
      
      // Raycast to terrain plane (y=0)
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const terrainPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      
      raycaster.ray.intersectPlane(terrainPlane, intersectPoint);
      
      if (intersectPoint && onMousePosition) {
        onMousePosition(intersectPoint);
      }
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [camera, gl, raycaster, onMousePosition, onMouseMove2D]);
  
  return null;
};

/**
 * Smart Camera Controller with Zoom-to-Cursor
 */
export const ZoomToCursorController = ({ 
  mousePosition, 
  enabled = true,
  lerpSpeed = 0.1 
}) => {
  const { camera, controls } = useThree();
  const targetRef = useRef(new THREE.Vector3());
  const isMovingRef = useRef(false);
  const startTimeRef = useRef(0);
  const durationRef = useRef(400);
  
  useFrame((state, delta) => {
    if (!enabled || !isMovingRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / durationRef.current, 1);
    
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    
    camera.position.lerp(targetRef.current, eased * lerpSpeed);
    
    if (controls) {
      controls.target.lerp(new THREE.Vector3(
        targetRef.current.x,
        0,
        targetRef.current.z
      ), eased * lerpSpeed * 0.5);
      controls.update();
    }
    
    if (progress >= 1) {
      isMovingRef.current = false;
    }
  });
  
  useEffect(() => {
    if (mousePosition && enabled) {
      const currentDist = camera.position.distanceTo(controls?.target || new THREE.Vector3(0, 0, 0));
      
      const direction = new THREE.Vector3()
        .subVectors(mousePosition, camera.position)
        .normalize();
      
      const newPos = camera.position.clone().add(
        direction.multiplyScalar(currentDist * 0.2)
      );
      
      targetRef.current.copy(newPos);
      isMovingRef.current = true;
      startTimeRef.current = Date.now();
      
    }
  }, [mousePosition, enabled, camera, controls]);
  
  return null;
};

/**
 * LOD Manager - fetches stations based on zoom
 */
export const LODManager = ({ 
  zoomDistance, 
  onStationsUpdate,
  backendUrl = BACKEND_URL
}) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastLevelRef = useRef(-1);
  
  const getLODLevel = (dist) => {
    const km = dist * 220;
    
    if (km > 5000) return 0;
    if (km > 1000) return 1;
    if (km > 200) return 2;
    return 3;
  };
  
  useEffect(() => {
    const newLevel = getLODLevel(zoomDistance);
    const km = Math.round(zoomDistance * 220);
    
    
    setCurrentLevel(newLevel);
    
    if (newLevel !== lastLevelRef.current && newLevel >= 0) {
      lastLevelRef.current = newLevel;
      fetchStationsForLevel(newLevel);
    }
  }, [zoomDistance]);
  
  const fetchStationsForLevel = async (level) => {
    setIsLoading(true);
    
    
    try {
      const response = await fetch(`${backendUrl}/api/stations/level/${level}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      
      if (onStationsUpdate) {
        onStationsUpdate(data.stations || [], level);
      }
      
    } catch (error) {
      console.error('❌ [LOD] Fetch error:', error);
      console.error('❌ [LOD] Details:', {
        message: error.message,
        level,
        url: `${backendUrl}/api/stations/level/${level}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return null;
};

/**
 * Wheel Event Handler
 */
export const WheelZoomHandler = ({ onZoomStart }) => {
  const { gl } = useThree();
  
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleWheel = (event) => {
      const zoomDirection = event.deltaY > 0 ? 'out' : 'in';
      const delta = Math.abs(event.deltaY);
      
      
      if (onZoomStart) {
        onZoomStart({
          direction: zoomDirection,
          delta,
          event
        });
      }
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: true });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [gl, onZoomStart]);
  
  return null;
};
