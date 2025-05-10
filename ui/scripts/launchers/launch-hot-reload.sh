#!/bin/bash

echo "🔄 Starting Devloop React app with hot reloading..."
cd "$(dirname "$0")/system-core/ui-system/react-app" 

# Ensure the script is executable
chmod +x ./start-dev.sh

# Run the development server with optimized HMR
./start-dev.sh