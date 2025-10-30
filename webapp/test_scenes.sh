#!/bin/bash

# Scene System Test Script
# Tests the 3D scene rendering system

echo "================================"
echo "3D Scene System Test"
echo "================================"
echo ""

# Check if backend is running
echo "1. Checking backend..."
if curl -s http://localhost:8091/health > /dev/null 2>&1; then
    echo "   ✅ Backend is running on port 8091"
else
    echo "   ❌ Backend is NOT running"
    echo "   Start it with: cd /media/manoj/DriveData5/MapDisplay3D/webapp/backend && python main.py"
    exit 1
fi

# Check if frontend is running
echo ""
echo "2. Checking frontend..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on port 3001"
else
    echo "   ❌ Frontend is NOT running"
    echo "   Start it with: cd /media/manoj/DriveData5/MapDisplay3D/webapp/frontend && npm run dev"
    exit 1
fi

# Test scene API endpoints
echo ""
echo "3. Testing scene API endpoints..."

# Test GET /api/scenes
echo "   Testing GET /api/scenes..."
SCENES_RESPONSE=$(curl -s http://localhost:8091/api/scenes)
if echo "$SCENES_RESPONSE" | grep -q "mumbai-metro-andheri"; then
    echo "   ✅ GET /api/scenes works"
    SCENE_COUNT=$(echo "$SCENES_RESPONSE" | grep -o '"id"' | wc -l)
    echo "      Found $SCENE_COUNT scene(s)"
else
    echo "   ❌ GET /api/scenes failed"
    echo "   Response: $SCENES_RESPONSE"
fi

# Test GET /api/scenes/mumbai-metro-andheri
echo ""
echo "   Testing GET /api/scenes/{scene_id}..."
SCENE_RESPONSE=$(curl -s http://localhost:8091/api/scenes/mumbai-metro-andheri)
if echo "$SCENE_RESPONSE" | grep -q "Mumbai Metro"; then
    echo "   ✅ GET /api/scenes/{scene_id} works"
    OBJECT_COUNT=$(echo "$SCENE_RESPONSE" | grep -o '"type"' | wc -l)
    echo "      Scene has $OBJECT_COUNT objects"
else
    echo "   ❌ GET /api/scenes/{scene_id} failed"
    echo "   Response: $SCENE_RESPONSE"
fi

# Test GET /api/scenes/at-location (Mumbai coordinates)
echo ""
echo "   Testing GET /api/scenes/at-location (Mumbai)..."
LOCATION_RESPONSE=$(curl -s "http://localhost:8091/api/scenes/at-location?lat=19.1197&lon=72.8464&zoom=25")
if echo "$LOCATION_RESPONSE" | grep -q "mumbai-metro-andheri"; then
    echo "   ✅ GET /api/scenes/at-location works"
    echo "      Scene found at Mumbai coordinates"
else
    echo "   ⚠️  No scene found at location (might be out of range)"
    echo "   Response: $LOCATION_RESPONSE"
fi

# Test with coordinates outside range
echo ""
echo "   Testing GET /api/scenes/at-location (Delhi - should be empty)..."
DELHI_RESPONSE=$(curl -s "http://localhost:8091/api/scenes/at-location?lat=28.6139&lon=77.2090&zoom=25")
if echo "$DELHI_RESPONSE" | grep -q "\[\]"; then
    echo "   ✅ Correctly returns empty array for Delhi"
else
    echo "   ⚠️  Unexpected response for Delhi location"
    echo "   Response: $DELHI_RESPONSE"
fi

echo ""
echo "================================"
echo "API Tests Complete!"
echo "================================"
echo ""
echo "Next Steps:"
echo "1. Open browser to http://localhost:3001"
echo "2. Look for the purple '🎬 Scenes' button in bottom-right"
echo "3. Navigate to Mumbai: 19.12°N, 72.85°E"
echo "4. Zoom in close (zoom distance ≤ 25)"
echo "5. Click the Scenes button to see active scenes"
echo "6. You should see the Mumbai Metro station render in 3D!"
echo ""
echo "Troubleshooting:"
echo "- If scenes don't appear, check browser console for errors"
echo "- Open SceneDebugPanel to see camera position and active scenes"
echo "- Verify you're within 500m of Mumbai coordinates"
echo "- Ensure zoom level is between 0.5 and 50"
echo ""
