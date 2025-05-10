# OpenAI Agents SDK Integration Guide

This guide outlines how to integrate the OpenAI Agents SDK into your project, bridging the reference implementations in our knowledge base with the official SDK.

## Prerequisites

- Python 3.8 or higher
- OpenAI API key
- Authentication setup for the Agents SDK

## Installation

```bash
pip install openai
```

The OpenAI Agents SDK is part of the main OpenAI Python package. Once the official SDK is installed properly, you can start using it with your project.

## Key Components Mapping

This table maps our reference implementation components to their equivalents in the OpenAI Agents SDK:

| Reference Implementation | OpenAI Agents SDK |
|--------------------------|-------------------|
| `Agent` class | `Agent` from `openai.agents` |
| `Tool` class | `function_tool` decorator and built-in tools |
| `Runner` class | `Runner.run()` from `openai.agents` |
| Mock API client | Live API client from `openai` package |

## Basic Agent Creation

```python
# Reference Implementation:
agent = Agent(
    name="Weather Agent",
    instructions="You are a helpful weather assistant.",
    tools=[weather_tool],
    model="gpt-4o"
)

# OpenAI Agents SDK:
from openai.agents import Agent, function_tool

@function_tool
def get_weather(location: str) -> str:
    """Get the weather for a location."""
    # Weather API call here
    return f"The weather in {location} is sunny."

agent = Agent(
    name="Weather Agent",
    instructions="You are a helpful weather assistant.",
    tools=[get_weather],
    model="gpt-4o"
)
```

## Running an Agent

```python
# Reference Implementation:
result = await Runner.run(
    agent=agent,
    initial_input="What's the weather in New York?"
)

# OpenAI Agents SDK:
from openai.agents import Runner

result = await Runner.run(
    agent,
    [UserMessage("What's the weather in New York?")]
)
```

## Manager Pattern Implementation

```python
# Reference Implementation:
manager_agent = Agent(
    name="manager_agent",
    instructions="You are a translation agent.",
    tools=[
        spanish_agent.as_tool(
            tool_name="translate_to_spanish",
            tool_description="Translate to Spanish"
        ),
        french_agent.as_tool(
            tool_name="translate_to_french",
            tool_description="Translate to French"
        )
    ]
)

# OpenAI Agents SDK:
from openai.agents import Agent, Runner

spanish_agent = Agent(
    name="Spanish Agent",
    instructions="You translate text to Spanish.",
    tools=[]
)

french_agent = Agent(
    name="French Agent",
    instructions="You translate text to French.",
    tools=[]
)

manager_agent = Agent(
    name="Translation Manager",
    instructions="You are a translation agent.",
    tools=[
        spanish_agent.as_tool(
            tool_name="translate_to_spanish",
            tool_description="Translate the user's message to Spanish",
        ),
        french_agent.as_tool(
            tool_name="translate_to_french",
            tool_description="Translate the user's message to French",
        )
    ]
)
```

## Decentralized Pattern Implementation

```python
# Reference Implementation:
triage_agent = Agent(
    name="Triage",
    instructions="You are a triage agent.",
    handoffs=[technical_support_agent, order_management_agent, sales_agent],
)

# OpenAI Agents SDK:
from openai.agents import Agent

triage_agent = Agent(
    name="Triage Agent",
    instructions="You act as the first point of contact, assessing customer queries.",
    handoffs=[technical_support_agent, order_management_agent, sales_agent],
)
```

## Error Handling

When working with the real SDK, implement proper error handling:

```python
try:
    result = await Runner.run(agent, [UserMessage("What's the weather?")])
except openai.APIError as e:
    print(f"API Error: {e}")
except openai.RateLimitError as e:
    print(f"Rate limit exceeded: {e}")
    # Implement backoff strategy
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Best Practices

1. **API Keys**: Never hardcode API keys. Use environment variables or a secure key management service.
2. **Error Handling**: Implement proper error handling for API errors, rate limits, and unexpected issues.
3. **Logging**: Add logging to track agent behavior and troubleshoot issues.
4. **Testing**: Test your agent integration thoroughly using the provided testing framework.
5. **Rate Limiting**: Implement rate limiting and backoff strategies to avoid API rate limits.
6. **Monitoring**: Set up monitoring for your agents in production.

## Migrating from Reference Implementation

When migrating from our reference implementation to the official SDK:

1. Replace mock client with the real OpenAI client
2. Update tool definitions to use the SDK's function_tool decorator
3. Update agent creation to use the SDK's Agent class
4. Update runner calls to use the SDK's Runner.run method
5. Update testing to use the real SDK components (or properly mock them)

## Resources

- [OpenAI Python Library Documentation](https://platform.openai.com/docs/libraries)
- [OpenAI Agents Guide](https://platform.openai.com/docs/agents/overview)
- Our local knowledge base for pattern references