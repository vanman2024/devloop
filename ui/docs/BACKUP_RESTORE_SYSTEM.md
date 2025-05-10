# UI Backup and Restore System

This document explains how to use the working state detection, backup, and restoration system for the UI.

## Purpose

This system provides a way to:

1. Automatically detect when the UI is in a "working state"
2. Create backups only when the app is functioning correctly
3. Restore from these "known good" backups when needed

The goal is to ensure you always have clean, working states in your backup history - no garbage backups or broken states.

## Components

The system consists of three main components:

### 1. Working State Detector (`tools/working-state-detector.js`)

A Node.js script that:
- Verifies if the development server is running
- Checks for existence of critical files
- Validates the UI is in a functional state
- Creates backups when all checks pass

### 2. Continuous Monitoring Script (`run-working-state-detector.sh`)

A Bash script that:
- Monitors the source directory for changes
- Waits for a quiet period (no file changes)
- Triggers the working state detector to check if a backup should be made
- Provides real-time feedback on the monitoring process

### 3. Restoration Script (`restore-from-backup.sh`)

A Bash script that:
- Lists all available working state backups
- Allows you to select which backup to restore
- Creates a safety backup of the current state before restoring
- Restores the UI components from the selected backup

## Usage

### Creating Backups

Backups are created automatically when:
1. The continuous monitoring script is running
2. The development server is running
3. You stop making changes for the configured quiet period (default: 60 seconds)
4. All working state checks pass

You can also manually create backups:

```bash
# Run the detector with an immediate backup check
./run-working-state-detector.sh backup
```

### Running the Continuous Monitor

```bash
# Start the continuous monitoring script
./run-working-state-detector.sh

# To stop the monitoring, press Ctrl+C
```

### Manually Checking Working State

```bash
# Check if the app is in a working state without creating a backup
./run-working-state-detector.sh now
```

### Restoring from a Backup

```bash
# List available backups and interactively select one to restore
./restore-from-backup.sh

# Directly restore from a specific backup ID
./restore-from-backup.sh 0  # Restore from the most recent backup
```

## How It Works

### Working State Detection

The system uses multiple comprehensive checks to ensure the UI is functioning properly:

1. **Development Server Check**: Verifies the local dev server is running by making HTTP requests
2. **Critical Files Check**: Ensures all critical UI components exist and are not empty
3. **Runtime Error Check**: Validates the UI can be loaded without runtime errors
4. **Critical State Check**: Examines the DOM structure to verify state is properly initialized
5. **Route Validation**: Tests each critical route to ensure they load without errors

All checks must pass for the UI to be considered in a "working state". Results of each check are logged for diagnostic purposes.

### Backup Creation

When a working state is detected:

1. A timestamped backup directory is created
2. Critical UI components are copied to the backup directory
3. A backup-info.json file is created with metadata including file sizes and backup stats
4. The following key files are backed up:
   - src/App.jsx
   - src/components/navigation/GlobalHeader.jsx
   - src/components/Header.jsx
   - src/components/Sidebar.jsx
   - src/services/notificationService.js
   - src/components/FeatureCard.jsx
   - src/components/activity/ActivityFeed.jsx
   - src/components/docs/DocumentViewer.jsx
   - src/main.jsx
   - src/index.css
   - vite.config.js

### Restoration Process

When restoring from a backup:

1. A safety backup of the current state is created first
2. All components from the selected backup are restored
3. Full information about the restoration is provided
4. Instructions for undoing the restoration are shown

## Customization

To modify which files are backed up, edit the `criticalFiles` array in `tools/working-state-detector.js`.

To change the quiet period duration or checking interval, modify the `QUIET_PERIOD` and `INTERVAL` variables in `run-working-state-detector.sh`.

## Reliability Features

The system includes several safeguards to ensure reliable operation:

1. **Lock File System**: Prevents multiple instances from running simultaneously
2. **Health Check File**: Maintains status information for monitoring
3. **Disk Space Checking**: Ensures sufficient disk space before creating backups
4. **Timeout Protection**: Prevents hangs during HTTP requests
5. **Error Recovery**: Gracefully handles failures and provides diagnostics
6. **Automatic Cleanup**: Removes old backups to conserve disk space (keeps last 10 by default)
7. **Command-Line Status**: Simple command to check detector status

## Commands and Monitoring

```bash
# Start continuous monitoring (recommended way)
./run-working-state-detector.sh

# Check detector status
./run-working-state-detector.sh status

# Run immediate check without creating backup
./run-working-state-detector.sh check

# Create a backup if in working state
./run-working-state-detector.sh backup

# Clean up old backups
./run-working-state-detector.sh clean

# Stop the detector
./run-working-state-detector.sh stop
```

## Troubleshooting

Detailed logs are generated in:
- `logs/working-state-detector.log`

If you need to restore but backups aren't being created:
1. Make sure the development server is running
2. Check status: `./run-working-state-detector.sh status`
3. Run manual checks: `./run-working-state-detector.sh check`
4. Fix any issues detected in the check output
5. Create a manual backup: `./run-working-state-detector.sh backup`

If the detector stops responding:
1. Stop it: `./run-working-state-detector.sh stop`
2. Check the logs for errors
3. Restart it: `./run-working-state-detector.sh`