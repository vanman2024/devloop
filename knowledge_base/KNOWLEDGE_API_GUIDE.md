# Knowledge Base API Guide

This guide provides examples and usage patterns for interacting with the knowledge base through the API. The knowledge base is designed to be easily used by Claude and other AI systems for accessing, querying, and managing documents.

## Table of Contents

1. [Setup](#setup)
2. [Adding Documents](#adding-documents)
3. [Retrieving Documents](#retrieving-documents)
4. [Querying Documents](#querying-documents)
5. [Searching Across Documents](#searching-across-documents)
6. [Document Management](#document-management)
7. [Advanced Features](#advanced-features)
8. [Integration with Agents](#integration-with-agents)

## Setup

To use the Knowledge API, you simply need to import it:

```python
from agents.utils.knowledge_api import knowledge_api
```

The API is implemented as a singleton, so you always get the same instance with the same state.

## Adding Documents

### Add a PDF Document

```python
# Add a PDF document with tags
result = knowledge_api.add_document(
    file_path="/path/to/document.pdf",
    tags=["technical", "design", "agentic"]
)

# Get the document ID from the result
doc_id = result.get("doc_id")
```

### Add a Markdown or Text Document

```python
# Add a markdown document
result = knowledge_api.add_document(
    file_path="/path/to/design.md",
    tags=["architecture", "documentation"]
)
```

## Retrieving Documents

### Get Document Metadata and Content

```python
# Get a document by ID
document = knowledge_api.get_document(doc_id)

# Access metadata and content
metadata = document.get("metadata")
content = document.get("content")

print(f"Title: {metadata.get('metadata', {}).get('title')}")
print(f"Content length: {len(content)}")
```

### List All Documents

```python
# List all documents
documents = knowledge_api.list_documents()

# List documents with specific tags
technical_docs = knowledge_api.list_documents(tags=["technical"])

# Print document titles
for doc in documents.get("documents", []):
    print(f"{doc.get('title')} - {doc.get('filename')}")
```

## Querying Documents

### Query a Specific Document

```python
# Ask a question about a specific document
answer = knowledge_api.query_document(
    doc_id="doc-a1b2c3d4e5f6",
    query="What are the key components of the agentic architecture?"
)

# Print the answer
print(answer.get("answer"))
```

### Get Document Summary

```python
# Get a comprehensive summary of a document
summary = knowledge_api.get_document_summary(doc_id)

# Print the summary
print(summary.get("summary"))
```

## Searching Across Documents

### Search the Knowledge Base

```python
# Search for a term across all documents
results = knowledge_api.search_documents(
    query="orchestration patterns",
    limit=10
)

# Print search results
for result in results.get("results", []):
    print(f"Document: {result.get('title')}")
    print(f"Snippet: {result.get('snippet')}\n")
```

### Search with Tag Filtering

```python
# Search only within documents with specific tags
results = knowledge_api.search_documents(
    query="agent communication",
    tags=["technical", "architecture"],
    limit=5
)
```

## Document Management

### Update Document Tags

```python
# Update tags for a document
result = knowledge_api.update_document_tags(
    doc_id="doc-a1b2c3d4e5f6",
    tags=["architecture", "design", "updated"]
)
```

### Delete a Document

```python
# Delete a document from the knowledge base
result = knowledge_api.delete_document(doc_id)
```

### Get All Tags

```python
# Get all tags used in the knowledge base
tags = knowledge_api.get_all_tags()

# Print tags and their usage counts
for tag_info in tags.get("tags", []):
    print(f"{tag_info.get('tag')}: {tag_info.get('count')} documents")
```

## Advanced Features

### Extract Tables from PDF

```python
# Extract tables from a PDF document
tables = knowledge_api.extract_tables(doc_id)

# Print extracted tables (in markdown format)
print(tables.get("tables"))
```

### Extract Key Points

```python
# Extract key points or findings from a document
key_points = knowledge_api.extract_key_points(doc_id)

# Print key points
print(key_points.get("key_points"))
```

### Clear Cache

```python
# Clear the cache to ensure fresh results
knowledge_api.clear_cache()
```

## Integration with Agents

### Using the Knowledge API in an Agent

This example shows how to integrate the knowledge API with an agent system:

```python
from agents.utils.knowledge_api import knowledge_api
from agents.utils.orchestration_service import OrchestrationService

class KnowledgeEnhancedAgent:
    def __init__(self, agent_id):
        self.agent_id = agent_id
        self.orchestration = OrchestrationService()
        
    async def process_query(self, query, context=None):
        # First check if we have relevant documents
        search_results = knowledge_api.search_documents(query, limit=3)
        
        # If we found relevant documents, include them in the context
        if search_results.get("count", 0) > 0:
            # Get the first relevant document
            doc_id = search_results["results"][0]["doc_id"]
            
            # Query the document for specific information
            doc_response = knowledge_api.query_document(doc_id, query)
            
            # Add document information to context
            enhanced_context = context or {}
            enhanced_context["knowledge_base"] = {
                "document_title": search_results["results"][0]["title"],
                "document_response": doc_response.get("answer", ""),
                "source": f"Document: {doc_id}"
            }
            
            # Process with enhanced context
            return await self.orchestration.process_agent_query(
                agent_id=self.agent_id,
                query=query,
                context=enhanced_context
            )
        else:
            # No relevant documents found, process normally
            return await self.orchestration.process_agent_query(
                agent_id=self.agent_id,
                query=query,
                context=context
            )
```

### Multi-Agent Knowledge Orchestration

This example demonstrates how multiple agents can collaborate using the knowledge base:

```python
from agents.utils.knowledge_api import knowledge_api
from agents.utils.orchestration_service import OrchestrationService

async def execute_knowledge_workflow(query, user_id):
    orchestration = OrchestrationService()
    
    # Create a new conversation
    conversation = orchestration.create_conversation(
        user_id=user_id,
        initial_context={
            "query": query,
            "knowledge_required": True
        }
    )
    
    # First, let the research agent find relevant documents
    research_task = await orchestration.create_task(
        agent_id="research_agent",
        description=f"Find relevant documents for: {query}",
        input_data={
            "query": query
        }
    )
    
    research_result = await orchestration.execute_task(research_task["task_id"])
    
    # If documents were found, have the expert agent analyze them
    if research_result.get("document_ids"):
        document_analyses = []
        
        # Process each document
        for doc_id in research_result["document_ids"]:
            # Get document summary
            summary = knowledge_api.get_document_summary(doc_id)
            
            # Query document for specific information
            doc_response = knowledge_api.query_document(doc_id, query)
            
            document_analyses.append({
                "doc_id": doc_id,
                "summary": summary.get("summary", ""),
                "specific_answer": doc_response.get("answer", "")
            })
        
        # Have the expert agent synthesize the information
        synthesis_task = await orchestration.create_task(
            agent_id="expert_agent",
            description=f"Synthesize information from {len(document_analyses)} documents to answer: {query}",
            input_data={
                "query": query,
                "document_analyses": document_analyses
            }
        )
        
        synthesis_result = await orchestration.execute_task(synthesis_task["task_id"])
        
        # Return the synthesized answer
        return {
            "conversation_id": conversation["conversation_id"],
            "answer": synthesis_result.get("synthesis", "No answer could be synthesized"),
            "source_documents": [doc["doc_id"] for doc in document_analyses],
            "confidence": synthesis_result.get("confidence", 0.0)
        }
    else:
        # No relevant documents found, use the general knowledge agent
        general_task = await orchestration.create_task(
            agent_id="general_knowledge_agent",
            description=f"Answer based on general knowledge: {query}",
            input_data={
                "query": query
            }
        )
        
        general_result = await orchestration.execute_task(general_task["task_id"])
        
        # Return the general answer
        return {
            "conversation_id": conversation["conversation_id"],
            "answer": general_result.get("answer", "No answer could be provided"),
            "source": "general_knowledge",
            "confidence": general_result.get("confidence", 0.0)
        }
```

## Claude Usage Examples

Here are some examples of how Claude can directly use the knowledge API in code:

### Example 1: Basic Document Search and Query

```python
def answer_question_with_knowledge_base(question):
    # Search for relevant documents
    search_results = knowledge_api.search_documents(query=question, limit=3)
    
    if search_results.get("count", 0) > 0:
        # Found relevant documents
        most_relevant_doc = search_results["results"][0]
        doc_id = most_relevant_doc["doc_id"]
        
        # Query the specific document for an answer
        answer = knowledge_api.query_document(doc_id=doc_id, query=question)
        
        return {
            "answer": answer.get("answer", "No specific answer found"),
            "source": most_relevant_doc.get("title", f"Document {doc_id}")
        }
    else:
        # No relevant documents found
        return {
            "answer": "I couldn't find any relevant information in the knowledge base.",
            "source": None
        }
```

### Example 2: Extracting Tables and Key Points

```python
def analyze_technical_document(doc_id):
    # Get document metadata
    document = knowledge_api.get_document(doc_id)
    
    if "error" in document:
        return {"error": document["error"]}
    
    # Get document summary
    summary = knowledge_api.get_document_summary(doc_id)
    
    # Extract tables if it's a PDF
    tables = knowledge_api.extract_tables(doc_id)
    
    # Extract key points
    key_points = knowledge_api.extract_key_points(doc_id)
    
    # Compile the analysis
    analysis = {
        "title": document["metadata"].get("metadata", {}).get("title", "Unknown"),
        "summary": summary.get("summary", "No summary available"),
        "tables": tables.get("tables", "No tables found"),
        "key_points": key_points.get("key_points", "No key points identified"),
        "file_type": document["metadata"].get("file_type", "unknown")
    }
    
    return analysis
```

This API is designed to be simple and straightforward for Claude to use when executing orchestration tasks, allowing it to effectively leverage the knowledge base for information retrieval and analysis.