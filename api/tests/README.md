# API Tests

This directory contains tests for the Devloop API system, ensuring functionality, reliability, and performance of all API endpoints and components.

## Test Categories

### Unit Tests

Tests for individual components and functions:

- Controller function tests
- Utility function tests
- Middleware function tests
- Model validation tests

### Integration Tests

Tests for API endpoint integration:

- Request/response cycle tests
- Middleware chain tests
- Database integration tests
- Error handling tests

### End-to-End Tests

Complete API workflow tests:

- Multi-step operation tests
- Complex scenario tests
- Cross-endpoint interaction tests
- Authentication flow tests

### Performance Tests

Tests for API performance characteristics:

- Response time benchmarks
- Throughput tests
- Concurrent request handling
- Resource usage monitoring

## Test Structure

Tests are organized by API domain and type:

```
/tests
├── unit/                # Unit tests
│   ├── controllers/     # Controller tests
│   ├── middlewares/     # Middleware tests
│   ├── models/          # Model tests
│   └── utils/           # Utility tests
├── integration/         # Integration tests
│   ├── agents/          # Agent API tests
│   ├── system/          # System API tests
│   ├── content/         # Content API tests
│   └── users/           # User API tests
├── e2e/                 # End-to-end tests
├── performance/         # Performance tests
└── fixtures/            # Test data and fixtures
```

## Testing Tools

The API test suite uses the following tools:

- **Jest**: Test runner and assertion library
- **Supertest**: HTTP request testing
- **Nock**: HTTP request mocking
- **Istanbul**: Code coverage
- **Faker**: Test data generation
- **Sinon**: Mocking and stubbing

## Running Tests

Tests can be run using npm scripts:

```bash
# Run all tests
npm run test:api

# Run specific test categories
npm run test:api:unit
npm run test:api:integration
npm run test:api:e2e
npm run test:api:performance

# Run tests with coverage
npm run test:api:coverage
```

## CI/CD Integration

The test suite is integrated with the CI/CD pipeline, which:

- Runs tests on every pull request
- Blocks merges if tests fail
- Reports test coverage metrics
- Generates test result artifacts

## Example Test

```javascript
// Agent controller test example
const request = require('supertest');
const app = require('../../app');
const { setupTestDatabase, cleanupTestDatabase } = require('../fixtures/db');

describe('Agent API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/v1/agents', () => {
    it('should return a list of agents', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('agents');
      expect(Array.isArray(response.body.agents)).toBeTruthy();
    });
    
    it('should filter agents by type', async () => {
      const response = await request(app)
        .get('/api/v1/agents?type=parent')
        .expect(200);
      
      expect(response.body.agents.every(agent => agent.type === 'parent')).toBeTruthy();
    });
  });
});
```