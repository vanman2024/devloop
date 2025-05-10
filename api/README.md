# Devloop Unified API Server

This directory contains the consolidated Express-based API system for Devloop. It serves as the single entry point for all backend services, providing a consistent interface for the frontend and other clients.

## Directory Structure

```
/api
├── routes/         # API route handlers organized by resource
├── middleware/     # Express middleware components
├── utils/          # Utility functions for API operations
├── server.js       # Main server entry point
├── tests/          # API tests
└── README.md       # This file
```

## API Design Principles

1. **Unified Server Architecture**
   - Single server for all API endpoints
   - Consistent error handling and response formats
   - WebSocket support for real-time updates

2. **Express-Only Implementation**
   - All backend services use Express for consistency
   - No mixed framework environments or Flask APIs

3. **Agent Integration**
   - APIs provide access to agent functionality
   - Support for agent lifecycle management
   - WebSocket notifications for agent events

4. **Versioned Endpoints**
   - All endpoints follow `/api/v1/resource` pattern
   - Support for multiple API versions simultaneously

## Available Resources

All API endpoints follow a consistent pattern: `/api/v1/[resource]/[action]`

1. **Activities**
   - Activity tracking and management
   - Real-time activity updates via WebSocket
   - Activity metrics and reporting

2. **Documents**
   - Document generation and management
   - AI-assisted content creation
   - Document versioning

3. **Milestones**
   - Milestone creation and management
   - Phase and module tracking
   - Feature status updates

4. **Agents**
   - Agent lifecycle management (spawn, execute, retire)
   - Agent status monitoring
   - Agent command execution

5. **Health**
   - System health checks
   - Performance monitoring
   - Diagnostic tools

## Usage

### Starting the Server

Use the unified launcher scripts:

```bash
# Start both UI and API servers
./start-ui.sh

# Start just the API server
./start-ui.sh --api-only

# Start with specific API port
./start-ui.sh --port 5000

# Start in production mode
./start-ui.sh --production
```

Or use the dedicated API server launcher:

```bash
# Start the API server
./launch-server.sh start

# Specify port and mode
./launch-server.sh start 3000 production
```

## WebSocket Integration

The server provides WebSocket support for real-time updates:

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│ HTTP Client │────▶│  Express Routes │────▶│ Backend Processing  │
└─────────────┘     └─────────────────┘     └─────────────────────┘
       ▲                    │                           │
       │                    │                           │
       │                    ▼                           ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  WebSocket  │◀────│ Event Broadcast │◀────│    Event Sources    │
└─────────────┘     └─────────────────┘     └─────────────────────┘
```

Clients can subscribe to specific channels for targeted updates:

```javascript
// Client-side example
const ws = new WebSocket('ws://localhost:3000');
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['agents', 'milestone:123']
}));
```

## Agent Integration

The API provides a RESTful interface to the agent system:

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  API Client │────▶│ /api/v1/agents/ │────▶│ System Health Agent │
└─────────────┘     └─────────────────┘     └─────────────────────┘
                                                       │
                                                       ▼
                                             ┌─────────────────────┐
                                             │    Child Agents     │
                                             └─────────────────────┘
```

## Development

When extending the API:

1. Create route handlers in `/api/routes/[resource]-routes.js`
2. Register routes in `server.js`
3. Add appropriate WebSocket event types if needed
4. Update documentation

Always follow the established patterns for consistency.