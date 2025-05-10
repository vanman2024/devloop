# Feature Lifecycle: End-to-End Flow Through Architecture

This document provides a comprehensive example of how a single feature flows through the entire Devloop architecture, demonstrating the integration of microservices, hexagonal architecture, and the parent-child-micro agent hierarchy.

## Feature Overview: "Authentication Improvement"

For this example, we'll follow the lifecycle of a specific feature:

```
Feature ID: feature-460782-auth-improvement
Name: Enhanced Authentication System
Description: Implement improved authentication with JWT token rotation, 
             refresh tokens, and role-based access controls for increased security.
```

## 1. Planning Phase

### 1.1. Project Structure Creation (UI → API → Knowledge Graph)

The feature begins when a user initiates project planning in the UI:

```
┌─────────────────────┐     ┌────────────────────┐     ┌─────────────────────┐
│  UI Service         │     │  Main API          │     │  Knowledge Graph API │
│  (React Frontend)   │────▶│  (Express Server)  │────▶│  (Graph Database)    │
│  Port: 3000         │     │  Port: 8080        │     │  Port: 8000          │
└─────────────────────┘     └────────────────────┘     └─────────────────────┘
```

**UI Component (ProjectCreationModal.jsx)**:
```jsx
const handleCreateProject = async () => {
  setLoading(true);
  
  try {
    const result = await createProject({
      name: projectName,
      description: projectDescription,
      templateType: selectedTemplate
    });
    
    if (result.success) {
      // Navigate to new project
      navigate(`/roadmap/${result.project.id}`);
      showToast('Project created successfully!', 'success');
    }
  } catch (error) {
    console.error('Error creating project:', error);
    showToast('Failed to create project', 'error');
  } finally {
    setLoading(false);
  }
};
```

**API Endpoint (project-structure-routes.js)**:
```javascript
router.post('/initialize', async (req, res) => {
  try {
    const { projectName, description, templateType } = req.body;
    
    // Create project structure
    const projectStructure = await projectStructureService.initializeProject(
      projectName, 
      description, 
      templateType
    );
    
    res.json(projectStructure);
  } catch (error) {
    console.error('Error initializing project structure:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Knowledge Graph Operation**:
```javascript
// Create project node in Knowledge Graph
const projectNode = await graphClient.createNode({
  type: 'project',
  properties: {
    name: projectName,
    description,
    status: 'planning',
    created_at: new Date().toISOString()
  }
});

// Return project ID to be used in agent invocations
return {
  id: projectNode.id,
  name: projectName,
  status: 'planning'
};
```

### 1.2. Planning Agent Execution (API → Agent System)

After project creation, the Planning Agent is activated:

```
┌────────────────────┐     ┌────────────────────────────┐     ┌─────────────────────┐
│  Main API          │     │  Planning Parent Agent     │     │  Knowledge Graph API │
│  (Express Server)  │────▶│  (Agent Service)           │────▶│  (Graph Database)    │
│  Port: 8080        │     │  Port: 8085                │     │  Port: 8000          │
└────────────────────┘     └────────────────────────────┘     └─────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐
                           │  Architect Agent (Child)   │
                           │  (Dynamic Process)         │
                           └────────────────────────────┘
```

**API Controller (agent-routes.js)**:
```javascript
router.post('/agents/:agentId/execute', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { operation, params } = req.body;
    
    // Validate agent access permission
    if (!hasAgentAccess(req, agentId)) {
      return res.status(403).json({ error: 'Not authorized to access this agent' });
    }
    
    // Execute agent operation
    const result = await agentOrchestrationService.executeAgent(agentId, operation, params);
    
    res.json(result);
  } catch (error) {
    console.error(`Error executing agent ${req.params.agentId}:`, error);
    res.status(500).json({ error: error.message });
  }
});
```

**Parent Agent Execution (PlannerParentAgent.js)**:
```javascript
async function execute({ operation, project_id, project_name, project_description, template_type }) {
  // Initialize result tracking
  const result = {
    operation,
    success: false,
    details: {},
    timeline: []
  };
  
  try {
    // Record start time
    result.timeline.push({
      step: 'parent_agent_start',
      timestamp: new Date().toISOString()
    });
    
    // Spawn Architect Agent as a child process
    const architectAgent = await spawnChildAgent('architect_agent', {
      project_id,
      project_name,
      project_description,
      template_type
    });
    
    // Record agent spawned
    result.timeline.push({
      step: 'architect_agent_spawned',
      timestamp: new Date().toISOString(),
      agent_id: architectAgent.id
    });
    
    // Wait for architecture design
    const architectureDesign = await architectAgent.execute();
    
    // Record architecture completed
    result.timeline.push({
      step: 'architecture_completed',
      timestamp: new Date().toISOString()
    });
    
    // Store results
    result.success = true;
    result.details.architecture = architectureDesign;
    
    // Now spawn the Detail Agent to create feature details
    const detailAgent = await spawnChildAgent('detail_agent', {
      project_id,
      architecture: architectureDesign
    });
    
    // Wait for detailed features
    const featureDetails = await detailAgent.execute();
    
    // Record details completed
    result.timeline.push({
      step: 'feature_details_completed',
      timestamp: new Date().toISOString()
    });
    
    // Store results
    result.details.features = featureDetails;
    
    return result;
  } catch (error) {
    console.error('Error in planner parent agent:', error);
    result.error = error.message;
    return result;
  }
}
```

**Detail Agent LLM Prompt (detail_agent.js)**:
```javascript
const prompt = `
You are the Detail Agent responsible for creating detailed feature specifications.
Based on the architectural design provided, create detailed features for the project.

Project: ${projectName}
Description: ${projectDescription}
Architecture: ${JSON.stringify(architecture, null, 2)}

For each component in the architecture, create at least 2-3 detailed features.
Each feature should have:
1. A unique identifier
2. A clear name
3. A detailed description
4. Technical requirements
5. Acceptance criteria
6. Priority level (High, Medium, Low)
7. Estimated effort (Small, Medium, Large)

Your output will be used to populate the Knowledge Graph for project planning.
`;

