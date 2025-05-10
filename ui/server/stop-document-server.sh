#!/bin/bash
# Stop the Document Generation Server

echo "Stopping Document Generation Server..."

# Navigate to the server directory
cd "$(dirname "$0")"

# Check if PID file exists
if [ ! -f "document-server.pid" ]; then
    echo "No document server PID file found. Server may not be running."
    exit 0
fi

# Read the process ID
PID=$(cat document-server.pid)

# Check if the process is running
if ps -p $PID > /dev/null; then
    echo "Stopping document server with PID: $PID"
    kill $PID
    
    # Wait for process to stop
    echo "Waiting for server to stop..."
    for i in {1..5}; do
        if ! ps -p $PID > /dev/null; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p $PID > /dev/null; then
        echo "Server did not stop gracefully. Forcing shutdown..."
        kill -9 $PID
    fi
    
    # Remove PID file
    rm document-server.pid
    
    echo "Document server stopped successfully."
else
    echo "No document server process found with PID: $PID. It may have already been stopped."
    rm document-server.pid
fi