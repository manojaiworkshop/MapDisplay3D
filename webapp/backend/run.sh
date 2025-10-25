#!/bin/bash
# Run the FastAPI backend server

cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found. Please run setup.sh first."
    exit 1
fi

echo "Starting Indian Railway Stations API..."
echo "API Documentation: http://localhost:8088/docs"
echo ""

# Run the server
python main.py
