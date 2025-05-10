# Devloop API Performance Optimization Guide

This document outlines the performance optimization principles and implementation patterns for all Devloop API services. These techniques ensure high throughput, low latency, and efficient resource utilization across the entire system.

## Core Performance Principles

The following performance optimization principles apply to all Devloop API services and components:

1. **Connection Pooling**
2. **Redis Caching**
3. **Asynchronous Operations**
4. **Payload Compression**
5. **Pagination**
6. **Intelligent Batching**
7. **Asynchronous Logging**

## Implementation Details

### 1. Connection Pooling

All database connections are managed through persistent connection pools to eliminate connection establishment overhead.

#### MongoDB Connection Pool

```javascript
// In connection.js
const mongoose = require('mongoose');
const options = {
  poolSize: process.env.MONGO_POOL_SIZE || 10,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  keepAlive: true,
  keepAliveInitialDelay: 30000
};

mongoose.connect(process.env.MONGO_URI, options);
const db = mongoose.connection;

// Export singleton connection
module.exports = db;
```

#### Redis Connection Pool

```javascript
// In redis-client.js
const Redis = require('ioredis');

// Create connection pool with built-in Redis connection management
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000); // Exponential backoff with cap
  },
  connectionName: 'devloop-api',
  enableReadyCheck: true,
  enableOfflineQueue: true
});

module.exports = redis;
```

#### Neo4j Connection Pool

```javascript
// In neo4j-client.js
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  {
    maxConnectionPoolSize: process.env.NEO4J_POOL_SIZE || 50,
    connectionAcquisitionTimeout: 5000,
    maxTransactionRetryTime: 30000,
    connectionTimeout: 5000,
    disableLosslessIntegers: true
  }
);

module.exports = driver;
```

### 2. Redis Caching

Implement multi-level caching to reduce database load and improve response times.

#### Cache Configuration

```javascript
// In cache-config.js
module.exports = {
  // Default TTL for different cache types
  ttl: {
    short: 60,          // 1 minute
    medium: 300,        // 5 minutes
    long: 3600,         // 1 hour
    veryLong: 86400     // 1 day
  },
  
  // Cache key prefixes
  prefixes: {
    api: 'api:',
    user: 'user:',
    feature: 'feature:',
    milestone: 'milestone:',
    graph: 'graph:',
    query: 'query:'
  },
  
  // Compression threshold in bytes
  compressionThreshold: 1024
};
```

#### Caching Middleware

```javascript
// In cache-middleware.js
const redis = require('./redis-client');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const config = require('./cache-config');

/**
 * Redis caching middleware with compression and variable TTL
 * @param {string} keyPrefix - Cache key prefix
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Optional function to generate custom cache key
 */
function cacheMiddleware(keyPrefix, ttl, keyGenerator = null) {
  return async (req, res, next) => {
    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req)
      : `${keyPrefix}:${req.originalUrl}`;
    
    try {
      // Check cache for hit
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        let data;
        
        try {
          // Attempt to decompress (for compressed data)
          const buffer = Buffer.from(cachedData, 'base64');
          const decompressed = await gunzip(buffer);
          data = JSON.parse(decompressed.toString('utf8'));
        } catch (e) {
          // If decompression fails, it wasn't compressed
          data = JSON.parse(cachedData);
        }
        
        // Send cached response
        return res.json(data);
      }
      
      // Cache miss - store original json method
      const originalJson = res.json;
      
      // Override res.json to cache response
      res.json = async (data) => {
        // Restore original method
        res.json = originalJson;
        
        // Cache the response (with compression if needed)
        const jsonString = JSON.stringify(data);
        
        let cacheData;
        // Compress if above threshold
        if (jsonString.length > config.compressionThreshold) {
          const compressed = await gzip(jsonString);
          cacheData = compressed.toString('base64');
        } else {
          cacheData = jsonString;
        }
        
        // Store in cache with TTL
        await redis.set(key, cacheData, 'EX', ttl);
        
        // Send response
        return res.json(data);
      };
      
      next();
    } catch (error) {
      // Log error but don't fail request
      console.error(`Cache error: ${error.message}`);
      next();
    }
  };
}

module.exports = cacheMiddleware;
```

#### Cache Invalidation

