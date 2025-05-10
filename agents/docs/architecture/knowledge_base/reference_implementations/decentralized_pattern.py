#!/usr/bin/env python3
"""
decentralized_pattern.py - Reference implementation of the decentralized pattern

This is a reference implementation based on the patterns described in
"A Practical Guide to Building Agents". It demonstrates how to create
a system where agents hand off control to other agents.

Note: This is a reference implementation using a simplified version of
the OpenAI Agents SDK patterns.
"""

import os
import json
import asyncio
from typing import List, Dict, Any, Optional, Callable, Union, Awaitable

# Mock OpenAI client for demonstration purposes
# (Similar to the previous files)
class MockOpenAIClient:
    def __init__(self):
        pass
    
    async def chat_completions_create(self, model, messages, tools=None, tool_choice=None):
        """Mock method that simulates OpenAI API responses"""
        # For demonstration, we'll simulate responses for the decentralized pattern
        last_message = messages[-1]["content"] if messages[-1].get("content") else ""
        
        # Simulate triage agent behavior
        if tools and any(t["function"]["name"].startswith("handoff_to_") for t in tools):
            if "order" in last_message.lower() or "delivery" in last_message.lower():
                return MockResponse({
                    "choices": [{
                        "message": {
                            "content": "Let me transfer you to our order management team.",
                            "tool_calls": [{
                                "id": "call_123",
                                "type": "function",
                                "function": {
                                    "name": "handoff_to_order_management",
                                    "arguments": json.dumps({})
                                }
                            }]
                        }
                    }]
                })
            elif "technical" in last_message.lower() or "issue" in last_message.lower():
                return MockResponse({
                    "choices": [{
                        "message": {
                            "content": "Let me transfer you to our technical support team.",
                            "tool_calls": [{
                                "id": "call_124",
                                "type": "function",
                                "function": {
                                    "name": "handoff_to_technical_support",
                                    "arguments": json.dumps({})
                                }
                            }]
                        }
                    }]
                })
            elif "purchase" in last_message.lower() or "buy" in last_message.lower():
                return MockResponse({
                    "choices": [{
                        "message": {
                            "content": "Let me transfer you to our sales team.",
                            "tool_calls": [{
                                "id": "call_125",
                                "type": "function",
                                "function": {
                                    "name": "handoff_to_sales",
                                    "arguments": json.dumps({})
                                }
                            }]
                        }
                    }]
                })
        
        # Specialized agent responses 
        if "order_management" in messages[0].get("content", ""):
            return MockResponse({
                "choices": [{
                    "message": {
                        "content": "I'm the order management agent. I can help you track your order and process returns or refunds.",
                    }
                }]
            })
        elif "technical_support" in messages[0].get("content", ""):
            return MockResponse({
                "choices": [{
                    "message": {
                        "content": "I'm the technical support agent. I can help you resolve technical issues with your products.",
                    }
                }]
            })
        elif "sales" in messages[0].get("content", ""):
            return MockResponse({
                "choices": [{
                    "message": {
                        "content": "I'm the sales agent. I can help you browse our product catalog and make a purchase.",
                    }
                }]
            })
        
        # Default response
        return MockResponse({
            "choices": [{
                "message": {
                    "content": "I'm the triage agent. How can I help you today?",
                }
            }]
        })

class MockResponse:
    def __init__(self, data):
        self.data = data
    
    def model_dump(self):
        return self.data

# Tool and Agent definitions (similar to the previous files)
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
                    "properties": {},
                    "required": []
                }
            }
        }

