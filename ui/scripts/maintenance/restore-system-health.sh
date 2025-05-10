#!/bin/bash

echo "Restoring System Health page to original state..."

# Restore SystemHealth.jsx
cp -f /mnt/c/Users/angel/Devloop/backups/system-health-dashboard-20250429234751/SystemHealth.jsx /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/src/pages/SystemHealth.jsx

# Remove any new files that were created
rm -f /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/src/components/health/RoadmapStatusTracker.jsx
rm -f /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/src/components/health/StatusTrackerIntegration.js

echo "System Health page restoration complete."
echo "Please restart your development server for changes to take effect."