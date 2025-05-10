# Devloop SDK-First Architecture (Enhanced)

This directory contains the enhanced SDK-first architecture components for Devloop, building directly on top of the OpenAI Assistants SDK while providing advanced capabilities from our preserved scripts.

## Enhanced Core Components

The enhanced architecture includes all core components from the original SDK-first architecture, with these significant improvements:

- **AdaptivePromptManager**: Now with feedback-based optimization and enhanced context management
- **ContextManager**: Extended with persistent sessions, serialization, and cross-session memory
- **IntentRecognizer**: Advanced natural language understanding with parameter extraction
- **FeedbackOptimizationSystem**: Learning from prompt effectiveness to improve results
- **SystemIntegration**: Comprehensive integration with the broader Devloop platform

## Key Features

### Template Optimization

Our feedback-based prompt optimization system automatically improves templates based on their performance:

```python
from agents.sdk.utils.prompt_manager import AdaptivePromptManager
from agents.sdk.utils.feedback_optimization import FeedbackRecord

# Initialize manager with optimization enabled
manager = AdaptivePromptManager(
    config_path="agents/sdk/config/prompt_manager_config.json"
)

# Use optimized rendering
prompt = manager.render_template_optimized(
    "feature_creation", 
    {"feature_name": "Authentication"}
)

# Record feedback to improve future prompts
manager.record_prompt_feedback(
    user_feedback=4,  # 1-5 rating
    auto_score=0.85,  # Automated evaluation (0-1)
    response_length=1200
)
```

### Enhanced Context Management

The enhanced context manager provides persistent sessions and cross-request context:

```python
from agents.sdk.utils.enhanced_context_manager import EnhancedContextManager

# Create context manager
context_manager = EnhancedContextManager(
    use_redis=True,
    use_mongodb=True
)

# Create a context
context_id = context_manager.create_context(
    metadata={"user": "123", "project": "auth-system"}
)

# Create a session within the context
session_id = context_manager.create_session(context_id)

# Add session items
context_manager.add_session_item(
    session_id, 
    {"type": "prompt", "content": "Authentication system design"}
)

# Export for persistence
exported = context_manager.export_context(context_id)
```

### Natural Language Intent Recognition

Recognize intents from natural language with parameter extraction:

```python
from agents.sdk.utils.intent_recognition import IntentRecognizer, IntentProcessor

# Create recognizer and processor
recognizer = IntentRecognizer(use_ai_recognition=True)
processor = IntentProcessor(recognizer)

# Register handlers for intents
processor.register_handler("create_feature", create_feature_handler)
processor.register_handler("run_feature", run_feature_handler)

# Process natural language
result = processor.process_text("Create a feature for user authentication")
# Returns intent, parameters, and execution result
```

### System Integration

The system integration module connects all SDK components with the broader Devloop platform:

```python
from agents.sdk.orchestration.system_integration import SDKSystemIntegration

# Create and initialize the integration
integration = SDKSystemIntegration()
await integration.initialize()

# Process natural language with all components
result = await integration.process_natural_language(
    "Create an authentication feature with OAuth support"
)

# Connect to feature registry
await integration.connect_to_feature_registry()
```

## Integration Points

The enhanced architecture integrates with these Devloop components:

- **Memory Knowledge Graph**: Context retrieval from the global knowledge base
- **Redis Caching**: Performance optimization for templates and context
- **MongoDB Persistence**: Long-term storage for context, sessions, and feedback
- **Vector Database**: Semantic search for relevant context
- **Activity Logging**: Transparent tracking of all operations
- **Feature Registry**: Registration of SDK components as system features

## Configuration

Each enhanced component includes a dedicated config section in the main configuration file:

```json
{
  "feedback_optimization": {
    "enabled": true,
    "data_dir": "/path/to/feedback/data",
    "strategy": "ai",
    "use_redis": true,
    "use_mongodb": true
  },
  "enhanced_context": {
    "enabled": true,
    "max_history": 20,
    "use_redis": true,
    "use_mongodb": true
  },
  "intent_recognition": {
    "enabled": true,
    "model_path": "/path/to/custom/model.json",
    "use_ai": true
  }
}
```

## Getting Started

To use the enhanced architecture:

1. Install the required dependencies:
   ```
   pip install redis pymongo langchain tiktoken openai anthropic
   ```

2. Update your configuration to enable the enhanced features:
   ```
   cp agents/sdk/config/prompt_manager_config.json agents/sdk/config/enhanced_config.json
   # Edit enhanced_config.json to enable new features
   ```

3. Initialize the SDK with the enhanced configuration:
   ```python
   from agents.sdk.utils.prompt_manager import AdaptivePromptManager
   
   manager = AdaptivePromptManager(
       config_path="agents/sdk/config/enhanced_config.json"
   )
   ```

## CLI Usage

Each enhanced component includes a command-line interface for testing:

```bash
# Test feedback optimization
python agents/sdk/utils/feedback_optimization.py --template "Generate a plan for {feature}." --variables "feature" --count 3

# Test enhanced context
python agents/sdk/utils/enhanced_context_manager.py --create --list

# Test intent recognition
python agents/sdk/utils/intent_recognition.py --text "Create a feature for authentication"

# Test system integration
python agents/sdk/orchestration/system_integration.py --action nl --text "Create an authentication feature"
```

## Architecture

The enhanced architecture builds on the original SDK-first design, adding these key components:

```
agents/sdk/
├── adapters/
│   ├── ai_service_adapter.py
│   ├── knowledge_base_adapter.py
│   └── ui_orchestration_adapter.py
├── config/
│   └── prompt_manager_config.json
├── core/
│   └── agent.py
├── orchestration/
│   └── system_integration.py
├── tests/
│   ├── test_prompt_manager.py
│   ├── test_knowledge_base_adapter.py
│   └── test_integrations.py
└── utils/
    ├── activity_logger.py
    ├── enhanced_context_manager.py
    ├── feedback_optimization.py
    ├── integrations.py
    ├── intent_recognition.py
    └── prompt_manager.py
```

## Testing

A comprehensive test suite ensures the reliability of all enhanced components:

```bash
# Run all tests
python -m unittest discover -s agents/sdk/tests

# Run specific test file
python -m unittest agents/sdk/tests/test_prompt_manager.py
```