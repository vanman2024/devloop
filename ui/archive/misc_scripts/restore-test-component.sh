#!/bin/bash
# Script to restore the test component directly

# Script directory
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR" || exit 1

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Restoring TestComponent.jsx to original state...${NC}"

# Original content
cat > ./src/components/system-health/TestComponent.jsx << 'EOF'
import React from 'react';

const TestComponent = () => {
  return (
    <div className="test-component">
      <h2>UI Safeguard Test Component</h2>
      <p>This component is used to test the UI Safeguard system.</p>
    </div>
  );
};

export default TestComponent;
EOF

echo -e "${GREEN}TestComponent.jsx restored successfully.${NC}"