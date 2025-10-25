#!/bin/bash
# Run the React frontend development server

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not installed. Please run setup.sh first."
    exit 1
fi

echo "Starting Indian Railway Stations Map Frontend..."
echo "Development server: http://localhost:3000"
echo ""

# Run the development server
npm run dev
