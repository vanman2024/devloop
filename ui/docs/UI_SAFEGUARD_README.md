# UI Safeguard System

A comprehensive snapshot, rollback, and testing system for the Devloop UI components.

## Overview

The UI Safeguard System protects against UI component breakage during development by providing:

1. **Automated snapshots** of UI components
2. **One-click rollbacks** to known good states
3. **Component verification** to detect issues early
4. **Intelligent storage management** to optimize disk usage
5. **Component testing** to verify rendering functionality
6. **Development server integration** via Vite plugin
7. **React component integration** for in-app restoration

The system uses a combination of Python agents and JavaScript utilities to provide comprehensive protection against UI regressions. It integrates deeply with the Vite development environment for seamless developer experience.

## Quick Start

```bash
# Enable or disable the UI Safeguard system
cd /mnt/c/Users/angel/Devloop
./ui-safeguard-link.sh enable   # Enable UI Safeguard
./ui-safeguard-link.sh disable  # Disable UI Safeguard

# Start UI with different safeguard options
./start-ui.sh --snapshot        # Take snapshot before starting
./start-ui.sh --verify          # Verify components at startup
./start-ui.sh --monitor         # Run background monitoring
./start-ui.sh --interval 15     # Set monitoring interval (minutes)
./start-ui.sh --no-safeguard    # Disable safeguard for this session

# NPM commands from the react-app directory
cd /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app

# Take a snapshot of all UI components
npm run ui-safeguard:snapshot

# Take a snapshot of a specific component
npm run ui-safeguard:snapshot system-health

# Restore from a snapshot
npm run ui-safeguard:restore snapshot_20250501_123045

# Check UI component status
npm run ui-safeguard:status

# Test UI components
npm run ui-safeguard:test

# Start interactive mode
npm run ui-safeguard
```

## Integration with Development Process

The UI Safeguard System is designed to be a seamless part of your development workflow:

1. **Vite Plugin Integration**: Automatically takes snapshots during development
2. **Browser UI**: Shows status and provides snapshot/restore functionality in the browser
3. **NPM Commands**: Easy-to-use npm script commands
4. **CLI Tool**: Interactive command-line interface

## Key Components

### UI Safeguard Agent

The core agent in `/mnt/c/Users/angel/Devloop/agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py` provides:

- Component-based snapshot management
- File integrity verification
- Status reporting
- Continuous monitoring

**Direct Command Examples**:
```bash
# From the project root
cd /mnt/c/Users/angel/Devloop

# Take a snapshot
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py snapshot all
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py snapshot system-health

# Restore from a snapshot
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py restore snapshot_20250501_123045

# List available snapshots
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py list

# Check component status
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py status

# Start monitoring
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py monitor --interval 15

# Show help
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py --help
```

### Storage Manager

The storage manager in `/mnt/c/Users/angel/Devloop/agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py` implements:

- Incremental snapshots
- File deduplication
- Automatic compression
- Storage rotation policies

**Direct Command Examples**:
```bash
# From the project root
cd /mnt/c/Users/angel/Devloop

# Show storage statistics
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py stats

# Clean up storage
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py cleanup

# Configure storage options
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py config --max-size 2000 --max-snapshots 100

# Store a snapshot (advanced)
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py store snapshot_ID

# Show help
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py --help
```

### CLI Tool

The CLI tool in `/mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/scripts/ui-safeguard-cli.js` provides:

- User-friendly command-line interface
- Interactive mode
- Colorized output
- Quick access to all functionality

**Direct Command Examples**:
```bash
# From the react-app directory
cd /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app

# Run CLI directly (alternative to npm scripts)
node scripts/ui-safeguard-cli.js snapshot
node scripts/ui-safeguard-cli.js list
node scripts/ui-safeguard-cli.js interactive
```

### UI Component Testing

The test runner in `/mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/scripts/ui-test-runner.js` validates:

- Component rendering functionality
- Interface integrity
- Visual appearance
- Dependency correctness

**Direct Command Examples**:
```bash
# From the react-app directory
cd /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app

# Run test runner directly
node scripts/ui-test-runner.js all
node scripts/ui-test-runner.js system-health
node scripts/ui-test-runner.js specific:src/components/health/StructureValidation.jsx
```

### Vite Plugin

The Vite plugin in `/mnt/c/Users/angel/Devloop/system-core/ui-system/react-app/scripts/vite-plugin-ui-safeguard.js` enables:

- Automatic snapshots during development
- Browser notifications for issues
- In-browser UI for management
- Real-time component status

## Usage Guides

### Taking Snapshots

```bash
# Take a snapshot of all components
npm run ui-safeguard:snapshot

# Take a snapshot with description
npm run ui-safeguard:snapshot -- --description "Before major refactoring"

# Take a snapshot of a specific component
npm run ui-safeguard:snapshot system-health
```

### Restoring from Snapshots

