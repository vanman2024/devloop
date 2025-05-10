#!/bin/bash
# Activate the development environment for Devloop

echo "Activating Devloop development environment..."

# Get the absolute path to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verify the virtual environment exists
if [ ! -f "$SCRIPT_DIR/venv/bin/activate" ]; then
    echo "ERROR: Virtual environment not found at $SCRIPT_DIR/venv"
    echo "Please make sure the virtual environment is created and located at the right path."
    return 1 2>/dev/null || exit 1
fi

# Activate the virtual environment
source "$SCRIPT_DIR/venv/bin/activate"

# Add project to Python path for imports
export PYTHONPATH="$SCRIPT_DIR"

# Display environment info
echo -e "\n✅ Environment activated!"
echo -e "Virtual environment: $VIRTUAL_ENV"
echo -e "Python interpreter: $(which python)"
echo -e "Python version: $(python --version)"
echo -e "\nInstalled packages:"
pip list | grep -i "openai\|anthropic\|httpx"

# Note for VS Code users
echo -e "\nIMPORTANT FOR VS CODE USERS:"
echo -e "1. Open Command Palette (Ctrl+Shift+P)"
echo -e "2. Type 'Python: Select Interpreter'"
echo -e "3. Choose the interpreter at /mnt/c/Users/angel/Devloop/venv/bin/python"
echo -e "4. Reload the window if needed (Ctrl+Shift+P -> 'Developer: Reload Window')"

echo -e "\nYou're now ready to work with the Task Agent! 🚀"