# Devloop API Documentation

This document provides a comprehensive overview of all API endpoints available in the Devloop system.

## API Architecture

The Devloop system uses a consistent Express.js-based architecture for all APIs, following design principle #6: "Only use Express architecture for now, no Flask API". While some Python helper modules exist, all API endpoints are exposed through Express.js servers for consistency.

There are two main approaches used in the Devloop API architecture:

1. **Native Express.js APIs**: Implemented directly in Node.js with Express (e.g., the Memory API server and Diagnostic server)
   
2. **Python-backed Express.js APIs**: Python modules provide the core functionality, which is then wrapped and exposed through Express.js for consistency (e.g., Core REST API and Component Removal API)

This hybrid approach allows us to leverage Python's flexibility for complex operations while maintaining a consistent Express.js interface for all APIs.

## Table of Contents

1. [Core REST API](#core-rest-api)
2. [Memory API](#memory-api) 
3. [Knowledge Graph API](#knowledge-graph-api)
4. [Component Removal API](#component-removal-api)
5. [Diagnostic API](#diagnostic-api)
6. [Authentication](#authentication)
7. [Testing the APIs](#testing-the-apis)
8. [Getting Started](#getting-started)
9. [Error Handling](#error-handling)

## Core REST API

**Base URL**: `http://localhost:8080/api`  
**Server**: Express.js (Node.js)  
**Source File**: `/system-core/scripts/devloop/devloop_rest_api.py` (implemented with Express.js wrapper)  
**Launch Command**: `./system-core/scripts/devloop/launch-api-server.sh`

### Project Status

#### Get Project Status
```
GET /status
```

Returns the overall status of the Devloop project.

**Example Response:**
```json
{
  "status": "active",
  "milestones": 12,
  "active_phases": 4,
  "completed_features": 89,
  "in_progress_features": 23,
  "health": "good"
}
```

### Milestones

#### Get All Milestones
```
GET /milestones
```

Returns a list of all milestones in the project.

**Optional Query Parameters:**
- `status` - Filter by status (e.g., `?status=active`)

#### Create Milestone
```
POST /milestones
```

Creates a new milestone.

**Request Body:**
```json
{
  "id": "milestone-api-testing",
  "name": "API Testing System",
  "description": "Comprehensive API testing framework",
  "phases": 3
}
```

### Features

#### Get All Features
```
GET /features
```

Returns a list of all features in the project.

**Optional Query Parameters:**
- `status` - Filter by status (e.g., `?status=in-progress`)
- `milestone` - Filter by milestone (e.g., `?milestone=milestone-ui-dashboard`)
- `phase` - Filter by phase (e.g., `?phase=phase-01`)

#### Get Specific Feature
```
GET /features/{id}
```

Returns details for a specific feature.

#### Run Feature
```
POST /features/{id}/run
```

Runs a specific feature.

**Optional Request Body:**
```json
{
  "skip_tests": true,
  "log_level": "debug"
}
```

#### Update Feature Status
```
PUT /features/{id}/status
```

Updates the status of a specific feature.

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Feature completed successfully with all tests passing"
}
```

### Search

#### Search Features
```
GET /search?q={query}
```

Searches for features matching the given query.

### Reports

#### Generate Reports
```
POST /reports
```

Generates project progress reports.

**Request Body:**
```json
{
  "format": "html",
  "include_details": true,
  "milestone": "milestone-ui-dashboard"
}
```

### Dashboard

#### Get Dashboard Data
```
GET /dashboard
```

Returns data for the project dashboard.

### AI Document Generation

#### Generate Document
```
POST /documents/generate-content
```

Generates content for a document using AI.

**Request Body:**
```json
{
  "template": "feature_implementation",
  "parameters": {
    "feature_name": "API Documentation",
    "description": "Comprehensive API documentation system"
  }
}
```

## Memory API

**Base URL**: `http://localhost:8000/api/memory`  
**Server**: Express.js (Node.js)  
**Source File**: `/system-core/memory/manager/memory_api_server.js`  
**Launch Command**: `./system-core/memory/manager/launch-memory-api.sh`

### Status

#### Get Memory API Status
```
GET /status
```

Returns the status of the memory system.

### Project Structure

#### Get Project Structure
```
GET /project-structure
```

Returns the project structure from memory.

### System Health

#### Get System Health
```
GET /system-health
```

Returns the system health status.

### Registry

#### Get Registry
```
GET /registry
```

Returns the feature registry.

### Memory Queries

#### Query Memory
```
GET /query?path={json_path}
```

Queries the memory system using a JSON path.

#### Update Memory Value
```
PUT /value
```

Updates a value in the memory system.

**Request Body:**
```json
{
  "path": "features.feature-1234.status",
  "value": "completed"
}
```

### File Operations

#### Get Files
```
GET /files?directory={directory_path}
```

Returns files in the specified directory.

#### Get File
```
GET /file/:filePath
```

Returns the content of a specific file.

#### Update File
```
PUT /file/:filePath
```

Updates the content of a specific file.

**Request Body:**
```json
{
  "content": "New file content here"
}
```

### Schema

#### Get Memory Schema
```
GET /schema
```

Returns the memory schema.

### Search

#### Search Memory
```
GET /search?q={query}
```

Searches the memory system for the given query.

### Templates

#### Get Templates
```
GET /templates
```

Returns available templates.

## Knowledge Graph API

**Base URL**: `http://localhost:8001/api/graph`  
**Server**: Express.js (Node.js)  
**Source File**: `/system-core/memory/manager/memory_api_server.js`  
**Launch Command**: `./system-core/memory/manager/launch-memory-api.sh`

### Status

#### Get Knowledge Graph Status
```
GET /status
```

Returns information about the Knowledge Graph, including whether it's enabled, node and edge counts, and type distributions.

### Node Endpoints

#### Get All Nodes
```
GET /nodes
```

Returns all nodes in the Knowledge Graph.

**Optional Query Parameters:**
- `type` - Filter by node type (e.g., `?type=milestone`)
- `limit` - Limit the number of results (e.g., `?limit=10`)
- `offset` - Paginate results (e.g., `?offset=10&limit=10`)

#### Get a Specific Node
```
GET /node/:id
```

Returns a specific node by its ID.

#### Add a Node
```
POST /node
```

Adds a new node to the Knowledge Graph.

**Request Body:**
```json
{
  "node_id": "test-node-001",
  "node_type": "test",
  "properties": {
    "name": "Test Node",
    "description": "A test node for Knowledge Graph testing"
  },
  "metadata": {}
}
```

#### Update a Node
```
PUT /node/:id
```

Updates a node in the Knowledge Graph.

**Request Body:**
```json
{
  "properties": {
    "name": "Updated Test Node",
    "description": "Updated description"
  },
  "metadata": {
    "updated_by": "user1"
  }
}
```

#### Delete a Node
```
DELETE /node/:id
```

Deletes a node from the Knowledge Graph.

**Optional Query Parameters:**
- `remove_edges` - Whether to also remove connected edges (default: false)

### Edge Endpoints

#### Get All Edges
```
GET /edges
```

Returns all edges in the Knowledge Graph.

**Optional Query Parameters:**
- `type` - Filter by edge type (e.g., `?type=milestone_contains_phase`)
- `source` - Filter by source node ID (e.g., `?source=milestone-ui-dashboard`)
- `target` - Filter by target node ID (e.g., `?target=phase-01`)
- `limit` - Limit the number of results (e.g., `?limit=10`)
- `offset` - Paginate results (e.g., `?offset=10&limit=10`)

#### Get a Specific Edge
```
GET /edge/:id
```

Returns a specific edge by its ID.

#### Add an Edge
```
POST /edge
```

Adds a new edge to the Knowledge Graph.

**Request Body:**
```json
{
  "edge_type": "test_connection",
  "source_id": "test-node-001",
  "target_id": "milestone-ui-dashboard",
  "properties": {
    "description": "A test connection",
    "strength": "strong"
  }
}
```

#### Update an Edge
```
PUT /edge/:id
```

Updates an edge in the Knowledge Graph.

**Request Body:**
```json
{
  "properties": {
    "description": "Updated connection description",
    "strength": "medium"
  }
}
```

#### Delete an Edge
```
DELETE /edge/:id
```

Deletes an edge from the Knowledge Graph.

### Relationship Endpoints

#### Get Node Neighbors
```
GET /neighbors/:id
```

Returns all nodes connected to the specified node.

**Optional Query Parameters:**
- `direction` - Filter by connection direction (incoming, outgoing, or both, default: both)
- `edge_type` - Filter by edge type (e.g., `?edge_type=milestone_contains_phase`)
- `node_type` - Filter by neighbor node type (e.g., `?node_type=phase`)

#### Find Path Between Nodes
```
GET /path
```

Finds a path between two nodes in the Knowledge Graph.

**Query Parameters:**
- `start` - ID of the starting node (required)
- `end` - ID of the ending node (required)
- `max_depth` - Maximum path depth (default: 5)

### Conversion Endpoints

#### Convert Project Structure to Knowledge Graph
```
POST /convert
```

Converts a filesystem-based project structure to a Knowledge Graph.

**Request Body:**
```json
{
  "structure_file": "/mnt/c/Users/angel/Devloop/structure/project-structure-template.json"
}
```

### Visualization Endpoints

#### Get Graph Visualization
```
GET /visualization
```

Returns a visualization of the Knowledge Graph.

**Query Parameters:**
- `format` - Output format (json or dot, default: json)
- `filter_node_type` - Filter by node type (e.g., `?filter_node_type=milestone`)
- `filter_edge_type` - Filter by edge type (e.g., `?filter_edge_type=milestone_contains_phase`)
- `max_nodes` - Maximum number of nodes to include (default: 100)

## Component Removal API

**Base URL**: `http://localhost:5000/api/v1/components`  
**Server**: Express.js (Node.js)  
**Source File**: `/system-core/scripts/devloop/component_removal_api.py` (implemented with Express.js wrapper)  
**Launch Command**: `./system-core/scripts/devloop/launch-component-removal-api.sh`

### Analysis Endpoints

#### Analyze Milestone Removal
```
POST /milestone/analyze
```

Analyzes the impact of removing a milestone.

**Request Body:**
```json
{
  "milestone_id": "milestone-test-milestone"
}
```

#### Analyze Phase Removal
```
POST /phase/analyze
```

Analyzes the impact of removing a phase.

**Request Body:**
```json
{
  "milestone_id": "milestone-core-foundation",
  "phase_id": "phase-02"
}
```

#### Analyze Module Removal
```
POST /module/analyze
```

Analyzes the impact of removing a module.

**Request Body:**
```json
{
  "milestone_id": "milestone-core-foundation",
  "phase_id": "phase-02",
  "module_id": "module-logging"
}
```

#### Analyze Feature Removal
```
POST /feature/analyze
```

Analyzes the impact of removing a feature.

**Request Body:**
```json
{
  "milestone_id": "milestone-core-foundation",
  "phase_id": "phase-02",
  "module_id": "module-logging",
  "feature_id": "feature-101-log-json"
}
```

### Removal Endpoints

#### Remove Milestone
```
POST /milestone/remove
```

Removes a milestone.

**Request Body:**
```json
{
  "milestone_id": "milestone-test-milestone",
  "create_backup": true
}
```

#### Remove Phase
```
POST /phase/remove
```

Removes a phase.

**Request Body:**
```json
{
  "milestone_id": "milestone-core-foundation",
  "phase_id": "phase-02",
  "create_backup": true
}
```

#### Remove Module
```
POST /module/remove
```

Removes a module.

**Request Body:**
```json
{
  "milestone_id": "milestone-core-foundation",
  "phase_id": "phase-02",
  "module_id": "module-logging",
  "create_backup": true
}
```

#### Remove Feature
```
POST /feature/remove
```

Removes a feature.

**Request Body:**
```json
{
  "milestone_id": "milestone-core-foundation",
  "phase_id": "phase-02",
  "module_id": "module-logging",
  "feature_id": "feature-101-log-json",
  "create_backup": true
}
```

### Backup Endpoints

#### List Backups
```
GET /backups
```

Lists all available backups.

#### Restore Backup
```
POST /backups/restore
```

Restores a component from a backup.

**Request Body:**
```json
{
  "backup_path": "/mnt/c/Users/angel/Devloop/backups/features/milestone-core-foundation_phase-02_module-logging_feature-101-log-json_20250426"
}
```

## Diagnostic API

**Base URL**: `http://localhost:3000/api`  
**Server**: Express.js (Node.js)  
**Source File**: `/mnt/c/Users/angel/Devloop/diagnose-server.js`  
**Launch Command**: `./run-diagnostic-server.sh`

### Health Check

#### Check API Health
```
GET /health
```

Returns the health status of the diagnostic server.

### System Information

#### Get System Information
```
GET /system-info
```

Returns system information.

### Document Generation

#### Generate Document
```
POST /generate-document
```

Generates a mock document.

**Request Body:**
```json
{
  "template": "feature",
  "data": {
    "name": "Test Feature",
    "description": "A test feature"
  }
}
```

## Authentication

Currently, most APIs do not require authentication. This will change in future versions as these APIs are integrated with the authentication system.

## Testing the APIs

The Devloop system includes built-in tools for testing API endpoints to ensure they function as expected.

### Memory API Testing Tools

#### Automated CLI Test

The `test-memory-api.sh` script automates testing of Memory API endpoints:

```bash
# Run the automated test suite
./system-core/memory/manager/test-memory-api.sh
```

This script tests:
- Basic status endpoint
- Memory schema endpoints
- Project structure queries
- Feature listing
- Memory query operations
- Memory search functionality
- Backup creation

The script provides colored output showing test success/failure and displays truncated JSON responses.

#### Interactive HTML Test Client

An HTML-based test client is available for interactive testing:

```bash
# Launch the memory API server first
./system-core/memory/manager/launch-memory-api.sh

# Open the HTML test client
open system-core/memory/manager/memory-api-test.html
```

The HTML client provides a user-friendly interface for testing:
- Memory system status checks
- Project structure retrieval
- System health monitoring
- Schema exploration
- File listings
- Interactive query testing with custom JSON paths
- Pattern-based search with case sensitivity options
- Feature registry exploration

### API Testing with Curl

You can test any API endpoint using curl commands:

#### Core REST API
```bash
# Test status endpoint
curl http://localhost:8080/api/status

# List all milestones
curl http://localhost:8080/api/milestones

# Get feature details
curl http://localhost:8080/api/features/feature-4000-data-extraction
```

#### Memory API
```bash
# Test status endpoint
curl http://localhost:8000/api/memory/status

# Get memory schema
curl http://localhost:8000/api/memory/schema

# Query specific memory path
curl "http://localhost:8000/api/memory/query?path=system.version"
```

#### Knowledge Graph API
```bash
# Test status endpoint
curl http://localhost:8001/api/graph/status

# List all nodes
curl http://localhost:8001/api/graph/nodes

# Get specific node
curl http://localhost:8001/api/graph/node/milestone-ui-dashboard
```

#### Component Removal API
```bash
# Analyze milestone removal impact
curl -X POST -H "Content-Type: application/json" \
  -d '{"milestone_id":"milestone-test-fixes"}' \
  http://localhost:5000/api/v1/components/milestone/analyze
```

### Postman Collection

For more advanced testing, a Postman collection is available that includes:
- Pre-configured requests for all API endpoints
- Environment variables for different development scenarios
- Example request bodies
- Tests for response validation

The collection can be imported from `system-core/docs/devloop-api-collection.json`.

## Getting Started

To use the Devloop APIs, follow these steps:

1. **Start the API servers**:
   ```bash
   # Start the core REST API
   ./system-core/scripts/devloop/launch-api-server.sh
   
   # Start the Memory API
   ./system-core/memory/manager/launch-memory-api.sh
   
   # Start the Component Removal API
   ./system-core/scripts/devloop/launch-component-removal-api.sh
   ```

2. **Test API connectivity**:
   ```bash
   # Test the core REST API
   curl http://localhost:8080/api/status
   
   # Test the Memory API
   curl http://localhost:8000/api/memory/status
   
   # Test the Knowledge Graph API
   curl http://localhost:8001/api/graph/status
   ```

3. **Use the APIs in your code**:
   ```javascript
   // Example using the REST API with JavaScript
   fetch('http://localhost:8080/api/features')
     .then(response => response.json())
     .then(data => console.log(data))
     .catch(error => console.error('Error:', error));
   ```

   ```python
   # Example using the Component Removal API with Python
   import requests
   
   response = requests.post(
       'http://localhost:5000/api/v1/components/milestone/analyze',
       json={'milestone_id': 'milestone-test-milestone'}
   )
   
   data = response.json()
   print(data)
   ```

## Error Handling

All APIs return standard HTTP status codes:

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses typically include a JSON object with an error message:

```json
{
  "error": "Resource not found",
  "message": "The requested feature does not exist"
}
```