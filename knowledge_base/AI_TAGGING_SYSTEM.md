# AI-Driven Document Tagging System

This document explains the AI-driven document tagging system and how it integrates with the knowledge base to automatically organize and categorize content.

## Overview

The AI-driven tagging system uses Claude's advanced document understanding capabilities to automatically analyze documents, extract key topics, and generate relevant tags and categories. This automation:

1. Reduces the manual effort required to organize documents
2. Creates consistent tagging across the knowledge base
3. Identifies relationships between documents based on shared topics
4. Enhances searchability and discoverability of relevant information
5. Integrates with the DocumentManager UI for visualization

## How It Works

### Technical Architecture

The AI tagging system consists of these key components:

1. **PDFProcessor with analyze_and_tag_document()**: The core engine that analyzes document content and extracts structured metadata including tags, categories, and topics.

2. **KnowledgeAPI with auto_tag parameter**: Integration point in the knowledge API that automatically applies AI tagging when adding documents.

3. **Claude API Integration**: Uses Claude's advanced document understanding to extract meaningful tags and categories from unstructured text.

4. **Caching Layer**: Prevents redundant processing by caching analysis results for 30 days.

5. **DocumentManager UI Integration**: Allows visualization and management of tags through the existing UI interface.

### Process Flow

1. Document is added to the knowledge base with `auto_tag=True` (default)
2. The PDFProcessor analyzes the document content using Claude API
3. The analysis generates:
   - Suggested tags (5-10 topic indicators)
   - Categories (2-3 broader groupings)
   - Document type/purpose classification
   - Technical level assessment
   - Reading time estimation
   - Key entities and concepts
4. Tags are stored with the document metadata
5. AI-generated tags are combined with any manually provided tags
6. The document is automatically categorized in the knowledge base

### Example Analysis Output

```json
{
  "primary_topics": ["knowledge graph", "ai agents", "document processing"],
  "technical_domains": ["ai", "natural language processing", "information retrieval"],
  "document_type": "architecture",
  "document_purpose": "reference",
  "key_entities": ["Claude API", "PDF processor", "Knowledge Graph", "Task Agent"],
  "suggested_tags": ["knowledge-base", "document-analysis", "ai-tagging", "claude-integration"],
  "suggested_categories": ["Architecture", "AI Integration"],
  "suggested_components": ["knowledge-api", "pdf-processor", "orchestration-service"],
  "technical_level": "intermediate",
  "estimated_reading_time": 15
}
```

## Integration with Knowledge Graph

The tagging system integrates with the existing knowledge graph structure:

1. **Knowledge Nodes**: Documents become nodes in the knowledge graph
2. **Tag Relationships**: Documents with shared tags are implicitly related
3. **Category Classification**: Categories provide a hierarchical organization structure
4. **Entity Recognition**: Key entities can be linked to relevant code components
5. **Technical Domain Mapping**: Domains help map documents to system areas

## Integration with Orchestration Service

The knowledge API is integrated with the orchestration service:

1. When a task is created, the orchestration service can use the knowledge base to find relevant documentation
2. Document tags and categories help filter for the most relevant information
3. The enhance_task_context() method adds knowledge context to tasks
4. Agents have access to relevant documentation during task execution

## Usage Examples

### Adding a Document with AI Tagging

```python
from agents.utils.knowledge_api import knowledge_api

# Add a document with AI tagging (default)
result = knowledge_api.add_document('/path/to/document.pdf')

# Add document with manual tags + AI tagging
result = knowledge_api.add_document(
    file_path='/path/to/document.pdf',
    tags=['manual-tag1', 'manual-tag2'],
    auto_tag=True
)

# Disable AI tagging
result = knowledge_api.add_document(
    file_path='/path/to/document.pdf',
    auto_tag=False
)
```

### Using AI Tagging Example Script

The repository includes an example script for testing the AI tagging system:

```bash
# Add a document with AI tagging
python agents/examples/ai_tagging_example.py /path/to/document.pdf

# Add document with manual tags + AI tagging
python agents/examples/ai_tagging_example.py /path/to/document.pdf --tags architecture reference
```

## DocumentManager UI Integration

The existing DocumentManager UI (`/ui/src/pages/DocumentManager.jsx`) already supports tag visualization and filtering. AI-generated tags are seamlessly integrated into this interface, allowing users to:

1. View AI-generated tags alongside manual tags
2. Filter documents by tag
3. Search across all document metadata
4. Edit and manage tags through the TagManager component

## Technical Details

### Claude Prompt Design

The tagging system uses a carefully designed prompt that asks Claude to extract specific metadata fields:

```
Please analyze the document and generate comprehensive metadata for categorization and organization.
Return ONLY a JSON object with the following fields:

1. "primary_topics": Array of 3-7 main topics covered in the document
2. "technical_domains": Array of technical domains (e.g., "frontend", "database", "security")
3. "document_type": String indicating document type (e.g., "tutorial", "reference", "architecture", "guide")
...
```

The prompt is optimized for technical document understanding and consistent tagging.

### Caching Strategy

Analysis results are cached for efficiency:

- Cache key is based on document fingerprint
- TTL (Time-To-Live) of 30 days for tagging results
- Cache is stored in the knowledge_cache directory
- Cache can be cleared with `knowledge_api.clear_cache()`

### Supported File Types

The system currently supports:
- PDF files (full document analysis)
- Markdown (.md) files
- Text (.txt) files

### Error Handling

The system is designed for robustness:
- Graceful degradation if Claude API is unavailable
- Fallback to manual tags if auto-tagging fails
- JSON parsing protection with regex fallback
- Duplicate detection to prevent re-processing

## Future Enhancements

Planned improvements to the tagging system:

1. **Taxonomy Management**: Creating a managed taxonomy for more consistent tagging
2. **Tag Suggestions UI**: Showing AI-suggested tags in the document creation interface
3. **Tag Confidence Scores**: Adding confidence levels to AI-generated tags
4. **Related Document Recommendations**: Using tags to suggest related documents
5. **Tag Clustering**: Identifying tag groups and hierarchies
6. **Incremental Learning**: Improving tag suggestions based on user feedback
7. **Multi-Modal Analysis**: Enhancing tagging with image and diagram understanding