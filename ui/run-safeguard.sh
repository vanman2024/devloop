#!/bin/bash
# Run the unified UI safeguard system
# This script provides a convenient wrapper around the unified-ui-safeguard.js script

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_PATH="$DIR/scripts/unified-ui-safeguard.js"
LOG_FILE="$DIR/logs/ui-safeguard.log"
PID_FILE="$DIR/ui-safeguard.pid"

# Ensure logs directory exists
mkdir -p "$DIR/logs"

# Helper function for logging
log() {
  local message="$1"
  local type="${2:-INFO}"
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "[${timestamp}] [${type}] ${message}"
  echo "[${timestamp}] [${type}] ${message}" >> "$LOG_FILE"
}

# Check for Node.js
if ! command -v node &> /dev/null; then
  log "Node.js is not installed" "ERROR"
  exit 1
fi

# Process command line arguments
case "$1" in
  status)
    node --experimental-modules "$SCRIPT_PATH" check
    exit $?
    ;;
  check)
    log "Running working state check..." "INFO"
    node --experimental-modules "$SCRIPT_PATH" check
    exit $?
    ;;
  backup)
    log "Running backup if working state..." "INFO"
    node --experimental-modules "$SCRIPT_PATH" backup
    exit $?
    ;;
  restore)
    log "Restoring from backup..." "INFO"
    if [ -z "$2" ]; then
      node --experimental-modules "$SCRIPT_PATH" restore
    else
      node --experimental-modules "$SCRIPT_PATH" restore "$2"
    fi
    exit $?
    ;;
  list)
    log "Listing available backups..." "INFO"
    node --experimental-modules "$SCRIPT_PATH" list
    exit $?
    ;;
  verify)
    log "Verifying components..." "INFO"
    node --experimental-modules "$SCRIPT_PATH" verify
    exit $?
    ;;
  clean)
    log "Cleaning up old backups..." "INFO"
    node --experimental-modules "$SCRIPT_PATH" clean
    exit $?
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p "$PID" > /dev/null; then
        log "Stopping UI safeguard (PID: $PID)" "INFO"
        kill "$PID"
        rm "$PID_FILE"
        exit 0
      else
        log "No running safeguard found with PID $PID" "WARNING"
        rm "$PID_FILE"
        exit 1
      fi
    else
      log "No PID file found. Safeguard may not be running." "WARNING"
      exit 1
    fi
    ;;
  help|-h|--help)
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  (no arguments)  Run continuous monitoring"
    echo "  status          Show safeguard status"
    echo "  check           Run working state check"
    echo "  backup          Run backup if in working state"
    echo "  restore [name]  Restore from backup (latest if not specified)"
    echo "  list            List available backups"
    echo "  verify          Run component verification"
    echo "  clean           Clean up old backups"
    echo "  stop            Stop a running safeguard"
    echo "  help            Show this help message"
    exit 0
    ;;
esac

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null; then
    log "UI safeguard already running with PID $PID" "ERROR"
    echo -e "${RED}UI safeguard already running with PID $PID${NC}"
    echo -e "${YELLOW}Use '$0 stop' to stop it first${NC}"
    exit 1
  else
    log "Found stale PID file, cleaning up" "WARNING"
    rm "$PID_FILE"
  fi
fi

# Save our PID
echo $$ > "$PID_FILE"

# Set up trap to remove PID file on exit
cleanup() {
  log "Shutting down UI safeguard" "INFO"
  [ -f "$PID_FILE" ] && rm "$PID_FILE"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start continuous monitoring mode
log "Starting UI safeguard in continuous mode" "INFO"
echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}  UNIFIED UI SAFEGUARD - CONTINUOUS MONITORING   ${NC}"
echo -e "${CYAN}==================================================${NC}"
echo -e "${BLUE}Will check for working state and create backups automatically${NC}"
echo -e "${BLUE}Logs: $LOG_FILE${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Track the last modification time of the src directory
get_last_mod_time() {
  find "$DIR/src" -type f -name "*.jsx" -o -name "*.js" | xargs stat -c %Y 2>/dev/null | sort -nr | head -n1
}

LAST_MOD=$(get_last_mod_time)
QUIET_PERIOD=60  # Seconds to wait after last file changes
INTERVAL=15      # Check every 15 seconds
SUCCESS_WAIT=1800 # Wait 30 minutes after successful backup
RETRY_WAIT=300   # Wait 5 minutes after failed check
QUIET_COUNT=0
BACKUPS_CREATED=0

while true; do
  # Get current modification time
  CURRENT_MOD=$(get_last_mod_time)
  
  if [ "$CURRENT_MOD" != "$LAST_MOD" ]; then
    # Files have changed
    echo -e "${BLUE}Changes detected, resetting quiet period counter...${NC}"
    LAST_MOD=$CURRENT_MOD
    QUIET_COUNT=0
  else
    # No changes since last check
    QUIET_COUNT=$((QUIET_COUNT + INTERVAL))
    if [ $QUIET_COUNT -ge $QUIET_PERIOD ]; then
      echo -e "${GREEN}$QUIET_PERIOD seconds of inactivity detected, checking working state...${NC}"
      
      # Run the safeguard check and backup
      if node --experimental-modules "$SCRIPT_PATH" build; then
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
        echo -e "${GREEN}Successfully backed up working state (total: $BACKUPS_CREATED)${NC}"
        
        # Reset the counter to avoid constant backups
        # Wait longer before allowing another backup
        QUIET_COUNT=0
        QUIET_PERIOD=$SUCCESS_WAIT
        echo -e "${BLUE}Waiting $((SUCCESS_WAIT/60)) minutes before next backup opportunity${NC}"
      else
        echo -e "${RED}Not in a working state, will check again later${NC}"
        # Reset counter but use shorter period for retry
        QUIET_COUNT=0
        QUIET_PERIOD=$RETRY_WAIT
        echo -e "${BLUE}Will try again after $((RETRY_WAIT/60)) minutes of inactivity${NC}"
      fi
    else
      echo -e "${BLUE}Waiting for quiet period: $QUIET_COUNT/$QUIET_PERIOD seconds${NC}"
    fi
  fi
  
  # Sleep before checking again
  sleep $INTERVAL
done