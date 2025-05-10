# Devloop Agentic Framework Context

## Key Commands

- To build and run features: `./system-core/scripts/devloop/run-feature.sh <feature-path>`
- To update dashboard: `./system-core/project-tracker/update-dashboard-data.sh`
- To generate reports: `./system-core/scripts/devloop/generate-progress-reports.sh`
- For UI development: `./start-ui.sh` (with hot reload enabled)
- To start UI production server: `./ui.sh production` (symlink to scripts/ui/ui.sh)
- To stop UI servers: `./ui.sh stop`

## Project Structure

- `system-core/` - Core system scripts and utilities
- `milestones/` - Project milestones, phases, modules, and features
- `agents/` - Agent-based architecture components
- `Key_Build_Docs/` - Core documentation files

## Naming Conventions

- Features: `feature-XXXX-name`
- Enhancements: `enhancement-XXXX-YYY-name`
- Refactorings: `refactoring-XXXX-YYY-name`
- Agents: Parent/Child/Micro naming hierarchy

## Design Principles

1. Use Python for complex logic
2. Keep UI and implementation separate
3. Maintain compatibility across all components
4. Focus on user experience and simplicity
5. Use Python scripts instead of bash where possible for complex operations
6. Only use Express architecture - no Flask API

## Agent Architecture Overview

The Devloop system now uses a hierarchical agent-based architecture:

```
[ Parent Agent (System Agent) ]
       ↓
[ Child Agent (Operational Agent) ]
       ↓
[ Micro-Agent (Atomic Agent) ]
```

### Parent Agents
Strategic containers for operational domains, providing high-level orchestration:
- `system-health-agent`
- `host-agent`
- `builder-agent`

### Child Agents
Tactical executors that handle specific operational tasks:
- `cleanup-agent`
- `health-checker-agent`
- `health-reporter-agent`

### Micro-Agents
Focused on executing atomic tasks:
- `file-housekeeper`
- `orphan-canvas-cleaner`
- `bash-scripts-cleanup`

## Core Documents Reference

These are the main core documents that define Devloop's operation:

1. **Agentic Framework**
   - File: [AGENTIC_FRAMEWORK.md](AGENTIC_FRAMEWORK.md)
   - Contains: Comprehensive documentation of the agent-based architecture
   - Covers: Agent lifecycle, messaging, orchestration, prompt management

2. **Devloop Workflow**
   - File: [DEVLOOP_WORKFLOW.md](DEVLOOP_WORKFLOW.md)
   - Contains: Complete workflow procedures for all Devloop operations
   - Covers: Creating features, enhancements, refactorings, testing, and more

3. **System Glossary**
   - File: [GLOSSARY.md](GLOSSARY.md) 
   - Contains: Standardized definitions of all Devloop terminology
   - Covers: Packet types, system components, status values, file types, relationships

4. **Architecture Overview**
   - File: [ARCHITECTURE.md](ARCHITECTURE.md)
   - Contains: High-level system architecture diagrams and component relationships
   - Covers: System structure, component hierarchy, interfaces, and information flow

5. **Design Principles**
   - File: [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md)
   - Contains: Core principles guiding Devloop development
   - Covers: Key design decisions, anti-patterns to avoid, application guidelines

6. **Testing Overview**
   - File: [TESTING_OVERVIEW.md](TESTING_OVERVIEW.md)
   - Contains: Comprehensive documentation of the testing framework
   - Covers: Testing architecture, layers, integration with health checks, and reporting

## Agent System Integration

The Devloop system includes sophisticated agent components with these key features:

1. **Agent Lifecycle Management**
   - Standardized initialize, execute, handoff, shutdown methods
   - Consistent state transitions and error handling
   - Clean resource management and graceful termination

2. **Message-Based Communication**
   - XML-structured message format
   - Support for different message types (command, query, report, etc.)
   - Prioritization and conversations tracking

3. **Agent Orchestration**
   - Hierarchical organization of agent responsibilities
   - Dynamic agent discovery and capability-based routing
   - Event-based coordination and triggers

4. **Prompt Engineering**
   - Template-based prompt generation
   - Performance tracking and optimization
   - Adaptive prompt adjustment

5. **LLM Integration**
   - Model-agnostic interface
   - Support for multiple LLM providers
   - Fallback and redundancy handling

## Feature Creation and Management

Direct Python Scaffold Scripts approach:

```bash
# Creating a new feature
python3 system-core/scripts/devloop/scaffold_packet.py -t feature -i feature-XXXX-name \
  -n "Feature Name" -d "Feature Description" \
  --module module-name --phase phase-XX --milestone milestone-name

# Creating a phase
python3 system-core/scripts/devloop/scaffold_phase_bundle.py \
  -i phase-XX -n "Phase Name" -m 2 --milestone milestone-name
```

Benefits of Python-based Direct Approach:
- Consistent file and directory creation
- Automatic registry updates 
- Clear error messages
- Reliable operation in WSL environments

## UI Modification Guidelines

When modifying the Devloop Dashboard UI:

1. **Preservation of Existing UI**
   - Create new files with descriptive suffixes
   - Maintain backward compatibility

2. **Granular Feature UI Cards**
   - Maintain the card-based tracking system
   - Preserve hierarchical display structure

3. **Backup and Restoration**
   - Create backups before UI changes
   - Include restoration documentation

4. **UI Extension Approach**
   - Augment rather than replace functionality
   - Maintain consistent UX patterns

## Testing Framework

The Devloop testing framework provides:

1. **Multi-Layer Testing**
   - Unit, integration, live, and end-to-end tests

2. **Testing Layers Configuration**
   - Configurable test environments and parameters

3. **Health Check Integration**
   - System health validation during testing

4. **Dependency-Aware Testing**
   - Intelligent test ordering based on dependencies

5. **Visual Test Reporting**
   - Interactive dashboards and metrics