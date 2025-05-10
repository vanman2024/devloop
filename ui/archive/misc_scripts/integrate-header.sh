#!/bin/bash
# Header Integration Script with Automatic Rollback

# Set the base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ====================================
# Utility Functions
# ====================================

log() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ====================================
# Backup before integration
# ====================================

backup_components() {
  log "Creating backups before header integration..."
  
  # Backup critical components
  COMPONENTS=(
    "src/App.jsx"
    "src/components/Header.jsx"
    "src/components/navigation/GlobalHeader.jsx"
    "src/services/notificationService.js"
  )
  
  for component in "${COMPONENTS[@]}"; do
    log "Backing up $component..."
    # Use the rollback script for backup
    "$BASE_DIR/rollback.sh" backup-file "$component"
  done
  
  log_success "Backup complete"
}

# ====================================
# Integration steps
# ====================================

# Step 1: Update Header.jsx to integrate with notification service
update_header() {
  log "Updating Header.jsx with notification support..."
  
  # Check if file exists
  if [ ! -f "$BASE_DIR/src/components/Header.jsx" ]; then
    log_error "Header component not found"
    return 1
  fi
  
  # Add notification import
  header_file="$BASE_DIR/src/components/Header.jsx"
  
  # Check if already integrated
  if grep -q "notificationService" "$header_file"; then
    log_warning "Header already integrated with notification service"
  else
    # Backup again just to be safe
    cp "$header_file" "$header_file.bak_$TIMESTAMP"
    
    # Add notification import
    sed -i '0,/import.*Link.*from.*react-router-dom.*/ s/import.*Link.*from.*react-router-dom.*/import React, { useState, useEffect, useRef, useCallback } from '\''react'\'';\nimport { Link, useLocation } from '\''react-router-dom'\'';\nimport { useChangeTracker } from '\''.\\/ChangeTracker.jsx'\'';\nimport { registerNotificationHandler, dispatchNotification } from '\''..\/services\/notificationService'\'';/' "$header_file"
    
    # Add notification state
    sed -i '0,/const Header = () => {/ s/const Header = () => {/const Header = () => {\n  const location = useLocation();\n  const { changes, showChanges, setShowChanges } = useChangeTracker();\n  \n  \/\/ Notification state\n  const [notifications, setNotifications] = useState([]);\n  const [showNotifications, setShowNotifications] = useState(false);\n  const [unreadCount, setUnreadCount] = useState(0);\n  const notificationsRef = useRef(null);\n  \n  \/\/ Handle new notifications\n  const handleNotification = useCallback((notification) => {\n    \/\/ Add notification to our state\n    setNotifications(prev => {\n      \/\/ Add to beginning of array (newest first)\n      const updated = [notification, ...prev];\n      \/\/ Keep only most recent 30 notifications\n      return updated.slice(0, 30);\n    });\n    \n    \/\/ Increment unread count if dropdown is closed\n    if (!showNotifications) {\n      setUnreadCount(prev => prev + 1);\n    }\n  }, [showNotifications]);\n  \n  \/\/ Register notification handler\n  useEffect(() => {\n    \/\/ Register with the notification service\n    const unregister = registerNotificationHandler(handleNotification);\n    \n    \/\/ Cleanup on unmount\n    return () => {\n      unregister();\n    };\n  }, [handleNotification]);\n  \n  \/\/ Click outside handler to close notification dropdown\n  useEffect(() => {\n    const handleClickOutside = (event) => {\n      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {\n        setShowNotifications(false);\n      }\n    };\n    \n    document.addEventListener('\''mousedown'\'', handleClickOutside);\n    return () => {\n      document.removeEventListener('\''mousedown'\'', handleClickOutside);\n    };\n  }, []);\n  \n  \/\/ Toggle notifications dropdown\n  const toggleNotifications = () => {\n    const newState = !showNotifications;\n    setShowNotifications(newState);\n    \n    \/\/ Reset unread count when opening\n    if (newState) {\n      setUnreadCount(0);\n    }\n  };/' "$header_file"
  fi
  
  log_success "Header.jsx updated successfully"
}

