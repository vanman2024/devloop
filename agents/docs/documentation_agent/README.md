# Documentation Agent System

The Documentation Agent System is a comprehensive solution for managing, processing, and organizing documentation using agent-based architecture. The system leverages AI and natural language processing to automate document workflows, detect redundancy, validate content, and maintain high-quality documentation.

## Key Features

- **Document Processing Pipeline**: Process multiple document formats (Markdown, HTML, PDF) through a unified pipeline
- **Knowledge Graph Integration**: Connect documents to a knowledge graph to track relationships and references
- **Vector-based Semantic Search**: Find similar documents and content using vector embeddings
- **Inter-Agent Communication Protocol**: Explicit handoffs and communication between specialized agents
- **Redundancy Detection**: Identify duplicate and overlapping content across documentation
- **Document Validation**: Ensure quality through technical, completeness, consistency, and readability checks
- **ML-based Document Tagging**: Automatically categorize and tag documents

## Architecture

The Documentation Agent system follows the Manager pattern from OpenAI's SDK architecture, with a central hub orchestrating specialized agents:

1. **DocumentationAgentHub**: Central coordinator that manages document operations
2. **Document Processing Pipeline**: Handles document ingestion, parsing, and embedding
3. **Agent Orchestrators**: Domain-specific orchestrators for various document operations
4. **Specialized Agents**: Focused agents for specific tasks (validation, tagging, consolidation)

## Redundancy Management

A key component of the system is its ability to detect and manage redundancy in documentation:

### Redundancy Detection

The redundancy detection system uses multiple methods to identify duplicate and overlapping content:

- **Vector Similarity**: Compare document embeddings to find similar documents
- **TF-IDF Analysis**: Analyze term frequency to identify similar content
- **Section Comparison**: Compare document sections to detect overlapping content
- **Knowledge Graph Analysis**: Use document relationships to identify related content

### Document Consolidation

The system includes a consolidation agent that can merge redundant documents:

- **Document Merging**: Intelligently merge similar documents into a single cohesive document
- **Section Consolidation**: Combine overlapping sections from different documents
- **Cross-Referencing**: Add appropriate references between related documents
- **Human-in-the-Loop**: Request human review for complex consolidation tasks

### Inter-Agent Handoffs

The system uses explicit handoffs between agents to manage workflows:

- **Formalized Handoff Protocol**: Structured message format with clear context transfer
- **Handoff Registry**: Centralized tracking of all handoffs for audit and performance analysis
- **Clear Responsibility Definition**: Each agent defines what it can handle and when to hand off
- **Context Preservation**: Full document state is captured during handoffs

## Running Tests

To test the system, you can use the provided test scripts:

```bash
# Run redundancy detection tests
python -m agents.docs.documentation_agent.tests.test_redundancy_detection

# Run handoff protocol tests
python -m agents.docs.documentation_agent.tests.test_redundancy_workflow

# Run interactive test script
python -m agents.docs.documentation_agent.tests.run_redundancy_test
```

## Integration

To integrate the redundancy detection system into your documentation workflow:

1. Initialize the RedundancyIntegrationService with your existing components
2. Connect it to your document processing pipeline
3. Configure agents for your specific needs
4. Start the service to enable automatic redundancy detection and management

```python
# Example integration
integration_service = RedundancyIntegrationService(
    agent_hub=documentation_agent_hub,
    processing_pipeline=document_processing_pipeline,
    knowledge_graph=knowledge_graph_connector,
    vector_store=vector_store_connector,
    handoff_registry=handoff_registry,
    capability_registry=capability_registry
)

# Initialize and start the service
await integration_service.initialize()
await integration_service.start()
```

## Extending the System

The Documentation Agent system is designed to be extensible:

1. **Add New Document Types**: Implement new document processors for additional formats
2. **Create Specialized Agents**: Develop new agents for specific document operations
3. **Customize Validation Rules**: Add domain-specific validation criteria
4. **Enhance Redundancy Detection**: Implement additional algorithms for detecting overlap

## License

This project is part of the DevLoop system and is provided under the appropriate licensing terms.