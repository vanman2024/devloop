#!/usr/bin/env python3
"""
Knowledge Graph Migration Tool

This script updates the knowledge graph schema to support enhanced feature properties.
"""

import os
import sys
import json
import logging
import shutil
import datetime
from typing import Dict, List, Any, Tuple, Optional

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'knowledge_graph_migration.log'))
    ]
)
logger = logging.getLogger('knowledge_graph_migration')

def backup_knowledge_graph() -> Tuple[bool, str]:
    """
    Backup the current knowledge graph
    
    Returns:
        Tuple of success boolean and message
    """
    try:
        # Define paths
        backup_dir = os.path.join(PROJECT_ROOT, 'backups', 'knowledge_graph_backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Create timestamped backup directory
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        backup_path = os.path.join(backup_dir, f'knowledge_graph_backup_{timestamp}')
        os.makedirs(backup_path, exist_ok=True)
        
        # Define source paths
        memory_dir = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 'system-core', 'memory')
        schema_path = os.path.join(memory_dir, 'memory-schema.json')
        kg_path = os.path.join(memory_dir, 'knowledge_graph.json')
        
        # Backup the schema
        if os.path.exists(schema_path):
            shutil.copy2(schema_path, os.path.join(backup_path, 'memory-schema.json'))
        
        # Backup the knowledge graph
        if os.path.exists(kg_path):
            shutil.copy2(kg_path, os.path.join(backup_path, 'knowledge_graph.json'))
        
        # Also check the SDK storage
        sdk_storage = os.path.expanduser("~/.devloop/sdk/storage")
        sdk_kg_path = os.path.join(sdk_storage, 'knowledge_graph.json')
        
        if os.path.exists(sdk_kg_path):
            shutil.copy2(sdk_kg_path, os.path.join(backup_path, 'sdk_knowledge_graph.json'))
        
        # Create backup info file
        with open(os.path.join(backup_path, 'backup_info.json'), 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'created_at': datetime.datetime.now().isoformat(),
                'files_backed_up': [
                    'memory-schema.json' if os.path.exists(schema_path) else None,
                    'knowledge_graph.json' if os.path.exists(kg_path) else None,
                    'sdk_knowledge_graph.json' if os.path.exists(sdk_kg_path) else None
                ],
                'migration_version': '1.0.0'
            }, f, indent=2)
        
        return True, f"Backup created at {backup_path}"
    
    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return False, f"Backup failed: {e}"

