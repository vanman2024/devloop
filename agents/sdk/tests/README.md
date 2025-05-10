# Devloop SDK Unit Tests

This directory contains unit tests for the Devloop SDK components. The tests ensure the reliability and functionality of the SDK's core components including prompt management, knowledge base adapters, and integration systems.

## Test Structure

- **test_prompt_manager.py**: Tests for the `AdaptivePromptManager` and related components
- **test_knowledge_base_adapter.py**: Tests for the various knowledge base adapters
- **test_integrations.py**: Tests for the integration components with external systems

## Running Tests

You can run the tests using the standard Python unittest module:

```bash
# Run all tests
python -m unittest discover -s agents/sdk/tests

# Run a specific test file
python -m unittest agents/sdk/tests/test_prompt_manager.py

# Run a specific test case
python -m unittest agents/sdk/tests.test_prompt_manager.TestAdaptivePromptManager
```

## Test Coverage

These tests cover:

- Template management and rendering
- Context handling and extraction
- Knowledge graph integration
- Vector database operations
- Caching mechanisms
- Provider adapters for different LLM systems
- Dynamic module loading
- Integration with external systems like Redis and MongoDB

## Mock Components

The tests use mock objects to simulate external systems such as:

- Redis cache
- MongoDB database
- Knowledge graph
- Vector database
- OpenAI and Claude APIs

This allows testing the functionality without requiring actual connections to these systems.

## Adding New Tests

When adding new features to the SDK, follow these guidelines for creating tests:

1. Create test methods in the appropriate test class
2. Use descriptive test method names that explain what is being tested
3. Use mocks and patches for external dependencies
4. Test both success and failure paths
5. Test edge cases and boundary conditions

## Testing Strategy

The unit tests focus on isolated component testing rather than integration testing. The key approach is:

1. Mock external dependencies
2. Test each component's interface
3. Verify correct behavior with various inputs
4. Test error handling and edge cases
5. Use parameterized tests for testing multiple variations

Each test is designed to be independent and not rely on the state from other tests.