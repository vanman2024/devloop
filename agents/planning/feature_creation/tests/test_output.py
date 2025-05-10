#!/usr/bin/env python3
"""
Test script to demonstrate the output of the Enhanced Feature Creation Agent
"""

import json
import os
import sys

# Add project root to path to allow importing common modules
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import the Enhanced Feature Creation Agent
try:
    from agents.planning.feature_creation.enhanced_core import EnhancedFeatureCreationAgent
except ImportError:
    from enhanced_core import EnhancedFeatureCreationAgent

def test_feature_creation():
    """Test feature creation and display the output"""
    # Create agent instance
    agent = EnhancedFeatureCreationAgent()
    
    # Process a sample feature request
    result = agent.process_feature_request({
        'name': 'Knowledge Graph Visualization',
        'description': 'Create a visualization component for the knowledge graph that displays nodes and relationships in an interactive manner. Allow users to explore the graph, filter by node types, and search for specific nodes.',
        'tags': ['ui', 'visualization', 'knowledge-graph', 'interactive'],
        'projectId': 'devloop-main'
    })
    
    # Print the result in a formatted way
    print("\n===== FEATURE CREATION OUTPUT =====\n")
    
    if result['success']:
        feature = result['feature']
        
        print(f"Feature ID: {feature['id']}")
        print(f"Name: {feature['name']}")
        print(f"Description: {feature['description']}")
        print("\nSuggested Placement:")
        print(f"  Milestone: {feature['suggestedMilestone']}")
        print(f"  Phase: {feature['suggestedPhase']}")
        print(f"  Module: {feature['suggestedModule']}")
        
        print("\nAnalysis Details:")
        print(f"  Domain: {feature['analysisDetails']['domain']}")
        print(f"  Purpose: {feature['analysisDetails']['purpose']}")
        print(f"  Confidence: {feature['analysisDetails']['confidence']}")
        
        print("\nConcepts:")
        for concept in feature['analysisDetails'].get('concepts', []):
            print(f"  - {concept}")
        
        print("\nSuggested Tags:")
        for tag in feature['suggestedTags']:
            print(f"  - {tag}")
        
        print("\nPotential Dependencies:")
        for dep in feature['potentialDependencies']:
            print(f"  - {dep['name']} ({dep['id']})")
        
        # Save the confirmed feature to the knowledge graph
        print("\n===== SAVING FEATURE TO KNOWLEDGE GRAPH =====\n")
        
        # Update the knowledge graph
        update_result = agent.execute_operation('update_knowledge_base', {
            'id': feature['id'],
            'data': {
                'name': feature['name'],
                'description': feature['description'],
                'milestone': feature['suggestedMilestone'],
                'phase': feature['suggestedPhase'],
                'module': feature['suggestedModule'],
                'tags': feature['suggestedTags'],
                'domain': feature['analysisDetails']['domain'],
                'purpose': feature['analysisDetails']['purpose'],
                'dependencies': feature['potentialDependencies']
            }
        })
        
        print(f"Knowledge Graph Update Success: {update_result['success']}")
        if update_result['success']:
            print(f"Vector Store Updated: {update_result['result']['vector_store']}")
            print(f"Knowledge Graph Updated: {update_result['result']['knowledge_graph']}")
            print(f"MongoDB Updated: {update_result['result']['mongo_db']}")
            print(f"RAG Engine Updated: {update_result['result']['rag_engine']}")
        
        # Query for related features
        print("\n===== RELATED FEATURES =====\n")
        
        related_result = agent.execute_operation('get_related_features', {
            'id': feature['id']
        })
        
        if 'success' in related_result and related_result['success']:
            related = related_result['result']
            
            print("Dependencies:")
            for dep in related.get('dependencies', []):
                print(f"  - {dep.get('name', '')} ({dep.get('id', '')})")
            
            print("\nSame Domain Features:")
            for feat in related.get('same_domain', []):
                print(f"  - {feat.get('name', '')} ({feat.get('id', '')})")
            
            print("\nShared Concepts Features:")
            for feat in related.get('shared_concepts', []):
                print(f"  - {feat.get('name', '')} ({feat.get('id', '')})")
        else:
            print("No related features found")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")
    
    return result

if __name__ == "__main__":
    test_feature_creation()