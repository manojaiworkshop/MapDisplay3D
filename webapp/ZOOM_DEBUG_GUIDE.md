# Zoom to Cursor - Debugging Guide

## What I Fixed

1. **Updated `KeyboardCameraController.jsx`**:
   - Fixed the distance calculation logic (was checking wrong distance)
   - Improved wheel event handling to compute mouse NDC from event coordinates
   - Added better logging for debugging
   - Fixed movement calculation to be proportional to distance

2. **Updated `Map3D.jsx`**:
   - Disabled MIDDLE mouse button DOLLY in OrbitControls (was conflicting)
   - Kept `enableZoom={false}` to prevent default OrbitControls zoom

## How to Test

1. **Open the app in your browser**: http://localhost:3000/

2. **Open Browser Developer Console** (F12 or right-click → Inspect → Console tab)

3. **Look for these logs when the page loads**:
   ```
   🚀 [ZoomToCursor] Component MOUNTED
   🎮 Enabled: true
   ✅ Custom zoom enabled - OrbitControls zoom disabled
   ✅ Event listeners attached (canvas + window + document) - Ready!
   📍 Test by scrolling mouse wheel over the map
   ```

4. **Hover your mouse over the 3D map and scroll the wheel**

5. **You should see logs like**:
   ```
   🔥 WHEEL EVENT RECEIVED!
   🔥 WHEEL: deltaY=100
   🎯 Mouse NDC: (0.45, -0.23)
   ✅ Ground hit at (15.2, 0.0, -8.3)
   📏 Current dist: 58.31, New dist: 55.42, Limits: [5, 100]
   🎯 Zoom IN ✅ applied! Camera: (28.5, 38.1, 28.5), Dist: 55.42
   ```

## Troubleshooting

### Issue: No logs appearing in console
**Solution**: 
- Check if the component is mounted by looking for the mount log
- Check if there are any JavaScript errors preventing the component from loading
- Verify the import is correct in Map3D.jsx

### Issue: "WHEEL EVENT RECEIVED!" appears but no zoom happens
**Possible causes**:
1. **Distance limits blocking**: Check the log line with "Current dist" and "Limits"
   - If "New dist" is outside limits, you'll see "TOO CLOSE!" or "TOO FAR!"
   - **Fix**: Adjust `minDistance` and `maxDistance` in the handleWheel function
   
2. **No ground intersection**: Look for "No ground hit, using projection"
   - This is usually fine, but might need adjustment if camera angle is extreme
   - **Fix**: The fallback projection should work in most cases

3. **Movement is too small**: The calculated movement might be too subtle
   - Look at the distance change in the logs
   - **Fix**: Increase `zoomSpeed` prop when mounting EnhancedZoomToCursor

### Issue: Zoom is too fast/slow
**Solution**: Edit Map3D.jsx line 1063:
```jsx
// Too slow? Increase zoomSpeed
<EnhancedZoomToCursor onLog={handleDebugLog} zoomSpeed={0.2} />

// Too fast? Decrease zoomSpeed  
<EnhancedZoomToCursor onLog={handleDebugLog} zoomSpeed={0.05} />
```

### Issue: Zoom doesn't follow cursor position
**Possible causes**:
1. Canvas rect not calculated correctly
2. Mouse NDC calculation is off

**Debug steps**:
- Check the "Mouse NDC" values in console (should be between -1 and 1)
- Hover at the top-left corner: NDC should be close to (-1, 1)
- Hover at the bottom-right corner: NDC should be close to (1, -1)
- Hover at the center: NDC should be close to (0, 0)

### Issue: Camera moves but in wrong direction
**Solution**: The direction calculation might need adjustment. Check:
- The ground hit position in the logs
- If ground hit is far from cursor position, the raycasting might be hitting at a weird angle

## Current Configuration

- **Zoom Speed**: 0.1 (default, adjustable via prop)
- **Min Distance from Origin**: 5 units
- **Max Distance from Origin**: 100 units
- **Target Movement Factor**: 0.3 (how much the orbit target follows the camera)
- **Ground Plane Y**: 0 (sea level)

## Next Steps if Still Not Working

1. **Share the console output**: Copy the logs and share them
2. **Check DebugOverlay**: Look at the bottom-left corner of the screen for live logs
3. **Try middle-click drag**: This should now NOT zoom (we disabled DOLLY)
4. **Try scroll wheel over different parts of the map**: Land, ocean, edges

## Files Modified

- `/home/manoj/Downloads/sample/webapp/frontend/src/components/KeyboardCameraController.jsx`
- `/home/manoj/Downloads/sample/webapp/frontend/src/components/Map3D.jsx`
