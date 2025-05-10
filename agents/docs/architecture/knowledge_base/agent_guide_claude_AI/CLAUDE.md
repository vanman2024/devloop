# Devloop Project Context for Claude

## Key Commands

- To build and run features: `./system-core/scripts/devloop/run-feature.sh <feature-path>`
- To update dashboard: `./system-core/project-tracker/update-dashboard-data.sh`
- To generate reports: `./system-core/scripts/devloop/generate-progress-reports.sh`
- To activate AI systems: `./activate-ai-systems.sh` (symlink to scripts/system/activate-ai-systems.sh)
- For UI development: `./start-ui.sh` (with hot reload enabled)
- To start UI production server: `./ui.sh production` (symlink to scripts/ui/ui.sh)
- To stop UI servers: `./ui.sh stop`

**Note:** All scripts have been organized into subdirectories under `scripts/` with symlinks in the root for convenience.

## Project Structure

- `system-core/` - Core system scripts and utilities
- `milestones/` - Project milestones, phases, modules, and features
- `Key_Build_Docs/` - Core documentation files

## Naming Conventions

- Features: `feature-XXXX-name`
- Enhancements: `enhancement-XXXX-YYY-name`
- Refactorings: `refactoring-XXXX-YYY-name`

## Design Principles

1. Use Python for complex logic
2. Keep UI and implementation separate
3. Maintain compatibility across all components
4. Focus on user experience and simplicity
5. We can't use jq in this environment - use Python scripts instead (always check for existing Python scripts first before creating new ones)
6. Only use Express architecture for now, no Flask API

## Available Claude Commands

### Agent Development and Knowledge Base
- `/agent:knowledge:search` - Prompt Claude to run the search script and access the knowledge base
  - Parameters:
    - `query`: The search term or pattern to look for (required)
    - `max_results`: Maximum number of results to display (optional, default: 10)
  - Examples:
    - `/agent:knowledge:search "manager pattern"` - Claude will run the search script for "manager pattern"
    - `/agent:knowledge:search "handoff" --max_results=5` - Claude will run the search script with limited results

- `/agent:knowledge:list` - Prompt Claude to list knowledge base contents using the list script
  - Parameters:
    - `category`: Filter by documentation category (optional)
  - Examples:
    - `/agent:knowledge:list` - Claude will list all documentation using the script
    - `/agent:knowledge:list "code_examples"` - Claude will list only code examples

- `/agent:sdk:quickstart` - Prompt Claude to display the SDK quickstart guide from the knowledge base
  - Examples:
    - `/agent:sdk:quickstart` - Claude will run the script to display the quickstart guide

- `/agent:implementation:create` - Prompt Claude to generate scaffold code for an agent implementation
  - Parameters:
    - `pattern`: The agent pattern to implement (single, manager, decentralized) (required)
    - `name`: Name for the agent (required)
    - `description`: Description of the agent's purpose (optional)
  - Examples:
    - `/agent:implementation:create "single" "WeatherAgent" "A helpful agent that provides weather information"` - Claude will generate a single agent implementation
    - `/agent:implementation:create "manager" "TranslationManager" "Coordinates translation across multiple languages"` - Claude will generate a manager pattern implementation

### Project Management
- `/project:ui:page-based` - UI enhancement for Multi-page UI with feature-centric AI integration
- `/project:feature:card-ai` - Feature analysis & implementation for Feature card with AI interaction panel
- `/project:refactor:project-tracker` - Code refactoring for Convert single dashboard to multi-page architecture

### Milestone and Feature Management
- `/project:feature:create-milestone` - Feature analysis & implementation for Create a new milestone with proper roadmap alignment
- `/project:feature:create-phase` - Feature analysis & implementation for Create a new phase within a milestone, maintaining proper roadmap hierarchy
- `/project:feature:create-module` - Feature analysis & implementation for Create a new module within a phase, with automatic roadmap goal assignment
- `/project:feature:roadmap-align` - Feature analysis & implementation for Analyze a feature and suggest proper roadmap alignment
- `/project:feature:register-deviation` - Feature analysis & implementation for Register an approved deviation from the roadmap with tracking information

