#!/usr/bin/env python3
"""
test_utils.py - Utilities for testing agent components

This module provides utility functions and classes for testing
agent components. These utilities make it easier to create mocks
and test fixtures for agent testing.
"""

import json
import asyncio
from typing import List, Dict, Any, Optional, Callable, Union
from unittest.mock import MagicMock

class MockMessage:
    """Mock message object for testing"""
    def __init__(self, role: str, content: str, tool_calls: List[Dict] = None):
        self.role = role
        self.content = content
        self.tool_calls = tool_calls or []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary format"""
        result = {
            "role": self.role,
            "content": self.content
        }
        if self.tool_calls:
            result["tool_calls"] = self.tool_calls
        return result

class MockTool:
    """Mock tool for testing"""
    def __init__(self, name: str, description: str, parameters: Dict[str, Any] = None):
        self.name = name
        self.description = description
        self.parameters = parameters or {
            "type": "object",
            "properties": {},
            "required": []
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tool to dictionary format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }

class MockToolCall:
    """Mock tool call for testing"""
    def __init__(self, id: str, name: str, arguments: Dict[str, Any]):
        self.id = id
        self.name = name
        self.arguments = arguments
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tool call to dictionary format"""
        return {
            "id": self.id,
            "type": "function",
            "function": {
                "name": self.name,
                "arguments": json.dumps(self.arguments)
            }
        }

class MockResponseBuilder:
    """Builder for constructing mock API responses"""
    def __init__(self):
        self.content = None
        self.tool_calls = []
    
    def with_content(self, content: str) -> 'MockResponseBuilder':
        """Add content to the response"""
        self.content = content
        return self
    
    def with_tool_call(self, id: str, name: str, arguments: Dict[str, Any]) -> 'MockResponseBuilder':
        """Add a tool call to the response"""
        self.tool_calls.append(MockToolCall(id, name, arguments).to_dict())
        return self
    
    def build(self) -> MagicMock:
        """Build the mock response object"""
        message = {
            "content": self.content
        }
        if self.tool_calls:
            message["tool_calls"] = self.tool_calls
        
        mock_response = MagicMock()
        mock_response.model_dump.return_value = {
            "choices": [{
                "message": message
            }]
        }
        return mock_response

class AgentTestCase:
    """Base class for agent test cases"""
    def __init__(self, agent_class, mock_client_class_path: str):
        self.agent_class = agent_class
        self.mock_client_class_path = mock_client_class_path
        self.mock_client = None
    
    def setup_mock_client(self, response_builder: MockResponseBuilder = None):
        """Set up a mock client with an optional response"""
        self.mock_client = MagicMock()
        if response_builder:
            self.mock_client.chat_completions_create.return_value = response_builder.build()
        return self.mock_client
    
    def create_text_response(self, content: str) -> MockResponseBuilder:
        """Create a text response builder"""
        return MockResponseBuilder().with_content(content)
    
    def create_tool_call_response(self, tool_name: str, arguments: Dict[str, Any]) -> MockResponseBuilder:
        """Create a tool call response builder"""
        return MockResponseBuilder().with_tool_call("call_123", tool_name, arguments)
    
    async def run_agent_with_input(self, agent, user_input: str) -> Dict[str, Any]:
        """Run an agent with a user input and return the response"""
        messages = [{"role": "user", "content": user_input}]
        return await agent.run(messages)

def mock_function_tool(func):
    """Decorator to create a mock function tool"""
    func.is_tool = True
    func.tool_name = func.__name__
    func.tool_description = func.__doc__ or f"Function tool: {func.__name__}"
    return func

def create_test_conversation(turns: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Create a test conversation with alternating user and assistant messages"""
    messages = []
    for turn in turns:
        if "user" in turn:
            messages.append({"role": "user", "content": turn["user"]})
        if "assistant" in turn:
            messages.append({"role": "assistant", "content": turn["assistant"]})
        if "tool_call" in turn and "tool_result" in turn:
            messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": f"call_{len(messages)}",
                    "type": "function",
                    "function": {
                        "name": turn["tool_call"]["name"],
                        "arguments": json.dumps(turn["tool_call"]["arguments"])
                    }
                }]
            })
            messages.append({
                "role": "tool",
                "tool_call_id": f"call_{len(messages)-1}",
                "name": turn["tool_call"]["name"],
                "content": turn["tool_result"]
            })
    return messages