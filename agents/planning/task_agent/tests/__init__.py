"""
Task Agent Tests Package
"""

import os
import sys

# Add parent directory to Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
task_agent_dir = os.path.dirname(current_dir)
agents_dir = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
project_root = os.path.normpath(os.path.join(current_dir, '..', '..', '..', '..'))

# Add directories to Python path if not already there
for path in [current_dir, task_agent_dir, agents_dir, project_root]:
    if path not in sys.path:
        sys.path.append(path)