```javascript
// In cache-service.js
const redis = require('./redis-client');
const config = require('./cache-config');

class CacheService {
  /**
   * Invalidate cache based on pattern
   * @param {string} pattern - Pattern to match (e.g. 'feature:*')
   */
  static async invalidatePattern(pattern) {
    // Use SCAN instead of KEYS for production safety
    let cursor = '0';
    do {
      // Scan for matching keys in batches
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        1000
      );
      
      cursor = nextCursor;
      
      // Delete keys if found
      if (keys.length) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
    
    return true;
  }
  
  /**
   * Invalidate specific entity
   * @param {string} type - Entity type
   * @param {string} id - Entity ID
   */
  static async invalidateEntity(type, id) {
    const pattern = `${config.prefixes[type]}*${id}*`;
    return this.invalidatePattern(pattern);
  }
}

module.exports = CacheService;
```

### 3. Asynchronous Operations

Implement non-blocking I/O throughout all API services:

#### Async API Middleware

```javascript
// In async-handler.js
/**
 * Wraps an async route handler to automatically catch errors
 * @param {Function} fn - Async route handler
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
```

#### Async Database Operations

```javascript
// In feature-service.js
const db = require('./mongodb-connection');
const Feature = require('./models/Feature');
const asyncHandler = require('./async-handler');
const cacheMiddleware = require('./cache-middleware');
const cacheConfig = require('./cache-config');

// Route declaration with async handler and caching
router.get('/features', 
  cacheMiddleware(cacheConfig.prefixes.feature, cacheConfig.ttl.medium),
  asyncHandler(async (req, res) => {
    const { status, milestone, limit = 50, page = 1 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (milestone) query.milestone_id = milestone;
    
    // Execute query with pagination
    const features = await Feature.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean()
      .exec();
    
    // Get total count for pagination
    const total = await Feature.countDocuments(query);
    
    return res.json({
      features,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  })
);
```

#### Parallel Operations

```javascript
// In dashboard-service.js
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Execute multiple queries in parallel
  const [
    milestones,
    activeFeatures,
    completedFeatures,
    systemHealth
  ] = await Promise.all([
    Milestone.countDocuments(),
    Feature.countDocuments({ status: 'in-progress' }),
    Feature.countDocuments({ status: 'completed' }),
    SystemHealth.findOne().sort({ created_at: -1 }).lean()
  ]);
  
  return res.json({
    milestones,
    active_features: activeFeatures,
    completed_features: completedFeatures,
    system_health: systemHealth.status
  });
}));
```

### 4. Payload Compression

Implement efficient payload compression and serialization:

#### Response Compression

```javascript
// In app.js
const compression = require('compression');
const app = express();

// Apply compression to all responses
app.use(compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Don't compress responses that are already compressed
  filter: (req, res) => {
    if (res.getHeader('Content-Type')?.includes('image/')) {
      return false;
    }
    return compression.filter(req, res);
  },
  // Compression level (1-9, 9 being highest)
  level: 6
}));
```

#### MessagePack for API Payloads

```javascript
// In messagepack-middleware.js
const msgpack = require('msgpack5')();
const encode = msgpack.encode;
const decode = msgpack.decode;

module.exports = {
  /**
   * Serialize response using MessagePack when client accepts it
   */
  serialize: (req, res, next) => {
    // Original JSON method
    const originalJson = res.json;
    
    res.json = function(obj) {
      // Check if client accepts messagepack
      if (req.headers['accept'] === 'application/msgpack') {
        // Set content type
        res.setHeader('Content-Type', 'application/msgpack');
        
        // Encode response
        const encoded = encode(obj);
        
        // Send binary response
        return res.send(encoded);
      }
      
      // Default to JSON
      return originalJson.call(this, obj);
    };
    
    next();
  },
  
  /**
   * Parse MessagePack request bodies
   */
  parse: (req, res, next) => {
    if (req.headers['content-type'] === 'application/msgpack') {
      const chunks = [];
      
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          req.body = decode(buffer);
          next();
        } catch (err) {
          next(err);
        }
      });
    } else {
      next();
    }
  }
};
```

#### Binary Data Handling

