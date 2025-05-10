/**
 * DatabaseHelper.js
 * 
 * Utility for managing database interactions with browser and Node.js support.
 * Uses IndexedDB/localStorage in browser and SQLite in Node.js.
 * 
 * IMPORTANT: This file is structured to be Vite HMR friendly.
 */

// Constants
const DB_NAME = 'devloop_ui_changelog';
const DB_VERSION = 1;

// Store names
export const STORES = {
  CHANGES: 'changes',
  SNAPSHOTS: 'visual_snapshots',
  HISTORY: 'component_history',
  ROLLBACKS: 'rollback_events',
  FEATURES: 'features',
  DEPENDENCIES: 'dependencies',
  DECISIONS: 'technical_decisions',
  CONTEXT: 'session_context'
};

// Memory cache for better performance
const cache = {
  changes: new Map(),
  snapshots: new Map(),
  history: new Map(),
  rollbacks: new Map(),
  features: new Map(),
  dependencies: new Map(),
  technical_decisions: new Map(),
  session_context: new Map(),
  decisions: new Map(),
  context: new Map()
};

// Environment detection
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && 
              process.versions && 
              process.versions.node && 
              !isBrowser;

// This function is only used in Node.js context and won't be included in browser bundles
// thanks to Vite's tree-shaking, as long as it's not called from browser-executed code
const initSqlite = async () => {
  // Early return if in browser - Vite will exclude this code
  if (isBrowser) return null;
  
  try {
    // Static require - this will only execute in Node.js
    // Wrapped in a conditional that Vite can optimize out
    let db = null;
    if (isNode) {
      try {
        // Try dynamic import first (ESM)
        const sqlite3Module = await import('better-sqlite3');
        const betterSqlite3 = sqlite3Module.default;
        db = betterSqlite3('./data/devloop.db');
      } catch (e) {
        console.log('Fallback to CommonJS require');
        // Fallback to commonjs require
        const betterSqlite3 = require('better-sqlite3');
        db = betterSqlite3('./data/devloop.db');
      }
      
      // Create tables if they don't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${STORES.CHANGES} (
          id TEXT PRIMARY KEY,
          componentName TEXT,
          timestamp TEXT,
          changeType TEXT,
          data TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.SNAPSHOTS} (
          id TEXT PRIMARY KEY,
          componentName TEXT,
          timestamp TEXT,
          changeId TEXT,
          data TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.HISTORY} (
          id TEXT PRIMARY KEY,
          componentName TEXT,
          timestamp TEXT,
          data TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.ROLLBACKS} (
          id TEXT PRIMARY KEY,
          componentName TEXT,
          timestamp TEXT,
          data TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.FEATURES} (
          id TEXT PRIMARY KEY,
          name TEXT,
          type TEXT,
          status TEXT,
          module TEXT,
          description TEXT,
          dependencies TEXT,
          implementation TEXT,
          timestamp TEXT,
          data TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.DEPENDENCIES} (
          id TEXT PRIMARY KEY,
          sourceId TEXT,
          targetId TEXT,
          type TEXT,
          strength TEXT,
          description TEXT,
          timestamp TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.DECISIONS} (
          id TEXT PRIMARY KEY,
          title TEXT,
          category TEXT,
          description TEXT,
          rationale TEXT,
          alternatives TEXT,
          timestamp TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ${STORES.CONTEXT} (
          id TEXT PRIMARY KEY,
          category TEXT,
          key TEXT,
          value TEXT,
          timestamp TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_changes_component ON ${STORES.CHANGES} (componentName);
        CREATE INDEX IF NOT EXISTS idx_changes_timestamp ON ${STORES.CHANGES} (timestamp);
        CREATE INDEX IF NOT EXISTS idx_changes_type ON ${STORES.CHANGES} (changeType);
        
        CREATE INDEX IF NOT EXISTS idx_snapshots_component ON ${STORES.SNAPSHOTS} (componentName);
        CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON ${STORES.SNAPSHOTS} (timestamp);
        CREATE INDEX IF NOT EXISTS idx_snapshots_change ON ${STORES.SNAPSHOTS} (changeId);
        
        CREATE INDEX IF NOT EXISTS idx_features_name ON ${STORES.FEATURES} (name);
        CREATE INDEX IF NOT EXISTS idx_features_status ON ${STORES.FEATURES} (status);
        CREATE INDEX IF NOT EXISTS idx_features_module ON ${STORES.FEATURES} (module);
        
        CREATE INDEX IF NOT EXISTS idx_dependencies_source ON ${STORES.DEPENDENCIES} (sourceId);
        CREATE INDEX IF NOT EXISTS idx_dependencies_target ON ${STORES.DEPENDENCIES} (targetId);
        
        CREATE INDEX IF NOT EXISTS idx_decisions_category ON ${STORES.DECISIONS} (category);
        
        CREATE INDEX IF NOT EXISTS idx_context_category ON ${STORES.CONTEXT} (category);
        CREATE INDEX IF NOT EXISTS idx_context_key ON ${STORES.CONTEXT} (key);
      `);
    }
    
    return db;
  } catch (error) {
    console.error('Error initializing SQLite (this is expected in browser):', error);
    return null;
  }
};

// SQLite instance cache (only used in Node.js)
let sqliteDb = null;

/**
 * Get the correct cache key for a store name
 */
const getCacheKey = (storeName) => {
  const storeKey = storeName.toLowerCase();
  
  // Map store names to cache keys
  const mapping = {
    [STORES.DECISIONS.toLowerCase()]: 'technical_decisions',
    [STORES.CONTEXT.toLowerCase()]: 'session_context'
  };
  
  return mapping[storeKey] || storeKey;
};

/**
 * Initialize the database connection
 * @returns {Promise<any>} Database instance or null if unavailable
 */
export const initDatabase = async () => {
  // For Node.js environment, use SQLite
  if (isNode && !isBrowser) {
    if (!sqliteDb) {
      sqliteDb = await initSqlite();
    }
    return sqliteDb;
  }
  
  // For browser environment, use IndexedDB or localStorage
  if (isBrowser) {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, will use localStorage fallback');
        resolve(null);
        return;
      }
      
      // Open database connection
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      // Handle errors
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };
      
      // Handle successful connection
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      // Create/upgrade schema
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CHANGES)) {
          const changesStore = db.createObjectStore(STORES.CHANGES, { keyPath: 'id' });
          changesStore.createIndex('componentName', 'componentName', { unique: false });
          changesStore.createIndex('timestamp', 'timestamp', { unique: false });
          changesStore.createIndex('changeType', 'details.changeType', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
          const snapshotsStore = db.createObjectStore(STORES.SNAPSHOTS, { keyPath: 'id' });
          snapshotsStore.createIndex('componentName', 'componentName', { unique: false });
          snapshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
          snapshotsStore.createIndex('changeId', 'changeId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
          historyStore.createIndex('componentName', 'componentName', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.ROLLBACKS)) {
          const rollbacksStore = db.createObjectStore(STORES.ROLLBACKS, { keyPath: 'id' });
          rollbacksStore.createIndex('componentName', 'componentName', { unique: false });
          rollbacksStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // New stores for feature tracking
        if (!db.objectStoreNames.contains(STORES.FEATURES)) {
          const featuresStore = db.createObjectStore(STORES.FEATURES, { keyPath: 'id' });
          featuresStore.createIndex('name', 'name', { unique: false });
          featuresStore.createIndex('status', 'status', { unique: false });
          featuresStore.createIndex('module', 'module', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.DEPENDENCIES)) {
          const depsStore = db.createObjectStore(STORES.DEPENDENCIES, { keyPath: 'id' });
          depsStore.createIndex('sourceId', 'sourceId', { unique: false });
          depsStore.createIndex('targetId', 'targetId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.DECISIONS)) {
          const decisionsStore = db.createObjectStore(STORES.DECISIONS, { keyPath: 'id' });
          decisionsStore.createIndex('category', 'category', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.CONTEXT)) {
          const contextStore = db.createObjectStore(STORES.CONTEXT, { keyPath: 'id' });
          contextStore.createIndex('category', 'category', { unique: false });
          contextStore.createIndex('key', 'key', { unique: false });
        }
      };
    });
  }
  
  return Promise.resolve(null);
};

/**
 * Store an item in the database
 * @param {string} storeName - The name of the store to use
 * @param {Object} item - The item to store
 * @returns {Promise<string>} ID of the stored item
 */
export const storeItem = async (storeName, item) => {
  // Ensure the item has an ID
  if (!item.id) {
    item.id = `${storeName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // Ensure the item has a timestamp
  if (!item.timestamp) {
    item.timestamp = new Date().toISOString();
  }
  
  try {
    // Get the correct cache key and set in cache
    const cacheKey = getCacheKey(storeName);
    
    // Ensure cache exists
    if (!cache[cacheKey]) {
      console.warn(`Creating missing cache for ${cacheKey}`);
      cache[cacheKey] = new Map();
    }
    
    cache[cacheKey].set(item.id, item);
    
    // For Node.js environment, use SQLite
    if (isNode && !isBrowser) {
      const db = await initDatabase();
      
      if (db) {
        // SQLite implementation - specific to each store type
        if (storeName === STORES.FEATURES) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO ${storeName} 
            (id, name, type, status, module, description, dependencies, implementation, timestamp, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            item.id,
            item.name || '',
            item.type || '',
            item.status || '',
            item.module || '',
            item.description || '',
            JSON.stringify(item.dependencies || []),
            item.implementation || '',
            item.timestamp,
            JSON.stringify(item)
          );
        } 
        else if (storeName === STORES.DEPENDENCIES) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO ${storeName} 
            (id, sourceId, targetId, type, strength, description, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            item.id,
            item.sourceId || '',
            item.targetId || '',
            item.type || '',
            item.strength || '',
            item.description || '',
            item.timestamp
          );
        }
        else if (storeName === STORES.DECISIONS) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO ${storeName} 
            (id, title, category, description, rationale, alternatives, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            item.id,
            item.title || '',
            item.category || '',
            item.description || '',
            item.rationale || '',
            JSON.stringify(item.alternatives || []),
            item.timestamp
          );
        }
        else if (storeName === STORES.CONTEXT) {
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO ${storeName} 
            (id, category, key, value, timestamp)
            VALUES (?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            item.id,
            item.category || '',
            item.key || '',
            typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value),
            item.timestamp
          );
        }
        else {
          // Generic handling for other stores
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO ${storeName} 
            (id, componentName, timestamp, data)
            VALUES (?, ?, ?, ?)
          `);
          
          stmt.run(
            item.id,
            item.componentName || '',
            item.timestamp,
            JSON.stringify(item)
          );
        }
        
        return item.id;
      }
    }
    
    // For browser environment, use IndexedDB or localStorage
    if (isBrowser) {
      // Try to use IndexedDB
      const db = await initDatabase();
      
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          
          const request = store.put(item);
          
          request.onsuccess = () => {
            resolve(item.id);
          };
          
          request.onerror = (event) => {
            console.error(`Error storing item in ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      } else {
        // Fallback to localStorage
        const key = `devloop_${storeName.toLowerCase()}`;
        
        try {
          // Get existing items
          const items = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Add new item
          items.push(item);
          
          // Limit the number of items to prevent localStorage overflow
          const MAX_ITEMS = 100;
          if (items.length > MAX_ITEMS) {
            items.splice(0, items.length - MAX_ITEMS);
          }
          
          // Save back to localStorage
          localStorage.setItem(key, JSON.stringify(items));
          
          return item.id;
        } catch (error) {
          console.error(`Error storing item in localStorage (${key}):`, error);
          throw error;
        }
      }
    }
    
    // Return the ID even if we couldn't persist (at least it's in cache)
    return item.id;
  } catch (error) {
    console.error(`Error in storeItem(${storeName}):`, error);
    throw error;
  }
};

/**
 * Get an item from the database by ID
 * @param {string} storeName - The name of the store to use
 * @param {string} itemId - The ID of the item to get
 * @returns {Promise<Object>} The requested item or null if not found
 */
export const getItem = async (storeName, itemId) => {
  // Get the correct cache key
  const cacheKey = getCacheKey(storeName);
  
  // Ensure cache exists
  if (!cache[cacheKey]) {
    console.warn(`Creating missing cache for ${cacheKey}`);
    cache[cacheKey] = new Map();
  }
  
  // Check cache first
  if (cache[cacheKey].has(itemId)) {
    return cache[cacheKey].get(itemId);
  }
  
  try {
    // For Node.js environment, use SQLite
    if (isNode && !isBrowser) {
      const db = await initDatabase();
      
      if (db) {
        let row;
        
        // Generic query that works for all tables
        const stmt = db.prepare(`SELECT * FROM ${storeName} WHERE id = ?`);
        row = stmt.get(itemId);
        
        if (row) {
          // Parse JSON data for specific stores
          if (storeName === STORES.FEATURES) {
            row.dependencies = JSON.parse(row.dependencies || '[]');
          } else if (storeName === STORES.DECISIONS) {
            row.alternatives = JSON.parse(row.alternatives || '[]');
          } else if (storeName === STORES.CONTEXT) {
            try {
              row.value = JSON.parse(row.value);
            } catch {
              // Value is not JSON, keep as is
            }
          } else {
            // For other stores, parse the full data
            const fullData = JSON.parse(row.data || '{}');
            row = { ...row, ...fullData };
          }
          
          // Add to cache
          cache[cacheKey].set(itemId, row);
        }
        
        return row || null;
      }
    }
    
    // For browser environment, use IndexedDB or localStorage
    if (isBrowser) {
      // Try to use IndexedDB
      const db = await initDatabase();
      
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          
          const request = store.get(itemId);
          
          request.onsuccess = (event) => {
            const item = event.target.result;
            
            if (item) {
              // Add to cache
              cache[cacheKey].set(itemId, item);
            }
            
            resolve(item || null);
          };
          
          request.onerror = (event) => {
            console.error(`Error getting item from ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      } else {
        // Fallback to localStorage
        const key = `devloop_${storeName.toLowerCase()}`;
        
        try {
          const items = JSON.parse(localStorage.getItem(key) || '[]');
          const item = items.find(i => i.id === itemId) || null;
          
          if (item) {
            // Add to cache
            cache[cacheKey].set(itemId, item);
          }
          
          return item;
        } catch (error) {
          console.error(`Error getting item from localStorage (${key}):`, error);
          throw error;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error in getItem(${storeName}, ${itemId}):`, error);
    throw error;
  }
};

/**
 * Query items from the database
 * @param {string} storeName - The name of the store to use
 * @param {Function} filterFn - Optional filter function
 * @param {Object} indexInfo - Optional index information { indexName, key }
 * @returns {Promise<Array>} Matching items
 */
export const queryItems = async (storeName, filterFn = null, indexInfo = null) => {
  try {
    // For Node.js environment, use SQLite
    if (isNode && !isBrowser) {
      const db = await initDatabase();
      
      if (db) {
        let rows;
        
        if (indexInfo) {
          // Query with index
          const stmt = db.prepare(`SELECT * FROM ${storeName} WHERE ${indexInfo.indexName} = ?`);
          rows = stmt.all(indexInfo.key);
        } else {
          // Get all items
          const stmt = db.prepare(`SELECT * FROM ${storeName}`);
          rows = stmt.all();
        }
        
        // Process rows based on store type
        let processedRows = rows.map(row => {
          if (storeName === STORES.FEATURES) {
            return {
              ...row,
              dependencies: JSON.parse(row.dependencies || '[]')
            };
          } else if (storeName === STORES.DECISIONS) {
            return {
              ...row,
              alternatives: JSON.parse(row.alternatives || '[]')
            };
          } else if (storeName === STORES.CONTEXT) {
            try {
              return {
                ...row,
                value: JSON.parse(row.value)
              };
            } catch {
              return row;
            }
          } else {
            // For other stores, parse the full data
            try {
              const fullData = JSON.parse(row.data || '{}');
              return { ...row, ...fullData };
            } catch {
              return row;
            }
          }
        });
        
        // Apply filter if provided
        if (filterFn) {
          processedRows = processedRows.filter(filterFn);
        }
        
        // Cache results
        const cacheKey = getCacheKey(storeName);
        if (!cache[cacheKey]) cache[cacheKey] = new Map();
        
        processedRows.forEach(item => {
          cache[cacheKey].set(item.id, item);
        });
        
        return processedRows;
      }
    }
    
    // For browser environment, use IndexedDB or localStorage
    if (isBrowser) {
      // Try to use IndexedDB
      const db = await initDatabase();
      
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          
          let request;
          
          if (indexInfo) {
            const index = store.index(indexInfo.indexName);
            request = index.getAll(indexInfo.key);
          } else {
            request = store.getAll();
          }
          
          request.onsuccess = (event) => {
            let items = event.target.result || [];
            
            // Apply filter if provided
            if (filterFn) {
              items = items.filter(filterFn);
            }
            
            // Cache results
            const cacheKey = getCacheKey(storeName);
            if (!cache[cacheKey]) cache[cacheKey] = new Map();
            
            items.forEach(item => {
              cache[cacheKey].set(item.id, item);
            });
            
            resolve(items);
          };
          
          request.onerror = (event) => {
            console.error(`Error querying items from ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      } else {
        // Fallback to localStorage
        const key = `devloop_${storeName.toLowerCase()}`;
        
        try {
          let items = JSON.parse(localStorage.getItem(key) || '[]');
          
          // Apply filter if provided
          if (filterFn) {
            items = items.filter(filterFn);
          }
          // Apply index filter if provided
          else if (indexInfo) {
            items = items.filter(item => {
              // Handle nested properties for indexes like 'details.changeType'
              if (indexInfo.indexName.includes('.')) {
                const parts = indexInfo.indexName.split('.');
                let value = item;
                
                for (const part of parts) {
                  value = value?.[part];
                  if (value === undefined) break;
                }
                
                return value === indexInfo.key;
              }
              
              return item[indexInfo.indexName] === indexInfo.key;
            });
          }
          
          // Cache results
          const cacheKey = getCacheKey(storeName);
          if (!cache[cacheKey]) cache[cacheKey] = new Map();
          
          items.forEach(item => {
            cache[cacheKey].set(item.id, item);
          });
          
          return items;
        } catch (error) {
          console.error(`Error querying items from localStorage (${key}):`, error);
          throw error;
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Error in queryItems(${storeName}):`, error);
    throw error;
  }
};

/**
 * Delete an item from the database
 * @param {string} storeName - The name of the store to use
 * @param {string} itemId - The ID of the item to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteItem = async (storeName, itemId) => {
  // Remove from cache
  const cacheKey = getCacheKey(storeName);
  if (cache[cacheKey]) {
    cache[cacheKey].delete(itemId);
  }
  
  try {
    // For Node.js environment, use SQLite
    if (isNode && !isBrowser) {
      const db = await initDatabase();
      
      if (db) {
        const stmt = db.prepare(`DELETE FROM ${storeName} WHERE id = ?`);
        const result = stmt.run(itemId);
        return result.changes > 0;
      }
    }
    
    // For browser environment, use IndexedDB or localStorage
    if (isBrowser) {
      // Try to use IndexedDB
      const db = await initDatabase();
      
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          
          const request = store.delete(itemId);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            console.error(`Error deleting item from ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      } else {
        // Fallback to localStorage
        const key = `devloop_${storeName.toLowerCase()}`;
        
        try {
          const items = JSON.parse(localStorage.getItem(key) || '[]');
          const filteredItems = items.filter(item => item.id !== itemId);
          
          localStorage.setItem(key, JSON.stringify(filteredItems));
          
          return true;
        } catch (error) {
          console.error(`Error deleting item from localStorage (${key}):`, error);
          throw error;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error in deleteItem(${storeName}, ${itemId}):`, error);
    throw error;
  }
};

/**
 * Clear all items from a store
 * @param {string} storeName - The name of the store to clear
 * @returns {Promise<boolean>} Success status
 */
export const clearStore = async (storeName) => {
  // Clear cache for this store
  const cacheKey = getCacheKey(storeName);
  if (cache[cacheKey]) {
    cache[cacheKey].clear();
  }
  
  try {
    // For Node.js environment, use SQLite
    if (isNode && !isBrowser) {
      const db = await initDatabase();
      
      if (db) {
        const stmt = db.prepare(`DELETE FROM ${storeName}`);
        stmt.run();
        return true;
      }
    }
    
    // For browser environment, use IndexedDB or localStorage
    if (isBrowser) {
      // Try to use IndexedDB
      const db = await initDatabase();
      
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          
          const request = store.clear();
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            console.error(`Error clearing store ${storeName}:`, event.target.error);
            reject(event.target.error);
          };
        });
      } else {
        // Fallback to localStorage
        const key = `devloop_${storeName.toLowerCase()}`;
        
        try {
          localStorage.removeItem(key);
          return true;
        } catch (error) {
          console.error(`Error clearing localStorage (${key}):`, error);
          throw error;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error in clearStore(${storeName}):`, error);
    throw error;
  }
};

/**
 * Get items by component name
 * @param {string} storeName - The name of the store to use
 * @param {string} componentName - The name of the component
 * @returns {Promise<Array>} Matching items
 */
export const getItemsByComponent = async (storeName, componentName) => {
  return queryItems(storeName, null, {
    indexName: 'componentName',
    key: componentName
  });
};

/**
 * Get changes by type
 * @param {string} changeType - The type of changes to get
 * @returns {Promise<Array>} Matching changes
 */
export const getChangesByType = async (changeType) => {
  return queryItems(STORES.CHANGES, null, {
    indexName: 'details.changeType',
    key: changeType
  });
};

// Feature Management Functions

/**
 * Store a feature in the database
 * @param {Object} feature - The feature to store
 * @returns {Promise<string>} ID of the stored feature
 */
export const storeFeature = async (feature) => {
  return storeItem(STORES.FEATURES, feature);
};

/**
 * Get a feature by ID
 * @param {string} featureId - The ID of the feature to get
 * @returns {Promise<Object>} The requested feature or null if not found
 */
export const getFeature = async (featureId) => {
  return getItem(STORES.FEATURES, featureId);
};

/**
 * Get features by status
 * @param {string} status - The status to filter by
 * @returns {Promise<Array>} Matching features
 */
export const getFeaturesByStatus = async (status) => {
  return queryItems(STORES.FEATURES, null, {
    indexName: 'status',
    key: status
  });
};

/**
 * Get features by module
 * @param {string} module - The module to filter by
 * @returns {Promise<Array>} Matching features
 */
export const getFeaturesByModule = async (module) => {
  return queryItems(STORES.FEATURES, null, {
    indexName: 'module',
    key: module
  });
};

/**
 * Store a dependency between features
 * @param {Object} dependency - The dependency to store
 * @returns {Promise<string>} ID of the stored dependency
 */
export const storeDependency = async (dependency) => {
  return storeItem(STORES.DEPENDENCIES, dependency);
};

/**
 * Get all dependencies for a feature
 * @param {string} featureId - The ID of the feature
 * @returns {Promise<Array>} Dependencies where this feature is the source
 */
export const getDependenciesForFeature = async (featureId) => {
  return queryItems(STORES.DEPENDENCIES, null, {
    indexName: 'sourceId',
    key: featureId
  });
};

/**
 * Get all dependencies that target a feature
 * @param {string} featureId - The ID of the feature
 * @returns {Promise<Array>} Dependencies where this feature is the target
 */
export const getDependantsForFeature = async (featureId) => {
  return queryItems(STORES.DEPENDENCIES, null, {
    indexName: 'targetId',
    key: featureId
  });
};

/**
 * Store a technical decision
 * @param {Object} decision - The decision to store
 * @returns {Promise<string>} ID of the stored decision
 */
export const storeDecision = async (decision) => {
  return storeItem(STORES.DECISIONS, decision);
};

/**
 * Get a decision by ID
 * @param {string} decisionId - The ID of the decision to get
 * @returns {Promise<Object>} The requested decision or null if not found
 */
export const getDecision = async (decisionId) => {
  return getItem(STORES.DECISIONS, decisionId);
};

/**
 * Get decisions by category
 * @param {string} category - The category to filter by
 * @returns {Promise<Array>} Matching decisions
 */
export const getDecisionsByCategory = async (category) => {
  return queryItems(STORES.DECISIONS, null, {
    indexName: 'category',
    key: category
  });
};

// Session Context Management

/**
 * Save a context value
 * @param {string} category - The context category
 * @param {string} key - The context key
 * @param {any} value - The value to store
 * @returns {Promise<string>} ID of the stored context item
 */
export const saveContext = async (category, key, value) => {
  const contextId = `context-${category}-${key}`;
  return storeItem(STORES.CONTEXT, {
    id: contextId,
    category,
    key,
    value,
  });
};

/**
 * Get a context value
 * @param {string} category - The context category
 * @param {string} key - The context key
 * @returns {Promise<any>} The context value or null if not found
 */
export const getContext = async (category, key) => {
  const contextId = `context-${category}-${key}`;
  const item = await getItem(STORES.CONTEXT, contextId);
  return item ? item.value : null;
};

/**
 * Get all context values for a category
 * @param {string} category - The context category
 * @returns {Promise<Object>} Object containing all key-value pairs for the category
 */
export const getCategoryContext = async (category) => {
  const items = await queryItems(STORES.CONTEXT, null, {
    indexName: 'category',
    key: category
  });
  
  const result = {};
  for (const item of items) {
    result[item.key] = item.value;
  }
  
  return result;
};

/**
 * Delete a context value
 * @param {string} category - The context category
 * @param {string} key - The context key
 * @returns {Promise<boolean>} Success status
 */
export const deleteContext = async (category, key) => {
  const contextId = `context-${category}-${key}`;
  return deleteItem(STORES.CONTEXT, contextId);
};