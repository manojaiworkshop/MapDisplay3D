#!/bin/bash

# Test Zoom Functionality
# This script helps verify the zoom-to-cursor fix is working

echo "🧪 Testing Zoom-to-Cursor Functionality"
echo "========================================"
echo ""

# Check if frontend is running
echo "1️⃣ Checking if frontend is running..."
if lsof -i:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 5173"
else
    echo "❌ Frontend is NOT running"
    echo "   Start it with: cd webapp/frontend && npm run dev"
    exit 1
fi

echo ""
echo "2️⃣ Files Modified:"
echo "   - webapp/frontend/src/components/KeyboardCameraController.jsx"
echo "   - webapp/frontend/src/components/Map3D.jsx"

echo ""
echo "3️⃣ Testing Steps:"
echo "   a) Open browser to http://localhost:5173"
echo "   b) Wait for map to load completely"
echo "   c) Move mouse over different parts of the map"
echo "   d) Scroll mouse wheel UP (should zoom IN toward cursor)"
echo "   e) Scroll mouse wheel DOWN (should zoom OUT from cursor)"
echo "   f) Check debug overlay (bottom-left) for logs"

echo ""
echo "4️⃣ Expected Results:"
echo "   ✅ Camera zooms toward cursor position when scrolling up"
echo "   ✅ Camera zooms away from cursor position when scrolling down"
echo "   ✅ Zoom speed adapts to current altitude"
echo "   ✅ Smooth camera movement (no jerky motion)"
echo "   ✅ Debug overlay shows wheel events and zoom calculations"

echo ""
echo "5️⃣ Debug Overlay Messages to Look For:"
echo "   🔥 WHEEL EVENT RECEIVED!"
echo "   🎯 Mouse NDC coordinates"
echo "   ✅ Ground intersection points"
echo "   📏 Distance calculations"
echo "   🎯 ZOOM IN ✅ or ZOOM OUT ✅"
echo "   📍 Camera position updates"

echo ""
echo "6️⃣ If zoom is NOT working:"
echo "   - Check browser console (F12) for JavaScript errors"
echo "   - Verify debug overlay is visible (bottom-left corner)"
echo "   - Look for '🔥 WHEEL EVENT RECEIVED!' in debug overlay"
echo "   - If no wheel events appear, check if another extension is blocking them"

echo ""
echo "🎉 Open your browser and test now!"
echo "   URL: http://localhost:5173"
echo ""