// Call LLM with the prompt
const llmResponse = await llmService.generateContent({
  model: "claude-3-sonnet-20250501",
  messages: [
    {
      role: "system",
      content: "You are a Detail Agent in Devloop, designed to create detailed feature specifications."
    },
    {
      role: "user",
      content: prompt
    }
  ],
  temperature: 0.2,
  response_format: { type: "json_object" }
});

// Parse the response
const features = JSON.parse(llmResponse.choices[0].message.content);
```

**Knowledge Graph Update (Feature Node)**:
```javascript
// Create feature node for Authentication Improvement
const featureNode = await graphClient.createNode({
  type: 'feature',
  properties: {
    id: 'feature-460782-auth-improvement',
    name: 'Enhanced Authentication System',
    description: 'Implement improved authentication with JWT token rotation, refresh tokens, and role-based access controls for increased security.',
    requirements: [
      'Implement token rotation to limit token lifetime',
      'Add refresh token mechanism with secure storage',
      'Implement role-based access control system',
      'Create middleware for route protection based on roles',
      'Ensure tokens are properly invalidated on logout'
    ],
    acceptance_criteria: [
      'Users can log in and receive both access and refresh tokens',
      'Access tokens expire after 15 minutes',
      'Refresh tokens can be used to obtain new access tokens',
      'Routes can be protected based on user roles',
      'Tokens are properly invalidated on logout'
    ],
    priority: 'High',
    estimated_effort: 'Medium',
    status: 'planned',
    created_at: new Date().toISOString()
  }
});

// Create relationship to parent module
await graphClient.createEdge({
  source: 'module-460780-security',
  target: featureNode.id,
  type: 'module_contains_feature'
});
```

## 2. Feature & Task Definition

### 2.1. Feature Creation and Roadmap Integration

Once the planning is complete, the feature appears in the Roadmap UI:

```
┌─────────────────────┐     ┌────────────────────┐     ┌─────────────────────┐
│  UI Service         │     │  Main API          │     │  Knowledge Graph API │
│  (Roadmap Page)     │────▶│  (Express Server)  │────▶│  (Graph Database)    │
│  Port: 3000         │     │  Port: 8080        │     │  Port: 8000          │
└─────────────────────┘     └────────────────────┘     └─────────────────────┘
```

**Roadmap Service (RoadmapService.js)**:
```javascript
// Fetch milestone structure including features
export const fetchMilestoneStructure = async (milestoneId) => {
  try {
    // Fetch milestone
    const milestoneResponse = await fetch(`${API_ENDPOINTS.GRAPH.NODE(milestoneId)}`);
    
    if (!milestoneResponse.ok) {
      throw new Error(`Error fetching milestone: ${milestoneResponse.statusText}`);
    }
    
    const milestone = formatNodeForUI(await milestoneResponse.json());
    
    // Fetch phases for this milestone
    const phases = await fetchMilestonePhases(milestoneId);
    
    // For each phase, fetch its modules
    const phasesWithModules = await Promise.all(
      phases.map(async (phase) => {
        const modules = await fetchPhaseModules(phase.id);
        
        // For each module, fetch its features
        const modulesWithFeatures = await Promise.all(
          modules.map(async (module) => {
            const features = await fetchModuleFeatures(module.id);
            return {
              ...module,
              children: features
            };
          })
        );
        
        return {
          ...phase,
          children: modulesWithFeatures
        };
      })
    );
    
    return {
      ...milestone,
      children: phasesWithModules
    };
  } catch (error) {
    console.error(`Error in fetchMilestoneStructure for ${milestoneId}:`, error);
    throw error;
  }
};
```

### 2.2. Feature to Task Breakdown (Task Agent)

The Feature Creation agent handoff to the Task agent for detailed task breakdown:

```
┌────────────────────┐     ┌────────────────────────────┐     ┌─────────────────────┐
│  Main API          │     │  Task Parent Agent         │     │  Knowledge Graph API │
│  (Express Server)  │────▶│  (Agent Service)           │────▶│  (Graph Database)    │
│  Port: 8080        │     │  Port: 8086                │     │  Port: 8000          │
└────────────────────┘     └────────────────────────────┘     └─────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐
                           │  Work Breakdown Agent      │
                           │  (Child Agent)             │
                           └────────────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐
                           │  Estimation Engine         │
                           │  (Micro Agent)             │
                           └────────────────────────────┘
