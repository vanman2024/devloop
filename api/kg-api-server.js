/**
 * Knowledge Graph API Server
 * 
 * This Express server provides API endpoints that serve knowledge graph data
 * to the UI in the format it expects. It reads from our knowledge graph database
 * (or the local JSON files if the database isn't ready) and transforms the data
 * into the structure needed by the UI components.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Storage paths for local files (fallback when DB isn't ready)
const KG_STORAGE_DIR = path.join(process.env.HOME || require('os').homedir(), '.kg_manager');
const ENTITIES_FILE = path.join(KG_STORAGE_DIR, 'entities.json');
const RELATIONSHIPS_FILE = path.join(KG_STORAGE_DIR, 'relationships.json');

// Helper function to load data from local storage
function loadLocalData() {
  let entities = {};
  let relationships = [];
  
  try {
    if (fs.existsSync(ENTITIES_FILE)) {
      entities = JSON.parse(fs.readFileSync(ENTITIES_FILE, 'utf8'));
    }
    
    if (fs.existsSync(RELATIONSHIPS_FILE)) {
      relationships = JSON.parse(fs.readFileSync(RELATIONSHIPS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading local data:', error);
  }
  
  return { entities, relationships };
}

// Helper function to transform entity data to format expected by UI
function transformEntityForUI(entity) {
  // Convert KG entity to UI-expected format
  const properties = {};
  
  // Merge properties and attributes
  if (entity.properties) {
    Object.assign(properties, entity.properties);
  }
  
  if (entity.attributes) {
    Object.entries(entity.attributes).forEach(([key, attr]) => {
      properties[key] = attr.value;
    });
  }
  
  const baseEntity = {
    id: entity.id,
    type: (entity.labels || [])[0] || 'unknown',
    properties
  };
  
  // Special case for features to match UI expectations
  if (baseEntity.type === 'Feature' || baseEntity.id.startsWith('feature:')) {
    return {
      id: entity.id,
      name: properties.name || '',
      description: properties.description || '',
      status: properties.status || 'not_started',
      milestone: properties.milestone || '',
      phase: properties.phase || '',
      module: properties.module || '',
      tags: properties.tags || [],
      lastUpdated: properties.updated_at || properties.created_at || new Date().toISOString()
    };
  }
  
  // Special case for tasks to match UI expectations
  if (baseEntity.type === 'Task' || baseEntity.id.startsWith('task:')) {
    return {
      id: entity.id,
      name: properties.name || '',
      description: properties.description || '',
      status: properties.status || 'not_started',
      priority: properties.priority || 'medium',
      progress: properties.progress || 0,
      owner: properties.owner || '',
      featureId: '', // Will be populated from relationships
      lastUpdated: properties.updated_at || properties.created_at || new Date().toISOString()
    };
  }
  
  // Default case - just return as is
  return baseEntity;
}

// GET /api/graph/nodes - Get all nodes of a specific type with optional filters
app.get('/api/graph/nodes', (req, res) => {
  try {
    // Get filter parameters
    const { type, milestone, phase, module, status } = req.query;
    
    // Load data (would be replaced with direct DB queries in production)
    const { entities } = loadLocalData();
    
    // Filter entities based on type
    let filteredEntities = Object.values(entities).filter(entity => {
      // Check if entity has the requested type
      if (type && (!entity.labels || !entity.labels.includes(type.charAt(0).toUpperCase() + type.slice(1)))) {
        return false;
      }
      
      // Apply additional filters if provided
      const props = { ...entity.properties };
      if (entity.attributes) {
        Object.entries(entity.attributes).forEach(([key, attr]) => {
          props[key] = attr.value;
        });
      }
      
      if (milestone && props.milestone !== milestone) {
        return false;
      }
      
      if (phase && props.phase !== phase) {
        return false;
      }
      
      if (module && props.module !== module) {
        return false;
      }
      
      if (status && props.status !== status) {
        return false;
      }
      
      return true;
    });
    
    // Transform entities to format expected by UI
    const results = filteredEntities.map(transformEntityForUI);
    
    res.json(results);
  } catch (error) {
    console.error('Error getting nodes:', error);
    res.status(500).json({ error: 'Failed to get nodes', details: error.message });
  }
});

// GET /api/graph/node/:id - Get a specific node by ID
app.get('/api/graph/node/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Load data
    const { entities } = loadLocalData();
    
    // Find entity
    const entity = entities[id];
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Transform and return
    res.json(transformEntityForUI(entity));
  } catch (error) {
    console.error('Error getting node:', error);
    res.status(500).json({ error: 'Failed to get node', details: error.message });
  }
});

// PUT /api/graph/node/:id - Update a node's properties
app.put('/api/graph/node/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { properties } = req.body;
    
    // Load data
    const { entities, relationships } = loadLocalData();
    
    // Find entity
    if (!entities[id]) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Update properties
    if (!entities[id].attributes) {
      entities[id].attributes = {};
    }
    
    // Update each property
    Object.entries(properties).forEach(([key, value]) => {
      entities[id].attributes[key] = {
        value,
        updated_at: new Date().toISOString()
      };
    });
    
    // Add updated_at timestamp
    entities[id].attributes.updated_at = {
      value: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Save changes
    fs.writeFileSync(ENTITIES_FILE, JSON.stringify(entities, null, 2));
    
    // Return updated entity
    res.json(transformEntityForUI(entities[id]));
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node', details: error.message });
  }
});

// POST /api/graph/nodes - Create a new node
app.post('/api/graph/nodes', (req, res) => {
  try {
    const { id, type, properties } = req.body;
    
    if (!id || !properties) {
      return res.status(400).json({ error: 'ID and properties are required' });
    }
    
    // Load data
    const { entities } = loadLocalData();
    
    // Check if entity already exists
    if (entities[id]) {
      return res.status(409).json({ error: 'Entity already exists' });
    }
    
    // Create new entity
    const labels = [type.charAt(0).toUpperCase() + type.slice(1)];
    const newEntity = {
      id,
      labels,
      properties: {
        ...properties,
        created_at: new Date().toISOString()
      }
    };
    
    // Add to entities
    entities[id] = newEntity;
    
    // Save changes
    fs.writeFileSync(ENTITIES_FILE, JSON.stringify(entities, null, 2));
    
    // Return created entity
    res.status(201).json(transformEntityForUI(newEntity));
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Failed to create node', details: error.message });
  }
});

// POST /api/graph/edges - Create a relationship
app.post('/api/graph/edges', (req, res) => {
  try {
    const { source, target, type, properties = {} } = req.body;
    
    if (!source || !target || !type) {
      return res.status(400).json({ error: 'Source, target, and type are required' });
    }
    
    // Load data
    const { entities, relationships } = loadLocalData();
    
    // Check if source and target exist
    if (!entities[source]) {
      return res.status(404).json({ error: `Source entity ${source} not found` });
    }
    
    if (!entities[target]) {
      return res.status(404).json({ error: `Target entity ${target} not found` });
    }
    
    // Create relationship
    const relationship = {
      from: source,
      to: target,
      type,
      properties: {
        ...properties,
        created_at: new Date().toISOString()
      }
    };
    
    // Add to relationships
    relationships.push(relationship);
    
    // Save changes
    fs.writeFileSync(RELATIONSHIPS_FILE, JSON.stringify(relationships, null, 2));
    
    // Return created relationship
    res.status(201).json(relationship);
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: 'Failed to create relationship', details: error.message });
  }
});

// GET /api/graph/edges - Get relationships with optional filters
app.get('/api/graph/edges', (req, res) => {
  try {
    // Get filter parameters
    const { source, target, type } = req.query;
    
    // Load data
    const { relationships } = loadLocalData();
    
    // Filter relationships
    let filteredRelationships = relationships;
    
    if (source) {
      filteredRelationships = filteredRelationships.filter(rel => rel.from === source);
    }
    
    if (target) {
      filteredRelationships = filteredRelationships.filter(rel => rel.to === target);
    }
    
    if (type) {
      filteredRelationships = filteredRelationships.filter(rel => rel.type === type);
    }
    
    res.json(filteredRelationships);
  } catch (error) {
    console.error('Error getting relationships:', error);
    res.status(500).json({ error: 'Failed to get relationships', details: error.message });
  }
});

// Feature Creation API endpoint stubs
// These are minimal implementations to support the UI without the full agent

// POST /api/v1/feature-creation/process
app.post('/api/v1/feature-creation/process', (req, res) => {
  // This would normally process a feature with the agent
  res.status(501).json({
    success: false,
    error: "Feature Creation Agent not available, falling back to Knowledge Graph direct integration"
  });
});

// POST /api/v1/feature-creation/analyze
app.post('/api/v1/feature-creation/analyze', (req, res) => {
  // This would normally analyze a feature with AI
  const { name, description } = req.body;
  
  // Very simple analysis
  const text = `${name} ${description}`.toLowerCase();
  const domain = 
    text.includes('test') ? 'testing' :
    text.includes('ui') || text.includes('interface') ? 'ui' :
    text.includes('git') || text.includes('github') ? 'integration' :
    text.includes('api') ? 'api' :
    'core';
  
  const purpose = 
    text.includes('add') || text.includes('creat') ? 'creation' :
    text.includes('fix') || text.includes('bug') ? 'bug-fix' :
    text.includes('enhanc') || text.includes('improv') ? 'enhancement' :
    text.includes('refactor') ? 'refactoring' :
    'feature';
  
  res.json({
    success: true,
    analysis: {
      domain,
      purpose,
      confidence: 0.7,
      keywords: name.toLowerCase().split(/[^\w]+/).filter(w => w.length > 3)
    }
  });
});

// GET /api/v1/feature-creation/status
app.get('/api/v1/feature-creation/status', (req, res) => {
  res.json({
    status: 'limited',
    available: false,
    message: 'Feature Creation Agent is not available, using fallback mode'
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Knowledge Graph API Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api/graph`);
  
  // Create storage directory if it doesn't exist
  if (!fs.existsSync(KG_STORAGE_DIR)) {
    fs.mkdirSync(KG_STORAGE_DIR, { recursive: true });
  }
  
  // Initialize entity and relationship files if they don't exist
  if (!fs.existsSync(ENTITIES_FILE)) {
    fs.writeFileSync(ENTITIES_FILE, '{}');
  }
  
  if (!fs.existsSync(RELATIONSHIPS_FILE)) {
    fs.writeFileSync(RELATIONSHIPS_FILE, '[]');
  }
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('Shutting down API server...');
  server.close(() => {
    console.log('API server stopped');
    process.exit(0);
  });
});

module.exports = server;