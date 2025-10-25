#!/bin/bash
# Complete setup script for both backend and frontend

echo "=========================================="
echo "Indian Railway Stations Map - Web App"
echo "Complete Setup"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Setup Backend
echo "📦 Setting up Backend (FastAPI)..."
echo "------------------------------------------"
cd backend
chmod +x setup.sh
./setup.sh
if [ $? -ne 0 ]; then
    echo "❌ Backend setup failed!"
    exit 1
fi
cd ..

echo ""
echo ""

# Setup Frontend
echo "📦 Setting up Frontend (React + Tailwind)..."
echo "------------------------------------------"
cd frontend
chmod +x setup.sh
./setup.sh
if [ $? -ne 0 ]; then
    echo "❌ Frontend setup failed!"
    exit 1
fi
cd ..

echo ""
echo ""
echo "=========================================="
echo "✅ Complete Setup Successful!"
echo "=========================================="
echo ""
echo "To run the application:"
echo ""
echo "  Option 1 - Run both servers together:"
echo "    ./run_all.sh"
echo ""
echo "  Option 2 - Run separately:"
echo "    Terminal 1: cd backend && ./run.sh"
echo "    Terminal 2: cd frontend && ./run.sh"
echo ""
echo "Then open: http://localhost:3000"
echo ""
