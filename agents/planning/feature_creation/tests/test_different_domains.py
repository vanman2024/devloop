#!/usr/bin/env python3
"""
Test Feature Creation Agent across different domains

This script tests the feature creation agent with a variety of feature types
to demonstrate its adaptability across domains.
"""

import os
import sys
import json
import pprint

# Find project root
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)  # agents/planning
parent_dir = os.path.dirname(parent_dir)   # agents
PROJECT_ROOT = os.path.dirname(parent_dir) # Devloop root

# Add to path
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the agent
from enhanced_core import EnhancedFeatureCreationAgent

# Create test features spanning different domains
test_features = [
    {
        'domain': 'Testing',
        'name': 'Automated Integration Test Framework',
        'description': 'Create a framework for automating integration tests across the entire system, with support for mocking dependencies, generating test data, and producing comprehensive reports.'
    },
    {
        'domain': 'Data',
        'name': 'Knowledge Graph Query API',
        'description': 'Develop an API for querying the knowledge graph, enabling complex queries to discover relationships between components, track dependencies, and identify potential optimizations.'
    },
    {
        'domain': 'Agent',
        'name': 'Autonomous Feature Optimizer',
        'description': 'Build an AI agent that can analyze feature performance, user feedback, and system metrics to suggest optimizations and improvements to existing features.'
    }
]

def run_tests():
    # Initialize agent with all capabilities
    agent = EnhancedFeatureCreationAgent(
        use_rag=True,
        use_langchain=True,
        use_cache=False  # Disable caching for these tests
    )
    
    # Process each feature request
    for i, feature in enumerate(test_features):
        print(f"\n\n{'='*40}")
        print(f"  Testing Domain: {feature['domain']}")
        print(f"{'='*40}\n")
        
        print(f"Feature: {feature['name']}")
        print(f"Description: {feature['description']}")
        
        # Process the request
        result = agent.process_feature_request(feature)
        
        # Display the results
        if result.get('success', False):
            feature_result = result.get('feature', {})
            
            print(f"\n--- ANALYSIS RESULTS ---\n")
            print(f"Detected Domain: {feature_result.get('analysisDetails', {}).get('domain')}")
            print(f"Detected Purpose: {feature_result.get('analysisDetails', {}).get('purpose')}")
            print(f"Confidence: {feature_result.get('analysisDetails', {}).get('confidence')}")
            
            print(f"\n--- PLACEMENT SUGGESTION ---\n")
            print(f"Milestone: {feature_result.get('suggestedMilestone')}")
            print(f"Phase: {feature_result.get('suggestedPhase')}")
            print(f"Module: {feature_result.get('suggestedModule')}")
            
            print(f"\n--- TAGS ---\n")
            for tag in feature_result.get('suggestedTags', []):
                print(f"  - {tag}")
            
            print(f"\n--- DEPENDENCIES ---\n")
            for dep in feature_result.get('potentialDependencies', []):
                print(f"  - {dep.get('name')} ({dep.get('id')})")
        else:
            print(f"\nError: {result.get('error')}")
        
        # Add a separator
        if i < len(test_features) - 1:
            print("\n" + "-"*60)

if __name__ == "__main__":
    run_tests()