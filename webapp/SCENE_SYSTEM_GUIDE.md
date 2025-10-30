# 3D Scene Rendering System

## Overview

The 3D Scene Rendering System allows you to render complex 3D scenes (metro stations, airports, landmarks) at specific geographic locations. Scenes automatically load when the camera zooms to the specified location.

## Features

- **Auto-loading**: Scenes load automatically based on camera position and zoom level
- **Procedural Fallbacks**: If 3D models are not found, procedural geometry is generated
- **Scene Components**: Platform, Track, Train, Escalator, ElectricPole, Building, Canopy
- **Animations**: Trains oscillate, escalators move
- **Debug Panel**: Real-time display of active scenes

## Architecture

### Backend (`/webapp/backend/`)

**Scene Data**: `/data/scenes.json`
```json
{
  "scenes": [
    {
      "id": "mumbai-metro-andheri",
      "name": "Mumbai Metro - Andheri Station",
      "type": "metro_station",
      "location": {
        "latitude": 19.1197,
        "longitude": 72.8464,
        "altitude": 0
      },
      "trigger": {
        "radius": 500,
        "minZoom": 0.5,
        "maxZoom": 50
      },
      "objects": [...],
      "lighting": {...}
    }
  ]
}
```

**API Endpoints**:
- `GET /api/scenes` - List all scenes
- `GET /api/scenes/{scene_id}` - Get specific scene
- `GET /api/scenes/at-location?lat=X&lon=Y&zoom=Z` - Find scenes near location

### Frontend (`/webapp/frontend/src/components/`)

**SceneRenderer** (`scenes/SceneRenderer.jsx`):
- Renders individual scene objects using Three.js geometries
- Supports procedural fallbacks for all object types
- Handles animations (trains, escalators)

**SceneManager** (`scenes/SceneManager.jsx`):
- `useSceneManager(cameraPosition, zoomLevel)` hook
- Fetches scenes from backend
- Determines which scenes are active based on camera position
- `SceneDebugPanel` component shows active scenes

**Map3D Integration** (`Map3D.jsx`):
- `CameraPositionTracker` converts 3D camera position to lat/lon
- Calls `useSceneManager` to get active scenes
- Renders active scenes inside Three.js Canvas

## Usage

### 1. Create a New Scene

Edit `/webapp/backend/data/scenes.json`:

```json
{
  "id": "delhi-airport",
  "name": "Indira Gandhi International Airport",
  "type": "airport",
  "location": {
    "latitude": 28.5562,
    "longitude": 77.1000,
    "altitude": 0
  },
  "trigger": {
    "radius": 1000,
    "minZoom": 0.5,
    "maxZoom": 50
  },
  "objects": [
    {
      "id": "terminal1",
      "type": "building",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [100, 30, 50],
      "color": "#cccccc",
      "model": "/models/buildings/terminal.glb"
    }
  ],
  "lighting": {
    "ambient": { "intensity": 0.4 },
    "directional": {
      "intensity": 0.8,
      "position": [100, 200, 100]
    }
  }
}
```

### 2. Add 3D Models (Optional)

Place GLB/GLTF models in `/webapp/frontend/public/models/`:
- `/models/trains/metro_train.glb`
- `/models/buildings/station.glb`
- `/models/infrastructure/escalator.glb`

If models are not found, procedural geometry is used automatically.

### 3. Test the Scene

1. Start the backend:
```bash
cd /media/manoj/DriveData5/MapDisplay3D/webapp/backend
source mapenv/bin/activate
python main.py
```

2. Start the frontend:
```bash
cd /media/manoj/DriveData5/MapDisplay3D/webapp/frontend
npm run dev
```

3. Open browser to `http://localhost:5173`

4. Navigate to the scene location:
   - For Mumbai Metro: lat=19.1197, lon=72.8464
   - Zoom in to trigger range (0.5-50)

5. Watch the scene load automatically!

### 4. Debug

Enable the Scene Debug Panel in the UI:
- Shows camera position (lat/lon)
- Lists active scenes
- Displays object and light counts
- Shows loading/error states

## Scene Object Types

### Platform
```json
{
  "type": "platform",
  "position": [x, y, z],
  "scale": [width, height, depth],
  "color": "#808080"
}
```

### Track
```json
{
  "type": "track",
  "position": [x, y, z],
  "rotation": [rx, ry, rz],
  "scale": [length, 1, 1],
  "color": "#555555"
}
```

