/**
 * VisualSnapshot.js
 * 
 * Utility for capturing, storing, and comparing visual snapshots of React components.
 * Uses dom-to-image for capture and IndexedDB for storage with localStorage fallback.
 */

// Simple in-memory cache for frequently accessed snapshots
const snapshotCache = new Map();

// Constants
const DB_NAME = 'devloop_visual_snapshots';
const STORE_NAME = 'snapshots';
const DB_VERSION = 1;
const MAX_CACHE_SIZE = 20;
const LOCAL_STORAGE_FALLBACK_KEY = 'devloop_visual_snapshots_fallback';

/**
 * Initialize the IndexedDB database for storing snapshots
 * @returns {Promise<IDBDatabase>} - Database instance
 */
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Check for IndexedDB support
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      return resolve(null);
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for snapshots
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for faster querying
        store.createIndex('componentName', 'componentName', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('changeId', 'changeId', { unique: false });
      }
    };
  });
};

/**
 * Store a visual snapshot in the database
 * @param {Object} snapshot - The snapshot data to store
 * @param {string} snapshot.id - Unique ID for the snapshot
 * @param {string} snapshot.componentName - Name of the component
 * @param {string} snapshot.imageData - Base64 encoded image data
 * @param {string} snapshot.timestamp - ISO timestamp
 * @param {string} snapshot.changeId - ID of the related change
 * @param {Object} snapshot.metadata - Additional metadata
 * @returns {Promise<string>} - ID of the stored snapshot
 */
