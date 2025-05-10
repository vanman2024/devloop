#!/usr/bin/env python3
"""
Test script for redundancy detection and management system.

This script demonstrates the redundancy detection and consolidation
capabilities of the documentation agent system.
"""

import asyncio
import logging
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from agents.docs.documentation_agent.models.document_model import Document
from agents.docs.documentation_agent.core.redundancy_detection import (
    RedundancyDetector,
    RedundancyManager
)
from agents.docs.documentation_agent.connectors.vector_store_connector import DocumentVectorStoreConnector
from agents.docs.documentation_agent.connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from agents.docs.documentation_agent.core.inter_agent_handoff import (
    HandoffManager,
    HandoffRegistry,
    CapabilityRegistry
)
from agents.docs.documentation_agent.agents.document_consolidation_agent import DocumentConsolidationAgent

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("redundancy_test")


class MockVectorStore(DocumentVectorStoreConnector):
    """Mock implementation of the vector store connector."""
    
    def __init__(self):
        self.vectors = {}
        self.documents = {}
        logger.info("MockVectorStore initialized")
    
    async def compute_document_vector(self, document):
        """Compute vector for document (mock implementation)."""
        # Simple mock vector - just use word frequencies
        content = document.content.lower()
        words = content.split()
        unique_words = set(words)
        vector = [words.count(word) / len(words) for word in unique_words]
        self.vectors[document.id] = vector
        return vector
    
    async def get_document_vector(self, document_id):
        """Get vector for document."""
        return self.vectors.get(document_id)
    
    async def add_document(self, document):
        """Add document to vector store."""
        self.documents[document.id] = document
        await self.compute_document_vector(document)
        return document.id
    
    async def find_similar_documents(self, vector=None, document_id=None, limit=10, min_similarity=0.0):
        """Find similar documents."""
        # Return predefined similarities for test
        if document_id == "doc1":
            return [
                {"id": "doc2", "similarity": 0.85},
                {"id": "doc3", "similarity": 0.72},
                {"id": "doc4", "similarity": 0.45}
            ]
        elif document_id == "doc2":
            return [
                {"id": "doc1", "similarity": 0.85},
                {"id": "doc3", "similarity": 0.68}
            ]
        else:
            return []
    
    async def find_candidate_documents(self, document):
        """Find candidate documents for comparison."""
        return ["doc1", "doc2", "doc3", "doc4"]
    
    async def compute_vector_similarity(self, vector1, vector2):
        """Compute similarity between vectors."""
        # For testing, return predefined values
        return 0.75


class MockKnowledgeGraph(DocumentKnowledgeGraphConnector):
    """Mock implementation of the knowledge graph connector."""
    
    def __init__(self):
        self.documents = {}
        self.relationships = {}
        logger.info("MockKnowledgeGraph initialized")
        
        # Add some test documents
        self.documents["doc1"] = {
            "id": "doc1",
            "title": "API Documentation",
            "content": "This document describes the API endpoints and usage.\n\n"
                      "## Endpoints\n\nThe API provides several endpoints for data access.\n\n"
                      "## Authentication\n\nAuthentication is required for all endpoints.",
            "document_type": "markdown"
        }
        
        self.documents["doc2"] = {
            "id": "doc2",
            "title": "API Usage Guide",
            "content": "This guide explains how to use the API effectively.\n\n"
                      "## Endpoints\n\nThe system exposes several REST endpoints.\n\n"
                      "## Examples\n\nHere are examples of API calls.",
            "document_type": "markdown"
        }
        
        self.documents["doc3"] = {
            "id": "doc3",
            "title": "System Architecture",
            "content": "This document describes the system architecture.\n\n"
                      "## Components\n\nThe system consists of multiple components.\n\n"
                      "## API Layer\n\nThe API layer handles external requests.",
            "document_type": "markdown"
        }
        
        self.documents["doc4"] = {
            "id": "doc4",
            "title": "Installation Guide",
            "content": "This guide explains how to install the system.\n\n"
                      "## Requirements\n\nSeveral dependencies are needed.\n\n"
                      "## Steps\n\nFollow these steps to install.",
            "document_type": "markdown"
        }
        
        # Add some test relationships
        self.relationships["doc1"] = [
            {"target_id": "doc2", "relationship_type": "related_to", "properties": {}, "strength": 0.9},
            {"target_id": "doc3", "relationship_type": "references", "properties": {}, "strength": 0.7}
        ]
        
        self.relationships["doc2"] = [
            {"target_id": "doc1", "relationship_type": "related_to", "properties": {}, "strength": 0.9}
        ]
        
        self.relationships["doc3"] = [
            {"target_id": "doc1", "relationship_type": "referenced_by", "properties": {}, "strength": 0.7}
        ]
    
    async def get_document(self, document_id):
        """Get document from knowledge graph."""
        return self.documents.get(document_id)
    
    async def add_document(self, document_data):
        """Add document to knowledge graph."""
        doc_id = document_data.get("id")
        self.documents[doc_id] = document_data
        return doc_id
    
    async def update_document(self, document_id, document_data):
        """Update document in knowledge graph."""
        self.documents[document_id] = document_data
        return document_id
    
    async def get_document_relationships(self, document_id):
        """Get document relationships."""
        return self.relationships.get(document_id, [])
    
    async def add_relationship(self, relationship_data):
        """Add relationship to knowledge graph."""
        source_id = relationship_data.get("source_id")
        if source_id not in self.relationships:
            self.relationships[source_id] = []
        
        self.relationships[source_id].append(relationship_data)
        return True
    
    async def find_related_documents(self, document_id):
        """Find related documents."""
        related = []
        for rel in self.relationships.get(document_id, []):
            related.append(rel["target_id"])
        return related


