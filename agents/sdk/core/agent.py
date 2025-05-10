#!/usr/bin/env python3
"""
SDK Agent Core Module

Provides the foundational OpenAI SDK integration for all agents in the Devloop system.
This is a direct integration with OpenAI's assistants API.
"""

import os
import json
import time
import uuid
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("sdk_agent")

try:
    import openai  # pyright: ignore [reportMissingImports]
except ImportError:
    logger.warning("OpenAI package not available. Using mock implementation.")
    openai = None

class SDKAgent:
    """Base OpenAI SDK Agent Implementation"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the SDK agent
        
        Args:
            config: Agent configuration parameters
        """
        self.config = config
        self.agent_id = config.get("agent_id", str(uuid.uuid4()))
        self.agent_type = config.get("agent_type", "generic")
        self.name = config.get("agent_name", f"{self.agent_type}-{self.agent_id}")
        
        # Initialize OpenAI client
        self.api_key = config.get("api_key") or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("No API key provided. Functionality will be limited.")
            self.client = None
            self.openai_available = False
        else:
            try:
                self.client = openai.OpenAI(api_key=self.api_key)
                self.openai_available = True
                logger.info(f"OpenAI client initialized for agent {self.name}")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {e}")
                self.client = None
                self.openai_available = False
        
        # Create assistant and thread if OpenAI is available
        if self.openai_available:
            self._create_assistant()
            self._create_thread()
        else:
            logger.warning("Using mock assistant due to missing API key or package")
            self.assistant = None
            self.thread = None
        
        # Initialize state tracking
        self.state_history = []
        self.created_at = datetime.now()
    
    def _create_assistant(self) -> None:
        """Create an OpenAI assistant for this agent"""
        try:
            # Prepare tools from config
            tools = self._prepare_tools(self.config.get("tools", []))
            
            # Create the assistant
            self.assistant = self.client.beta.assistants.create(
                name=self.name,
                instructions=self.config.get("instructions", "You are an assistant for the Devloop system."),
                tools=tools,
                model=self.config.get("model", "gpt-4o")
            )
            logger.info(f"Created assistant {self.assistant.id} for agent {self.name}")
        except Exception as e:
            logger.error(f"Error creating assistant: {e}")
            self.assistant = None
    
    def _create_thread(self) -> None:
        """Create an OpenAI thread for this agent"""
        try:
            self.thread = self.client.beta.threads.create()
            logger.info(f"Created thread {self.thread.id} for agent {self.name}")
        except Exception as e:
            logger.error(f"Error creating thread: {e}")
            self.thread = None
    
    def _prepare_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prepare tools for OpenAI format
        
        Args:
            tools: List of tool definitions
            
        Returns:
            List of tools in OpenAI format
        """
        openai_tools = []
        
        for tool in tools:
            if isinstance(tool, dict) and "type" in tool:
                # Tool is already in OpenAI format
                openai_tools.append(tool)
            else:
                # Tool is in our format, convert to OpenAI format
                openai_tools.append({
                    "type": "function",
                    "function": tool
                })
        
        return openai_tools
    
    def execute(self, prompt: str) -> Any:
        """Execute the agent with a prompt
        
        Args:
            prompt: User prompt to execute
            
        Returns:
            Generated response or error information
        """
        if not self.openai_available or not self.assistant or not self.thread:
            logger.warning("Using mock execution due to missing OpenAI setup")
            return self._mock_execution(prompt)
        
        try:
            # Create a message on the thread
            message = self.client.beta.threads.messages.create(
                thread_id=self.thread.id,
                role="user",
                content=prompt
            )
            
            # Run the assistant
            run = self.client.beta.threads.runs.create(
                thread_id=self.thread.id,
                assistant_id=self.assistant.id
            )
            
            # Monitor and process the run
            return self._monitor_run(run)
        except Exception as e:
            logger.error(f"Error executing agent: {e}")
            return {"error": str(e)}
    
    def _monitor_run(self, run: Any) -> Any:
        """Monitor and process an assistant run
        
        Args:
            run: The run object to monitor
            
        Returns:
            Final result from the run
        """
        # Poll for completion
        while run.status in ["queued", "in_progress"]:
            run = self.client.beta.threads.runs.retrieve(
                thread_id=self.thread.id,
                run_id=run.id
            )
            
            # Handle tool calls
            if run.status == "requires_action":
                tool_outputs = self._handle_tool_calls(run.required_action.submit_tool_outputs.tool_calls)
                run = self.client.beta.threads.runs.submit_tool_outputs(
                    thread_id=self.thread.id,
                    run_id=run.id,
                    tool_outputs=tool_outputs
                )
            
            time.sleep(0.5)
        
        # Get the final messages
        messages = self.client.beta.threads.messages.list(
            thread_id=self.thread.id
        )
        
        # Extract the assistant's response
        if messages.data:
            return messages.data[0].content[0].text.value
        else:
            return {"error": "No response generated"}
    
    def _handle_tool_calls(self, tool_calls: List[Any]) -> List[Dict[str, Any]]:
        """Handle tool calls from the assistant
        
        Args:
            tool_calls: List of tool calls to handle
            
        Returns:
            List of tool outputs
        """
        tool_outputs = []
        
        for tool_call in tool_calls:
            try:
                # Extract tool information
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                # Log the tool call
                logger.info(f"Tool call: {function_name} with args: {arguments}")
                
                # Try to find and execute the tool
                tool_method = getattr(self, function_name, None)
                if tool_method and callable(tool_method):
                    # Tool exists as a method on this class
                    result = tool_method(**arguments)
                else:
                    # Tool not found
                    result = {"error": f"Tool {function_name} not implemented"}
                
                # Add to outputs
                tool_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": json.dumps(result)
                })
            except Exception as e:
                logger.error(f"Error handling tool call: {e}")
                tool_outputs.append({
                    "tool_call_id": tool_call.id,
                    "output": json.dumps({"error": str(e)})
                })
        
        return tool_outputs
    
    def _mock_execution(self, prompt: str) -> str:
        """Generate a mock execution response
        
        Args:
            prompt: User prompt
            
        Returns:
            Mock response text
        """
        if "help" in prompt.lower():
            return "I'm an agent in the Devloop system. I can help with various tasks based on my capabilities."
        elif "status" in prompt.lower():
            return f"Agent {self.name} is active and ready to assist."
        elif "capabilities" in prompt.lower():
            return "My capabilities include executing tasks, answering questions, and coordinating with other agents."
        else:
            return f"I've processed your request: '{prompt}'. How else can I assist you today?"
    
    def status(self) -> Dict[str, Any]:
        """Get the current agent status
        
        Returns:
            Agent status information
        """
        return {
            "id": self.agent_id,
            "name": self.name,
            "type": self.agent_type,
            "assistant_id": self.assistant.id if self.assistant else None,
            "thread_id": self.thread.id if self.thread else None,
            "created_at": self.created_at.isoformat(),
            "openai_available": self.openai_available
        }


# Example usage
if __name__ == "__main__":
    # Basic configuration
    config = {
        "agent_name": "test-sdk-agent",
        "agent_type": "test",
        "instructions": "You are a test agent for the Devloop system.",
        "model": "gpt-4o",
        "tools": [
            {
                "name": "echo",
                "description": "Echo back a message",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Message to echo"
                        }
                    },
                    "required": ["message"]
                }
            }
        ]
    }
    
    # Create agent
    agent = SDKAgent(config)
    
    # Add echo tool method
    def echo(self, message: str) -> Dict[str, Any]:
        """Echo a message back
        
        Args:
            message: Message to echo
            
        Returns:
            Echo response
        """
        return {"echo": message}
    
    SDKAgent.echo = echo
    
    # Execute agent
    if agent.openai_available:
        response = agent.execute("Hi there! Can you echo 'Hello Devloop'?")
        print(f"Response: {response}")
    else:
        print("OpenAI not available. Skipping execution test.")
    
    # Print status
    print(f"Agent status: {agent.status()}")