# Step 2: Add a simple notification button to Header.jsx
add_notification_button() {
  log "Adding notification button to Header.jsx..."
  
  header_file="$BASE_DIR/src/components/Header.jsx"
  
  # Check if notification button already exists
  if grep -q "notificationsRef" "$header_file"; then
    log_warning "Notification button already exists in Header.jsx"
    return 0
  fi
  
  # Add notification button
  sed -i 's/<button className="text-gray-300 hover:text-white">/<div className="relative" ref={notificationsRef}>\n            <button \n              className="text-gray-300 hover:text-white relative" \n              onClick={toggleNotifications}\n              title="Notifications"\n            >/' "$header_file"
  
  # Add notification badge
  sed -i '/<\/svg>/a\              \n              {unreadCount > 0 \&\& (\n                <span className="absolute top-0 right-0 transform translate-x-1\/2 -translate-y-1\/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">\n                  {unreadCount > 9 ? '\''9+'\'': unreadCount}\n                <\/span>\n              )}' "$header_file"
  
  # Add notification dropdown
  sed -i '/<\/button>/a\            \n            {showNotifications \&\& (\n              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50">\n                <div className="p-3 border-b border-gray-700 flex justify-between items-center">\n                  <h3 className="text-white text-sm font-medium">Notifications<\/h3>\n                  <button \n                    className="text-xs text-blue-400 hover:text-blue-300"\n                    onClick={() => {\n                      \/\/ Mark all as read\n                      setNotifications(prevNotifications => \n                        prevNotifications.map(n => ({ ...n, read: true }))\n                      );\n                      setUnreadCount(0);\n                    }}\n                  >\n                    Mark all as read\n                  <\/button>\n                <\/div>\n                \n                <div className="max-h-64 overflow-y-auto">\n                  {notifications.length === 0 ? (\n                    <div className="p-4 text-center text-gray-400">\n                      <p>No notifications<\/p>\n                      <button \n                        className="mt-2 text-sm text-blue-400 hover:text-blue-300"\n                        onClick={() => {\n                          \/\/ Send a test notification\n                          dispatchNotification({\n                            type: '\''info'\'',\n                            title: '\''Test Notification'\'',\n                            description: '\''This is a test notification from the classic header.'\'',\n                            timestamp: new Date().toISOString()\n                          });\n                        }}\n                      >\n                        Send test notification\n                      <\/button>\n                    <\/div>\n                  ) : (\n                    <div>\n                      {notifications.map((notification, index) => (\n                        <div \n                          key={notification.id || index}\n                          className={`p-3 border-b border-gray-700 hover:bg-gray-700 ${notification.read ? '\''opacity-70'\'': '\'''\''}`}\n                        >\n                          <div className="flex justify-between">\n                            <span className="font-medium text-white">\n                              {notification.title}\n                              {!notification.read && (\n                                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"><\/span>\n                              )}\n                            <\/span>\n                            <span className="text-xs text-gray-400">\n                              {new Date(notification.timestamp).toLocaleTimeString()}\n                            <\/span>\n                          <\/div>\n                          <p className="text-sm text-gray-300 mt-1">\n                            {notification.description}\n                          <\/p>\n                        <\/div>\n                      ))}\n                    <\/div>\n                  )}\n                <\/div>\n                \n                <div className="p-2 border-t border-gray-700 text-center">\n                  <Link \n                    to="\/activity-center"\n                    className="text-sm text-blue-400 hover:text-blue-300"\n                    onClick={() => setShowNotifications(false)}\n                  >\n                    View all notifications\n                  <\/Link>\n                <\/div>\n              <\/div>\n            )}\n          <\/div>' "$header_file"
  
  log_success "Notification button added to Header.jsx"
}

# Step 3: Add view header demo link
add_header_demo_link() {
  log "Adding header demo link to main interface..."
  
  app_file="$BASE_DIR/src/App.jsx"
  
  # Check if header demo link already exists
  if grep -q "header-demo" "$app_file"; then
    log_warning "Header demo link already exists in App.jsx"
    return 0
  fi
  
  # Add header demo link
  sed -i '/<main className="flex-1/a\          {/* Header demo link */}\n          <div className="mb-4 flex justify-end">\n            <Link \n              to="\/header-demo"\n              className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded border border-blue-600 transition-all duration-300 hover:scale-105"\n              title="View the header demo page"\n            >\n              <span className="flex items-center">\n                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http:\/\/www.w3.org\/2000\/svg">\n                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"><\/path>\n                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"><\/path>\n                <\/svg>\n                Header Demo\n              <\/span>\n            <\/Link>\n          <\/div>' "$app_file"
  
  log_success "Header demo link added to App.jsx"
}

# ====================================
# Rollback functionality
# ====================================

rollback_changes() {
  log "Rolling back changes due to errors..."
  
  # Use the rollback script for restoration
  TIMESTAMP="$1"
  
  # Restore critical components
  "$BASE_DIR/rollback.sh" restore-timestamp "$TIMESTAMP"
  
  log_success "Rollback completed successfully"
}

# ====================================
# Main script
# ====================================

main() {
  log "Starting header integration with rollback capability..."
  
  # Step 1: Backup components
  backup_components
  
  # Remember timestamp for potential rollback
  BACKUP_TIMESTAMP="$TIMESTAMP"
  
  # Step 2: Update Header.jsx
  if ! update_header; then
    log_error "Failed to update Header.jsx"
    rollback_changes "$BACKUP_TIMESTAMP"
    exit 1
  fi
  
  # Step 3: Add notification button
  if ! add_notification_button; then
    log_error "Failed to add notification button"
    rollback_changes "$BACKUP_TIMESTAMP"
    exit 1
  fi
  
  # Step 4: Add header demo link
  if ! add_header_demo_link; then
    log_error "Failed to add header demo link"
    rollback_changes "$BACKUP_TIMESTAMP"
    exit 1
  fi
  
  log_success "Header integration completed successfully"
  echo
  echo "If you experience any issues, run the following command to rollback:"
  echo "./rollback.sh restore-timestamp $BACKUP_TIMESTAMP"
  
  return 0
}

# Run main function
main