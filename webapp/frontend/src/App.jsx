import React, { useState, useEffect, useRef } from 'react';
import MapCanvas from './components/MapCanvas';
import Map3D from './components/Map3D';
import ChatPanel from './components/ChatPanel';
import TripDrawer from './components/TripDrawer';
import TripButton from './components/TripButton';
import ResizableLayout from './components/ResizableLayout';
import { fetchStations, fetchIndiaBoundary, fetchStates } from './utils/api';
import { BACKEND_URL } from './config/constants';

function App() {
  const [stations, setStations] = useState([]);
  const [indiaBoundary, setIndiaBoundary] = useState(null);
  const [stateBoundaries, setStateBoundaries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataset, setDataset] = useState('default');
  const [showStates, setShowStates] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const mapRef = useRef(null);
  const [tripOpen, setTripOpen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true); // Start with 3D by default
  const [isTripDrawerOpen, setIsTripDrawerOpen] = useState(false);

  // Load data on mount and when dataset changes
  useEffect(() => {
    loadData();
  }, [dataset]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [stationsData, boundaryData, statesData] = await Promise.all([
        fetchStations(dataset),
        fetchIndiaBoundary(true),
        fetchStates()
      ]);
      
      // Process stations data
      const processedStations = processStationsData(stationsData);
      setStations(processedStations);
      setIndiaBoundary(boundaryData);
      setStateBoundaries(statesData);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load map data. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Process stations data from GeoJSON format
  const processStationsData = (data) => {
    const stationsList = [];
    
    // Handle zone-based format (fullstations.json)
    if (data.zones) {
      Object.values(data.zones).forEach(zone => {
        if (zone.features) {
          zone.features.forEach(feature => {
            if (feature.geometry && feature.geometry.type === 'Point') {
              const [lon, lat] = feature.geometry.coordinates;
              stationsList.push({
                name: feature.properties.name || 'Unknown',
                code: feature.properties.code || '',
                lat,
                lon
              });
            }
          });
        }
      });
    }
    // Handle standard GeoJSON format (stations.geojson)
    else if (data.features) {
      data.features.forEach(feature => {
        if (feature.geometry && feature.geometry.type === 'Point') {
          const [lon, lat] = feature.geometry.coordinates;
          stationsList.push({
            name: feature.properties.name || 'Unknown',
            code: feature.properties.code || '',
            lat,
            lon
          });
        }
      });
    }
    
    return stationsList;
  };

  const handleStationClick = (station) => {
    setSelectedStation(station);
  };

  // Handle actions from chat - all actions defined in backend config.yaml
  const handleAction = async (action) => {
    if (!mapRef.current) return;
    

    switch (action.type) {
      case 'zoom':
        if (action.mode === 'to') mapRef.current.zoomTo(action.value);
        else if (action.mode === 'by') mapRef.current.zoomBy(action.value);
        break;
      
      case 'center':
        mapRef.current.centerOn(action.lat, action.lon);
        break;
      
      case 'goto_station':
        // Zooms to 400km radius around station and centers it
        mapRef.current.gotoStationByName(action.name);
        break;
      
      case 'pan':
        mapRef.current.centerOn(action.lat, action.lon);
        break;
      
      case 'zoom_out':
        // Zoom out to show full India map
        mapRef.current.zoomOutToIndia();
        break;
      
      case 'reset':
        // Reset to India default view (same as zoom_out)
        mapRef.current.zoomOutToIndia();
        break;
      
      case 'start_trip':
        // Start animated trip from source to destination
        const speed = action.speed || 3.0; // Default speed 3.0x
        setIsTripDrawerOpen(true); // Open drawer to show trip controls
        await mapRef.current.startTrip({ 
          source: action.source, 
          destination: action.destination, 
          speed 
        });
        break;
      
      case 'move_camera':
        // Move camera in a direction (3D mode only)
        if (is3DMode && mapRef.current && mapRef.current.moveCamera) {
          mapRef.current.moveCamera({
            direction: action.direction,
            distance: action.distance || 10,
            duration: action.duration || 2000
          });
        } else {
          console.warn('⚠️ Cannot move camera:', { is3DMode, hasMapRef: !!mapRef.current, hasMoveCamera: !!mapRef.current?.moveCamera });
        }
        break;
      
      case 'camera_offset':
        // Move camera by exact offset (3D mode only)
        if (is3DMode && mapRef.current.moveCameraByOffset) {
          mapRef.current.moveCameraByOffset({
            x: action.x || 0,
            y: action.y || 0,
            z: action.z || 0,
            duration: action.duration || 2000
          });
        }
        break;
      
      case 'goto_location':
        // Move camera to specific lat/lon (3D mode only)
        if (is3DMode && mapRef.current && mapRef.current.gotoLocation) {
          mapRef.current.gotoLocation({
            lat: action.lat,
            lon: action.lon,
            altitude: action.altitude || 50,
            duration: action.duration || 2000
          });
        } else {
          console.warn('⚠️ Cannot goto location:', { is3DMode, hasMapRef: !!mapRef.current });
        }
        break;
      
      case 'show_location_data':
        // Show location data panel in 3D mode
        if (is3DMode && mapRef.current && mapRef.current.showLocationData) {
          mapRef.current.showLocationData(
            action.data || [],
            action.target,
            action.altitude || 17000
          );
        }
        break;
      
      case 'view_location_table':
        // Navigate camera to existing location table
        if (is3DMode && mapRef.current && mapRef.current.viewLocationTable) {
          mapRef.current.viewLocationTable(
            action.location,
            action.duration || 2000
          );
        } else {
          console.warn('⚠️ Cannot view location table:', { 
            is3DMode, 
            hasMapRef: !!mapRef.current,
            hasMethod: !!mapRef.current?.viewLocationTable 
          });
        }
        break;
      
      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  // Trip handlers
  const handleStartTrip = async ({ source, destination, speed }) => {
    if (!mapRef.current) return;
    try {
      await mapRef.current.startTrip({ source, destination, speed });
    } catch (err) {
      console.error('Failed to start trip', err);
    }
  };

  const handleStopTrip = async () => {
    if (!mapRef.current) return;
    try {
      await mapRef.current.stopTrip();
    } catch (err) {
      console.error('Failed to stop trip', err);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg z-10 flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🚄 Indian Railway Stations Map</h1>
              <p className="text-blue-100 text-sm">Interactive Canvas-based Visualization</p>
            </div>
            
            <div className="flex gap-4 items-center">
              {/* Dataset Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Dataset:</label>
                <select
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white text-gray-800 border-2 border-blue-300 focus:outline-none focus:border-blue-400 cursor-pointer"
                  disabled={loading}
                >
                  <option value="default">Default (22 Stations)</option>
                  <option value="full">Full (90+ Stations)</option>
                </select>
              </div>
              
              {/* State Boundaries Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStates}
                  onChange={(e) => setShowStates(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-medium">Show States</span>
              </label>
              
              {/* Station Count */}
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">
                  {stations.length} Station{stations.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* 3D/2D Toggle */}
              <button
                onClick={() => setIs3DMode(!is3DMode)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <span className="text-xl">{is3DMode ? '🌍' : '🗺️'}</span>
                <span>{is3DMode ? '3D View' : '2D View'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-xl font-semibold text-gray-700">Loading map data...</p>
              <p className="text-sm text-gray-500 mt-2">Fetching GeoJSON from backend</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-20">
            <div className="text-center max-w-md mx-auto p-8 bg-red-50 rounded-lg border-2 border-red-200">
              <div className="text-red-600 text-5xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Data</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadData}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <p className="text-sm text-gray-600 mt-4">
                Make sure the backend is running on <code className="bg-gray-200 px-2 py-1 rounded">{BACKEND_URL}</code>
              </p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <ResizableLayout
            leftPanel={
              <>
                <ChatPanel onSend={handleAction} />
                <TripButton onClick={() => setTripOpen(true)} />
                <TripDrawer
                  stations={stations}
                  isOpen={tripOpen}
                  onClose={() => setTripOpen(false)}
                  onStart={handleStartTrip}
                  onStop={handleStopTrip}
                />
              </>
            }
            rightPanel={
              <div className="w-full h-full relative">
                {is3DMode ? (
                  <Map3D
                    ref={mapRef}
                    stations={stations}
                    indiaBoundary={indiaBoundary}
                    stateBoundaries={showStates ? stateBoundaries : null}
                    onStationClick={handleStationClick}
                  />
                ) : (
                  <MapCanvas
                    ref={mapRef}
                    stations={stations}
                    indiaBoundary={indiaBoundary}
                    stateBoundaries={showStates ? stateBoundaries : null}
                    onStationClick={handleStationClick}
                  />
                )}
              </div>
            }
            minLeftWidth={280}
            maxLeftWidth={600}
            defaultLeftWidth={384}
          />
        )}
      </main>

      {/* Station Info Panel */}
      {selectedStation && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-2xl p-4 max-w-md z-10 border-2 border-blue-300">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-gray-800">Station Information</h3>
            <button
              onClick={() => setSelectedStation(null)}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Name:</span>
              <p className="font-semibold text-gray-800">{selectedStation.name}</p>
            </div>
            {selectedStation.code && (
              <div>
                <span className="text-sm text-gray-600">Code:</span>
                <p className="font-semibold text-gray-800">{selectedStation.code}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-sm text-gray-600">Latitude:</span>
                <p className="font-mono text-sm text-gray-800">{selectedStation.lat.toFixed(4)}°</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Longitude:</span>
                <p className="font-mono text-sm text-gray-800">{selectedStation.lon.toFixed(4)}°</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removed old controls panel; chat provides interactive control */}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-2 text-center text-sm z-10 flex-shrink-0">
        <p>
          Indian Railway Stations Map • Built with React, Canvas API & FastAPI • 
          {stations.length > 0 && ` ${stations.length} Stations Loaded`}
        </p>
      </footer>
    </div>
  );
}

export default App;