```

**Task Agent Execution (task_agent.py)**:
```python
async def process_feature(feature_id):
    """Process a feature to create tasks"""
    # Fetch feature details from Knowledge Graph
    feature = await kg_client.get_node(feature_id)
    
    # Log processing start
    logger.info(f"Processing feature: {feature['properties']['name']} ({feature_id})")
    
    # Create Work Breakdown child agent
    work_breakdown_agent = WorkBreakdownAgent(feature)
    
    # Execute work breakdown
    tasks = await work_breakdown_agent.execute()
    
    # Create tasks in Knowledge Graph
    task_ids = []
    for task in tasks:
        # Create task node
        task_node = await kg_client.create_node({
            "type": "task",
            "properties": {
                "name": task["name"],
                "description": task["description"],
                "estimated_hours": task["estimated_hours"],
                "status": "not_started",
                "created_at": datetime.now().isoformat()
            }
        })
        
        # Create relationship to feature
        await kg_client.create_edge({
            "source": feature_id,
            "target": task_node["id"],
            "type": "feature_has_task"
        })
        
        task_ids.append(task_node["id"])
    
    return {
        "feature_id": feature_id,
        "tasks_created": len(tasks),
        "task_ids": task_ids
    }
```

**Work Breakdown LLM Prompt**:
```python
prompt = f"""
You are a Work Breakdown Agent responsible for breaking down features into specific tasks.

FEATURE:
Name: {feature['properties']['name']}
Description: {feature['properties']['description']}
Requirements: {feature['properties']['requirements']}
Acceptance Criteria: {feature['properties']['acceptance_criteria']}

Create 5-10 specific development tasks that would be needed to implement this feature.
For each task, include:
1. Task name (concise but descriptive)
2. Detailed description explaining what needs to be done
3. Estimated hours (between 1-16 hours per task)

For the Enhanced Authentication System, think about:
- Backend API endpoints needed
- Database schema updates
- Middleware components
- Frontend authentication flows
- Testing requirements

Output as JSON array of task objects.
"""

response = await llm_service.generate_content(
    model="claude-3-sonnet-20250501",
    system="You are a Work Breakdown Agent that creates detailed tasks for software development features.",
    prompt=prompt,
    temperature=0.2,
    response_format="json"
)
```

**Knowledge Graph Task Nodes**:
```json
{
  "id": "task-460782-auth-1",
  "type": "task",
  "properties": {
    "name": "Implement JWT token rotation mechanism",
    "description": "Create a service that generates short-lived JWT access tokens and handles automatic rotation. Implement token blacklisting for revoked tokens.",
    "estimated_hours": 8,
    "status": "not_started",
    "created_at": "2025-05-10T16:30:22Z"
  }
}
```

## 3. Development & Implementation

### 3.1. Builder Agent Code Generation

When development begins, the Builder Agent generates implementation code:

```
┌────────────────────┐     ┌────────────────────────────┐     ┌─────────────────────┐
│  Main API          │     │  Builder Parent Agent      │     │  Knowledge Graph API │
│  (Express Server)  │────▶│  (Agent Service)           │────▶│  (Graph Database)    │
│  Port: 8080        │     │  Port: 8087                │     │  Port: 8000          │
└────────────────────┘     └────────────────────────────┘     └─────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐
                           │  Code Generator Agent      │
                           │  (Child Agent)             │
                           └────────────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐     ┌─────────────────────┐
                           │  Comment Generator         │────▶│  Repository Agent    │
                           │  (Micro Agent)             │     │  (External Service)  │
                           └────────────────────────────┘     └─────────────────────┘
