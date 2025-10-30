# Chat Commands for 3D Scene Viewing

## Overview
Use natural language commands in the Map Assistant to control the camera and view 3D scenes!

## New Feature: Show Location View

### Command Format
```
show location view [city name]
view [city name]
go to [city name]
```

### Examples

1. **View Mumbai Metro Scene**
   ```
   show location view mumbai
   ```
   - Moves camera to Mumbai (19.08°N, 72.88°E)
   - Zooms to level 25
   - Automatically loads nearby 3D scenes

2. **View Andheri Metro Station** (Exact scene location)
   ```
   show location view andheri
   ```
   - Moves camera to Andheri (19.12°N, 72.85°E)
   - Zooms to level 25
   - Loads Mumbai Metro station 3D scene with:
     - 2 platforms
     - 2 railway tracks
     - 1 metro train
     - 2 escalators
     - 3 electric poles
     - Station building
     - Platform canopy

3. **Other Cities**
   ```
   view delhi
   view bangalore
   view chennai
   go to kolkata
   ```

## How It Works

### Backend Processing
1. **Command Interpretation** (`/api/interpret-command`)
   - LLM or rule-based parser converts your text to actions
   - Example: "show location view mumbai" → `{"type":"show_location_view","location":"mumbai","zoom":25}`

2. **Location Resolution** (`/api/location-coordinates/{name}`)
   - Finds lat/lon for city names
   - Supports major Indian cities (Mumbai, Delhi, Bangalore, etc.)
   - Can search in cities and stations databases

3. **Scene Loading** (`/api/scenes/at-location`)
   - Automatically finds 3D scenes near the camera position
   - Checks zoom level (scenes have min/max zoom triggers)
   - Returns scene data with objects, lighting, etc.

### Frontend Processing
1. **ChatPanel.jsx**
   - Receives `show_location_view` action
   - Fetches location coordinates
   - Converts to `goto_location` action with zoom level as altitude

2. **Map3D.jsx**
   - Camera moves to coordinates
   - `CameraPositionTracker` updates position every 500ms
   - `useSceneManager` hook queries backend for nearby scenes
   - `SceneRenderer` renders active scenes with 3D objects

## Supported Locations

### Major Cities (Built-in)
- Mumbai (19.08°N, 72.88°E)
- Delhi (28.61°N, 77.21°E)
- Bangalore/Bengaluru (12.97°N, 77.59°E)
- Chennai (13.08°N, 80.27°E)
- Kolkata (22.57°N, 88.36°E)
- Hyderabad (17.39°N, 78.49°E)
- Pune (18.52°N, 73.86°E)
- Ahmedabad (23.02°N, 72.57°E)
- Jaipur (26.91°N, 75.79°E)
- And more...

### Special Locations (With 3D Scenes)
- **Andheri** (19.12°N, 72.85°E) - Mumbai Metro Station
  - Trigger: Zoom 25-50, Radius 500m
  - 11 objects (platforms, tracks, train, escalators, poles, building, canopy)

## Testing Commands

### Basic Camera Movement
```
zoom in
zoom out
zoom to 25x
move camera left by 10
```

### Station Navigation
```
goto station Mumbai Central
show station details
```

### Trip Animation
```
start trip from Delhi to Mumbai
start trip from Chennai to Bangalore speed 5
```

### Location Commands (NEW!)
```
show location view mumbai
view andheri
go to chennai
show location details delhi
```

## Scene Debug Panel

Click the **"🎬 Scenes (0)"** button in the bottom-right corner to see:
- Active 3D scenes
- Camera position (lat/lon)
- Current zoom level
- Scene object/light counts
- Loading/error states

## Troubleshooting

### Scene Not Appearing
1. **Check camera position** - Click "🎬 Scenes" button to see your lat/lon
2. **Check zoom level** - Must be ≤ 25 for Mumbai Metro scene
3. **Check distance** - Must be within 500m of Andheri (19.12°N, 72.85°E)
4. **Check backend** - Make sure backend is running on port 8091
5. **Check browser console** - Look for errors in developer tools

### Command Not Working
1. Try simpler commands: "view mumbai" instead of complex sentences
2. Check backend logs for command interpretation
3. Verify LLM provider is active (check LLM Provider Selector in chat panel)
4. Try rule-based fallback by using exact command format

### Camera Not Moving
1. Check if action was received (browser console)
2. Verify coordinates are valid
3. Try manual navigation first
4. Check for JavaScript errors

## API Endpoints

### Command Interpretation
```bash
curl -X POST http://localhost:8091/api/interpret-command \
  -H "Content-Type: application/json" \
  -d '{"text":"show location view mumbai"}'
```

Response:
```json
{
  "actions": [
    {
      "type": "show_location_view",
      "location": "mumbai",
      "zoom": 25
    }
  ],
  "method": "rules"
}
```

### Get Location Coordinates
```bash
curl http://localhost:8091/api/location-coordinates/mumbai
```

Response:
```json
{
  "lat": 19.076,
  "lon": 72.8777,
  "name": "Mumbai"
}
```

### Get Scenes at Location
```bash
curl "http://localhost:8091/api/scenes/at-location?lat=19.1197&lon=72.8464&zoom=25"
```

Response:
```json
{
  "scenes": [
    {
      "id": "mumbai-metro-station-1",
      "name": "Mumbai Metro Station - Andheri",
      "location": {"lat": 19.1197, "lon": 72.8464},
      "trigger": {"minZoom": 25, "maxZoom": 50, "radius": 500},
      "objects": [...]
    }
  ],
  "count": 1
}
```

## Next Steps

1. **Test the Command**
   - Open http://localhost:3001
   - Type in chat: "show location view mumbai"
   - Watch camera move and scene load!

2. **Try Different Locations**
   - "view andheri" (exact scene location)
   - "view delhi"
   - "go to bangalore"

3. **Add More Scenes**
   - Create scenes for other cities
   - See `SCENE_SYSTEM_GUIDE.md` for how to create scenes

4. **Add 3D Models**
   - Download GLB models for trains, buildings, etc.
   - Place in `/public/models/` folder
   - See `SCENE_SYSTEM_GUIDE.md` for details

Enjoy exploring India in 3D! 🚀🗺️