```bash
# List available snapshots
npm run ui-safeguard:list

# Restore from a specific snapshot
npm run ui-safeguard:restore snapshot_20250501_123045
```

### Verifying Components

```bash
# Verify against the latest snapshot
npm run ui-safeguard:verify

# Verify against a specific snapshot
npm run ui-safeguard:verify snapshot_20250501_123045
```

### Testing Components

```bash
# Test all components
npm run ui-safeguard:test

# Test a specific component category
npm run ui-safeguard:test system-health

# Test a specific component file
npm run test-ui-component specific:src/components/health/StructureValidation.jsx
```

### Visual UI Snapshots

The UI Safeguard system captures visual snapshots of component rendering:

```bash
# Run component tests (which capture screenshots)
npm run ui-safeguard:test

# View the screenshot results
ls -la test-results/*.png

# Compare visual differences between snapshots
node scripts/ui-test-runner.js --compare snapshot_ID1 snapshot_ID2

# Take a new visual benchmark snapshot
npm run ui-safeguard:snapshot -- --description "Visual UI benchmark"
npm run ui-safeguard:test  # Generate screenshots
```

The screenshots are stored in the `test-results` directory with filenames matching the components, allowing visual inspection of UI state at different points in time.

### Storage Management

```bash
# View storage statistics
npm run ui-safeguard:storage

# Check component status
npm run ui-safeguard:status
```

### Continuous Monitoring

```bash
# Start monitoring with default interval (60 minutes)
npm run ui-safeguard:monitor

# Start monitoring with custom interval (15 minutes)
npm run ui-safeguard:monitor -- --interval 15
```

### Interactive Mode

```bash
# Launch the interactive console
npm run ui-safeguard
```

## Vite Plugin Configuration

The Vite plugin is configured in `vite.config.js` with these options:

```javascript
// Import the full implementation
import uiSafeguardPlugin from './scripts/vite-plugin-ui-safeguard.js'

export default defineConfig({
  plugins: [
    react(),
    uiSafeguardPlugin({
      enabled: true,
      snapshotOnBuild: true,
      browserNotifications: true,
      showPanel: true,
      verifyAfterBuild: true,
      autoRollback: false,  // Set to true to enable automatic rollback
      storage: {
        cleanupAfterBuild: true
      }
    })
  ],
})
```

The implementation includes:

1. **Server Middleware**: Handles API requests for snapshots and restores 
2. **Build Hooks**: Captures snapshots at key build phases
3. **HMR Integration**: Monitors for hot module replacement changes
4. **HTML Transforms**: Injects browser UI components for notifications and controls

You can adjust these settings as needed. If the full implementation causes issues, a fallback version is available that uses React components instead of the Vite plugin.

## Storage Optimization

The UI Safeguard System includes sophisticated storage optimization to keep disk usage manageable:

1. **Incremental Snapshots**: Only stores files that changed since the previous snapshot
2. **Deduplication**: Stores identical files only once across all snapshots
3. **Compression**: Automatically compresses files when beneficial
4. **Rotation Policies**: Intelligently manages snapshot retention

Default storage settings:

- Maximum storage size: 1GB
- Maximum snapshots: 50
- Maximum age: 30 days
- Exponential rotation strategy:
  - Keep all snapshots for the last 7 days
  - Keep daily snapshots for 30 days
  - Keep weekly snapshots for 12 weeks
  - Keep monthly snapshots for 12 months

## Component Test Reports

Component tests generate detailed reports in the `test-results` directory:

- HTML test pages for each component
- Screenshots of rendered components
- Test status and error information

## Best Practices

1. **Take regular snapshots** during development, especially before major changes
2. **Use component-specific snapshots** for targeted work
3. **Run component tests** after making changes to verify functionality
4. **Verify component status** regularly to detect issues
5. **Use the interactive mode** for detailed operations
6. **Review storage statistics** periodically to optimize disk usage

## Automation and Auto-Rollback

The UI Safeguard System is designed to work automatically with minimal manual intervention:

### Automatic Operation

1. **Automatic Snapshots**: Taken at key points:
   - Server startup (with `--snapshot` flag)
   - During builds (with `snapshotOnBuild: true` in vite.config.js)
   - During hot module replacement
   - At regular intervals when monitoring (with `--monitor` flag)

2. **Automatic Verification**: Performed:
   - After taking snapshots
   - After builds (with `verifyAfterBuild: true` in vite.config.js)
   - When triggered by critical events

3. **Automatic Storage Management**:
   - Deduplication of identical files
   - Compression when beneficial
   - Cleanup of old snapshots
   - Rotation based on configured policies

### Auto-Rollback Configuration

To enable automatic rollback when verification fails:

1. **Edit Vite Config**:
   ```javascript
   // In vite.config.js
   uiSafeguardPlugin({
     // ...other options
     autoRollback: true,  // Enable auto-rollback
   })
   ```

2. **Or use CLI flag**: 
   ```bash
   ./start-ui.sh --auto-rollback
   ```

