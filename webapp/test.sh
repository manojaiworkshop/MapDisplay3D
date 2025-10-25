#!/bin/bash
# Quick test script for the chat-controlled map

echo "🧪 Testing Indian Railway Stations Map - Chat Control"
echo "=================================================="
echo ""

# Test 1: Backend health check
echo "1️⃣ Testing backend health..."
curl -s http://localhost:8000/api/health | jq '.' 2>/dev/null || echo "⚠️  Backend not running on port 8000"
echo ""

# Test 2: Interpret command - zoom
echo "2️⃣ Testing command: 'zoom to 10x'"
curl -s -X POST http://localhost:8000/api/interpret-command \
  -H 'Content-Type: application/json' \
  -d '{"text":"zoom to 10x"}' | jq '.'
echo ""

# Test 3: Interpret command - goto station
echo "3️⃣ Testing command: 'goto station New Delhi'"
curl -s -X POST http://localhost:8000/api/interpret-command \
  -H 'Content-Type: application/json' \
  -d '{"text":"goto station New Delhi"}' | jq '.'
echo ""

# Test 4: Interpret command - coordinates
echo "4️⃣ Testing command: 'center 28.64,77.22'"
curl -s -X POST http://localhost:8000/api/interpret-command \
  -H 'Content-Type: application/json' \
  -d '{"text":"center 28.64,77.22"}' | jq '.'
echo ""

# Test 5: Get stations
echo "5️⃣ Testing stations endpoint..."
curl -s http://localhost:8000/api/stations | jq '.features | length' 2>/dev/null | xargs -I {} echo "✅ Loaded {} stations"
echo ""

echo "=================================================="
echo "✅ Testing complete!"
echo ""
echo "To run the full application:"
echo "  Terminal 1: cd backend && python main.py"
echo "  Terminal 2: cd frontend && npm run dev"
echo "  Browser: http://localhost:3000"
