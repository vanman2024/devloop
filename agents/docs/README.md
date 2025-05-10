# Devloop Agent Documentation

This directory contains comprehensive documentation for the Devloop Agent Architecture.

## SDK-First Architecture (New)

We've transitioned to a new SDK-first architecture that builds directly on the OpenAI Assistants API. The [**knowledge_base/**](knowledge_base/) directory contains comprehensive documentation:

- [**SDK Architecture Guide**](knowledge_base/sdk_architecture_guide.md) - Comprehensive guide to our SDK-first architecture
- [**Migration Plan**](knowledge_base/MIGRATION_PLAN.md) - Migration plan from legacy to SDK-first architecture
- [**SDK Quickstart**](knowledge_base/SDK_QUICKSTART.md) - Getting started with our SDK-first architecture
- [**SDK Agent Example**](knowledge_base/examples/sdk_agent_example.py) - Example implementation using our SDK-first architecture

## Architecture Documentation

The [**architecture/**](architecture/) directory contains the core architectural documents:

- [**Consolidated Architecture**](architecture/CONSOLIDATED_ARCHITECTURE.md) - Comprehensive SDK-first architecture design
- [**Knowledge Graph Design**](architecture/KNOWLEDGE_GRAPH_DESIGN.md) - Multi-tier memory system design
- [**Migration Plan**](architecture/MIGRATION_PLAN.md) - Detailed migration strategy to SDK-first architecture
- [**Devloop Vision**](architecture/devloop-vision.md) - Strategic vision for Devloop

## Migration Guides

- [**Script-to-Agent Migration Plan**](script-to-agent-migration.md) - Strategy for converting bash scripts to agents
- [**Conversion Examples**](conversion-examples/) - Examples of converting bash scripts to agents:
  - [Orphan Folder Scanner Example](conversion-examples/orphan-folder-scanner.md) - Detailed example of script conversion

## Reference Documentation

The [**references/**](references/) directory contains important reference materials:

- [**AI Orchestration Guide**](references/AI_ORCHESTRATION_GUIDE.md) - Guide for the AI Service Orchestration system
- Additional documentation migrated from legacy Key_Build_Docs

## Testing

- [**Testing Instructions**](testing-instructions.md) - Guide for testing the agent architecture
  - Manual testing procedures
  - Integration testing with the knowledge graph and activity center
  - UI and API testing methods
  - Troubleshooting and debugging guides

## Agent-Specific Documentation

Each agent contains its own documentation:

- `system-health-agent/README.md` - System Health Agent documentation
- `system-health-agent/README-ORCHESTRATION.md` - Orchestration details
- `host-agent/README.md` - Host Agent documentation
- `memory-writer/README.md` - Memory Writer Agent documentation
- `builder-agent/README.md` - Builder Agent documentation
- Other agent READMEs

## Recent Updates

- Added [**Agentic Glossary**](AGENTIC_GLOSSARY.md) with updated terminology for the agent architecture
- Added migration plan for incorporating legacy Key_Build_Docs into the agent architecture
- Started migration of reference documentation with AI Orchestration Guide
- Streamlined testing documentation with focus on manual testing procedures
- Enhanced troubleshooting and monitoring guidance
- Created [**Agentic Architecture**](architecture/AGENTIC_ARCHITECTURE.md) document