```javascript
// In file-upload-service.js
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');

// Configure storage
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: 'uploads',
      filename: `${Date.now()}_${file.originalname}`,
      metadata: {
        contentType: file.mimetype,
        userId: req.user?.id || 'anonymous'
      }
    };
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// File upload endpoint with binary handling
router.post('/files', 
  upload.single('file'), 
  asyncHandler(async (req, res) => {
    return res.json({
      success: true,
      file: {
        id: req.file.id,
        filename: req.file.filename,
        contentType: req.file.contentType,
        size: req.file.size
      }
    });
  })
);
```

### 5. Pagination

Implement cursor-based pagination for all list endpoints:

#### Cursor-based Pagination

```javascript
// In pagination-middleware.js
/**
 * Create pagination middleware with cursor support
 * @param {Object} model - Mongoose model
 * @param {string} sortField - Field to sort by (usually '_id')
 */
function paginationMiddleware(model, sortField = '_id') {
  return asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor;
    
    // Build query based on cursor
    const query = { ...req.baseQuery };
    if (cursor) {
      query[sortField] = { $gt: cursor };
    }
    
    // Execute query with limit + 1 to check if there's more
    const items = await model.find(query)
      .sort({ [sortField]: 1 })
      .limit(limit + 1)
      .lean()
      .exec();
    
    // Check if there are more items
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    
    // Set pagination metadata
    req.pagination = {
      results,
      hasMore,
      nextCursor: hasMore ? items[limit - 1][sortField] : null,
      limit
    };
    
    next();
  });
}
```

#### Implementing Pagination in Routes

```javascript
// In milestone-routes.js
router.get('/milestones',
  (req, res, next) => {
    // Set base query from request parameters
    req.baseQuery = {};
    if (req.query.status) req.baseQuery.status = req.query.status;
    next();
  },
  paginationMiddleware(Milestone, 'created_at'),
  (req, res) => {
    // Return paginated results
    res.json({
      data: req.pagination.results,
      pagination: {
        limit: req.pagination.limit,
        has_more: req.pagination.hasMore,
        next_cursor: req.pagination.nextCursor
      }
    });
  }
);
```

### 6. Intelligent Batching

Implement batching for multiple operations:

#### Batch Processing Middleware

```javascript
// In batch-middleware.js
/**
 * Process a batch of operations in a single request
 * @param {Object} operationMap - Map of operation names to handler functions
 */
function batchMiddleware(operationMap) {
  return asyncHandler(async (req, res) => {
    const { operations } = req.body;
    
    if (!Array.isArray(operations)) {
      return res.status(400).json({ error: 'operations must be an array' });
    }
    
    // Execute operations in parallel
    const results = await Promise.all(
      operations.map(async (operation) => {
        const { id, type, params } = operation;
        
        try {
          if (!operationMap[type]) {
            return {
              id,
              error: `Unknown operation type: ${type}`
            };
          }
          
          // Execute the operation
          const result = await operationMap[type](params, req);
          return { id, result };
        } catch (error) {
          return { 
            id, 
            error: error.message || 'Operation failed' 
          };
        }
      })
    );
    
    return res.json({ results });
  });
}
```

#### Batch API Implementation

```javascript
// In batch-routes.js
// Define operation handlers
const operations = {
  getFeature: async (params) => {
    return await Feature.findOne({ id: params.id }).lean();
  },
  
  getMilestone: async (params) => {
    return await Milestone.findOne({ id: params.id }).lean();
  },
  
  getSystemHealth: async () => {
    return await SystemHealth.findOne()
      .sort({ created_at: -1 })
      .lean();
  },
  
  updateFeatureStatus: async (params, req) => {
    // Check authorization
    if (!req.user.hasPermission('UPDATE_FEATURE')) {
      throw new Error('Permission denied');
    }
    
    return await Feature.findOneAndUpdate(
      { id: params.id },
      { $set: { status: params.status } },
      { new: true }
    ).lean();
  }
};

// Define batch endpoint
router.post('/batch', batchMiddleware(operations));
```

### 7. Asynchronous Logging

Implement non-blocking logging infrastructure:

#### Asynchronous Logger

