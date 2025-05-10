#!/usr/bin/env python3
"""
Knowledge-Enhanced Agent Orchestration Example

This script demonstrates how to use the orchestration service with knowledge integration
to enhance task execution with relevant contextual information from the knowledge base.
"""

import os
import sys
import json
from pathlib import Path

# Add project root to path
PROJECT_ROOT = '/mnt/c/Users/angel/devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import orchestration service
from agents.utils.orchestration_service import (
    get_orchestration_service, 
    Agent, 
    AgentProvider, 
    AgentType, 
    AgentRole
)

# Try to import knowledge API
try:
    from agents.utils.knowledge_api import knowledge_api
    KNOWLEDGE_API_AVAILABLE = True
except ImportError:
    print("Knowledge API not available")
    KNOWLEDGE_API_AVAILABLE = False

def main():
    """Run the knowledge-enhanced orchestration example"""
    print("Starting Knowledge-Enhanced Orchestration Example")
    
    # Initialize orchestration service
    orchestration_service = get_orchestration_service()
    
    # Check if knowledge API is available
    if not KNOWLEDGE_API_AVAILABLE:
        print("WARNING: Knowledge API is not available. Example will run without knowledge enhancement.")
    else:
        print(f"Knowledge API is available. Documents: {knowledge_api.list_documents().get('count', 0)}")
    
    # Create an Anthropic agent for feature creation
    agent_id = "feature_creation_agent"
    agent = Agent(
        agent_id=agent_id,
        name="Feature Creation Agent",
        agent_type=AgentType.FEATURE_CREATION,
        provider=AgentProvider.ANTHROPIC,
        role=AgentRole.WORKER,
        capabilities=["feature_planning", "code_generation", "architecture_review"],
        domain="feature_creation",
        config={
            "api_key": os.environ.get("ANTHROPIC_API_KEY"),
            "model": "claude-3-opus-20240229",
            "instructions": "You are an expert feature creation agent that helps design and implement features."
        }
    )
    
    # Register agent with the orchestration service
    if agent_id not in orchestration_service.agents:
        orchestration_service.register_agent(agent)
        print(f"Registered agent: {agent.name}")
    else:
        print(f"Agent {agent.name} already registered")
    
    # Create a task with a description that will trigger knowledge context retrieval
    print("\nCreating task for feature implementation...")
    task = orchestration_service.create_task(
        description="Design and implement a dark mode feature for the UI system that integrates with the existing theming architecture",
        agent_id=agent_id,
        input_data={
            "prompt": "Please design and implement a dark mode feature for our UI system. Consider how it will integrate with our existing theming architecture.",
            "system_prompt": "You are an expert feature creation agent. Create a detailed plan for implementing the requested feature."
        }
    )
    
    print(f"Created task: {task.task_id}")
    
    # Execute the task, which will automatically enhance it with knowledge context
    print("\nExecuting task with knowledge enhancement...")
    result = orchestration_service.execute_task(task.task_id)
    
    # Check if the task was successful
    if result.get("success", False):
        print("\nTask executed successfully!")
        
        # Get the task details
        task = orchestration_service.get_task(task.task_id)
        
        # Check if knowledge context was added
        if "knowledge_context" in task.input_data:
            knowledge_docs = task.input_data["knowledge_context"]
            print(f"\nTask was enhanced with {len(knowledge_docs)} knowledge documents:")
            
            for i, doc in enumerate(knowledge_docs):
                print(f"  Document {i+1}: {doc.get('title', 'Untitled')}")
                
            print("\nResponse (first 500 chars):")
            print(f"{result.get('output', '')[:500]}...")
        else:
            print("\nNo knowledge context was added to the task.")
            print("\nResponse (first 500 chars):")
            print(f"{result.get('output', '')[:500]}...")
    else:
        print(f"\nTask execution failed: {result.get('error', 'Unknown error')}")
    
    print("\nExample completed.")


if __name__ == "__main__":
    main()