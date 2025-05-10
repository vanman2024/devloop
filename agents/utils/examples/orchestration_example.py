"""
Orchestration Example for Feature Creation and Task Breakdown

This example demonstrates how to use the orchestration service to:
1. Initialize a conversation with a user request for a new feature
2. Execute the Feature Creation to Task Breakdown workflow
3. Track the progress of the workflow execution
4. Retrieve the results of each agent's work
"""

import sys
import os
import json
import asyncio
from pathlib import Path

# Add parent directory to path to import orchestration_service
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

from orchestration_service import (
    OrchestrationService,
    AgentProvider, 
    AgentType,
    AgentRole,
    TaskStatus,
    WorkflowExecutionMode
)

async def run_orchestration_example():
    """Run an example of the orchestration service with the feature-task workflow"""
    
    # Initialize the orchestration service
    orchestration = OrchestrationService()
    
    print("🚀 Initializing orchestration service...")
    
    # Load workflow configuration
    workflow_path = parent_dir / "workflows" / "feature_task_workflow.json"
    with open(workflow_path, "r") as f:
        workflow_config = json.load(f)
    
    # Register workflow with the orchestration service
    workflow_id = orchestration.register_workflow(workflow_config)
    print(f"✅ Registered workflow: {workflow_id}")
    
    # Create a new conversation
    conversation_id = orchestration.create_conversation(
        user_id="user123",
        initial_context={
            "project_name": "DevLoop",
            "knowledge_graph_enabled": True,
            "domain": "feature_management"
        }
    )
    print(f"📝 Created conversation: {conversation_id}")
    
    # Define user request for a new feature
    user_request = {
        "message": "I need a new feature for real-time collaboration on feature documents. "
                   "Users should be able to see each other's cursor positions and edits in real time. "
                   "The feature should include presence indicators and conflict resolution.",
        "message_type": "USER",
        "metadata": {
            "source": "chat_interface",
            "priority": "high"
        }
    }
    
    # Add the user message to the conversation
    message_id = orchestration.add_message(conversation_id, user_request)
    print(f"💬 Added user message: {message_id}")
    
    # Create workflow execution context
    workflow_context = {
        "feature_description": user_request["message"],
        "context": {
            "project_name": "DevLoop",
            "knowledge_graph_enabled": True,
            "domain": "feature_management",
            "user_id": "user123"
        }
    }
    
    # Execute the workflow
    print("⚙️ Executing workflow...")
    execution_id = await orchestration.execute_workflow(
        workflow_id=workflow_id,
        conversation_id=conversation_id, 
        context=workflow_context,
        mode=WorkflowExecutionMode.SEQUENTIAL
    )
    
    # Track workflow execution status
    while True:
        status = orchestration.get_workflow_execution_status(execution_id)
        print(f"📊 Workflow execution status: {status.status}")
        
        if status.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            break
        
        # Show progress of individual steps
        for step_id, step_status in status.step_statuses.items():
            print(f"  - Step {step_id}: {step_status.status}")
        
        await asyncio.sleep(2)
    
    # Get workflow execution results
    results = orchestration.get_workflow_execution_results(execution_id)
    
    # Print the results
    print("\n🎯 Workflow execution results:")
    print(f"  - Feature creation: {json.dumps(results.get('created_feature', {}), indent=2)}")
    print(f"  - Task breakdown: {json.dumps(results.get('task_list', []), indent=2)}")
    
    # Get conversation history
    conversation = orchestration.get_conversation(conversation_id)
    print(f"\n💬 Final conversation has {len(conversation.messages)} messages")
    
    # Print agent messages from the conversation
    print("\n🤖 Agent messages:")
    for msg in conversation.messages:
        if msg.message_type != "USER":
            print(f"  - [{msg.agent_id}]: {msg.message[:100]}...")
    
    print("\n✅ Orchestration example completed!")
    return results

if __name__ == "__main__":
    print("Starting orchestration example...")
    results = asyncio.run(run_orchestration_example())
    
    # Save results to file
    output_path = current_dir / "workflow_results.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"Results saved to {output_path}")