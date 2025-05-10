# Knowledge Graph Documentation Integration

This document outlines the integration between the knowledge graph and documentation system, leveraging existing components with OpenAI SDK and Google A2A principles.

## Core Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Document Management System                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Knowledge Graph                              │
│                                                                     │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │ Document    │       │  Feature    │       │  Roadmap    │        │
│  │   Nodes     │◄─────▶│   Nodes     │◄─────▶│   Nodes     │        │
│  └─────────────┘       └─────────────┘       └─────────────┘        │
│         ▲                     ▲                    ▲                 │
│         │                     │                    │                 │
│         ▼                     ▼                    ▼                 │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐        │
│  │  Concept    │       │    Tag      │       │  Domain     │        │
│  │   Nodes     │◄─────▶│   Nodes     │◄─────▶│   Nodes     │        │
│  └─────────────┘       └─────────────┘       └─────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Approach

The knowledge graph integration follows a hybrid approach combining aspects of OpenAI's SDK architecture (Manager Pattern and Decentralized Pattern) with Google's A2A communication principles. This approach enables a more flexible, scalable system that can dynamically respond to document changes.

### Neo4j Schema Extensions

```cypher
// Document node with bidirectional relationships
CREATE (d:Document {
  id: "doc-123",
  title: "System Architecture Overview",
  content_hash: "sha256:e3b0c44...",
  created_at: timestamp(),
  updated_at: timestamp(),
  format: "markdown"
})

// Feature node with relationship to document
CREATE (f:Feature {
  id: "feature-456",
  name: "Automatic Document Classification",
  status: "in_progress",
  priority: "high"
})

// Create bidirectional relationship
CREATE (d)-[:DOCUMENTS {confidence: 0.92, created_at: timestamp()}]->(f)
CREATE (f)-[:DOCUMENTED_BY {added_by: "doc_analysis_agent", created_at: timestamp()}]->(d)

// Connect document to concepts
CREATE (c:Concept {id: "concept-789", name: "Document Classification"})
CREATE (d)-[:CONTAINS_CONCEPT {relevance: 0.85}]->(c)
CREATE (c)-[:APPEARS_IN {count: 12}]->(d)
```

### Document-Feature Connection Protocol

The integration between documents and features adheres to OpenAI's Manager Pattern where a central DocumentFeatureAgent coordinates specialized agents:

```python
class DocumentFeatureAgent:
    def __init__(self, knowledge_graph):
        self.kg = knowledge_graph
        
        # Create specialized agents as tools
        self.feature_extraction_agent = Agent(
            name="FeatureExtractionAgent",
            instructions="Extract feature references from documents",
            tools=[self.search_feature_database]
        )
        
        self.document_tagging_agent = Agent(
            name="DocumentTaggingAgent",
            instructions="Tag documents with relevant features",
            tools=[self.add_document_tags]
        )
        
        # Configure the manager agent
        self.manager = Agent(
            name="DocumentFeatureManager",
            instructions=(
                "You manage the connection between documents and features. "
                "When a document is updated, extract features and create connections."
            ),
            tools=[
                self.feature_extraction_agent.as_tool(
                    tool_name="extract_features",
                    tool_description="Extract feature references from a document"
                ),
                self.document_tagging_agent.as_tool(
                    tool_name="tag_document",
                    tool_description="Tag a document with feature references"
                ),
                self.create_feature_links
            ]
        )
    
    async def process_document(self, document_id):
        # Get document content
        document = await self.kg.get_document_node(document_id)
        
        # Run the manager agent to process document
        result = await Runner.run(
            self.manager,
            {"document_id": document_id, "content": document["content"]}
        )
        
        return result
```

### Document-Roadmap Integration

The roadmap integration uses Google's A2A principles of "message-based communication with well-defined schemas" to create document-roadmap connections:

