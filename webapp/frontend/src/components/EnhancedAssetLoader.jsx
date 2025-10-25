import { useState, useEffect } from 'react';
import { AirportBoundary, ATCTower } from './AssetComponents';
import FlightSimulator from './FlightSimulator';
import { BACKEND_URL } from '../config/constants';

/**
 * Enhanced Asset Loader with API Integration and Proper Scaling
 * Uses existing backend APIs and zoomDistance for dynamic scaling
 */
export const useEnhancedAssetLoader = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState({
    airports: [],
    routes: [],
    indiaBoundary: null,
    manifest: null
  });

  const API_BASE = `${BACKEND_URL}/api`;

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);

        // Load India boundary from API (this already works)
        const boundaryResponse = await fetch(`${API_BASE}/india-boundary?detailed=true`);
        if (!boundaryResponse.ok) throw new Error(`Failed to load India boundary: ${boundaryResponse.statusText}`);
        const indiaBoundary = await boundaryResponse.json();

        // Create airport data (can be extended to use API later)
        const airports = [
          {
            id: 'DEL',
            name: 'Indira Gandhi International Airport',
            iata: 'DEL',
            icao: 'VIDP',
            lat: 28.5525,
            lon: 77.0925,
            elevation: 237,
            boundary: [
              [77.0856, 28.5665], [77.0950, 28.5665], [77.1100, 28.5600],
              [77.1100, 28.5450], [77.1050, 28.5350], [77.0900, 28.5350],
              [77.0750, 28.5400], [77.0750, 28.5550], [77.0856, 28.5665]
            ],
            atcTower: {
              lat: 28.5525,
              lon: 77.0925,
              height: 83.8,
              frequency: '118.5'
            },
            runways: [
              { name: '10/28', length: 4430, width: 60, heading: 100 },
              { name: '11/29', length: 3810, width: 45, heading: 110 },
              { name: '09/27', length: 2813, width: 45, heading: 90 }
            ]
          },
          {
            id: 'BOM',
            name: 'Chhatrapati Shivaji Maharaj International Airport',
            iata: 'BOM',
            icao: 'VABB',
            lat: 19.0875,
            lon: 72.8700,
            elevation: 11,
            boundary: [
              [72.8550, 19.0950], [72.8850, 19.0950], [72.8850, 19.0800],
              [72.8700, 19.0750], [72.8550, 19.0800], [72.8550, 19.0950]
            ],
            atcTower: {
              lat: 19.0875,
              lon: 72.8700,
              height: 67.5,
              frequency: '121.05'
            },
            runways: [
              { name: '09/27', length: 3445, width: 45, heading: 90 },
              { name: '14/32', length: 2925, width: 45, heading: 140 }
            ]
          }
        ];


        // Create flight routes
        const routes = [
          {
            id: 'DEL-BOM-001',
            name: 'Delhi to Mumbai Morning Flight',
            aircraft: {
              type: 'boeing_737',
              registration: 'VT-DEL',
              airline: 'Air India',
              color: '#FF0000'
            },
            waypoints: [
              { name: 'TAKEOFF', lat: 28.5525, lon: 77.0925, altitude: 0, speed: 0, action: 'takeoff' },
              { name: 'CLIMB', lat: 28.6000, lon: 77.2000, altitude: 1000, speed: 250, action: 'climb' },
              { name: 'CRUISE_START', lat: 26.0000, lon: 76.0000, altitude: 11000, speed: 450, action: 'cruise' },
              { name: 'CRUISE_MID', lat: 24.0000, lon: 75.0000, altitude: 11000, speed: 480, action: 'cruise' },
              { name: 'CRUISE_END', lat: 21.0000, lon: 74.0000, altitude: 11000, speed: 450, action: 'cruise' },
              { name: 'DESCENT', lat: 19.5000, lon: 73.2000, altitude: 3000, speed: 280, action: 'descend' },
              { name: 'APPROACH', lat: 19.1500, lon: 72.9500, altitude: 500, speed: 180, action: 'approach' },
              { name: 'LANDING', lat: 19.0875, lon: 72.8700, altitude: 0, speed: 140, action: 'landing' }
            ],
            simulation: {
              enabled: true,
              loop: true,
              speedMultiplier: 50,
              startDelay: 0
            }
          },
          {
            id: 'BOM-DEL-002',
            name: 'Mumbai to Delhi Evening Flight',
            aircraft: {
              type: 'airbus_a320',
              registration: 'VT-BOM',
              airline: 'IndiGo',
              color: '#0033CC'
            },
            waypoints: [
              { name: 'TAKEOFF', lat: 19.0875, lon: 72.8700, altitude: 0, speed: 0, action: 'takeoff' },
              { name: 'CLIMB', lat: 19.2000, lon: 73.1000, altitude: 1000, speed: 250, action: 'climb' },
              { name: 'CRUISE_START', lat: 21.0000, lon: 74.0000, altitude: 10500, speed: 430, action: 'cruise' },
              { name: 'CRUISE_MID', lat: 24.0000, lon: 75.0000, altitude: 10500, speed: 460, action: 'cruise' },
              { name: 'CRUISE_END', lat: 26.0000, lon: 76.0000, altitude: 10500, speed: 430, action: 'cruise' },
              { name: 'DESCENT', lat: 28.2000, lon: 77.5000, altitude: 3000, speed: 280, action: 'descend' },
              { name: 'APPROACH', lat: 28.4500, lon: 77.1500, altitude: 500, speed: 180, action: 'approach' },
              { name: 'LANDING', lat: 28.5525, lon: 77.0925, altitude: 0, speed: 140, action: 'landing' }
            ],
            simulation: {
              enabled: true,
              loop: true,
              speedMultiplier: 50,
              startDelay: 5000
            }
          }
        ];


        // Create manifest
        const manifest = {
          features: {
            airportBoundaries: true,
            atcTowers: true,
            flightSimulation: true,
            flightTrails: true,
            flightLabels: true
          },
          version: '2.0.0',
          apiIntegrated: true
        };

        setAssets({
          airports,
          routes,
          indiaBoundary,
          manifest
        });


        setLoading(false);
      } catch (err) {
        console.error('💥 [EnhancedAssetLoader] Critical error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  return { assets, loading, error };
};

/**
 * Enhanced Asset Renderer with Zoom-Based Scaling
 * Dynamically scales components based on zoomDistance (km = zoomDistance * 220)
 */
export const EnhancedAssetRenderer = ({ assets, enabled = true, zoomDistance = 50 }) => {
  
  if (!enabled || !assets) {
    return null;
  }

  const { airports, routes, manifest } = assets;
  const altitudeKm = zoomDistance * 220;
  
  // Dynamic scaling based on zoom level
  // At 1000km (zoomDistance ≈ 4.5): scale factor = 1.0 (normal size)
  // At 10000km (zoomDistance ≈ 45): scale factor = 0.1 (10x smaller)
  // At 100km (zoomDistance ≈ 0.45): scale factor = 10.0 (10x bigger)
  const scaleFactor = Math.max(0.1, Math.min(10.0, 4.5 / zoomDistance));
  
  
  return (
    <group name="enhanced-asset-renderer" scale={[scaleFactor, scaleFactor, scaleFactor]}>
      
      {/* Render airports only at reasonable zoom levels (< 5000km) */}
      {altitudeKm < 5000 && manifest?.features?.airportBoundaries && airports.map((airport) => (
        <group key={airport.id} name={`airport-${airport.id}`}>
          
          {/* Airport Boundary */}
          <AirportBoundary
            coordinates={[airport.boundary]}
            name={airport.name}
            color="#FFD700"
            opacity={0.4}
          />
          
          {/* ATC Tower (only at close zoom < 2000km) */}
          {altitudeKm < 2000 && manifest?.features?.atcTowers && (
            <ATCTower
              lat={airport.atcTower.lat}
              lon={airport.atcTower.lon}
              height={airport.atcTower.height}
              name={`${airport.iata} Tower`}
              frequency={airport.atcTower.frequency}
            />
          )}
        </group>
      ))}

      {/* Render flight simulations (visible at all zoom levels) */}
      {manifest?.features?.flightSimulation && routes.map((route) => (
        <FlightSimulator
          key={route.id}
          route={route}
          enabled={route.simulation?.enabled ?? true}
          speedMultiplier={route.simulation?.speedMultiplier ?? 50}
        />
      ))}
      
    </group>
  );
};

export default { useEnhancedAssetLoader, EnhancedAssetRenderer };