```

**Builder Agent Execution (BuilderAgentService.js)**:
```javascript
async function implementTask(taskId) {
  // Fetch task from Knowledge Graph
  const task = await knowledgeGraphService.getNode(taskId);
  
  // Fetch parent feature
  const featureEdges = await knowledgeGraphService.getEdges({
    type: 'feature_has_task',
    target: taskId
  });
  
  const featureId = featureEdges[0].source;
  const feature = await knowledgeGraphService.getNode(featureId);
  
  // Create Code Generator agent
  const codeGenerator = await createChildAgent('code_generator', {
    task,
    feature,
    codebase_context: await getCodebaseContext(feature.properties.name)
  });
  
  // Execute code generation
  const generatedCode = await codeGenerator.execute();
  
  // Commit code to repository
  const commitResult = await repositoryService.commitChanges({
    files: generatedCode.files,
    commitMessage: `Implement ${task.properties.name} for ${feature.properties.name}`,
    taskId,
    featureId
  });
  
  // Update task status
  await knowledgeGraphService.updateNode(taskId, {
    properties: {
      status: 'completed',
      completed_at: new Date().toISOString(),
      commit_id: commitResult.commitId
    }
  });
  
  return {
    success: true,
    task: taskId,
    feature: featureId,
    commit: commitResult.commitId,
    files: generatedCode.files.map(f => f.path)
  };
}
```

**Code Generator Output Example**:
```javascript
// auth.service.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { TokenBlacklist, RefreshToken } = require('../models');

class AuthService {
  /**
   * Generate access and refresh tokens for a user
   * @param {Object} user User object from database
   * @returns {Object} Object containing tokens and expiration times
   */
  async generateTokens(user) {
    // Generate access token with short expiration (15 min)
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        roles: user.roles
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    // Generate refresh token with longer expiration (7 days)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Store refresh token in database with expiration
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return {
      accessToken,
      refreshToken,
      accessTokenExpires: Date.now() + 15 * 60 * 1000,
      refreshTokenExpires: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }
  
  /**
   * Refresh the access token using a refresh token
   * @param {string} refreshToken Refresh token
   * @returns {Object} New tokens and expiration times
   */
  async refreshAccessToken(refreshToken) {
    // Find refresh token in database
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken, expiresAt: { $gt: new Date() } }
    });
    
    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }
    
    // Get user
    const user = await User.findByPk(storedToken.userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new tokens
    const tokens = await this.generateTokens(user);
    
    // Invalidate old refresh token (one-time use)
    await storedToken.destroy();
    
    return tokens;
  }
  
  /**
   * Invalidate all tokens for a user (logout)
   * @param {string} userId User ID
   * @param {string} currentToken Current access token to invalidate
   */
  async invalidateTokens(userId, currentToken) {
    // Add current token to blacklist
    if (currentToken) {
      try {
        const decoded = jwt.verify(currentToken.replace('Bearer ', ''), process.env.JWT_SECRET);
        const expiresAt = new Date(decoded.exp * 1000);
        
        await TokenBlacklist.create({
          token: currentToken,
          expiresAt
        });
      } catch (error) {
        // Token might be invalid, but still remove refresh tokens
        console.error('Error blacklisting token:', error);
      }
    }
    
    // Remove all refresh tokens for user
    await RefreshToken.destroy({
      where: { userId }
    });
    
    return { success: true };
  }
}

module.exports = new AuthService();
```

### 3.2. QA Agent Testing

After implementation, the QA Agent performs testing:

```
┌────────────────────┐     ┌────────────────────────────┐     ┌─────────────────────┐
│  Main API          │     │  QA Parent Agent           │     │  Knowledge Graph API │
│  (Express Server)  │────▶│  (Agent Service)           │────▶│  (Graph Database)    │
│  Port: 8080        │     │  Port: 8088                │     │  Port: 8000          │
└────────────────────┘     └────────────────────────────┘     └─────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐
                           │  Integration Tester Agent  │
                           │  (Child Agent)             │
                           └────────────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐
                           │  API Tester               │
                           │  (Micro Agent)            │
                           └────────────────────────────┘
```

**QA Agent Test Generation**:
```javascript
async function generateTests(featureId) {
  // Fetch feature details
  const feature = await knowledgeGraphService.getNode(featureId);
  
  // Fetch all tasks for the feature
  const taskEdges = await knowledgeGraphService.getEdges({
    type: 'feature_has_task',
    source: featureId
  });
  
  const tasks = await Promise.all(
    taskEdges.map(edge => knowledgeGraphService.getNode(edge.target))
  );
  
  // Find all commits related to the tasks
  const commits = [];
  for (const task of tasks) {
    if (task.properties.commit_id) {
      const commit = await repositoryService.getCommit(task.properties.commit_id);
      commits.push(commit);
    }
  }
  
  // Generate file paths to test
  const filesToTest = commits.flatMap(commit => commit.files);
  
  // Create Integration Tester agent
  const integrationTester = await createChildAgent('integration_tester', {
    feature,
    tasks,
    files: filesToTest
  });
  
  // Execute test generation
  const tests = await integrationTester.execute();
  
  // Create API Tester micro agent
  const apiTester = await createMicroAgent('api_tester', {
    feature,
    api_endpoints: tests.endpoints
  });
  
  // Execute API tests
  const apiTestResults = await apiTester.execute();
  
  // Commit tests to repository
  const commitResult = await repositoryService.commitChanges({
    files: tests.files,
    commitMessage: `Add tests for ${feature.properties.name}`,
    featureId
  });
  
  // Update feature status
  await knowledgeGraphService.updateNode(featureId, {
    properties: {
      test_status: apiTestResults.success ? 'passed' : 'failed',
      test_coverage: apiTestResults.coverage,
      test_commit_id: commitResult.commitId
    }
  });
  
  return {
    success: true,
    feature: featureId,
    testsAdded: tests.files.length,
    testsPassed: apiTestResults.passed,
    testsFailed: apiTestResults.failed,
    coverage: apiTestResults.coverage
  };
}
```

**Generated Test Example**:
```javascript
// auth.service.test.js
const jwt = require('jsonwebtoken');
const { AuthService } = require('../services/auth.service');
const { User, RefreshToken, TokenBlacklist } = require('../models');

