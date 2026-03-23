#!/bin/bash

echo "==============================================="
echo "YTECH Application - Starting Servers"
echo "==============================================="
echo

echo "[1/3] Checking ports..."
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "[INFO] Port 5001 in use - Stopping process..."
    lsof -ti:5001 | xargs kill -9 2>/dev/null
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "[INFO] Port 3000 in use - Stopping process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
fi

echo "[2/3] Starting Backend (Port 5001)..."
cd backend
npm start &
BACKEND_PID=$!
sleep 5

echo "[3/3] Starting Frontend (Port 3000)..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo
echo "==============================================="
echo "SERVERS STARTED SUCCESSFULLY!"
echo "==============================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5001"
echo "Health Check: http://localhost:5001/api/health"
echo "==============================================="
echo

# Wait for user input to open browser
read -p "Press Enter to open browser..."

echo "Opening application..."
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
elif command -v start > /dev/null; then
    start http://localhost:3000
fi

echo
echo "To stop servers, press Ctrl+C or close terminal windows"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for interrupt signal
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
