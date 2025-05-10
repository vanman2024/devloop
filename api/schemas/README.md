# API Schemas

This directory contains JSON Schema definitions for API requests, responses, and data models. These schemas provide formal specifications for data validation, documentation, and code generation.

## Schema Organization

The schemas are organized by functional domain:

```
/schemas
├── agents/             # Agent-related schemas
├── system/             # System management schemas
├── content/            # Content management schemas
├── users/              # User management schemas
└── common/             # Shared schema components
```

## Schema Types

### Request Schemas

Define the expected structure of API request bodies:

- Path and query parameter validation
- Request body structure and types
- Required vs. optional fields
- Value constraints and formats

### Response Schemas

Define the structure of API response bodies:

- Success response formats
- Error response structures
- Pagination metadata
- Resource representations

### Model Schemas

Define the structure of data models:

- Property definitions and types
- Required properties
- Relationships between models
- Default values

## Schema Usage

These schemas serve multiple purposes:

1. **Request Validation**
   - Input validation through middleware
   - Error message generation
   - Type conversion

2. **Documentation**
   - OpenAPI/Swagger documentation
   - API reference generation
   - Client library generation

3. **Code Generation**
   - TypeScript type generation
   - Model class generation
   - Mock data generation for testing

4. **Response Validation**
   - Ensuring API responses match expected format
   - Testing validation

## Schema Example

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Agent",
  "description": "Schema for an agent in the system",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the agent",
      "pattern": "^[a-z0-9-]+$"
    },
    "name": {
      "type": "string",
      "description": "Human-readable name for the agent"
    },
    "type": {
      "type": "string",
      "enum": ["parent", "child", "micro"],
      "description": "Type of agent in the hierarchy"
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of agent capabilities"
    },
    "state": {
      "type": "string",
      "enum": ["inactive", "spawning", "executing", "retiring"],
      "description": "Current lifecycle state of the agent"
    }
  },
  "required": ["id", "name", "type"],
  "additionalProperties": false
}
```

## Schema Integration

The schemas in this directory are integrated with:

- Request validation middleware
- API documentation generation
- TypeScript type generation
- OpenAPI specification