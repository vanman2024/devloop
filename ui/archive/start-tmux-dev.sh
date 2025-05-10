#!/bin/bash
# Script to automatically set up a tmux development environment
# with the working state detector and UI server

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up tmux development environment...${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Please install it with: sudo apt install tmux"
    exit 1
fi

# Session name
SESSION_NAME="devloop"

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null

# Create a new tmux session
echo -e "${BLUE}Creating new tmux session: ${SESSION_NAME}${NC}"
tmux new-session -d -s $SESSION_NAME

# Rename the first window to "detector"
tmux rename-window -t $SESSION_NAME:0 "detector"

# Stop any existing working state detector (but don't start a new one - start.sh will handle that)
echo -e "${BLUE}Stopping any existing working state detector...${NC}"
tmux send-keys -t $SESSION_NAME:0 "cd /mnt/c/Users/angel/devloop/ui && ./run-working-state-detector.sh stop; echo 'Ready for UI server to start detector'" C-m

# Create a second window for the UI server
tmux new-window -t $SESSION_NAME:1 -n "ui-server"

# Start the UI server in the second window
echo -e "${BLUE}Starting UI server...${NC}"
tmux send-keys -t $SESSION_NAME:1 "cd /mnt/c/Users/angel/devloop/ui && ./start.sh --ui-only" C-m

# Attach to the session
echo -e "${GREEN}Development environment ready! Attaching to tmux session...${NC}"
echo -e "${BLUE}Use Ctrl+b then n/p to switch between windows${NC}"
echo -e "${BLUE}Use Ctrl+b then d to detach (everything keeps running)${NC}"
echo -e "${BLUE}Use 'tmux attach -t ${SESSION_NAME}' to reconnect later${NC}"

tmux attach -t "$SESSION_NAME"