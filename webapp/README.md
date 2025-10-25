# 🚄 Indian Railway Stations Map - Chat-Controlled Web Application

A modern web application for visualizing Indian Railway Stations with **natural language chat-based control**. Built with React, Canvas API, and FastAPI with OpenAI integration for intelligent map interaction.

## ✨ Key Features

- 🤖 **Config-Based Actions** - All map actions defined in `config.yaml`
- 💬 **Natural Language Control** - Chat with the map using plain English
- 📱 **Responsive Design** - Fixed-height components with proper scrolling
- 🎨 **Canvas Rendering** - High-performance HTML5 Canvas visualization
- 🗺️ **No External Dependencies** - No Leaflet, pure Canvas implementation

## 🎯 Overview

This is a complete web application featuring:

- **Frontend**: React + Tailwind CSS + HTML5 Canvas API
- **Backend**: Python FastAPI serving GeoJSON data + NLP command parsing
- **Rendering**: Native Canvas 2D rendering (no Leaflet, no external map libraries)
- **Chat Control**: Natural language commands powered by OpenAI GPT-4o-mini

## 🚀 Quick Start

See **[QUICKSTART.md](QUICKSTART.md)** for detailed instructions.

### 1. Backend
```bash
cd backend
source venv/bin/activate
python main.py
```

### 2. Frontend
```bash
cd frontend
npm run dev
```

### 3. Open Browser
Navigate to `http://localhost:3000` and start chatting with your map!

## 🎮 Chat Commands

Type natural language commands in the chat panel:

```
zoom to 10x
zoom in by 2x
goto station New Delhi
center 28.64, 77.22
zoom to lat:23.0, lon:78.0
```

The system uses **OpenAI GPT-4o-mini** to understand commands, with intelligent fallback to regex parsing.

## ⚙️ Configuration

### OpenAI & Actions Configuration

All configuration is in `backend/config.yaml`:

```yaml
openai:
  api_key: "your-api-key-here"
  model: gpt-4o-mini-2024-07-18
  temperature: 1.0
  max_tokens: 2048
  top_p: 1.0

actions:
  zoom:
    type: "zoom"
    modes: ["to", "by"]
    parameters: ["value", "mode"]
    examples:
      - "zoom to 10x"
      - "zoom in by 2x"
  
  center:
    type: "center"
    parameters: ["lat", "lon"]
    examples:
      - "center 28.64, 77.22"
  
  # ... more actions
```

**See [ACTIONS_CONFIG.md](ACTIONS_CONFIG.md) for complete documentation.**

## 🚀 Features

### ✅ All MapWidget Features Implemented

- 🗺️ **India Boundary Rendering** - Detailed border with 600+ points
- 🏛️ **State Boundaries** - Toggleable state divisions
- 🚄 **Railway Stations** - Interactive markers with hover and click
- 🛤️ **Railway Tracks** - Red lines connecting stations with sleepers
- 🔍 **Zoom Controls** - Mouse wheel, buttons, and zoom meter
- 👆 **Pan & Drag** - Smooth map navigation
- 💬 **Popups** - Yellow popup boxes for station information
- 📊 **Multiple Datasets** - Switch between 22 and 90+ stations
- ⚡ **Smooth Animations** - 60 FPS rendering

### 🆕 New Features

- 🤖 **Config-Based Actions** - All actions defined in `config.yaml`
- 📱 **Responsive Layout** - Chat panel and map use calculated screen height
- 📜 **Scrollable Chat** - Messages scroll independently of map
- 🎯 **No Y-Scroll on Map** - Canvas fills entire available height
- 🔧 **Extensible** - Add new actions by updating config + UI
- 📖 **Self-Documenting** - Action examples in config file

## 📁 Project Structure

```
webapp/
├── backend/                    # FastAPI backend
│   ├── main.py                # API server
│   ├── requirements.txt       # Python dependencies
│   ├── data/                  # GeoJSON data files (auto-copied)
│   ├── setup.sh              # Backend setup script
│   ├── run.sh                # Run backend server
│   └── README.md             # Backend documentation
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── MapCanvas.jsx  # Main canvas component
│   │   ├── utils/
│   │   │   ├── api.js         # Backend API client
│   │   │   └── mapUtils.js    # Map utilities
│   │   ├── App.jsx            # Main app component
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Tailwind styles
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # Tailwind configuration
│   ├── setup.sh              # Frontend setup script
│   ├── run.sh                # Run frontend server
│   └── README.md             # Frontend documentation
├── setup.sh                   # Complete setup (both backend & frontend)
├── run_all.sh                # Run both servers
└── README.md                 # This file
```

## 🛠️ Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm

### Option 1: Automatic Setup (Recommended)

