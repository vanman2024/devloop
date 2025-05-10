"""
Documentation Agent Hub - Agentic Documentation Management System

This module implements the top-level orchestration for the agentic documentation 
management system, following OpenAI's Manager Pattern and Google's A2A architecture.
It serves as the coordination hub for specialized document agents.
"""

import os
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union

# Import orchestrators
from ..orchestration.ingestion_orchestrator import IngestionOrchestrator
from ..orchestration.analysis_orchestrator import AnalysisOrchestrator 
from ..orchestration.validation_orchestrator import ValidationOrchestrator
from ..orchestration.creation_orchestrator import CreationOrchestrator

# Import connectors
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..connectors.vector_store_connector import DocumentVectorStoreConnector

# Import models
from ..models.document_model import Document, DocumentMetadata
from ..models.validation_result import ValidationResult

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentationAgentHub:
    """
    Central orchestration hub for the documentation management system.
    
    This class follows the Manager pattern from OpenAI's SDK architecture, coordinating
    specialized agents for different aspects of document management while maintaining
    a unified knowledge context.
    
    Responsibilities:
    - Initialize and coordinate domain-specific orchestrators
    - Maintain global context and state
    - Route document operations to appropriate specialized agents
    - Handle inter-agent communication and coordination
    - Provide a unified API for client applications
    """
    
    def __init__(self, config: Dict[str, Any], event_bus: Any = None):
        """
        Initialize the Documentation Agent Hub.
        
        Args:
            config: Configuration dictionary for the agent hub
            event_bus: Optional event bus for asynchronous communication
        """
        self.config = config
        self.event_bus = event_bus
        
        # Initialize knowledge graph and vector store connectors
        self.kg_connector = DocumentKnowledgeGraphConnector(config)
        self.vector_store = DocumentVectorStoreConnector(config)
        
        # Initialize domain orchestrators
        self.ingestion_orchestrator = IngestionOrchestrator(
            config, 
            event_bus, 
            self.kg_connector, 
            self.vector_store
        )
        
        self.analysis_orchestrator = AnalysisOrchestrator(
            config, 
            event_bus, 
            self.kg_connector, 
            self.vector_store
        )
        
        self.validation_orchestrator = ValidationOrchestrator(
            config, 
            event_bus, 
            self.kg_connector, 
            self.vector_store
        )
        
        self.creation_orchestrator = CreationOrchestrator(
            config, 
            event_bus, 
            self.kg_connector, 
            self.vector_store
        )
        
        # Initialize state
        self.active_operations = {}
        self.document_cache = {}
        
        logger.info("DocumentationAgentHub initialized successfully")
    
    async def process_document(self, 
                             document_path: str, 
                             options: Dict[str, Any] = None) -> Document:
        """
        Process a document through the complete pipeline.
        
        Args:
            document_path: Path to the document file
            options: Processing options and metadata
            
        Returns:
            Processed document with metadata and validation results
        """
        logger.info(f"Processing document: {document_path}")
        options = options or {}
        
        # 1. Document ingestion
        document = await self.ingestion_orchestrator.ingest_document(document_path, options)
        
        # 2. Document analysis
        document = await self.analysis_orchestrator.analyze_document(document)
        
        # 3. Document validation
        validation_results = await self.validation_orchestrator.validate_document(document)
        document.validation_results = validation_results
        
        # 4. Knowledge graph integration
        await self.kg_connector.add_document(document)
        
        # 5. Update document cache
        self.document_cache[document.id] = document
        
        logger.info(f"Document processed successfully: {document.id}")
        return document
    
    async def create_document(self, 
                            topic: str, 
                            related_entities: List[Dict[str, Any]] = None,
                            options: Dict[str, Any] = None) -> Document:
        """
        Create a new document based on a topic and related entities.
        
        Args:
            topic: The topic for the document
            related_entities: List of related entities from the knowledge graph
            options: Creation options and metadata
            
        Returns:
            Created document
        """
        logger.info(f"Creating document for topic: {topic}")
        related_entities = related_entities or []
        options = options or {}
        
        # Gather context from related entities in the knowledge graph
        kg_context = await self.kg_connector.get_context_for_entities(related_entities)
        
        # Create document using the creation orchestrator
        document = await self.creation_orchestrator.create_document(topic, kg_context, options)
        
        # Update knowledge graph with new document
        await self.kg_connector.add_document(document, related_entities)
        
        # Update document cache
        self.document_cache[document.id] = document
        
        logger.info(f"Document created successfully: {document.id}")
        return document
    
    async def update_document(self, 
                            document_id: str,
                            changes: Dict[str, Any]) -> Document:
        """
        Update an existing document.
        
        Args:
            document_id: ID of the document to update
            changes: Changes to apply to the document
            
        Returns:
            Updated document
        """
        logger.info(f"Updating document: {document_id}")
        
        # Get current document
        document = await self.get_document(document_id)
        if not document:
            raise ValueError(f"Document not found: {document_id}")
        
        # Apply changes through the creation orchestrator
        updated_document = await self.creation_orchestrator.update_document(document, changes)
        
        # Validate updated document
        validation_results = await self.validation_orchestrator.validate_document(updated_document)
        updated_document.validation_results = validation_results
        
        # Update knowledge graph
        await self.kg_connector.update_document(updated_document)
        
        # Update document cache
        self.document_cache[document_id] = updated_document
        
        logger.info(f"Document updated successfully: {document_id}")
        return updated_document
    
    async def get_document(self, document_id: str) -> Optional[Document]:
        """
        Get a document by ID.
        
        Args:
            document_id: ID of the document to retrieve
            
        Returns:
            Document if found, None otherwise
        """
        # Check cache first
        if document_id in self.document_cache:
            return self.document_cache[document_id]
        
        # Try to get from knowledge graph
        document = await self.kg_connector.get_document(document_id)
        if document:
            self.document_cache[document_id] = document
            
        return document
    
    async def find_related_documents(self, 
                                   query: str, 
                                   k: int = 5) -> List[Document]:
        """
        Find documents related to a query string.
        
        Args:
            query: Query string
            k: Number of results to return
            
        Returns:
            List of related documents
        """
        logger.info(f"Finding documents related to: {query}")
        
        # Use vector store for semantic search
        document_ids = await self.vector_store.search(query, k=k)
        
        # Get full documents
        documents = []
        for doc_id in document_ids:
            doc = await self.get_document(doc_id)
            if doc:
                documents.append(doc)
        
        return documents
    
    async def find_documents_for_entity(self, 
                                      entity_type: str,
                                      entity_id: str) -> List[Document]:
        """
        Find documents related to a specific entity.
        
        Args:
            entity_type: Type of entity (feature, milestone, etc.)
            entity_id: ID of the entity
            
        Returns:
            List of related documents
        """
        logger.info(f"Finding documents for entity: {entity_type}/{entity_id}")
        
        # Query knowledge graph for related documents
        document_ids = await self.kg_connector.get_documents_for_entity(entity_type, entity_id)
        
        # Get full documents
        documents = []
        for doc_id in document_ids:
            doc = await self.get_document(doc_id)
            if doc:
                documents.append(doc)
        
        return documents
    
    async def validate_documents(self, 
                               document_ids: List[str] = None) -> Dict[str, ValidationResult]:
        """
        Validate documents and update their validation status.
        
        Args:
            document_ids: Optional list of document IDs to validate.
                          If None, validates all documents.
            
        Returns:
            Dictionary mapping document IDs to validation results
        """
        logger.info("Starting document validation")
        
        if not document_ids:
            # Get all document IDs from knowledge graph
            document_ids = await self.kg_connector.get_all_document_ids()
        
        results = {}
        for doc_id in document_ids:
            doc = await self.get_document(doc_id)
            if doc:
                validation_result = await self.validation_orchestrator.validate_document(doc)
                doc.validation_results = validation_result
                results[doc_id] = validation_result
                
                # Update document in knowledge graph
                await self.kg_connector.update_document_validation(doc_id, validation_result)
        
        logger.info(f"Completed validation for {len(results)} documents")
        return results
    
    async def get_document_status(self) -> Dict[str, Any]:
        """
        Get overall status of the documentation system.
        
        Returns:
            Status information including counts and validation stats
        """
        document_ids = await self.kg_connector.get_all_document_ids()
        total_count = len(document_ids)
        
        # Get validation stats
        validation_stats = {
            'valid': 0,
            'invalid': 0,
            'pending': 0,
            'technical_issues': 0,
            'completeness_issues': 0,
            'consistency_issues': 0,
            'readability_issues': 0
        }
        
        for doc_id in document_ids:
            validation_result = await self.kg_connector.get_document_validation(doc_id)
            if not validation_result:
                validation_stats['pending'] += 1
                continue
                
            if validation_result.is_valid:
                validation_stats['valid'] += 1
            else:
                validation_stats['invalid'] += 1
                
            if validation_result.technical_issues:
                validation_stats['technical_issues'] += 1
            if validation_result.completeness_issues:
                validation_stats['completeness_issues'] += 1
            if validation_result.consistency_issues:
                validation_stats['consistency_issues'] += 1
            if validation_result.readability_issues:
                validation_stats['readability_issues'] += 1
        
        # Get document type stats
        type_stats = await self.kg_connector.get_document_type_counts()
        
        # Return combined stats
        return {
            'total_documents': total_count,
            'validation_stats': validation_stats,
            'document_types': type_stats,
            'last_validation_time': await self.kg_connector.get_last_validation_time()
        }