# System Health Dashboard Components

This directory contains components for the System Health Dashboard, enabling monitoring and maintenance of the Devloop system.

## Key Components

- **StructureValidation**: Validates file structure and script organization
- **RoadmapStatusTracker**: Monitors roadmap component statuses across the system
- **SystemValidation**: Parent component providing validation tabs
- **KnowledgeGraphConnector**: Connects UI to the Knowledge Graph system

## Integration

The health components integrate with the system through:

1. **Knowledge Graph**: Centralized system for tracking relationships
2. **Trigger System**: Communication mechanism with agents
3. **Fallback Mechanisms**: Local implementations for when backend is unavailable

## Component Architecture

```
SystemHealth (page)
├── TriggerProvider (context)
│   ├── SystemValidation (tabs container)
│   │   ├── StructureValidation (validates file structure)
│   │   ├── DependenciesValidation (validates dependencies)
│   │   ├── MemoryValidationMonitor (validates memory)
│   │   └── TestPassRate (validates tests)
│   ├── RoadmapStatusTracker (tracks roadmap components)
│   └── Other health dashboard components...
```

## Usage

The health components can be used individually or as part of the System Health page:

```jsx
// Import components
import { SystemValidation, RoadmapStatusTracker, TriggerProvider } from '../components/health';

// Use with TriggerProvider for full functionality
const MyComponent = () => (
  <TriggerProvider>
    <SystemValidation />
    <RoadmapStatusTracker />
  </TriggerProvider>
);
```

## Structure Validation Component

The StructureValidation component provides a comprehensive view of file structure validation across the Devloop system, including feature organization and script management.

### Key Features

- **Unified File Structure Validation**: Displays both feature structure issues and script organization in a single cohesive interface
- **Agent Integration**: Connects with the File Organization Agent to provide real-time script validation and fixes
- **Roadmap Impact Analysis**: Shows how file structure issues affect the roadmap items
- **Interactive Issue Resolution**: Provides detailed views and one-click fixes for structure issues
- **Health Scoring**: Calculates and displays system structure health scores

### Basic Usage

```jsx
import { StructureValidationWithTriggers } from '../components/health';

function SystemHealthPage() {
  return (
    <div className="health-page">
      <h1>System Health</h1>
      <div className="health-components">
        <StructureValidationWithTriggers />
      </div>
    </div>
  );
}
```

## Roadmap Status Tracker

The RoadmapStatusTracker component provides a comprehensive view of roadmap component statuses across the entire system.

### Key Features

- **System Health Overview**: Displays overall system health score and status
- **Component Summary**: Shows counts of different component types and their statuses
- **Milestone Status**: Lists active milestones with their feature completion status
- **Real-time Updates**: When connected to Knowledge Graph, receives status updates in real-time

## Troubleshooting

If the System Health page isn't loading:

1. Check console for errors
2. Ensure TriggerProvider is wrapping components that use the useTrigger hook
3. Verify KnowledgeGraphConnector is properly configured
4. Check that required components are exported from the health/index.js file

## Initialization

The health components automatically initialize when imported and establish:

- Global dashboard object for component registration
- Event listeners for component updates
- Integration with Knowledge Graph and agent systems when available

## Component Registration

Components can register with the global dashboard object:

```js
if (window.systemHealthDashboard) {
  window.systemHealthDashboard.registerComponent('my-component', componentInstance);
}
```

This enables cross-component communication and system-wide updates.

## Fallback Behavior

If the Knowledge Graph or its agents are not available, components will:

1. Use mock data for validation and status
2. Simulate operations with UI updates
3. Log warnings about missing systems

This ensures the dashboard remains functional even when backend systems are unavailable.

## Rollback

If needed, a backup of the original implementation is available in:
`/mnt/c/Users/angel/Devloop/backups/structure-validation-backup/`

To restore:
```bash
/mnt/c/Users/angel/Devloop/backups/structure-validation-backup/restore.sh
```