```javascript
// Schema for document-roadmap integration message
const documentRoadmapSchema = {
  documentId: "string",
  documentTitle: "string",
  documentUpdatedAt: "timestamp",
  roadmapReferences: [{
    roadmapItemId: "string",
    roadmapItemType: "string", // 'milestone', 'phase', 'task'
    referenceType: "string",   // 'supports', 'blocks', 'extends', etc.
    confidence: "number",
    context: "string"
  }],
  extractionMethod: "string",  // 'llm', 'rule-based', 'hybrid'
  agentId: "string"
};

// Document-roadmap agent that processes documents
class DocumentRoadmapAgent {
  constructor(knowledgeGraph, messageBroker) {
    this.kg = knowledgeGraph;
    this.messageBroker = messageBroker;
    
    // Subscribe to document update events
    this.messageBroker.subscribe(
      "document.updated", 
      async (message) => this.handleDocumentUpdate(message)
    );
  }
  
  async handleDocumentUpdate(message) {
    const documentId = message.documentId;
    
    // Extract roadmap references from document
    const roadmapReferences = await this.extractRoadmapReferences(documentId);
    
    // Publish found references
    await this.messageBroker.publish(
      "document.roadmap.references", 
      {
        documentId,
        documentTitle: message.documentTitle,
        documentUpdatedAt: message.timestamp,
        roadmapReferences,
        extractionMethod: "llm",
        agentId: this.agentId
      }
    );
    
    // Update knowledge graph
    await this.updateKnowledgeGraph(documentId, roadmapReferences);
  }
  
  async extractRoadmapReferences(documentId) {
    // Implementation using LLM to extract roadmap references
  }
  
  async updateKnowledgeGraph(documentId, roadmapReferences) {
    // Create relationships in knowledge graph
    for (const ref of roadmapReferences) {
      await this.kg.createRelationship(
        "document", documentId,
        ref.roadmapItemType, ref.roadmapItemId,
        ref.referenceType.toUpperCase(),
        { confidence: ref.confidence, context: ref.context }
      );
    }
  }
}
```

## Dynamic Relationship Management

To maintain connections as both documents and features evolve, implement a bidirectional propagation system with the following components:

### 1. DocumentChangeAgent

Monitors document changes and updates feature relationships:

```javascript
class DocumentChangeAgent {
  constructor(knowledgeGraph, messageBroker) {
    this.kg = knowledgeGraph;
    this.messageBroker = messageBroker;
    
    // Initialize LLM-powered change detection
    this.changeDetector = new LLMChangeDetector();
  }
  
  async processDocumentUpdate(oldVersion, newVersion) {
    // Detect semantic changes
    const changes = await this.changeDetector.detectChanges(
      oldVersion.content, 
      newVersion.content
    );
    
    // For each change, update affected relationships
    for (const change of changes) {
      // Get affected features
      const affectedFeatures = await this.kg.getRelatedFeatures(
        newVersion.id, 
        { relationship: "DOCUMENTS" }
      );
      
      for (const feature of affectedFeatures) {
        // Determine if change affects this feature
        const affectsFeature = await this.changeDetector.affectsFeature(
          change, 
          feature
        );
        
        if (affectsFeature) {
          // Publish feature update message
          await this.messageBroker.publish(
            "document.change.affects.feature",
            {
              documentId: newVersion.id,
              featureId: feature.id,
              change: {
                type: change.type,
                content: change.content,
                significance: change.significance
              }
            }
          );
          
          // Update relationship properties
          await this.kg.updateRelationshipProperties(
            "document", newVersion.id,
            "feature", feature.id,
            "DOCUMENTS",
            {
              lastVerified: new Date().toISOString(),
              changeHistory: [
                ...(feature.relationships.DOCUMENTS.changeHistory || []),
                {
                  timestamp: new Date().toISOString(),
                  changeType: change.type,
                  description: change.description
                }
              ]
            }
          );
        }
      }
    }
  }
}
```

### 2. FeatureChangeAgent