class Agent:
    def __init__(
        self,
        name: str,
        instructions: str,
        tools: List[Tool] = None,
        handoffs: List['Agent'] = None,
        model: str = "gpt-4o"
    ):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []
        self.handoffs = handoffs or []
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
        
        # Add handoff tools
        for agent in self.handoffs:
            handoff_tool = {
                "type": "function",
                "function": {
                    "name": f"handoff_to_{agent.name.lower().replace(' ', '_')}",
                    "description": f"Hand off the conversation to the {agent.name}",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
            openai_tools.append(handoff_tool)
        
        # Call the model
        response = await self.client.chat_completions_create(
            model=self.model,
            messages=messages,
            tools=openai_tools if openai_tools else None,
            tool_choice="auto"
        )
        
        return response.model_dump()

# Runner class specific to the decentralized pattern
class DecentralizedRunner:
    @staticmethod
    async def run(initial_agent: Agent, initial_input: str, max_turns: int = 10):
        """
        Run the initial agent in a conversation loop, handling handoffs to other agents.
        
        Args:
            initial_agent (Agent): The initial agent to run
            initial_input (str): The initial user input
            max_turns (int, optional): Maximum number of turns. Defaults to 10.
            
        Returns:
            List[Dict[str, str]]: The conversation history
        """
        messages = [{"role": "user", "content": initial_input}]
        turn_count = 0
        current_agent = initial_agent
        
        print(f"\nStarting conversation with {current_agent.name}")
        
        while turn_count < max_turns:
            print(f"\nTurn {turn_count + 1}/{max_turns}")
            print(f"User: {messages[-1]['content']}")
            
            # Get agent response
            response = await current_agent.run(messages)
            
            # Extract the message from the response
            assistant_message = response["choices"][0]["message"]
            content = assistant_message.get("content", "")
            tool_calls = assistant_message.get("tool_calls", [])
            
            if content:
                print(f"{current_agent.name}: {content}")
                messages.append({"role": "assistant", "content": content})
            
            # Handle handoffs
            handoff_agent = None
            
            if tool_calls:
                for tool_call in tool_calls:
                    function_name = tool_call["function"]["name"]
                    
                    # Check if this is a handoff
                    if function_name.startswith("handoff_to_"):
                        agent_name = function_name[len("handoff_to_"):].replace("_", " ")
                        
                        # Find the agent to hand off to
                        for agent in current_agent.handoffs:
                            if agent.name.lower() == agent_name:
                                handoff_agent = agent
                                print(f"\n⟶ Handing off to {agent.name}")
                                break
                    else:
                        # Handle regular tool calls (similar to previous examples)
                        arguments = json.loads(tool_call["function"]["arguments"])
                        print(f"Tool Call: {function_name}({arguments})")
                        
                        # Find the tool
                        tool = next((t for t in current_agent.tools if t.name == function_name), None)
                        
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
            
            # If handoff occurred, change the current agent
            if handoff_agent:
                current_agent = handoff_agent
                # We don't need to modify the messages array as we want to keep the conversation history
            
            turn_count += 1
            
            # Ask for user input to continue the conversation
            if turn_count < max_turns:
                user_input = input("\nYour response (or 'exit' to end): ")
                if user_input.lower() == 'exit':
                    break
                
                messages.append({"role": "user", "content": user_input})
        
        return messages

# Example specialized agent functionalities
def search_knowledge_base(query: str) -> str:
    """Search the knowledge base for technical information"""
    return f"Found information on: {query}"

def track_order_status(order_id: str) -> str:
    """Track the status of an order"""
    return f"Order {order_id} is in transit and will be delivered by Tuesday."

def initiate_purchase_order(product_id: str, quantity: int) -> str:
    """Initiate a purchase order"""
    return f"Purchase order created for {quantity} units of product {product_id}."

# Example usage of the decentralized pattern
async def main():
    # Create specialized agents
    technical_support_agent = Agent(
        name="Technical Support",
        instructions=(
            "You are a technical support agent. You provide expert assistance with resolving technical issues, "
            "system outages, or product troubleshooting."
        ),
        tools=[Tool(
            name="search_knowledge_base",
            description="Search the knowledge base for technical information",
            function=search_knowledge_base
        )],
    )
    
    order_management_agent = Agent(
        name="Order Management",
        instructions=(
            "You are an order management agent. You assist clients with inquiries regarding order tracking, "
            "delivery schedules, and processing returns or refunds."
        ),
        tools=[Tool(
            name="track_order_status",
            description="Track the status of an order",
            function=track_order_status
        )],
    )
    
    sales_agent = Agent(
        name="Sales",
        instructions=(
            "You are a sales agent. You help enterprise clients browse the product catalog, recommend "
            "suitable solutions, and facilitate purchase transactions."
        ),
        tools=[Tool(
            name="initiate_purchase_order",
            description="Initiate a purchase order",
            function=initiate_purchase_order
        )],
    )
    
    # Create triage agent with handoffs to specialized agents
    triage_agent = Agent(
        name="Triage",
        instructions=(
            "You are a triage agent. You act as the first point of contact, assessing customer "
            "queries and directing them promptly to the correct specialized agent."
        ),
        handoffs=[technical_support_agent, order_management_agent, sales_agent],
    )
    
    # Run the decentralized system starting with the triage agent
    await DecentralizedRunner.run(
        initial_agent=triage_agent,
        initial_input="I'd like to check the status of my recent order."
    )

if __name__ == "__main__":
    asyncio.run(main())