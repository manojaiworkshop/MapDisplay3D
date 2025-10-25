# Indian Railway Stations API - Backend

FastAPI backend that serves GeoJSON data for the Indian Railway Stations Map.

## Setup

### Prerequisites
- Python 3.8+
- pip

### Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy data files:
```bash
# Copy GeoJSON files from parent directory
cp ../../stations.geojson data/
cp ../../fullstations.json data/
cp ../../india_boundary_detailed.geojson data/
cp ../../india_boundary.geojson data/
cp ../../states.geojson data/
```

### Running the Server

```bash
# Development mode (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or simply
python main.py
```

The API will be available at: `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### GET `/`
Root endpoint with API information

### GET `/api/health`
Health check endpoint

### GET `/api/stations?dataset=default|full`
Get railway stations data
- `dataset=default` - 22 stations (Delhi-Howrah route)
- `dataset=full` - 90+ major stations across India

### GET `/api/india-boundary?detailed=true|false`
Get India boundary GeoJSON
- `detailed=true` - 600+ points (high detail)
- `detailed=false` - 140 points (simple)

### GET `/api/states`
Get state boundaries GeoJSON

### GET `/api/data-info`
Get information about available datasets

## Example Usage

```bash
# Get default stations
curl http://localhost:8000/api/stations

# Get full stations dataset
curl http://localhost:8000/api/stations?dataset=full

# Get detailed India boundary
curl http://localhost:8000/api/india-boundary?detailed=true

# Get states
curl http://localhost:8000/api/states
```

## CORS Configuration

CORS is enabled for:
- `http://localhost:3000` (Create React App)
- `http://localhost:5173` (Vite)

Modify `main.py` to add additional origins if needed.
