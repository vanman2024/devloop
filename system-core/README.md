# DevLoop System Core

This directory contains core system components and configuration for the DevLoop platform.

## Service Registry

The DevLoop platform follows a microservices architecture with multiple specialized servers for different functionality. The service registry provides a centralized place to document and manage all services.

### Key Files

- **service-registry.json**: Central registry of all microservices, their endpoints, and dependencies
- **docs/SERVICES.md**: Generated documentation of all services and their relationships

### Managing Services

To view all services and their dependencies:

```bash
# View the generated service documentation
cat system-core/docs/SERVICES.md
```

To check the health of all services:

```bash
# Run the health check script
./system-core/scripts/check-service-health.sh
```

To update service documentation after changes to the registry:

```bash
# Generate updated documentation
node system-core/scripts/generate-service-docs.js
```

## Document Generation Server

The Document Generation Server provides AI-powered document generation and management capabilities. It's a separate microservice for specialized document processing.

### Starting the Document Server

```bash
# Start the document server
cd ui/server
./start-document-server.sh
```

### Stopping the Document Server

```bash
# Stop the document server
cd ui/server
./stop-document-server.sh
```

### Accessing the Document Server

- Base URL: http://localhost:3002
- Health Check: http://localhost:3002/api/documents/health
- Documentation: [DOCUMENT_MANAGER_README.md](/ui/docs/DOCUMENT_MANAGER_README.md)

## Knowledge Graph API

The Knowledge Graph API provides storage and retrieval of connected data in a graph structure. It's the foundation for the system's data model.

### Starting the Knowledge Graph

```bash
# Start the knowledge graph server
cd backups/system-core-backup/system-core/memory/manager
./launch-kg-test-server.sh
```

### Accessing the Knowledge Graph API

- Base URL: http://localhost:8000
- Documentation: [KNOWLEDGE_GRAPH_API.md](/backups/system-core-backup/system-core/memory/manager/KNOWLEDGE_GRAPH_API.md)

## System Core Components

The system architecture follows these principles:

1. **Microservice Independence**: Each service has a clear, bounded responsibility
2. **Service Registry**: Central documentation of all services and their relationships
3. **Health Checks**: Standardized health checks across all services
4. **Dependency Management**: Clear documentation of service dependencies

For information on adding new services to the registry, see [Adding New Services](/system-core/docs/ADDING_NEW_SERVICES.md).