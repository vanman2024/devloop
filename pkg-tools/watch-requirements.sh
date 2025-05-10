#!/bin/bash
# Start the requirements watcher in the background

# Get the directory where this script is located
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
LOG_DIR="/mnt/c/Users/angel/Devloop/logs"
PID_FILE="$SCRIPT_DIR/requirements_watcher.pid"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Kill any existing process
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Stopping existing watcher (PID: $OLD_PID)"
        kill -9 "$OLD_PID" > /dev/null 2>&1
    fi
    rm -f "$PID_FILE"
fi

echo "Starting requirements watcher..."

# Start the process in the background
setsid python3 -u "$SCRIPT_DIR/persistent_watcher.py" > "$LOG_DIR/requirements_watcher.log" 2>&1 </dev/null &
PID=$!

# Save the PID for later reference
echo $PID > "$PID_FILE"

echo "===========================================" 
echo "✅ Requirements watcher started with PID $PID"
echo "   Log: $LOG_DIR/requirements_watcher.log"
echo "   To check: tail -f $LOG_DIR/requirements_watcher.log"
echo "   To stop: kill -9 $PID"
echo "===========================================" 