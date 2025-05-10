#!/usr/bin/env python3
"""
test_agent_framework.py - Framework for testing agent components

This module provides a framework for testing agent components
based on the patterns in "A Practical Guide to Building Agents."
"""

import json
import asyncio
import unittest
from typing import List, Dict, Any, Optional, Callable
from unittest.mock import patch, MagicMock

# Import from reference implementations (these would be your actual implementations)
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'reference_implementations'))

# Test cases for agent components
class TestAgentComponents(unittest.TestCase):
    """Test cases for individual agent components"""
    
    def test_tool_creation(self):
        """Test that tools can be created correctly"""
        from single_agent import Tool
        
        # Create a tool
        def dummy_function(arg1, arg2):
            return f"{arg1}, {arg2}"
        
        tool = Tool(
            name="dummy_tool",
            description="A dummy tool for testing",
            function=dummy_function
        )
        
        # Check the tool properties
        self.assertEqual(tool.name, "dummy_tool")
        self.assertEqual(tool.description, "A dummy tool for testing")
        self.assertEqual(tool.function, dummy_function)
        
        # Check that the tool can be converted to the OpenAI format
        openai_tool = tool.to_openai_tool()
        self.assertEqual(openai_tool["type"], "function")
        self.assertEqual(openai_tool["function"]["name"], "dummy_tool")
        self.assertEqual(openai_tool["function"]["description"], "A dummy tool for testing")
    
    def test_agent_creation(self):
        """Test that agents can be created correctly"""
        from single_agent import Agent, Tool
        
        # Create a tool
        def dummy_function(arg1, arg2):
            return f"{arg1}, {arg2}"
        
        tool = Tool(
            name="dummy_tool",
            description="A dummy tool for testing",
            function=dummy_function
        )
        
        # Create an agent
        agent = Agent(
            name="Test Agent",
            instructions="You are a test agent.",
            tools=[tool],
            model="gpt-4o"
        )
        
        # Check the agent properties
        self.assertEqual(agent.name, "Test Agent")
        self.assertEqual(agent.instructions, "You are a test agent.")
        self.assertEqual(len(agent.tools), 1)
        self.assertEqual(agent.tools[0].name, "dummy_tool")
        self.assertEqual(agent.model, "gpt-4o")

# Test cases for the single agent pattern
class TestSingleAgentPattern(unittest.TestCase):
    """Test cases for the single agent pattern"""
    
    @patch('single_agent.MockOpenAIClient')
    def test_agent_run(self, mock_client_class):
        """Test that an agent can run with messages"""
        from single_agent import Agent, Tool
        
        # Mock the API response
        mock_client = MagicMock()
        mock_client.chat_completions_create.return_value = MagicMock(
            model_dump=lambda: {
                "choices": [{
                    "message": {
                        "content": "Test response",
                    }
                }]
            }
        )
        mock_client_class.return_value = mock_client
        
        # Create an agent
        agent = Agent(
            name="Test Agent",
            instructions="You are a test agent.",
            tools=[],
            model="gpt-4o"
        )
        
        # Run the agent
        async def run_test():
            messages = [{"role": "user", "content": "Hello"}]
            response = await agent.run(messages)
            return response
        
        response = asyncio.run(run_test())
        
        # Check the response
        self.assertEqual(response["choices"][0]["message"]["content"], "Test response")
        
        # Check that the API was called correctly
        mock_client.chat_completions_create.assert_called_once()
        call_args = mock_client.chat_completions_create.call_args[1]
        self.assertEqual(call_args["model"], "gpt-4o")
        self.assertEqual(call_args["messages"][0]["role"], "system")
        self.assertEqual(call_args["messages"][0]["content"], "You are a test agent.")
        self.assertEqual(call_args["messages"][1]["role"], "user")
        self.assertEqual(call_args["messages"][1]["content"], "Hello")

# Test cases for the manager pattern
class TestManagerPattern(unittest.TestCase):
    """Test cases for the manager pattern"""
    
    @patch('manager_pattern.MockOpenAIClient')
    def test_agent_as_tool(self, mock_client_class):
        """Test that an agent can be used as a tool"""
        from manager_pattern import Agent
        
        # Mock the API response
        mock_client = MagicMock()
        mock_client.chat_completions_create.return_value = MagicMock(
            model_dump=lambda: {
                "choices": [{
                    "message": {
                        "content": "Test response from specialized agent",
                    }
                }]
            }
        )
        mock_client_class.return_value = mock_client
        
        # Create a specialized agent
        specialized_agent = Agent(
            name="Specialized Agent",
            instructions="You are a specialized agent.",
            tools=[],
            model="gpt-4o"
        )
        
        # Convert the specialized agent to a tool
        tool = specialized_agent.as_tool(
            tool_name="use_specialized_agent",
            tool_description="Use the specialized agent for a task"
        )
        
        # Check the tool
        self.assertEqual(tool.name, "use_specialized_agent")
        self.assertEqual(tool.description, "Use the specialized agent for a task")
        
        # Test that the tool runs correctly (this is synchronous due to the wrapper)
        result = tool.function(text="Hello specialized agent")
        self.assertEqual(result, "Test response from specialized agent")

# Test cases for the decentralized pattern
class TestDecentralizedPattern(unittest.TestCase):
    """Test cases for the decentralized pattern"""
    
    @patch('decentralized_pattern.MockOpenAIClient')
    def test_handoff_setup(self, mock_client_class):
        """Test that handoffs between agents can be set up correctly"""
        from decentralized_pattern import Agent
        
        # Mock the API response
        mock_client = MagicMock()
        mock_client.chat_completions_create.return_value = MagicMock(
            model_dump=lambda: {
                "choices": [{
                    "message": {
                        "content": "Test response",
                    }
                }]
            }
        )
        mock_client_class.return_value = mock_client
        
        # Create specialized agents
        agent1 = Agent(
            name="Agent 1",
            instructions="You are agent 1.",
            tools=[],
            model="gpt-4o"
        )
        
        agent2 = Agent(
            name="Agent 2",
            instructions="You are agent 2.",
            tools=[],
            model="gpt-4o"
        )
        
        # Create a triage agent with handoffs
        triage_agent = Agent(
            name="Triage Agent",
            instructions="You are a triage agent.",
            handoffs=[agent1, agent2],
            model="gpt-4o"
        )
        
        # Check the triage agent
        self.assertEqual(triage_agent.name, "Triage Agent")
        self.assertEqual(len(triage_agent.handoffs), 2)
        self.assertEqual(triage_agent.handoffs[0].name, "Agent 1")
        self.assertEqual(triage_agent.handoffs[1].name, "Agent 2")
        
        # Test the agent run
        async def run_test():
            messages = [{"role": "user", "content": "Hello"}]
            response = await triage_agent.run(messages)
            return response
        
        response = asyncio.run(run_test())
        
        # Check the response
        self.assertEqual(response["choices"][0]["message"]["content"], "Test response")
        
        # Check that the API was called with handoff tools
        mock_client.chat_completions_create.assert_called_once()
        call_args = mock_client.chat_completions_create.call_args[1]
        tools = call_args.get("tools", [])
        
        # Check that handoff tools were included
        handoff_tools = [t for t in tools if t["function"]["name"].startswith("handoff_to_")]
        self.assertEqual(len(handoff_tools), 2)
        self.assertTrue(any(t["function"]["name"] == "handoff_to_agent_1" for t in handoff_tools))
        self.assertTrue(any(t["function"]["name"] == "handoff_to_agent_2" for t in handoff_tools))

if __name__ == "__main__":
    unittest.main()