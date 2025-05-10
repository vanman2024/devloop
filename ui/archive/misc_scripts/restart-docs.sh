#!/bin/bash

# Script to restart the server with Document Manager enhancements

echo "Stopping any running Vite processes..."
lsof -ti:8080,8081 | xargs -r kill -9

echo "Starting dev server with Document Manager enhancements..."
cd "$(dirname "$0")" || exit

# Start the dev server
npm run dev &

echo -e "\n==============================================" 
echo -e "🚀 Document Manager is ready!"
echo -e "==============================================\n"
echo -e "Access the enhanced Document Manager with:"
echo -e "- VS Code style markdown editor/preview"
echo -e "- Tag management system"
echo -e "- Create new document functionality"
echo -e "- Multiple view modes"
echo -e "\nVisit: http://localhost:8080/docs or http://localhost:8081/docs"
echo -e "==============================================\n"