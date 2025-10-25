#!/bin/bash
# Run both backend and frontend servers

echo "=========================================="
echo "Indian Railway Stations Map - Web App"
echo "Starting Both Servers"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "🚀 Starting Backend (FastAPI on port 8000)..."
cd backend
if [ ! -d "venv" ]; then
    echo "❌ Backend not set up. Please run setup.sh first."
    exit 1
fi

source venv/bin/activate
python main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
deactivate
cd ..

# Wait for backend to start
echo "   Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check backend/backend.log"
    exit 1
fi

echo "   ✅ Backend running"
echo ""

# Start Frontend
echo "🚀 Starting Frontend (React on port 3000)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "❌ Frontend not set up. Please run setup.sh first."
    kill $BACKEND_PID
    exit 1
fi

npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
cd ..

echo "   ✅ Frontend starting..."
echo ""
echo "=========================================="
echo "✅ Both Servers Running!"
echo "=========================================="
echo ""
echo "Backend API:  http://localhost:8000"
echo "API Docs:     http://localhost:8000/docs"
echo "Frontend App: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  webapp/backend/backend.log"
echo "  Frontend: webapp/frontend/frontend.log"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