### UI Enhancements
- `/project:ui:roadmap-dashboard` - UI enhancement for Display interactive roadmap dashboard with progress tracking and deviation metrics
- `/project:ui:health-dashboard` - UI enhancement for System health monitoring dashboard with diagnostics and recommendations

### Roadmap Management
- `/project:roadmap-analysis` - Deep analysis of Analyze roadmap coverage and suggest realignment strategies
- `/project:align:strategic` - Strategic component analysis and placement with automatic roadmap alignment

### System Synchronization
- `/project:sync:roadmap` - System synchronization for Analyze and synchronize roadmap system components automatically
- `/project:sync:milestone` - System synchronization for Synchronize a specific milestone with the roadmap
- `/project:sync:remove-milestone` - Safely remove milestones with proper system-wide cleanup
- `/project:sync:remove-phase` - Safely remove phases with proper system-wide cleanup
- `/project:sync:remove-module` - Safely remove modules with proper system-wide cleanup
- `/project:sync:remove-feature` - Safely remove features with proper system-wide cleanup

### AI Command Optimization
- `/project:ai:optimize-prompt` - Analyze and optimize prompt templates based on performance data
  - Parameters:
    - `--template`: Template name to optimize (omit for all templates)
    - `--show-variations`: Show alternative template variations
    - `--apply`: Apply optimization suggestions automatically
    - `--metric`: Optimization metric (effectiveness|token_efficiency|user_satisfaction)
  - Examples:
    - `/project:ai:optimize-prompt --template=feature_creation` - Optimize a specific template
    - `/project:ai:optimize-prompt --show-variations` - View all template variations
    - `/project:ai:optimize-prompt --apply --metric=token_efficiency` - Apply optimizations focused on token efficiency

### Testing System Management
- `/project:test:run-framework` - Run comprehensive tests using the integrated testing framework
- `/project:test:dependency-analyze` - Analyze feature dependencies for proper test ordering
- `/project:test:health-check` - Run system health checks as part of testing process
- `/project:test:visual-report` - Generate visual test reports and interactive dashboards
- `/project:test:memory-validate` - Validate memory files across the system for integrity

### Cleanup and Maintenance
- `/project:enhance:cleanup-root` - Clean up temporary files and logs in the root directory
  - Parameters: `--dry-run` (Preview changes without making them)
  - Example: `/project:enhance:cleanup-root --dry-run`

- `/project:enhance:cleanup-project` - Clean up temporary files and organize project workspace
  - Parameters: 
    - `--dry-run`: Preview changes without making them
    - `--scope`: Set cleanup scope (root|all|feature)
    - `--deep`: Perform deep cleanup including older files
    - `--path`: Specify a custom directory to clean up
  - Examples:
    - `/project:enhance:cleanup-project --path=Planning` - Clean a specific directory
    - `/project:enhance:cleanup-project --dry-run` - Preview cleanup
    - `/project:enhance:cleanup-project --deep` - Thorough cleanup including older files

### Work Summary Management
- `/project:summarize` - Capture and log a summary of Claude's completed work for UI display
  - Parameters:
    - `--feature`: Feature identifier related to the summary
    - `--category`: Category/type of work being summarized
    - `--milestone`: Milestone the work belongs to
    - `--view`: View recent summaries instead of creating a new one
    - `--report`: Generate a summary report in markdown or HTML format
  - Examples:
    - `/project:summarize "Fixed bug in dashboard rendering, improved error handling"` - Log a work summary
    - `/project:summarize --feature=feature-4033 --category=bugfix "Fixed issue with component rendering"` - Log with metadata
    - `/project:summarize --view` - View recent summary logs
    - `/project:summarize --report` - Generate a summary report