// Mock dependencies
jest.mock('../models', () => ({
  User: {
    findByPk: jest.fn()
  },
  RefreshToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn()
  },
  TokenBlacklist: {
    create: jest.fn()
  }
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';

describe('AuthService', () => {
  let authService;
  let mockUser;
  
  beforeEach(() => {
    authService = new AuthService();
    mockUser = {
      id: '123',
      email: 'test@example.com',
      roles: ['user']
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      // Arrange
      RefreshToken.create.mockResolvedValue({});
      
      // Act
      const result = await authService.generateTokens(mockUser);
      
      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessTokenExpires).toBeDefined();
      expect(result.refreshTokenExpires).toBeDefined();
      
      // Verify JWT contains correct data
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET);
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.roles).toEqual(mockUser.roles);
      
      // Verify refresh token was stored
      expect(RefreshToken.create).toHaveBeenCalledWith({
        token: expect.any(String),
        userId: mockUser.id,
        expiresAt: expect.any(Date)
      });
    });
  });
  
  describe('refreshAccessToken', () => {
    it('should refresh access token when valid refresh token is provided', async () => {
      // Arrange
      const mockStoredToken = {
        userId: mockUser.id,
        destroy: jest.fn().mockResolvedValue({})
      };
      
      RefreshToken.findOne.mockResolvedValue(mockStoredToken);
      User.findByPk.mockResolvedValue(mockUser);
      
      // Mock generateTokens
      authService.generateTokens = jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });
      
      // Act
      const result = await authService.refreshAccessToken('valid-refresh-token');
      
      // Assert
      expect(RefreshToken.findOne).toHaveBeenCalledWith({
        where: { 
          token: 'valid-refresh-token',
          expiresAt: expect.any(Object)
        }
      });
      
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
      expect(authService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(mockStoredToken.destroy).toHaveBeenCalled();
      
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });
    
    it('should throw error when refresh token is invalid', async () => {
      // Arrange
      RefreshToken.findOne.mockResolvedValue(null);
      
      // Act & Assert
      await expect(authService.refreshAccessToken('invalid-token'))
        .rejects.toThrow('Invalid or expired refresh token');
    });
  });
  
  describe('invalidateTokens', () => {
    it('should blacklist current token and remove all refresh tokens', async () => {
      // Arrange
      const mockToken = 'Bearer valid-jwt-token';
      jwt.verify = jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      
      // Act
      const result = await authService.invalidateTokens(mockUser.id, mockToken);
      
      // Assert
      expect(TokenBlacklist.create).toHaveBeenCalledWith({
        token: mockToken,
        expiresAt: expect.any(Date)
      });
      
      expect(RefreshToken.destroy).toHaveBeenCalledWith({
        where: { userId: mockUser.id }
      });
      
      expect(result.success).toBe(true);
    });
  });
});
```

## 4. Documentation & Deployment

### 4.1. Documentation Agent Generation

In parallel with development and testing, the Documentation Agent creates documentation:

```
┌────────────────────┐     ┌────────────────────────────┐     ┌─────────────────────┐
│  Main API          │     │  Documentation Agent       │     │  Document Server    │
│  (Express Server)  │────▶│  (Agent Service)           │────▶│  (Express Server)   │
│  Port: 8080        │     │  Port: 8089                │     │  Port: 3002         │
└────────────────────┘     └────────────────────────────┘     └─────────────────────┘
                              │                                         │
                              │ spawns                                  │
                              ▼                                         │
                           ┌────────────────────────────┐               │
                           │  Document Generator        │               │
                           │  (Child Agent)             │───────────────┘
                           └────────────────────────────┘
