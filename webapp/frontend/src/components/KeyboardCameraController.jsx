import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Keyboard Camera Controller
 * 
 * Controls:
 * - Arrow Left: Move camera left
 * - Arrow Right: Move camera right  
 * - Arrow Up: Move camera forward
 * - Arrow Down: Move camera backward
 * - U key: Move camera up (elevation)
 * - D key: Move camera down (elevation)
 * 
 * Movement is relative to camera's current orientation
 */
export const KeyboardCameraController = ({ 
  moveSpeed = 0.5,      // Movement speed multiplier
  enabled = true 
}) => {
  const { camera, controls } = useThree();
  const keysPressed = useRef({});
  const velocityRef = useRef(new THREE.Vector3());
  
  // Log component mount
  useEffect(() => {
    return () => {
    };
  }, []);
  
  useEffect(() => {
    if (!enabled) {
      console.warn('⚠️ [KeyboardCameraController] DISABLED - enabled=false');
      return;
    }
    
    
    const handleKeyDown = (event) => {
      
      // Prevent default for arrow keys to avoid page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
      
      // Handle Shift+D and Shift+U for camera up/down
      if (event.shiftKey && (event.key === 'd' || event.key === 'D')) {
        event.preventDefault();
        keysPressed.current['Shift+D'] = true;
        return;
      }
      if (event.shiftKey && (event.key === 'u' || event.key === 'U')) {
        event.preventDefault();
        keysPressed.current['Shift+U'] = true;
        return;
      }
      
      keysPressed.current[event.key] = true;
      
      // Log current state
    };
    
    const handleKeyUp = (event) => {
      
      // Handle Shift+D and Shift+U release
      if (event.key === 'd' || event.key === 'D') {
        keysPressed.current['Shift+D'] = false;
      }
      if (event.key === 'u' || event.key === 'U') {
        keysPressed.current['Shift+U'] = false;
      }
      if (event.key === 'Shift') {
        // Release both when Shift is released
        keysPressed.current['Shift+D'] = false;
        keysPressed.current['Shift+U'] = false;
      }
      
      keysPressed.current[event.key] = false;
    };
    
    // Add listeners to window
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [enabled]);
  
  useFrame((state, delta) => {
    if (!enabled) return;
    
    const keys = keysPressed.current;
    const velocity = velocityRef.current;
    
    // Check if any keys are pressed
    const anyKeyPressed = Object.values(keys).some(v => v);
    
    if (anyKeyPressed && Math.random() < 0.1) { // Log 10% of frames when keys pressed
    }
    
    // Reset velocity
    velocity.set(0, 0, 0);
    
    // Calculate movement based on pressed keys
    const speed = moveSpeed * delta * 100; // Increased multiplier for better responsiveness
    
    // Get camera's direction vectors
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(forward);
    forward.y = 0; // Keep movement on horizontal plane for forward/back
    forward.normalize();
    
    right.crossVectors(camera.up, forward).normalize();
    
    // Forward/Backward (Arrow Up/Down)
    if (keys['ArrowUp']) {
      velocity.add(forward.clone().multiplyScalar(speed));
    }
    if (keys['ArrowDown']) {
      velocity.add(forward.clone().multiplyScalar(-speed));
    }
    
    // Left/Right (Arrow Left/Right)  
    if (keys['ArrowLeft']) {
      velocity.add(right.clone().multiplyScalar(speed));
    }
    if (keys['ArrowRight']) {
      velocity.add(right.clone().multiplyScalar(-speed));
    }
    
    // Up/Down elevation (Shift+U/Shift+D keys)
    if (keys['Shift+U']) {
      velocity.y += speed;
    }
    if (keys['Shift+D']) {
      velocity.y -= speed;
    }
    
    // Apply velocity to camera position
    if (velocity.length() > 0) {
      const oldPos = camera.position.clone();
      camera.position.add(velocity);
      
      
      // Update OrbitControls target to follow camera (keep same relative position)
      if (controls && controls.target) {
        const oldTarget = controls.target.clone();
        // Only move target horizontally, keep Y at 0
        controls.target.add(new THREE.Vector3(velocity.x, 0, velocity.z));
        controls.update();
        
      } else {
        console.warn('⚠️ [KeyboardCameraController] Controls or target not available!');
      }
    }
  });
  
  return null;
};

/**
 * Enhanced Zoom to Cursor Controller
 * Zooms camera toward wherever the mouse cursor is positioned
 * Since OrbitControls zoom is disabled, we handle zoom ourselves
 */
export const EnhancedZoomToCursor = ({
  enabled = true,
  zoomSpeed = 0.1,  // How much to move toward cursor per wheel tick
  onLog = null  // Callback to send logs to UI
}) => {
  const { camera, controls, gl } = useThree();
  const mousePositionRef = useRef(new THREE.Vector2());
  
  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    if (onLog) {
      onLog({ message, type, time: timestamp });
    }
  };
  
  // Log component mount
  useEffect(() => {
    log('🚀 [ZoomToCursor] Component MOUNTED', 'success');
    log(`🎮 Enabled: ${enabled}`, 'info');
    return () => {
      log('💀 [ZoomToCursor] Component UNMOUNTED', 'warn');
    };
  }, []);
  
  useEffect(() => {
    if (!enabled) {
      log('⚠️ [ZoomToCursor] DISABLED', 'warn');
      return;
    }
    
    if (!controls || !gl || !gl.domElement) {
      log('❌ [ZoomToCursor] Controls/GL/Canvas not available yet!', 'error');
      return;
    }
    
    const canvas = gl.domElement;
    log('✅ Custom zoom enabled - OrbitControls zoom disabled', 'success');
    
    // Track mouse position
    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      
      // Convert to normalized device coordinates (-1 to +1)
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      mousePositionRef.current.set(ndcX, ndcY);
    };
    
    // Handle zoom (wheel event) - we control zoom completely
    const handleWheel = (event) => {
      log('🔥🔥🔥 WHEEL EVENT RECEIVED!!! 🔥🔥🔥', 'success');
      
      // CRITICAL: Prevent default FIRST before anything else
      event.preventDefault();
      event.stopPropagation();
      
      // Compute NDC using event coordinates (fallback to stored mousePositionRef)
      const rect = canvas.getBoundingClientRect();
      let clientX = event.clientX;
      let clientY = event.clientY;
      
      if (typeof clientX === 'number' && typeof clientY === 'number') {
        // Use event coordinates directly
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
        mousePositionRef.current.set(ndcX, ndcY);
        log(`� Mouse at: clientX=${clientX}, clientY=${clientY}, NDC=(${ndcX.toFixed(2)}, ${ndcY.toFixed(2)})`, 'info');
      }
      
      if (!controls) {
        log('❌ No controls available!', 'error');
        return;
      }
      
      const deltaY = event.deltaY;
      log(`🔥 WHEEL: deltaY=${deltaY}`, 'info');
      
      // Raycast from camera through cursor
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mousePositionRef.current, camera);
      
      log(`🎯 Mouse NDC: (${mousePositionRef.current.x.toFixed(2)}, ${mousePositionRef.current.y.toFixed(2)})`, 'info');
      
      // Intersect ground plane (y=0) first
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
      
      let targetPoint;
      if (hit) {
        targetPoint = intersectPoint.clone();
        log(`✅ Ground hit at (${targetPoint.x.toFixed(2)}, ${targetPoint.y.toFixed(2)}, ${targetPoint.z.toFixed(2)})`, 'success');
      } else {
        // fallback: project ray to a reasonable distance
        const fallbackDist = 50;
        targetPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(fallbackDist));
        log(`⚠️ No ground hit, using projection at ${fallbackDist}`, 'warn');
      }
      
      if (!targetPoint) return;
      
      // Vector from camera to the target point
      const camToTarget = new THREE.Vector3().subVectors(targetPoint, camera.position);
      const distanceToPoint = camToTarget.length();
      if (distanceToPoint === 0) return;
      const dir = camToTarget.normalize();
      
      // Determine zoom direction: wheel deltaY < 0 => zoom in (move toward target)
      const zoomIn = deltaY < 0;
      
      // Normalize wheel delta so fast wheels don't jump too much
      const deltaNorm = Math.min(1, Math.abs(deltaY) / 100);
      
      // Compute movement magnitude proportional to distanceToPoint
      // zoomSpeed controls fraction of distance moved per wheel notch
      const movementMag = distanceToPoint * (zoomSpeed * 0.5) * deltaNorm;
      
      // Compute signed move
      const signedMove = (zoomIn ? 1 : -1) * movementMag;
      
      // New camera position candidate
      const movement = dir.clone().multiplyScalar(signedMove);
      const newCamPos = camera.position.clone().add(movement);
      
      // Check distance constraints - use distance from origin (scene center)
      // Use OrbitControls values directly - they're already in scene units
      const minDistance = controls.minDistance !== undefined ? controls.minDistance : 0.5;
      const maxDistance = controls.maxDistance !== undefined ? controls.maxDistance : 150;
      
      const newDistFromOrigin = newCamPos.length(); // Distance from (0,0,0)
      
      log(`📏 Current dist: ${camera.position.length().toFixed(2)}, New dist: ${newDistFromOrigin.toFixed(2)}, Min: ${minDistance}, Max: ${maxDistance}`, 'info');
      
      // Only check if we're going WAY out of bounds - be permissive
      if (newDistFromOrigin < minDistance) {
        log(`⚠️ Hit minDistance (${minDistance}) - TOO CLOSE!`, 'warn');
        return;
      }
      if (newDistFromOrigin > maxDistance) {
        log(`⚠️ Hit maxDistance (${maxDistance}) - TOO FAR!`, 'warn');
        return;
      }
      
      // Apply movement: move camera toward targetPoint
      camera.position.copy(newCamPos);
      
      // Move target a bit so the camera seems to zoom toward the cursor point
      if (controls && controls.target) {
        const targetMove = movement.clone().multiplyScalar(0.3); // Reduced from 0.5 for more stability
        controls.target.add(targetMove);
        // Keep target near ground
        controls.target.y = THREE.MathUtils.clamp(controls.target.y, -5, 5);
        controls.update();
      }
      
      log(`🎯 Zoom ${zoomIn ? 'IN ✅' : 'OUT ✅'} applied! Camera: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}), Dist: ${newDistFromOrigin.toFixed(2)}`, 'success');
    };
    
    // Add event listeners with CAPTURE phase to intercept before OrbitControls
    canvas.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    // Try multiple strategies to ensure our handler runs first
    // 1. Capture phase on canvas
    canvas.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    // 2. Also add to window as backup
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    // 3. Add to document as another backup
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    log('✅ Event listeners attached (canvas + window + document) - Ready!', 'success');
    log('📍 Test by scrolling mouse wheel over the map', 'info');
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('wheel', handleWheel, { capture: true });
      document.removeEventListener('wheel', handleWheel, { capture: true });
      log('🛑 Event listeners removed', 'warn');
    };
  }, [enabled, camera, gl, controls, zoomSpeed]);
  
  return null;
};
