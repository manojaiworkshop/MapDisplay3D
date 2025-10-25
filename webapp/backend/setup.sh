#!/bin/bash
# Setup script for backend

echo "Setting up Indian Railway Stations API Backend..."

cd "$(dirname "$0")"

# Copy data files from parent directory
echo "Copying GeoJSON data files..."
cp ../../stations.geojson data/ 2>/dev/null || echo "Warning: stations.geojson not found"
cp ../../fullstations.json data/ 2>/dev/null || echo "Warning: fullstations.json not found"
cp ../../india_boundary_detailed.geojson data/ 2>/dev/null || echo "Warning: india_boundary_detailed.geojson not found"
cp ../../india_boundary.geojson data/ 2>/dev/null || echo "Warning: india_boundary.geojson not found"
cp ../../states.geojson data/ 2>/dev/null || echo "Warning: states.geojson not found"

echo "Data files copied successfully!"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "To start the server:"
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "Or simply run: ./run.sh"