```

**Documentation Generation**:
```javascript
async function generateDocumentation(featureId) {
  // Fetch feature and related data
  const feature = await knowledgeGraphService.getNode(featureId);
  
  // Fetch tasks and commits
  const taskEdges = await knowledgeGraphService.getEdges({
    type: 'feature_has_task',
    source: featureId
  });
  
  const tasks = await Promise.all(
    taskEdges.map(edge => knowledgeGraphService.getNode(edge.target))
  );
  
  // Fetch code from all commits
  const codeFragments = await Promise.all(
    tasks
      .filter(task => task.properties.commit_id)
      .map(task => repositoryService.getCommitFiles(task.properties.commit_id))
  );
  
  // Create Document Generator agent
  const documentGenerator = await createChildAgent('document_generator', {
    feature,
    tasks,
    code_fragments: codeFragments.flat()
  });
  
  // Execute documentation generation
  const documentation = await documentGenerator.execute();
  
  // Save documentation to document server
  const docResponse = await fetch(`${API_ENDPOINTS.DOCUMENTS.CREATE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${feature.properties.name} - Documentation`,
      content: documentation.markdown,
      type: 'feature-documentation',
      tags: ['authentication', 'security', 'jwt', 'api'],
      related_entities: [
        {
          type: 'feature',
          id: featureId
        }
      ]
    }),
  });
  
  const docResult = await docResponse.json();
  
  // Update feature with documentation ID
  await knowledgeGraphService.updateNode(featureId, {
    properties: {
      documentation_id: docResult.id
    }
  });
  
  return {
    success: true,
    feature: featureId,
    documentation_id: docResult.id
  };
}
```

**Documentation Output Example**:
```markdown
# Enhanced Authentication System Documentation

## Overview

The Enhanced Authentication System provides a comprehensive security solution implementing:
- JWT token rotation with short-lived access tokens
- Secure refresh token mechanism
- Role-based access control
- Token invalidation on logout

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticates a user and returns access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "7f58a9d7c8b1e2f4a5d6c8b1e2f4a5d6c8b1e2f4...",
  "accessTokenExpires": 1600000000000,
  "refreshTokenExpires": 1600700000000
}
```

#### POST /api/auth/refresh
Exchanges a refresh token for a new access token.

**Request Body:**
```json
{
  "refreshToken": "7f58a9d7c8b1e2f4a5d6c8b1e2f4a5d6c8b1e2f4..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "8g69b0e8d9c2f5b6e7d9c2f5b6e7d9c2f5b6e7f5...",
  "accessTokenExpires": 1600000100000,
  "refreshTokenExpires": 1600700100000
}
```

#### POST /api/auth/logout
Invalidates all tokens for a user.

**Headers:**
- Authorization: Bearer {accessToken}

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## Implementation Details

### Token Rotation

The system implements token rotation using short-lived JWTs (15 minutes) and longer-lived refresh tokens (7 days). This improves security by limiting the time a compromised token can be used.

Key components:
- `AuthService.generateTokens()`: Creates both token types
- `AuthService.refreshAccessToken()`: Implements one-time-use refresh tokens
- `TokenBlacklist`: Stores invalidated tokens until expiration

### Role-Based Access Control

Access control is implemented at the middleware level through:
- Roles stored in JWT payload
- Route protection middleware that checks required roles

Example middleware usage:
```javascript
router.get('/admin/dashboard', 
  authMiddleware.requireRoles(['admin']), 
  adminController.getDashboard
);
```

## Client Integration

Frontend applications should:
1. Store both tokens securely (access token in memory, refresh token in HttpOnly cookie)
2. Implement token refresh logic when access token expires
3. Clear tokens on logout
4. Include access token in Authorization header for API requests

## Security Considerations

- Refresh tokens are one-time use only to prevent token replay attacks
- Tokens are invalidated on logout
- JWT tokens contain minimal payload information
- Token blacklisting prevents use of compromised tokens

## Testing

Unit and integration tests are available in the `tests/auth` directory. Run with:
```bash
npm run test:auth
```
```

### 4.2. Deployment to Production

Finally, the feature is deployed using the Deployment Agent:

```
┌────────────────────┐     ┌────────────────────────────┐     ┌─────────────────────┐
│  Main API          │     │  Deployment Agent          │     │  CI/CD Service      │
│  (Express Server)  │────▶│  (Agent Service)           │────▶│  (Jenkins/GitHub    │
│  Port: 8080        │     │  Port: 8090                │     │   Actions)          │
└────────────────────┘     └────────────────────────────┘     └─────────────────────┘
                              │
                              │ spawns
                              ▼
                           ┌────────────────────────────┐     ┌─────────────────────┐
                           │  Flag Controller           │────▶│  Main API (Prod)    │
                           │  (Child Agent)             │     │  (Production Server)│
                           └────────────────────────────┘     └─────────────────────┘
```

