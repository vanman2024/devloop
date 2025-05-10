"""
Document Knowledge Graph Connector

This module provides a specialized connector for integrating documentation
with the Devloop Knowledge Graph. It enables creating and maintaining
relationships between documents, features, roadmap items, and other entities.
"""

import os
import sys
import json
import logging
import uuid
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime

# Import document models
from ..models.document_model import Document, DocumentMetadata, DocumentRelationship
from ..models.validation_result import ValidationResult

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'document_kg_connector.log'))
    ]
)
logger = logging.getLogger('document_kg_connector')

# Try to import the base knowledge_graph_connector
try:
    from agents.planning.feature_creation.knowledge_graph_connector import KnowledgeGraphConnector as BaseKGConnector
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    USING_BASE_KG = True
except ImportError:
    logger.warning("Could not import base KnowledgeGraphConnector, using simplified implementation")
    USING_BASE_KG = False
    
    # Simple mock implementation if the real one isn't available
    class BaseKGConnector:
        """Mock implementation of KnowledgeGraphConnector"""
        
        def __init__(self, kg_file_path=None):
            self.kg_file_path = kg_file_path or os.path.expanduser("~/.devloop/sdk/storage/knowledge_graph.json")
            self.kg = {
                "knowledge_graph": {
                    "nodes": {},
                    "edges": [],
                    "indices": {
                        "node_type_index": {},
                        "edge_type_index": {},
                        "node_outgoing_edges": {},
                        "node_incoming_edges": {}
                    }
                }
            }
            self._load()
        
        def _load(self):
            if os.path.exists(self.kg_file_path):
                try:
                    with open(self.kg_file_path, 'r') as f:
                        self.kg = json.load(f)
                except Exception as e:
                    logger.error(f"Error loading knowledge graph: {e}")
        
        def save(self):
            try:
                os.makedirs(os.path.dirname(self.kg_file_path), exist_ok=True)
                with open(self.kg_file_path, 'w') as f:
                    json.dump(self.kg, f, indent=2)
                return True
            except Exception as e:
                logger.error(f"Error saving knowledge graph: {e}")
                return False
        
        def get_node(self, node_id):
            return self.kg.get("knowledge_graph", {}).get("nodes", {}).get(node_id)
        
        def get_nodes_by_type(self, node_type):
            nodes = []
            for node_id, node in self.kg.get("knowledge_graph", {}).get("nodes", {}).items():
                if node.get("type") == node_type:
                    nodes.append(node)
            return nodes
        
        def add_node(self, node_id, node_type, properties=None, metadata=None):
            if "knowledge_graph" not in self.kg:
                self.kg["knowledge_graph"] = {"nodes": {}, "edges": [], "indices": {}}
            
            if "nodes" not in self.kg["knowledge_graph"]:
                self.kg["knowledge_graph"]["nodes"] = {}
            
            # Create node
            node = {
                "id": node_id,
                "type": node_type,
                "properties": properties or {},
                "metadata": metadata or {}
            }
            
            # Add to nodes
            self.kg["knowledge_graph"]["nodes"][node_id] = node
            
            # Update indices
            if "indices" not in self.kg["knowledge_graph"]:
                self.kg["knowledge_graph"]["indices"] = {
                    "node_type_index": {},
                    "edge_type_index": {},
                    "node_outgoing_edges": {},
                    "node_incoming_edges": {}
                }
            
            indices = self.kg["knowledge_graph"]["indices"]
            
            # Update node type index
            if "node_type_index" not in indices:
                indices["node_type_index"] = {}
            
            if node_type not in indices["node_type_index"]:
                indices["node_type_index"][node_type] = []
            
            if node_id not in indices["node_type_index"][node_type]:
                indices["node_type_index"][node_type].append(node_id)
            
            return node
        
        def add_edge(self, edge_type, source_id, target_id, properties=None, metadata=None):
            if "knowledge_graph" not in self.kg:
                self.kg["knowledge_graph"] = {"nodes": {}, "edges": [], "indices": {}}
            
            if "edges" not in self.kg["knowledge_graph"]:
                self.kg["knowledge_graph"]["edges"] = []
            
            # Create edge
            edge = {
                "type": edge_type,
                "source": source_id,
                "target": target_id,
                "properties": properties or {},
                "metadata": metadata or {}
            }
            
            # Add to edges
            self.kg["knowledge_graph"]["edges"].append(edge)
            
            return edge
    
    def get_knowledge_graph_connector():
        """Get singleton instance"""
        return BaseKGConnector()


