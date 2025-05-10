"""
Task Agent Package

This module provides a Task Agent capable of breaking down features into actionable tasks,
analyzing dependencies, and managing task lifecycles with LLM capabilities.
"""

import os
import sys
import importlib.util

# Add parent directories to Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.normpath(os.path.join(current_dir, '..', '..'))
project_root = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))

# Add directories to Python path if not already there
for path in [current_dir, agents_dir, project_root]:
    if path not in sys.path:
        sys.path.append(path)