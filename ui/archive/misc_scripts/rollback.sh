#!/bin/bash
# Comprehensive UI Component Rollback System
# This script provides the ability to backup and restore specific UI components

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set the base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$BASE_DIR/component-backups"
LOG_DIR="$BASE_DIR/rollback-logs"

# Create backup directories if they don't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

# Log file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="$LOG_DIR/rollback_$TIMESTAMP.log"

# Critical component list (components that might cause issues if modified)
CRITICAL_COMPONENTS=(
  "src/App.jsx"
  "src/components/Header.jsx"
  "src/components/navigation/GlobalHeader.jsx"
  "src/components/Sidebar.jsx"
  "src/services/notificationService.js"
)

# ====================================
# Logging functions
# ====================================

log() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# ====================================
# Backup functions
# ====================================

# Create a complete snapshot of a specific directory
backup_directory() {
  local dir="$1"
  local name="$2"
  
  if [ -z "$name" ]; then
    name=$(basename "$dir")
  fi
  
  if [ ! -d "$dir" ]; then
    log_error "Directory not found: $dir"
    return 1
  fi
  
  local backup_path="$BACKUP_DIR/${name}_${TIMESTAMP}.tar.gz"
  
  log "Creating backup of $dir..."
  tar -czf "$backup_path" -C "$(dirname "$dir")" "$(basename "$dir")" 2>> "$LOG_FILE"
  
  if [ $? -eq 0 ]; then
    log_success "Backup created: $backup_path"
    return 0
  else
    log_error "Failed to create backup of $dir"
    return 1
  fi
}

# Backup a single file with version control
backup_file() {
  local file="$1"
  
  if [ ! -f "$file" ]; then
    log_error "File not found: $file"
    return 1
  fi
  
  local relative_path="${file#$BASE_DIR/}"
  local backup_dir="$BACKUP_DIR/$(dirname "$relative_path")"
  mkdir -p "$backup_dir"
  
  local filename=$(basename "$file")
  local backup_path="$backup_dir/${filename}.${TIMESTAMP}"
  
  log "Backing up $file..."
  cp "$file" "$backup_path" 2>> "$LOG_FILE"
  
  if [ $? -eq 0 ]; then
    log_success "Backed up $file to $backup_path"
    
    # Add to changelog
    echo "$TIMESTAMP - $relative_path" >> "$BACKUP_DIR/changelog.txt"
    return 0
  else
    log_error "Failed to backup $file"
    return 1
  fi
}

# Backup critical components
backup_critical_components() {
  log "Backing up critical components..."
  
  for component in "${CRITICAL_COMPONENTS[@]}"; do
    local full_path="$BASE_DIR/$component"
    backup_file "$full_path"
  done
  
  log_success "Critical components backed up successfully"
}

# Automatic backup of modified files
backup_modified_files() {
  log "Checking for modified files in the last 24 hours..."
  
  # Find files modified in the last day
  find "$BASE_DIR/src" -type f -mtime -1 -name "*.jsx" -o -name "*.js" | while read file; do
    backup_file "$file"
  done
  
  log_success "Modified files backup complete"
}

# ====================================
# Restore functions
# ====================================

# List available backups
list_backups() {
  local component="$1"
  
  log "Listing available backups..."
  
  if [ -z "$component" ]; then
    # List all backups
    find "$BACKUP_DIR" -type f | grep -v "changelog.txt" | sort
  else
    # Component-specific backups
    find "$BACKUP_DIR" -type f -name "*$component*" | sort
  fi
}

