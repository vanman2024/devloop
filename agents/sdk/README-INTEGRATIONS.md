# SDK Utility Integrations

This document describes the utility integrations adapted from existing scripts in the Devloop ecosystem, enhancing the SDK with powerful capabilities for state management, design tracking, asset management, and natural language command processing.

## Overview

The SDK has been extended with the following utilities, adapted from existing Devloop scripts:

1. **Memory Persistence System** - Robust state management with JSON path queries
2. **Design Tracker** - Track and manage design implementations
3. **Asset Manager** - Organize and retrieve visual assets
4. **Natural Language Command Processor** - Process commands in natural language

## Memory Persistence System

The Memory Persistence system provides a robust persistence layer for the SDK's state management, adapted from the Python-based Memory Manager.

### Key Features

- Persistent state management across SDK sessions
- JSON path-based state queries and updates
- Schema validation for stored data
- Backup and restoration capabilities
- Atomic operations with locking

### Usage Example

```python
from sdk.utils.memory_persistence import MemoryPersistence

# Initialize memory persistence
memory = MemoryPersistence()

# Get state
agent_state = memory.get_state("agent-123")

# Update specific fields
memory.update_state("agent-123", {
    "status": "running",
    "last_activity": "2025-05-06T12:34:56Z",
    "metrics.requests_processed": 42
})

# Save complete state
memory.set_state("agent-123", {
    "id": "agent-123",
    "name": "Data Processing Agent",
    "status": "idle",
    "created_at": "2025-05-01T10:00:00Z",
    "meta": {
        "version": "1.0.0"
    }
})

# Create backup
backup_path = memory.backup_memory("/path/to/state.json", "pre-update")

# Validate state against schema
valid, errors = memory.validate_memory(agent_state)
```

## Design Tracker

The Design Tracker helps manage design implementations in the SDK, facilitating the workflow from designs to code.

### Key Features

- Track design implementation progress
- Manage design assets across multiple categories
- Search and find designs by name or category
- Record implementation details and output files

### Usage Example

```python
from sdk.utils.design_tracker import DesignTracker

# Initialize design tracker
tracker = DesignTracker()

# Register a design
design = tracker.register_design("UserProfileComponent")

# Start implementation
implementation = tracker.start_implementation(design["id"], {
    "implementer": "Claude",
    "target_framework": "React",
    "priority": "high"
})

# Update implementation with progress
tracker.update_implementation(implementation["id"], {
    "status": "in_progress",
    "notes": [{"timestamp": "2025-05-06T15:30:00Z", "text": "Completed basic structure"}]
})

# Mark implementation as complete
tracker.complete_implementation(
    implementation["id"],
    output_files=["src/components/UserProfile.jsx", "src/styles/UserProfile.css"],
    notes="Implemented according to design with responsive layout"
)

# List designs by category
component_designs = tracker.list_designs(category="Components")

# Get implementation statistics
stats = tracker.get_implementation_stats()
```

## Asset Manager

The Asset Manager provides tools for managing visual assets and screenshots, facilitating documentation, testing, and design workflows.

### Key Features

- Find and organize screenshots and other visual assets
- Categorize assets based on content patterns
- List recent assets with filtering options
- Search assets by name or category

### Usage Example

```python
from sdk.utils.asset_manager import AssetManager

# Initialize asset manager
assets = AssetManager()

# Find an asset by name
screenshot_path = assets.find_asset("login_form")

# List recent assets
recent_ui_components = assets.list_recent_assets(count=5, category="UI Components")

# Organize an asset into a category
organized_path = assets.organize_asset("/path/to/dashboard_view.png", "View Types")

# Bulk organize assets from a directory
results = assets.bulk_organize(source_dir="/path/to/screenshots", limit=20)

# Get detailed information about an asset
info = assets.get_asset_info("/path/to/asset.png")

# Search for assets
search_results = assets.search_assets("button", category="UI Components")
```

## Natural Language Command Processor

The Natural Language Command Processor enables intuitive interaction with the SDK's features through natural language commands.

### Key Features

- Intent detection from natural language
- Entity extraction from commands
- Extensible command handling framework
- Optional AI-powered intent recognition

### Usage Example

```python
from sdk.utils.nl_command import CommandProcessor, IntentDetector

# Create a command processor
processor = CommandProcessor()

# Process a natural language command
result = processor.process_command("create a new component called UserProfile")
# Result: {'command': '...', 'intent': 'create', 'success': True, 'message': 'Created component: UserProfile', 'data': {...}}

# Register a custom handler
def handle_deploy(command, entities):
    # Custom deployment logic
    return {
        "success": True,
        "message": f"Deployed to {entities.get('environment', 'production')}",
        "data": {"deployment_id": "dep-123"}
    }

processor.register_handler("deploy", handle_deploy)

# Process command with custom handler
result = processor.process_command("deploy the application to staging environment")

# Just detect intent without processing
detector = IntentDetector()
intent, entities = detector.detect_intent("update the configuration in settings.json")
```

## Integration with SDK Core

These utilities are designed to integrate seamlessly with the SDK core architecture:

- All utilities use the SDK's logging system
- Error handling is consistent with SDK standards
- Configuration follows SDK patterns
- Type hinting and docstrings follow SDK conventions

## Future Enhancements

Potential future enhancements to these integrations include:

1. **Memory Persistence**: Add Redis/MongoDB adapters for distributed state
2. **Design Tracker**: Add real-time collaboration features
3. **Asset Manager**: Add image analysis capabilities
4. **NL Command Processor**: Enhance AI integration with more sophisticated models

## Credits

These utilities were adapted from existing Devloop scripts:

- Memory Persistence from `create_memory_enhancement.py`
- Design Tracker from `design_to_code.py`
- Asset Manager from `view_screenshot.py` and `organize_screenshots.py`
- NL Command Processor from `test_command.py`