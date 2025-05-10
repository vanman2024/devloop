"""
SDK Utilities Module

This module provides utility functions and classes for the SDK architecture.
It includes adapted and enhanced versions of utilities from the Devloop ecosystem.

Available modules:
- memory_persistence: Robust state management with JSON path queries
- design_tracker: Track and manage design implementations
- asset_manager: Organize and retrieve visual assets 
- nl_command: Natural language command processing
- ai_service: AI service capabilities
"""

try:
    from .memory_persistence import MemoryPersistence
    from .design_tracker import DesignTracker
    from .asset_manager import AssetManager
    from .nl_command import IntentDetector, CommandProcessor, detect_intent, process_command
except ImportError:
    pass

try:
    from .ai_service import AIService, ContextManager, ClaudeClient
except ImportError:
    pass