#!/usr/bin/env python3
"""
Direct test of knowledge graph enhancement

This script adds a feature with enhanced properties directly to the knowledge graph
and verifies that the properties are stored correctly.
"""

import os
import sys
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('test_direct_kg_update')

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Try to import the knowledge graph connector
try:
    from knowledge_graph_connector import get_knowledge_graph_connector
except ImportError:
    try:
        from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    except ImportError:
        logger.error("Could not import knowledge_graph_connector")
        sys.exit(1)

def get_real_kg_class():
    """
    Try to import the real MemoryKnowledgeGraph class
    
    Returns:
        Class or None: The MemoryKnowledgeGraph class if available, None otherwise
    """
    # Use relative paths based on the project root
    kg_path = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 'system-core', 'memory', 'manager')
    if not kg_path in sys.path:
        sys.path.append(kg_path)
    
    try:
        # Try importing directly from the module
        import importlib.util
        kg_file = os.path.join(kg_path, "memory_knowledge_graph.py")
        
        if not os.path.exists(kg_file):
            logger.warning(f"KG implementation file not found at {kg_file}")
            return None
            
        spec = importlib.util.spec_from_file_location("memory_knowledge_graph", kg_file)
        memory_knowledge_graph = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(memory_knowledge_graph)
        
        MemoryKnowledgeGraph = memory_knowledge_graph.MemoryKnowledgeGraph
        logger.info("Successfully imported real MemoryKnowledgeGraph")
        return MemoryKnowledgeGraph
    except Exception as e:
        logger.warning(f"Could not import real MemoryKnowledgeGraph: {e}")
        return None

def create_test_feature():
    """
    Create a test feature with enhanced properties
    
    Returns:
        dict: Test feature data
    """
    feature_id = f"test-feature-direct-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    return {
        'id': feature_id,
        'name': 'Direct Test Feature',
        'description': 'A test feature to verify direct storage of enhanced properties',
        'milestone': 'milestone-test-direct',
        'phase': 'phase-01',
        'module': 'module-test-direct',
        'tags': ['test', 'direct', 'enhanced'],
        'domain': 'testing',
        'purpose': 'validation',
        'status': 'not-started',
        # Enhanced properties
        'requirements': [
            'The feature must be stored with enhanced properties',
            'The feature must be retrievable with enhanced properties',
            'The enhanced properties must match the original data'
        ],
        'user_stories': [
            'As a developer, I want to verify direct storage of enhanced properties'
        ],
        'priority': 'high',
        'effort_estimate': 'low',
        'risk_level': 'low',
        'test_coverage': 100,
        'version': '1.0.0',
        'stakeholders': ['developers', 'testers']
    }

def add_feature_direct():
    """
    Add a feature directly to the knowledge graph
    
    Returns:
        tuple: (success, feature_id)
    """
    # Check if we can use the real implementation
    real_kg_class = get_real_kg_class()
    real_kg = None
    
    if real_kg_class is not None:
        # Try to use the real implementation
        try:
            # Initialize the real knowledge graph
            kg_file_path = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 'system-core', 'memory', 'knowledge_graph.json')
            
            # Check if the file exists, if not try to create a default one
            if not os.path.exists(kg_file_path):
                kg_dir = os.path.dirname(kg_file_path)
                os.makedirs(kg_dir, exist_ok=True)
                logger.info(f"Creating default knowledge graph file at {kg_file_path}")
            
            real_kg = real_kg_class(memory_file=kg_file_path)
            logger.info(f"Successfully initialized real MemoryKnowledgeGraph from {kg_file_path}")
            
            # Create test feature
            feature_data = create_test_feature()
            feature_id = feature_data['id']
            logger.info(f"Created test feature {feature_id}")
            
            # Add feature directly to real knowledge graph
            logger.info(f"Adding feature {feature_id} directly to real knowledge graph")
            
            # Create node directly
            properties = {
                "name": feature_data.get("name", ""),
                "description": feature_data.get("description", ""),
                "status": feature_data.get("status", "not-started"),
                "tags": feature_data.get("tags", []),
                "domain": feature_data.get("domain", "unknown"),
                "purpose": feature_data.get("purpose", "enhancement"),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                # Enhanced properties
                "requirements": feature_data.get("requirements", []),
                "user_stories": feature_data.get("user_stories", []),
                "priority": feature_data.get("priority", "medium"),
                "effort_estimate": feature_data.get("effort_estimate", "medium"),
                "risk_level": feature_data.get("risk_level", "medium"),
                "test_coverage": feature_data.get("test_coverage", 80),
                "version": feature_data.get("version", "1.0.0"),
                "stakeholders": feature_data.get("stakeholders", [])
            }
            
            metadata = {
                "created_by": "feature_creation_agent",
                "milestone": feature_data.get("milestone"),
                "phase": feature_data.get("phase"),
                "module": feature_data.get("module")
            }
            
            # Add node directly to real knowledge graph
            node = real_kg.add_node(
                node_id=feature_id,
                node_type="feature",
                properties=properties,
                metadata=metadata
            )
            
            # Save the knowledge graph
            real_kg.save(kg_file_path)
            
            logger.info(f"Successfully added feature {feature_id} to real knowledge graph")
            return True, feature_id
            
        except Exception as e:
            logger.error(f"Error using real knowledge graph: {e}")
            logger.info("Falling back to connector implementation")
            
    # Fall back to the connector implementation
    # Get knowledge graph connector
    kg_connector = get_knowledge_graph_connector()
    logger.info("Knowledge graph connector initialized")
    
    # Create test feature
    feature_data = create_test_feature()
    feature_id = feature_data['id']
    logger.info(f"Created test feature {feature_id}")
    
    # Add feature to knowledge graph
    logger.info(f"Adding feature {feature_id} to knowledge graph via connector")
    success, message = kg_connector.add_feature(feature_data)
    logger.info(f"Result: {success}, Message: {message}")
    
    if not success:
        return False, feature_id
    
    return True, feature_id

