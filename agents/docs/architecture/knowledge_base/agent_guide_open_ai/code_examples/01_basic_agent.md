# Basic Agent Creation

## Simple Weather Agent

```python
weather_agent = Agent(
    name="Weather agent",
    instructions="You are a helpful agent who can talk to users about the weather.",
    tools=[get_weather],
)
```

## Agent with Search Tool

```python
from agents import Agent, WebSearchTool, function_tool

@function_tool
def save_results(output):
    db.insert({"output": output, "timestamp": datetime.time()})
    return "File saved"

search_agent = Agent(
    name="Search agent",
    instructions="Help the user search the internet and save results if asked.",
    tools=[WebSearchTool(), save_results],
)
```

## Running an Agent

```python
Agents.run(agent, [UserMessage("What's the capital of the USA?")])
```

This concept of a while loop is central to the functioning of an agent. The agent runs until an exit condition is met, such as:

1. A final-output tool is invoked, defined by a specific output type
2. The model returns a response without any tool calls (e.g., a direct user message)