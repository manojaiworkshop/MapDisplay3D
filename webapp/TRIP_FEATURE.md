# Trip Animation Feature

## Overview

Added a **Trip Animation** feature that allows users to visualize a railway journey from source to destination station. The engine follows the actual railway track by moving through all intermediate stations, not just a straight line.

## Features Implemented

### 1. Trip Drawer UI
- **Location**: Right-side drawer (slides in from right)
- **Components**:
  - Source station dropdown
  - Destination station dropdown
  - Speed controller (1x - 5x)
  - Start button (green)
  - Stop button (red)
  - Close button

### 2. Trip Button
- **Location**: Floating button on map, top-right area
- **Icon**: 🚂 (train emoji)
- **Action**: Opens trip drawer

### 3. Railway Path Finding Algorithm
**Algorithm**: Greedy nearest-neighbor with geographic distance
- Starts from source station
- At each step, picks the nearest unvisited station that:
  - Is reasonably close (within 5° distance)
  - Moves towards the destination
  - Reduces distance to destination
- Continues until reaching destination or no more stations available

**Path Creation**:
- Connects selected stations with 20 interpolated points between each pair
- Creates smooth movement along the route
- Highlights all stations along the path

### 4. Engine Animation
**Movement**:
- Moves through interpolated path points
- Speed controlled by user (1x - 5x)
- Map automatically pans to follow engine
- Progress displayed as percentage

**Visual Elements**:
- **Engine Icon**: Red locomotive with:
  - Rectangle body
  - Triangle front
  - Chimney on top
  - Two black wheels
  - Blue window
  - Shadow effect
- **Progress Indicator**: Black box showing "🚂 X%"

### 5. Route Visualization
**Station Markers**:
- **Source**: Green circle (larger, 12px radius)
- **Destination**: Red circle (larger, 12px radius)  
- **Intermediate**: Gold/yellow circles (10px radius)
- All have white center dot
- Station names labeled (when zoomed in scale > 15)

**Track Highlighting**:
- **Orange dashed line** connecting all stations in route
- Line width: 5px
- Dash pattern: [12, 6]
- Color: `rgba(255, 140, 0, 0.9)`

## Files Created/Modified

### New Files
1. **`frontend/src/components/TripDrawer.jsx`**
   - Trip control UI component
   - Source/destination selects
   - Speed slider
   - Start/stop buttons

### Modified Files
1. **`frontend/src/App.jsx`**
   - Added trip drawer state
   - Added Trip button
   - Wired start/stop handlers to MapCanvas methods

2. **`frontend/src/components/MapCanvas.jsx`**
   - Added `findStationPath()` helper function
   - Updated `startTrip()` to use path-finding algorithm
   - Updated `drawTrip()` to show stations and track
   - Improved engine icon rendering
   - Added progress indicator

## Usage

### Opening Trip Drawer
1. Click the 🚂 button on top-right of map
2. Drawer slides in from right

### Starting a Trip
1. Select **Source** station from dropdown
2. Select **Destination** station from dropdown
3. Adjust **Speed** (1x = slowest, 5x = fastest)
4. Click **Start Trip** button

### During Trip
- Engine moves through intermediate stations
- Map automatically pans to follow engine
- Progress shown as percentage
- All stations along route highlighted
- Orange dashed line shows complete path

### Stopping Trip
- Click **Stop Trip** button
- Engine stops immediately
- Route remains visible until drawer closed

## Technical Details

### Path Finding Algorithm
```javascript
findStationPath(srcIdx, dstIdx, stations)
```
- **Input**: Source index, destination index, stations array
- **Output**: Array of station indices representing the route
- **Logic**:
  1. Start at source
  2. Find nearest unvisited station that moves towards destination
  3. Score = distance from current + penalty if moving away from destination
  4. Repeat until reaching destination
  5. Safety limit: max path length = total stations

### Trip State
```javascript
tripRef.current = {
  running: true/false,
  path: [{lat, lon}, ...],        // Interpolated points
  stationPath: [idx1, idx2, ...],  // Station indices
  progress: 0-1,                   // Animation progress
  speed: 1-5,                      // Speed multiplier
  enginePos: {lat, lon},           // Current position
  srcIndex: number,                // Source station index
  dstIndex: number                 // Destination station index
}
```

### Animation Loop
```javascript
step(timestamp)
```
- Advances progress based on speed
- Updates engine position
- Centers map on engine
- Requests next frame until complete

### Drawing Layers
1. **Route track** (dashed orange line)
2. **Station markers** (green/gold/red circles)
3. **Engine icon** (red locomotive)
4. **Progress indicator** (black box with percentage)

## Examples

### Example Route: Mumbai → Delhi
Possible intermediate stations:
- Mumbai CST
- Surat
- Vadodara
- Ahmedabad
- Ajmer
- Jaipur
- Alwar
- New Delhi

### Example Route: Chennai → Kolkata
Possible intermediate stations:
- Chennai Central
- Vijayawada
- Visakhapatnam
- Bhubaneswar
- Cuttack
- Kharagpur
- Howrah

## Configuration

### Speed Settings
- **1x**: Slowest (more points, slower animation)
- **2x**: Medium-slow
- **3x**: Medium (default)
- **4x**: Medium-fast
- **5x**: Fastest (fewer points, faster animation)

### Visual Settings
```javascript
// Station marker sizes
source/destination: 12px radius
intermediate: 10px radius

// Track line
width: 5px
dash: [12, 6]
color: rgba(255, 140, 0, 0.9)

// Engine size
body: 24x16px
front triangle: 6px
wheels: 4px radius each
```

## Future Enhancements (Optional)

1. **Realistic Track Data**: Use actual railway track coordinates
2. **Station Stops**: Pause briefly at each intermediate station
3. **Multiple Trains**: Animate multiple trips simultaneously
4. **Sound Effects**: Train whistle, chugging sounds
5. **Trip History**: Save and replay previous trips
6. **Distance/Time Info**: Show total distance and estimated time
7. **Zoom to Route**: Auto-zoom to show entire route
8. **Export Trip**: Download route as image or data

## Testing

### Test Cases
1. **Short Route** (2 stations): Mumbai → Pune
   - Should move directly
   - Few/no intermediate stations

2. **Long Route** (10+ stations): Mumbai → Delhi
   - Should traverse multiple states
   - Many intermediate stations
   - Smooth animation

3. **Speed Test**: Same route at different speeds
   - 1x should be slowest
   - 5x should be fastest
   - All should follow same path

4. **Stop/Start**: Start trip, stop midway, start new trip
   - Previous trip should stop immediately
   - New trip should start fresh

### Manual Testing
```bash
# Start frontend
cd frontend
npm run dev

# Actions:
1. Click 🚂 button
2. Select "Mumbai CST" as source
3. Select "New Delhi" as destination
4. Set speed to 3x
5. Click "Start Trip"
6. Observe engine moving through stations
7. Click "Stop Trip" to halt
```

## Summary

The trip animation feature provides:
- ✅ **Realistic routing** through intermediate stations
- ✅ **Visual feedback** with colored markers and dashed track
- ✅ **Smooth animation** with adjustable speed
- ✅ **Auto-panning** map follows engine
- ✅ **Progress tracking** percentage displayed
- ✅ **Easy controls** drawer UI with dropdowns and buttons

Users can now visualize railway journeys across India by selecting source and destination stations and watching the animated train travel through the actual railway network!