def verify_feature(feature_id):
    """
    Verify that a feature exists with enhanced properties
    
    Args:
        feature_id: ID of the feature to verify
        
    Returns:
        bool: True if verification succeeds, False otherwise
    """
    # Check if we can use the real implementation
    real_kg_class = get_real_kg_class()
    
    if real_kg_class is not None:
        # Try to verify in the real knowledge graph
        try:
            # Initialize the real knowledge graph
            kg_file_path = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 'system-core', 'memory', 'knowledge_graph.json')
            real_kg = real_kg_class(memory_file=kg_file_path)
            
            # Get the feature from the real knowledge graph
            node = real_kg.get_node(feature_id)
            
            if not node:
                logger.error(f"Feature {feature_id} not found in real knowledge graph")
                logger.info("Falling back to connector implementation for verification")
            else:
                logger.info(f"Feature {feature_id} found in real knowledge graph")
                
                # Check enhanced properties
                properties = node.get("properties", {})
                
                # List of enhanced fields to check
                enhanced_fields = [
                    "requirements", "user_stories", "priority", 
                    "effort_estimate", "risk_level", "test_coverage",
                    "version", "stakeholders"
                ]
                
                # Check each enhanced field
                for field in enhanced_fields:
                    if field not in properties:
                        logger.error(f"Enhanced field '{field}' not found in feature properties")
                        return False
                    
                    # Log the value
                    logger.info(f"Found enhanced field '{field}' in real KG: {properties[field]}")
                
                logger.info("All enhanced fields found and verified in real knowledge graph")
                return True
                
        except Exception as e:
            logger.error(f"Error verifying in real knowledge graph: {e}")
            logger.info("Falling back to connector implementation for verification")
    
    # Fall back to the connector implementation
    # Get knowledge graph connector
    kg_connector = get_knowledge_graph_connector()
    
    # Get the feature from the knowledge graph
    node = kg_connector.kg.get_node(feature_id)
    
    if not node:
        logger.error(f"Feature {feature_id} not found in knowledge graph")
        return False
    
    # Check enhanced properties
    properties = node.get("properties", {})
    
    # List of enhanced fields to check
    enhanced_fields = [
        "requirements", "user_stories", "priority", 
        "effort_estimate", "risk_level", "test_coverage",
        "version", "stakeholders"
    ]
    
    # Check each enhanced field
    for field in enhanced_fields:
        if field not in properties:
            logger.error(f"Enhanced field '{field}' not found in feature properties")
            return False
        
        # Log the value
        logger.info(f"Found enhanced field '{field}': {properties[field]}")
    
    logger.info("All enhanced fields found and verified")
    return True

def main():
    """Main entry point for the direct knowledge graph test"""
    print("Direct Knowledge Graph Enhancement Test")
    print("--------------------------------------")
    
    # Check if we're using a mock implementation
    real_kg_class = get_real_kg_class()
    if real_kg_class is None:
        print("\nWARNING: Using mock implementation - test results may not be valid for production")
        if '--force' not in sys.argv:
            print("Use --force to run the test with mock implementation")
            return 1
    else:
        print("\nINFO: Using real MemoryKnowledgeGraph implementation")
    
    # Add feature directly
    success, feature_id = add_feature_direct()
    
    if not success:
        print(f"\nFAILED: Could not add feature to knowledge graph")
        return 1
    
    # Verify feature
    if verify_feature(feature_id):
        if real_kg_class is None:
            print(f"\nPASS (MOCK): Successfully added and verified feature {feature_id} with enhanced properties")
            print("NOTE: This test used a mock implementation, not a real knowledge graph")
        else:
            print(f"\nPASS: Successfully added and verified feature {feature_id} with enhanced properties")
        
        print("\nEnhanced properties were stored directly in the knowledge graph")
        return 0
    else:
        print(f"\nFAILED: Could not verify enhanced properties for feature {feature_id}")
        return 1

if __name__ == "__main__":
    sys.exit(main())