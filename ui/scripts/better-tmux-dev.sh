#!/bin/bash
# Script to set up a more user-friendly tmux development environment
# with improved logging and output display

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up improved tmux development environment...${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Please install it with: sudo apt install tmux"
    exit 1
fi

# Create log directory if it doesn't exist
mkdir -p /mnt/c/Users/angel/devloop/ui/logs

# Session name
SESSION_NAME="devloop-improved"

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null

# Create a new tmux session
echo -e "${BLUE}Creating new tmux session: ${SESSION_NAME}${NC}"
tmux new-session -d -s $SESSION_NAME

# Configure the session for better scrollback and history
tmux set-option -g history-limit 50000
tmux set-option -g mouse on

# Rename and configure the first window for detector with logging
tmux rename-window -t $SESSION_NAME:0 "detector"
tmux send-keys -t $SESSION_NAME:0 "cd /mnt/c/Users/angel/devloop/ui" C-m
tmux send-keys -t $SESSION_NAME:0 "echo 'Starting working state detector with logging to logs/detector.log'" C-m
tmux send-keys -t $SESSION_NAME:0 "./run-working-state-detector.sh | tee -a logs/detector.log" C-m

# Create a second window for the UI server with logging
tmux new-window -t $SESSION_NAME:1 -n "ui-server"
tmux send-keys -t $SESSION_NAME:1 "cd /mnt/c/Users/angel/devloop/ui" C-m
tmux send-keys -t $SESSION_NAME:1 "echo 'Starting UI server with logging to logs/ui-server.log'" C-m
tmux send-keys -t $SESSION_NAME:1 "./start.sh --ui-only | tee -a logs/ui-server.log" C-m

# Create a third window for HMR logs only
tmux new-window -t $SESSION_NAME:2 -n "hmr-logs"
tmux send-keys -t $SESSION_NAME:2 "cd /mnt/c/Users/angel/devloop/ui" C-m
tmux send-keys -t $SESSION_NAME:2 "echo 'Watching HMR update logs - this will accumulate HMR messages'" C-m
tmux send-keys -t $SESSION_NAME:2 "tail -f logs/ui-server.log | grep -A 1 --color=always '\[vite\] (client) hmr update'" C-m

# Create a fourth window for command execution
tmux new-window -t $SESSION_NAME:3 -n "commands"
tmux send-keys -t $SESSION_NAME:3 "cd /mnt/c/Users/angel/devloop/ui" C-m
tmux send-keys -t $SESSION_NAME:3 "echo 'Command window - use this for running ad-hoc commands'" C-m

# Select the HMR logs window by default
tmux select-window -t $SESSION_NAME:2

# Set up a simple status bar with window information
tmux set-option -g status-style "bg=black,fg=white"
tmux set-option -g window-status-current-style "bg=blue,fg=white,bold"
tmux set-option -g status-left "[#S] "
tmux set-option -g status-right "%H:%M %d-%b-%y"

# Display helpful information
echo -e "${GREEN}Development environment ready! Attaching to tmux session...${NC}"
echo -e "${BLUE}Windows:${NC}"
echo -e "  ${BLUE}0:detector${NC} - Working state detector"
echo -e "  ${BLUE}1:ui-server${NC} - Main UI server"
echo -e "  ${BLUE}2:hmr-logs${NC} - HMR update logs (accumulated)"
echo -e "  ${BLUE}3:commands${NC} - For running commands"
echo -e ""
echo -e "${BLUE}Keyboard shortcuts:${NC}"
echo -e "  ${BLUE}Ctrl+b then 0-3${NC} - Switch to window 0-3"
echo -e "  ${BLUE}Ctrl+b then n/p${NC} - Switch to next/previous window"
echo -e "  ${BLUE}Ctrl+b then d${NC} - Detach (everything keeps running)"
echo -e "  ${BLUE}Ctrl+b then [${NC} - Enter scroll mode (use arrow keys, q to exit)"
echo -e "  ${BLUE}Ctrl+b then c${NC} - Create a new window"
echo -e ""
echo -e "${BLUE}To reconnect later:${NC} tmux attach -t ${SESSION_NAME}"

# Attach to the session
tmux attach -t $SESSION_NAME