def update_knowledge_graph_schema() -> Tuple[bool, str]:
    """
    Update the knowledge graph schema to support enhanced feature properties
    
    Returns:
        Tuple of success boolean and message
    """
    try:
        # Define schema paths
        memory_dir = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 'system-core', 'memory')
        schema_path = os.path.join(memory_dir, 'memory-schema.json')
        
        # Check if schema exists
        if not os.path.exists(schema_path):
            logger.warning(f"Schema file not found at {schema_path}")
            
            # Try to find it in the SDK storage
            sdk_storage = os.path.expanduser("~/.devloop/sdk/storage")
            sdk_schema_path = os.path.join(sdk_storage, 'memory-schema.json')
            
            if os.path.exists(sdk_schema_path):
                schema_path = sdk_schema_path
            else:
                # Create a default schema
                schema = {
                    "nodeTypes": {
                        "feature": {
                            "properties": {}
                        }
                    }
                }
                
                # Create the directory if it doesn't exist
                os.makedirs(os.path.dirname(schema_path), exist_ok=True)
                
                # Write the default schema
                with open(schema_path, 'w') as f:
                    json.dump(schema, f, indent=2)
        
        # Load the schema
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        
        # Initialize schema structure if needed
        if 'nodeTypes' not in schema:
            schema['nodeTypes'] = {}
        
        if 'feature' not in schema['nodeTypes']:
            schema['nodeTypes']['feature'] = {}
        
        if 'properties' not in schema['nodeTypes']['feature']:
            schema['nodeTypes']['feature']['properties'] = {}
        
        # Add enhanced properties to the feature schema
        feature_properties = schema['nodeTypes']['feature']['properties']
        
        # Update with enhanced fields
        feature_properties.update({
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
        
        return True, f"Schema updated at {schema_path}"
    
    except Exception as e:
        logger.error(f"Schema update failed: {e}")
        return False, f"Schema update failed: {e}"

def migrate_existing_features() -> Tuple[bool, str]:
    """
    Migrate existing features to include enhanced properties
    
    Returns:
        Tuple of success boolean and message
    """
    try:
        # Try to import the MemoryKnowledgeGraph class
        try:
            from backups.system_core_backup.system_core.memory.manager.memory_knowledge_graph import MemoryKnowledgeGraph
            kg = MemoryKnowledgeGraph()
        except ImportError:
            logger.warning("Could not import MemoryKnowledgeGraph, trying fallback")
            
            # Try fallback to our mock implementation
            from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
            kg_connector = get_knowledge_graph_connector()
            kg = kg_connector.kg
        
        # Check if we have access to get_nodes_by_type
        if not hasattr(kg, 'get_nodes_by_type'):
            return False, "Knowledge graph implementation doesn't support get_nodes_by_type"
        
        # Get all feature nodes
        feature_nodes = kg.get_nodes_by_type("feature")
        
        if not feature_nodes:
            return True, "No features to migrate"
        
        # Track migration progress
        migrated_count = 0
        
        # Process each feature node
        for node in feature_nodes:
            node_id = node.get("id")
            properties = node.get("properties", {})
            
            # Check if this feature needs migration (missing enhanced fields)
            needs_migration = not any(field in properties for field in ['requirements', 'user_stories', 'priority'])
            
            if needs_migration:
                # Extract data from existing fields
                description = properties.get("description", "")
                purpose = properties.get("purpose", "enhancement")
                
                # Generate requirements from description
                requirements = []
                if description:
                    sentences = [s.strip() for s in description.split('.') if s.strip()]
                    requirements = [s for s in sentences if len(s) > 10]
                
                # Determine priority based on purpose
                if purpose == 'bugfix':
                    priority = 'high'
                elif purpose == 'new_feature':
                    priority = 'medium'
                elif purpose == 'enhancement':
                    priority = 'medium'
                else:
                    priority = 'low'
                
                # Get domain for user story generation
                domain = properties.get("domain", "unknown")
                name = properties.get("name", "").lower()
                user_stories = []
                
                if domain == 'ui':
                    user_stories.append(f"As a user, I want to {name}, so that I can interact with the system more effectively")
                elif domain == 'testing':
                    user_stories.append(f"As a tester, I want to {name}, so that I can validate system functionality")
                elif domain == 'data':
                    user_stories.append(f"As a data analyst, I want to {name}, so that I can manage data more effectively")
                elif domain == 'api':
                    user_stories.append(f"As a developer, I want to {name}, so that I can integrate with other systems")
                elif domain == 'agent':
                    user_stories.append(f"As a system, I want to {name}, so that I can automate processes")
                
                # Add enhanced fields to properties
                properties.update({
                    'requirements': requirements,
                    'user_stories': user_stories,
                    'priority': priority,
                    'effort_estimate': 'medium',
                    'risk_level': 'medium',
                    'test_coverage': 80,
                    'version': '1.0.0',
                    'stakeholders': []
                })
                
                # Update the node
                if hasattr(kg, 'update_node'):
                    kg.update_node(node_id, properties=properties)
                else:
                    # Fallback using add_node with the same ID (should overwrite)
                    metadata = node.get("metadata", {})
                    kg.add_node(node_id, node_type="feature", properties=properties, metadata=metadata)
                
                migrated_count += 1
        
        # Save the knowledge graph
        if hasattr(kg, 'save'):
            kg.save()
        
        return True, f"Migration successful: {migrated_count} features migrated"
    
    except Exception as e:
        logger.error(f"Feature migration failed: {e}")
        return False, f"Feature migration failed: {e}"

def main():
    """
    Main entry point for the knowledge graph migration
    """
    print("Knowledge Graph Schema Update Tool")
    print("----------------------------------")
    print("This tool will update the knowledge graph schema to support enhanced feature properties.")
    print("It will:")
    print("1. Backup the current knowledge graph")
    print("2. Update the schema to support enhanced properties")
    print("3. Migrate existing features to include enhanced properties")
    print()
    
    # Auto-confirm in testing mode
    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        confirmation = "y"
        print("Auto-confirming migration (--auto flag detected)")
    else:
        # Ask for confirmation
        confirmation = input("Do you want to continue? (y/n): ")
    
    if confirmation.lower() != 'y':
        print("Migration cancelled.")
        return
    
    print("\nStarting schema update...")
    
    # Backup the knowledge graph
    print("\n1. Backing up knowledge graph...")
    success, message = backup_knowledge_graph()
    print(f"Result: {message}")
    
    if not success:
        print("\nUpdate failed at backup step. Please check the logs.")
        return
    
    # Update the schema
    print("\n2. Updating schema...")
    success, message = update_knowledge_graph_schema()
    print(f"Result: {message}")
    
    if not success:
        print("\nUpdate failed at schema update step. Please check the logs.")
        return
    
    # Migrate existing features
    print("\n3. Migrating existing features...")
    success, message = migrate_existing_features()
    print(f"Result: {message}")
    
    if not success:
        print("\nUpdate failed at feature migration step. Please check the logs.")
        return
    
    print("\nSchema update completed successfully!")
    print("\nThe knowledge graph now supports enhanced feature properties:")
    print("- requirements: Extracted requirements from description")
    print("- user_stories: User stories associated with the feature")
    print("- priority: Feature priority (high, medium, low)")
    print("- effort_estimate: Estimated effort to implement")
    print("- risk_level: Risk level of implementation")
    print("- test_coverage: Required test coverage percentage")
    print("- version: Target version for implementation")
    print("- stakeholders: Teams or individuals interested in the feature")
    
if __name__ == "__main__":
    main()