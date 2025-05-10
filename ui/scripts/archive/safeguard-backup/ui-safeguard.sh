#!/bin/bash
# UI Safeguard System
# Automatically backs up and restores UI components during development

set -e
BACKUP_DIR="/mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/backup"
SRC_DIR="/mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/src"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

function show_help {
  echo "UI Safeguard System - Backup and restore UI components"
  echo ""
  echo "Usage:"
  echo "  $0 [command] [component]"
  echo ""
  echo "Commands:"
  echo "  backup    Create backup of component(s)"
  echo "  restore   Restore component from backup"
  echo "  list      List available backups"
  echo "  status    Check modification status of components"
  echo "  verify    Test if components render correctly"
  echo ""
  echo "Components:"
  echo "  all                   All UI components"
  echo "  system-health         System Health dashboard"
  echo "  feature-manager       Feature Manager"
  echo "  integration-sync      Integration Sync page"
  echo "  specific:[file_path]  Specific component file path"
  echo ""
  echo "Examples:"
  echo "  $0 backup system-health"
  echo "  $0 restore system-health"
  echo "  $0 backup specific:src/components/health/StructureValidation.jsx"
  echo "  $0 status all"
}

function ensure_backup_dir {
  local component=$1
  local backup_path="${BACKUP_DIR}/${component}/${TIMESTAMP}"
  mkdir -p "$backup_path"
  echo "$backup_path"
}

function backup_component {
  local component=$1
  local backup_path=$(ensure_backup_dir "$component")
  
  case $component in
    system-health)
      echo "Backing up System Health components..."
      mkdir -p "${backup_path}/pages"
      mkdir -p "${backup_path}/components/health"
      
      # Copy SystemHealth page
      cp "${SRC_DIR}/pages/SystemHealth.jsx" "${backup_path}/pages/"
      
      # Copy all health components
      cp "${SRC_DIR}/components/health/"*.jsx "${backup_path}/components/health/"
      cp "${SRC_DIR}/components/health/"*.js "${backup_path}/components/health/" 2>/dev/null || true
      
      # Create restore script
      cat > "${backup_path}/restore.sh" << EOF
#!/bin/bash
echo "Restoring System Health components from backup (${TIMESTAMP})..."
cp -f "${backup_path}/pages/SystemHealth.jsx" "${SRC_DIR}/pages/SystemHealth.jsx"
cp -f "${backup_path}/components/health/"*.jsx "${SRC_DIR}/components/health/"
cp -f "${backup_path}/components/health/"*.js "${SRC_DIR}/components/health/" 2>/dev/null || true
echo "System Health components restored successfully."
EOF
      chmod +x "${backup_path}/restore.sh"
      
      echo "System Health components backed up to: ${backup_path}"
      echo "To restore: ${backup_path}/restore.sh"
      ;;
      
    feature-manager)
      echo "Backing up Feature Manager components..."
      mkdir -p "${backup_path}/pages"
      mkdir -p "${backup_path}/components/features"
      
      # Copy FeatureManager page
      cp "${SRC_DIR}/pages/FeatureManager.jsx" "${backup_path}/pages/"
      
      # Copy feature components
      [ -d "${SRC_DIR}/components/features" ] && cp "${SRC_DIR}/components/features/"*.jsx "${backup_path}/components/features/" 2>/dev/null || true
      [ -d "${SRC_DIR}/components/features" ] && cp "${SRC_DIR}/components/features/"*.js "${backup_path}/components/features/" 2>/dev/null || true
      
      # Create restore script
      cat > "${backup_path}/restore.sh" << EOF
#!/bin/bash
echo "Restoring Feature Manager components from backup (${TIMESTAMP})..."
cp -f "${backup_path}/pages/FeatureManager.jsx" "${SRC_DIR}/pages/FeatureManager.jsx"
mkdir -p "${SRC_DIR}/components/features"
cp -f "${backup_path}/components/features/"*.jsx "${SRC_DIR}/components/features/" 2>/dev/null || true
cp -f "${backup_path}/components/features/"*.js "${SRC_DIR}/components/features/" 2>/dev/null || true
echo "Feature Manager components restored successfully."
EOF
      chmod +x "${backup_path}/restore.sh"
      
      echo "Feature Manager components backed up to: ${backup_path}"
      echo "To restore: ${backup_path}/restore.sh"
      ;;
    
    integration-sync)
      echo "Backing up Integration Sync components..."
      mkdir -p "${backup_path}/pages"
      mkdir -p "${backup_path}/components/integration"
      
      # Copy IntegrationSync page
      cp "${SRC_DIR}/pages/IntegrationSync.jsx" "${backup_path}/pages/"
      
      # Copy integration components
      [ -d "${SRC_DIR}/components/integration" ] && cp "${SRC_DIR}/components/integration/"*.jsx "${backup_path}/components/integration/" 2>/dev/null || true
      [ -d "${SRC_DIR}/components/integration" ] && cp "${SRC_DIR}/components/integration/"*.js "${backup_path}/components/integration/" 2>/dev/null || true
      
      # Create restore script
      cat > "${backup_path}/restore.sh" << EOF
