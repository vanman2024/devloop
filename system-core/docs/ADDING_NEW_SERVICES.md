# Adding New Services to the Registry

This guide explains how to add new microservices to the DevLoop service registry.

## Overview

The DevLoop platform uses a microservices architecture where each service has a specific responsibility. To maintain organization and visibility, all services should be registered in the central service registry.

## Steps to Add a New Service

### 1. Update the Service Registry

Edit the registry file located at `/mnt/c/Users/angel/devloop/system-core/service-registry.json`:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2023-05-09T12:00:00Z",
  "services": [
    // Existing services...
    
    // Add your new service here:
    {
      "id": "my-new-service",
      "name": "My New Service",
      "description": "Description of what the service does",
      "port": 9000,
      "baseUrl": "http://localhost:9000",
      "repository": "/path/to/service/code",
      "startCommand": "./start-my-service.sh",
      "healthCheck": "/api/health",
      "dependencies": ["service-id-1", "service-id-2"],
      "documentation": "/path/to/documentation.md",
      "maintainers": ["your-team"]
    }
  ]
}
```

### 2. Required Fields

Ensure your service entry includes all of these required fields:

- **id**: Unique identifier for the service (use kebab-case)
- **name**: Human-readable name
- **description**: Brief description of the service's purpose
- **port**: Port the service runs on
- **baseUrl**: URL where the service can be accessed
- **repository**: Path to the service's code repository
- **startCommand**: Command to start the service
- **healthCheck**: URL path to the service's health check endpoint
- **dependencies**: Array of service IDs this service depends on
- **documentation**: Path to the service's documentation
- **maintainers**: Array of teams or individuals responsible

### 3. Service Dependencies

For each dependency listed in your service, ensure:

1. The dependency actually exists in the registry
2. Your service can function properly if all dependencies are available
3. There are no circular dependencies

### 4. Implement a Health Check

Each service should implement a health check endpoint that:

- Returns HTTP 200 OK when the service is healthy
- Returns non-200 status code when the service is unhealthy
- Includes minimal diagnostic information in the response

Example health check response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2023-05-09T12:00:00Z"
}
```

### 5. Document Your Service

Create proper documentation for your service that includes:

- Service purpose and functionality
- API endpoints and their usage
- Configuration options
- Startup and shutdown procedures
- Troubleshooting guide

### 6. Generate Updated Documentation

After adding your service to the registry:

```bash
# Generate updated service documentation
node /mnt/c/Users/angel/devloop/system-core/scripts/generate-service-docs.js
```

### 7. Test the Service Health Check

Ensure your service appears in the health check:

```bash
# Run the health check script
/mnt/c/Users/angel/devloop/system-core/scripts/check-service-health.sh
```

## Best Practices

- **Isolation**: Services should be independent and handle their own concerns
- **Clear Boundaries**: Document your service's interfaces and responsibilities
- **Health Checks**: Implement meaningful health checks that verify all dependencies
- **Startup Order**: Services should be resilient to dependencies starting up later
- **Documentation**: Keep your service's documentation up to date

## Example: Adding a Message Queue Service

Here's an example of adding a RabbitMQ service to the registry:

```json
{
  "id": "message-queue",
  "name": "Message Queue Service",
  "description": "RabbitMQ service for handling asynchronous messaging",
  "port": 5672,
  "baseUrl": "http://localhost:5672",
  "repository": "/mnt/c/Users/angel/devloop/message-queue",
  "startCommand": "./start-rabbitmq.sh",
  "healthCheck": "/api/queue/health",
  "dependencies": [],
  "documentation": "/mnt/c/Users/angel/devloop/message-queue/README.md",
  "maintainers": ["infrastructure-team"]
}
```