```javascript
// In async-logger.js
const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Buffer for batching logs
let logBuffer = [];
let flushTimer = null;
const FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_SIZE_LIMIT = 100; // Flush when buffer reaches this size

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'devloop-api' },
  transports: [
    // Console transport for development
    new transports.Console({
      format: combine(
        colorize(),
        printf(({ level, message, timestamp, ...rest }) => {
          return `${timestamp} ${level}: ${message} ${JSON.stringify(rest)}`;
        })
      )
    }),
    // File transport for production
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  ]
});

/**
 * Flush log buffer asynchronously
 */
function flushLogBuffer() {
  if (logBuffer.length === 0) return;
  
  // Clone and clear buffer
  const logsToFlush = [...logBuffer];
  logBuffer = [];
  
  // Process logs asynchronously
  setImmediate(() => {
    logsToFlush.forEach(log => {
      logger.log(log);
    });
  });
}

/**
 * Schedule flush if not already scheduled
 */
function scheduleFlush() {
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushLogBuffer();
    }, FLUSH_INTERVAL);
    
    // Don't prevent process exit
    if (flushTimer.unref) flushTimer.unref();
  }
}

/**
 * Buffered logger that batches logs for efficient I/O
 */
const bufferedLogger = {
  log: (level, message, meta = {}) => {
    // Add to buffer
    logBuffer.push({ level, message, ...meta });
    
    // Flush if buffer is full
    if (logBuffer.length >= BUFFER_SIZE_LIMIT) {
      flushLogBuffer();
    } else {
      scheduleFlush();
    }
  },
  
  error: (message, meta = {}) => bufferedLogger.log('error', message, meta),
  warn: (message, meta = {}) => bufferedLogger.log('warn', message, meta),
  info: (message, meta = {}) => bufferedLogger.log('info', message, meta),
  debug: (message, meta = {}) => bufferedLogger.log('debug', message, meta),
  
  // Flush logs immediately (for shutdown)
  flush: () => flushLogBuffer()
};

// Ensure logs are flushed on exit
process.on('beforeExit', () => bufferedLogger.flush());
process.on('uncaughtException', (err) => {
  bufferedLogger.error('Uncaught exception', { error: err.message, stack: err.stack });
  bufferedLogger.flush();
});

module.exports = bufferedLogger;
```

## HTTP/2 and Server Configuration

Implement HTTP/2 for improved performance:

```javascript
// In server.js
const express = require('express');
const http2 = require('http2');
const fs = require('fs');
const app = express();

// Configure middleware
app.use(express.json());
app.use(require('./messagepack-middleware').serialize);
app.use(require('./messagepack-middleware').parse);
app.use(require('compression')());

// Apply performance middleware
app.use((req, res, next) => {
  // Set performance headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  next();
});

// Register routes
app.use('/api', require('./routes'));

// Error handler
app.use((err, req, res, next) => {
  const logger = require('./async-logger');
  logger.error('Request error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.id
  });
});

// Create HTTP/2 server with TLS (for production)
if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    allowHTTP1: true
  };
  
  const server = http2.createSecureServer(options, app);
  
  server.listen(process.env.PORT || 8080, () => {
    console.log(`Server running on port ${process.env.PORT || 8080} with HTTP/2`);
  });
} else {
  // Plain HTTP server for development
  const server = app.listen(process.env.PORT || 8080, () => {
    console.log(`Server running on port ${process.env.PORT || 8080}`);
  });
}
```

## Database Optimizations

### MongoDB Indexes

```javascript
// In feature-model.js
const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  milestone_id: {
    type: String,
    required: true,
    index: true
  },
  phase_id: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'blocked'],
    default: 'not-started',
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for common queries
featureSchema.index({ milestone_id: 1, phase_id: 1 });
featureSchema.index({ milestone_id: 1, status: 1 });
featureSchema.index({ status: 1, created_at: -1 });

module.exports = mongoose.model('Feature', featureSchema);
```

### Neo4j Query Optimization