### Train
```json
{
  "type": "train",
  "position": [x, y, z],
  "rotation": [rx, ry, rz],
  "scale": [length, height, width],
  "color": "#0066cc",
  "model": "/models/trains/metro.glb"
}
```

### Escalator
```json
{
  "type": "escalator",
  "position": [x, y, z],
  "rotation": [rx, ry, rz],
  "scale": [width, length, 1],
  "color": "#666666"
}
```

### Electric Pole
```json
{
  "type": "electric_pole",
  "position": [x, y, z],
  "scale": [1, height, 1],
  "color": "#444444"
}
```

### Building
```json
{
  "type": "building",
  "position": [x, y, z],
  "rotation": [rx, ry, rz],
  "scale": [width, height, depth],
  "color": "#cccccc",
  "model": "/models/buildings/station.glb"
}
```

### Canopy
```json
{
  "type": "canopy",
  "position": [x, y, z],
  "rotation": [rx, ry, rz],
  "scale": [width, 1, depth],
  "color": "#ffffff",
  "opacity": 0.3
}
```

## Trigger System

Scenes load when:
1. Camera is within `trigger.radius` meters of scene location
2. Zoom level is between `trigger.minZoom` and `trigger.maxZoom`

Adjust trigger settings for optimal performance:
- Large scenes (airports): radius=1000-2000m
- Small scenes (metro stations): radius=500-1000m
- Detailed scenes: minZoom=5, maxZoom=50
- Overview scenes: minZoom=0.5, maxZoom=10

## Performance Tips

1. **Limit Active Scenes**: Use small trigger radii to avoid loading too many scenes
2. **Optimize Models**: Use compressed GLB files, limit polygon count
3. **Throttle Updates**: Camera position updates are throttled to 500ms
4. **Use LOD**: Create multiple versions of scenes for different zoom levels

## Future Enhancements

- [ ] Scene editor UI for creating/editing scenes
- [ ] Real-time scene updates via WebSocket
- [ ] Scene animation sequences (trains arriving/departing)
- [ ] Interactive scene objects (clickable trains, escalators)
- [ ] Dynamic scene generation from OSM data
- [ ] Scene templates for common types (metro, airport, landmark)
- [ ] Multi-level scenes (underground, ground, elevated)
- [ ] Scene sharing and community contributions

## Troubleshooting

**Scene not loading:**
- Check backend is running (`python main.py`)
- Verify scene coordinates in `scenes.json`
- Check trigger radius and zoom range
- Look at browser console for errors
- Enable Scene Debug Panel to see camera position

**Models not rendering:**
- Check model file path in scene definition
- Verify model file exists in `/public/models/`
- Use procedural fallback by removing `model` field
- Check browser console for THREE.js loading errors

**Performance issues:**
- Reduce trigger radius
- Limit number of objects in scene
- Use simpler models or procedural geometry
- Increase camera position update interval
- Disable animations for distant scenes

## Example Scenes

### Mumbai Metro Station (Included)
- Location: 19.1197°N, 72.8464°E
- Objects: 11 (platforms, tracks, trains, escalators, poles)
- Type: Metro station

### Airport Template
```json
{
  "id": "airport-template",
  "type": "airport",
  "objects": [
    {"type": "building", "name": "Terminal"},
    {"type": "platform", "name": "Runway"},
    {"type": "building", "name": "Control Tower"},
    {"type": "canopy", "name": "Parking Shelter"}
  ]
}
```

### Railway Station Template
```json
{
  "id": "railway-template",
  "type": "railway_station",
  "objects": [
    {"type": "platform", "name": "Platform 1"},
    {"type": "track", "name": "Track 1"},
    {"type": "train", "name": "Train"},
    {"type": "building", "name": "Station Building"},
    {"type": "canopy", "name": "Platform Shelter"}
  ]
}
```

## Resources

**Free 3D Models:**
- [Sketchfab](https://sketchfab.com/) - Search for "metro train", "escalator", "station"
- [Poly Pizza](https://poly.pizza/) - Low-poly models for performance
- [Kenney Assets](https://kenney.nl/assets) - Game-ready 3D models
- [Quaternius](https://quaternius.com/) - Free CC0 3D models

**3D Model Format:**
- Use GLB (binary) format for better compression
- GLTF also supported but larger file size
- Keep polygon count under 10k for performance
- Include textures in GLB for single-file loading

## API Reference

See `SCENE_API_REFERENCE.md` for detailed API documentation.
