# Devloop API and Frontend Integration

This document outlines the new Python-based API approach for Devloop, designed to facilitate the transition to a database backend and React frontend.

## Overview

The new API architecture consists of three main components:

1. **Unified Python API** (`devloop_api.py`) - Core functionality wrapper around shell scripts
2. **REST API Server** (`devloop_rest_api.py`) - HTTP API for React frontend integration
3. **Launcher Script** (`launch-api-server.sh`) - Convenience script to start the API server

This approach provides a clean separation of concerns:

- **Core API** handles the business logic and interfacing with the underlying system
- **REST API** provides HTTP endpoints for frontend communication
- **Future database integration** will replace file-based operations with database queries

## Getting Started

### Launch the API Server

```bash
# Start the API server on the default port (8080)
./system-core/scripts/devloop/launch-api-server.sh

# Start on a specific port with debug mode
./system-core/scripts/devloop/launch-api-server.sh --port=3000 --debug
```

### Access the API

Once running, the API is available at:

- API Documentation: `http://localhost:8080/`
- Dashboard: `http://localhost:8080/dashboard`
- API Endpoints: `http://localhost:8080/api/...`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Get overall project status |
| `/api/milestones` | GET | List all milestones |
| `/api/milestones` | POST | Initialize a new milestone |
| `/api/features` | GET | List features with optional filters |
| `/api/features/{id}` | GET | Get details for a specific feature |
| `/api/features/{id}/run` | POST | Run a feature |
| `/api/features/{id}/status` | PUT | Update feature status |
| `/api/search?q={query}` | GET | Search for features |
| `/api/reports` | POST | Generate progress reports |
| `/api/dashboard` | GET | Get data for dashboard |

## Using the Python API Directly

You can also use the Python API directly in your scripts:

```python
import sys
sys.path.append('/path/to/system-core/scripts/devloop')
import devloop_api as dl

# Get project status
status = dl.get_project_status()

# Run a feature
result = dl.run_feature("feature-123-example", skip_tests=True)

# Update feature status
dl.update_feature_status("feature-123-example", "completed")
```

## Path to Database Integration

The current implementation uses the filesystem and JSON files as its data store, but is designed for easy migration to a database:

1. **Current Phase**: Filesystem/JSON storage with Python API wrapper
2. **Intermediate Phase**: Add SQLite database as a local cache
3. **Future Phase**: Migrate to a proper database (PostgreSQL/MySQL)

When implementing the database, only the data access methods in `devloop_api.py` need to be modified - the REST API and clients will continue to work without changes.

## Developing a React Frontend

The REST API is designed to support a React frontend. Key considerations:

1. Use the `/api/dashboard` endpoint to get complete data for the main dashboard
2. Implement real-time updates with polling or WebSockets
3. Create a feature detail view using `/api/features/{id}`
4. Implement search functionality using `/api/search`

### Example React Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    axios.get('http://localhost:8080/api/dashboard')
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
      <h1>Devloop Dashboard</h1>
      {/* Render dashboard with data */}
    </div>
  );
}

export default Dashboard;
```

## Next Steps

1. **Add Authentication** - Implement user authentication for the API
2. **Implement SQLite Cache** - Add a local database cache for improved performance
3. **Create React Frontend** - Build the React frontend UI
4. **Add Real-time Updates** - Implement WebSockets for live updates
5. **Migrate to Full Database** - Replace filesystem storage with a proper database

---

*Documentation created as part of the script consolidation and modernization effort.*