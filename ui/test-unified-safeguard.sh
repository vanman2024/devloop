#!/bin/bash
# Test script for the unified UI safeguard system

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Testing Unified UI Safeguard System   ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if script exists
if [ ! -f "./scripts/unified-ui-safeguard.js" ]; then
  echo -e "${RED}Error: unified-ui-safeguard.js not found!${NC}"
  exit 1
fi

# Make sure it's executable
chmod +x ./scripts/unified-ui-safeguard.js

# Test the check function
echo -e "${BLUE}\nTesting working state check...${NC}"
node --experimental-modules ./scripts/unified-ui-safeguard.js check

# Run a backup if in working state
echo -e "${BLUE}\nTesting backup creation...${NC}"
node --experimental-modules ./scripts/unified-ui-safeguard.js backup

# List available backups
echo -e "${BLUE}\nListing available backups...${NC}"
node --experimental-modules ./scripts/unified-ui-safeguard.js list

echo -e "${GREEN}\nTest completed. The unified UI safeguard system is ready to use.${NC}"
echo -e "${YELLOW}To use in your development workflow, run:${NC}"
echo -e "  ${GREEN}./run-safeguard.sh${NC}"
echo
echo -e "${YELLOW}To start the UI with safeguard monitoring:${NC}"
echo -e "  ${GREEN}./start-dev-unified.sh${NC}"