Monitors feature changes and updates document relationships:

```javascript
class FeatureChangeAgent {
  constructor(knowledgeGraph, messageBroker) {
    this.kg = knowledgeGraph;
    this.messageBroker = messageBroker;
    
    // Subscribe to feature update events
    this.messageBroker.subscribe(
      "feature.updated", 
      async (message) => this.handleFeatureUpdate(message)
    );
  }
  
  async handleFeatureUpdate(message) {
    const featureId = message.featureId;
    const updateType = message.updateType;
    
    // Get related documents
    const relatedDocs = await this.kg.getRelatedDocuments(
      featureId, 
      { relationship: "DOCUMENTED_BY" }
    );
    
    // If significant update, flag documents as potentially needing updates
    if (updateType === "SIGNIFICANT") {
      for (const doc of relatedDocs) {
        // Mark relationship as "potentially outdated"
        await this.kg.updateRelationshipProperties(
          "feature", featureId,
          "document", doc.id,
          "DOCUMENTED_BY",
          { 
            potentiallyOutdated: true,
            needsReview: true,
            lastFeatureUpdate: message.timestamp
          }
        );
        
        // Publish document review needed message
        await this.messageBroker.publish(
          "document.review.needed",
          {
            documentId: doc.id,
            featureId,
            reason: "FEATURE_SIGNIFICANT_UPDATE",
            details: message.changes
          }
        );
      }
    }
  }
}
```

## PDF Ingestion and Processing

The system extends document processing to handle PDF documents efficiently, integrating with the knowledge graph:

```python
class PDFIngestionAgent:
    def __init__(self, knowledge_graph, vector_store):
        self.kg = knowledge_graph
        self.vector_store = vector_store
        
        # PDF specific processing tools
        self.pdf_tools = [
            extract_pdf_text,
            extract_pdf_tables,
            extract_pdf_images,
            convert_pdf_to_markdown
        ]
        
        # Create specialized PDF processing agent
        self.pdf_processor = Agent(
            name="PDFProcessor",
            instructions=(
                "You process PDF documents to extract structured information. "
                "Extract text, tables, and images, then convert to markdown format."
            ),
            tools=self.pdf_tools
        )
    
    async def process_pdf(self, pdf_path):
        # Read PDF file
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Process PDF using the processor agent
        processing_result = await Runner.run(
            self.pdf_processor,
            {"pdf_content": pdf_content, "pdf_path": pdf_path}
        )
        
        # Extract structured content
        structured_content = processing_result.get_result()
        
        # Create document node in knowledge graph
        document_id = await self.kg.createDocumentNode({
            "title": structured_content["title"],
            "format": "pdf",
            "content_type": "markdown", # Converted format
            "original_format": "pdf",
            "created_at": datetime.now().isoformat(),
            "file_path": pdf_path,
            "page_count": structured_content["page_count"],
            "has_images": len(structured_content["images"]) > 0,
            "has_tables": len(structured_content["tables"]) > 0
        })
        
        # Create content node with the extracted markdown
        content_id = await self.kg.createContentNode(
            document_id,
            structured_content["markdown_content"]
        )
        
        # Process tables as structured data
        for i, table in enumerate(structured_content["tables"]):
            table_id = await self.kg.createTableNode(
                document_id,
                table["data"],
                {
                    "page": table["page"],
                    "caption": table["caption"],
                    "index": i
                }
            )
        
        # Store images
        for i, image in enumerate(structured_content["images"]):
            image_id = await self.kg.createImageNode(
                document_id,
                image["data"],
                {
                    "page": image["page"],
                    "caption": image["caption"],
                    "index": i
                }
            )
        
        # Generate embeddings for document chunks
        chunks = self.chunk_document(structured_content["markdown_content"])
        embeddings = await self.generate_embeddings(chunks)
        
        # Store chunks and embeddings in vector store
        await self.vector_store.add_document(
            document_id,
            chunks,
            embeddings,
            {
                "title": structured_content["title"],
                "format": "pdf",
                "path": pdf_path
            }
        )
        
        return {
            "document_id": document_id,
            "content_id": content_id,
            "chunk_count": len(chunks),
            "status": "processed"
        }
```

