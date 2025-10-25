# Zoom to Cursor Position - Fix Summary

## Problem
The 3D map was not able to zoom in/out at the cursor position. The zoom functionality wasn't working at all.

## Root Causes Identified

1. **Event Propagation Issues**: Wheel events might be blocked or consumed by OrbitControls before reaching our custom handler
2. **Insufficient Event Interception**: Need to capture events at multiple levels (canvas, window, document) to ensure our handler runs first
3. **Ray Intersection Logic**: The raycasting to find the cursor's 3D position needed improvement
4. **Distance Calculation**: The zoom constraints were too restrictive and the zoom factor calculation needed refinement

## Changes Made

### 1. Enhanced Event Handling (`KeyboardCameraController.jsx`)

**Before:**
```jsx
canvas.addEventListener('wheel', handleWheel, { passive: false, capture: true });
```

**After:**
```jsx
// Multiple event listeners to ensure capture
canvas.addEventListener('wheel', handleWheel, { passive: false, capture: true });
window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
document.addEventListener('wheel', handleWheel, { passive: false, capture: true });

// In handleWheel:
event.stopImmediatePropagation(); // Added to stop ALL other handlers
```

### 2. Improved Zoom Logic (`KeyboardCameraController.jsx`)

**Key Improvements:**

1. **Better Raycasting with Fallback**:
   ```jsx
   // Try ground plane intersection first
   const hasGroundIntersection = raycaster.ray.intersectPlane(groundPlane, intersectPoint);
   
   if (!hasGroundIntersection) {
     // Fallback: project ray at fixed distance
     targetPoint = raycaster.ray.origin.clone().add(
       raycaster.ray.direction.clone().multiplyScalar(rayDistance)
     );
   }
   ```

2. **Dynamic Zoom Factor**:
   ```jsx
   // Zoom speed adapts to current distance
   const currentDist = camera.position.length();
   const baseZoomFactor = Math.max(0.5, Math.min(5.0, currentDist * 0.1));
   const zoomFactor = (zoomIn ? baseZoomFactor : -baseZoomFactor);
   ```

3. **Smoother Camera Movement**:
   ```jsx
   // Lerp for smooth interpolation
   camera.position.lerp(newCameraPos, 0.8);
   
   // Target moves less than camera for proper zoom effect
   const targetMovement = movement.clone().multiplyScalar(0.5);
   controls.target.add(targetMovement);
   ```

4. **Relaxed Distance Constraints**:
   ```jsx
   const minDistance = 0.5;  // Increased from 0.023 for more accessible zoom
   const maxDistance = 100;  // Keep max at 100
   ```

5. **Target Clamping**:
   ```jsx
   // Keep target near ground level
   controls.target.y = THREE.MathUtils.clamp(controls.target.y, -2, 2);
   ```

### 3. OrbitControls Configuration (`Map3D.jsx`)

Enhanced to completely disable built-in zoom:

```jsx
<OrbitControls
  enableDamping
  dampingFactor={0.05}
  minDistance={0.023}
  maxDistance={100}
  maxPolarAngle={Math.PI / 2.2}
  enableKeys={false}
  enableZoom={false}       // Disable zoom
  zoomSpeed={0}            // Extra: set speed to 0
  enablePan={true}
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }}
/>
```

## How It Works Now

1. **User scrolls mouse wheel** over the map
2. **Event is captured** by our handlers (at canvas/window/document level)
3. **Mouse position is tracked** in normalized device coordinates (NDC)
4. **Raycaster projects** from camera through mouse position
5. **Intersection calculated** with ground plane (or fallback projection)
6. **Direction determined** from camera to target point
7. **Camera moves** along this direction (with dynamic zoom factor)
8. **Controls target updated** proportionally to maintain view stability
9. **Smooth interpolation** applied for better UX

## Expected Behavior

- ✅ **Zoom In**: Scroll wheel up - camera moves toward cursor position
- ✅ **Zoom Out**: Scroll wheel down - camera moves away from cursor position  
- ✅ **Dynamic Speed**: Zoom speed adapts to current altitude (faster when far, slower when close)
- ✅ **Smooth Motion**: Interpolation prevents jerky movement
- ✅ **Distance Limits**: Respects min/max zoom levels
- ✅ **Target Stability**: OrbitControls target moves with camera to maintain view

## Testing

1. Start the frontend: `cd webapp/frontend && npm run dev`
2. Open browser and navigate to the 3D map
3. Move mouse over different parts of the map
4. Scroll mouse wheel up/down
5. Check debug overlay (bottom-left) for logs
6. Verify camera zooms toward cursor position

## Debug Overlay

The debug overlay (bottom-left corner) shows:
- 🔥 Wheel events received
- 🎯 Mouse NDC coordinates
- ✅ Ground intersection points
- 📏 Distance calculations
- 🎯 Zoom direction (in/out)
- 📍 Camera position updates
- 🎪 Target position updates

## Files Modified

1. `/webapp/frontend/src/components/KeyboardCameraController.jsx`
   - Enhanced `handleWheel` function
   - Added multiple event listener strategies
   - Improved raycasting and zoom logic
   - Added dynamic zoom factor calculation
   - Added smooth interpolation

2. `/webapp/frontend/src/components/Map3D.jsx`
   - Updated OrbitControls configuration
   - Added explicit mouseButtons mapping
   - Set zoomSpeed to 0

## Notes

- The debug overlay is helpful for troubleshooting
- Logs show exactly what's happening during zoom
- If zoom still doesn't work, check browser console for errors
- Ensure no other components are interfering with wheel events
