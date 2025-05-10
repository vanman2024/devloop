# Script Organization Reference

All scripts have been organized into structured directories for better maintainability.

## Script Directories

- `scripts/ui/` - UI development and production server scripts
- `scripts/system/` - Core system operation scripts
- `scripts/maintenance/` - Cleanup and maintenance scripts
- `scripts/utils/` - Utility scripts for various tasks

## Key Symlinks in Root Directory

For convenience, frequently used scripts have symlinks in the root:

- `fixed-auto-reload.sh` → Development server (port 3000)
- `ui.sh` → Unified UI script (incl. production server on port 4173)
- `activate-ai-systems.sh` → Activates AI systems

## Log Organization

Logs have been moved to dedicated directories:

- `logs/ui/` - UI server logs
- `logs/system/` - System logs
- `logs/maintenance/` - Maintenance operation logs

## Detailed Documentation

For complete documentation on the script organization, please see:
- `scripts/README.md` - Comprehensive guide to all scripts
- `system-core/ui-system/UI_SERVER_COMMANDS.md` - UI server command reference

