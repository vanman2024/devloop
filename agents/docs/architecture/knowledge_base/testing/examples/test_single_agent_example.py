#!/usr/bin/env python3
"""
test_single_agent_example.py - Example tests for single agent pattern

This file contains example test cases for the single agent pattern,
demonstrating how to test an agent that uses tools.
"""

import unittest
import asyncio
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from test_utils import MockResponseBuilder, mock_function_tool, create_test_conversation

# Import from reference implementations
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'reference_implementations'))
from single_agent import Agent, Tool, Runner

class TestWeatherAgent(unittest.TestCase):
    """Test a weather agent implementation"""
    
    @patch('single_agent.MockOpenAIClient')
    def test_weather_agent_with_valid_location(self, mock_client_class):
        """Test that the weather agent can handle a valid location request"""
        # Set up mock response
        mock_client = MagicMock()
        mock_response = MockResponseBuilder().with_tool_call(
            id="call_123",
            name="get_weather",
            arguments={"location": "New York"}
        ).build()
        mock_client.chat_completions_create.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        # Create a weather function tool
        def get_weather(location: str) -> str:
            return f"The weather in {location} is sunny with a high of 75°F."
        
        weather_tool = Tool(
            name="get_weather",
            description="Get the current weather in a given location",
            function=get_weather
        )
        
        # Create the weather agent
        agent = Agent(
            name="Weather Agent",
            instructions="You are a helpful weather assistant. When asked about the weather, use the get_weather tool.",
            tools=[weather_tool],
            model="gpt-4o"
        )
        
        # Test the agent
        async def run_test():
            messages = [{"role": "user", "content": "What's the weather like in New York?"}]
            response = await agent.run(messages)
            return response
        
        response = asyncio.run(run_test())
        
        # Check that the API was called with the right parameters
        mock_client.chat_completions_create.assert_called_once()
        call_args = mock_client.chat_completions_create.call_args[1]
        self.assertEqual(call_args["model"], "gpt-4o")
        
        # Check that tools were passed correctly
        tools = call_args.get("tools", [])
        self.assertEqual(len(tools), 1)
        self.assertEqual(tools[0]["function"]["name"], "get_weather")
        
        # Check that the tool call was included in the response
        self.assertTrue("tool_calls" in response["choices"][0]["message"])
        tool_calls = response["choices"][0]["message"]["tool_calls"]
        self.assertEqual(len(tool_calls), 1)
        self.assertEqual(tool_calls[0]["function"]["name"], "get_weather")
        arguments = tool_calls[0]["function"]["arguments"]
        self.assertTrue("New York" in arguments)
    
    @patch('single_agent.MockOpenAIClient')
    def test_weather_agent_end_to_end(self, mock_client_class):
        """Test the weather agent with a simulated conversation"""
        # Set up mock client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        # First response: ask for the weather, call the get_weather tool
        mock_response1 = MockResponseBuilder().with_tool_call(
            id="call_123",
            name="get_weather",
            arguments={"location": "Seattle"}
        ).build()
        
        # Second response: provide the weather forecast to the user
        mock_response2 = MockResponseBuilder().with_content(
            "Based on the latest data, the weather in Seattle is sunny with a high of 75°F."
        ).build()
        
        # Configure the mock client to return these responses in sequence
        mock_client.chat_completions_create.side_effect = [mock_response1, mock_response2]
        
        # Create a weather function tool
        def get_weather(location: str) -> str:
            return f"The weather in {location} is sunny with a high of 75°F."
        
        weather_tool = Tool(
            name="get_weather",
            description="Get the current weather in a given location",
            function=get_weather
        )
        
        # Create the weather agent
        agent = Agent(
            name="Weather Agent",
            instructions="You are a helpful weather assistant. When asked about the weather, use the get_weather tool.",
            tools=[weather_tool],
            model="gpt-4o"
        )
        
        # Test the complete flow with the Runner
        async def run_test():
            result = await Runner.run(
                agent=agent,
                initial_input="What's the weather like in Seattle?"
            )
            return result
        
        # Mock the input function to avoid hanging in the test
        with patch('builtins.input', return_value="exit"):
            result = asyncio.run(run_test())
        
        # Since Runner depends on the mock implementation that we've patched,
        # we primarily check that the mock API was called the expected number of times
        self.assertEqual(mock_client.chat_completions_create.call_count, 2)
        
        # And that the conversation flow made sense
        call_args1 = mock_client.chat_completions_create.call_args_list[0][1]
        self.assertTrue("What's the weather like in Seattle?" in str(call_args1["messages"]))
        
        call_args2 = mock_client.chat_completions_create.call_args_list[1][1]
        self.assertTrue("get_weather" in str(call_args2["messages"]))
        self.assertTrue("sunny with a high of 75°F" in str(call_args2["messages"]))

if __name__ == "__main__":
    unittest.main()