class DocumentKnowledgeGraphConnector:
    """
    Specialized connector for integrating documents with the knowledge graph.
    
    This connector extends the base knowledge graph connector to handle document-specific
    operations such as adding documents, creating relationships between documents and
    features/roadmap items, and querying for related documents.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the document knowledge graph connector.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Get base knowledge graph connector
        self.base_kg = get_knowledge_graph_connector()
        
        # Document-specific configuration
        self.document_node_type = "document"
        self.document_storage_dir = config.get("document_storage_dir", 
                                               os.path.join(PROJECT_ROOT, "backups", "documents"))
        
        # Define edge types for document relationships
        self.edge_types = {
            "documents": "document_describes",      # document describes a feature
            "references": "document_references",    # document references another entity
            "extends": "document_extends",          # document extends another document
            "validates": "document_validates",      # document validates a feature or requirement
            "requires": "document_requires",        # document requires another document
            "related": "document_related_to",       # generic relationship
            "contains": "document_contains"         # hierarchical relationship
        }
        
        # Create storage directory if it doesn't exist
        os.makedirs(self.document_storage_dir, exist_ok=True)
        
        logger.info("Document knowledge graph connector initialized")
    
    async def add_document(self, document: Document, related_entities: List[Dict[str, Any]] = None) -> bool:
        """
        Add a document to the knowledge graph.
        
        Args:
            document: Document to add
            related_entities: List of related entities to link the document to
            
        Returns:
            Success status
        """
        try:
            document_id = document.id
            
            # Check if document already exists
            existing_node = self.base_kg.get_node(document_id)
            if existing_node:
                logger.info(f"Document {document_id} already exists in knowledge graph, updating...")
                return await self.update_document(document)
            
            logger.info(f"Adding document {document_id} to knowledge graph")
            
            # Prepare document properties
            properties = {
                "title": document.metadata.title,
                "description": document.metadata.description,
                "authors": document.metadata.authors,
                "created_at": document.metadata.created_at.isoformat(),
                "updated_at": document.metadata.updated_at.isoformat(),
                "document_type": document.metadata.document_type.value,
                "status": document.metadata.status.value,
                "version": document.metadata.version,
                "tags": document.metadata.tags,
                "source_path": document.metadata.source_path,
                "language": document.metadata.language,
                "word_count": document.metadata.word_count,
                "reading_time_minutes": document.metadata.reading_time_minutes,
                "url": document.metadata.custom_metadata.get("url", ""),
                "content_summary": document.summary
            }
            
            # Add additional metadata
            metadata = {
                "created_by": "documentation_agent",
                "created_at": datetime.now().isoformat(),
                "validation_status": "pending",
                "storage_path": await self._store_document_file(document)
            }
            
            # Create document node in the knowledge graph
            self.base_kg.add_node(
                node_id=document_id,
                node_type=self.document_node_type,
                properties=properties,
                metadata=metadata
            )
            
            # Add relationships to the document
            if document.relationships:
                for rel in document.relationships:
                    edge_type = self.edge_types.get(rel.relationship_type, "document_related_to")
                    
                    # Check if target entity exists, create placeholder if not
                    target_node = self.base_kg.get_node(rel.entity_id)
                    if not target_node:
                        logger.info(f"Creating placeholder node for {rel.entity_type} {rel.entity_id}")
                        self.base_kg.add_node(
                            node_id=rel.entity_id,
                            node_type=rel.entity_type,
                            properties={
                                "name": rel.metadata.get("name", rel.entity_id),
                                "placeholder": True
                            },
                            metadata={
                                "created_by": "documentation_agent",
                                "created_at": datetime.now().isoformat(),
                                "placeholder": True
                            }
                        )
                    
                    # Create relationship
                    logger.info(f"Adding relationship {edge_type} from {document_id} to {rel.entity_id}")
                    self.base_kg.add_edge(
                        edge_type=edge_type,
                        source_id=document_id,
                        target_id=rel.entity_id,
                        properties={
                            "relationship_type": rel.relationship_type,
                            "strength": rel.strength,
                            "bidirectional": rel.bidirectional
                        },
                        metadata=rel.metadata
                    )
                    
                    # If bidirectional, add reverse relationship
                    if rel.bidirectional:
                        reverse_edge_type = edge_type + "_by"
                        logger.info(f"Adding reverse relationship {reverse_edge_type} from {rel.entity_id} to {document_id}")
                        self.base_kg.add_edge(
                            edge_type=reverse_edge_type,
                            source_id=rel.entity_id,
                            target_id=document_id,
                            properties={
                                "relationship_type": rel.relationship_type + "_by",
                                "strength": rel.strength,
                                "bidirectional": True
                            },
                            metadata=rel.metadata
                        )
            
            # Add relationships to explicitly provided related entities
            if related_entities:
                for entity in related_entities:
                    entity_id = entity.get("id")
                    entity_type = entity.get("type", "feature")
                    relationship_type = entity.get("relationship", "references")
                    
                    if not entity_id:
                        continue
                    
                    edge_type = self.edge_types.get(relationship_type, "document_related_to")
                    
                    # Check if entity node exists, create placeholder if not
                    entity_node = self.base_kg.get_node(entity_id)
                    if not entity_node:
                        logger.info(f"Creating placeholder node for {entity_type} {entity_id}")
                        self.base_kg.add_node(
                            node_id=entity_id,
                            node_type=entity_type,
                            properties={
                                "name": entity.get("name", entity_id),
                                "placeholder": True
                            },
                            metadata={
                                "created_by": "documentation_agent",
                                "created_at": datetime.now().isoformat(),
                                "placeholder": True
                            }
                        )
                    
                    # Create relationship
                    logger.info(f"Adding relationship {edge_type} from {document_id} to {entity_id}")
                    self.base_kg.add_edge(
                        edge_type=edge_type,
                        source_id=document_id,
                        target_id=entity_id,
                        properties={
                            "relationship_type": relationship_type,
                            "strength": entity.get("strength", 1.0),
                            "bidirectional": entity.get("bidirectional", False)
                        },
                        metadata={
                            "created_by": "documentation_agent",
                            "created_at": datetime.now().isoformat()
                        }
                    )
                    
                    # If bidirectional, add reverse relationship
                    if entity.get("bidirectional", False):
                        reverse_edge_type = edge_type + "_by"
                        logger.info(f"Adding reverse relationship {reverse_edge_type} from {entity_id} to {document_id}")
                        self.base_kg.add_edge(
                            edge_type=reverse_edge_type,
                            source_id=entity_id,
                            target_id=document_id,
                            properties={
                                "relationship_type": relationship_type + "_by",
                                "strength": entity.get("strength", 1.0),
                                "bidirectional": True
                            },
                            metadata={
                                "created_by": "documentation_agent",
                                "created_at": datetime.now().isoformat()
                            }
                        )
            
            # Add tags as concept nodes and create relationships
            if document.metadata.tags:
                for tag in document.metadata.tags:
                    # Create consistent concept ID
                    concept_id = f"concept-{tag.lower().replace(' ', '-')}"
                    
                    # Check if concept exists, create it if not
                    concept_node = self.base_kg.get_node(concept_id)
                    if not concept_node:
                        logger.info(f"Creating concept node {concept_id}")
                        self.base_kg.add_node(
                            node_id=concept_id,
                            node_type="concept",
                            properties={
                                "name": tag,
                                "normalized": concept_id.replace("concept-", "")
                            },
                            metadata={
                                "created_by": "documentation_agent",
                                "created_at": datetime.now().isoformat()
                            }
                        )
                    
                    # Connect document to concept
                    logger.info(f"Connecting document {document_id} to concept {concept_id}")
                    self.base_kg.add_edge(
                        edge_type="document_related_to_concept",
                        source_id=document_id,
                        target_id=concept_id,
                        metadata={
                            "created_by": "documentation_agent",
                            "created_at": datetime.now().isoformat()
                        }
                    )
            
            # Save the knowledge graph
            self.base_kg.save()
            
            logger.info(f"Document {document_id} added to knowledge graph successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error adding document to knowledge graph: {str(e)}")
            return False
    
    async def update_document(self, document: Document) -> bool:
        """
        Update an existing document in the knowledge graph.
        
        Args:
            document: Updated document
            
        Returns:
            Success status
        """
        try:
            document_id = document.id
            
            # Check if document exists
            existing_node = self.base_kg.get_node(document_id)
            if not existing_node:
                logger.warning(f"Document {document_id} not found in knowledge graph, adding instead...")
                return await self.add_document(document)
            
            logger.info(f"Updating document {document_id} in knowledge graph")
            
            # Get current properties and update with new data
            properties = existing_node.get("properties", {}).copy()
            
            # Update properties
            properties.update({
                "title": document.metadata.title,
                "description": document.metadata.description,
                "authors": document.metadata.authors,
                "updated_at": document.metadata.updated_at.isoformat(),
                "document_type": document.metadata.document_type.value,
                "status": document.metadata.status.value,
                "version": document.metadata.version,
                "tags": document.metadata.tags,
                "word_count": document.metadata.word_count,
                "reading_time_minutes": document.metadata.reading_time_minutes,
                "content_summary": document.summary
            })
            
            # Update metadata
            metadata = existing_node.get("metadata", {}).copy()
            metadata.update({
                "updated_by": "documentation_agent",
                "updated_at": datetime.now().isoformat(),
                "storage_path": await self._store_document_file(document, update=True)
            })
            
            # Update the node in the knowledge graph
            if hasattr(self.base_kg, 'update_node'):
                self.base_kg.update_node(document_id, properties=properties, metadata=metadata)
            else:
                # If update_node method isn't available, add node replaces existing one
                self.base_kg.add_node(
                    node_id=document_id,
                    node_type=self.document_node_type,
                    properties=properties,
                    metadata=metadata
                )
            
            # Save the knowledge graph
            self.base_kg.save()
            
            logger.info(f"Document {document_id} updated in knowledge graph successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error updating document in knowledge graph: {str(e)}")
            return False
    
    async def update_document_validation(self, document_id: str, validation_result: ValidationResult) -> bool:
        """
        Update the validation status of a document in the knowledge graph.
        
        Args:
            document_id: ID of the document
            validation_result: Validation result
            
        Returns:
            Success status
        """
        try:
            # Check if document exists
            existing_node = self.base_kg.get_node(document_id)
            if not existing_node:
                logger.warning(f"Document {document_id} not found in knowledge graph")
                return False
            
            logger.info(f"Updating validation status for document {document_id}")
            
            # Get current metadata and update validation information
            metadata = existing_node.get("metadata", {}).copy()
            
            # Create validation summary
            validation_summary = {
                "is_valid": validation_result.is_valid,
                "timestamp": validation_result.timestamp.isoformat(),
                "validators_run": validation_result.validators_run,
                "error_count": validation_result.error_count,
                "warning_count": validation_result.warning_count,
                "info_count": validation_result.info_count,
                "has_critical_issues": validation_result.has_critical_issues,
                "technical_issues_count": len(validation_result.technical_issues),
                "completeness_issues_count": len(validation_result.completeness_issues),
                "consistency_issues_count": len(validation_result.consistency_issues),
                "readability_issues_count": len(validation_result.readability_issues)
            }
            
            # Update metadata
            metadata.update({
                "validation_status": "valid" if validation_result.is_valid else "invalid",
                "validation_timestamp": validation_result.timestamp.isoformat(),
                "validation_summary": validation_summary,
                "updated_by": "documentation_agent",
                "updated_at": datetime.now().isoformat()
            })
            
            # Store validation details
            validation_path = os.path.join(
                self.document_storage_dir, 
                f"validation_{document_id}.json"
            )
            
            with open(validation_path, 'w') as f:
                json.dump(validation_result.to_dict(), f, indent=2)
            
            # Update metadata with validation storage path
            metadata["validation_path"] = validation_path
            
            # Update the node in the knowledge graph
            if hasattr(self.base_kg, 'update_node'):
                self.base_kg.update_node(document_id, metadata=metadata)
            else:
                # If update_node isn't available, update properties as well (unchanged)
                properties = existing_node.get("properties", {})
                self.base_kg.add_node(
                    node_id=document_id,
                    node_type=self.document_node_type,
                    properties=properties,
                    metadata=metadata
                )
            
            # Save the knowledge graph
            self.base_kg.save()
            
            logger.info(f"Validation status updated for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating document validation status: {str(e)}")
            return False
    
    async def get_document(self, document_id: str) -> Optional[Document]:
        """
        Get a document from the knowledge graph.
        
        Args:
            document_id: ID of the document to retrieve
            
        Returns:
            Document if found, None otherwise
        """
        try:
            # Check if document exists in knowledge graph
            node = self.base_kg.get_node(document_id)
            if not node or node.get("type") != self.document_node_type:
                logger.warning(f"Document {document_id} not found in knowledge graph")
                return None
            
            logger.info(f"Retrieving document {document_id} from knowledge graph")
            
            # Extract properties
            properties = node.get("properties", {})
            metadata_dict = node.get("metadata", {})
            
            # Create document metadata
            from ..models.document_model import DocumentType, DocumentStatus
            
            metadata = DocumentMetadata(
                title=properties.get("title", ""),
                description=properties.get("description", ""),
                authors=properties.get("authors", []),
                document_type=DocumentType(properties.get("document_type", "unknown")),
                status=DocumentStatus(properties.get("status", "draft")),
                version=properties.get("version", "1.0.0"),
                tags=properties.get("tags", []),
                source_path=properties.get("source_path", ""),
                language=properties.get("language", "en"),
                word_count=properties.get("word_count", 0),
                reading_time_minutes=properties.get("reading_time_minutes", 0)
            )
            
            # Parse dates
            if "created_at" in properties:
                try:
                    metadata.created_at = datetime.fromisoformat(properties["created_at"])
                except ValueError:
                    pass
                
            if "updated_at" in properties:
                try:
                    metadata.updated_at = datetime.fromisoformat(properties["updated_at"])
                except ValueError:
                    pass
            
            # Create document
            document = Document(
                id=document_id,
                metadata=metadata
            )
            
            # Load document content if available
            storage_path = metadata_dict.get("storage_path")
            if storage_path and os.path.exists(storage_path):
                with open(storage_path, 'r', encoding='utf-8') as f:
                    document.content = f.read()
            else:
                # Set summary as content if full content not available
                document.content = properties.get("content_summary", "")
            
            # Get document relationships
            document.relationships = await self._get_document_relationships(document_id)
            
            # Get validation results if available
            validation_path = metadata_dict.get("validation_path")
            if validation_path and os.path.exists(validation_path):
                try:
                    with open(validation_path, 'r') as f:
                        validation_dict = json.load(f)
                        document.validation_results = ValidationResult.from_dict(validation_dict)
                except Exception as e:
                    logger.error(f"Error loading validation results: {str(e)}")
            
            return document
            
        except Exception as e:
            logger.error(f"Error retrieving document from knowledge graph: {str(e)}")
            return None
    
    async def get_document_validation(self, document_id: str) -> Optional[ValidationResult]:
        """
        Get the validation results for a document.
        
        Args:
            document_id: ID of the document
            
        Returns:
            ValidationResult if available, None otherwise
        """
        try:
            # Check if document exists in knowledge graph
            node = self.base_kg.get_node(document_id)
            if not node or node.get("type") != self.document_node_type:
                logger.warning(f"Document {document_id} not found in knowledge graph")
                return None
            
            # Get validation path from metadata
            metadata = node.get("metadata", {})
            validation_path = metadata.get("validation_path")
            
            if not validation_path or not os.path.exists(validation_path):
                return None
            
            # Load validation results
            with open(validation_path, 'r') as f:
                validation_dict = json.load(f)
                return ValidationResult.from_dict(validation_dict)
            
        except Exception as e:
            logger.error(f"Error retrieving document validation: {str(e)}")
            return None
    
    async def get_all_document_ids(self) -> List[str]:
        """
        Get all document IDs from the knowledge graph.
        
        Returns:
            List of document IDs
        """
        try:
            document_nodes = self.base_kg.get_nodes_by_type(self.document_node_type)
            return [node.get("id") for node in document_nodes]
        except Exception as e:
            logger.error(f"Error retrieving document IDs: {str(e)}")
            return []
    
    async def get_document_type_counts(self) -> Dict[str, int]:
        """
        Get counts of documents by type.
        
        Returns:
            Dictionary mapping document types to counts
        """
        try:
            document_nodes = self.base_kg.get_nodes_by_type(self.document_node_type)
            
            type_counts = {}
            for node in document_nodes:
                doc_type = node.get("properties", {}).get("document_type", "unknown")
                type_counts[doc_type] = type_counts.get(doc_type, 0) + 1
            
            return type_counts
        except Exception as e:
            logger.error(f"Error retrieving document type counts: {str(e)}")
            return {}
    
    async def get_last_validation_time(self) -> Optional[str]:
        """
        Get the timestamp of the most recent document validation.
        
        Returns:
            ISO-formatted timestamp string or None
        """
        try:
            document_nodes = self.base_kg.get_nodes_by_type(self.document_node_type)
            
            latest_time = None
            for node in document_nodes:
                validation_time = node.get("metadata", {}).get("validation_timestamp")
                if validation_time:
                    if latest_time is None or validation_time > latest_time:
                        latest_time = validation_time
            
            return latest_time
        except Exception as e:
            logger.error(f"Error retrieving last validation time: {str(e)}")
            return None
    
    async def get_documents_for_entity(self, entity_type: str, entity_id: str) -> List[str]:
        """
        Get all documents related to a specific entity.
        
        Args:
            entity_type: Type of entity (feature, milestone, etc.)
            entity_id: ID of the entity
            
        Returns:
            List of document IDs
        """
        try:
            document_ids = []
            
            # Search all edges
            for edge in self.base_kg.kg.memory.get("knowledge_graph", {}).get("edges", []):
                # Check for direct relationships (document -> entity)
                if edge.get("target") == entity_id:
                    source_id = edge.get("source")
                    source_node = self.base_kg.get_node(source_id)
                    if source_node and source_node.get("type") == self.document_node_type:
                        document_ids.append(source_id)
                
                # Check for reverse relationships (entity -> document)
                if edge.get("source") == entity_id:
                    target_id = edge.get("target")
                    target_node = self.base_kg.get_node(target_id)
                    if target_node and target_node.get("type") == self.document_node_type:
                        document_ids.append(target_id)
            
            # Remove duplicates
            document_ids = list(set(document_ids))
            
            return document_ids
        except Exception as e:
            logger.error(f"Error retrieving documents for entity: {str(e)}")
            return []
    
    async def get_context_for_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get context information for a list of entities.
        
        Args:
            entities: List of entity dictionaries with id, type, and relationship
            
        Returns:
            Dictionary of context information
        """
        try:
            context = {
                "entities": {},
                "related_documents": [],
                "concepts": []
            }
            
            # Get information for each entity
            for entity in entities:
                entity_id = entity.get("id")
                entity_type = entity.get("type", "feature")
                
                # Skip if missing ID
                if not entity_id:
                    continue
                
                # Get entity node
                entity_node = self.base_kg.get_node(entity_id)
                if not entity_node:
                    continue
                
                # Store entity information
                properties = entity_node.get("properties", {})
                context["entities"][entity_id] = {
                    "id": entity_id,
                    "type": entity_type,
                    "name": properties.get("name", ""),
                    "description": properties.get("description", ""),
                    "tags": properties.get("tags", [])
                }
                
                # Get related documents
                doc_ids = await self.get_documents_for_entity(entity_type, entity_id)
                for doc_id in doc_ids:
                    doc = await self.get_document(doc_id)
                    if doc:
                        context["related_documents"].append({
                            "id": doc.id,
                            "title": doc.metadata.title,
                            "description": doc.metadata.description,
                            "summary": doc.summary,
                            "tags": doc.metadata.tags
                        })
                
                # Get concepts/tags
                if "tags" in properties:
                    for tag in properties.get("tags", []):
                        concept_id = f"concept-{tag.lower().replace(' ', '-')}"
                        concept_node = self.base_kg.get_node(concept_id)
                        if concept_node:
                            context["concepts"].append({
                                "id": concept_id,
                                "name": tag,
                                "type": "concept"
                            })
            
            return context
        except Exception as e:
            logger.error(f"Error retrieving context for entities: {str(e)}")
            return {}
    
    async def _get_document_relationships(self, document_id: str) -> List[DocumentRelationship]:
        """
        Get all relationships for a document.
        
        Args:
            document_id: ID of the document
            
        Returns:
            List of DocumentRelationship objects
        """
        relationships = []
        
        try:
            # Find all edges where document is the source
            for edge in self.base_kg.kg.memory.get("knowledge_graph", {}).get("edges", []):
                if edge.get("source") == document_id:
                    target_id = edge.get("target")
                    target_node = self.base_kg.get_node(target_id)
                    
                    if not target_node:
                        continue
                    
                    # Determine relationship type
                    edge_type = edge.get("type", "")
                    relationship_type = "related"
                    
                    for rel_type, edge_name in self.edge_types.items():
                        if edge_type == edge_name:
                            relationship_type = rel_type
                            break
                    
                    # Create relationship
                    relationship = DocumentRelationship(
                        entity_id=target_id,
                        entity_type=target_node.get("type", "unknown"),
                        relationship_type=relationship_type,
                        metadata={
                            "name": target_node.get("properties", {}).get("name", target_id),
                            "edge_type": edge_type
                        },
                        bidirectional=edge.get("properties", {}).get("bidirectional", False),
                        strength=edge.get("properties", {}).get("strength", 1.0)
                    )
                    
                    relationships.append(relationship)
            
        except Exception as e:
            logger.error(f"Error retrieving document relationships: {str(e)}")
        
        return relationships
    
    async def _store_document_file(self, document: Document, update: bool = False) -> str:
        """
        Store document content to file system.
        
        Args:
            document: Document to store
            update: Whether this is an update operation
            
        Returns:
            Path to the stored document file
        """
        try:
            # Create consistent filename
            filename = f"document_{document.id}.txt"
            file_path = os.path.join(self.document_storage_dir, filename)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Write document content to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(document.content)
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error storing document file: {str(e)}")
            return ""

# Singleton instance
_connector_instance = None

def get_document_knowledge_graph_connector(config: Dict[str, Any] = None) -> DocumentKnowledgeGraphConnector:
    """
    Get singleton instance of DocumentKnowledgeGraphConnector.
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        DocumentKnowledgeGraphConnector instance
    """
    global _connector_instance
    if _connector_instance is None:
        _connector_instance = DocumentKnowledgeGraphConnector(config or {})
    return _connector_instance