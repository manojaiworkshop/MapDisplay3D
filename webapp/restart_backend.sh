#!/bin/bash

echo "🔄 Restarting backend..."

# Stop existing backend
pkill -f "python main.py"
sleep 2

# Start backend in background
cd /media/manoj/DriveData5/MapDisplay3D/webapp/backend
nohup /media/manoj/DriveData5/MapDisplay3D/webapp/backend/mapenv/bin/python main.py > backend.log 2>&1 &

sleep 3

# Check if it's running
if curl -s http://localhost:8091/health > /dev/null 2>&1; then
    echo "✅ Backend restarted successfully on port 8091"
    tail -10 backend.log
else
    echo "❌ Backend failed to start. Check backend.log for errors"
    tail -20 backend.log
fi
