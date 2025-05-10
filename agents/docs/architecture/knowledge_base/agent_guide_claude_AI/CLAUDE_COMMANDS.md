# UI Server Commands

## Starting the UI

- Use `./start-ui.sh` to start the development server with hot reload enabled
- Press Ctrl+C or close the terminal to stop the server when done

## Production Mode

```bash
# Start UI in production mode (builds and serves optimized version)
./start-ui.sh --production

# Start UI server only (without API server)
./start-ui.sh --ui-only

# Start API server only
./start-ui.sh --api-only

# Specify API port
./start-ui.sh --port 3001
```

## UI Safeguard System

The UI Safeguard system provides protection for UI components with automatic snapshots, rollbacks, and testing:

```bash
# Enable or disable the UI Safeguard system
./ui-safeguard-link.sh enable   # Enable UI Safeguard
./ui-safeguard-link.sh disable  # Disable UI Safeguard

# Start UI with different safeguard options
./start-ui.sh --snapshot        # Take snapshot before starting
./start-ui.sh --verify          # Verify components at startup
./start-ui.sh --monitor         # Run background monitoring
./start-ui.sh --interval 15     # Set monitoring interval (minutes)
./start-ui.sh --no-safeguard    # Disable safeguard for this session
./start-ui.sh --auto-rollback   # Enable automatic rollback on failure
```

## Component Snapshots

```bash
# From project root
cd /mnt/c/Users/angel/Devloop

# Using Python agent directly
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py snapshot all
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py snapshot system-health

# From the React app directory
cd system-core/ui-system/react-app

# Using npm scripts
npm run ui-safeguard:snapshot
npm run ui-safeguard:snapshot -- --description "Before major refactoring"
npm run ui-safeguard:snapshot system-health

# Using CLI directly
node scripts/ui-safeguard-cli.js snapshot
node scripts/ui-safeguard-cli.js snapshot system-health --description "Important checkpoint"
```

## Component Restore

```bash
# From project root
cd /mnt/c/Users/angel/Devloop

# Using Python agent directly
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py list
python3 agents/system-health-agent/child-agents/ui-safeguard-agent/agent.py restore snapshot_20250501_123045

# From the React app directory
cd system-core/ui-system/react-app

# Using npm scripts
npm run ui-safeguard:list
npm run ui-safeguard:restore snapshot_20250501_123045

# Using CLI directly
node scripts/ui-safeguard-cli.js list
node scripts/ui-safeguard-cli.js restore snapshot_20250501_123045
```

## Component Testing and Verification

```bash
# From the React app directory
cd system-core/ui-system/react-app

# Test components
npm run ui-safeguard:test
npm run ui-safeguard:test system-health
npm run test-ui-component specific:src/components/health/StructureValidation.jsx

# Verify against snapshots
npm run ui-safeguard:verify
npm run ui-safeguard:verify snapshot_20250501_123045

# Check component status
npm run ui-safeguard:status

# View storage statistics
npm run ui-safeguard:storage
```

## Interactive Mode

```bash
# Launch the interactive console
cd system-core/ui-system/react-app
npm run ui-safeguard

# Or use CLI directly
node scripts/ui-safeguard-cli.js interactive
```