## Knowledge Graph Query API

To enable effective document-feature-roadmap queries, implement a GraphQL API:

```graphql
type Document {
  id: ID!
  title: String!
  content: String
  format: String!
  createdAt: DateTime!
  updatedAt: DateTime
  features: [Feature!] @relationship(type: "DOCUMENTS", direction: OUT)
  concepts: [Concept!] @relationship(type: "CONTAINS_CONCEPT", direction: OUT)
  roadmapItems: [RoadmapItem!] @relationship(type: "RELATED_TO", direction: OUT)
  tags: [Tag!] @relationship(type: "HAS_TAG", direction: OUT)
}

type Feature {
  id: ID!
  name: String!
  description: String
  status: String!
  priority: String
  documents: [Document!] @relationship(type: "DOCUMENTED_BY", direction: OUT)
  roadmapItems: [RoadmapItem!] @relationship(type: "PART_OF", direction: OUT)
  dependencies: [Feature!] @relationship(type: "DEPENDS_ON", direction: OUT)
  dependents: [Feature!] @relationship(type: "DEPENDS_ON", direction: IN)
}

type RoadmapItem {
  id: ID!
  name: String!
  type: String! # milestone, phase, task
  status: String!
  features: [Feature!] @relationship(type: "PART_OF", direction: IN)
  documents: [Document!] @relationship(type: "RELATED_TO", direction: IN)
  parent: RoadmapItem @relationship(type: "CHILD_OF", direction: OUT)
  children: [RoadmapItem!] @relationship(type: "CHILD_OF", direction: IN)
}

type Query {
  # Document queries
  getDocument(id: ID!): Document
  findDocumentsByFeature(featureId: ID!): [Document!]
  findDocumentsByRoadmapItem(roadmapItemId: ID!): [Document!]
  searchDocuments(query: String!): [Document!]
  
  # Feature queries
  getFeature(id: ID!): Feature
  findFeaturesByDocument(documentId: ID!): [Feature!]
  findFeaturesByRoadmapItem(roadmapItemId: ID!): [Feature!]
  findFeaturesByTag(tagName: String!): [Feature!]
  
  # Roadmap queries
  getRoadmapItem(id: ID!): RoadmapItem
  getRoadmapTree(rootId: ID!): RoadmapItem
  findRoadmapItemsByFeature(featureId: ID!): [RoadmapItem!]
  findRoadmapItemsByDocument(documentId: ID!): [RoadmapItem!]
  
  # Consistency queries
  findUndocumentedFeatures: [Feature!]
  findOutdatedDocumentation: [Document!]
  findInconsistentDocumentation: [Document!]
}

type Mutation {
  # Document mutations
  createDocumentFeatureLink(documentId: ID!, featureId: ID!, confidence: Float!): Boolean!
  removeDocumentFeatureLink(documentId: ID!, featureId: ID!): Boolean!
  
  # Feature mutations
  createFeatureRoadmapLink(featureId: ID!, roadmapItemId: ID!): Boolean!
  
  # Consistency mutations
  markDocumentAsReviewed(documentId: ID!): Boolean!
  flagDocumentForReview(documentId: ID!, reason: String!): Boolean!
}
```

## Integration with Document Processing Pipeline

The knowledge graph integrates with the document processing pipeline through event-driven communication:

