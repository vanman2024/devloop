#!/bin/bash
# Test script for the runtime error detection

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAFEGUARD_SCRIPT="$SCRIPT_DIR/../unified-ui-safeguard.js"

echo -e "${BLUE}Testing runtime error detection...${NC}"
echo "This will run just the runtime verification without the full component tests."
echo ""

# Run the safeguard with runtime verification
echo -e "${YELLOW}Running: node $SAFEGUARD_SCRIPT verify runtime${NC}"
node "$SAFEGUARD_SCRIPT" verify runtime

# Check the exit code
STATUS=$?
if [ $STATUS -eq 0 ]; then
  echo -e "${GREEN}Runtime verification PASSED! No errors detected.${NC}"
else
  echo -e "${RED}Runtime verification FAILED! Errors detected.${NC}"
fi

exit $STATUS