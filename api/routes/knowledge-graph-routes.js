/**
 * Knowledge Graph API Routes
 * 
 * This module provides API endpoints for interacting with the knowledge graph.
 * It allows for storing, retrieving, and querying knowledge graph data.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Constants
const KG_STORAGE_DIR = path.join(os.homedir(), '.kg_manager');
const ENTITIES_FILE = path.join(KG_STORAGE_DIR, 'entities.json');
const RELATIONSHIPS_FILE = path.join(KG_STORAGE_DIR, 'relationships.json');

// Ensure storage directory exists
async function ensureStorage() {
  try {
    await fs.mkdir(KG_STORAGE_DIR, { recursive: true });
    
    // Initialize files if they don't exist
    if (!await fileExists(ENTITIES_FILE)) {
      await fs.writeFile(ENTITIES_FILE, '{}');
    }
    
    if (!await fileExists(RELATIONSHIPS_FILE)) {
      await fs.writeFile(RELATIONSHIPS_FILE, '[]');
    }
  } catch (error) {
    console.error('Failed to initialize knowledge graph storage:', error);
    throw error;
  }
}

// Helper to check if file exists
async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

// Load entities from storage
async function loadEntities() {
  await ensureStorage();
  
  try {
    const data = await fs.readFile(ENTITIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading entities:', error);
    return {};
  }
}

// Save entities to storage
async function saveEntities(entities) {
  await ensureStorage();
  
  try {
    await fs.writeFile(ENTITIES_FILE, JSON.stringify(entities, null, 2));
  } catch (error) {
    console.error('Error saving entities:', error);
    throw error;
  }
}

// Load relationships from storage
async function loadRelationships() {
  await ensureStorage();
  
  try {
    const data = await fs.readFile(RELATIONSHIPS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading relationships:', error);
    return [];
  }
}

// Save relationships to storage
async function saveRelationships(relationships) {
  await ensureStorage();
  
  try {
    await fs.writeFile(RELATIONSHIPS_FILE, JSON.stringify(relationships, null, 2));
  } catch (error) {
    console.error('Error saving relationships:', error);
    throw error;
  }
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
  if (baseEntity.type === 'Feature' || entity.id.startsWith('feature:')) {
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
  if (baseEntity.type === 'Task' || entity.id.startsWith('task:')) {
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
router.get('/nodes', async (req, res) => {
  try {
    // Get filter parameters
    const { type, milestone, phase, module, status } = req.query;
    
    // Load data
    const entities = await loadEntities();
    
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
    
    // For tasks, add feature relationships
    if (type === 'task') {
      const relationships = await loadRelationships();
      
      results.forEach(task => {
        const rel = relationships.find(r => r.to === task.id && r.type === 'HAS_TASK');
        if (rel) {
          task.featureId = rel.from;
        }
      });
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error getting nodes:', error);
    res.status(500).json({ error: 'Failed to get nodes', details: error.message });
  }
});

// GET /api/graph/node/:id - Get a specific node by ID
router.get('/node/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Load data
    const entities = await loadEntities();
    
    // Find entity
    const entity = entities[id];
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Transform and return
    const result = transformEntityForUI(entity);
    
    // If this is a task, add feature relationship
    if (entity.labels.includes('Task') || id.startsWith('task:')) {
      const relationships = await loadRelationships();
      const rel = relationships.find(r => r.to === id && r.type === 'HAS_TASK');
      if (rel) {
        result.featureId = rel.from;
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting node:', error);
    res.status(500).json({ error: 'Failed to get node', details: error.message });
  }
});

// PUT /api/graph/node/:id - Update a node's properties
router.put('/node/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { properties } = req.body;
    
    // Load data
    const entities = await loadEntities();
    
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
    await saveEntities(entities);
    
    // Return updated entity
    res.json(transformEntityForUI(entities[id]));
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node', details: error.message });
  }
});

// POST /api/graph/nodes - Create a new node
router.post('/nodes', async (req, res) => {
  try {
    const { id, type, properties } = req.body;
    
    if (!id || !properties) {
      return res.status(400).json({ error: 'ID and properties are required' });
    }
    
    // Load data
    const entities = await loadEntities();
    
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
    await saveEntities(entities);
    
    // Return created entity
    res.status(201).json(transformEntityForUI(newEntity));
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Failed to create node', details: error.message });
  }
});

// POST /api/graph/edges - Create a relationship
router.post('/edges', async (req, res) => {
  try {
    const { source, target, type, properties = {} } = req.body;
    
    if (!source || !target || !type) {
      return res.status(400).json({ error: 'Source, target, and type are required' });
    }
    
    // Load data
    const entities = await loadEntities();
    const relationships = await loadRelationships();
    
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
    await saveRelationships(relationships);
    
    // Return created relationship
    res.status(201).json(relationship);
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: 'Failed to create relationship', details: error.message });
  }
});

// GET /api/graph/edges - Get relationships with optional filters
router.get('/edges', async (req, res) => {
  try {
    // Get filter parameters
    const { source, target, type } = req.query;
    
    // Load data
    const relationships = await loadRelationships();
    
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

// DELETE /api/graph/node/:id - Delete a node
router.delete('/node/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Load data
    const entities = await loadEntities();
    const relationships = await loadRelationships();
    
    // Check if entity exists
    if (!entities[id]) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    // Remove entity
    delete entities[id];
    
    // Remove any relationships involving this entity
    const newRelationships = relationships.filter(rel => 
      rel.from !== id && rel.to !== id
    );
    
    // Save changes
    await saveEntities(entities);
    await saveRelationships(newRelationships);
    
    res.json({ success: true, message: `Entity ${id} deleted` });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node', details: error.message });
  }
});

// Export the router
module.exports = router;