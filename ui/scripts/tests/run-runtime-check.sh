#!/bin/bash
# Simple wrapper script to run the runtime error detection test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running UI runtime error detection test...${NC}"
echo "This test checks if the app can detect runtime errors."
echo "Make sure your dev server is running first (npm run dev)."
echo ""

# Run the test script with Node.js experimental modules
node --experimental-modules "$(dirname "$0")/test-runtime-check.js"

# Check the exit code
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Test passed! No runtime errors detected.${NC}"
else
  echo -e "${RED}Test failed! Runtime errors were detected.${NC}"
fi