# API Endpoints

This directory contains all the API endpoints organized by domain.

## Structure

Each domain has its own subdirectory with controllers and routes:

```
/endpoints
├── agents/             # Agent management endpoints
├── health/             # System health endpoints
├── content/            # Content management endpoints
└── users/              # User management endpoints
```

## Endpoint Design Pattern

All endpoints follow a consistent pattern:

1. Route definition in a routes file
2. Implementation in a controller file
3. Validation using schema references
4. Documentation using JSDoc with OpenAPI annotations

Example:

```javascript
// routes/agents.js
const router = express.Router();
router.get('/agents', AgentController.listAgents);
router.get('/agents/:id', AgentController.getAgent);
router.post('/agents', validate(agentSchema), AgentController.createAgent);
// etc.

// controllers/agent.controller.js
class AgentController {
  /**
   * @openapi
   * /api/v1/agents:
   *   get:
   *     summary: List all agents
   *     tags: [Agents]
   *     responses:
   *       200:
   *         description: List of agents
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AgentList'
   */
  static async listAgents(req, res, next) {
    try {
      // Implementation
    } catch (error) {
      next(error);
    }
  }
  
  // Other methods
}
```

## Domain Overview

### Agent Endpoints

Endpoints for managing the agent system:

- List available agents
- Get agent details and capabilities
- Send messages to agents
- Manage agent lifecycle
- Query agent status

### Health Endpoints

Endpoints for system health management:

- System status checks
- Performance metrics
- Diagnostic tools
- Log access
- Health reports

### Content Endpoints

Endpoints for content management:

- Document operations
- Configuration management
- Feature and component tracking
- File operations

### User Endpoints

Endpoints for user management:

- Authentication
- User profile management
- Permissions and roles
- User preferences