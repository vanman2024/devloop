#!/usr/bin/env python3
"""
Test script for the knowledge graph integration with enhanced feature properties
"""

import os
import sys
import logging
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('test_kg_integration')

# Add project root to path
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import required modules
# Try direct imports first
try:
    from knowledge_graph_connector import get_knowledge_graph_connector
    from tag_management import get_tag_manager
except ImportError:
    # Fall back to fully qualified imports
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    from agents.planning.feature_creation.tag_management import get_tag_manager

def test_add_feature_with_enhanced_properties():
    """Test adding a feature with enhanced properties to the knowledge graph"""
    logger.info("Testing enhanced feature creation in knowledge graph...")
    
    # Get knowledge graph connector
    kg_connector = get_knowledge_graph_connector()
    logger.info("Knowledge graph connector initialized")
    
    # Check if we're using a mock implementation
    is_mock = False
    try:
        from backups.system_core_backup.system_core.memory.manager.memory_knowledge_graph import MemoryKnowledgeGraph
        real_kg = True
        logger.info("Using real MemoryKnowledgeGraph implementation")
    except ImportError:
        is_mock = True
        logger.warning("IMPORTANT: Using mock MemoryKnowledgeGraph implementation - test may not be valid")
        
    # If we're using the mock implementation and not in forced mode, return false
    if is_mock and '--force' not in sys.argv:
        logger.error("Test aborted: Using mock implementation without --force flag")
        logger.error("To run against mock implementation for testing, use --force flag")
        return False
    
    # Create a test feature with enhanced properties
    feature_id = f"test-feature-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    feature_data = {
        'id': feature_id,
        'name': 'Test Enhanced Feature',
        'description': 'A test feature with enhanced properties',
        'milestone': 'milestone-test',
        'phase': 'phase-01',
        'module': 'module-test',
        'tags': ['test', 'enhanced', 'knowledge-graph'],
        'domain': 'testing',
        'purpose': 'enhancement',
        'status': 'not-started',
        'requirements': [
            'The feature should be added to the knowledge graph',
            'The feature should include enhanced properties',
            'The feature should be integrated properly with the knowledge graph'
        ],
        'user_stories': [
            'As a developer, I want to verify the enhanced feature properties, so that I can ensure they work correctly'
        ],
        'priority': 'high',
        'effort_estimate': 'low',
        'risk_level': 'low',
        'test_coverage': 95,
        'version': '1.0.0',
        'stakeholders': ['developers', 'testers']
    }
    
    # Add the feature to the knowledge graph
    logger.info(f"Adding feature {feature_id} to knowledge graph")
    success, message = kg_connector.add_feature(feature_data)
    logger.info(f"Add feature result: {success}, message: {message}")
    
    if not success:
        logger.error("Failed to add feature to knowledge graph")
        return False
    
    # Verify the feature was added successfully
    logger.info(f"Verifying feature {feature_id} in knowledge graph")
    node = kg_connector.kg.get_node(feature_id)
    
    if not node:
        logger.error(f"Feature {feature_id} not found in knowledge graph")
        return False
    
    # Check if enhanced properties were added correctly
    properties = node.get("properties", {})
    enhanced_fields = [
        "requirements", "user_stories", "priority", 
        "effort_estimate", "risk_level", "test_coverage",
        "version", "stakeholders"
    ]
    
    for field in enhanced_fields:
        if field not in properties:
            logger.error(f"Enhanced field {field} not found in feature properties")
            return False
    
    logger.info("All enhanced fields found in feature properties")
    
    # Test tag management
    logger.info("Testing tag management with the feature tags")
    try:
        tag_manager = get_tag_manager()
        tags = feature_data.get("tags", [])
        processed_tags = tag_manager.process_tags(tags, domain=feature_data.get("domain"))
        logger.info(f"Processed tags: {processed_tags}")
    except Exception as e:
        logger.error(f"Error in tag management: {e}")
    
    # Test querying related features
    logger.info("Testing querying related features")
    related_features = kg_connector.get_related_features(feature_id)
    logger.info(f"Found {len(related_features.get('same_domain', []))} features in same domain")
    
    # Clean up by removing the test feature
    logger.info(f"Test completed. Feature {feature_id} was successfully added with enhanced properties")
    
    return True

def main():
    """Main entry point for the test script"""
    print("Testing Knowledge Graph Integration")
    print("----------------------------------")
    
    # Check if running in force mode
    force_mode = '--force' in sys.argv
    if force_mode:
        print("WARNING: Running in force mode - will proceed even with mock implementation")
    
    # Run the test
    result = test_add_feature_with_enhanced_properties()
    
    if result:
        if force_mode:
            print("\nTEST PASSED (MOCK): Successfully integrated enhanced features with mock knowledge graph")
            print("NOTE: This test used a mock implementation, not a real knowledge graph")
        else:
            print("\nTEST PASSED: Successfully integrated enhanced features with knowledge graph")
    else:
        if force_mode:
            print("\nTEST FAILED: Issues even with mock knowledge graph implementation")
        else:
            print("\nTEST FAILED: Issues integrating enhanced features with knowledge graph")
            print("If you're using a mock implementation, try running with --force to test anyway")
    
    return 0 if result else 1

if __name__ == "__main__":
    sys.exit(main())