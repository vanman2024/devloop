#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │ Launch System Health Dashboard                   │
# └─────────────────────────────────────────────────┘
# 📦 PURPOSE:
#   Launches the System Health Dashboard
#
# 📋 USAGE:
#   ./launch-health-dashboard.sh [--kill-existing]
#
# 🔄 OPTIONS:
#   --kill-existing: Kill any existing React process on port 3000 before starting
#
# ─────────────────────────────────────────────────────

# Process arguments
KILL_EXISTING=false
for arg in "$@"; do
  case $arg in
    --kill-existing)
      KILL_EXISTING=true
      shift
      ;;
  esac
done

# Change to script directory
cd "$(dirname "$0")"

# Define paths
SYSTEM_CORE="$(pwd)/system-core"
HEALTH_SCRIPT="$SYSTEM_CORE/scripts/maintenance/integrate-health-dashboard.py"
REACT_APP="$SYSTEM_CORE/ui-system/react-app"

# Function to check if port 3000 is in use
port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -i:3000 -P -n >/dev/null
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln | grep ":3000 " >/dev/null
  else
    echo "⚠️ Warning: Cannot check if port is in use (no lsof or netstat)"
    return 1
  fi
}

# Function to kill process on port 3000
kill_port_process() {
  if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -i:3000 -P -n -t)
    if [ -n "$PID" ]; then
      echo "🛑 Killing process on port 3000 (PID: $PID)..."
      kill -9 $PID 2>/dev/null
      sleep 2
    fi
  elif command -v fuser >/dev/null 2>&1; then
    echo "🛑 Killing process on port 3000..."
    fuser -k 3000/tcp 2>/dev/null
    sleep 2
  else
    echo "❌ Error: Cannot kill process (no lsof or fuser)"
    return 1
  fi
}

# Check if the React app is already running
if port_in_use; then
  if [ "$KILL_EXISTING" = true ]; then
    echo "🔄 Port 3000 is in use. Killing existing process as requested..."
    if ! kill_port_process; then
      echo "❌ Failed to kill process on port 3000. Please do it manually."
      exit 1
    fi
  else
    echo "🚀 React app is already running. Opening System Health page..."
    # Open the health dashboard in the browser
    if [ -n "$WSL_DISTRO_NAME" ]; then
      # Running in WSL
      cmd.exe /c start http://localhost:3000/system-health
    else
      # Not running in WSL
      xdg-open http://localhost:3000/system-health 2>/dev/null || open http://localhost:3000/system-health 2>/dev/null
    fi
    echo "ℹ️ If you need to restart the server, use --kill-existing flag."
    exit 0
  fi
fi

# Generate the latest health report
echo "📊 Generating latest system health report..."
python3 "$HEALTH_SCRIPT" --output "$SYSTEM_CORE/logs/health-checks"

# Check if health script directory exists
if [ ! -d "$SYSTEM_CORE/logs/health-checks" ]; then
  echo "📁 Creating health checks directory..."
  mkdir -p "$SYSTEM_CORE/logs/health-checks"
fi

# Launch the React app
echo "🚀 Starting the React app..."
cd "$REACT_APP" || { echo "❌ Error: React app directory not found!"; exit 1; }
npm start &
NPM_PID=$!

# Wait for the app to start
echo "⏳ Waiting for React app to start..."
MAX_ATTEMPTS=30
ATTEMPT=0
while ! port_in_use && [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  sleep 1
  ATTEMPT=$((ATTEMPT+1))
  echo -n "."
done
echo

# Check if started successfully
if ! port_in_use; then
  echo "❌ Error: React app failed to start within the expected time."
  echo "Please check for errors and try again."
  exit 1
fi

# Open the health dashboard in the browser
if [ -n "$WSL_DISTRO_NAME" ]; then
  # Running in WSL
  echo "🌐 Opening browser in Windows..."
  cmd.exe /c start http://localhost:3000/system-health
else
  # Not running in WSL
  echo "🌐 Opening browser..."
  xdg-open http://localhost:3000/system-health 2>/dev/null || open http://localhost:3000/system-health 2>/dev/null
fi

echo "✅ System Health Dashboard launched successfully!"
echo "😊 Press Ctrl+C when you're done to stop the server."

# Wait for the npm process to finish
wait $NPM_PID
exit 0