# Devloop Agent Architecture

This directory contains Devloop's new agent architecture, built with an SDK-first approach using a hexagonal design pattern. This implementation leverages the OpenAI Assistants SDK as its foundation while enhancing it with Devloop's agent coordination capabilities.

## Directory Structure

```
/agents
  /sdk              # OpenAI Assistants SDK foundation
    /core           # Core SDK implementation
      agent.py      # Base SDK agent implementation
  /tools            # Tools for function calling
    /core           # Core tool implementations
    /registry       # Tool registration and discovery
    /agent_specific # Agent-specific tool implementations
    /extensions     # MCP and extension tools
  /langchain        # LangChain integration (future)
  /rag              # RAG implementation (future)
  /patterns         # Pattern implementations (future)
  /devloop          # Devloop integration (future)
  /implementations  # SDK-based agent implementations (future)
  /docs             # Architecture documentation
    /architecture   # Core architecture documentation
      /structure_templates  # SDK-first structure templates
  /utils            # Utility functions and services
    /ai_service     # AI service functionality
```

## Architecture

This implementation follows our hexagonal (ports & adapters) architecture with the OpenAI SDK serving as the foundation. For details, see our full architecture documentation in `/agents/docs/architecture/`.

Key documents:
- [Consolidated Architecture](/agents/docs/architecture/CONSOLIDATED_ARCHITECTURE.md)
- [Migration Plan](/agents/docs/architecture/MIGRATION_PLAN.md)
- [Knowledge Graph Design](/agents/docs/architecture/KNOWLEDGE_GRAPH_DESIGN.md)

## SDK Integration

We build directly on the OpenAI Assistant SDK while enhancing it with Devloop's agent coordination capabilities. This isn't a replacement but an enhancement of the SDK's core functionality.

### Agent Hierarchy

We preserve Devloop's agent hierarchy while implementing it with modern tooling:

```
┌─────────────────────────────────────────────────────┐
│               PARENT AGENT                          │
│  ┌──────────────────────────────────────────────┐   │
│  │  Agent Lifecycle                             │   │
│  │  - Spawn/Initialize                          │   │
│  │  - Monitor                                   │   │
│  │  - Coordinate                                │   │
│  │  - Retire                                    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
┌────▼────┐      ┌─────▼─────┐      ┌────▼────┐
│ CHILD 1 │      │  CHILD 2  │      │ CHILD 3 │
└────┬────┘      └─────┬─────┘      └────┬────┘
     │                 │                 │
┌────▼────┐      ┌─────▼─────┐      ┌────▼────┐
│ MICRO 1 │      │  MICRO 2  │      │ MICRO 3 │
└─────────┘      └───────────┘      └─────────┘
```

## Tool System

Our tool system leverages the OpenAI SDK's function calling capabilities while extending them with additional functionality for agent coordination. We make a clear distinction:

- **Functions**: Internal methods not exposed to the LLM
- **Tools**: Standalone capabilities registered in the tool registry and exposed to the LLM via SDK

The tool system includes:
- **Registry**: Central registry for tool registration and discovery
- **Base Tools**: Core tool classes for different types of operations
- **System Tools**: Tools for system operations like file access and process management
- **Knowledge Tools**: Tools for memory and knowledge graph operations
- **Agent-Specific Tools**: Tools designed for specific agent types

## Getting Started

1. Review the architecture documentation in `/agents/docs/architecture/`
2. Read the SDK architecture guide in `/agents/docs/architecture/knowledge_base/sdk_architecture_guide.md`
3. Explore the SDK implementation in `/agents/sdk/core/agent.py`
4. Learn the tool system in `/agents/tools/`
5. Try out the initialization script in `/agents/tools/init_tool_system.py`

## Documentation

Comprehensive documentation is available in:
- [`/agents/docs/architecture/`](/agents/docs/architecture/) - Core architecture documentation
- [`/agents/docs/architecture/knowledge_base/`](/agents/docs/architecture/knowledge_base/) - Guides, examples, and reference implementations
- [`/agents/docs/architecture/structure_templates/`](/agents/docs/architecture/structure_templates/) - SDK-focused structure templates for organizing the codebase

## Implementation Status

- ✅ SDK Core Implementation
- ✅ Tool System
- ✅ System Tools
- ✅ Knowledge Tools
- ✅ Architecture Documentation
- ✅ Structure Templates
- 🔄 LangChain Integration (In Progress)
- 🔄 RAG Implementation (In Progress)
- 🔄 Pattern Implementations (In Progress)
- 🔄 Devloop Integration (In Progress)
- 🔄 Example Implementations (In Progress)