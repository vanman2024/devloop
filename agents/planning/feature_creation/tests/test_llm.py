#!/usr/bin/env python3
"""
Test script for LLM connector

This script tests the LLM connector to verify that the OpenAI API is working
and the feature creation agent can use it for feature analysis and placement.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List

# Add project root to path to allow importing common modules
# Find project root
PROJECT_ROOT = os.environ.get('PROJECT_ROOT')
if not PROJECT_ROOT:
    # Try to find it by traversing up from the current file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)  # agents/planning
    parent_dir = os.path.dirname(parent_dir)   # agents
    PROJECT_ROOT = os.path.dirname(parent_dir) # Devloop root

if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Add current directory to path to allow importing local modules
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('test_llm')

def test_llm_connector():
    """Test the LLM connector"""
    try:
        from llm_connector import get_llm_connector
        from config import is_llm_available, get_config
        
        # Check if LLM is available
        if not is_llm_available():
            print("\n❌ LLM is not available - OpenAI API key is not configured")
            print("\nAPI key not found in:")
            print("  - .env file (RAG_OPENAI_API_KEY or OPENAI_API_KEY)")
            print("  - Environment variables (OPENAI_API_KEY)")
            return False
        
        # Get the LLM connector
        llm_connector = get_llm_connector()
        
        print("\n✅ LLM connector initialized successfully")
        print(f"Model: {llm_connector.openai_config['model']}")
        
        # Test text generation
        print("\n🧪 Testing text generation...")
        prompt = "Explain what a feature creation agent does in one sentence."
        response = llm_connector.generate_text(prompt)
        
        print(f"\nPrompt: {prompt}")
        print(f"Response: {response}")
        
        # Test structured output
        print("\n🧪 Testing structured output...")
        prompt = """
Analyze the following feature description:

Feature: Task Management Integration
Description: Add task management capabilities to the feature management system, allowing users to create, assign, and track tasks associated with features.
"""
        
        output_schema = {
            "domain": {"type": "string"},
            "concepts": {"type": "array", "items": {"type": "string"}},
            "purpose": {"type": "string"}
        }
        
        response = llm_connector.generate_structured_output(prompt, output_schema)
        
        print(f"\nPrompt: {prompt.strip()}")
        print(f"Response: {json.dumps(response, indent=2)}")
        
        # Test embeddings
        print("\n🧪 Testing embeddings...")
        texts = [
            "Task management integration for feature system",
            "Knowledge graph connector for semantic relationships"
        ]
        
        embeddings = llm_connector.create_embeddings(texts)
        
        print(f"\nGenerated {len(embeddings)} embeddings")
        print(f"Embedding dimension: {len(embeddings[0])}")
        print(f"First few values of first embedding: {embeddings[0][:5]}")
        
        print("\n✅ All LLM tests passed successfully")
        return True
    
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print("Make sure you have the required packages installed")
        return False
    
    except Exception as e:
        print(f"\n❌ Error testing LLM connector: {e}")
        return False

def test_feature_agent():
    """Test the feature creation agent with LLM integration"""
    try:
        # Try to import the enhanced agent
        from enhanced_core import EnhancedFeatureCreationAgent
        
        print("\n🧪 Testing Enhanced Feature Creation Agent...")
        
        # Initialize the agent with RAG and LangChain enabled
        agent = EnhancedFeatureCreationAgent(
            use_rag=True,
            use_langchain=True,
            use_cache=False  # Disable caching for testing
        )
        
        print(f"\n✅ Agent initialized: {agent.agent_name} v{agent.version}")
        
        # Process a sample feature request
        request = {
            'name': 'Task Management Dashboard',
            'description': 'Create a dedicated dashboard for task management, showing task status, assignments, and due dates with filtering capabilities by feature, milestone, and assignee.'
        }
        
        print(f"\n🧪 Processing feature request: {request['name']}")
        result = agent.process_feature_request(request)
        
        if not result.get('success', False):
            print(f"\n❌ Feature processing failed: {result.get('error', 'Unknown error')}")
            return False
        
        # Display the results
        feature = result.get('feature', {})
        
        print("\n✅ Feature processed successfully")
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
        
        analysis = feature.get('analysisDetails', {})
        print(f"\nDomain:     {analysis.get('domain', '')}")
        print(f"Purpose:    {analysis.get('purpose', '')}")
        print(f"Confidence: {analysis.get('confidence', 0):.2f}")
        
        print("\n✅ Feature Creation Agent test completed successfully")
        return True
        
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print("Make sure you have the required packages installed")
        return False
    
    except Exception as e:
        print(f"\n❌ Error testing feature agent: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n🚀 LLM Integration Test\n")
    
    # Test the LLM connector
    llm_success = test_llm_connector()
    
    if llm_success:
        # Test the feature agent with LLM integration
        test_feature_agent()
    
    print("\nTest completed.")