### Health Monitoring
- `/project:health:run-check` - Run comprehensive health check on the Devloop system
  - Parameters:
    - `--target`: Specify a milestone, phase, or module to check (default: entire system)
    - `--categories`: Specify health check categories to run (structure,memory,orphans,deps,perms,core)
    - `--fix`: Automatically fix common issues (use with caution)
    - `--report`: Generate detailed report in specified format (text,html,json)
  - Examples:
    - `/project:health:run-check` - Run full system health check
    - `/project:health:run-check --target=milestone-ui-dashboard` - Check specific milestone
    - `/project:health:run-check --categories=memory,orphans --fix` - Fix memory and orphan issues

- `/project:health:analyze-issues` - Deep analysis of system health issues with recommendations
  - Parameters:
    - `--severity`: Filter by issue severity (critical,warning,info)
    - `--category`: Filter by issue category (structure,memory,orphans,deps,perms,core)
    - `--limit`: Limit number of issues to analyze
  - Examples:
    - `/project:health:analyze-issues --severity=critical` - Analyze critical issues
    - `/project:health:analyze-issues --category=memory` - Analyze memory issues

- `/project:health:fix-issue` - Fix a specific health issue or category of issues
  - Parameters:
    - `--issue`: Specific issue ID to fix
    - `--category`: Category of issues to fix (structure,memory,orphans,deps,perms,core)
    - `--dry-run`: Preview fixes without applying them
  - Examples:
    - `/project:health:fix-issue --issue=orphaned-features` - Fix orphaned features
    - `/project:health:fix-issue --category=memory --dry-run` - Preview memory fixes

### Documentation Management
- `/project:enhance:docs-status` - Check documentation status and update key documentation files
  - Parameters:
    - `--report`: Generate a detailed documentation status report
    - `--update-cli`: Update CLI-REFERENCE.md automatically
  - Examples:
    - `/project:enhance:docs-status --report` - Generate docs report
    - `/project:enhance:docs-status --update-cli` - Update CLI reference

### Utilities
- `/project:enhance:test-build-command` - Enhancement design for Test command to verify CLAUDE.md update location
- `/inject:/command:path` - Meta-command that runs any slash command with injected text for additional context

## Knowledge Base

### Agent Knowledge Base
The Devloop project now includes a comprehensive knowledge base about building agents with OpenAI's Agent SDK:

- **Location**: `/mnt/c/Users/angel/Devloop/knowledge_base/`
- **Search Utility**: `search.py` - Search the knowledge base for specific terms or patterns
- **Index Generator**: `index_generator.py` - Generate an overall index of the knowledge base

This knowledge base provides structured information extracted from "A Practical Guide to Building Agents" including:

1. **Conceptual Documentation** - Core concepts, patterns, and best practices
2. **Code Examples** - Extracted code samples demonstrating key concepts
3. **Reference Implementations** - Working implementations of agent patterns (single-agent, manager, decentralized)
4. **Testing Framework** - Tools for testing agent components
5. **Integration Guide** - How to integrate the OpenAI Agents SDK
6. **Migration Plan** - Strategy for transitioning from custom patterns to the SDK
7. **SDK Quickstart** - Getting started with the OpenAI Agents SDK

You can access this knowledge base through the `/agent:knowledge:*` commands or by directly navigating to the files.

## Core Documents Reference

These are the main core documents that define Devloop's operation:

1. **Devloop Workflow**
   - File: [DEVLOOP_WORKFLOW.md](DEVLOOP_WORKFLOW.md)
   - Contains: Complete workflow procedures for all Devloop operations
   - Covers: Creating features, enhancements, refactorings, testing, and more

2. **System Glossary**
   - File: [GLOSSARY.md](GLOSSARY.md) 
   - Contains: Standardized definitions of all Devloop terminology
   - Covers: Packet types, system components, status values, file types, relationships

3. **Architecture Overview**
   - File: [ARCHITECTURE.md](ARCHITECTURE.md)
   - Contains: High-level system architecture diagrams and component relationships
   - Covers: System structure, component hierarchy, interfaces, and information flow