#!/bin/bash
echo "Restoring Integration Sync components from backup (${TIMESTAMP})..."
cp -f "${backup_path}/pages/IntegrationSync.jsx" "${SRC_DIR}/pages/IntegrationSync.jsx"
mkdir -p "${SRC_DIR}/components/integration"
cp -f "${backup_path}/components/integration/"*.jsx "${SRC_DIR}/components/integration/" 2>/dev/null || true
cp -f "${backup_path}/components/integration/"*.js "${SRC_DIR}/components/integration/" 2>/dev/null || true
echo "Integration Sync components restored successfully."
EOF
      chmod +x "${backup_path}/restore.sh"
      
      echo "Integration Sync components backed up to: ${backup_path}"
      echo "To restore: ${backup_path}/restore.sh"
      ;;
      
    specific:*)
      local file_path=${component#specific:}
      if [[ ! -f "$file_path" && ! -f "${SRC_DIR}/${file_path}" ]]; then
        echo "Error: File not found: $file_path"
        exit 1
      fi
      
      # Handle both absolute and relative paths
      if [[ "$file_path" == /* ]]; then
        actual_path="$file_path"
        rel_path=$(realpath --relative-to="${SRC_DIR}" "$file_path")
      else
        actual_path="${SRC_DIR}/${file_path}"
        rel_path="$file_path"
      fi
      
      # Create target directory structure
      target_dir=$(dirname "${backup_path}/${rel_path}")
      mkdir -p "$target_dir"
      
      # Copy the file
      cp "$actual_path" "${backup_path}/${rel_path}"
      
      # Create restore script
      cat > "${backup_path}/restore.sh" << EOF
#!/bin/bash
echo "Restoring specific component from backup (${TIMESTAMP})..."
mkdir -p "$(dirname "${SRC_DIR}/${rel_path}")"
cp -f "${backup_path}/${rel_path}" "${SRC_DIR}/${rel_path}"
echo "Component restored successfully."
EOF
      chmod +x "${backup_path}/restore.sh"
      
      echo "Component backed up to: ${backup_path}/${rel_path}"
      echo "To restore: ${backup_path}/restore.sh"
      ;;
      
    all)
      backup_component "system-health"
      backup_component "feature-manager"
      backup_component "integration-sync"
      
      # Create master restore script
      cat > "${BACKUP_DIR}/all/${TIMESTAMP}/restore-all.sh" << EOF
#!/bin/bash
echo "Restoring all components from backup (${TIMESTAMP})..."
bash "${BACKUP_DIR}/system-health/${TIMESTAMP}/restore.sh"
bash "${BACKUP_DIR}/feature-manager/${TIMESTAMP}/restore.sh"
bash "${BACKUP_DIR}/integration-sync/${TIMESTAMP}/restore.sh"
echo "All components restored successfully."
EOF
      chmod +x "${BACKUP_DIR}/all/${TIMESTAMP}/restore-all.sh"
      
      echo "All components backed up with timestamp: ${TIMESTAMP}"
      echo "To restore all: ${BACKUP_DIR}/all/${TIMESTAMP}/restore-all.sh"
      ;;
      
    *)
      echo "Error: Unknown component: $component"
      show_help
      exit 1
      ;;
  esac
}

function list_backups {
  local component=$1
  
  if [[ "$component" == "all" ]]; then
    echo "Available backups:"
    for comp in system-health feature-manager integration-sync all; do
      echo "* $comp:"
      if [[ -d "${BACKUP_DIR}/${comp}" ]]; then
        ls -1t "${BACKUP_DIR}/${comp}" | head -5 | sed 's/^/  - /'
      else
        echo "  - No backups available"
      fi
    done
  else
    echo "Available backups for $component:"
    if [[ -d "${BACKUP_DIR}/${component}" ]]; then
      ls -1t "${BACKUP_DIR}/${component}" | sed 's/^/  - /'
    else
      echo "  - No backups available"
    fi
  fi
}

function restore_backup {
  local component=$1
  local timestamp=$2
  
  if [[ -z "$timestamp" ]]; then
    # Get the latest backup
    timestamp=$(ls -1t "${BACKUP_DIR}/${component}" | head -1)
    if [[ -z "$timestamp" ]]; then
      echo "Error: No backups found for $component"
      exit 1
    fi
  fi
  
  local restore_script="${BACKUP_DIR}/${component}/${timestamp}/restore.sh"
  
  if [[ ! -f "$restore_script" ]]; then
    echo "Error: Restore script not found: $restore_script"
    exit 1
  fi
  
  bash "$restore_script"
}

function check_status {
  local component=$1
  
  case $component in
    system-health)
      echo "Checking System Health component status..."
      if [[ -d "${BACKUP_DIR}/system-health" ]]; then
        local latest=$(ls -1t "${BACKUP_DIR}/system-health" | head -1)
        if [[ -n "$latest" ]]; then
          echo "Comparing with backup: $latest"
          diff -q "${SRC_DIR}/pages/SystemHealth.jsx" "${BACKUP_DIR}/system-health/${latest}/pages/SystemHealth.jsx" >/dev/null 2>&1
          if [[ $? -ne 0 ]]; then
            echo "⚠️  SystemHealth.jsx has been modified since last backup"
          else
            echo "✅ SystemHealth.jsx is unchanged"
          fi
          
          # Count modified health components
          local modified=0
          for file in "${SRC_DIR}"/components/health/*.jsx "${SRC_DIR}"/components/health/*.js; do
            if [[ -f "$file" ]]; then
              filename=$(basename "$file")
              if [[ -f "${BACKUP_DIR}/system-health/${latest}/components/health/${filename}" ]]; then
                diff -q "$file" "${BACKUP_DIR}/system-health/${latest}/components/health/${filename}" >/dev/null 2>&1
                if [[ $? -ne 0 ]]; then
                  modified=$((modified+1))
                  echo "⚠️  $filename has been modified since last backup"
                fi
              else
                echo "⚠️  $filename is new (not in backup)"
              fi
            fi
          done
          
          if [[ $modified -eq 0 ]]; then
            echo "✅ All health components match backup"
          else
            echo "⚠️  $modified health component(s) modified since backup"
          fi
        else
          echo "No backups available for comparison"
        fi
      else
        echo "No backups available for comparison"
      fi
      ;;
      
    # Add similar logic for other components
    
    all)
      check_status "system-health"
      check_status "feature-manager"
      check_status "integration-sync"
      ;;
      
    *)
      echo "Error: Unknown component: $component"
      show_help
      exit 1
      ;;
  esac
}

function verify_components {
  echo "Running render verification tests..."
  
  # Get current directory to return to it
  local current_dir=$(pwd)
  
  # Change to app directory
  cd "$(dirname "$0")/.."
  
  # Create temporary component verification script
  cat > verify-components.jsx << EOF
import React from 'react';
import { render } from '@testing-library/react';
import SystemHealth from './src/pages/SystemHealth';
import FeatureManager from './src/pages/FeatureManager';
import IntegrationSync from './src/pages/IntegrationSync';

const mockRouter = {
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

describe('Component Verification', () => {
  test('SystemHealth renders without crashing', () => {
    render(<SystemHealth />);
  });
  
  test('FeatureManager renders without crashing', () => {
    render(<FeatureManager />);
  });
  
  test('IntegrationSync renders without crashing', () => {
    render(<IntegrationSync />);
  });
});
EOF

  # Run the test
  echo "This would run component verification tests in a production environment."
  echo "To implement, add a simple React test runner to your package.json."
  
  # Clean up
  rm verify-components.jsx
  
  # Return to original directory
  cd "$current_dir"
}

# Main execution
if [[ $# -lt 1 ]]; then
  show_help
  exit 1
fi

command=$1
component=$2

case $command in
  backup)
    if [[ -z "$component" ]]; then
      echo "Error: Component required for backup"
      show_help
      exit 1
    fi
    backup_component "$component"
    ;;
    
  restore)
    if [[ -z "$component" ]]; then
      echo "Error: Component required for restore"
      show_help
      exit 1
    fi
    timestamp=$3
    restore_backup "$component" "$timestamp"
    ;;
    
  list)
    component=${component:-"all"}
    list_backups "$component"
    ;;
    
  status)
    component=${component:-"all"}
    check_status "$component"
    ;;
    
  verify)
    verify_components
    ;;
    
  help)
    show_help
    ;;
    
  *)
    echo "Error: Unknown command: $command"
    show_help
    exit 1
    ;;
esac