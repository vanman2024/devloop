#!/usr/bin/env python3
"""
manager_pattern.py - Reference implementation of the manager pattern

This is a reference implementation based on the patterns described in
"A Practical Guide to Building Agents". It demonstrates how to create
a manager agent that orchestrates specialized agents.

Note: This is a reference implementation using a simplified version of
the OpenAI Agents SDK patterns.
"""

import os
import json
import asyncio
from typing import List, Dict, Any, Optional, Callable, Union, Awaitable

# Mock OpenAI client for demonstration purposes
# (Same as in single_agent.py)
class MockOpenAIClient:
    def __init__(self):
        pass
    
    async def chat_completions_create(self, model, messages, tools=None, tool_choice=None):
        """Mock method that simulates OpenAI API responses"""
        # For demonstration, return different responses based on tool names available
        if tools and any(t["function"]["name"] == "translate_to_spanish" for t in tools):
            return MockResponse({
                "choices": [{
                    "message": {
                        "content": None,
                        "tool_calls": [{
                            "id": "call_123",
                            "type": "function",
                            "function": {
                                "name": "translate_to_spanish",
                                "arguments": json.dumps({"text": "hello"})
                            }
                        }]
                    }
                }]
            })
        
        # Default response
        return MockResponse({
            "choices": [{
                "message": {
                    "content": "I'll help you with that!",
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
                        "text": {
                            "type": "string",
                            "description": "The text to process"
                        }
                    },
                    "required": ["text"]
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
        self.client = MockOpenAIClient()
    
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
    
    def as_tool(self, tool_name: str, tool_description: str) -> Tool:
        """
        Convert this agent to a tool that can be used by other agents.
        
        Args:
            tool_name (str): The name of the tool
            tool_description (str): The description of the tool
            
        Returns:
            Tool: A tool that runs this agent
        """
        async def run_agent(text: str) -> str:
            """Run this agent on the provided text"""
            messages = [{"role": "user", "content": text}]
            response = await self.run(messages)
            
            # Extract the message content
            content = response["choices"][0]["message"].get("content", "")
            return content
        
        # Create a synchronous wrapper for the async function
        def sync_run_agent(text: str) -> str:
            return asyncio.run(run_agent(text))
        
        return Tool(
            name=tool_name,
            description=tool_description,
            function=sync_run_agent
        )

# Runner that handles the conversation loop (same as in single_agent.py)
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

# Example specialized agents
def translate_to_spanish(text: str) -> str:
    """Translate text to Spanish"""
    translations = {
        "hello": "hola",
        "goodbye": "adiós",
        "thank you": "gracias",
    }
    return translations.get(text.lower(), f"[Translated to Spanish]: {text}")

def translate_to_french(text: str) -> str:
    """Translate text to French"""
    translations = {
        "hello": "bonjour",
        "goodbye": "au revoir",
        "thank you": "merci",
    }
    return translations.get(text.lower(), f"[Translated to French]: {text}")

def translate_to_italian(text: str) -> str:
    """Translate text to Italian"""
    translations = {
        "hello": "ciao",
        "goodbye": "arrivederci",
        "thank you": "grazie",
    }
    return translations.get(text.lower(), f"[Translated to Italian]: {text}")

# Example usage of the manager pattern
async def main():
    # Create specialized agents as tools
    spanish_tool = Tool(
        name="translate_to_spanish",
        description="Translate the user's message to Spanish",
        function=translate_to_spanish
    )
    
    french_tool = Tool(
        name="translate_to_french",
        description="Translate the user's message to French",
        function=translate_to_french
    )
    
    italian_tool = Tool(
        name="translate_to_italian",
        description="Translate the user's message to Italian",
        function=translate_to_italian
    )
    
    # Create manager agent
    manager_agent = Agent(
        name="Translation Manager",
        instructions=(
            "You are a translation agent. You use the tools given to you to translate. "
            "If asked for multiple translations, you call the relevant tools."
        ),
        tools=[spanish_tool, french_tool, italian_tool],
        model="gpt-4o"
    )
    
    # Run the manager agent
    await Runner.run(
        agent=manager_agent,
        initial_input="Translate 'hello' to Spanish, French, and Italian for me!"
    )

if __name__ == "__main__":
    asyncio.run(main())