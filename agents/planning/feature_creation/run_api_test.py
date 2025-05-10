#!/usr/bin/env python3
"""
API Test for Feature Creation Agent

This script directly calls the Feature Creation Agent API and displays the raw JSON output.
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

# Create test feature request
test_request = {
    'name': 'Advanced Analytics Dashboard',
    'description': 'Create an advanced analytics dashboard that provides insights into feature usage, task completion rates, and project progress. Include customizable charts, filters by date ranges, and export capabilities.'
}

def run_test():
    # Initialize agent with all capabilities
    agent = EnhancedFeatureCreationAgent(
        use_rag=True,
        use_langchain=True,
        use_cache=False  # Disable caching for this test
    )
    
    # Process the request
    result = agent.process_feature_request(test_request)
    
    # Print the raw JSON output
    print("\n==== RAW JSON OUTPUT ====\n")
    print(json.dumps(result, indent=2))
    
    # If successful, also display the feature in a more readable format
    if result.get('success', False):
        feature = result.get('feature', {})
        
        print("\n==== FORMATTED OUTPUT ====\n")
        print(f"Feature ID: {feature.get('id')}")
        print(f"Name: {feature.get('name')}")
        print(f"Description: {feature.get('description')}")
        print(f"\nSuggested Placement:")
        print(f"  Milestone: {feature.get('suggestedMilestone')}")
        print(f"  Phase: {feature.get('suggestedPhase')}")
        print(f"  Module: {feature.get('suggestedModule')}")
        
        print(f"\nSuggested Tags:")
        for tag in feature.get('suggestedTags', []):
            print(f"  - {tag}")
        
        print(f"\nPotential Dependencies:")
        for dep in feature.get('potentialDependencies', []):
            print(f"  - {dep.get('name')} ({dep.get('id')})")
        
        print(f"\nAnalysis Details:")
        analysis = feature.get('analysisDetails', {})
        print(f"  Domain: {analysis.get('domain')}")
        print(f"  Purpose: {analysis.get('purpose')}")
        print(f"  Confidence: {analysis.get('confidence')}")
        
        # Print concepts
        print(f"\nConcepts:")
        for concept in analysis.get('concepts', []):
            print(f"  - {concept}")
    else:
        print(f"\nError: {result.get('error')}")

if __name__ == "__main__":
    run_test()