class MockEventBus:
    """Mock implementation of the event bus."""
    
    def __init__(self):
        self.subscribers = {}
        self.events = []
        logger.info("MockEventBus initialized")
    
    async def publish(self, topic, data):
        """Publish event to topic."""
        event = {"topic": topic, "data": data, "timestamp": datetime.now().isoformat()}
        self.events.append(event)
        
        # Call subscribers
        if topic in self.subscribers:
            for callback in self.subscribers[topic]:
                try:
                    await callback(event)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
        
        logger.info(f"Published event to {topic}")
        return True
    
    async def subscribe(self, topic, callback):
        """Subscribe to topic."""
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        
        self.subscribers[topic].append(callback)
        logger.info(f"Subscribed to {topic}")
        return True


class MockHandoffRegistry(HandoffRegistry):
    """Mock implementation of the handoff registry."""
    
    def __init__(self, event_bus=None):
        super().__init__(None, event_bus)
        logger.info("MockHandoffRegistry initialized")


async def test_redundancy_detection():
    """Test redundancy detection."""
    # Create mock components
    vector_store = MockVectorStore()
    knowledge_graph = MockKnowledgeGraph()
    event_bus = MockEventBus()
    handoff_registry = MockHandoffRegistry(event_bus)
    capability_registry = CapabilityRegistry()
    
    # Create handoff manager
    detection_handoff_manager = HandoffManager(
        agent_id="redundancy_detection_agent",
        registry=handoff_registry,
        capability_registry=capability_registry,
        event_bus=event_bus
    )
    
    # Create redundancy detector and manager
    detector = RedundancyDetector(
        vector_store=vector_store,
        knowledge_graph=knowledge_graph,
        config={"similarity_threshold": 0.7}
    )
    
    manager = RedundancyManager(
        detector=detector,
        handoff_manager=detection_handoff_manager,
        config={
            "consolidation_agent_id": "document_consolidation_agent",
            "refactoring_agent_id": "document_refactoring_agent"
        }
    )
    
    # Create consolidation agent
    consolidation_handoff_manager = HandoffManager(
        agent_id="document_consolidation_agent",
        registry=handoff_registry,
        capability_registry=capability_registry,
        event_bus=event_bus
    )
    
    consolidation_agent = DocumentConsolidationAgent(
        agent_id="document_consolidation_agent",
        knowledge_graph=knowledge_graph,
        vector_store=vector_store,
        handoff_manager=consolidation_handoff_manager
    )
    
    # Get test documents
    doc1_data = await knowledge_graph.get_document("doc1")
    doc2_data = await knowledge_graph.get_document("doc2")
    
    # Create document objects
    doc1 = Document(
        id="doc1",
        title=doc1_data["title"],
        content=doc1_data["content"],
        document_type=doc1_data["document_type"]
    )
    
    doc2 = Document(
        id="doc2",
        title=doc2_data["title"],
        content=doc2_data["content"],
        document_type=doc2_data["document_type"]
    )
    
    # Add to vector store
    await vector_store.add_document(doc1)
    await vector_store.add_document(doc2)
    
    logger.info("Running redundancy detection for document 1")
    
    # Run redundancy detection
    result = await detector.detect_redundancy(doc1)
    
    # Print results
    logger.info(f"Redundancy detection results:")
    logger.info(f"- Document: {doc1.title}")
    logger.info(f"- Similar documents: {len(result.similar_docs)}")
    logger.info(f"- Duplicate segments: {len(result.duplicate_segments)}")
    
    # Print similar docs
    logger.info("Similar documents:")
    for doc in result.similar_docs:
        logger.info(f"- {doc['id']}: {doc.get('title', 'Unknown')} (similarity: {doc.get('similarity_score', 0):.2f})")
    
    # Print recommended actions
    logger.info("Recommended actions:")
    for action in result.recommended_actions:
        logger.info(f"- {action['action_type']} ({action['priority']}): {action['description']}")
    
    # Test redundancy manager
    logger.info("\nTesting redundancy manager process_document:")
    await manager.process_document(doc1)
    
    # Print events
    logger.info("\nEvents published:")
    for event in event_bus.events:
        logger.info(f"- {event['topic']}: {event['data']}")
    
    # Test consolidation agent
    if result.recommended_actions and result.similar_docs:
        logger.info("\nTesting document consolidation:")
        
        # Create context
        from agents.docs.documentation_agent.core.inter_agent_handoff import HandoffContext
        
        context = HandoffContext(
            document_id="doc1",
            document_type="markdown",
            metadata={
                "actions": [
                    {
                        "action_type": "merge_documents",
                        "priority": "high",
                        "description": "Merge with similar document",
                        "target_document_id": "doc2"
                    }
                ]
            }
        )
        
        # Process handoff
        result = await consolidation_agent.process_handoff(
            handoff_id="test_handoff",
            handoff_context=context,
            task="Merge with similar document"
        )
        
        # Print result
        logger.info("Consolidation result:")
        logger.info(json.dumps(result, indent=2))
        
        # Get consolidated document
        if "consolidated_document_id" in result:
            consolidated_doc = await knowledge_graph.get_document(result["consolidated_document_id"])
            if consolidated_doc:
                logger.info(f"\nConsolidated document: {consolidated_doc['title']}")
                logger.info(f"Content length: {len(consolidated_doc['content'])} characters")
                logger.info(f"First 200 characters: {consolidated_doc['content'][:200]}...")


if __name__ == "__main__":
    # Run the test
    asyncio.run(test_redundancy_detection())