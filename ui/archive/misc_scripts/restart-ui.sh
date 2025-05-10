#!/bin/bash

# Restart UI Server Script

echo "Stopping any running Vite processes..."
lsof -ti:8080,8081 | xargs -r kill -9

echo "Starting dev server..."
npm run dev &

echo "Dev server started! Access the Document Manager at /docs"