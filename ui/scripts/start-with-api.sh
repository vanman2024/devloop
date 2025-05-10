#!/bin/bash
# Start the React development server and the API server together

# Path configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$APP_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Exit handler
cleanup() {
  echo "Shutting down servers..."
  kill $VITE_PID $SERVER_PID 2>/dev/null
  exit 0
}

# Set up trap
trap cleanup SIGINT SIGTERM

# Start Vite development server
echo "Starting React development server..."
cd "$APP_DIR"
npm run dev > "$LOG_DIR/vite-server.log" 2>&1 &
VITE_PID=$!

# Wait a moment to let Vite start
sleep 2

# Check if Vite started successfully
if ! ps -p $VITE_PID > /dev/null; then
  echo "Failed to start Vite development server. Check logs at $LOG_DIR/vite-server.log"
  exit 1
fi

echo "React development server running (PID: $VITE_PID)"

# Start API server
echo "Starting API server..."
cd "$APP_DIR"
node server/server.js > "$LOG_DIR/api-server.log" 2>&1 &
SERVER_PID=$!

# Wait a moment to let the API server start
sleep 2

# Check if API server started successfully
if ! ps -p $SERVER_PID > /dev/null; then
  echo "Failed to start API server. Check logs at $LOG_DIR/api-server.log"
  kill $VITE_PID
  exit 1
fi

echo "API server running (PID: $SERVER_PID)"
echo "Servers started successfully!"
echo "React UI available at: http://localhost:5173"
echo "API available at: http://localhost:3001/api"
echo "Press Ctrl+C to stop all servers"

# Keep the script running
while true; do
  sleep 1
  
  # Check if servers are still running
  if ! ps -p $VITE_PID > /dev/null || ! ps -p $SERVER_PID > /dev/null; then
    echo "One of the servers stopped unexpectedly. Shutting down..."
    cleanup
  fi
done