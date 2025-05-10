# Agent Testing Framework

This directory contains a testing framework for agent components based on the patterns described in "A Practical Guide to Building Agents."

## Overview

Testing is a critical component of building reliable agents. This framework provides utilities and patterns for testing:

1. **Individual agent components**: Tools, Agent creation, etc.
2. **Single-agent patterns**: Testing agents with tools in a loop
3. **Manager pattern**: Testing a manager agent that coordinates specialized agents
4. **Decentralized pattern**: Testing agents that hand off control to one another

## Components

- **[test_agent_framework.py](test_agent_framework.py)**: Main testing framework with test cases for various agent patterns
- **[test_utils.py](test_utils.py)**: Utility functions and classes for creating mock components and test fixtures
- **[examples/](examples/)**: Example test cases demonstrating how to test specific agent implementations

## Testing Patterns

### 1. Unit Testing Components

Test individual components like tools and agent creation:

```python
def test_tool_creation(self):
    """Test that tools can be created correctly"""
    tool = Tool(
        name="dummy_tool",
        description="A dummy tool for testing",
        function=dummy_function
    )
    
    # Validate tool properties
    self.assertEqual(tool.name, "dummy_tool")
    self.assertEqual(tool.description, "A dummy tool for testing")
```

### 2. Mocking API Responses

Mock LLM API responses to test agent behavior:

```python
@patch('single_agent.MockOpenAIClient')
def test_agent_run(self, mock_client_class):
    # Create mock response
    mock_client = MagicMock()
    mock_client.chat_completions_create.return_value = MockResponseBuilder()
        .with_content("Test response")
        .build()
    mock_client_class.return_value = mock_client
    
    # Test agent behavior with mock
    response = await agent.run(messages)
    self.assertEqual(response["choices"][0]["message"]["content"], "Test response")
```

### 3. Testing Conversation Flows

Test multi-turn conversations with tool calls:

```python
@patch('single_agent.MockOpenAIClient')
def test_conversation_flow(self, mock_client_class):
    # Set up sequence of mock responses
    mock_client.chat_completions_create.side_effect = [
        MockResponseBuilder().with_tool_call("get_weather", {"location": "Seattle"}).build(),
        MockResponseBuilder().with_content("The weather is sunny").build()
    ]
    
    # Run the agent through the conversation
    result = await Runner.run(agent, "What's the weather?")
    
    # Verify correct number of API calls and message flow
    self.assertEqual(mock_client.chat_completions_create.call_count, 2)
```

## When to Use This Framework

Use this testing framework to:

1. Validate that agent components work correctly in isolation
2. Test that agents use the right tools for specific inputs
3. Verify proper handling of conversation flows and edge cases
4. Ensure that agent handoffs occur as expected in multi-agent systems

## Integration with Real Systems

While this framework uses mocks for testing, you should also develop integration tests with real API calls to ensure your agents work correctly in production environments. Consider using techniques like:

1. Test accounts with limited permissions
2. Staging/sandbox environments
3. Recorded API responses for consistent test cases
4. Tests with reduced token usage to minimize costs

## Running the Tests

```bash
# Run all tests
python -m unittest discover -s knowledge_base/testing

# Run a specific test file
python -m unittest knowledge_base/testing/examples/test_single_agent_example.py
```