```javascript
// Event handling for document processing
class DocumentProcessingIntegration {
  constructor(knowledgeGraph, messageBroker) {
    this.kg = knowledgeGraph;
    this.messageBroker = messageBroker;
    
    // Subscribe to document processing events
    this.messageBroker.subscribe(
      "document.processed", 
      async (message) => this.handleProcessedDocument(message)
    );
    
    this.messageBroker.subscribe(
      "document.analysis.completed", 
      async (message) => this.handleDocumentAnalysis(message)
    );
    
    this.messageBroker.subscribe(
      "document.validation.completed", 
      async (message) => this.handleDocumentValidation(message)
    );
  }
  
  async handleProcessedDocument(message) {
    const documentId = message.documentId;
    const processingMetadata = message.metadata;
    
    // Update document node with processing metadata
    await this.kg.updateDocumentNode(documentId, {
      processingStatus: "processed",
      processingCompleted: message.timestamp,
      contentType: processingMetadata.contentType,
      wordCount: processingMetadata.wordCount,
      readingTime: processingMetadata.readingTime
    });
    
    // If the document has chunks, store their information
    if (message.chunks) {
      for (const chunk of message.chunks) {
        await this.kg.createChunkNode(
          documentId,
          chunk.id,
          {
            content: chunk.content,
            index: chunk.index,
            heading: chunk.heading,
            wordCount: chunk.wordCount
          }
        );
      }
    }
  }
  
  async handleDocumentAnalysis(message) {
    const documentId = message.documentId;
    const analysis = message.analysis;
    
    // Update document node with analysis results
    await this.kg.updateDocumentNode(documentId, {
      analysisStatus: "completed",
      analysisCompleted: message.timestamp,
      qualityScore: analysis.qualityScore,
      technicalAccuracy: analysis.technicalAccuracy,
      completeness: analysis.completeness
    });
    
    // Create concept nodes for extracted concepts
    for (const concept of analysis.concepts) {
      const conceptId = await this.kg.getOrCreateConceptNode(
        concept.name,
        {
          description: concept.description,
          domain: concept.domain
        }
      );
      
      // Link document to concept
      await this.kg.createRelationship(
        "document", documentId,
        "concept", conceptId,
        "CONTAINS_CONCEPT",
        {
          relevance: concept.relevance,
          confidence: concept.confidence,
          occurrences: concept.occurrences
        }
      );
    }
    
    // Create entity nodes for extracted entities
    for (const entity of analysis.entities) {
      const entityId = await this.kg.getOrCreateEntityNode(
        entity.name,
        entity.type,
        {
          description: entity.description
        }
      );
      
      // Link document to entity
      await this.kg.createRelationship(
        "document", documentId,
        "entity", entityId,
        "MENTIONS_ENTITY",
        {
          confidence: entity.confidence,
          occurrences: entity.occurrences
        }
      );
    }
  }
  
  async handleDocumentValidation(message) {
    const documentId = message.documentId;
    const validation = message.validation;
    
    // Update document node with validation results
    await this.kg.updateDocumentNode(documentId, {
      validationStatus: "completed",
      validationCompleted: message.timestamp,
      validationScore: validation.score,
      validationIssues: validation.issues.length
    });
    
    // Create issue nodes for validation issues
    for (const issue of validation.issues) {
      await this.kg.createValidationIssueNode(
        documentId,
        {
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          location: issue.location,
          suggestedFix: issue.suggestedFix
        }
      );
    }
  }
}
```

## Conclusion

This integration leverages a hybrid approach from both OpenAI's SDK patterns and Google's A2A architecture to create a bidirectional relationship system between documentation, features, and roadmap items. By using Neo4j as the knowledge graph backend, Redis for event communication, and GraphQL for querying, the system enables complex relationship queries while maintaining consistency across the entire system.

The result is a dynamic documentation system where:
1. Documents automatically connect to relevant features and roadmap items
2. Changes in features trigger documentation reviews
3. Documentation gaps and inconsistencies are automatically detected
4. PDF documents are seamlessly integrated into the knowledge graph

This architecture supports the full lifecycle of documentation, from creation through validation to maintenance, with LLM-powered agents driving semantic understanding and relationship management.