4. **Design Principles**
   - File: [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md)
   - Contains: Core principles guiding Devloop development
   - Covers: Key design decisions, anti-patterns to avoid, application guidelines

5. **Packet Checklist**
   - File: [PACKET_CHECKLIST.md](PACKET_CHECKLIST.md)
   - Contains: Comprehensive checklists for creating each packet type
   - Covers: Requirements, best practices, and review process for all packet types

6. **AI Guardrails Policy**
   - Path: `/mnt/c/Users/angel/Devloop/system-core/policies/ai-guardrails.md`
   - Contains: Safety constraints and operational boundaries for AI interaction
   - Covers: File access rules, code generation safety, security practices, compliance

7. **CLI Reference**
   - File: [CLI-REFERENCE.md](CLI-REFERENCE.md)
   - Contains: Comprehensive documentation of all CLI commands with basic natural language interface
   - Covers: All CLI tools, parameters, and usage examples

8. **Chat Command Reference**
   - File: [DEVLOOP_CHAT_COMMANDS.md](DEVLOOP_CHAT_COMMANDS.md)
   - Contains: Comprehensive documentation of natural language commands
   - Covers: All conversational patterns, examples, and mappings to CLI tools

9. **AI Service Orchestration Guide**
   - File: [AI_ORCHESTRATION_GUIDE.md](AI_ORCHESTRATION_GUIDE.md)
   - Contains: Comprehensive guide to the AI Service Orchestration System
   - Covers: Model registration, load balancing, workflow creation, and API usage

9. **Testing Overview**
   - File: [TESTING_OVERVIEW.md](TESTING_OVERVIEW.md)
   - Contains: Comprehensive documentation of the testing framework
   - Covers: Testing architecture, layers, integration with health checks, and reporting


## AI Systems Integration

The Devloop system includes sophisticated AI components that need to be activated for optimal functionality:

```bash
# Activate all AI systems (do this first)
./activate-ai-systems.sh
```

This activation script connects these key AI components:

1. **AI Service Layer** - Provides Claude API integration and context management
2. **Intent Recognition** - Understands natural language commands with context
3. **Integration Sync** - Ensures system-wide consistency after operations
4. **AI Service Orchestration** - Coordinates complex workflows across multiple AI models

The activation ensures these components are properly integrated with the command system, resulting in:
- Better natural language command detection
- Proper feature placement in the system
- Consistent system state across all components
- Orchestrated AI model workflows with load balancing and fallbacks

### AI Service Orchestration System

The AI Service Orchestration System provides advanced capabilities for working with multiple AI models:

```bash
# Use the orchestration CLI
python orchestration_cli.py service start

# Register a model
python orchestration_cli.py model register my-model --capability text=true --role primary

# Create and execute a workflow
python orchestration_cli.py workflow execute workflow-id --input text="Hello, world!" --wait
```

Key benefits of the orchestration system:
- **Model Management**: Central registry for all AI models with capability tracking
- **Load Balancing**: Distributes workload across models using various strategies
- **Fallback Handling**: Ensures resilience when models fail
- **Workflow Engine**: Coordinates complex multi-step AI workflows
- **API & CLI**: Both programmatic and command-line interfaces

For comprehensive documentation, see [AI_ORCHESTRATION_GUIDE.md](AI_ORCHESTRATION_GUIDE.md).

## Feature Creation and Management

There are multiple approaches to create and manage features, each with different strengths and limitations:

### 1. Natural Language Command Interface (Requires AI Systems Activation)

The natural language interface offers convenience but requires AI system activation:

```bash
# Activate AI systems first (important!)
./activate-ai-systems.sh

# Creating a new feature
python3 system-core/scripts/devloop/natural_language_command.py "create a feature for dashboard data filtering"

# Creating an enhancement
python3 system-core/scripts/devloop/natural_language_command.py "enhance the memory status feature with Python-based memory manager"

# Running features
python3 system-core/scripts/devloop/natural_language_command.py "run the dashboard feature"

# Removing components
python3 system-core/scripts/devloop/natural_language_command.py "remove milestone test-milestone"
```