**Deployment Process**:
```javascript
async function deployFeature(featureId) {
  // Fetch feature details
  const feature = await knowledgeGraphService.getNode(featureId);
  
  // Check readiness
  if (feature.properties.test_status !== 'passed') {
    throw new Error('Cannot deploy feature with failing tests');
  }
  
  // Create deployment plan
  const deploymentPlan = {
    feature_id: featureId,
    feature_name: feature.properties.name,
    deployment_strategy: 'feature_flag',
    environments: ['staging', 'production'],
    rollback_plan: {
      trigger_conditions: ['error_rate > 5%', 'latency > 500ms'],
      automated: true
    }
  };
  
  // Trigger CI/CD pipeline
  const cicdResponse = await fetch(`${CI_CD_API_ENDPOINT}/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.CICD_API_KEY
    },
    body: JSON.stringify({
      feature_id: featureId,
      repository: 'devloop-api',
      branch: 'main',
      deployment_plan: deploymentPlan
    })
  });
  
  const cicdResult = await cicdResponse.json();
  
  // Create Flag Controller agent to manage feature flag
  const flagController = await createChildAgent('flag_controller', {
    feature_id: featureId,
    deployment_id: cicdResult.deployment_id,
    flag_name: `auth_improvement_enabled`,
    initial_state: {
      staging: true,
      production: false
    },
    rollout_plan: {
      production: {
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        percentage: [
          { value: 10, duration_hours: 24 },
          { value: 50, duration_hours: 24 },
          { value: 100, duration_hours: 24 }
        ]
      }
    }
  });
  
  // Execute flag controller
  const flagResult = await flagController.execute();
  
  // Update feature status in Knowledge Graph
  await knowledgeGraphService.updateNode(featureId, {
    properties: {
      status: 'deployed',
      deployment_id: cicdResult.deployment_id,
      flag_id: flagResult.flag_id,
      deployed_at: new Date().toISOString()
    }
  });
  
  return {
    success: true,
    feature: featureId,
    deployment_id: cicdResult.deployment_id,
    flag_id: flagResult.flag_id,
    environments: cicdResult.environments
  };
}
```

**Feature Flag Implementation**:
```javascript
// Feature flag configuration - Used in Production
const FLAGS = {
  auth_improvement_enabled: {
    defaultValue: false,
    description: 'Enable enhanced authentication system with token rotation',
    environments: {
      development: true,
      staging: true,
      production: false
    },
    rollout: {
      production: {
        startDate: '2025-05-11T00:00:00Z',
        percentage: 10,
        targetDate: '2025-05-14T00:00:00Z'
      }
    }
  }
};

// Feature flag middleware
function authMiddleware(req, res, next) {
  const useNewAuth = isFeatureFlagEnabled('auth_improvement_enabled', req);
  
  if (useNewAuth) {
    // Use new enhanced auth system
    return enhancedAuthMiddleware(req, res, next);
  } else {
    // Use legacy auth system
    return legacyAuthMiddleware(req, res, next);
  }
}
```

## 5. Monitoring & Continuous Improvement

### 5.1. System Health Agent Monitoring

After deployment, the System Health Agent continuously monitors the feature:

```
┌─────────────────────┐     ┌────────────────────────────┐    ┌─────────────────────┐
│  Production         │     │  System Health Agent       │    │  Knowledge Graph API │
│  Environment        │────▶│  (Agent Service)           │───▶│  (Graph Database)    │
│                     │     │  Port: 8091                │    │  Port: 8000          │
└─────────────────────┘     └────────────────────────────┘    └─────────────────────┘
                               │
                               │ spawns
                               ▼
                            ┌────────────────────────────┐
                            │  Log Analyzer              │
                            │  (Child Agent)             │
                            └────────────────────────────┘
                               │
                               │ spawns
                               ▼
                            ┌────────────────────────────┐
                            │  Incident Detector         │
                            │  (Micro Agent)             │
                            └────────────────────────────┘
