import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  geoToScreen, 
  screenToGeo, 
  calculateBounds, 
  fitMapToView,
  distance,
  clamp,
  easeInOutCubic 
} from '../utils/mapUtils';

// Helper: Find path through stations using geographic proximity
// This creates a route visiting intermediate stations between source and destination
const findStationPath = (srcIdx, dstIdx, stations) => {
  if (srcIdx === dstIdx) return [srcIdx];
  
  const src = stations[srcIdx];
  const dst = stations[dstIdx];
  
  // Use greedy nearest-neighbor approach with geographical distance
  // Start from source, repeatedly pick nearest unvisited station towards destination
  const visited = new Set([srcIdx]);
  const path = [srcIdx];
  let current = srcIdx;
  
  while (current !== dstIdx) {
    const currentStation = stations[current];
    const dstStation = stations[dstIdx];
    
    // Calculate distance to destination
    const distToDst = Math.sqrt(
      Math.pow(dstStation.lat - currentStation.lat, 2) + 
      Math.pow(dstStation.lon - currentStation.lon, 2)
    );
    
    // Find next station: unvisited, reasonably close to current, moves towards destination
    let bestNext = -1;
    let bestScore = Infinity;
    
    for (let i = 0; i < stations.length; i++) {
      if (visited.has(i)) continue;
      
      const candidate = stations[i];
      const distFromCurrent = Math.sqrt(
        Math.pow(candidate.lat - currentStation.lat, 2) + 
        Math.pow(candidate.lon - currentStation.lon, 2)
      );
      const distCandidateToDst = Math.sqrt(
        Math.pow(dstStation.lat - candidate.lat, 2) + 
        Math.pow(dstStation.lon - candidate.lon, 2)
      );
      
      // Score: prefer stations that are close AND reduce distance to destination
      // Penalize if candidate is further from destination than current
      const progressScore = distCandidateToDst < distToDst ? 0 : (distCandidateToDst - distToDst) * 2;
      const score = distFromCurrent + progressScore;
      
      // Only consider reasonably close stations (not too far away)
      if (distFromCurrent < 5.0 && score < bestScore) {
        bestScore = score;
        bestNext = i;
      }
    }
    
    // If no intermediate station found or we're close enough, jump to destination
    if (bestNext === -1 || distToDst < 2.0) {
      path.push(dstIdx);
      break;
    }
    
    visited.add(bestNext);
    path.push(bestNext);
    current = bestNext;
    
    // Safety: prevent infinite loops
    if (path.length > stations.length) {
      path.push(dstIdx);
      break;
    }
  }
  
  return path;
};

