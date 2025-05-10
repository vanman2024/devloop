#!/usr/bin/env python3
"""
Demo script for Enhanced Feature Creation Agent

This script demonstrates the enhanced feature creation agent by
processing a sample feature request and displaying the results.
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Add project root to path to allow importing agent modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('feature_creation_demo')

# Import the agents
try:
    # Try to import the enhanced agent (may fail due to dependencies)
    logger.info("Attempting to import Enhanced Agent...")
    from enhanced_core import EnhancedFeatureCreationAgent
    enhanced_available = True
except ImportError as e:
    logger.warning(f"Enhanced agent not available: {e}")
    enhanced_available = False

# Always import the basic agent as fallback
from core import FeatureCreationAgent
logger.info("Imported Basic Agent")

def process_sample_request():
    """Process a sample feature request with the available agent"""
    
    # Sample feature request
    request = {
        'name': 'Knowledge Graph Integration',
        'description': 'Integrate feature agents with the knowledge graph to enable better feature placement suggestions based on semantic relationships between components.',
        'projectId': 'devloop-core'
    }
    
    logger.info(f"Processing sample request: {request['name']}")
    
    # Try the enhanced agent first if available
    if enhanced_available:
        try:
            logger.info("Using Enhanced Feature Creation Agent...")
            agent = EnhancedFeatureCreationAgent(
                use_rag=False,       # Disable RAG to avoid LLM dependencies
                use_langchain=False, # Disable LangChain to avoid those dependencies
                use_cache=False      # Disable Redis cache for simplicity
            )
            result = agent.process_feature_request(request)
            logger.info(f"Enhanced agent processing completed. Success: {result['success']}")
            return result
        except Exception as e:
            logger.error(f"Enhanced agent failed: {e}")
    
    # Fall back to basic agent
    logger.info("Using Basic Feature Creation Agent...")
    agent = FeatureCreationAgent()
    result = agent.process_feature_request(request)
    logger.info(f"Basic agent processing completed. Success: {result['success']}")
    return result

def display_result(result: Dict[str, Any]):
    """Display the feature processing result in a readable format"""
    
    if not result.get('success', False):
        print("\n❌ Feature processing failed")
        print(f"Error: {result.get('error', 'Unknown error')}")
        return
    
    feature = result.get('feature', {})
    
    print("\n✅ Feature processing successful")
    print("\n📋 Feature Details:")
    print(f"ID:          {feature.get('id', '')}")
    print(f"Name:        {feature.get('name', '')}")
    print(f"Description: {feature.get('description', '')}")
    
    print("\n📍 Suggested Placement:")
    print(f"Milestone:   {feature.get('suggestedMilestone', '')}")
    print(f"Phase:       {feature.get('suggestedPhase', '')}")
    print(f"Module:      {feature.get('suggestedModule', '')}")
    
    print("\n🏷️ Suggested Tags:")
    for tag in feature.get('suggestedTags', []):
        print(f"  - {tag}")
    
    print("\n🔗 Potential Dependencies:")
    for dep in feature.get('potentialDependencies', []):
        print(f"  - {dep.get('name', '')} ({dep.get('id', '')})")
    
    print("\n📊 Analysis Details:")
    analysis = feature.get('analysisDetails', {})
    print(f"Domain:     {analysis.get('domain', '')}")
    print(f"Purpose:    {analysis.get('purpose', '')}")
    print(f"Confidence: {analysis.get('confidence', 0):.2f}")
    
    print("\nConcepts:")
    for concept in analysis.get('concepts', []):
        print(f"  - {concept}")

if __name__ == "__main__":
    print("\n🚀 Feature Creation Agent Demo\n")
    result = process_sample_request()
    display_result(result)
    print("\nDemo completed.")