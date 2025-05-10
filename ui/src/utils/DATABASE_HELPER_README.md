# DatabaseHelper Module

The DatabaseHelper module provides a unified storage API for the Devloop UI, supporting both browser-based storage (IndexedDB/localStorage) and Node.js server-side storage using SQLite.

## Features

- 🔄 **Environment-aware**: Automatically uses the appropriate storage backend based on the runtime environment
- 🧩 **Unified API**: Consistent interface for both client and server-side code
- 💾 **Multiple storage options**: 
  - Browser: IndexedDB with localStorage fallback
  - Node.js: SQLite database
- 🔍 **Flexible queries**: Query items by ID, filter, or index
- 📊 **Memory cache**: Provides fast access to frequently used data
- 📋 **Feature tracking**: Store and retrieve feature information
- 🔗 **Dependency management**: Track relationships between features
- 📝 **Technical decisions**: Record architectural and implementation decisions
- 📌 **Session context**: Maintain state between development sessions

## Installation

### Prerequisites

For Node.js SQLite support, you need to install the `better-sqlite3` package:

```bash
npm install better-sqlite3 --save
```

### Data Directory

When using SQLite, the database file will be stored in the `data` directory. Make sure this directory exists:

```bash
mkdir -p data
```

## Usage Examples

### Feature Management

```javascript
import { storeFeature, getFeature, getFeaturesByStatus, getFeaturesByModule } from './utils/DatabaseHelper';

// Store a feature
const feature = {
  id: 'feature-5001',
  name: 'Workflow Engine Core',
  type: 'feature',
  status: 'completed',
  module: 'WorkflowEngine',
  description: 'Core workflow execution engine with event-driven architecture',
  dependencies: ['Redis', 'MongoDB', 'EventEmitter'],
  implementation: 'Multi-tier memory architecture'
};

await storeFeature(feature);

// Get a feature by ID
const retrievedFeature = await getFeature('feature-5001');

// Get features by status
const notStartedFeatures = await getFeaturesByStatus('not_started');

// Get features by module
const workflowFeatures = await getFeaturesByModule('WorkflowEngine');
```

### Dependency Management

```javascript
import { storeDependency, getDependenciesForFeature, getDependantsForFeature } from './utils/DatabaseHelper';

// Store a dependency between features
const dependency = {
  id: 'dep-1',
  sourceId: 'feature-5001',
  targetId: 'feature-5009',
  type: 'required',
  strength: 'high',
  description: 'Visualization requires workflow execution data'
};

await storeDependency(dependency);

// Get all dependencies for a feature
const dependencies = await getDependenciesForFeature('feature-5001');

// Get all features that depend on a feature
const dependants = await getDependantsForFeature('feature-5001');
```

### Technical Decision Management

```javascript
import { storeDecision, getDecision, getDecisionsByCategory } from './utils/DatabaseHelper';

// Store a technical decision
const decision = {
  id: 'decision-1',
  title: 'Multi-tier Memory Architecture',
  category: 'architecture',
  description: 'Use Redis for immediate storage, MongoDB for persistence, and Neo4j for graph relationships',
  rationale: 'Optimizes for both performance and complex relationship queries',
  alternatives: [
    'Single database approach',
    'File-based storage',
    'In-memory only'
  ]
};

await storeDecision(decision);

// Get a decision by ID
const retrievedDecision = await getDecision('decision-1');

// Get decisions by category
const architectureDecisions = await getDecisionsByCategory('architecture');
```

### Session Context Management

```javascript
import { saveContext, getContext, getCategoryContext, deleteContext } from './utils/DatabaseHelper';

// Save context values
await saveContext('session', 'last_viewed_feature', 'feature-5001');
await saveContext('ui', 'theme', 'dark');

// Get a specific context value
const lastViewedFeature = await getContext('session', 'last_viewed_feature');

// Get all context values for a category
const uiContext = await getCategoryContext('ui');

// Delete a context value
await deleteContext('ui', 'theme');
```

## Integration with UI Components

You can use the DatabaseHelper in your React components to maintain state between sessions:

```jsx
import React, { useEffect, useState } from 'react';
import { getContext, saveContext } from '../utils/DatabaseHelper';

function FeatureManager() {
  const [activeFeature, setActiveFeature] = useState(null);
  
  // Load last active feature on component mount
  useEffect(() => {
    async function loadContext() {
      const lastFeatureId = await getContext('featureManager', 'activeFeature');
      if (lastFeatureId) {
        const feature = await getFeature(lastFeatureId);
        setActiveFeature(feature);
      }
    }
    
    loadContext();
  }, []);
  
  // Save active feature whenever it changes
  useEffect(() => {
    if (activeFeature) {
      saveContext('featureManager', 'activeFeature', activeFeature.id);
    }
  }, [activeFeature]);
  
  // Rest of component...
}
```

## Testing

You can run the provided test script to verify functionality:

```bash
node scripts/test-sqlite-db.js
```

## Caveats

1. **Environment Detection**: The module uses feature detection to determine if it's running in Node.js or a browser environment. This should work in most cases but might need adjustment for certain environments.

2. **Module Type**: If you're using ES modules in Node.js, you'll need to use dynamic import for better-sqlite3:
   ```javascript
   const sqlite3 = await import('better-sqlite3');
   ```

3. **Migration**: There's currently no built-in migration system. Schema changes require careful handling.