const MapCanvas = forwardRef(({ 
  stations = [], 
  indiaBoundary = null, 
  stateBoundaries = null,
  onStationClick = null 
}, ref) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Map state (similar to MapWidget)
  const [mapState, setMapState] = useState({
    centerLat: 23.0,
    centerLon: 78.0,
    scale: 1.0,
    minScale: 0.5,
    maxScale: 2600.0
  });
  
  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [hoveredStationIndex, setHoveredStationIndex] = useState(-1);
  const [clickedStationIndex, setClickedStationIndex] = useState(-1);
  
  // Animation state
  const animationRef = useRef(null);
  const targetScaleRef = useRef(mapState.scale);
  const targetCenterRef = useRef({ lat: mapState.centerLat, lon: mapState.centerLon });
  // Trip state
  const tripRef = useRef({
    running: false,
    path: [], // array of {lat, lon}
    progress: 0, // 0..1
    speed: 1.0, // multiplier
    enginePos: null, // {lat, lon}
    srcIndex: -1,
    dstIndex: -1
  });
  
  // expose imperative methods to parent
  useImperativeHandle(ref, () => ({
    zoomTo: (value) => {
      setMapState(prev => ({ ...prev, scale: value }));
    },
    zoomBy: (factor) => {
      setMapState(prev => ({ ...prev, scale: prev.scale * factor }));
    },
    centerOn: (lat, lon) => {
      setMapState(prev => ({ ...prev, centerLat: lat, centerLon: lon }));
    },
    gotoStationByName: (name) => {
      const idx = stations.findIndex(s => (s.name || '').toLowerCase().includes(name.toLowerCase()));
      if (idx >= 0) {
        const s = stations[idx];
        // Calculate scale for 400km radius view
        // At equator: 1 degree ≈ 111km, so 400km ≈ 3.6 degrees
        // For 400km radius (800km diameter), we need about 7.2 degrees visible
        // Scale calculation: if we want 7-8 degrees to fit in viewport
        const targetDegrees = 8; // degrees to show (400km radius ≈ 3.6 degrees, doubled for diameter)
        const scale400km = Math.min(dimensions.width, dimensions.height) / targetDegrees;
        
        setMapState(prev => ({ 
          ...prev, 
          centerLat: s.lat, 
          centerLon: s.lon,
          scale: scale400km
        }));
      }
    },
    zoomOutToIndia: () => {
      // Zoom out to show full India map by refitting to India boundary
      if (indiaBoundary && indiaBoundary.features && indiaBoundary.features.length > 0) {
        const feature = indiaBoundary.features[0];
        if (feature.geometry && feature.geometry.coordinates) {
          let allCoords = [];
          
          if (feature.geometry.type === 'Polygon') {
            allCoords = feature.geometry.coordinates[0];
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
              allCoords = allCoords.concat(polygon[0]);
            });
          }
          
          if (allCoords.length > 0) {
            const bounds = calculateBounds(allCoords);
            const fitParams = fitMapToView(bounds, dimensions.width, dimensions.height, 0.1);
            
            setMapState(prev => ({
              ...prev,
              centerLat: fitParams.centerLat,
              centerLon: fitParams.centerLon,
              scale: fitParams.scale
            }));
          }
        }
      }
    }
    ,
    // Trip control methods
    startTrip: ({ source, destination, speed = 1.0 }) => {
      // find stations
      const srcIdx = stations.findIndex(s => (s.name || '').toLowerCase() === (source || '').toLowerCase());
      const dstIdx = stations.findIndex(s => (s.name || '').toLowerCase() === (destination || '').toLowerCase());
      if (srcIdx < 0 || dstIdx < 0) {
        console.warn('Trip start failed: stations not found', source, destination);
        return;
      }

      // Find path through intermediate stations using railway connections
      const stationPath = findStationPath(srcIdx, dstIdx, stations);
      
      // Create interpolated path with smooth segments between each station
      const path = [];
      const segmentsPerStation = 20; // points between each station pair
      
      for (let i = 0; i < stationPath.length - 1; i++) {
        const from = stations[stationPath[i]];
        const to = stations[stationPath[i + 1]];
        
        // Interpolate between this station and next
        for (let j = 0; j < segmentsPerStation; j++) {
          const t = j / segmentsPerStation;
          const lat = from.lat + (to.lat - from.lat) * t;
          const lon = from.lon + (to.lon - from.lon) * t;
          path.push({ lat, lon });
        }
      }
      
      // Add final destination
      const finalStation = stations[stationPath[stationPath.length - 1]];
      path.push({ lat: finalStation.lat, lon: finalStation.lon });

      tripRef.current = {
        running: true,
        path,
        stationPath, // store which stations we're traveling through
        progress: 0,
        speed: speed || 1.0,
        enginePos: path.length > 0 ? path[0] : null,
        srcIndex: srcIdx,
        dstIndex: dstIdx
      };

      // Ensure initial center on engine
      setMapState(prev => ({ ...prev, centerLat: path[0].lat, centerLon: path[0].lon }));

      // start animation loop
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(step);
      }
    },
    stopTrip: () => {
      tripRef.current.running = false;
      tripRef.current.path = [];
      tripRef.current.enginePos = null;
      tripRef.current.progress = 0;
      tripRef.current.srcIndex = -1;
      tripRef.current.dstIndex = -1;
    }
  }));
  
  // Handle canvas resize - use full parent height (no scroll in Y direction)
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth,
          height: parent.clientHeight  // Use full available height
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Fit map to India boundary on load
  useEffect(() => {
    if (indiaBoundary && indiaBoundary.features && indiaBoundary.features.length > 0) {
      const feature = indiaBoundary.features[0];
      if (feature.geometry && feature.geometry.coordinates) {
        let allCoords = [];
        
        // Handle both Polygon and MultiPolygon
        if (feature.geometry.type === 'Polygon') {
          allCoords = feature.geometry.coordinates[0];
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(polygon => {
            allCoords = allCoords.concat(polygon[0]);
          });
        }
        
        if (allCoords.length > 0) {
          const bounds = calculateBounds(allCoords);
          const fitParams = fitMapToView(bounds, dimensions.width, dimensions.height, 0.1);
          
          setMapState(prev => ({
            ...prev,
            centerLat: fitParams.centerLat,
            centerLon: fitParams.centerLon,
            scale: fitParams.scale
          }));
          
          targetScaleRef.current = fitParams.scale;
          targetCenterRef.current = { lat: fitParams.centerLat, lon: fitParams.centerLon };
        }
      }
    }
  }, [indiaBoundary, dimensions]);
  
  // Draw function (similar to MapWidget::paintEvent)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Fill background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw India boundary
    if (indiaBoundary) {
      drawIndiaBoundary(ctx, width, height);
    }
    
    // Draw state boundaries
    if (stateBoundaries) {
      drawStateBoundaries(ctx, width, height);
    }
    
    // Draw railway tracks between stations
    if (stations.length > 1) {
      drawRailwayTracks(ctx, width, height);
    }
    
    // Draw stations
    drawStations(ctx, width, height);

    // Draw trip path and engine if running
    if (tripRef.current && tripRef.current.path && tripRef.current.path.length > 1) {
      drawTrip(ctx, width, height);
    }
    
    // Draw zoom controls
    drawZoomControls(ctx, width, height);
    
    // Draw popup if station is clicked
    if (clickedStationIndex >= 0 && clickedStationIndex < stations.length) {
      drawPopup(ctx, width, height, clickedStationIndex);
    }
    
  }, [dimensions, mapState, indiaBoundary, stateBoundaries, stations, hoveredStationIndex, clickedStationIndex]);

  // Animation step for trip movement
  const step = (timestamp) => {
    const trip = tripRef.current;
    if (!trip || !trip.running) {
      animationRef.current = null;
      return;
    }

    // advance progress based on speed
    const delta = 1 / (trip.path.length * (1 / trip.speed));
    trip.progress = Math.min(1, trip.progress + delta);
    const idx = Math.floor(trip.progress * (trip.path.length - 1));
    trip.enginePos = trip.path[idx];

    // center map on engine position
    if (trip.enginePos) {
      setMapState(prev => ({ ...prev, centerLat: trip.enginePos.lat, centerLon: trip.enginePos.lon }));
    }

    // if completed
    if (trip.progress >= 1) {
      trip.running = false;
      animationRef.current = null;
      return;
    }

    // schedule next frame
    animationRef.current = requestAnimationFrame(step);
  };

  const drawTrip = (ctx, width, height) => {
    const trip = tripRef.current;
    if (!trip || !trip.path || trip.path.length === 0) return;

    // 1. Highlight the route path through all stations (dashed line)
    if (trip.stationPath && trip.stationPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.9)'; // Dark orange for active route
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.setLineDash([12, 6]); // Dashed line
      
      ctx.beginPath();
      let firstPoint = true;
      for (let i = 0; i < trip.stationPath.length; i++) {
        const stationIdx = trip.stationPath[i];
        const station = stations[stationIdx];
        const pos = geoToScreen(
          station.lat, station.lon,
          mapState.centerLat, mapState.centerLon,
          mapState.scale, width, height
        );
        
        if (firstPoint) {
          ctx.moveTo(pos.x, pos.y);
          firstPoint = false;
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      ctx.restore();
    }

    // 2. Highlight all stations along the route
    if (trip.stationPath) {
      trip.stationPath.forEach((stationIdx, idx) => {
        const station = stations[stationIdx];
        const pos = geoToScreen(
          station.lat, station.lon,
          mapState.centerLat, mapState.centerLon,
          mapState.scale, width, height
        );
        
        // Different colors for source, destination, and intermediate
        let fillColor = 'rgba(255, 215, 0, 0.95)'; // Gold for intermediate
        let strokeColor = '#FFA500';
        let radius = 10;
        
        if (idx === 0) {
          fillColor = 'rgba(0, 200, 0, 0.95)'; // Green for source
          strokeColor = '#00AA00';
          radius = 12;
        }
        if (idx === trip.stationPath.length - 1) {
          fillColor = 'rgba(255, 50, 50, 0.95)'; // Red for destination
          strokeColor = '#CC0000';
          radius = 12;
        }
        
        // Draw station marker
        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner white dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Label stations along route
        if (mapState.scale > 15) {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          const label = station.name || `Station ${stationIdx}`;
          ctx.strokeText(label, pos.x, pos.y - radius - 8);
          ctx.fillText(label, pos.x, pos.y - radius - 8);
        }
        
        ctx.restore();
      });
    }

    // 3. Draw the moving engine icon
    if (trip.enginePos) {
      const engineScreenPos = geoToScreen(
        trip.enginePos.lat, trip.enginePos.lon,
        mapState.centerLat, mapState.centerLon,
        mapState.scale, width, height
      );

      ctx.save();
      ctx.translate(engineScreenPos.x, engineScreenPos.y);
      
      // Engine shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(-10, -6, 20, 14);
      
      // Engine body (red rectangle)
      ctx.fillStyle = '#D32F2F';
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 2;
      ctx.fillRect(-12, -8, 24, 16);
      ctx.strokeRect(-12, -8, 24, 16);
      
      // Engine front (triangle)
      ctx.fillStyle = '#FF5252';
      ctx.beginPath();
      ctx.moveTo(12, -8);
      ctx.lineTo(18, 0);
      ctx.lineTo(12, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Chimney
      ctx.fillStyle = '#424242';
      ctx.fillRect(-6, -14, 6, 6);
      
      // Wheels (two circles at bottom)
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(-6, 9, 4, 0, Math.PI * 2);
      ctx.arc(6, 9, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Window
      ctx.fillStyle = '#90CAF9';
      ctx.fillRect(-4, -4, 8, 6);
      
      ctx.restore();
      
      // Progress indicator below engine
      const progressPercent = ((trip.progress * 100) || 0).toFixed(0);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(engineScreenPos.x - 30, engineScreenPos.y + 22, 60, 20);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`🚂 ${progressPercent}%`, engineScreenPos.x, engineScreenPos.y + 35);
      ctx.restore();
    }
  };
  
  // Draw India boundary
  const drawIndiaBoundary = (ctx, width, height) => {
    if (!indiaBoundary.features || indiaBoundary.features.length === 0) return;
    
    const feature = indiaBoundary.features[0];
    if (!feature.geometry) return;
    
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(240, 240, 240, 0.3)';
    
    const drawPolygon = (coordinates) => {
      ctx.beginPath();
      coordinates.forEach((coord, i) => {
        const [lon, lat] = coord;
        const pos = geoToScreen(
          lat, lon, 
          mapState.centerLat, mapState.centerLon, 
          mapState.scale, width, height
        );
        
        if (i === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.closePath();
    };
    
    if (feature.geometry.type === 'Polygon') {
      drawPolygon(feature.geometry.coordinates[0]);
      ctx.fill();
      ctx.stroke();
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach(polygon => {
        drawPolygon(polygon[0]);
        ctx.fill();
        ctx.stroke();
      });
    }
    
    ctx.restore();
  };
  
  // Draw state boundaries
  const drawStateBoundaries = (ctx, width, height) => {
    if (!stateBoundaries.features) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
    ctx.lineWidth = 1;
    
    stateBoundaries.features.forEach(feature => {
      if (!feature.geometry) return;
      
      const drawPolygon = (coordinates) => {
        ctx.beginPath();
        coordinates.forEach((coord, i) => {
          const [lon, lat] = coord;
          const pos = geoToScreen(
            lat, lon,
            mapState.centerLat, mapState.centerLon,
            mapState.scale, width, height
          );
          
          if (i === 0) {
            ctx.moveTo(pos.x, pos.y);
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        });
        ctx.closePath();
      };
      
      if (feature.geometry.type === 'Polygon') {
        drawPolygon(feature.geometry.coordinates[0]);
        ctx.stroke();
      } else if (feature.geometry.type === 'MultiPolygon') {
        feature.geometry.coordinates.forEach(polygon => {
          drawPolygon(polygon[0]);
          ctx.stroke();
        });
      }
    });
    
    ctx.restore();
  };
  
  // Draw railway tracks
  const drawRailwayTracks = (ctx, width, height) => {
    ctx.save();
    
    for (let i = 0; i < stations.length - 1; i++) {
      const station1 = stations[i];
      const station2 = stations[i + 1];
      
      const pos1 = geoToScreen(
        station1.lat, station1.lon,
        mapState.centerLat, mapState.centerLon,
        mapState.scale, width, height
      );
      
      const pos2 = geoToScreen(
        station2.lat, station2.lon,
        mapState.centerLat, mapState.centerLon,
        mapState.scale, width, height
      );
      
      // Main railway line
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
      
      // Draw railway sleepers if zoomed in enough
      if (mapState.scale > 50) {
        drawRailwaySleepers(ctx, pos1, pos2);
      }
    }
    
    ctx.restore();
  };
  
  // Draw railway sleepers (ties)
  const drawRailwaySleepers = (ctx, start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const sleeperSpacing = 10;
    const sleeperCount = Math.floor(length / sleeperSpacing);
    
    ctx.strokeStyle = 'rgba(100, 50, 0, 0.6)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= sleeperCount; i++) {
      const t = i / sleeperCount;
      const x = start.x + dx * t;
      const y = start.y + dy * t;
      
      const perpX = -dy / length * 4;
      const perpY = dx / length * 4;
      
      ctx.beginPath();
      ctx.moveTo(x - perpX, y - perpY);
      ctx.lineTo(x + perpX, y + perpY);
      ctx.stroke();
    }
  };
  
  // Draw stations
  const drawStations = (ctx, width, height) => {
    stations.forEach((station, index) => {
      const pos = geoToScreen(
        station.lat, station.lon,
        mapState.centerLat, mapState.centerLon,
        mapState.scale, width, height
      );
      
      // Check if station is visible
      if (pos.x < -50 || pos.x > width + 50 || pos.y < -50 || pos.y > height + 50) {
        return;
      }
      
      const isHovered = index === hoveredStationIndex;
      const isClicked = index === clickedStationIndex;
      const radius = isHovered || isClicked ? 10 : 8;
      
      // Draw shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Draw outer circle
      ctx.save();
      ctx.fillStyle = '#FFA500'; // Orange
      ctx.strokeStyle = isClicked ? '#FF6600' : '#CC8400';
      ctx.lineWidth = isClicked ? 3 : 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      
      // Draw inner circle
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Draw station name if zoomed in enough
      if (mapState.scale > 20) {
        ctx.save();
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Background for text
        const textMetrics = ctx.measureText(station.name);
        const textWidth = textMetrics.width;
        const textHeight = 14;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(
          pos.x - textWidth / 2 - 2,
          pos.y + radius + 2,
          textWidth + 4,
          textHeight
        );
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText(station.name, pos.x, pos.y + radius + 4);
        ctx.restore();
      }
    });
  };
  
  // Draw popup for clicked station
  const drawPopup = (ctx, width, height, stationIndex) => {
    const station = stations[stationIndex];
    const pos = geoToScreen(
      station.lat, station.lon,
      mapState.centerLat, mapState.centerLon,
      mapState.scale, width, height
    );
    
    ctx.save();
    
    // Measure text
    ctx.font = 'bold 14px Arial';
    const textMetrics = ctx.measureText(station.name);
    const textWidth = textMetrics.width;
    const padding = 10;
    const popupWidth = textWidth + padding * 2;
    const popupHeight = 30;
    
    // Calculate popup position (above station)
    let popupX = pos.x - popupWidth / 2;
    let popupY = pos.y - 50;
    
    // Keep popup within bounds
    if (popupX < 10) popupX = 10;
    if (popupX + popupWidth > width - 10) popupX = width - popupWidth - 10;
    if (popupY < 10) popupY = pos.y + 20;
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(popupX + 3, popupY + 3, popupWidth, popupHeight);
    
    // Draw popup background
    ctx.fillStyle = '#FFEB3B'; // Yellow
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Rounded rectangle
    const radius = 5;
    ctx.beginPath();
    ctx.moveTo(popupX + radius, popupY);
    ctx.lineTo(popupX + popupWidth - radius, popupY);
    ctx.quadraticCurveTo(popupX + popupWidth, popupY, popupX + popupWidth, popupY + radius);
    ctx.lineTo(popupX + popupWidth, popupY + popupHeight - radius);
    ctx.quadraticCurveTo(popupX + popupWidth, popupY + popupHeight, popupX + popupWidth - radius, popupY + popupHeight);
    ctx.lineTo(popupX + radius, popupY + popupHeight);
    ctx.quadraticCurveTo(popupX, popupY + popupHeight, popupX, popupY + popupHeight - radius);
    ctx.lineTo(popupX, popupY + radius);
    ctx.quadraticCurveTo(popupX, popupY, popupX + radius, popupY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.name, popupX + popupWidth / 2, popupY + popupHeight / 2);
    
    ctx.restore();
  };
  
  // Draw zoom controls
  const drawZoomControls = (ctx, width, height) => {
    const controlX = width - 45;
    const controlY = 15;
    const buttonSize = 30;
    const spacing = 5;
    
    // Draw zoom in button
    drawZoomButton(ctx, controlX, controlY, buttonSize, '+');
    
    // Draw zoom out button
    drawZoomButton(ctx, controlX, controlY + buttonSize + spacing, buttonSize, '-');
    
    // Draw zoom meter
    drawZoomMeter(ctx, controlX, controlY + (buttonSize + spacing) * 2 + 10, buttonSize);
  };
  
  // Draw individual zoom button
  const drawZoomButton = (ctx, x, y, size, label) => {
    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + 2, y + 2, size, size);
    
    // Button background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);
    
    // Label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + size / 2, y + size / 2);
    
    ctx.restore();
  };
  
  // Draw zoom meter
  const drawZoomMeter = (ctx, x, y, width) => {
    const height = 100;
    const currentZoom = (mapState.scale - mapState.minScale) / (mapState.maxScale - mapState.minScale);
    
    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Fill level
    const fillHeight = height * currentZoom;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x, y + height - fillHeight, width, fillHeight);
    
    ctx.restore();
  };
  
  // Mouse move handler
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isPanning) {
      // Pan the map
      const dx = mouseX - lastMousePos.x;
      const dy = mouseY - lastMousePos.y;
      
      setMapState(prev => ({
        ...prev,
        centerLon: prev.centerLon - dx / prev.scale,
        centerLat: prev.centerLat + dy / prev.scale
      }));
      
      setLastMousePos({ x: mouseX, y: mouseY });
      canvas.style.cursor = 'grabbing';
    } else {
      // Check for station hover
      let foundHover = -1;
      
      stations.forEach((station, index) => {
        const pos = geoToScreen(
          station.lat, station.lon,
          mapState.centerLat, mapState.centerLon,
          mapState.scale, dimensions.width, dimensions.height
        );
        
        const dist = distance({ x: mouseX, y: mouseY }, pos);
        if (dist < 12) {
          foundHover = index;
        }
      });
      
      setHoveredStationIndex(foundHover);
      canvas.style.cursor = foundHover >= 0 ? 'pointer' : 'default';
      
      // Check zoom controls
      const controlX = dimensions.width - 45;
      const controlY = 15;
      const buttonSize = 30;
      const spacing = 5;
      
      if (mouseX >= controlX && mouseX <= controlX + buttonSize) {
        if (mouseY >= controlY && mouseY <= controlY + buttonSize) {
          canvas.style.cursor = 'pointer';
        } else if (mouseY >= controlY + buttonSize + spacing && mouseY <= controlY + (buttonSize + spacing) * 2) {
          canvas.style.cursor = 'pointer';
        }
      }
    }
  };
  
  // Mouse down handler
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check zoom controls first
    const controlX = dimensions.width - 45;
    const controlY = 15;
    const buttonSize = 30;
    const spacing = 5;
    
    if (mouseX >= controlX && mouseX <= controlX + buttonSize) {
      if (mouseY >= controlY && mouseY <= controlY + buttonSize) {
        // Zoom in
        handleZoom(1.3, mouseX, mouseY);
        return;
      } else if (mouseY >= controlY + buttonSize + spacing && mouseY <= controlY + (buttonSize + spacing) * 2) {
        // Zoom out
        handleZoom(0.77, mouseX, mouseY);
        return;
      }
    }
    
    // Check for station click
    let foundClick = -1;
    
    stations.forEach((station, index) => {
      const pos = geoToScreen(
        station.lat, station.lon,
        mapState.centerLat, mapState.centerLon,
        mapState.scale, dimensions.width, dimensions.height
      );
      
      const dist = distance({ x: mouseX, y: mouseY }, pos);
      if (dist < 12) {
        foundClick = index;
      }
    });
    
    if (foundClick >= 0) {
      setClickedStationIndex(prev => prev === foundClick ? -1 : foundClick);
      if (onStationClick && foundClick >= 0) {
        onStationClick(stations[foundClick]);
      }
    } else {
      setClickedStationIndex(-1);
      setIsPanning(true);
      setLastMousePos({ x: mouseX, y: mouseY });
    }
  };
  
  // Mouse up handler
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  // Wheel handler for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    handleZoom(zoomFactor, mouseX, mouseY);
  };
  
  // Zoom handler
  const handleZoom = (zoomFactor, mouseX, mouseY) => {
    setMapState(prev => {
      const newScale = clamp(
        prev.scale * zoomFactor,
        prev.minScale,
        prev.maxScale
      );
      
      // Zoom towards mouse position
      const geo = screenToGeo(
        mouseX, mouseY,
        prev.centerLat, prev.centerLon,
        prev.scale,
        dimensions.width, dimensions.height
      );
      
      const newGeo = screenToGeo(
        mouseX, mouseY,
        prev.centerLat, prev.centerLon,
        newScale,
        dimensions.width, dimensions.height
      );
      
      return {
        ...prev,
        scale: newScale,
        centerLat: prev.centerLat + (geo.lat - newGeo.lat),
        centerLon: prev.centerLon + (geo.lon - newGeo.lon)
      };
    });
  };
  
  // Redraw on state changes
  useEffect(() => {
    draw();
  }, [draw]);
  
  // Set up canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    draw();
  }, [dimensions, draw]);
  
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-default"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    />
  );
});

export default MapCanvas;