# Restore a specific file from backup
restore_file() {
  local backup_file="$1"
  local target_file="$2"
  
  if [ ! -f "$backup_file" ]; then
    log_error "Backup file not found: $backup_file"
    return 1
  fi
  
  if [ -z "$target_file" ]; then
    # Try to determine target file from backup path
    local filename=$(basename "$backup_file")
    filename=${filename%.*} # Remove timestamp extension
    local backup_relative_dir=${backup_file#$BACKUP_DIR/}
    backup_relative_dir=$(dirname "$backup_relative_dir")
    
    if [ "$backup_relative_dir" = "." ]; then
      target_file="$BASE_DIR/$filename"
    else
      target_file="$BASE_DIR/$backup_relative_dir/$filename"
    fi
  fi
  
  # Create target directory if it doesn't exist
  mkdir -p "$(dirname "$target_file")"
  
  # Backup current file before restoring
  if [ -f "$target_file" ]; then
    local current_backup="$target_file.current_before_restore_$TIMESTAMP"
    cp "$target_file" "$current_backup" 2>> "$LOG_FILE"
    log "Current version backed up to $current_backup"
  fi
  
  # Restore the file
  log "Restoring $backup_file to $target_file..."
  cp "$backup_file" "$target_file" 2>> "$LOG_FILE"
  
  if [ $? -eq 0 ]; then
    log_success "Successfully restored $target_file"
    return 0
  else
    log_error "Failed to restore $target_file"
    return 1
  fi
}

# Restore all critical components to a specific point in time
restore_to_timestamp() {
  local timestamp="$1"
  
  if [ -z "$timestamp" ]; then
    log_error "No timestamp provided for restoration"
    return 1
  fi
  
  log "Restoring all critical components to timestamp $timestamp..."
  
  for component in "${CRITICAL_COMPONENTS[@]}"; do
    local relative_path="$component"
    local filename=$(basename "$relative_path")
    local backup_path="$BACKUP_DIR/$(dirname "$relative_path")/$filename.$timestamp"
    
    if [ -f "$backup_path" ]; then
      restore_file "$backup_path" "$BASE_DIR/$relative_path"
    else
      log_warning "No backup found for $relative_path at timestamp $timestamp"
    fi
  done
  
  log_success "Restoration to timestamp $timestamp complete"
}

# Restore a directory from a backup archive
restore_directory() {
  local backup_archive="$1"
  local target_dir="$2"
  
  if [ ! -f "$backup_archive" ]; then
    log_error "Backup archive not found: $backup_archive"
    return 1
  fi
  
  if [ -z "$target_dir" ]; then
    # Try to determine target directory from backup name
    local archive_name=$(basename "$backup_archive")
    archive_name=${archive_name%_*} # Remove timestamp
    archive_name=${archive_name%.tar.gz} # Remove extension
    target_dir="$BASE_DIR/$archive_name"
  fi
  
  # Backup current directory before restoring
  if [ -d "$target_dir" ]; then
    local current_backup="$target_dir.current_before_restore_$TIMESTAMP"
    cp -r "$target_dir" "$current_backup" 2>> "$LOG_FILE"
    log "Current directory backed up to $current_backup"
  fi
  
  # Restore the directory
  log "Restoring $backup_archive to $target_dir..."
  mkdir -p "$(dirname "$target_dir")"
  tar -xzf "$backup_archive" -C "$(dirname "$target_dir")" 2>> "$LOG_FILE"
  
  if [ $? -eq 0 ]; then
    log_success "Successfully restored $target_dir"
    return 0
  else
    log_error "Failed to restore $target_dir"
    return 1
  fi
}

# ====================================
# Main functionality
# ====================================

# Function to display usage
show_usage() {
  echo "UI Component Rollback System"
  echo
  echo "Usage: $0 COMMAND [OPTIONS]"
  echo
  echo "Commands:"
  echo "  backup-file FILE              Backup a specific file"
  echo "  backup-critical               Backup all critical components"
  echo "  backup-all                    Backup entire UI directory"
  echo "  backup-modified               Backup files modified in the last 24 hours"
  echo "  restore-file BACKUP TARGET    Restore a file from backup"
  echo "  restore-timestamp TIMESTAMP   Restore all critical components to a timestamp"
  echo "  restore-dir BACKUP TARGET     Restore a directory from backup archive"
  echo "  list-backups [COMPONENT]      List available backups, optionally filtered by component"
  echo "  show-critical                 Show list of critical components being tracked"
  echo
  echo "Examples:"
  echo "  $0 backup-file src/components/Header.jsx"
  echo "  $0 backup-critical"
  echo "  $0 list-backups Header"
  echo "  $0 restore-file component-backups/src/components/Header.jsx.20250505123456 src/components/Header.jsx"
  echo "  $0 restore-timestamp 20250505123456"
}

# Main script logic
if [ $# -lt 1 ]; then
  show_usage
  exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
  backup-file)
    if [ $# -lt 1 ]; then
      log_error "No file specified for backup"
      show_usage
      exit 1
    fi
    backup_file "$BASE_DIR/$1"
    ;;
  
  backup-critical)
    backup_critical_components
    ;;
  
  backup-all)
    backup_directory "$BASE_DIR/src" "src"
    ;;
  
  backup-modified)
    backup_modified_files
    ;;
  
  restore-file)
    if [ $# -lt 1 ]; then
      log_error "No backup file specified for restoration"
      show_usage
      exit 1
    fi
    
    if [ $# -lt 2 ]; then
      restore_file "$1"
    else
      restore_file "$1" "$BASE_DIR/$2"
    fi
    ;;
  
  restore-timestamp)
    if [ $# -lt 1 ]; then
      log_error "No timestamp specified for restoration"
      show_usage
      exit 1
    fi
    restore_to_timestamp "$1"
    ;;
  
  restore-dir)
    if [ $# -lt 1 ]; then
      log_error "No backup archive specified for directory restoration"
      show_usage
      exit 1
    fi
    
    if [ $# -lt 2 ]; then
      restore_directory "$1"
    else
      restore_directory "$1" "$BASE_DIR/$2"
    fi
    ;;
  
  list-backups)
    list_backups "$1"
    ;;
  
  show-critical)
    echo "Critical components being tracked for backup:"
    for component in "${CRITICAL_COMPONENTS[@]}"; do
      echo "  $component"
    done
    ;;
  
  *)
    log_error "Unknown command: $COMMAND"
    show_usage
    exit 1
    ;;
esac

exit 0