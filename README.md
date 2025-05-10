# Devloop

Devloop is a comprehensive development platform that integrates agent architecture, knowledge graph capabilities, and UI tools to enhance the development workflow.

## Project Structure

The project consists of several key components:

- **Agents**: Agentic architecture components that power automated development tasks
- **API**: Backend services for knowledge graph and feature management
- **UI**: React-based user interface for interacting with the platform

## Key Features

- **Feature Management**: Track and manage feature development
- **Knowledge Graph Integration**: Store and query relationships between components
- **Agent-based Automation**: Automate repetitive development tasks
- **Document Management**: Generate and manage technical documentation
- **System Health Monitoring**: Monitor and maintain system components

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (3.8+)
- MongoDB or other supported database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/vanman2024/devloop.git
   cd devloop
   ```

2. Install dependencies:
   ```
   # Install UI dependencies
   cd ui
   npm install
   
   # Install API dependencies
   cd ../api
   npm install
   
   # Install Python dependencies
   cd ..
   pip install -r requirements.txt
   ```

3. Start the development servers:
   ```
   # Start UI development server
   cd ui
   ./start-dev.sh
   
   # Start API server
   cd ../api
   ./launch-api-server.sh
   ```

## Architecture

Devloop follows a hexagonal architecture pattern with adapters for different AI providers (OpenAI, Claude, Vertex AI) and a focus on RAG (Retrieval Augmented Generation) for knowledge management.

## Documentation

Additional documentation can be found in the `/agents/docs/` directory, including:

- Agentic Architecture
- Knowledge Graph Design
- SDK Implementation Guides
- API Documentation