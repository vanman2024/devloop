#!/bin/bash
#
# start-with-logging.sh
#
# A script to start the UI development server with automatic
# output logging to the database.
#

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Starting UI server with database logging...${NC}"

# Run the command through the console logger
cd "$PROJECT_DIR"
node "$SCRIPT_DIR/console-logger.js" "./start-dev.sh" "ui-start"

# Exit with the same code as the command
exit $?