const storeSnapshot = async (snapshot) => {
  try {
    // Generate ID if not provided
    if (!snapshot.id) {
      snapshot.id = `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Add timestamp if not provided
    if (!snapshot.timestamp) {
      snapshot.timestamp = new Date().toISOString();
    }
    
    // Try to use IndexedDB first
    const db = await initDatabase();
    
    if (db) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.put(snapshot);
        
        request.onsuccess = () => {
          // Also cache in memory for faster access
          if (snapshotCache.size >= MAX_CACHE_SIZE) {
            // Remove oldest entry
            const firstKey = snapshotCache.keys().next().value;
            snapshotCache.delete(firstKey);
          }
          
          snapshotCache.set(snapshot.id, snapshot);
          resolve(snapshot.id);
        };
        
        request.onerror = (event) => {
          console.error('Error storing snapshot in IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } else {
      // Fallback to localStorage if IndexedDB not available
      try {
        const snapshots = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) || '[]');
        
        // Add new snapshot
        snapshots.push(snapshot);
        
        // Limit size of localStorage data
        if (snapshots.length > 50) {
          snapshots.shift(); // Remove oldest
        }
        
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(snapshots));
        
        // Also cache in memory
        if (snapshotCache.size >= MAX_CACHE_SIZE) {
          const firstKey = snapshotCache.keys().next().value;
          snapshotCache.delete(firstKey);
        }
        
        snapshotCache.set(snapshot.id, snapshot);
        
        return snapshot.id;
      } catch (error) {
        console.error('Error storing snapshot in localStorage:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error storing snapshot:', error);
    throw error;
  }
};

/**
 * Get a visual snapshot by ID
 * @param {string} snapshotId - The ID of the snapshot to retrieve
 * @returns {Promise<Object>} - The snapshot data
 */
const getSnapshot = async (snapshotId) => {
  // Check memory cache first for fastest access
  if (snapshotCache.has(snapshotId)) {
    return snapshotCache.get(snapshotId);
  }
  
  try {
    // Try IndexedDB
    const db = await initDatabase();
    
    if (db) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.get(snapshotId);
        
        request.onsuccess = (event) => {
          const snapshot = event.target.result;
          
          if (snapshot) {
            // Cache for faster future access
            if (snapshotCache.size >= MAX_CACHE_SIZE) {
              const firstKey = snapshotCache.keys().next().value;
              snapshotCache.delete(firstKey);
            }
            
            snapshotCache.set(snapshotId, snapshot);
          }
          
          resolve(snapshot || null);
        };
        
        request.onerror = (event) => {
          console.error('Error getting snapshot from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } else {
      // Fallback to localStorage
      try {
        const snapshots = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) || '[]');
        const snapshot = snapshots.find(s => s.id === snapshotId);
        
        if (snapshot) {
          // Cache for faster future access
          if (snapshotCache.size >= MAX_CACHE_SIZE) {
            const firstKey = snapshotCache.keys().next().value;
            snapshotCache.delete(firstKey);
          }
          
          snapshotCache.set(snapshotId, snapshot);
        }
        
        return snapshot || null;
      } catch (error) {
        console.error('Error getting snapshot from localStorage:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting snapshot:', error);
    throw error;
  }
};

/**
 * Get all snapshots for a component
 * @param {string} componentName - Name of the component
 * @returns {Promise<Array>} - Array of snapshot data
 */
const getSnapshotsByComponent = async (componentName) => {
  try {
    // Try IndexedDB
    const db = await initDatabase();
    
    if (db) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('componentName');
        
        const request = index.getAll(componentName);
        
        request.onsuccess = (event) => {
          const snapshots = event.target.result || [];
          
          // Sort by timestamp, newest first
          snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          resolve(snapshots);
        };
        
        request.onerror = (event) => {
          console.error('Error getting snapshots from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } else {
      // Fallback to localStorage
      try {
        const snapshots = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) || '[]');
        const componentSnapshots = snapshots.filter(s => s.componentName === componentName);
        
        // Sort by timestamp, newest first
        componentSnapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return componentSnapshots;
      } catch (error) {
        console.error('Error getting snapshots from localStorage:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting snapshots by component:', error);
    throw error;
  }
};

/**
 * Get snapshots associated with a change ID
 * @param {string} changeId - ID of the change
 * @returns {Promise<Array>} - Array of snapshot data
 */
const getSnapshotsByChangeId = async (changeId) => {
  try {
    // Try IndexedDB
    const db = await initDatabase();
    
    if (db) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('changeId');
        
        const request = index.getAll(changeId);
        
        request.onsuccess = (event) => {
          resolve(event.target.result || []);
        };
        
        request.onerror = (event) => {
          console.error('Error getting snapshots from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } else {
      // Fallback to localStorage
      try {
        const snapshots = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) || '[]');
        return snapshots.filter(s => s.changeId === changeId);
      } catch (error) {
        console.error('Error getting snapshots from localStorage:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting snapshots by change ID:', error);
    throw error;
  }
};

/**
 * Delete a snapshot by ID
 * @param {string} snapshotId - ID of the snapshot to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteSnapshot = async (snapshotId) => {
  // Remove from memory cache if present
  snapshotCache.delete(snapshotId);
  
  try {
    // Try IndexedDB
    const db = await initDatabase();
    
    if (db) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(snapshotId);
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Error deleting snapshot from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } else {
      // Fallback to localStorage
      try {
        const snapshots = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY) || '[]');
        const filteredSnapshots = snapshots.filter(s => s.id !== snapshotId);
        
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(filteredSnapshots));
        
        return true;
      } catch (error) {
        console.error('Error deleting snapshot from localStorage:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    throw error;
  }
};

/**
 * Capture a visual snapshot of a DOM element
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} componentName - Name of the component
 * @param {string} changeId - ID of the related change
 * @param {Object} metadata - Additional metadata about the snapshot
 * @returns {Promise<string>} - ID of the stored snapshot
 */
const captureElement = async (element, componentName, changeId, metadata = {}) => {
  try {
    // In a real implementation, this would use a library like dom-to-image or html2canvas
    // For this prototype, we'll use a placeholder
    
    // Simulated image data - in a real implementation, this would be:
    // const imageData = await domtoimage.toPng(element);
    const imageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    
    const snapshot = {
      componentName,
      imageData,
      timestamp: new Date().toISOString(),
      changeId,
      metadata: {
        ...metadata,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        userAgent: navigator.userAgent
      }
    };
    
    // Store the snapshot
    return await storeSnapshot(snapshot);
  } catch (error) {
    console.error('Error capturing element:', error);
    throw error;
  }
};

/**
 * Generate a visual diff between two snapshots
 * @param {string} snapshotId1 - ID of the first snapshot
 * @param {string} snapshotId2 - ID of the second snapshot
 * @returns {Promise<Object>} - Diff data including change percentage and hotspots
 */
const generateVisualDiff = async (snapshotId1, snapshotId2) => {
  try {
    // Get both snapshots
    const snapshot1 = await getSnapshot(snapshotId1);
    const snapshot2 = await getSnapshot(snapshotId2);
    
    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }
    
    // In a real implementation, this would use a pixel-by-pixel comparison
    // or a visual diff library to generate actual diff data
    
    // For this prototype, we'll return mock diff data
    return {
      changePercentage: Math.floor(Math.random() * 30) + 5, // 5-35%
      hotspots: [
        { x: 120, y: 80, radius: 20, intensity: 0.8 },
        { x: 240, y: 150, radius: 15, intensity: 0.6 }
      ],
      // Timestamps for reference
      before: snapshot1.timestamp,
      after: snapshot2.timestamp
    };
  } catch (error) {
    console.error('Error generating visual diff:', error);
    throw error;
  }
};

/**
 * Clear all snapshot data (for testing or reset)
 * @returns {Promise<boolean>} - Success status
 */
const clearAllSnapshots = async () => {
  // Clear memory cache
  snapshotCache.clear();
  
  try {
    // Try IndexedDB
    const db = await initDatabase();
    
    if (db) {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (event) => {
          console.error('Error clearing snapshots from IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    } else {
      // Fallback to localStorage
      try {
        localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
        return true;
      } catch (error) {
        console.error('Error clearing snapshots from localStorage:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error clearing snapshots:', error);
    throw error;
  }
};

export {
  initDatabase,
  storeSnapshot,
  getSnapshot,
  getSnapshotsByComponent,
  getSnapshotsByChangeId,
  deleteSnapshot,
  captureElement,
  generateVisualDiff,
  clearAllSnapshots
};