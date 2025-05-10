#!/bin/bash
#
# inject-logger.sh
#
# A script to inject logging into an already running server
#

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Starting logger injector...${NC}"
echo -e "${YELLOW}This will connect to your already running server${NC}"

# Check if the server is running
if ! nc -z localhost 8080 2>/dev/null; then
  echo -e "${YELLOW}Warning: No server detected on port 8080.${NC}"
  echo -e "${YELLOW}The logger will keep trying to connect.${NC}"
fi

# Run the logger
node "$SCRIPT_DIR/inject-logger.js"