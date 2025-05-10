#!/bin/bash
# full_sync.sh - One-time full synchronization of venv with requirements.txt

echo "=============================================="
echo "FULL REQUIREMENTS SYNCHRONIZATION"
echo "=============================================="

# Define paths
VENV_DIR="/mnt/c/Users/angel/Devloop/venv"
REQUIREMENTS_FILE="/mnt/c/Users/angel/Devloop/requirements.txt"
PIP_CMD="$VENV_DIR/bin/pip"

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo "❌ Virtual environment not found at $VENV_DIR"
    exit 1
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

echo "📋 Getting current list of installed packages..."

# Generate a complete requirements.txt from pip freeze
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
TMP_REQ=$(mktemp)
echo "# Requirements updated: $TIMESTAMP" > "$TMP_REQ"

# Get all packages and sort them
pip freeze | sort >> "$TMP_REQ"

# Move the new requirements file into place
mv "$TMP_REQ" "$REQUIREMENTS_FILE"

echo "✅ $REQUIREMENTS_FILE has been fully updated with ALL packages in your environment."
echo "📊 Total packages: $(grep -c "==" "$REQUIREMENTS_FILE")"
echo

# List of critical packages that should be checked
CRITICAL_PACKAGES=(
    "langchain"
    "langchain-openai" 
    "langchain-community"
    "openai"
    "pinecone-client"
    "tiktoken"
)

echo "🔍 Checking for critical packages..."
for pkg in "${CRITICAL_PACKAGES[@]}"; do
    if grep -q "$pkg==" "$REQUIREMENTS_FILE"; then
        echo "  ✅ $pkg is installed"
    else
        echo "  ❌ $pkg is MISSING - consider installing it with: pip install $pkg"
    fi
done

echo
echo "📝 Your requirements.txt file is now fully synchronized."
echo "🔄 The background watcher will keep it updated from now on."