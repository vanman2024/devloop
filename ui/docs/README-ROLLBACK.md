# UI Component Rollback System

This directory contains tools for safely making changes to the UI with robust rollback capabilities.

## Rollback Scripts

### Main Rollback Script (`rollback.sh`)

A comprehensive script for backing up and restoring UI components.

```bash
# Backup all critical components
./rollback.sh backup-critical

# Backup a specific file
./rollback.sh backup-file src/components/Header.jsx

# List available backups
./rollback.sh list-backups

# Restore to a specific timestamp
./rollback.sh restore-timestamp 20250505103045

# Restore a specific backup file
./rollback.sh restore-file component-backups/src/components/Header.jsx.20250505103045
```

### Header Integration Script (`integrate-header.sh`)

A script specifically designed to safely integrate the header components with automatic rollback.

```bash
# Run the header integration with built-in rollback capability
./integrate-header.sh
```

### Auto Backup Tool (`tools/auto-backup.js`)

A tool to automatically backup critical components when they change.

```bash
# Run auto backup of critical components
node tools/auto-backup.js

# Set up as a pre-commit hook
node tools/auto-backup.js setup-hook

# Just check for changes without backing up
node tools/auto-backup.js check
```

## Backup Locations

- Component-specific backups: `./component-backups/`
- Rollback logs: `./rollback-logs/`

## Critical Components

The following components are considered critical and are always backed up:

- `src/App.jsx`
- `src/components/Header.jsx`
- `src/components/navigation/GlobalHeader.jsx`
- `src/components/Sidebar.jsx`
- `src/services/notificationService.js`

## Rollback Best Practices

1. **Always backup before making changes:**
   ```bash
   ./rollback.sh backup-critical
   ```

2. **Create feature-specific integration scripts:**
   The `integrate-header.sh` script is an example of a feature-specific integration script with built-in rollback.

3. **Test after restoring:**
   After restoring from a backup, always test the application to ensure it's functioning properly.

4. **Keep backups organized:**
   Use descriptive names for backup files and keep the backup directory organized.

## Usage Examples

### Example 1: Making a significant change to App.jsx

```bash
# 1. Create a backup before making changes
./rollback.sh backup-file src/App.jsx

# 2. Make your changes to App.jsx
# ...

# 3. If something goes wrong, restore from backup
./rollback.sh list-backups App
./rollback.sh restore-file component-backups/src/App.jsx.20250505103045
```

### Example 2: Integrating a new feature with rollback

```bash
# 1. Create a backup of critical components
./rollback.sh backup-critical

# 2. Note the timestamp for potential rollback
TIMESTAMP=20250505103045

# 3. Make your changes
# ...

# 4. If something goes wrong, restore all critical components
./rollback.sh restore-timestamp $TIMESTAMP
```

### Example 3: Using the auto-backup tool

```bash
# 1. Run auto-backup before starting work
node tools/auto-backup.js

# 2. Make your changes
# ...

# 3. Check which files have changed
node tools/auto-backup.js check

# 4. If needed, find the backup and restore
./rollback.sh list-backups
./rollback.sh restore-file component-backups/src/components/Header.jsx.20250505103045
```