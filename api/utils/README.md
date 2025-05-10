# API Utilities

This directory contains utility functions and helper classes used throughout the API system. These utilities provide reusable functionality for common tasks and cross-cutting concerns.

## Utility Categories

### HTTP Utilities

Helpers for HTTP request/response handling:

- Response formatting
- Status code management
- Header manipulation
- Cookie handling

### Validation Utilities

Functions for data validation:

- Schema validation helpers
- Type checking
- Format validation
- Constraint checking

### Authentication Utilities

Helpers for authentication and authorization:

- Token generation and validation
- Password hashing
- Role checking
- Permission verification

### Logging Utilities

Utilities for logging and debugging:

- Log formatting
- Log level management
- Context enrichment
- Performance logging

### Agent Communication Utilities

Functions for interacting with the agent system:

- Message formatting
- Message routing
- Response handling
- Error translation

### Error Handling Utilities

Utilities for consistent error handling:

- Error categorization
- Error formatting
- Stack trace cleaning
- Error codes

### String and Data Utilities

General purpose data manipulation:

- String formatting
- Path manipulation
- Data transformation
- Type conversion

## Usage Example

```javascript
// Response utility example
const { createSuccessResponse, createErrorResponse } = require('../utils/response');

// In a controller
try {
  const result = await someAsyncOperation();
  return createSuccessResponse(res, result, 'Operation successful');
} catch (error) {
  return createErrorResponse(res, error, 'Operation failed', 500);
}
```

## Integration with API System

These utilities are used throughout the API system to:

- Ensure consistent behavior across endpoints
- Reduce code duplication
- Centralize cross-cutting concerns
- Simplify controller implementation