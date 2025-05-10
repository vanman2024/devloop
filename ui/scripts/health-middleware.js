/**
 * Health Check Middleware for Vite Development Server
 * 
 * Adds a /health endpoint to the Vite development server for monitoring
 * and automatic restart functionality.
 */

export function createHealthMiddleware() {
  // Resource usage tracking
  let startTime = Date.now();
  let requestCount = 0;
  let lastError = null;
  
  // Memory usage monitoring
  const memorySnapshots = [];
  const MAX_SNAPSHOTS = 20;
  
  // Take initial memory snapshot
  memorySnapshots.push({
    timestamp: Date.now(),
    memory: process.memoryUsage()
  });
  
  // Schedule periodic memory snapshots
  setInterval(() => {
    // Take memory snapshot
    memorySnapshots.push({
      timestamp: Date.now(),
      memory: process.memoryUsage()
    });
    
    // Keep only the last MAX_SNAPSHOTS
    if (memorySnapshots.length > MAX_SNAPSHOTS) {
      memorySnapshots.shift();
    }
  }, 60000); // Every minute
  
  // Error tracking middleware
  const errorTracker = (err, req, res, next) => {
    lastError = {
      timestamp: Date.now(),
      message: err.message,
      stack: err.stack,
      url: req.url
    };
    
    next(err);
  };
  
  // Request count middleware
  const requestCounter = (req, res, next) => {
    requestCount++;
    next();
  };
  
  // Health endpoint middleware
  const healthEndpoint = (req, res, next) => {
    if (req.path === '/health') {
      // Calculate uptime
      const uptime = Date.now() - startTime;
      
      // Get current memory usage
      const memory = process.memoryUsage();
      
      // Calculate memory trend
      let memoryTrend = 'stable';
      if (memorySnapshots.length > 5) {
        const oldMemory = memorySnapshots[0].memory.heapUsed;
        const newMemory = memory.heapUsed;
        const percentChange = ((newMemory - oldMemory) / oldMemory) * 100;
        
        if (percentChange > 20) {
          memoryTrend = 'increasing';
        } else if (percentChange < -10) {
          memoryTrend = 'decreasing';
        }
      }
      
      // Generate health report
      const healthStatus = {
        status: 'healthy',
        uptime,
        startTime,
        requestCount,
        memory: {
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
          rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
          memoryTrend
        },
        lastError
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(healthStatus, null, 2));
      return;
    }
    
    next();
  };
  
  // Return middleware chain
  return {
    errorTracker,
    requestCounter,
    healthEndpoint
  };
}

export default createHealthMiddleware;