#!/bin/bash
#
# Devloop Unified Server Launcher
#
# This script launches the unified Express server that handles all
# backend API requests for the Devloop system.
#

# Ensure we're in the right directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || { echo "Failed to change to script directory"; exit 1; }

# Configuration
SERVER_PID_FILE="api/server.pid"
SERVER_LOG_DIR="logs/server"
SERVER_LOG_FILE="$SERVER_LOG_DIR/server.log"
DEFAULT_PORT=8080

# Create logs directory if it doesn't exist
mkdir -p "$SERVER_LOG_DIR"

# Function to check if a port is in use
port_in_use() {
  netstat -tuln | grep ":$1 " > /dev/null
  return $?
}

# Function to check if the server is already running
is_server_running() {
  if [ -f "$SERVER_PID_FILE" ]; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    if ps -p "$pid" > /dev/null; then
      return 0  # Server is running
    else
      rm "$SERVER_PID_FILE"  # Remove stale PID file
    fi
  fi
  return 1  # Server is not running
}

# Function to start the server
start_server() {
  local port=$1
  local mode=$2
  
  echo "Starting Devloop Unified Server in $mode mode on port $port..."
  
  # Check required dependencies
  if ! command -v node > /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
  fi
  
  # Check if required modules are installed
  if [ ! -f "node_modules/express/package.json" ] || 
     [ ! -f "node_modules/ws/package.json" ]; then
    echo "Installing required dependencies..."
    npm install express ws cors morgan
  fi
  
  # Set environment variables
  export SERVER_PORT="$port"
  export NODE_ENV="$mode"
  export SERVER_VERSION="1.0.0"
  
  # Start the server in the background
  node api/server.js > "$SERVER_LOG_FILE" 2>&1 &
  
  # Save PID
  echo $! > "$SERVER_PID_FILE"
  
  echo "Devloop Unified Server started with PID $(cat "$SERVER_PID_FILE")"
  echo "Mode: $mode"
  echo "Port: $port"
  echo "Log file: $SERVER_LOG_FILE"
}

# Function to stop the server
stop_server() {
  if [ -f "$SERVER_PID_FILE" ]; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    
    if ps -p "$pid" > /dev/null; then
      echo "Stopping Devloop Unified Server (PID: $pid)..."
      kill "$pid"
      
      # Wait for server to stop
      for i in {1..10}; do
        if ! ps -p "$pid" > /dev/null; then
          break
        fi
        sleep 1
      done
      
      # Force kill if still running
      if ps -p "$pid" > /dev/null; then
        echo "Server didn't exit gracefully, forcing shutdown..."
        kill -9 "$pid"
      fi
      
      rm "$SERVER_PID_FILE"
      echo "Devloop Unified Server stopped"
    else
      echo "Server not running (stale PID file)"
      rm "$SERVER_PID_FILE"
    fi
  else
    echo "No PID file found. Server not running."
  fi
}

# Function to display status
show_status() {
  if is_server_running; then
    local pid
    pid=$(cat "$SERVER_PID_FILE")
    local port
    port=$(lsof -Pan -p "$pid" -i tcp | grep LISTEN | awk '{print $9}' | sed 's/.*://')
    
    echo "Devloop Unified Server is running"
    echo "PID: $pid"
    echo "Port: $port"
    echo "Log file: $SERVER_LOG_FILE"
    
    # Show recent log entries
    echo "Recent logs:"
    if [ -f "$SERVER_LOG_FILE" ]; then
      tail -n 5 "$SERVER_LOG_FILE"
    else
      echo "No log file found"
    fi
  else
    echo "Devloop Unified Server is not running"
  fi
}

# Function to show help
show_help() {
  echo "Devloop Unified Server Launcher"
  echo
  echo "Usage: $0 [command] [options]"
  echo
  echo "Commands:"
  echo "  start [port] [mode]     Start the server (default: port 8080, mode development)"
  echo "  stop                    Stop the server"
  echo "  restart [port] [mode]   Restart the server"
  echo "  status                  Show server status"
  echo "  help                    Show this help message"
  echo
  echo "Options:"
  echo "  port                    Port number (default: 8080)"
  echo "  mode                    Server mode: development or production (default: development)"
  echo
  echo "Examples:"
  echo "  $0 start                 Start server on default port in development mode"
  echo "  $0 start 5000           Start server on port 5000"
  echo "  $0 start 8080 production Start server in production mode"
}

# Handle command line arguments
case "${1:-help}" in
  start)
    if is_server_running; then
      echo "Devloop Unified Server is already running with PID $(cat "$SERVER_PID_FILE")"
    else
      # Determine port to use
      port="${2:-$DEFAULT_PORT}"
      mode="${3:-development}"
      
      # Check if port is already in use
      if port_in_use "$port"; then
        echo "Port $port is already in use. Trying another port..."
        # Try to find an available port
        for p in $(seq $((port+1)) $((port+10))); do
          if ! port_in_use "$p"; then
            port="$p"
            break
          fi
        done
      fi
      
      start_server "$port" "$mode"
    fi
    ;;
  
  stop)
    stop_server
    ;;
  
  restart)
    stop_server
    sleep 2
    port="${2:-$DEFAULT_PORT}"
    mode="${3:-development}"
    start_server "$port" "$mode"
    ;;
  
  status)
    show_status
    ;;
  
  help|--help|-h)
    show_help
    ;;
  
  *)
    echo "Unknown command: $1"
    echo "Use '$0 help' for usage information."
    exit 1
    ;;
esac

exit 0