#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │ Launch Devloop UI System                        │
# └─────────────────────────────────────────────────┘
# 📦 PURPOSE:
#   Launches all Devloop UI components
#
# 📋 USAGE:
#   ./launch-devloop-ui.sh [options]
#
#   Options:
#     --all                 Launch all UI components
#     --feature-manager     Launch Feature Manager UI (default)
#     --dashboard           Launch Project Dashboard
#     --reports             Launch Reports Dashboard
#
# ─────────────────────────────────────────────────────

# Set project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}┌────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│       ${GREEN}Devloop UI System Launcher${BLUE}            │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────┘${NC}"
echo

# Default is to launch the Feature Manager
LAUNCH_FEATURE_MANAGER=true
LAUNCH_DASHBOARD=false
LAUNCH_REPORTS=false
LAUNCH_ALL=false

# Process command line arguments
while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) 
      LAUNCH_ALL=true
      LAUNCH_FEATURE_MANAGER=true
      LAUNCH_DASHBOARD=true
      LAUNCH_REPORTS=true
      shift 1
      ;;
    --feature-manager) 
      LAUNCH_FEATURE_MANAGER=true
      shift 1
      ;;
    --dashboard) 
      LAUNCH_DASHBOARD=true
      LAUNCH_FEATURE_MANAGER=false
      shift 1
      ;;
    --reports) 
      LAUNCH_REPORTS=true
      LAUNCH_FEATURE_MANAGER=false
      shift 1
      ;;
    *) 
      echo -e "${YELLOW}Unknown parameter: $1${NC}"
      echo "Usage: ./launch-devloop-ui.sh [--all | --feature-manager | --dashboard | --reports]"
      exit 1
      ;;
  esac
done

# Function to check if a component is already running
is_running() {
  local port=$1
  netstat -tuln 2>/dev/null | grep -q ":$port "
  return $?
}

# Function to start dashboard in background
start_dashboard() {
  echo -e "${PURPLE}Starting Project Dashboard...${NC}"
  
  local dashboard_script="${SCRIPT_DIR}/system-core/project-tracker/active/launch-dashboard.sh"
  
  if [ -f "$dashboard_script" ]; then
    "$dashboard_script" &
    echo -e "${GREEN}✓ Dashboard launched successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Dashboard script not found at: $dashboard_script${NC}"
    echo -e "${YELLOW}⚠ Trying fallback launch method...${NC}"
    "${SCRIPT_DIR}/system-core/project-tracker/launch-dashboard.sh" &
  fi
  
  # Give dashboard time to start
  sleep 2
}

# Function to start reports dashboard
start_reports() {
  echo -e "${PURPLE}Starting Reports Dashboard...${NC}"
  
  local reports_script="${SCRIPT_DIR}/launch-reports.sh"
  
  if [ -f "$reports_script" ]; then
    "$reports_script" &
    echo -e "${GREEN}✓ Reports Dashboard launched successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Reports dashboard script not found${NC}"
  fi
  
  # Give reports dashboard time to start
  sleep 2
}

# Function to start feature manager
start_feature_manager() {
  echo -e "${PURPLE}Starting Feature Manager UI...${NC}"
  
  # Determine the available launcher script
  local ui_launcher="${SCRIPT_DIR}/system-core/ui-system/launch.sh"
  
  if [ -f "$ui_launcher" ]; then
    "$ui_launcher"
    return_code=$?
    
    if [ $return_code -ne 0 ]; then
      echo -e "${YELLOW}⚠ Feature Manager UI failed to start (code: $return_code)${NC}"
    else
      echo -e "${GREEN}✓ Feature Manager UI launched successfully${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Feature Manager UI launcher not found at: $ui_launcher${NC}"
    echo -e "${YELLOW}⚠ Trying fallback launch method...${NC}"
    
    local fallback_ui_launcher="${SCRIPT_DIR}/launch-feature-manager.sh"
    
    if [ -f "$fallback_ui_launcher" ]; then
      "$fallback_ui_launcher"
    else
      echo -e "${YELLOW}⚠ No Feature Manager UI launcher found${NC}"
    fi
  fi
}

# Launch the selected components
if [ "$LAUNCH_ALL" = true ]; then
  echo -e "${GREEN}Launching all Devloop UI components...${NC}"
  
  # Start dashboard and reports in background
  start_dashboard
  start_reports
  
  # Start feature manager in foreground to keep script running
  start_feature_manager
  
elif [ "$LAUNCH_DASHBOARD" = true ]; then
  start_dashboard
  
elif [ "$LAUNCH_REPORTS" = true ]; then
  start_reports
  
else
  # Default is to launch Feature Manager UI
  start_feature_manager
fi

exit 0