# API Middleware

This directory contains Express.js middleware components that provide cross-cutting concerns for the API system.

## Middleware Components

### Authentication Middleware

Handles JWT authentication and provides user context to API endpoints.

- Token validation
- User identification
- Role-based permissions
- Session management

### Error Handling Middleware

Centralizes error handling across all API endpoints.

- Standardized error responses
- Error logging
- Development vs. production error details
- Status code mapping

### Request Validation Middleware

Validates incoming requests against JSON schemas.

- Schema-based validation
- Request sanitization
- Type conversion
- Required field checking

### Logging Middleware

Logs all API requests and responses.

- Request logging
- Response logging
- Performance timing
- Debug information

### CORS Middleware

Handles Cross-Origin Resource Sharing.

- Origin validation
- Methods configuration
- Headers management
- Credentials handling

### Rate Limiting Middleware

Prevents API abuse through rate limiting.

- Request counting
- Time-based throttling
- User/IP-based limits
- Burst allowance

### Agent Bridge Middleware

Provides connectivity between HTTP requests and the agent messaging system.

- HTTP-to-agent message translation
- Agent message formatting
- Agent response handling
- Agent capability discovery