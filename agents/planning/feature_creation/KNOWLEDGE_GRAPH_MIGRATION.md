# Knowledge Graph Migration Plan

This document outlines the plan for migrating the knowledge graph to support enhanced feature properties.

## Current Limitations

The current knowledge graph in our system has limitations:

1. **Fixed Schema**: The current schema may not support all the new fields we want to add (requirements, user stories, priority, etc.)
2. **API Constraints**: The `MemoryKnowledgeGraph` class may have validation or constraints that reject unknown fields
3. **Storage Format**: The underlying storage mechanism may have limitations on field types or structure

## Migration Approach

### Phase 1: Compatibility Layer

Create a compatibility layer that works with both the enhanced and current knowledge graph:

```python
def add_feature_to_knowledge_graph(kg, feature_data):
    """
    Add a feature to the knowledge graph with compatibility support
    
    This function handles both the enhanced and current knowledge graph formats.
    
    Args:
        kg: Knowledge graph instance
        feature_data: Feature data with enhanced fields
        
    Returns:
        Tuple of (success, message)
    """
    # Create a copy of the data to avoid modifying the original
    kg_data = feature_data.copy()
    
    # Check if the knowledge graph supports enhanced fields
    supports_enhanced = hasattr(kg, 'supports_enhanced_features') and kg.supports_enhanced_features
    
    if not supports_enhanced:
        # Move enhanced fields to metadata if not supported directly
        metadata = kg_data.get('metadata', {})
        
        # Move enhanced fields to metadata
        enhanced_fields = [
            'requirements', 'user_stories', 'priority', 'effort_estimate',
            'risk_level', 'test_coverage', 'version', 'stakeholders'
        ]
        
        for field in enhanced_fields:
            if field in kg_data:
                metadata[f'enhanced_{field}'] = kg_data.pop(field)
        
        # Update metadata in the data
        kg_data['metadata'] = metadata
    
    # Add the feature to the knowledge graph
    try:
        node = kg.add_node(
            node_id=kg_data['id'],
            node_type="feature",
            properties=kg_data.get('properties', {}),
            metadata=kg_data.get('metadata', {})
        )
        return True, f"Added feature {kg_data['id']}"
    except Exception as e:
        return False, str(e)
```

### Phase 2: Schema Update Script

Create a schema update script for the actual knowledge graph:

```python
def update_knowledge_graph_schema():
    """Update the knowledge graph schema to support enhanced feature properties"""
    # Backup the current knowledge graph
    backup_knowledge_graph()
    
    # Update the schema
    try:
        # Load the knowledge graph schema
        schema_path = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 
                                   'system-core', 'memory', 'memory-schema.json')
        
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        
        # Update the feature node schema
        if 'nodeTypes' in schema and 'feature' in schema['nodeTypes']:
            feature_schema = schema['nodeTypes']['feature']
            
            # Add new properties to the feature schema
            if 'properties' in feature_schema:
                feature_schema['properties'].update({
                    'requirements': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Extracted requirements from feature description'
                    },
                    'user_stories': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'User stories associated with the feature'
                    },
                    'priority': {
                        'type': 'string',
                        'enum': ['high', 'medium', 'low'],
                        'description': 'Feature priority'
                    },
                    'effort_estimate': {
                        'type': 'string',
                        'enum': ['high', 'medium', 'low'],
                        'description': 'Estimated effort to implement'
                    },
                    'risk_level': {
                        'type': 'string',
                        'enum': ['high', 'medium', 'low'],
                        'description': 'Risk level of implementation'
                    },
                    'test_coverage': {
                        'type': 'number',
                        'minimum': 0,
                        'maximum': 100,
                        'description': 'Required test coverage percentage'
                    },
                    'version': {
                        'type': 'string',
                        'description': 'Target version for implementation'
                    },
                    'stakeholders': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Teams or individuals interested in the feature'
                    }
                })
            
        # Save the updated schema
        with open(schema_path, 'w') as f:
            json.dump(schema, f, indent=2)
            
        return True, "Schema updated successfully"
    except Exception as e:
        return False, f"Error updating schema: {e}"
```

### Phase 3: Knowledge Graph Code Update

Update the `MemoryKnowledgeGraph` class to support enhanced features:

