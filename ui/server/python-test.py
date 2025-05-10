#!/usr/bin/env python3
"""
Simple Python test script to verify Python is accessible
from the Windows environment through WSL.
"""

import sys
import os
import platform

# Print basic information
print("Python version:", sys.version)
print("Platform:", platform.platform())
print("Current directory:", os.getcwd())
print("Executable path:", sys.executable)

# Print environment variables
print("\nKey environment variables:")
for var in ['PATH', 'PYTHONPATH', 'PYTHON_HOME']:
    print(f"{var}: {os.environ.get(var, 'Not set')}")

# Test output
print("\nTest successful: Python is working in the WSL environment!")

# Exit with success
sys.exit(0)