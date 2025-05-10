# File Access Integration

## System Integration Component

**Component Type:** API Integration
**ID:** file_access_integration
**Created:** 2025-05-09

## Description

The File Access Integration component provides the connectivity layer between agent systems and the local or cloud-based filesystem. This integration enables agents to discover, read, modify, and search through codebase files using standardized API endpoints.

## Integration Points

### Agent System Integration

```javascript
// Sample agent system code for accessing files
class FileAccessClient {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async getFile(path) {
    const response = await fetch(`${this.apiUrl}/api/files?path=${encodeURIComponent(path)}`, {
      headers: {
        'x-api-key': this.apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content;
  }

  async listDirectory(path = '') {
    const response = await fetch(`${this.apiUrl}/api/directory?path=${encodeURIComponent(path)}`, {
      headers: {
        'x-api-key': this.apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list directory: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items;
  }

  async searchFiles(pattern, path = '') {
    const response = await fetch(
      `${this.apiUrl}/api/search?pattern=${encodeURIComponent(pattern)}&path=${encodeURIComponent(path)}`, 
      {
        headers: {
          'x-api-key': this.apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to search files: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results;
  }

  async writeFile(path, content) {
    const response = await fetch(`${this.apiUrl}/api/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({
        path,
        content
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
```

### Knowledge Graph Integration

```python
# Sample code for integrating file information into the knowledge graph
def index_codebase_files(knowledge_graph, base_path, file_access_client):
    """Index all files in the codebase into the knowledge graph"""
    
    # Start with root directory
    process_directory(knowledge_graph, "", base_path, file_access_client)
    
def process_directory(knowledge_graph, rel_path, base_path, file_access_client):
    """Process a directory and add all files/subdirectories to the knowledge graph"""
    
    # Get directory contents
    items = file_access_client.listDirectory(rel_path)
    
    # Process each item
    for item in items:
        # Skip node_modules and other large directories
        if item["name"] in ["node_modules", ".git", "venv"]:
            continue
            
        # Create full paths
        item_rel_path = os.path.join(rel_path, item["name"])
        
        # Create entity in knowledge graph
        entity_id = f"file:{item_rel_path}"
        
        # Store basic properties
        properties = {
            "name": item["name"],
            "path": item_rel_path,
            "is_directory": item["isDirectory"]
        }
        
        # Store in knowledge graph with appropriate labels
        labels = ["File"] if not item["isDirectory"] else ["Directory"]
        knowledge_graph.long_term.create_entity(entity_id, labels, properties)
        
        # For files, get content and create embeddings
        if not item["isDirectory"]:
            try:
                # Only process text files
                if item["name"].endswith((".js", ".jsx", ".ts", ".tsx", ".py", ".md", ".json", ".html", ".css")):
                    content = file_access_client.getFile(item_rel_path)
                    
                    # Store with vector embedding for semantic search
                    knowledge_graph.store_entity_with_embedding(
                        entity_id,
                        content,
                        properties,
                        metadata={
                            "path": item_rel_path,
                            "type": os.path.splitext(item["name"])[1][1:] # file extension without dot
                        }
                    )
                    
                    # Create parent/child relationships
                    parent_dir = os.path.dirname(item_rel_path) or "/"
                    parent_entity_id = f"file:{parent_dir}"
                    knowledge_graph.create_relationship(
                        parent_entity_id, 
                        entity_id, 
                        "CONTAINS"
                    )
            except Exception as e:
                print(f"Error processing file {item_rel_path}: {e}")
        
        # Recursively process subdirectories
        if item["isDirectory"]:
            process_directory(knowledge_graph, item_rel_path, base_path, file_access_client)
```

## Configuration

Configuration settings for the file access integration:

```env
# API Server Configuration
API_HOST=localhost
API_PORT=3000
API_PROTOCOL=http

# File Access Configuration
CODEBASE_ROOT=/mnt/c/Users/angel/Devloop
API_SECRET=your-secure-api-key-here

# Integration Settings
FILE_ACCESS_API_URL=http://localhost:3000
ENABLE_FILE_CACHE=true
FILE_CACHE_TTL=300
MAX_FILE_SIZE=10485760
```

## Security Considerations

- API keys must be securely stored and rotated regularly
- Implement path traversal protection to prevent unauthorized access
- Consider read-only access for most agents
- Implement write-access approval workflow for sensitive files
- Log all file system operations for audit purposes

## Implementation Status

- [x] Basic API design
- [x] Integration documentation
- [ ] API endpoint implementation
- [ ] Knowledge graph connector
- [ ] Agent system integration
- [ ] Security layer

## Related Components

- [File Access System](/agents/catalog/knowledge/file_access_system.md)
- [API Server](/agents/catalog/system/api_server.md)
- [Authentication System](/agents/catalog/system/authentication_system.md)