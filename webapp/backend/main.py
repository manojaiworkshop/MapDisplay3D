from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import json
import os
from pathlib import Path
import logging

try:
    from .config import (
        ALLOWED_ORIGINS, ACTIONS, config_data,
        ACTIVE_PROVIDER, FALLBACK_TO_RULES
    )
    from .llm_provider import LLMProviderManager
except Exception:
    # fallback if running as script
    from config import (
        ALLOWED_ORIGINS, ACTIONS, config_data,
        ACTIVE_PROVIDER, FALLBACK_TO_RULES
    )
    from llm_provider import LLMProviderManager

logger = logging.getLogger("backend")
logging.basicConfig(level=logging.INFO)

# Initialize LLM Provider Manager
llm_manager = LLMProviderManager(config_data)
logger.info(f"🚀 LLM Provider Manager initialized - Active: {llm_manager.active_provider_name}")

app = FastAPI(title="Indian Railway Stations API")

# Enable CORS for frontend - Allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory for data files
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Indian Railway Stations API",
        "version": "1.0.0",
        "endpoints": {
            "/api/stations": "Get railway stations (default or full)",
            "/api/india-boundary": "Get India boundary GeoJSON",
            "/api/states": "Get state boundaries GeoJSON",
            "/api/health": "Health check"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "railway-stations-api"}

@app.get("/api/stations")
async def get_stations(dataset: str = "default"):
    """
    Get railway stations data
    
    Parameters:
    - dataset: 'default' for 22 stations, 'full' for 90+ stations
    """
    try:
        if dataset == "full":
            file_path = DATA_DIR / "fullstations.json"
        else:
            file_path = DATA_DIR / "stations.geojson"
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Data file not found: {file_path.name}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return JSONResponse(content=data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/india-boundary")
async def get_india_boundary(detailed: bool = True):
    """
    Get India boundary GeoJSON
    
    Parameters:
    - detailed: True for detailed boundary (600+ points), False for simple (140 points)
    """
    try:
        if detailed:
            file_path = DATA_DIR / "india_boundary_detailed.geojson"
        else:
            file_path = DATA_DIR / "india_boundary.geojson"
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"Data file not found: {file_path.name}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return JSONResponse(content=data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/states")
async def get_states():
    """Get state boundaries GeoJSON"""
    try:
        file_path = DATA_DIR / "states.geojson"
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="States data file not found")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return JSONResponse(content=data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data-info")
async def get_data_info():
    """Get information about available datasets"""
    info = {
        "datasets": {
            "default": {
                "file": "stations.geojson",
                "count": 22,
                "description": "Major railway stations"
            },
            "full": {
                "file": "fullstations.json",
                "count": "90+",
                "description": "Major stations across all zones"
            }
        },
        "boundaries": {
            "india": {
                "simple": "140 points",
                "detailed": "600+ points"
            },
            "states": "State boundaries included"
        }
    }
    return info


@app.get("/api/llm/providers")
async def get_llm_providers():
    """Get list of all available LLM providers and their status"""
    try:
        providers = llm_manager.get_available_providers()
        return JSONResponse(content={
            "providers": providers,
            "active": llm_manager.active_provider_name,
            "fallback_enabled": llm_manager.fallback_to_rules
        })
    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ProviderSwitchRequest(BaseModel):
    provider: str


@app.post("/api/llm/switch-provider")
async def switch_llm_provider(req: ProviderSwitchRequest):
    """Switch to a different LLM provider"""
    try:
        provider_name = req.provider.lower()
        success = llm_manager.set_active_provider(provider_name)
        
        if success:
            logger.info(f"✅ Successfully switched to provider: {provider_name}")
            return JSONResponse(content={
                "success": True,
                "provider": provider_name,
                "message": f"Switched to {provider_name} provider"
            })
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "error": f"Provider {provider_name} is not available or not configured"
                },
                status_code=400
            )
    except Exception as e:
        logger.error(f"Error switching provider: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/llm/status")