```bash
# Setup everything
./setup.sh

# Run both backend and frontend
./run_all.sh
```

Then open `http://localhost:3000` in your browser.

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend
./setup.sh      # Creates venv, installs deps, copies data
./run.sh        # Starts FastAPI server on port 8000
```

#### Frontend Setup

```bash
cd frontend
./setup.sh      # Installs npm dependencies
./run.sh        # Starts Vite dev server on port 3000
```

## 🔧 Development

### Backend (FastAPI)

The backend serves GeoJSON files through a REST API:

**Endpoints:**
- `GET /api/stations?dataset=default|full` - Railway stations
- `GET /api/india-boundary?detailed=true|false` - India boundary
- `GET /api/states` - State boundaries
- `GET /api/data-info` - Dataset information
- `GET /api/health` - Health check

**API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend (React + Canvas)

The frontend uses HTML5 Canvas API to render the map:

**Main Component: MapCanvas.jsx**
- Implements all MapWidget rendering logic
- Uses Canvas 2D context for drawing
- Handles mouse interactions (pan, zoom, click)
- Smooth animations with requestAnimationFrame

**Utilities:**
- `mapUtils.js` - Coordinate conversions (geoToScreen, screenToGeo)
- `api.js` - Backend API client functions

## 🎮 Controls

- **🖱️ Mouse Wheel** - Zoom in/out
- **👆 Click + Drag** - Pan around the map
- **🎯 Click Station** - Show station information
- **🔘 Zoom Buttons** - Top-right corner controls
- **📊 Dataset Selector** - Switch between datasets in header
- **🗺️ State Toggle** - Show/hide state boundaries

## 📊 Data Flow

```
1. Frontend requests data from backend API
2. Backend reads GeoJSON files from data/ folder
3. Backend returns JSON to frontend
4. Frontend processes GeoJSON features
5. MapCanvas renders using Canvas API
6. User interactions update map state
7. Canvas redraws on state changes
```

## 🎨 Canvas Implementation

The MapCanvas component replicates Qt MapWidget:

### Rendering Pipeline

1. **Clear Canvas** - White background
2. **Draw India Boundary** - Filled polygon with stroke
3. **Draw State Boundaries** - Gray outlines
4. **Draw Railway Tracks** - Red lines with sleepers
5. **Draw Stations** - Orange circles with shadows
6. **Draw Labels** - Station names when zoomed in
7. **Draw Zoom Controls** - Buttons and meter
8. **Draw Popups** - Yellow boxes for clicked stations

### Coordinate System

Uses the same Mercator-like projection as MapWidget:
- `geoToScreen(lat, lon)` - Geographic → Screen coordinates
- `screenToGeo(x, y)` - Screen → Geographic coordinates
- `fitMapToView()` - Auto-center and scale to bounds

## 🔍 Comparison with Qt Version

| Feature | Qt MapWidget | Web Canvas |
|---------|-------------|------------|
| Rendering | QPainter | Canvas 2D API |
| Language | C++ | JavaScript/React |
| UI Framework | Qt Widgets | Tailwind CSS |
| Data Loading | Local files | REST API |
| Interactivity | Mouse events | Mouse/Touch events |
| Performance | Native | 60 FPS in browser |
| Deployment | Desktop binary | Web server |

## 🚀 Production Build

```bash
# Backend (production mode)
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend (build)
cd frontend
npm run build
npm run preview  # Or serve with nginx/apache
```

## 🐛 Troubleshooting

### Backend Issues

**Problem**: "Data files not found"
```bash
cd backend
cp ../../stations.geojson data/
cp ../../fullstations.json data/
cp ../../india_boundary_detailed.geojson data/
cp ../../states.geojson data/
```

**Problem**: "Module not found"
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Issues

**Problem**: "Cannot connect to backend"
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings in `backend/main.py`

**Problem**: "npm dependencies not installed"
```bash
cd frontend
npm install
```

## 📝 Environment Variables

### Backend
No environment variables required. Uses `data/` directory for GeoJSON files.

### Frontend
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

## 🎓 Learning Resources

### Canvas API
- [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [HTML5 Canvas Deep Dive](https://joshondesign.com/p/books/canvasdeepdive/toc.html)

### FastAPI
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)

### React + Tailwind
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Contributing

This is a learning/demo project. Feel free to:
- Add more features (search, routing, filters)
- Improve rendering performance
- Add touch gestures for mobile
- Implement offline mode with service workers

## 📄 License

Same as the parent Qt application.

## 🙏 Credits

- Original Qt application: MapWidget implementation
- GeoJSON data: OpenStreetMap, OpenRailwayMap
- Icons: Emoji
