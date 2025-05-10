const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Mock data storage for development (will be replaced with real database)
let projectsData = {};

// Utility to ensure the data directory exists
const ensureDataDir = async () => {
  const dataDir = path.join(__dirname, '../data/projects');
  try {
    await fs.mkdir(dataDir, { recursive: true });
    return dataDir;
  } catch (error) {
    console.error('Error creating data directory:', error);
    throw error;
  }
};

// Utility to save project data
const saveProject = async (projectId, data) => {
  const dataDir = await ensureDataDir();
  const filePath = path.join(dataDir, `${projectId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  projectsData[projectId] = data;
  return data;
};

// Utility to load project data
const loadProject = async (projectId) => {
  // Check memory cache first
  if (projectsData[projectId]) {
    return projectsData[projectId];
  }

  // Load from file
  const dataDir = await ensureDataDir();
  const filePath = path.join(dataDir, `${projectId}.json`);
  
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    projectsData[projectId] = data;
    return data;
  } catch (error) {
    console.error(`Error loading project ${projectId}:`, error);
    return null;
  }
};

// Utility to list all projects
const listAllProjects = async () => {
  const dataDir = await ensureDataDir();
  
  try {
    const files = await fs.readdir(dataDir);
    const projectFiles = files.filter(file => file.endsWith('.json'));
    
    const projects = await Promise.all(
      projectFiles.map(async (file) => {
        const projectId = file.replace('.json', '');
        const data = await loadProject(projectId);
        return {
          id: projectId,
          name: data.name,
          description: data.description,
          templateType: data.templateType,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      })
    );
    
    return projects;
  } catch (error) {
    console.error('Error listing projects:', error);
    return [];
  }
};

// Mock function to simulate invoking structure agent
// Will be replaced with actual agent invocation
const invokeStructureAgent = async (action, params) => {
  console.log(`[AGENT] Invoking structure agent with action: ${action}`);
  console.log(`[AGENT] Params:`, params);
  
  // Simulate agent processing time
  await new Promise(resolve => setTimeout(resolve, 500));
  
  switch (action) {
    case 'initialize':
      return createInitialProject(params);
    
    case 'add-component':
      return addProjectComponent(params);
    
    case 'update-component':
      return updateProjectComponent(params);
    
    case 'move-component':
      return moveProjectComponent(params);
    
    case 'delete-component':
      return deleteProjectComponent(params);
    
    case 'balance':
      return balanceProjectStructure(params);
    
    case 'recommendations':
      return generateRecommendations(params);
    
    default:
      throw new Error(`Unknown agent action: ${action}`);
  }
};

// Helper to create initial project structure
const createInitialProject = async ({ projectName, description, templateType }) => {
  const projectId = uuidv4();
  const now = new Date().toISOString();
  
  let initialStructure = {
    id: projectId,
    name: projectName,
    type: 'project',
    description: description || '',
    status: 'not_started',
    createdAt: now,
    updatedAt: now,
    children: []
  };
  
  // Add template-specific structure
  if (templateType === 'sdk-first') {
    // SDK-First Interactive Planning System structure
    initialStructure.children.push(
      {
        id: uuidv4(),
        name: 'Foundation Infrastructure',
        type: 'phase',
        status: 'not_started',
        children: [
          {
            id: uuidv4(),
            name: 'Core Infrastructure',
            type: 'module',
            status: 'not_started',
            children: [
              { id: uuidv4(), name: 'Database Schema Implementation', type: 'feature', status: 'not_started' },
              { id: uuidv4(), name: 'Redis Pub/Sub System', type: 'feature', status: 'not_started' },
              { id: uuidv4(), name: 'Knowledge Graph Foundation', type: 'feature', status: 'not_started' },
              { id: uuidv4(), name: 'UI Real-time Update Framework', type: 'feature', status: 'not_started' }
            ]
          },
          {
            id: uuidv4(),
            name: 'Agent Foundations',
            type: 'module',
            status: 'not_started',
            children: [
              { id: uuidv4(), name: 'Planning Agent Base Implementation', type: 'feature', status: 'not_started' },
              { id: uuidv4(), name: 'Knowledge Graph Connector Agents', type: 'feature', status: 'not_started' },
              { id: uuidv4(), name: 'Structure Template Parser', type: 'feature', status: 'not_started' },
              { id: uuidv4(), name: 'SDK Integration Layer', type: 'feature', status: 'not_started' }
            ]
          }
        ]
      }
    );
  } else if (templateType === 'agent-ecosystem') {
    // Agent Ecosystem structure
    initialStructure.children.push(
      {
        id: uuidv4(),
        name: 'Core Agent Definitions',
        type: 'phase',
        status: 'not_started',
        children: [
          {
            id: uuidv4(),
            name: 'Planning Agents',
            type: 'module',
            status: 'not_started',
            children: [
              { 
                id: uuidv4(), 
                name: 'Project Architect Agent', 
                type: 'agent', 
                status: 'not_started',
                description: 'Creates high-level project structures and maintains architectural integrity',
                metadata: {
                  tools: [
                    { name: 'StructureGenerator', description: 'Creates initial milestone/phase/module structures' },
                    { name: 'DependencyAnalyzer', description: 'Identifies relationships between components' },
                    { name: 'BalanceOptimizer', description: 'Ensures even distribution of work across phases' }
                  ],
                  guardrails: [
                    'Prevent creation of isolated components without connections',
                    'Ensure milestone names follow conventions',
                    'Maximum depth rules for nested structures'
                  ],
                  handoffs: [
                    'To DetailAgent when high-level structure is complete',
                    'To ValidationAgent when structure needs verification'
                  ]
                }
              },
              { 
                id: uuidv4(), 
                name: 'Detail Agent', 
                type: 'agent', 
                status: 'not_started',
                description: 'Fills in detailed feature definitions and attributes',
                metadata: {
                  tools: [
                    { name: 'FeatureEnricher', description: 'Adds rich descriptions to features' },
                    { name: 'EstimationTool', description: 'Assigns complexity and time estimates' },
                    { name: 'TaggingSystem', description: 'Applies metadata and categorization' }
                  ],
                  guardrails: [
                    'Ensure descriptions meet minimum quality thresholds',
                    'Prevent unrealistic estimates',
                    'Maintain consistency in terminology'
                  ],
                  handoffs: [
                    'To RelationshipAgent for dependency mapping',
                    'To ArchitectAgent if structural changes needed'
                  ]
                }
              }
            ]
          }
        ]
      }
    );
  }
  
  // Store the project data
  const projectData = {
    id: projectId,
    name: projectName,
    description: description || '',
    templateType,
    createdAt: now,
    updatedAt: now,
    structure: initialStructure
  };
  
  await saveProject(projectId, projectData);
  
  return projectData;
};

// Helper to add component to project
const addProjectComponent = async ({ projectId, componentData }) => {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Generate new component
  const newComponent = {
    id: uuidv4(),
    name: componentData.name,
    type: componentData.type,
    description: componentData.description || '',
    status: 'not_started',
    ...componentData.metadata
  };
  
  // Helper to recursively find parent and add child
  const addToParent = (node, parentId) => {
    if (node.id === parentId) {
      if (!node.children) {
        node.children = [];
      }
      node.children.push(newComponent);
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (addToParent(child, parentId)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Add to parent if specified, otherwise add to root
  if (componentData.parentId) {
    const added = addToParent(project.structure, componentData.parentId);
    if (!added) {
      throw new Error(`Parent component not found: ${componentData.parentId}`);
    }
  } else {
    if (!project.structure.children) {
      project.structure.children = [];
    }
    project.structure.children.push(newComponent);
  }
  
  // Update project
  project.updatedAt = new Date().toISOString();
  await saveProject(projectId, project);
  
  return project.structure;
};

// Helper to update component in project
const updateProjectComponent = async ({ projectId, componentId, updateData }) => {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Helper to recursively find and update component
  const updateComponent = (node) => {
    if (node.id === componentId) {
      // Update allowed fields
      const allowedFields = ['name', 'description', 'status', 'metadata'];
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          node[field] = updateData[field];
        }
      });
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (updateComponent(child)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Update component
  const updated = updateComponent(project.structure);
  if (!updated) {
    throw new Error(`Component not found: ${componentId}`);
  }
  
  // Update project
  project.updatedAt = new Date().toISOString();
  await saveProject(projectId, project);
  
  return project.structure;
};

// Helper to move component in project
const moveProjectComponent = async ({ projectId, componentId, newParentId, newIndex }) => {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  let componentToMove = null;
  let oldParent = null;
  
  // Helper to recursively find component and its parent
  const findComponent = (node, parent) => {
    if (node.children) {
      const index = node.children.findIndex(child => child.id === componentId);
      if (index !== -1) {
        componentToMove = node.children[index];
        oldParent = node;
        node.children.splice(index, 1);
        return true;
      }
      
      for (const child of node.children) {
        if (findComponent(child, node)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Find and remove component from current location
  findComponent(project.structure, null);
  
  if (!componentToMove) {
    throw new Error(`Component not found: ${componentId}`);
  }
  
  // Helper to find new parent
  const findNewParent = (node) => {
    if (node.id === newParentId) {
      if (!node.children) {
        node.children = [];
      }
      
      // Insert at specified index or append
      if (newIndex !== undefined && newIndex >= 0 && newIndex <= node.children.length) {
        node.children.splice(newIndex, 0, componentToMove);
      } else {
        node.children.push(componentToMove);
      }
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (findNewParent(child)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Add to new parent
  const added = findNewParent(project.structure);
  if (!added) {
    // If new parent not found, add back to old parent
    if (!oldParent.children) {
      oldParent.children = [];
    }
    oldParent.children.push(componentToMove);
    throw new Error(`New parent component not found: ${newParentId}`);
  }
  
  // Update project
  project.updatedAt = new Date().toISOString();
  await saveProject(projectId, project);
  
  return project.structure;
};

// Helper to delete component from project
const deleteProjectComponent = async ({ projectId, componentId }) => {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Helper to recursively find and delete component
  const deleteComponent = (node) => {
    if (node.children) {
      const index = node.children.findIndex(child => child.id === componentId);
      if (index !== -1) {
        node.children.splice(index, 1);
        return true;
      }
      
      for (const child of node.children) {
        if (deleteComponent(child)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Delete component
  const deleted = deleteComponent(project.structure);
  if (!deleted) {
    throw new Error(`Component not found: ${componentId}`);
  }
  
  // Update project
  project.updatedAt = new Date().toISOString();
  await saveProject(projectId, project);
  
  return project.structure;
};

// Helper to generate recommendations for project structure
const generateRecommendations = async ({ projectId }) => {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Analyze project structure and generate recommendations
  // This is a simplified mock implementation
  const recommendations = [];
  
  // Check for appropriate number of phases
  const phaseCount = countComponentsByType(project.structure, 'phase');
  if (phaseCount < 2) {
    recommendations.push({
      id: uuidv4(),
      title: 'Add more phases',
      description: 'Your project structure should have at least 2-4 phases for better organization.',
      priority: 'medium',
      affectedComponents: ['project root']
    });
  }
  
  // Check for empty modules
  const emptyModules = findEmptyModules(project.structure);
  if (emptyModules.length > 0) {
    recommendations.push({
      id: uuidv4(),
      title: 'Add features to empty modules',
      description: `You have ${emptyModules.length} empty modules that should contain features.`,
      priority: 'high',
      affectedComponents: emptyModules
    });
  }
  
  // Check for imbalanced modules
  const moduleStats = analyzeModuleBalance(project.structure);
  if (moduleStats.imbalanced) {
    recommendations.push({
      id: uuidv4(),
      title: 'Balance features across modules',
      description: `Feature distribution is imbalanced. Some modules have ${moduleStats.max} features while others have only ${moduleStats.min}.`,
      priority: 'medium',
      affectedComponents: moduleStats.imbalancedModules
    });
  }
  
  // Add some template-specific recommendations
  if (project.templateType === 'sdk-first') {
    recommendations.push({
      id: uuidv4(),
      title: 'Add SDK integration features',
      description: 'SDK-First projects should have specific features for API integration and SDK client development.',
      priority: 'medium',
      affectedComponents: ['SDK Integration Layer']
    });
  } else if (project.templateType === 'agent-ecosystem') {
    recommendations.push({
      id: uuidv4(),
      title: 'Verify agent handoff patterns',
      description: 'Ensure all agents have defined handoff patterns to create a cohesive system.',
      priority: 'high',
      affectedComponents: ['Project Architect Agent', 'Detail Agent']
    });
  }
  
  return recommendations;
};

// Helper to count components by type
const countComponentsByType = (node, type) => {
  let count = 0;
  
  if (node.type === type) {
    count++;
  }
  
  if (node.children) {
    for (const child of node.children) {
      count += countComponentsByType(child, type);
    }
  }
  
  return count;
};

// Helper to find empty modules
const findEmptyModules = (node, result = []) => {
  if (node.type === 'module' && (!node.children || node.children.length === 0)) {
    result.push(node.name);
  }
  
  if (node.children) {
    for (const child of node.children) {
      findEmptyModules(child, result);
    }
  }
  
  return result;
};

// Helper to analyze module balance
const analyzeModuleBalance = (node) => {
  const moduleCounts = {};
  const countFeatures = (n, module) => {
    if (n.type === 'module') {
      moduleCounts[n.name] = 0;
      module = n.name;
    } else if (n.type === 'feature' && module) {
      moduleCounts[module]++;
    }
    
    if (n.children) {
      for (const child of n.children) {
        countFeatures(child, module);
      }
    }
  };
  
  countFeatures(node, null);
  
  const counts = Object.values(moduleCounts).filter(count => count > 0);
  if (counts.length === 0) {
    return { imbalanced: false, min: 0, max: 0, imbalancedModules: [] };
  }
  
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const imbalanced = max > min * 2; // Check if any module has 2x more features than others
  
  const imbalancedModules = [];
  if (imbalanced) {
    for (const [module, count] of Object.entries(moduleCounts)) {
      if (count === min || count === max) {
        imbalancedModules.push(module);
      }
    }
  }
  
  return {
    imbalanced,
    min,
    max,
    imbalancedModules
  };
};

// Helper to balance project structure
const balanceProjectStructure = async ({ projectId }) => {
  const project = await loadProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // This is a mock implementation that simulates AI rebalancing
  // It applies some basic balance improvements to demonstrate functionality
  
  // Find all modules and features
  const structure = project.structure;
  const modules = [];
  const features = [];
  
  const collectComponents = (node, path = []) => {
    const currentPath = [...path, node.name];
    
    if (node.type === 'module') {
      modules.push({ node, path: currentPath });
    } else if (node.type === 'feature') {
      features.push({ node, path: currentPath });
    }
    
    if (node.children) {
      for (const child of node.children) {
        collectComponents(child, currentPath);
      }
    }
  };
  
  collectComponents(structure);
  
  // Count features per module
  const moduleFeatureCounts = modules.map(module => {
    const moduleFeatures = features.filter(feature => 
      feature.path.includes(module.node.name)
    );
    return {
      module: module.node,
      count: moduleFeatures.length,
      features: moduleFeatures
    };
  });
  
  // Find imbalanced modules
  const counts = moduleFeatureCounts.map(m => m.count);
  const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  
  // Identify overloaded and underloaded modules
  const overloaded = moduleFeatureCounts.filter(m => m.count > avgCount * 1.5);
  const underloaded = moduleFeatureCounts.filter(m => m.count < avgCount * 0.5);
  
  // Balance by moving features from overloaded to underloaded modules
  if (overloaded.length > 0 && underloaded.length > 0) {
    for (const under of underloaded) {
      for (const over of overloaded) {
        if (over.count <= avgCount) break;
        
        // Move one feature from overloaded to underloaded
        if (over.features.length > 0) {
          const featureToMove = over.features.pop();
          
          // Remove from original parent
          const removeFromParent = (node, featureId) => {
            if (node.children) {
              const index = node.children.findIndex(child => child.id === featureId);
              if (index !== -1) {
                node.children.splice(index, 1);
                return true;
              }
              
              for (const child of node.children) {
                if (removeFromParent(child, featureId)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          removeFromParent(structure, featureToMove.node.id);
          
          // Add to new parent
          if (!under.module.children) {
            under.module.children = [];
          }
          
          under.module.children.push(featureToMove.node);
          over.count--;
          under.count++;
        }
      }
    }
  }
  
  // Update project
  project.updatedAt = new Date().toISOString();
  await saveProject(projectId, project);
  
  return project.structure;
};

// GET /list
// List all projects
router.get('/list', async (req, res) => {
  try {
    const projects = await listAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /get-structure/:projectId
// Get project structure
router.get('/get-structure/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await loadProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project.structure);
  } catch (error) {
    console.error('Error retrieving project structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /initialize
// Initialize a new project
router.post('/initialize', async (req, res) => {
  try {
    const { projectName, description, templateType } = req.body;
    
    // Validate required parameters
    if (!projectName || !templateType) {
      return res.status(400).json({ 
        error: 'Missing required parameters: projectName and templateType are required' 
      });
    }
    
    // Create project with structure agent assistance
    const result = await invokeStructureAgent('initialize', {
      projectName,
      description: description || '',
      templateType
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error initializing project structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /add-component/:projectId
// Add a component to a project
router.post('/add-component/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const componentData = req.body;
    
    // Validate required parameters
    if (!componentData.name || !componentData.type) {
      return res.status(400).json({ 
        error: 'Missing required parameters: name and type are required' 
      });
    }
    
    // Add component with structure agent assistance
    const result = await invokeStructureAgent('add-component', {
      projectId,
      componentData
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error adding component:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /update-component/:projectId/:componentId
// Update a component in a project
router.put('/update-component/:projectId/:componentId', async (req, res) => {
  try {
    const { projectId, componentId } = req.params;
    const updateData = req.body;
    
    // Update component with structure agent assistance
    const result = await invokeStructureAgent('update-component', {
      projectId,
      componentId,
      updateData
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /move-component/:projectId/:componentId
// Move a component in a project
router.post('/move-component/:projectId/:componentId', async (req, res) => {
  try {
    const { projectId, componentId } = req.params;
    const { newParentId, newIndex } = req.body;
    
    // Validate required parameters
    if (!newParentId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: newParentId is required' 
      });
    }
    
    // Move component with structure agent assistance
    const result = await invokeStructureAgent('move-component', {
      projectId,
      componentId,
      newParentId,
      newIndex
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error moving component:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /delete-component/:projectId/:componentId
// Delete a component from a project
router.delete('/delete-component/:projectId/:componentId', async (req, res) => {
  try {
    const { projectId, componentId } = req.params;
    
    // Delete component with structure agent assistance
    const result = await invokeStructureAgent('delete-component', {
      projectId,
      componentId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting component:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /balance/:projectId
// Rebalance project structure
router.post('/balance/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const options = req.body || {};
    
    // Rebalance structure with agent assistance
    const result = await invokeStructureAgent('balance', {
      projectId,
      ...options
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error rebalancing structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /recommendations/:projectId
// Get improvement recommendations for a project
router.get('/recommendations/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get recommendations with agent assistance
    const result = await invokeStructureAgent('recommendations', {
      projectId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;