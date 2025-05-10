#!/bin/bash
# Simple direct launcher for the Feature Manager UI

echo "======================================"
echo "  Feature Manager UI Direct Launcher"
echo "======================================"
echo

# Change to the react-app directory
cd "$(dirname "$0")/system-core/ui-system/react-app"

# Check if node_modules exists and install if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
  echo "Installing dependencies..."
  npm install
  if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies."
    exit 1
  fi
fi

# Check if vite is in node_modules/.bin
if [ ! -f "node_modules/.bin/vite" ]; then
  echo "Vite not found in node_modules. Installing vite..."
  npm install vite
  if [ $? -ne 0 ]; then
    echo "Error: Failed to install Vite."
    exit 1
  fi
fi

# Get WSL IP address
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "WSL IP Address: $IP_ADDRESS"
echo "You can access the app at:"
echo "  http://$IP_ADDRESS:3000"
echo "  http://localhost:3000 (from WSL)"

# Run with npx to ensure we use the local vite
echo
echo "Starting development server..."
npx vite --host 0.0.0.0