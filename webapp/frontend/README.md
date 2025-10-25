# Indian Railway Stations Map - Frontend

React + Tailwind CSS + Canvas API web application for visualizing Indian Railway stations.

## Features

- 🎨 **Canvas-based Rendering** - Native HTML5 Canvas API (no external map libraries)
- 🗺️ **Interactive Map** - Pan, zoom, click stations
- 🚄 **Railway Visualization** - Stations, routes, and boundaries
- 🎯 **Responsive Design** - Built with Tailwind CSS
- ⚡ **Fast & Lightweight** - Vite build system

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── MapCanvas.jsx      # Main canvas component (MapWidget equivalent)
│   ├── utils/
│   │   ├── api.js              # Backend API client
│   │   └── mapUtils.js         # Coordinate conversion utilities
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles with Tailwind
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── postcss.config.js           # PostCSS configuration
```

## Components

### MapCanvas

The main canvas component that replicates all MapWidget functionality:

- **Rendering**: India boundary, states, stations, railway tracks
- **Interaction**: Pan (click+drag), zoom (wheel/buttons), station click
- **Features**: Hover tooltips, click popups, zoom controls, zoom meter
- **Animations**: Smooth pan and zoom with easing

### API Integration

- Fetches GeoJSON data from FastAPI backend
- Supports multiple datasets (default 22 stations, full 90+ stations)
- Handles India boundary (detailed/simple) and state boundaries

## Controls

- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Pan around the map
- **Click Station**: Show station information
- **Zoom Buttons**: Top-right corner controls
- **Header Controls**: Dataset selector, state boundaries toggle

## Environment Variables

Create a `.env` file for custom API URL:

```env
VITE_API_URL=http://localhost:8000
```

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Canvas API** - Native 2D graphics rendering

## Canvas Implementation

The MapCanvas component implements the same functionality as the Qt MapWidget:

1. **Coordinate Conversion**: `geoToScreen()` and `screenToGeo()`
2. **Polygon Rendering**: India boundary and state boundaries
3. **Station Markers**: Orange circles with white centers
4. **Railway Tracks**: Red lines with sleepers when zoomed in
5. **Interactive Elements**: Hover detection, click handling
6. **Zoom Controls**: Visual buttons and zoom meter
7. **Popups**: Yellow popup boxes for clicked stations

## Performance

- Renders at 60 FPS with smooth animations
- Handles 600+ boundary points efficiently
- Optimized canvas drawing operations
- Responsive to window resize