### 2. Direct Python Scaffold Scripts (Most Reliable)

When the natural language approach fails, use these Python-based scaffold scripts directly:

```bash
# Creating a new feature (RECOMMENDED APPROACH)
python3 system-core/scripts/devloop/scaffold_packet.py -t feature -i feature-XXXX-name \
  -n "Feature Name" -d "Feature Description" \
  --module module-name --phase phase-XX --milestone milestone-name

# Creating a phase
python3 system-core/scripts/devloop/scaffold_phase_bundle.py \
  -i phase-XX -n "Phase Name" -m 2 --milestone milestone-name
```

### 3. Claude Commands (Depends on System State)

Claude commands can be used but may fail if system components are not properly synchronized:

```bash
# Using direct Claude command invocation
python3 system-core/scripts/devloop/claude-devloop.py "/project:feature:create-feature" \
  --text "Create feature-XXXX-name in milestone-name phase-XX module-name that implements..."

# Using command injector
python3 system-core/scripts/devloop/claude_command_injector.py \
  --command "/project:feature:create-feature" \
  --inject "Create feature description here..."
```

### Benefits of Python-based Direct Approach:

- Avoids reliance on pattern recognition in natural language processing
- Doesn't require jq (unlike some bash scripts)
- Provides clear error messages
- Directly handles all directory structure and file creation
- Maintains registry updates and relationships
- Most consistent operation in WSL environments

## UI Modification Guidelines

When modifying or enhancing the Devloop Dashboard UI, these guidelines MUST be followed:

1. **Preservation of Existing UI**
   - NEVER overwrite or replace existing dashboard files
   - Always create new files with descriptive suffixes (e.g., `-enhanced`, `-with-actions`)
   - Preserve the original dashboard style, layout, and feature cards system
   - Maintain backward compatibility with all existing functionality

2. **Granular Feature UI Cards**
   - The dashboard UI MUST maintain the granular feature cards for detailed tracking
   - All UI enhancements should build upon the existing card system, not replace it
   - The hierarchical display of milestones→phases→modules→features must be preserved

3. **Backup and Restoration**
   - Create backups before making any UI changes
   - Provide scripts to restore the original UI state if needed
   - Include documentation for how to switch between UI versions

4. **UI Extension Approach**
   - Add functionality through JavaScript modules that enhance the existing UI
   - Use the extension pattern - augment rather than replace
   - Maintain the primary dashboard style and UX patterns

## Testing Framework

The Devloop testing framework provides comprehensive tools for validating system components:

1. **Multi-Layer Testing**
   - Unit tests: Component-level testing
   - Integration tests: Cross-component interaction testing
   - Live tests: Testing with actual environment dependencies
   - End-to-End tests: Complete workflow validation

2. **Testing Layers Configuration**
   - Configure which test layers are active for each test run
   - Control testing environment settings
   - Set timeout and debug options

3. **Health Check Integration**
   - Run system health checks as part of testing
   - Set thresholds for health check failures
   - Generate visual reports of health metrics

4. **Dependency-Aware Testing**
   - Automatically determine proper test execution order
   - Detect and handle circular dependencies
   - Generate visualizations of dependency relationships

5. **Visual Test Reporting**
   - Transform test results into interactive dashboards
   - Generate comprehensive reports of test status
   - Track testing trends over time

For detailed information, see [TESTING_OVERVIEW.md](TESTING_OVERVIEW.md).

## Claude Command Runners

### Interactive Claude Command Runner

Run Claude commands with an interactive prompt for adding text and confirmation:

```bash
# Run a Claude command with interactive prompts
./system-core/scripts/devloop/interactive_claude.sh <command> [prompt]

# Examples
./system-core/scripts/devloop/interactive_claude.sh /project:roadmap-analysis
./system-core/scripts/devloop/interactive_claude.sh /project:feature:roadmap-align "Analyze feature X"
```

