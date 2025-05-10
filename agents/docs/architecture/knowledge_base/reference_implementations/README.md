# Agent Reference Implementations

This directory contains reference implementations of the agent patterns described in "A Practical Guide to Building Agents." These implementations are designed to demonstrate the concepts and patterns rather than being production-ready code.

## Available Implementations

### [Single Agent](single_agent.py)

A basic implementation of a single agent with tools that runs in a loop until an exit condition is met. This pattern is suitable for straightforward tasks where a single agent can handle all requirements.

```bash
python3 single_agent.py
```

### [Manager Pattern](manager_pattern.py)

Implementation of the manager pattern, where a central agent coordinates specialized agents via tool calls. The manager maintains control of the workflow and synthesizes results from specialized agents.

```bash
python3 manager_pattern.py
```

### [Decentralized Pattern](decentralized_pattern.py)

Implementation of the decentralized pattern, where agents can hand off control to other agents. This pattern is suitable when specialized agents need to take over the conversation fully.

```bash
python3 decentralized_pattern.py
```

## Mock Implementation Details

These implementations use mock components to simulate the behavior of the OpenAI Agents SDK:

- `MockOpenAIClient`: Simulates the OpenAI API client
- `MockResponse`: Simulates API responses
- Tool and Agent classes that follow the patterns from the guide

In a real implementation, you would replace these mock components with actual API calls to OpenAI or another LLM provider.

## Usage Notes

1. These examples are meant for educational purposes only
2. The implementations skip many production considerations like:
   - Error handling
   - Rate limiting
   - Authentication
   - Logging
   - Testing
   - Security

3. To adapt these patterns for production use:
   - Replace the mock components with real API calls
   - Add proper error handling and retries
   - Implement security measures and guardrails
   - Add logging and monitoring
   - Add tests for each component