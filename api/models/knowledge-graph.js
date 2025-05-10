/**
 * Knowledge Graph Model
 * 
 * Provides a file-based knowledge graph implementation for storing
 * and retrieving entities and relationships.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Storage constants
const KG_STORAGE_DIR = path.join(os.homedir(), '.knowledge_graph');
const ENTITIES_FILE = path.join(KG_STORAGE_DIR, 'entities.json');
const RELATIONSHIPS_FILE = path.join(KG_STORAGE_DIR, 'relationships.json');

// Ensure storage exists
async function ensureStorage() {
  try {
    await fs.mkdir(KG_STORAGE_DIR, { recursive: true });
    
    // Initialize files if they don't exist
    if (!await fileExists(ENTITIES_FILE)) {
      await fs.writeFile(ENTITIES_FILE, JSON.stringify({}));
    }
    
    if (!await fileExists(RELATIONSHIPS_FILE)) {
      await fs.writeFile(RELATIONSHIPS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Failed to initialize knowledge graph storage:', error);
    throw error;
  }
}

// Helper to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
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
    console.log(`Saved ${Object.keys(entities).length} entities to storage`);
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
    console.log(`Saved ${relationships.length} relationships to storage`);
  } catch (error) {
    console.error('Error saving relationships:', error);
    throw error;
  }
}

// Create a new entity
async function createEntity(id, type, properties = {}) {
  const entities = await loadEntities();
  
  // Check if entity already exists
  if (entities[id]) {
    throw new Error(`Entity with ID ${id} already exists`);
  }
  
  // Create new entity
  const entity = {
    id,
    labels: [type.charAt(0).toUpperCase() + type.slice(1)],
    properties: {
      ...properties,
      created_at: new Date().toISOString()
    }
  };
  
  // Add to entities
  entities[id] = entity;
  
  // Save to storage
  await saveEntities(entities);
  
  return entity;
}

// Update an entity
async function updateEntity(id, properties = {}) {
  const entities = await loadEntities();
  
  // Check if entity exists
  if (!entities[id]) {
    throw new Error(`Entity with ID ${id} not found`);
  }
  
  // Update properties
  const updated = {
    ...entities[id],
    properties: {
      ...entities[id].properties,
      ...properties,
      updated_at: new Date().toISOString()
    }
  };
  
  // Save entity
  entities[id] = updated;
  
  // Save to storage
  await saveEntities(entities);
  
  return updated;
}

// Get an entity by ID
async function getEntity(id) {
  const entities = await loadEntities();
  return entities[id] || null;
}

// Delete an entity
async function deleteEntity(id) {
  const entities = await loadEntities();
  const relationships = await loadRelationships();
  
  // Check if entity exists
  if (!entities[id]) {
    throw new Error(`Entity with ID ${id} not found`);
  }
  
  // Remove entity
  delete entities[id];
  
  // Remove any relationships involving this entity
  const filteredRelationships = relationships.filter(
    rel => rel.from !== id && rel.to !== id
  );
  
  // Save changes
  await saveEntities(entities);
  await saveRelationships(filteredRelationships);
  
  return { success: true };
}

// Create a relationship
async function createRelationship(fromId, toId, type, properties = {}) {
  const entities = await loadEntities();
  const relationships = await loadRelationships();
  
  // Check if entities exist
  if (!entities[fromId]) {
    throw new Error(`Source entity ${fromId} not found`);
  }
  
  if (!entities[toId]) {
    throw new Error(`Target entity ${toId} not found`);
  }
  
  // Create relationship
  const relationship = {
    from: fromId,
    to: toId,
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
  
  return relationship;
}

// Find entities by type
async function findEntities(type = null, properties = {}) {
  const entities = await loadEntities();
  
  return Object.values(entities).filter(entity => {
    // Filter by type if specified
    if (type && !entity.labels.includes(type.charAt(0).toUpperCase() + type.slice(1))) {
      return false;
    }
    
    // Filter by properties if specified
    for (const [key, value] of Object.entries(properties)) {
      if (entity.properties[key] !== value) {
        return false;
      }
    }
    
    return true;
  });
}

// Find relationships
async function findRelationships(fromId = null, toId = null, type = null) {
  const relationships = await loadRelationships();
  
  return relationships.filter(rel => {
    if (fromId && rel.from !== fromId) {
      return false;
    }
    
    if (toId && rel.to !== toId) {
      return false;
    }
    
    if (type && rel.type !== type) {
      return false;
    }
    
    return true;
  });
}

// Helper function to generate a stable ID from a name
function generateId(prefix, name) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `${prefix}:${safeName}`;
}

// Format for UI
function transformEntityForUI(entity) {
  // Convert KG entity to UI-expected format
  const { id, labels = [], properties = {} } = entity;
  
  // Special case for features
  if (labels.includes('Feature') || id.startsWith('feature:')) {
    return {
      id,
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
  
  // Special case for tasks
  if (labels.includes('Task') || id.startsWith('task:')) {
    return {
      id,
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
  
  // Default case
  return {
    id,
    type: labels[0] || 'unknown',
    properties
  };
}

module.exports = {
  // Core functions
  loadEntities,
  saveEntities,
  loadRelationships,
  saveRelationships,
  createEntity,
  updateEntity,
  getEntity,
  deleteEntity,
  createRelationship,
  findEntities,
  findRelationships,
  
  // Helper functions
  generateId,
  transformEntityForUI,
  
  // Constants
  KG_STORAGE_DIR,
  ENTITIES_FILE,
  RELATIONSHIPS_FILE
};