# Devloop UI

A modern React-based UI for managing features in the Devloop system.

## Overview

This application provides a user interface for:
- Viewing and filtering features
- Running and managing feature implementation
- Adding enhancements to existing features
- Monitoring system integration status
- System health monitoring and diagnostics

## Technical Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **HTTP Client**: Axios

## Getting Started

### Launch the Application

To start the development environment, use the following script:

```bash
# From this directory
./start-dev.sh
```

This script:
1. Stops any existing working state detector processes
2. Starts the UI server in UI-only mode

The application will be accessible at:
- `http://localhost:3000` (from WSL or Windows browser)

**IMPORTANT NOTE:** This is the only script you should use to start the UI development environment. Other scripts in this directory are either support scripts or legacy scripts.

### Core Scripts

The project uses the following core scripts:

1. **start-dev.sh** - Primary script to start the development environment
   - Simple wrapper around start.sh with the --ui-only flag
   - Stops any existing working state detector before starting

2. **start.sh** - Main startup script with multiple options
   - Called by start-dev.sh with the --ui-only flag
   - Supports additional flags like --no-safeguard, --production
   - Run ./start.sh --help for all options

3. **run-working-state-detector.sh** - Automatic backup system
   - Monitors for changes and creates backups when the UI is in a working state
   - Run ./run-working-state-detector.sh help for all commands

4. **restore-from-backup.sh** - Restore from a working state backup
   - Use this if you need to rollback to a previous working version

### Development

This project uses Vite as its build tool. Key scripts:

- `npm start`: Start development server (alias for `npm run dev`)
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

## Folder Structure

```
react-app/
├── public/                # Public static assets
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   ├── pages/             # Page components
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Application entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── package.json           # Package configuration
├── vite.config.js         # Vite configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## Features

### Feature Manager

Browse, filter, and manage features within the Devloop system with full modal functionality:

- View feature status, descriptions, and metadata
- Filter by status, milestone, or search term
- Run features with multiple options (Standard, Debug, Test Suite)
- View detailed feature information with tabbed interface (Implementation, Dependencies, Tests, Documentation)
- Add enhancements through an interactive form
- Chat about features with the AI assistant (with persistent per-feature chat history)
- View comprehensive activity history for each feature

### Dashboard

View system-wide statistics and activity:
- Feature counts by status
- Recent activity timeline
- Quick actions for common tasks
- Upcoming task list

### Integration Sync

Monitor and manage integrations with external systems:
- GitHub issue synchronization
- JIRA task integration
- Slack notifications
- API gateway status
- Design tool linkage
- Model registry sync