```

**Health Monitoring Process**:
```javascript
async function monitorFeature(featureId) {
  // Fetch feature details
  const feature = await knowledgeGraphService.getNode(featureId);
  
  // Check if feature is deployed
  if (feature.properties.status !== 'deployed') {
    throw new Error('Cannot monitor feature that is not deployed');
  }
  
  // Create Log Analyzer child agent
  const logAnalyzer = await createChildAgent('log_analyzer', {
    feature_id: featureId,
    log_patterns: [
      'auth.*error',
      'token.*invalid',
      'refresh.*failed',
      'authentication.*failed'
    ],
    time_range_hours: 24
  });
  
  // Execute log analysis
  const logAnalysis = await logAnalyzer.execute();
  
  // Create Incident Detector micro agent if issues found
  if (logAnalysis.error_count > 0 || logAnalysis.warning_count > 0) {
    const incidentDetector = await createMicroAgent('incident_detector', {
      feature_id: featureId,
      log_analysis: logAnalysis,
      thresholds: {
        error_rate: 5,
        error_count: 10,
        warning_count: 20
      }
    });
    
    // Execute incident detection
    const incidents = await incidentDetector.execute();
    
    // Register incidents in Knowledge Graph
    if (incidents.length > 0) {
      for (const incident of incidents) {
        await knowledgeGraphService.createNode({
          type: 'incident',
          properties: {
            feature_id: featureId,
            severity: incident.severity,
            message: incident.message,
            error_count: incident.error_count,
            warning_count: incident.warning_count,
            detected_at: new Date().toISOString(),
            status: 'open'
          }
        });
      }
    }
  }
  
  // Collect metrics
  const metrics = await metricsService.collectMetrics({
    feature_id: featureId,
    metric_types: ['api_latency', 'error_rate', 'usage_count'],
    time_range_hours: 24
  });
  
  // Update feature monitoring data in Knowledge Graph
  await knowledgeGraphService.updateNode(featureId, {
    properties: {
      last_monitored_at: new Date().toISOString(),
      error_count_24h: logAnalysis.error_count,
      warning_count_24h: logAnalysis.warning_count,
      metrics_24h: metrics
    }
  });
  
  return {
    success: true,
    feature: featureId,
    error_count: logAnalysis.error_count,
    warning_count: logAnalysis.warning_count,
    incidents_detected: incidents?.length || 0,
    metrics
  };
}
```

### 5.2. User Feedback Loop

The Feedback Analyzer continuously processes user feedback and suggests improvements:

```
┌─────────────────────┐     ┌────────────────────────────┐    ┌─────────────────────┐
│  User Feedback      │     │  Feedback Analyzer         │    │  Knowledge Graph API │
│  System             │────▶│  (Child Agent)             │───▶│  (Graph Database)    │
│                     │     │                            │    │  Port: 8000          │
└─────────────────────┘     └────────────────────────────┘    └─────────────────────┘
```

**Feedback Analysis**:
```javascript
async function analyzeFeedback(featureId) {
  // Fetch feature feedback
  const feedback = await feedbackService.getFeatureFeedback(featureId);
  
  // Analyze sentiment
  const sentimentAnalysis = await nlpService.analyzeSentiment(
    feedback.map(f => f.comment)
  );
  
  // Extract common themes
  const themes = await nlpService.extractThemes(
    feedback.map(f => f.comment)
  );
  
  // Generate improvement suggestions
  const improvements = await llmService.generateContent({
    model: "claude-3-sonnet-20250501",
    system: "You are a feedback analyzer that suggests improvements based on user feedback.",
    prompt: `Based on the following user feedback for the Enhanced Authentication System, suggest 3-5 concrete improvements that could be made.
    
    Feature: ${featureId}
    
    User Feedback:
    ${feedback.map(f => `- "${f.comment}" (Rating: ${f.rating}/5)`).join('\n')}
    
    Sentiment Analysis:
    ${sentimentAnalysis}
    
    Common Themes:
    ${themes.map(t => `- ${t.name}: ${t.count} mentions`).join('\n')}
    
    Please suggest specific, actionable improvements that address the feedback.
    Format as JSON array of improvement objects with title and description.`,
    response_format: { type: "json_object" }
  });
  
  const suggestionData = JSON.parse(improvements.choices[0].message.content);
  
  // Store feedback analysis in Knowledge Graph
  await knowledgeGraphService.createNode({
    type: 'feedback_analysis',
    properties: {
      feature_id: featureId,
      sentiment_score: sentimentAnalysis.average_score,
      themes: themes,
      improvements: suggestionData.improvements,
      analyzed_at: new Date().toISOString()
    }
  });
  
  // Create relationship to feature
  await knowledgeGraphService.createEdge({
    source: 'feedback_analysis_' + Date.now(),
    target: featureId,
    type: 'feedback_for_feature'
  });
  
  // Return analysis results
  return {
    success: true,
    feature: featureId,
    sentiment_score: sentimentAnalysis.average_score,
    themes: themes,
    improvements: suggestionData.improvements
  };
}
```

## Conclusion: Cross-Service Feature Lifecycle

This detailed walkthrough demonstrates how a single feature flows through the entire Devloop architecture, showing the integration between:

1. **Microservices Architecture**: Services with specific responsibilities communicate through standardized APIs

2. **Hexagonal Architecture**: Clean separation between domain logic (agents) and external interfaces (APIs, UI, database)

3. **Parent-Child-Micro Agent Hierarchy**: Clearly defined agent responsibilities with organized delegation patterns

4. **Knowledge Graph Integration**: Centralized data model providing a single source of truth

5. **SDLC Workflow**: Organized progression from planning to deployment with appropriate handoffs

The architecture allows for:

- **Parallel Processing**: Multiple agents can work simultaneously on different aspects of the same feature
- **Service Isolation**: Failure in one service doesn't affect others
- **Consistent Data Model**: Knowledge Graph maintains relationships between all entities
- **Scalability**: Services can be scaled independently based on load
- **Flexibility**: Different LLM providers can be used for different agents

This holistic approach ensures that features move efficiently through the development lifecycle while maintaining architectural integrity and maximizing the benefits of AI assistance.