```python
def patch_memory_knowledge_graph():
    """Patch the MemoryKnowledgeGraph class to support enhanced features"""
    try:
        # Import the MemoryKnowledgeGraph class
        from backups.system_core_backup.system_core.memory.manager.memory_knowledge_graph import MemoryKnowledgeGraph
        
        # Add a flag to indicate support for enhanced features
        MemoryKnowledgeGraph.supports_enhanced_features = True
        
        # Patch the add_node method to handle enhanced fields
        original_add_node = MemoryKnowledgeGraph.add_node
        
        def patched_add_node(self, node_id, node_type, properties=None, metadata=None):
            """Patched add_node method to handle enhanced fields"""
            if node_type == "feature" and properties:
                # Ensure schema compatibility for enhanced fields
                properties = properties.copy()
                
                # Remove unknown fields to avoid validation errors
                known_fields = [
                    'name', 'description', 'status', 'tags', 'domain', 'purpose',
                    'created_at', 'updated_at', 'requirements', 'user_stories',
                    'priority', 'effort_estimate', 'risk_level', 'test_coverage',
                    'version', 'stakeholders'
                ]
                
                # Move unknown fields to metadata
                metadata = metadata or {}
                for key in list(properties.keys()):
                    if key not in known_fields:
                        metadata[f'property_{key}'] = properties.pop(key)
            
            # Call the original method
            return original_add_node(self, node_id, node_type, properties, metadata)
        
        # Replace the method
        MemoryKnowledgeGraph.add_node = patched_add_node
        
        return True, "MemoryKnowledgeGraph patched successfully"
    except Exception as e:
        return False, f"Error patching MemoryKnowledgeGraph: {e}"
```

## Implementation Plan

### 1. Update Knowledge Graph Connector

Update our knowledge graph connector to work with both enhanced and legacy graphs:

```python
class KnowledgeGraphConnector:
    """Knowledge graph connector with compatibility support"""
    
    def __init__(self, kg_file_path=None):
        """Initialize the knowledge graph connector"""
        # Initialize as before...
        
        # Check if the knowledge graph supports enhanced features
        self.supports_enhanced_features = hasattr(self.kg, 'supports_enhanced_features') and self.kg.supports_enhanced_features
        
        if self.supports_enhanced_features:
            logger.info("Enhanced feature support detected in knowledge graph")
        else:
            logger.info("Using compatibility mode for legacy knowledge graph")
    
    def add_feature(self, feature_data):
        """Add a feature to the knowledge graph"""
        try:
            # Process feature data as before...
            
            # Create the feature node
            if self.supports_enhanced_features:
                # Add directly with all fields
                self.kg.add_node(
                    node_id=feature_id,
                    node_type="feature",
                    properties={
                        "name": feature_data.get("name", ""),
                        "description": feature_data.get("description", ""),
                        "status": feature_data.get("status", "not-started"),
                        "tags": tags,
                        "domain": domain,
                        "purpose": purpose,
                        "created_at": created_at,
                        "updated_at": created_at,
                        "requirements": feature_data.get("requirements", []),
                        "user_stories": feature_data.get("user_stories", []),
                        "priority": feature_data.get("priority", "medium"),
                        "effort_estimate": feature_data.get("effort_estimate", "medium"),
                        "risk_level": feature_data.get("risk_level", "medium"),
                        "test_coverage": feature_data.get("test_coverage", 80),
                        "version": feature_data.get("version", "1.0.0"),
                        "stakeholders": feature_data.get("stakeholders", [])
                    },
                    metadata={
                        "created_by": "feature_creation_agent",
                        "milestone": milestone_id,
                        "phase": phase_id,
                        "module": module_id
                    }
                )
            else:
                # Use compatibility mode - add basic properties
                # and store enhanced fields in metadata
                metadata = {
                    "created_by": "feature_creation_agent",
                    "milestone": milestone_id,
                    "phase": phase_id,
                    "module": module_id,
                    "enhanced_requirements": feature_data.get("requirements", []),
                    "enhanced_user_stories": feature_data.get("user_stories", []),
                    "enhanced_priority": feature_data.get("priority", "medium"),
                    "enhanced_effort_estimate": feature_data.get("effort_estimate", "medium"),
                    "enhanced_risk_level": feature_data.get("risk_level", "medium"),
                    "enhanced_test_coverage": feature_data.get("test_coverage", 80),
                    "enhanced_version": feature_data.get("version", "1.0.0"),
                    "enhanced_stakeholders": feature_data.get("stakeholders", [])
                }
                
                self.kg.add_node(
                    node_id=feature_id,
                    node_type="feature",
                    properties={
                        "name": feature_data.get("name", ""),
                        "description": feature_data.get("description", ""),
                        "status": feature_data.get("status", "not-started"),
                        "tags": tags,
                        "domain": domain,
                        "purpose": purpose,
                        "created_at": created_at,
                        "updated_at": created_at
                    },
                    metadata=metadata
                )
            
            # Continue with connections as before...
            
            return True, feature_id
        
        except Exception as e:
            logger.error(f"Error adding feature to knowledge graph: {str(e)}")
            return False, str(e)
```