```javascript
// In graph-service.js
/**
 * Optimize Neo4j query with parameters and query plan
 * @param {Object} session - Neo4j session
 * @param {string} query - Cypher query
 * @param {Object} params - Query parameters
 */
async function executeOptimizedQuery(session, query, params) {
  // Analyze query and get plan
  const plan = await session.run(`EXPLAIN ${query}`, params);
  
  // Check if query can be optimized
  const planRows = plan.summary.plan.arguments.rows;
  const estimatedRows = plan.summary.plan.arguments.EstimatedRows;
  
  // Log plan for debugging
  logger.debug('Query plan', { 
    planRows, 
    estimatedRows,
    query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
  });
  
  // Add query hints for better performance if needed
  let optimizedQuery = query;
  
  // Add index hint if querying a high-cardinality field
  if (query.includes('MATCH (n:') && estimatedRows > 1000) {
    // Add index hint - this is a simplified example
    const match = query.match(/MATCH \((\w+):(\w+)\)/);
    if (match) {
      const [_, variable, label] = match;
      optimizedQuery = query.replace(
        `MATCH (${variable}:${label})`,
        `MATCH (${variable}:${label}) USING INDEX ${variable}:${label}(id)`
      );
    }
  }
  
  // Execute the query
  return session.run(optimizedQuery, params);
}
```

## System-Wide Monitoring

### Performance Metrics Collection

```javascript
// In metrics-collector.js
const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (GC, memory, eventloop, etc)
client.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseOperationDurationSeconds = new client.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const cacheLookupTotal = new client.Counter({
  name: 'cache_lookup_total',
  help: 'Total number of cache lookups',
  labelNames: ['status']
});

// Register metrics
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(databaseOperationDurationSeconds);
register.registerMetric(cacheLookupTotal);

module.exports = {
  register,
  metrics: {
    httpRequestDurationSeconds,
    httpRequestsTotal,
    databaseOperationDurationSeconds,
    cacheLookupTotal
  }
};
```

### Performance Monitoring Middleware

```javascript
// In performance-middleware.js
const { metrics } = require('./metrics-collector');

/**
 * Middleware for measuring HTTP request duration
 */
function requestDurationMiddleware(req, res, next) {
  // Start timer
  const start = Date.now();
  
  // Add unique request ID
  req.id = require('crypto').randomBytes(16).toString('hex');
  
  // Track end of request
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // Update metrics
    metrics.httpRequestDurationSeconds
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    metrics.httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
    
    // Log request if it exceeds threshold
    if (duration > 1.0) {
      require('./async-logger').warn('Slow request', {
        method: req.method,
        path: req.path,
        route,
        duration,
        statusCode: res.statusCode,
        requestId: req.id
      });
    }
  });
  
  next();
}

/**
 * Middleware for tracking database operations
 */
function databaseTimingMiddleware() {
  // MongoDB instrumentation
  const mongoose = require('mongoose');
  const executeQuery = mongoose.Query.prototype.exec;
  
  mongoose.Query.prototype.exec = async function() {
    const start = Date.now();
    const operation = this.op;
    const collection = this.model.collection.name;
    
    try {
      const result = await executeQuery.apply(this, arguments);
      const duration = (Date.now() - start) / 1000;
      
      // Record metrics
      metrics.databaseOperationDurationSeconds
        .labels(operation, collection)
        .observe(duration);
      
      return result;
    } catch (error) {
      // Still record metrics on error
      const duration = (Date.now() - start) / 1000;
      metrics.databaseOperationDurationSeconds
        .labels(operation, collection)
        .observe(duration);
      
      throw error;
    }
  };
}

module.exports = {
  requestDurationMiddleware,
  databaseTimingMiddleware
};
```

## API Performance Endpoints