async def get_llm_status():
    """Get current LLM provider status and configuration"""
    try:
        provider = llm_manager.get_active_provider()
        return JSONResponse(content={
            "active_provider": llm_manager.active_provider_name,
            "is_available": provider.is_available(),
            "fallback_enabled": llm_manager.fallback_to_rules,
            "config": {
                "model": llm_manager.config.get(llm_manager.active_provider_name, {}).get('model', 'N/A'),
                "temperature": llm_manager.config.get(llm_manager.active_provider_name, {}).get('temperature', 'N/A')
            }
        })
    except Exception as e:
        logger.error(f"Error getting LLM status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper Functions for Multi-Level GeoJSON

def filter_geojson_by_zoom(data, zoom_level):
    """Filter GeoJSON features based on zoom level"""
    if not isinstance(data, dict) or 'features' not in data:
        return data
    
    filtered_features = []
    
    # Process main features
    for feature in data.get('features', []):
        props = feature.get('properties', {})
        render_zoom = props.get('render_at_zoom', [0, 35])
        
        if isinstance(render_zoom, list) and len(render_zoom) == 2:
            min_zoom, max_zoom = render_zoom
            if min_zoom <= zoom_level <= max_zoom:
                filtered_features.append(feature)
    
    # Process additional data arrays (districts, cities, landmarks)
    result = data.copy()
    result['features'] = filtered_features
    
    for key in ['districts', 'cities', 'landmarks']:
        if key in data:
            filtered_items = []
            for item in data[key]:
                props = item.get('properties', {})
                render_zoom = props.get('render_at_zoom', [0, 35])
                
                if isinstance(render_zoom, list) and len(render_zoom) == 2:
                    min_zoom, max_zoom = render_zoom
                    if min_zoom <= zoom_level <= max_zoom:
                        filtered_items.append(item)
            
            result[key] = filtered_items
    
    return result

async def get_states_data(zoom_level):
    """Get state boundary data for zoom level"""
    try:
        # For now, return Delhi state as example
        file_path = DATA_DIR / "states" / "delhi.geojson"
        
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            filtered_data = filter_geojson_by_zoom(data, zoom_level)
            return JSONResponse(content=filtered_data)
        
        # Fallback to original states.geojson
        file_path = DATA_DIR / "states.geojson"
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return JSONResponse(content=data)
    
    except Exception as e:
        logger.error(f"❌ [States] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_districts_data(zoom_level):
    """Get district boundary data for zoom level"""
    try:
        # For now, return district data from Delhi state file
        file_path = DATA_DIR / "states" / "delhi.geojson"
        
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract districts
            districts = data.get('districts', [])
            filtered_districts = []
            
            for district in districts:
                props = district.get('properties', {})
                render_zoom = props.get('render_at_zoom', [0, 35])
                
                if isinstance(render_zoom, list) and len(render_zoom) == 2:
                    min_zoom, max_zoom = render_zoom
                    if min_zoom <= zoom_level <= max_zoom:
                        filtered_districts.append(district)
            
            return JSONResponse(content={
                "type": "FeatureCollection",
                "features": filtered_districts,
                "zoom_level": zoom_level
            })
        
        return JSONResponse(content={"type": "FeatureCollection", "features": []})
    
    except Exception as e:
        logger.error(f"❌ [Districts] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_cities_data(zoom_level):
    """Get cities data for zoom level"""
    try:
        file_path = DATA_DIR / "cities" / "indian_cities.geojson"
        
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            filtered_data = filter_geojson_by_zoom(data, zoom_level)
            return JSONResponse(content=filtered_data)
        
        return JSONResponse(content={"type": "FeatureCollection", "features": []})
    
    except Exception as e:
        logger.error(f"❌ [Cities] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_dynamic_assets(zoom_level):
    """Get dynamic assets (drones, vehicles) for zoom level"""
    try:
        file_path = DATA_DIR / "assets" / "dynamic_assets.geojson"
        
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Filter assets based on zoom level
            filtered_assets = []
            for asset in data.get('assets', []):
                props = asset.get('properties', {})
                render_zoom = props.get('render_at_zoom', [0, 35])
                
                if isinstance(render_zoom, list) and len(render_zoom) == 2:
                    min_zoom, max_zoom = render_zoom
                    if min_zoom <= zoom_level <= max_zoom:
                        filtered_assets.append(asset)
            
            return JSONResponse(content={
                "type": "FeatureCollection",
                "features": filtered_assets,
                "zoom_level": zoom_level,
                "metadata": data.get('metadata', {})
            })
        
        return JSONResponse(content={"type": "FeatureCollection", "features": []})
    
    except Exception as e:
        logger.error(f"❌ [Assets] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# New Multi-Level GeoJSON API Endpoints

@app.get("/api/geojson/{data_type}/zoom/{zoom_level}")
async def get_geojson_by_zoom(data_type: str, zoom_level: float):
    """
    Get GeoJSON data filtered by zoom level
    
    Parameters:
    - data_type: 'states', 'districts', 'cities', 'assets'
    - zoom_level: Current zoom level (0.1 to 35)
    """
    try:
        logger.info(f"🗺️ [GeoJSON] Request: {data_type} at zoom {zoom_level}")
        
        if data_type == "states":
            return await get_states_data(zoom_level)
        elif data_type == "districts":
            return await get_districts_data(zoom_level)
        elif data_type == "cities":
            return await get_cities_data(zoom_level)
        elif data_type == "assets":
            return await get_dynamic_assets(zoom_level)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid data type: {data_type}")
            
    except Exception as e:
        logger.error(f"❌ [GeoJSON] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/states/{state_code}")
async def get_state_details(state_code: str, zoom_level: float = 5):
    """Get detailed state data including districts, cities, landmarks"""
    try:
        file_path = DATA_DIR / "states" / f"{state_code.lower()}.geojson"
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"State data not found: {state_code}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Filter based on zoom level
        filtered_data = filter_geojson_by_zoom(data, zoom_level)
        
        logger.info(f"✅ [States] {state_code}: {len(filtered_data.get('features', []))} features at zoom {zoom_level}")
        return JSONResponse(content=filtered_data)
        
    except Exception as e:
        logger.error(f"❌ [States] Error for {state_code}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cities/zoom/{zoom_level}")
async def get_cities_by_zoom(zoom_level: float):
    """Get cities filtered by zoom level"""
    return await get_cities_data(zoom_level)

@app.get("/api/assets/dynamic")
async def get_dynamic_assets_current(zoom_level: float = 5):
    """Get current dynamic assets (drones, vehicles, etc.)"""
    return await get_dynamic_assets(zoom_level)

@app.post("/api/assets/{asset_id}/move")
async def move_asset(asset_id: str, direction: str, distance: float = 0.001):
    """Move a dynamic asset in specified direction"""
    try:
        # This would update the asset position in real implementation
        # For now, return success
        return {
            "asset_id": asset_id,
            "action": "move",
            "direction": direction,
            "distance": distance,
            "status": "success",
            "timestamp": "2025-10-22T12:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/actions")
async def get_actions():
    """Get available actions that can be performed on the map"""
    return {"actions": ACTIONS}


class CommandRequest(BaseModel):
    text: str


@app.post("/api/interpret-command")
async def interpret_command(req: CommandRequest):
    """Interpret a natural language command and return structured actions.

    The response format is a list of actions:
    [{"type": "zoom", "mode": "to|by", "value": number},
     {"type": "pan", "lat": 12.3, "lon": 77.5},
     {"type": "center", "lat": 12.3, "lon": 77.5},
     {"type": "goto_station", "name": "New Delhi (NDLS)"}]
    """
    text = req.text.strip()
    logger.info(f"🔍 Interpreting command: {text} (Provider: {llm_manager.active_provider_name})")

    # Try to use the active LLM provider
    try:
        provider = llm_manager.get_active_provider()
        
        if provider.is_available():
            prompt = (
                "Convert the following user instruction into a JSON array of action objects. "
                "Actions supported: "
                "zoom (mode: to|by, value: number), "
                "center (lat, lon), "
                "pan (lat, lon), "
                "goto_station (name) - automatically zooms to 400km radius around station, "
                "zoom_out - shows full India map, "
                "reset - resets to full India view, "
                "start_trip (source: station name, destination: station name, speed: optional number default 3.0) - animates trip from source to destination, "
                "move_camera (direction: left|right|up|down|forward|backward, distance: number, duration: optional ms), "
                "camera_offset (x: number, y: number, z: number, duration: optional ms) - move camera by exact offset, "
                "goto_location (lat: number, lon: number, altitude: optional number, duration: optional ms) - move camera to specific location, "
                "show_location_details (location: string, altitude: optional number default 17000, animate: optional boolean default true) - shows detailed information about ANY location/city/station (e.g., Delhi, Mumbai, Kolkata, Chennai, etc.) with zoom animation and displays paginated data table. Extract the location name from the user's query. "
                "view_location_table (location: string, duration: optional number default 2000) - navigates camera to an already-open location table. Use this when user says 'view [location]', 'go to [location] table', 'show [location] view', etc. This ONLY works if the table is already open. "
                "Only output valid JSON. For example: [{\"type\":\"view_location_table\",\"location\":\"Delhi\"}] or [{\"type\":\"show_location_details\",\"location\":\"Mumbai\"}].\n\n"
                f"Instruction: {text}\n\nJSON:"
            )

            content = llm_manager.generate(prompt)
            
            # Try to extract JSON from response
            import re
            m = re.search(r"(\[.*\])", content, re.S)
            json_text = m.group(1) if m else content
            actions = json.loads(json_text)
            
            logger.info(f"✅ LLM parsed successfully: {actions}")
            return JSONResponse(content={
                "actions": actions,
                "provider": llm_manager.active_provider_name,
                "method": "llm"
            })
        else:
            logger.warning(f"Provider {llm_manager.active_provider_name} is not available")
            
    except Exception as e:
        logger.error(f"❌ LLM parsing failed: {e}")
        if not llm_manager.should_fallback_to_rules():
            raise HTTPException(status_code=500, detail=f"LLM parsing failed: {str(e)}")

    # Rule-based fallback parser
    logger.info("📋 Using rule-based parser as fallback")
    actions = []
    lower = text.lower()

    # Zoom to X times
    import re
    m = re.search(r"zoom to (\d+(?:\.\d+)?)x", lower)
    if m:
        val = float(m.group(1))
        actions.append({"type": "zoom", "mode": "to", "value": val})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Zoom in/out by or to number
    m2 = re.search(r"zoom (in|out) to (\d+(?:\.\d+)?)x", lower)
    if m2:
        direction, val = m2.group(1), float(m2.group(2))
        actions.append({"type": "zoom", "mode": "to", "value": val})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    m3 = re.search(r"zoom (in|out) by (\d+(?:\.\d+)?)x", lower)
    if m3:
        dirc, val = m3.group(1), float(m3.group(2))
        factor = val if dirc == 'in' else (1.0/val)
        actions.append({"type": "zoom", "mode": "by", "value": factor})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Zoom out to full India map
    if re.search(r"zoom\s+out(?:\s+to\s+india)?$", lower) or re.search(r"show\s+full\s+map", lower):
        actions.append({"type": "zoom_out"})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Reset view
    if re.search(r"reset", lower):
        actions.append({"type": "reset"})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Zoom to lat lon
    m4 = re.search(r"zoom to lat[:=\s]*([0-9.+-]+)\s*,?\s*lon[:=\s]*([0-9.+-]+)", lower)
    if m4:
        lat = float(m4.group(1)); lon = float(m4.group(2))
        actions.append({"type": "center", "lat": lat, "lon": lon})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Goto station by name (automatically zooms to 400km radius)
    m5 = re.search(r"goto station (.+)", lower)
    if m5:
        name = m5.group(1).strip()
        actions.append({"type": "goto_station", "name": name})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Start trip from source to destination
    # Pattern: "start trip from X to Y" or "trip from X to Y" with optional speed
    trip_pattern = r"(?:start\s+)?(?:trip|journey)\s+from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+at\s+(\d+(?:\.\d+)?)x?\s*speed)?(?:\s|$)"
    m_trip = re.search(trip_pattern, lower)
    if m_trip:
        source = m_trip.group(1).strip()
        destination = m_trip.group(2).strip()
        speed = float(m_trip.group(3)) if m_trip.group(3) else 3.0  # Default speed 3.0x
        actions.append({
            "type": "start_trip",
            "source": source,
            "destination": destination,
            "speed": speed
        })
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Camera movement: "move camera left/right/up/down by X"
    camera_move_pattern = r"move\s+camera\s+(left|right|up|down|forward|backward)(?:\s+by\s+)?(\d+(?:\.\d+)?)?(?:\s+units?)?"
    m_cam = re.search(camera_move_pattern, lower)
    if m_cam:
        direction = m_cam.group(1)
        distance = float(m_cam.group(2)) if m_cam.group(2) else 10  # Default 10 units
        action = {
            "type": "move_camera",
            "direction": direction,
            "distance": distance,
            "duration": 2000
        }
        logger.info(f"✅ Parsed camera move action: {action}")
        actions.append(action)
        return JSONResponse(content={"actions": actions, "method": "rules"})
    
    # Camera offset: "move camera to x=10 y=20 z=30" or "camera position x 10 y 20 z 30"
    offset_pattern = r"(?:move\s+camera\s+to|camera\s+position)\s+x[:=\s]*([0-9.+-]+)\s*y[:=\s]*([0-9.+-]+)\s*z[:=\s]*([0-9.+-]+)"
    m_offset = re.search(offset_pattern, lower)
    if m_offset:
        x, y, z = float(m_offset.group(1)), float(m_offset.group(2)), float(m_offset.group(3))
        actions.append({
            "type": "camera_offset",
            "x": x,
            "y": y,
            "z": z,
            "duration": 2000
        })
        return JSONResponse(content={"actions": actions, "method": "rules"})
    
    # Goto location: "goto location 28.64, 77.22" or "camera to lat 28.64 lon 77.22"
    goto_loc_pattern = r"(?:goto|move\s+(?:to|camera\s+to))\s+(?:location\s+)?(?:lat\s*)?([0-9.+-]+)\s*,?\s*(?:lon\s*)?([0-9.+-]+)"
    m_goto = re.search(goto_loc_pattern, lower)
    if m_goto:
        lat, lon = float(m_goto.group(1)), float(m_goto.group(2))
        actions.append({
            "type": "goto_location",
            "lat": lat,
            "lon": lon,
            "altitude": 50,
            "duration": 2000
        })
        return JSONResponse(content={"actions": actions, "method": "rules"})
    
    # Fallback: if contains coordinates
    m6 = re.search(r"([0-9.+-]+)\s*,\s*([0-9.+-]+)", lower)
    if m6:
        lat = float(m6.group(1)); lon = float(m6.group(2))
        actions.append({"type": "center", "lat": lat, "lon": lon})
        return JSONResponse(content={"actions": actions, "method": "rules"})

    # Unrecognized
    return JSONResponse(content={"actions": [], "error": "Could not parse command"}, status_code=200)


@app.get("/api/location-details/{location_name}")
async def get_location_details(location_name: str, page: int = 1, page_size: int = 10):
    """
    Get detailed information about a location (city, state, district) with pagination.
    Returns stations, landmarks, districts, and other features for the location.
    """
    logger.info(f"🔍 [Location Details] Fetching details for: {location_name}, page: {page}")
    
    try:
        location_lower = location_name.lower()
        results = {
            "location": location_name,
            "coordinates": None,
            "stations": [],
            "districts": [],
            "cities": [],
            "landmarks": [],
            "total_items": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0
        }
        
        # Search in states data
        states_path = DATA_DIR / "states"
        if states_path.exists():
            for state_file in states_path.glob("*.geojson"):
                try:
                    with open(state_file, 'r') as f:
                        state_data = json.load(f)
                    
                    # Check if this is the state we're looking for
                    state_name = state_data.get('properties', {}).get('name', '').lower()
                    if location_lower in state_name or state_name in location_lower:
                        # Extract all features
                        if 'features' in state_data:
                            for feature in state_data['features']:
                                props = feature.get('properties', {})
                                feature_type = props.get('type', 'unknown')
                                
                                if feature_type == 'district':
                                    results['districts'].append({
                                        'name': props.get('name'),
                                        'code': props.get('code'),
                                        'population': props.get('population'),
                                        'area': props.get('area')
                                    })
                                elif feature_type == 'city':
                                    results['cities'].append({
                                        'name': props.get('name'),
                                        'population': props.get('population'),
                                        'tier': props.get('tier')
                                    })
                                elif feature_type == 'landmark':
                                    results['landmarks'].append({
                                        'name': props.get('name'),
                                        'category': props.get('category'),
                                        'importance': props.get('importance')
                                    })
                        
                        # Get state center coordinates
                        if state_data.get('geometry'):
                            coords = state_data['geometry'].get('coordinates', [])
                            if coords and len(coords) > 0:
                                # Get first coordinate as approximate center
                                first_coord = coords[0][0] if isinstance(coords[0][0], list) else coords[0]
                                results['coordinates'] = {
                                    'lat': first_coord[1] if len(first_coord) > 1 else 28.6139,
                                    'lon': first_coord[0] if len(first_coord) > 0 else 77.2090
                                }
                        break
                except Exception as e:
                    logger.error(f"Error reading state file {state_file}: {e}")
        
        # Search in cities data
        cities_path = DATA_DIR / "cities" / "indian_cities.geojson"
        if cities_path.exists():
            try:
                with open(cities_path, 'r') as f:
                    cities_data = json.load(f)
                
                for feature in cities_data.get('features', []):
                    props = feature.get('properties', {})
                    city_name = props.get('name', '').lower()
                    
                    if location_lower in city_name or city_name in location_lower:
                        results['cities'].append({
                            'name': props.get('name'),
                            'state': props.get('state'),
                            'population': props.get('population'),
                            'tier': props.get('tier')
                        })
                        
                        # Get city coordinates
                        if feature.get('geometry'):
                            coords = feature['geometry'].get('coordinates', [])
                            if coords and len(coords) >= 2:
                                results['coordinates'] = {
                                    'lat': coords[1],
                                    'lon': coords[0]
                                }
            except Exception as e:
                logger.error(f"Error reading cities file: {e}")
        
        # Search in stations data
        stations_path = DATA_DIR / "fullstations.json"
        if stations_path.exists():
            try:
                with open(stations_path, 'r') as f:
                    stations_data = json.load(f)
                
                if 'zones' in stations_data:
                    for zone_name, zone_data in stations_data['zones'].items():
                        for feature in zone_data.get('features', []):
                            props = feature.get('properties', {})
                            station_name = props.get('name', '').lower()
                            station_code = props.get('code', '').lower()
                            
                            # Check if station is in or near the location
                            if location_lower in station_name or location_lower in station_code:
                                results['stations'].append({
                                    'name': props.get('name'),
                                    'code': props.get('code'),
                                    'zone': zone_name,
                                    'lat': props.get('lat'),
                                    'lon': props.get('lon'),
                                    'importance': props.get('importance')
                                })
            except Exception as e:
                logger.error(f"Error reading stations file: {e}")
        
        # Calculate pagination
        all_items = (results['stations'] + results['districts'] + 
                     results['cities'] + results['landmarks'])
        results['total_items'] = len(all_items)
        results['total_pages'] = (results['total_items'] + page_size - 1) // page_size
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        paginated_stations = results['stations'][start_idx:end_idx]
        remaining = page_size - len(paginated_stations)
        start_idx = max(0, start_idx - len(results['stations']))
        
        paginated_districts = results['districts'][start_idx:start_idx + remaining] if remaining > 0 else []
        remaining -= len(paginated_districts)
        start_idx = max(0, start_idx - len(results['districts']))
        
        paginated_cities = results['cities'][start_idx:start_idx + remaining] if remaining > 0 else []
        remaining -= len(paginated_cities)
        start_idx = max(0, start_idx - len(results['cities']))
        
        paginated_landmarks = results['landmarks'][start_idx:start_idx + remaining] if remaining > 0 else []
        
        # Set default coordinates if not found (Delhi center)
        if not results['coordinates']:
            results['coordinates'] = {'lat': 28.6139, 'lon': 77.2090}
        
        results['stations'] = paginated_stations
        results['districts'] = paginated_districts
        results['cities'] = paginated_cities
        results['landmarks'] = paginated_landmarks
        
        logger.info(f"✅ [Location Details] Found {results['total_items']} items, returning page {page}/{results['total_pages']}")
        return results
        
    except Exception as e:
        logger.error(f"❌ [Location Details] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/location/{location_name}")
async def get_location_sample(location_name: str, page: int = 1, page_size: int = 50):
    """Get location details with real data from fullstations.json"""
    location_lower = location_name.lower()
    logger.info(f"📍 [Location] Searching for: {location_name}")
    
    try:
        # Load fullstations.json
        fullstations_path = DATA_DIR / "fullstations.json"
        with open(fullstations_path, 'r', encoding='utf-8') as f:
            stations_data = json.load(f)
        
        # Search for matching stations across all zones
        matching_stations = []
        location_coords = None
        
        for zone_name, zone_data in stations_data.get("zones", {}).items():
            features = zone_data.get("features", [])
            for feature in features:
                props = feature.get("properties", {})
                name = props.get("name", "").lower()
                code = props.get("code", "").lower()
                
                # Match if location name is in station name or code
                if location_lower in name or location_lower == code:
                    coords = feature.get("geometry", {}).get("coordinates", [])
                    if coords and len(coords) >= 2:
                        station_info = {
                            "type": "Station",
                            "name": props.get("name", "Unknown"),
                            "code": props.get("code", "N/A"),
                            "category": props.get("category", "N/A"),
                            "zone": zone_name,
                            "zone_code": zone_data.get("zone_code", "N/A"),
                            "latitude": coords[1],
                            "longitude": coords[0]
                        }
                        matching_stations.append(station_info)
                        
                        # Use first match for coordinates
                        if not location_coords:
                            location_coords = {"lat": coords[1], "lon": coords[0]}
        
        # If no matches found, return error
        if not matching_stations:
            logger.warning(f"⚠️ No stations found for: {location_name}")
            return {
                "location": location_name.title(),
                "coordinates": {"lat": 20.5937, "lon": 78.9629},  # Center of India
                "data": [{"message": f"No data found for '{location_name}'", "type": "Error"}],
                "total_items": 1,
                "page": page,
                "page_size": page_size,
                "total_pages": 1
            }
        
        logger.info(f"✅ Found {len(matching_stations)} matching stations for: {location_name}")
        
        # Return matching stations as flat list for table
        return {
            "location": matching_stations[0]["name"] if matching_stations else location_name.title(),
            "coordinates": location_coords,
            "data": matching_stations,  # All data in single array for dynamic table
            "total_items": len(matching_stations),
            "page": page,
            "page_size": page_size,
            "total_pages": (len(matching_stations) + page_size - 1) // page_size
        }
        
    except FileNotFoundError:
        logger.error(f"❌ fullstations.json not found at {DATA_DIR}")
        raise HTTPException(status_code=500, detail="Station data file not found")
    except Exception as e:
        logger.error(f"❌ Error loading location data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading location data: {str(e)}")

# Alias endpoint without dash for convenience
@app.get("/api/location/{location_name}")
async def get_location(location_name: str, page: int = 1, page_size: int = 50):
    """Alias for get_location_details - same functionality"""
    return await get_location_details(location_name, page, page_size)


# LOD Endpoint - added for zoom-based progressive loading
@app.get("/api/stations/level/{level}")
async def get_stations_by_level(level: int):
    """Get stations by LOD level: 0=HQ, 1=A1, 2=A1+A, 3=all"""
    logger.info(f"�� [LOD] GET /api/stations/level/{level}")
    
    try:
        if level not in [0, 1, 2, 3]:
            raise HTTPException(status_code=400, detail=f"Invalid level: {level}")
        
        full_path = DATA_DIR / "fullstations.json"
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="fullstations.json not found")
        
        with open(full_path, 'r') as f:
            data = json.load(f)
        
        all_stations = []
        if 'zones' in data:
            for zone_name, zone_data in data['zones'].items():
                zone_code = zone_data.get('zone_code', 'UK')
                for feat in zone_data.get('features', []):
                    props = feat['properties']
                    coords = feat['geometry']['coordinates']
                    category = props.get('category', 'B')
                    importance = {'A1': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}.get(category, 3)
                    all_stations.append({
                        "name": props.get('name', ''),
                        "code": props.get('code', ''),
                        "lat": coords[1],
                        "lon": coords[0],
                        "zone": zone_code,
                        "category": category,
                        "importance": importance
                    })
        
        logger.info(f"📊 [LOD] Loaded {len(all_stations)} total stations")
        
        headquarters = {'NDLS', 'HWH', 'BCT', 'MAS', 'CSMT'}
        if level == 0:
            filtered = [s for s in all_stations if s['code'] in headquarters]
        elif level == 1:
            filtered = [s for s in all_stations if s['importance'] >= 5]
        elif level == 2:
            filtered = [s for s in all_stations if s['importance'] >= 4]
        else:
            filtered = all_stations
        
        logger.info(f"✅ [LOD] Level {level}: Returning {len(filtered)} stations")
        return {"stations": filtered, "level": level, "total": len(filtered)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [LOD] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8091)

