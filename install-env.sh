#!/bin/bash
# Install required dependencies for the Task Agent

echo "Installing dependencies for the Task Agent..."

# Make sure we're in the project root
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source ./venv/bin/activate

# Install required packages
echo "Installing required packages..."
pip install --upgrade pip
pip install openai==1.11.1 httpx==0.26.0 anthropic==0.8.1 python-dotenv==1.0.0

# Verify installation
echo "Verifying installation..."
pip list | grep -E "openai|httpx|anthropic"

echo "Environment setup complete!"