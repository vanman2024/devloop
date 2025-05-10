# Manager Pattern Code Examples

In the manager pattern, a central "manager" agent coordinates multiple specialized agents via tool calls. Here's how you could implement this pattern using the OpenAI Agents SDK:

```python
from agents import Agent, Runner

manager_agent = Agent(
    name="manager_agent",
    instructions=(
        "You are a translation agent. You use the tools given to you to translate."
        "If asked for multiple translations, you call the relevant tools."
    ),
    tools=[
        spanish_agent.as_tool(
            tool_name="translate_to_spanish",
            tool_description="Translate the user's message to Spanish",
        ),
        french_agent.as_tool(
            tool_name="translate_to_french",
            tool_description="Translate the user's message to French",
        ),
        italian_agent.as_tool(
            tool_name="translate_to_italian",
            tool_description="Translate the user's message to Italian",
        ),
    ],
)

async def main():
    msg = input("Translate 'hello' to Spanish, French and Italian for me!")
    
    orchestrator_output = await Runner.run(
        manager_agent, msg)
    
    for message in orchestrator_output.new_messages:
        print(f"- Translation step: {message.content}")
```

In this example:
1. The manager_agent has access to three specialized translation agents (spanish_agent, french_agent, and italian_agent)
2. Each specialized agent is exposed as a tool via the `.as_tool()` method
3. The manager orchestrates the workflow by calling the appropriate translation tools
4. Results are consolidated and presented by the manager