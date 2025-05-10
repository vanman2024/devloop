# Devloop Agent Architecture Documentation

This directory contains the official architecture documentation for the Devloop Agent Framework. The agent architecture now follows our SDK-first approach that builds directly on the OpenAI Assistants API.

## SDK-First Architecture

Our new SDK-first architecture is documented in the [**knowledge_base/**](knowledge_base/) directory:

- [**SDK Architecture Guide**](knowledge_base/sdk_architecture_guide.md) - Comprehensive guide to our SDK-first architecture
- [**Migration Plan**](knowledge_base/MIGRATION_PLAN.md) - Migration plan from legacy to SDK-first architecture
- [**SDK Quickstart**](knowledge_base/SDK_QUICKSTART.md) - Getting started with our SDK-first architecture

## Core Architectural Documents

- [**Consolidated Architecture**](CONSOLIDATED_ARCHITECTURE.md) - Comprehensive SDK-first architecture design
- [**Knowledge Graph Design**](KNOWLEDGE_GRAPH_DESIGN.md) - Multi-tier memory system design
- [**Migration Plan**](MIGRATION_PLAN.md) - Detailed migration strategy
- [**Devloop Vision**](devloop-vision.md) - High-level vision document describing the strategic direction of Devloop

## Framework Overview

The Devloop Agent Framework provides a sophisticated architecture for creating, managing, and orchestrating AI agents. Built on the foundation of the existing system-health-agent components, this framework enables hierarchical agent structures with parent-child relationships, standardized communication protocols, and robust lifecycle management.

### Hierarchical Agent Structure

The framework supports a three-tier agent hierarchy:

```
[ Parent Agent (System Agent) ]
       ↓
[ Child Agent (Operational Agent) ]
       ↓
[ Micro-Agent (Atomic Agent) ]
```

### Core Components

1. **Agent Lifecycle** - Standardized agent lifecycle management
2. **Agent Orchestration** - Coordination of agent communication and activities
3. **Message System** - Structured communication between agents
4. **Prompt Manager** - Advanced prompt templating and optimization
5. **Knowledge Graph** - Shared knowledge representation
6. **Event System** - Event-based triggers and notifications
7. **LLM Integration** - Connection to AI models

### Key Principles

1. **Single Responsibility** - Each agent performs one well-defined function
2. **Isolation** - Failures in one agent don't affect others
3. **Statelessness** - Agents maintain minimal state between requests
4. **Standardized Interfaces** - All agents implement consistent APIs
5. **Verifiable Outputs** - Every agent output is validated against schemas
6. **Immutable Data Flow** - Data passes through transformations, never mutated directly
7. **Controlled Persistence** - Only Memory-Writer has direct disk access
8. **Complete Activity Logging** - Every operation is logged with full context
9. **Transparent Recovery** - Failures at any step can be detected and recovered
10. **Hot-Pluggable Design** - New agents can be added without system restart

## Implementation Timeline

The agent architecture implementation follows a phased approach:

1. **Foundation Phase** (Weeks 1-2)
   - Plugin Registry System
   - Agent Protocol Definitions
   - Host Agent Implementation
   - Memory-Writer Agent

2. **Core Functionality Phase** (Weeks 3-4)
   - Builder Agent
   - System Health Agent
   - Integration Testing Framework
   - Documentation Agent

3. **Advanced Features Phase** (Weeks 5-6)
   - Parallel Execution Framework
   - Recovery & Rollback System
   - Enhanced Builder Capabilities
   - UI Integration

4. **Extensions & Refinement Phase** (Weeks 7-8)
   - Advanced Agents (Refactoring, Testing, Analytics)
   - Multi-tenant Support
   - Advanced Security
   - Enterprise Integration

## Related Resources

- [**Agentic Framework**](../AGENTIC_FRAMEWORK.md) - Consolidated reference for the agent framework components
- [**Agent Directory**](../AGENT_DIRECTORY.md) - Master directory of all agents in the system
- [**Agent Migration Plan**](../agent-migration-plan.md) - Plan for migrating from packet-based to agent-based architecture