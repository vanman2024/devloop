# Agent File Access System

## Overview
Implementation guide for creating a simple file access system for agents to interact with the codebase through the API.

## Implementation Plan

### Core API Endpoints

```javascript
// Add to your existing api/routes

// Get file content
app.get('/api/files', (req, res) => {
  const filePath = path.join(process.env.CODEBASE_ROOT, req.query.path);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).json({error: err.message});
    res.json({content: data});
  });
});

// List directory contents
app.get('/api/directory', (req, res) => {
  const dirPath = path.join(process.env.CODEBASE_ROOT, req.query.path || '');
  fs.readdir(dirPath, {withFileTypes: true}, (err, files) => {
    if (err) return res.status(404).json({error: err.message});
    const items = files.map(f => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      path: path.join(req.query.path || '', f.name)
    }));
    res.json({items});
  });
});

// Get file info
app.get('/api/fileinfo', (req, res) => {
  const filePath = path.join(process.env.CODEBASE_ROOT, req.query.path);
  fs.stat(filePath, (err, stats) => {
    if (err) return res.status(404).json({error: err.message});
    res.json({
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    });
  });
});

// Write file (with authentication/authorization)
app.post('/api/files', authenticateAgent, (req, res) => {
  const filePath = path.join(process.env.CODEBASE_ROOT, req.body.path);
  fs.writeFile(filePath, req.body.content, (err) => {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true, path: req.body.path});
  });
});

// Search files
app.get('/api/search', (req, res) => {
  const searchPattern = req.query.pattern;
  const searchPath = path.join(process.env.CODEBASE_ROOT, req.query.path || '');
  
  exec(`grep -r "${searchPattern}" ${searchPath} --include="*.{js,jsx,ts,tsx,py,html,css}"`, 
    (err, stdout, stderr) => {
      if (err && err.code !== 1) return res.status(500).json({error: stderr});
      
      const results = stdout.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          const [file, ...rest] = line.split(':');
          const content = rest.join(':');
          return {
            file: path.relative(process.env.CODEBASE_ROOT, file),
            content: content
          };
        });
        
      res.json({results});
    });
});
```

### Security Implementation

```javascript
// Middleware for API authentication
function authenticateAgent(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  // Simple API key validation
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({error: 'Unauthorized'});
  }
  
  // Add additional authorization checks here as needed
  // For example, check if agent has permissions for the requested path
  
  next();
}

// Apply authentication to sensitive routes
app.use('/api', authenticateAgent);
```

### External Access with ngrok (for development/testing)

```bash
# Install once
npm install -g ngrok

# Run when you need external access
ngrok http 3000  # Replace with your API port
```

### Environment Configuration

```
# .env file
CODEBASE_ROOT=/mnt/c/Users/angel/Devloop
API_SECRET=your-secure-api-key-here
```

## Future Expansion Options

### Cloud Integration
- Replace `fs` operations with cloud storage API calls
- Consider AWS S3, Azure Blob Storage, or Google Cloud Storage
- Update path handling to work with cloud storage paths

### Enhanced Security
- Implement JWT authentication
- Add role-based access control
- Create access logs for audit trails

### Performance Optimizations
- Add caching layer
- Implement file change webhooks
- Support binary file types

## Integration with Knowledge Graph (Future)
When the knowledge graph system is implemented, this file access system will serve as the foundational layer for agents to:

1. Read and analyze code
2. Update knowledge graph with code structure
3. Perform operations based on code understanding
4. Write changes back to the codebase with proper context

## Expected API Usage

```javascript
// Example agent interaction with the file system API

// List top-level directories
fetch('http://localhost:3000/api/directory', {
  headers: { 'x-api-key': 'your-api-key' }
})
.then(res => res.json())
.then(data => {
  // Process directory listings
});

// Get file content
fetch('http://localhost:3000/api/files?path=/api/server.js', {
  headers: { 'x-api-key': 'your-api-key' }
})
.then(res => res.json())
.then(data => {
  // Process file content
});

// Search for specific patterns
fetch('http://localhost:3000/api/search?pattern=function+getUser&path=/api', {
  headers: { 'x-api-key': 'your-api-key' }
})
.then(res => res.json())
.then(data => {
  // Process search results
});
```

## Implementation Timeline

1. Basic file read/directory listing (1-2 hours)
2. Search functionality (1 hour)
3. Authentication middleware (1 hour)
4. Write operations with validation (2 hours)
5. Testing and refinement (2 hours)

Total estimated implementation time: 1 day