## Complete Command Reference

### Root Directory Commands

```bash
# From project root
cd /mnt/c/Users/angel/Devloop

# Enable/disable UI Safeguard
./ui-safeguard-link.sh enable
./ui-safeguard-link.sh disable

# Start UI with safeguard options
./start-ui.sh --snapshot          # Take snapshot at startup
./start-ui.sh --verify            # Verify at startup
./start-ui.sh --monitor           # Run background monitoring
./start-ui.sh --interval 15       # Set monitoring interval
./start-ui.sh --auto-rollback     # Enable auto-rollback
./start-ui.sh --no-safeguard      # Disable safeguard

# Direct agent commands
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py snapshot all
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py restore <snapshot_id>
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py list
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py status
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py verify [<snapshot_id>]
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py monitor [--interval min]
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py config [options]

# Storage management commands
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py stats
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py cleanup
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py config --max-size 2000
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py store <snapshot_id>
```

### React App Directory Commands

```bash
# From React app directory
cd /mnt/c/Users/angel/Devloop/system-core/ui-system/react-app

# Using npm scripts
npm run ui-safeguard:snapshot [component] [-- --description "Text"]
npm run ui-safeguard:restore <snapshot_id>
npm run ui-safeguard:list
npm run ui-safeguard:status
npm run ui-safeguard:verify [-- <snapshot_id>]
npm run ui-safeguard:test [-- <component>]
npm run ui-safeguard:storage
npm run ui-safeguard:monitor [-- --interval 15]
npm run ui-safeguard           # Interactive mode

# Direct CLI commands
node scripts/ui-safeguard-cli.js snapshot [component] [--description "Text"]
node scripts/ui-safeguard-cli.js restore <snapshot_id>
node scripts/ui-safeguard-cli.js list
node scripts/ui-safeguard-cli.js status
node scripts/ui-safeguard-cli.js verify [snapshot_id]
node scripts/ui-safeguard-cli.js test [component]
node scripts/ui-safeguard-cli.js storage
node scripts/ui-safeguard-cli.js monitor [--interval min]
node scripts/ui-safeguard-cli.js interactive
```

## Troubleshooting

If you encounter issues:

1. **Check component status**: 
   ```bash
   npm run ui-safeguard:status
   # or
   python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py status
   ```

2. **Check snapshot status**:
   ```bash
   npm run ui-safeguard:list
   # or 
   python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py list
   ```

3. **Review test results** in the `test-results` directory:
   ```bash
   ls -la system-core/ui-system/react-app/test-results
   ```

4. **Check storage statistics**:
   ```bash
   npm run ui-safeguard:storage
   # or
   python3 agents/system-health-agent/child-agents/ui-safeguard-agent/storage_manager.py stats
   ```

5. **Restore from a known good snapshot** if needed:
   ```bash
   npm run ui-safeguard:restore <snapshot_id>
   # or
   python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py restore <snapshot_id>
   ```

6. **Run component tests** to identify specific issues:
   ```bash
   npm run ui-safeguard:test [component]
   # or
   node scripts/ui-test-runner.js [component]
   ```

## Integration with System Health Agent

The UI Safeguard System is a micro-agent within the System Health Agent ecosystem. It leverages the agent's:

- Knowledge Graph for UI component relationships
- Trigger system for coordinated operations
- Notification system for alerts
- Health metric tracking

For comprehensive documentation on the agent architecture, see:
`/mnt/c/Users/angel/Devloop/agents/system-health-agent/README.md`

## Known Issues and Workarounds

### Directory Structure Issues

**Issue**: The automatic restore functionality may sometimes fail if components are located in directories different from what the snapshot system expects.

**Workaround**: 
1. Create the expected directory structure before running the restore command
2. Use the `restore-test-component.sh` script for critical components
3. Manually copy files from the snapshot directory if needed:
   ```bash
   # Example of manual restore
   mkdir -p src/components/system-health
   cp /mnt/c/Users/angel/Devloop/agents/system-health-agent/child-agents/ui-safeguard-agent/snapshots/snapshot_ID/system-health/ComponentName.jsx src/components/system-health/
   ```

### React Component Integration

The RollbackManager React component in `src/components/RollbackManager.jsx` provides in-app functionality for:

- Tracking component state changes
- Capturing visual snapshots
- Rolling back to previous states

This component works alongside the file-based snapshot system but operates at the React state level rather than the filesystem level.

## Recent Updates

- **2025-04-30**: Updated Vite integration to use the full plugin implementation
- **2025-04-30**: Added test script for verifying safeguard functionality
- **2025-04-30**: Fixed rollback issues for components in unexpected directories
- **2025-04-30**: Improved error handling and reporting

## Future Improvements

1. Improve directory structure detection during snapshot and restore
2. Better handling of component relationships and dependencies
3. Enhanced visual diffing between snapshots
4. Seamless integration between React state rollbacks and file system rollbacks