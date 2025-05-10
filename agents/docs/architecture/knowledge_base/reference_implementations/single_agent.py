#!/usr/bin/env python3
"""
single_agent.py - Reference implementation of a single-agent system

This is a reference implementation based on the patterns described in
"A Practical Guide to Building Agents". It demonstrates how to create
a single agent with tools and run it in a loop until an exit condition
is met.

Note: This is a reference implementation using a simplified version of
the OpenAI Agents SDK patterns.
"""

import os
import json
import asyncio
from typing import List, Dict, Any, Optional, Callable, Union, Awaitable

# Mock OpenAI client for demonstration purposes
class MockOpenAIClient:
    def __init__(self):
        pass
    
    async def chat_completions_create(self, model, messages, tools=None, tool_choice=None):
        """Mock method that simulates OpenAI API responses"""
        # This would actually call the OpenAI API in a real implementation
        
        # For demonstration, return a mock response
        return MockResponse({
            "choices": [{
                "message": {
                    "content": "I'll help you with that!",
                    "tool_calls": [{
                        "id": "call_123",
                        "type": "function",
                        "function": {
                            "name": "get_weather",
                            "arguments": json.dumps({"location": "New York"})
                        }
                    }]
                }
            }]
        })

class MockResponse:
    def __init__(self, data):
        self.data = data
    
    def model_dump(self):
        return self.data

# Tool definition
class Tool:
    def __init__(self, name: str, description: str, function: Callable):
        self.name = name
        self.description = description
        self.function = function
    
    def to_openai_tool(self):
        """Convert to OpenAI API tool format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g. San Francisco, CA"
                        }
                    },
                    "required": ["location"]
                }
            }
        }

# Agent definition
class Agent:
    def __init__(
        self,
        name: str,
        instructions: str,
        tools: List[Tool] = None,
        model: str = "gpt-4o"
    ):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.model = model
        self.client = MockOpenAIClient()  # Would be the actual OpenAI client
    
    async def run(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Run the agent on the provided messages.
        
        Args:
            messages (List[Dict[str, str]]): The conversation history
            
        Returns:
            Dict[str, Any]: The agent's response
        """
        # Prepare the system message with instructions
        if not any(msg.get("role") == "system" for msg in messages):
            messages = [{"role": "system", "content": self.instructions}] + messages
        
        # Convert tools to OpenAI format
        openai_tools = [tool.to_openai_tool() for tool in self.tools]
        
        # Call the model
        response = await self.client.chat_completions_create(
            model=self.model,
            messages=messages,
            tools=openai_tools if openai_tools else None,
            tool_choice="auto"
        )
        
        return response.model_dump()

# Runner that handles the conversation loop
class Runner:
    @staticmethod
    async def run(agent: Agent, initial_input: str, max_turns: int = 10):
        """
        Run the agent in a conversation loop.
        
        Args:
            agent (Agent): The agent to run
            initial_input (str): The initial user input
            max_turns (int, optional): Maximum number of turns. Defaults to 10.
            
        Returns:
            List[Dict[str, str]]: The conversation history
        """
        messages = [{"role": "user", "content": initial_input}]
        turn_count = 0
        
        while turn_count < max_turns:
            print(f"\nTurn {turn_count + 1}/{max_turns}")
            print(f"User: {messages[-1]['content']}")
            
            # Get agent response
            response = await agent.run(messages)
            
            # Extract the message from the response
            assistant_message = response["choices"][0]["message"]
            content = assistant_message.get("content", "")
            tool_calls = assistant_message.get("tool_calls", [])
            
            if content:
                print(f"Agent: {content}")
                messages.append({"role": "assistant", "content": content})
                
                # Exit if no tool calls (direct response to user)
                if not tool_calls:
                    break
            
            # Handle tool calls
            if tool_calls:
                for tool_call in tool_calls:
                    function_name = tool_call["function"]["name"]
                    arguments = json.loads(tool_call["function"]["arguments"])
                    
                    print(f"Tool Call: {function_name}({arguments})")
                    
                    # Find the tool
                    tool = next((t for t in agent.tools if t.name == function_name), None)
                    
                    if tool:
                        # Execute the tool
                        try:
                            result = tool.function(**arguments)
                            print(f"Tool Result: {result}")
                            
                            # Add tool result to messages
                            messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{
                                    "id": tool_call["id"],
                                    "type": "function",
                                    "function": {
                                        "name": function_name,
                                        "arguments": tool_call["function"]["arguments"]
                                    }
                                }]
                            })
                            
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "name": function_name,
                                "content": str(result)
                            })
                        except Exception as e:
                            print(f"Error executing tool: {e}")
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "name": function_name,
                                "content": f"Error: {str(e)}"
                            })
            
            turn_count += 1
            
            # Ask for user input to continue the conversation
            if turn_count < max_turns:
                user_input = input("\nYour response (or 'exit' to end): ")
                if user_input.lower() == 'exit':
                    break
                
                messages.append({"role": "user", "content": user_input})
        
        return messages

# Example tools
def get_weather(location: str) -> str:
    """Get the weather for a location"""
    # This would actually call a weather API
    return f"The weather in {location} is sunny with a high of 75°F."

def search_web(query: str) -> str:
    """Search the web for information"""
    # This would actually call a search API
    return f"Found results for: {query}"

# Example usage
async def main():
    # Create tools
    weather_tool = Tool(
        name="get_weather",
        description="Get the current weather in a given location",
        function=get_weather
    )
    
    search_tool = Tool(
        name="search_web",
        description="Search the web for information",
        function=search_web
    )
    
    # Create agent
    assistant = Agent(
        name="Weather Assistant",
        instructions="You are a helpful assistant that can provide weather information and search the web.",
        tools=[weather_tool, search_tool],
        model="gpt-4o"
    )
    
    # Run the agent
    await Runner.run(
        agent=assistant,
        initial_input="What's the weather like in New York?"
    )

if __name__ == "__main__":
    asyncio.run(main())