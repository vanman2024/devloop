# SDK-First Agent Templates

This directory contains templates for the SDK-first architecture, providing standardized structures for agents, tools, and interaction patterns.

## Directory Structure

Templates are organized into logical categories:

- **agent/** - Agent implementation templates for various patterns
- **tools/** - Tool implementation templates for different tool types
- **sdk/** - SDK integration templates
- **ai/** - AI prompts and instruction templates
- **prompt/** - Prompt templates for agent instructions
- **testing/** - Templates for testing agents and tools

## Agent Templates

- **agent/single_agent.json** - Template for a single agent with tools
- **agent/manager_worker.json** - Template for manager-worker pattern
- **agent/decentralized.json** - Template for decentralized agent network
- **agent/specialized_agent.json** - Template for domain-specific agents

## Tool Templates

- **tools/base_tool.json** - Template for a basic tool implementation
- **tools/system_tool.json** - Template for system operation tools
- **tools/knowledge_tool.json** - Template for knowledge management tools
- **tools/ui_tool.json** - Template for UI integration tools
- **tools/testing_tool.json** - Template for testing tools

## SDK Integration Templates

- **sdk/assistant_definition.json** - Template for OpenAI Assistant definition
- **sdk/thread_management.json** - Template for thread management
- **sdk/function_calling.json** - Template for function calling integration
- **sdk/permission_config.json** - Template for tool permission configuration

## AI Instruction Templates

- **ai/system_message.md** - Template for agent system messages
- **ai/knowledge_retrieval.md** - Template for knowledge retrieval instructions
- **ai/tool_usage.md** - Template for tool usage instructions
- **ai/error_handling.md** - Template for error handling instructions

## Prompt Templates

- **prompt/entity_extraction.md** - Template for entity extraction prompts
- **prompt/planning.md** - Template for planning prompts
- **prompt/tool_selection.md** - Template for tool selection guidance
- **prompt/handoff.md** - Template for agent handoff instructions

## Testing Templates

- **testing/agent_test.json** - Template for agent test cases
- **testing/tool_test.json** - Template for tool test cases
- **testing/interaction_test.json** - Template for agent interaction tests
- **testing/performance_test.json** - Template for performance testing

## Usage Guidelines

### For Agent Development

1. Select templates from the `agent/` directory based on the agent pattern
2. Define tools using templates from the `tools/` directory
3. Configure SDK integration using templates from the `sdk/` directory
4. Create system messages using templates from the `ai/` directory

### For Tool Development

1. Select templates from the `tools/` directory based on tool type
2. Define schemas using JSON schema standards
3. Implement permission models using templates from the `sdk/` directory

### For Testing

1. Create test cases using templates from the `testing/` directory
2. Define expected behaviors and outputs
3. Implement test agents using templates from the `agent/` directory

## Migration

These templates have been migrated from the legacy Devloop system and updated to follow the SDK-first architecture. They are designed to work with OpenAI's Assistants API and our custom tools framework.