This tool prompts you for additional input and confirmation before executing the command,
allowing you to add context or skip execution if needed.

### Command Injector

Run Claude commands with direct text injection:

```bash
# Run a Claude command with text injection
./system-core/scripts/devloop/run_claude_command.sh <command> [text-to-inject]

# Examples
./system-core/scripts/devloop/run_claude_command.sh /project:roadmap-analysis "Analyze the current roadmap"
./system-core/scripts/devloop/run_claude_command.sh /project:sync:remove-milestone "Remove test milestone because it's obsolete"
```

### Interactive Claude Shell

Devloop includes an interactive Claude command shell that lets you run any Claude commands with text injection. This overcomes the limitation of only being able to run one command at the start of a conversation.

```bash
# Launch the interactive Claude shell
./system-core/scripts/devloop/interactive-claude.sh
```

In the interactive shell, you can:
1. Run any Claude command: `/project:sync:remove-milestone`
2. Inject text into commands: `/inject:/project:sync:remove-milestone "Remove test milestone"`
3. List available commands: `/list`
4. Get help: `/help`

The interactive shell uses the Claude API directly, allowing you to run multiple commands in a single session and supply additional context whenever needed.

## Component Removal

Devloop provides a safe and comprehensive component removal system that:
1. Maintains system-wide consistency when removing components
2. Creates backups before removing anything
3. Checks for dependencies to prevent breaking the system
4. Updates all related components (registry, roadmap, filesystem)
5. Integrates with the UI roadmap for UI/backend consistency

Use any of these approaches to remove components:

1. **CLI Commands**:
   ```bash
   # Remove a milestone
   python3 system-core/scripts/devloop/ai-roadmap-synchronizer.py remove --target milestone-test-milestone
   
   # Remove a phase
   python3 system-core/scripts/devloop/ai-roadmap-synchronizer.py remove --target milestone-core-foundation --phase phase-02
   
   # Remove a module
   python3 system-core/scripts/devloop/ai-roadmap-synchronizer.py remove --target milestone-core-foundation --phase phase-02 --module module-logging
   
   # Remove a feature
   python3 system-core/scripts/devloop/ai-roadmap-synchronizer.py remove --target milestone-core-foundation --phase phase-02 --module module-logging --feature feature-101-log-json
   ```

2. **Claude Commands**:
   - Interactive: `/project:sync:remove-milestone` (Guides you through selection)
   - Direct: `/project:sync:remove-milestone:milestone-test-milestone`
   - Similarly for phases, modules, and features

3. **Natural Language**:
   ```bash
   python3 system-core/scripts/devloop/natural_language_command.py "remove the test milestone"
   python3 system-core/scripts/devloop/natural_language_command.py "delete phase 2 from core foundation"
   ```

4. **API Integration**:
   Launch the API server with:
   ```bash
   ./system-core/scripts/devloop/launch-component-removal-api.sh
   ```
   
   Then use REST API calls:
   ```bash
   # Analyze impact before removal
   curl -X POST -H "Content-Type: application/json" \
     -d '{"milestone_id":"milestone-test-milestone"}' \
     http://localhost:5000/api/v1/components/milestone/analyze
   
   # Remove a component
   curl -X POST -H "Content-Type: application/json" \
     -d '{"milestone_id":"milestone-test-milestone"}' \
     http://localhost:5000/api/v1/components/milestone/remove
   ```

5. **UI Components**:
   The UI features 2033 (Component Deletion) and 4033 (Component Management Operations) integrate with the Component Removal API.

6. **Command Injection**:
   Use the command injector to provide additional context to Claude commands:
   ```bash
   # Run a command with injected text
   python3 system-core/scripts/devloop/claude_command_injector.py \
     --command "/project:sync:remove-milestone" \
     --inject "I need to remove milestone-test because it's obsolete"
   
   # Or use the /inject slash command
   /inject:/project:sync:remove-milestone "I need to remove milestone-test because it's obsolete"
   ```

