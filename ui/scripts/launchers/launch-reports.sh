#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │ Launch Reports Dashboard Shortcut                │
# └─────────────────────────────────────────────────┘
# 📦 PURPOSE:
#   Provides a shortcut to launch the comprehensive reports dashboard
#   from the project root directory
#
# 📋 USAGE:
#   ./scripts/launcher/launch-reports.sh
#
# ─────────────────────────────────────────────────────

# Find dashboard file path
DASHBOARD_FILE="/mnt/c/Users/angel/Devloop/system-core/ui-system/dashboards/reports-dashboard.html"

# Check if the dashboard exists
if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "❌ Error: Reports dashboard not found at: $DASHBOARD_FILE"
    exit 1
fi

# Launch the dashboard directly using cmd.exe
echo "🚀 Launching reports dashboard..."
cmd.exe /c start "" "$(wslpath -w ${DASHBOARD_FILE})"

echo "✅ Reports dashboard launched successfully."
exit 0