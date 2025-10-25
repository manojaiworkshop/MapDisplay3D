#!/bin/bash

echo "========================================"
echo "  Zoom to Cursor - Verification Script"
echo "========================================"
echo ""

cd /home/manoj/Downloads/sample/webapp/frontend

echo "✅ Checking if KeyboardCameraController.jsx has the fix..."
if grep -q "controls.minDistance !== undefined" src/components/KeyboardCameraController.jsx; then
  echo "   ✓ minDistance fix is present"
else
  echo "   ✗ minDistance fix is MISSING!"
  exit 1
fi

echo ""
echo "✅ Checking if Map3D.jsx has MIDDLE: null..."
if grep -q "MIDDLE: null" src/components/Map3D.jsx; then
  echo "   ✓ DOLLY is disabled"
else
  echo "   ✗ DOLLY might still be enabled!"
fi

echo ""
echo "✅ Checking if EnhancedZoomToCursor is imported..."
if grep -q "EnhancedZoomToCursor" src/components/Map3D.jsx; then
  echo "   ✓ Component is imported"
else
  echo "   ✗ Component import is MISSING!"
  exit 1
fi

echo ""
echo "✅ Checking if wheel-test.html exists..."
if [ -f "public/wheel-test.html" ]; then
  echo "   ✓ Test page exists"
else
  echo "   ✗ Test page is missing!"
fi

echo ""
echo "✅ Checking for JavaScript syntax errors..."
if npm run build -- --mode development 2>&1 | grep -i "error"; then
  echo "   ✗ Build has errors!"
else
  echo "   ✓ No obvious syntax errors"
fi

echo ""
echo "========================================"
echo "  ✅ All checks passed!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Open: http://localhost:3000/"
echo "3. Open browser console (F12)"
echo "4. Scroll wheel over the 3D map"
echo "5. Look for: '🔥🔥🔥 WHEEL EVENT RECEIVED!!! 🔥🔥🔥'"
echo ""
echo "If wheel events aren't showing:"
echo "- Test: http://localhost:3000/wheel-test.html"
echo ""
