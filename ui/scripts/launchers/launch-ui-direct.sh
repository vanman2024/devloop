#!/bin/bash
# A simple direct launcher for the UI system

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "===== DEVLOOP UI LAUNCHER ====="
echo "Launching the Feature Manager UI..."
echo

# Get IP address for WSL
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "Once the server starts, you can access the UI at:"
echo "  http://$IP_ADDRESS:3000 (from Windows)"
echo "  http://localhost:3000 (from WSL)"
echo
echo "Press Ctrl+C to stop the server when you're done."
echo

# Launch the server
cd "./system-core/ui-system" || exit 1
node wsl-server.js