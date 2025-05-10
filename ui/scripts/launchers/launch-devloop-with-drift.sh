#!/bin/bash
# Script to launch Devloop with Drift Detection feature

# Colors for better UX
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔═════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    DEVLOOP WITH DRIFT DETECTION FEATURE     ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════╝${NC}"
echo

# Function to stop any existing processes
function stop_existing() {
  echo "Stopping any existing UI processes..."
  pkill -f 'vite' || true
  sleep 2
}

# Function to modify files
function modify_files() {
  echo "Updating SystemHealth.jsx to include Drift Detection tab..."
  
  # Copy DriftDetectionMonitor.jsx
  if [ ! -d "$SCRIPT_DIR/system-core/ui-system/react-app/src/components/health" ]; then
    mkdir -p "$SCRIPT_DIR/system-core/ui-system/react-app/src/components/health"
  fi
  
  # Copy our drift detection components
  cp -f "$SCRIPT_DIR/milestones/milestone-integrated-testing/phase-04/module-test-scenarios/feature-1305-dev-drift-detection/output/ui/DriftDetectionMonitor.jsx" \
     "$SCRIPT_DIR/system-core/ui-system/react-app/src/components/health/"
  cp -f "$SCRIPT_DIR/milestones/milestone-integrated-testing/phase-04/module-test-scenarios/feature-1305-dev-drift-detection/output/ui/DriftDetectionTab.jsx" \
     "$SCRIPT_DIR/system-core/ui-system/react-app/src/components/health/"
     
  # Create services directory if it doesn't exist
  if [ ! -d "$SCRIPT_DIR/system-core/ui-system/react-app/src/services" ]; then
    mkdir -p "$SCRIPT_DIR/system-core/ui-system/react-app/src/services"
  fi
  
  # Copy our service
  cp -f "$SCRIPT_DIR/milestones/milestone-integrated-testing/phase-04/module-test-scenarios/feature-1305-dev-drift-detection/output/ui/driftDetectionService.js" \
     "$SCRIPT_DIR/system-core/ui-system/react-app/src/services/"
  
  # Modify SystemHealth.jsx to include our tab
  SYSTEM_HEALTH_FILE="$SCRIPT_DIR/system-core/ui-system/react-app/src/pages/SystemHealth.jsx"
  
  # Make a backup if it doesn't exist
  if [ ! -f "${SYSTEM_HEALTH_FILE}.bak" ]; then
    cp "$SYSTEM_HEALTH_FILE" "${SYSTEM_HEALTH_FILE}.bak"
  fi
  
  # Update imports
  grep -q "DriftDetectionTab" "$SYSTEM_HEALTH_FILE" || 
    sed -i '3i import DriftDetectionTab from "../components/health/DriftDetectionTab";' "$SYSTEM_HEALTH_FILE"
  
  # Add our tab (if it doesn't exist)
  grep -q "eventKey=\"drift\"" "$SYSTEM_HEALTH_FILE" || 
    sed -i '/eventKey="memory"/a \          <Tab eventKey="drift" title="Drift Detection">\n            <DriftDetectionTab />\n          </Tab>' "$SYSTEM_HEALTH_FILE"
    
  echo "Files updated successfully!"
}

# Stop any existing processes
stop_existing

# Modify the files to add our feature
modify_files

# Start the UI
echo -e "${GREEN}Starting Devloop UI with Drift Detection...${NC}"
echo -e "This includes the Development Drift Detection feature in the System Health page."
echo

# Call the existing launch script
cd "$SCRIPT_DIR"
./launch-react-feature-manager.sh