# Orchestration Patterns

With the foundational components in place, you can consider orchestration patterns to enable your agent to execute workflows effectively.

While it's tempting to immediately build a fully autonomous agent with complex architecture, an incremental approach is usually more successful.

Orchestration patterns fall into two categories:

## 1. Single-Agent Systems

A single agent can handle many tasks by incrementally adding tools, keeping complexity manageable and simplifying evaluation and maintenance. Each new tool expands its capabilities without prematurely forcing you to orchestrate multiple agents.

Every orchestration approach needs the concept of a 'run', typically implemented as a loop that lets agents operate until an exit condition is reached. Common exit conditions include tool calls, a certain structured output, errors, or reaching a maximum number of turns.

An effective strategy for managing complexity without switching to a multi-agent framework is to use prompt templates. Rather than maintaining numerous individual prompts for distinct use cases, use a single flexible base prompt that accepts policy variables.

### When to Consider Creating Multiple Agents

Our general recommendation is to maximize a single agent's capabilities first. More agents can provide intuitive separation of concepts, but can introduce additional complexity and overhead, so often a single agent with tools is sufficient.

**Guidelines for splitting agents:**

- **Complex logic**: When prompts contain many conditional statements (multiple if-then-else branches), and prompt templates get difficult to scale, consider dividing each logical segment across separate agents.

- **Tool overload**: The issue isn't solely the number of tools, but their similarity or overlap. Some implementations successfully manage more than 15 well-defined, distinct tools while others struggle with fewer than 10 overlapping tools.

## 2. Multi-Agent Systems

While multi-agent systems can be designed in numerous ways for specific workflows and requirements, two broadly applicable categories are:

### Manager Pattern (Agents as Tools)

A central "manager" agent coordinates multiple specialized agents via tool calls, each handling a specific task or domain. Instead of losing context or control, the manager intelligently delegates tasks to the right agent at the right time, effortlessly synthesizing the results into a cohesive interaction.

This pattern is ideal for workflows where you only want one agent to control workflow execution and have access to the user.

### Decentralized Pattern (Agents Handing Off to Agents)

In a decentralized pattern, agents can 'handoff' workflow execution to one another. Handoffs are a one-way transfer that allow an agent to delegate to another agent. When an agent calls a handoff function, execution immediately starts on the new agent that was handed off to while also transferring the latest conversation state.

This pattern involves using many agents on equal footing, where one agent can directly hand off control of the workflow to another agent. This is optimal when you don't need a single agent maintaining central control or synthesis—instead allowing each agent to take over execution and interact with the user as needed.

This pattern is especially effective for scenarios like conversation triage, or whenever you prefer specialized agents to fully take over certain tasks without the original agent needing to remain involved. Optionally, you can equip the second agent with a handoff back to the original agent, allowing it to transfer control again if necessary.