```javascript
// In performance-routes.js
const express = require('express');
const router = express.Router();
const { register } = require('./metrics-collector');
const redis = require('./redis-client');
const mongo = require('mongoose');
const neo4j = require('./neo4j-client');

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// System health endpoint
router.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {}
  };
  
  try {
    // Check Redis
    const redisStatus = await redis.ping();
    health.services.redis = {
      status: redisStatus === 'PONG' ? 'UP' : 'DOWN'
    };
  } catch (e) {
    health.services.redis = {
      status: 'DOWN',
      error: e.message
    };
  }
  
  try {
    // Check MongoDB
    health.services.mongodb = {
      status: mongo.connection.readyState === 1 ? 'UP' : 'DOWN'
    };
  } catch (e) {
    health.services.mongodb = {
      status: 'DOWN',
      error: e.message
    };
  }
  
  try {
    // Check Neo4j
    const session = neo4j.session();
    const result = await session.run('RETURN 1 as n');
    await session.close();
    
    health.services.neo4j = {
      status: result.records[0].get('n') === 1 ? 'UP' : 'DOWN'
    };
  } catch (e) {
    health.services.neo4j = {
      status: 'DOWN',
      error: e.message
    };
  }
  
  // Set overall health status
  const servicesDown = Object.values(health.services)
    .filter(service => service.status === 'DOWN')
    .length;
  
  if (servicesDown > 0) {
    health.status = servicesDown === Object.keys(health.services).length 
      ? 'DOWN' 
      : 'DEGRADED';
  }
  
  res.json(health);
});

// System stats endpoint
router.get('/stats', async (req, res) => {
  const stats = {
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    caches: {},
    database: {}
  };
  
  try {
    // Get Redis stats
    const redisInfo = await redis.info();
    const redisInfoMap = {};
    
    redisInfo.split('\r\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        redisInfoMap[parts[0]] = parts[1];
      }
    });
    
    stats.caches.redis = {
      used_memory: redisInfoMap.used_memory,
      used_memory_peak: redisInfoMap.used_memory_peak,
      connected_clients: redisInfoMap.connected_clients,
      keyspace_hits: redisInfoMap.keyspace_hits,
      keyspace_misses: redisInfoMap.keyspace_misses
    };
  } catch (e) {
    stats.caches.redis = { error: e.message };
  }
  
  try {
    // Get MongoDB stats
    const mongoStats = await mongo.connection.db.stats();
    stats.database.mongodb = {
      collections: mongoStats.collections,
      objects: mongoStats.objects,
      avgObjSize: mongoStats.avgObjSize,
      dataSize: mongoStats.dataSize,
      storageSize: mongoStats.storageSize,
      indexes: mongoStats.indexes,
      indexSize: mongoStats.indexSize
    };
  } catch (e) {
    stats.database.mongodb = { error: e.message };
  }
  
  res.json(stats);
});

module.exports = router;
```

## Queue and Job Management

```javascript
// In job-queue.js
const Queue = require('bull');

// Create Redis connection options with optimizations
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true
};

// Create job queues with different priorities
const queues = {
  high: new Queue('high-priority-jobs', { redis: redisOptions }),
  normal: new Queue('normal-priority-jobs', { redis: redisOptions }),
  low: new Queue('low-priority-jobs', { redis: redisOptions })
};

// Configure queue settings for each priority
for (const [priority, queue] of Object.entries(queues)) {
  // Configure optimized concurrency
  const concurrency = priority === 'high' ? 10 : priority === 'normal' ? 5 : 2;
  
  // Set up monitoring
  queue.on('error', (error) => {
    require('./async-logger').error(`Error in ${priority} queue`, { error: error.message });
  });
  
  queue.on('completed', (job, result) => {
    require('./async-logger').debug(`Job completed in ${priority} queue`, { 
      jobId: job.id,
      jobName: job.name,
      duration: job.finishedOn - job.processedOn
    });
  });
  
  queue.on('failed', (job, error) => {
    require('./async-logger').error(`Job failed in ${priority} queue`, {
      jobId: job.id,
      jobName: job.name, 
      error: error.message
    });
  });
  
  // Process jobs
  queue.process(concurrency, async (job) => {
    const { jobType, data } = job.data;
    const jobProcessor = require(`./job-processors/${jobType}`);
    
    return await jobProcessor(data, job);
  });
}

module.exports = {
  /**
   * Add a job to the queue
   * @param {string} jobType - Type of job to run
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @param {string} priority - Job priority (high, normal, low)
   */
  addJob: async (jobType, data, options = {}, priority = 'normal') => {
    const queue = queues[priority] || queues.normal;
    
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true
    };
    
    const jobOptions = { ...defaultOptions, ...options };
    
    return await queue.add({ jobType, data }, jobOptions);
  }
};
```

## Conclusion

These performance optimizations should be applied consistently across all Devloop API services to ensure maximum efficiency and responsiveness. Remember to:

1. **Measure First**: Use the provided monitoring tools to identify bottlenecks before optimization
2. **Apply Consistently**: Ensure all new API endpoints follow these patterns
3. **Test Under Load**: Verify performance under realistic load conditions
4. **Monitor in Production**: Keep an eye on metrics to catch regressions early

By implementing these patterns system-wide, we can ensure that Devloop's API layer remains performant even as the system grows in complexity and scale.