### 2. Create Migration Script

Create a script to update the knowledge graph schema and existing features:

```python
def migrate_knowledge_graph():
    """Migrate the knowledge graph to support enhanced features"""
    # Backup the knowledge graph
    success, message = backup_knowledge_graph()
    if not success:
        return False, f"Backup failed: {message}"
    
    # Update the schema
    success, message = update_knowledge_graph_schema()
    if not success:
        return False, f"Schema update failed: {message}"
    
    # Patch the MemoryKnowledgeGraph class
    success, message = patch_memory_knowledge_graph()
    if not success:
        return False, f"MemoryKnowledgeGraph patch failed: {message}"
    
    # Migrate existing features
    try:
        # Load the knowledge graph
        from backups.system_core_backup.system_core.memory.manager.memory_knowledge_graph import MemoryKnowledgeGraph
        kg = MemoryKnowledgeGraph()
        
        # Get all feature nodes
        feature_nodes = kg.get_nodes_by_type("feature")
        
        migrated_count = 0
        for node in feature_nodes:
            node_id = node.get("id")
            properties = node.get("properties", {})
            metadata = node.get("metadata", {})
            
            # Extract enhanced fields from metadata if they exist
            enhanced_fields = {}
            for key in list(metadata.keys()):
                if key.startswith("enhanced_"):
                    field_name = key[9:]  # Remove "enhanced_" prefix
                    enhanced_fields[field_name] = metadata.pop(key)
            
            # Add enhanced fields to properties
            if enhanced_fields:
                properties.update(enhanced_fields)
                
                # Update the node
                kg.update_node(node_id, properties=properties, metadata=metadata)
                migrated_count += 1
        
        # Save the knowledge graph
        kg.save()
        
        return True, f"Migration successful: {migrated_count} features migrated"
    except Exception as e:
        return False, f"Error migrating features: {e}"
```

### 3. Update Documentation

Update the documentation to reflect the new schema and migration process:

```markdown
## Enhanced Feature Properties

The knowledge graph now supports enhanced feature properties:

| Field | Description | Type |
|-------|-------------|------|
| `requirements` | Extracted requirements from description | Array of Strings |
| `user_stories` | User stories associated with the feature | Array of Strings |
| `priority` | Feature priority (high, medium, low) | String |
| `effort_estimate` | Estimated effort to implement | String |
| `risk_level` | Risk level of implementation | String |
| `test_coverage` | Required test coverage percentage | Number |
| `version` | Target version for implementation | String |
| `stakeholders` | Teams or individuals interested in the feature | Array of Strings |

### Migration

If you're using an older version of the knowledge graph, you can migrate to the new schema:

```bash
python -m agents.planning.feature_creation.migrate_knowledge_graph
```

This will:
1. Backup your current knowledge graph
2. Update the schema to support enhanced features
3. Migrate existing features to use the new schema
```

## Backward Compatibility

Until the migration is complete, our implementation will maintain backward compatibility:

1. When adding features to the knowledge graph, we'll check if enhanced fields are supported
2. If not supported, we'll store the enhanced fields in metadata with an "enhanced_" prefix
3. All existing knowledge graph queries will still work as before
4. New queries that use enhanced fields will work only on migrated knowledge graphs

## Feature Creation Agent Integration

The feature creation agent will:

1. Always generate the enhanced fields (requirements, user stories, priority, etc.)
2. Use the compatibility layer in the knowledge graph connector to handle these fields
3. Work seamlessly with both enhanced and legacy knowledge graphs

This approach ensures that:
1. We can immediately start using enhanced features
2. We don't break existing code that uses the knowledge graph
3. We have a clear migration path to the enhanced schema