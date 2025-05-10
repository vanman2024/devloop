#!/bin/bash
# Start the Document Generation Server

echo "Starting Document Generation Server..."

# Navigate to the server directory
cd "$(dirname "$0")"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not found. Please install Node.js."
    exit 1
fi

# Check if the server file exists
if [ ! -f "document-server.js" ]; then
    echo "Error: document-server.js not found in the current directory."
    exit 1
fi

# Run the server in the background
node document-server.js > document-server.log 2>&1 &
PID=$!

# Save the process ID for later stopping
echo $PID > document-server.pid

echo "Document Generation Server started with PID: $PID"
echo "Server running at http://localhost:3002"
echo "Health check: http://localhost:3002/api/documents/health"
echo "Logs: $(pwd)/document-server.log"