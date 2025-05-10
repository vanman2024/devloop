# UI Safeguard System

A comprehensive solution for ensuring UI stability during development by detecting, backing up, and restoring known working UI states.

## Overview

The UI Safeguard System solves the problem of builds passing even when the app is in a broken state, which could lead to working app files being overwritten by broken ones. It provides real component testing, automatic backups, and rollback capabilities.

## Key Features

- **Working State Detection**: Validates that UI components render correctly before accepting a build
- **Automatic Backups**: Creates timestamped backups of UI code when it's in a working state
- **Component Testing**: Tests actual rendering of components in a headless browser
- **Restoration Capability**: Can restore to a known working state when issues are detected
- **HMR Compatibility**: Designed to work alongside Vite's Hot Module Replacement without interference
- **Build Validation**: Validates builds and can prevent broken code from being deployed

## Getting Started

### Using the Standalone Safeguard Tool

The standalone tool can be used directly from the command line:

```bash
# Check if app is in a working state
node scripts/unified-ui-safeguard.js check

# Create a backup of the current state
node scripts/unified-ui-safeguard.js backup

# Restore from latest backup (or specify backup name)
node scripts/unified-ui-safeguard.js restore [backup-name]

# List available backups
node scripts/unified-ui-safeguard.js list

# Run component verification tests
node scripts/unified-ui-safeguard.js verify

# Clean up old backups
node scripts/unified-ui-safeguard.js clean
```

### Integrating with Vite

Add the safeguard plugin to your Vite configuration:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import uiSafeguardPlugin from './scripts/vite-plugin-ui-safeguard-unified';

export default defineConfig({
  plugins: [
    reactRefresh(),
    uiSafeguardPlugin({
      // Options (all optional)
      verifyBeforeBuild: true,
      verifyAfterBuild: true,
      backupAfterBuild: true,
      autoRollback: false,
      showPanel: true,
      browserNotifications: true,
      hmr: {
        nonBlocking: true,
        throttleMs: 5000,
        excludePattern: /node_modules|\.css$/
      }
    })
  ]
});
```

## How It Works

### Component Testing

The system uses Puppeteer to launch a headless browser that tests if components render correctly:

1. Generates a test HTML file for each component
2. Renders the component in the test environment
3. Captures any JS errors, rendering issues, or other problems
4. Takes screenshots for visual verification
5. Reports pass/fail status

### Working State Detection

A build is considered "working" when:

1. All critical files exist and have content
2. The development server is running and responding
3. Critical components render without errors
4. UI structure appears valid
5. No runtime errors are detected

### Backup System

When the app is in a verified working state:

1. Creates a timestamped backup directory
2. Copies critical UI files to the backup
3. Creates metadata with timestamp and file information
4. Manages a rotation of backups to conserve disk space

### HMR Compatibility

The plugin is designed to be non-invasive to Vite's HMR:

1. Uses non-blocking asynchronous operations
2. Throttles checks to prevent excessive resource usage
3. Uses microtasks and background processing
4. Only runs intensive verification in production builds
5. Excludes irrelevant files like CSS changes and node_modules

## Troubleshooting

- **HMR Issues**: If you experience HMR problems, check that throttling is enabled (default) and exclude patterns are appropriate
- **Failed Tests**: Examine the test screenshots in the test-results directory
- **Missing Components**: Update the criticalComponents list in the configuration
- **Performance Issues**: Increase throttleMs value in hmr configuration

## Technical Details

The unified solution combines:

1. **unified-ui-safeguard.js**: Standalone CLI tool for checking, backing up, and restoring
2. **vite-plugin-ui-safeguard-unified.js**: Vite integration plugin
3. **Headless browser testing**: Using Puppeteer for component rendering verification

All files are backed up with proper directory structure and metadata.

## Advanced Configuration

For more advanced tuning of the safeguard system, you can modify the CONFIG object in unified-ui-safeguard.js:

```javascript
const CONFIG = {
  // Base directories
  baseDir: path.resolve(__dirname, '..'),
  backupDir: path.resolve(__dirname, '../backups'),
  testOutputDir: path.resolve(__dirname, '../test-results'),
  
  // Critical components that must render correctly
  criticalComponents: [
    'App', 'GlobalHeader', 'Sidebar', /* add your own */
  ],
  
  // File paths to include in backups
  backupFiles: [
    'src/App.jsx',
    'src/main.jsx',
    /* add your own */
  ],
  
  // Add other configurations as needed
};
```