## API Integration

The Devloop system supports direct LLM API integration. Commands can be executed via:

1. **Claude Slash Commands** - Using `/project:category:command`
2. **Natural Language** - Using the built-in Devloop NL command processor
3. **API Calls** - Using the AI Command Bridge
4. **UI Integration** - Using UI components that trigger commands

Example API usage:
```python
# Call from Python
from devloop.ai_bridge import execute_command
result = execute_command("/project:feature:card-ai", {"component": "login"})

# Call from command line
python3 system-core/scripts/ai-bridge/command-bridge.py --command "/project:feature:card-ai" --params '{"component": "login"}'
```

## Adaptive Prompt System

The Adaptive Prompt System provides context-aware, performance-optimized prompts for AI interactions:

1. **Dynamic Context Management**
   - Efficiently manages conversation history within token limits
   - Prioritizes important information and prunes less relevant content
   - Supports extraction of relevant context for specific queries
   - Example: `dynamic_context_manager.py extract_key_information "implementation plan"`

2. **Template-Based Prompt Generation**
   - Creates consistent, optimized prompts from templates
   - Handles variable substitution and conditional sections
   - Tracks template performance and usage statistics
   - Example: `adaptive_prompt_templates.py render "feature_implementation" {"name": "Authentication"}`

3. **Feedback Optimization**
   - Learns from user feedback and auto-scoring to improve prompts
   - Generates variations of templates to test effectiveness
   - Provides analysis and suggestions for template improvements
   - Example: `feedback_optimization.py analyze "feature_creation"`

4. **Integration with Command System**
   - Enhances natural language commands with context and structure
   - Optimizes Claude slash commands for better performance
   - Synchronizes with existing template and context systems
   - Example: `integration.py enhance_natural_language_command "create feature"`

For detailed usage, see the documentation in:
`/mnt/c/Users/angel/Devloop/milestones/milestone-system-enhancement/phase-02/module-ai-command-system/feature-5106-adaptive-prompt-system/README.md`
## UI Development Commands

### UI Feature Creation and Management
- `/project:ui:create-feature` - Create a new UI feature with scaffold code
  - Parameters: 
    - `feature_name`: Name of the UI feature to create (required)
    - `description`: Description of the UI feature (optional)
  - Examples:
    - `/project:ui:create-feature "System Health Dashboard" "A dashboard for monitoring system health metrics"`
    - `/project:ui:create-feature "Feature Card Component" "Reusable component for displaying feature information"`

- `/project:ui:create-sandbox` - Create a sandbox environment for UI development
  - Parameters:
    - `feature_id`: ID of the UI feature (required)
    - `launch`: Launch the sandbox after creation (optional, default: false)
  - Examples:
    - `/project:ui:create-sandbox 6001`
    - `/project:ui:create-sandbox 6001 --launch`

- `/project:ui:integrate-feature` - Integrate a UI feature into the main application
  - Parameters:
    - `feature_id`: ID of the UI feature to integrate (required)
    - `validate_only`: Only validate the feature, don't integrate (optional, default: false)
  - Examples:
    - `/project:ui:integrate-feature 6001`
    - `/project:ui:integrate-feature 6001 --validate-only`

- `/project:ui:validate-feature` - Validate a UI feature before integration
  - Parameters:
    - `feature_id`: ID of the UI feature to validate (required)
  - Examples:
    - `/project:ui:validate-feature 6001`

### Natural Language UI Commands

The UI development framework also supports natural language commands using the `ui-nl-command.sh` script:

```bash
./ui-nl-command.sh "create a dashboard for system health monitoring"
./ui-nl-command.sh "create a sandbox for feature 6001"
./ui-nl-command.sh "integrate ui feature 6001"
./ui-nl-command.sh "validate ui feature 6001"
```

This allows for more intuitive interaction with the UI development system.