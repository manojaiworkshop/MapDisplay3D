import { useState, useEffect } from 'react';
import { AirportBoundary, ATCTower } from './AssetComponents';
import FlightSimulator from './FlightSimulator';

/**
 * Asset Loader Hook
 * Dynamically loads all assets from asset_rendering folder
 */
export const useAssetLoader = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState({
    airports: [],
    routes: [],
    aircraftConfig: null,
    manifest: null
  });

  const basePath = '/asset_rendering/';

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);

        // Load manifest first
        const manifestResponse = await fetch(`${basePath}asset_manifest.json`);
        if (!manifestResponse.ok) {
          throw new Error(`Failed to load manifest: ${manifestResponse.statusText}`);
        }
        const manifest = await manifestResponse.json();

        // Load airports
        const airportPromises = manifest.assetManifest.airports
          .filter(a => a.enabled)
          .map(async (airport) => {
            try {
              const response = await fetch(`${basePath}${airport.file}`);
              if (!response.ok) throw new Error(`Failed to load ${airport.file}`);
              const data = await response.json();
              return { id: airport.id, name: airport.name, data };
            } catch (err) {
              console.error(`❌ [AssetLoader] Error loading airport ${airport.id}:`, err);
              return null;
            }
          });

        const airports = (await Promise.all(airportPromises)).filter(Boolean);

        // Load routes
        const routePromises = manifest.assetManifest.routes
          .filter(r => r.enabled)
          .map(async (routeFile) => {
            try {
              const response = await fetch(`${basePath}${routeFile.file}`);
              if (!response.ok) throw new Error(`Failed to load ${routeFile.file}`);
              const data = await response.json();
              return data.routes || [];
            } catch (err) {
              console.error(`❌ [AssetLoader] Error loading routes ${routeFile.id}:`, err);
              return [];
            }
          });

        const routeArrays = await Promise.all(routePromises);
        const routes = routeArrays.flat();

        // Load aircraft config
        let aircraftConfig = null;
        const configEntry = manifest.assetManifest.config.find(c => c.id === 'aircraft_config');
        if (configEntry && configEntry.enabled) {
          try {
            const response = await fetch(`${basePath}${configEntry.file}`);
            if (!response.ok) throw new Error(`Failed to load ${configEntry.file}`);
            aircraftConfig = await response.json();
          } catch (err) {
            console.error('❌ [AssetLoader] Error loading aircraft config:', err);
          }
        }

        setAssets({
          airports,
          routes,
          aircraftConfig,
          manifest
        });


        setLoading(false);
      } catch (err) {
        console.error('💥 [AssetLoader] Critical error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  return { assets, loading, error };
};

/**
 * Asset Renderer Component
 * Renders all loaded assets in the 3D scene
 */
export const AssetRenderer = ({ assets, enabled = true }) => {
  
  if (!enabled || !assets) {
    return null;
  }

  const { airports, routes, aircraftConfig, manifest } = assets;
  
  
  // Temporary alert for debugging
  if (airports && airports.length > 0) {
  }

  return (
    <group name="asset-renderer">
      {/* Render airports */}
      {manifest?.features?.airportBoundaries && airports.map((airport) => (
        <group key={airport.id} name={`airport-${airport.id}`}>
          {airport.data.features.map((feature, idx) => {
            if (feature.geometry.type === 'Polygon') {
              // Render airport boundary
              return (
                <AirportBoundary
                  key={`${airport.id}-boundary-${idx}`}
                  coordinates={feature.geometry.coordinates}
                  name={feature.properties.name}
                  color="#FFD700"
                  opacity={0.2}
                />
              );
            }
            
            if (feature.properties.type === 'atc_tower' && manifest?.features?.atcTowers) {
              // Render ATC tower
              const [lon, lat, height = 0] = feature.geometry.coordinates;
              return (
                <ATCTower
                  key={`${airport.id}-tower-${idx}`}
                  lat={lat}
                  lon={lon}
                  height={height}
                  name={feature.properties.name}
                  frequency={feature.properties.frequency}
                />
              );
            }
            
            return null;
          })}
        </group>
      ))}

      {/* Render flight simulations */}
      {manifest?.features?.flightSimulation && routes.map((route) => (
        <FlightSimulator
          key={route.id}
          route={route}
          enabled={route.simulation?.enabled ?? true}
          speedMultiplier={route.simulation?.speedMultiplier ?? 100}
        />
      ))}
    </group>
  );
};

export default { useAssetLoader, AssetRenderer };
