"""
Document Model - Data structures for document representation

This module defines the core data models for representing documents and their
metadata in the documentation management system.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum

class DocumentType(str, Enum):
    """Enum for document types"""
    MARKDOWN = "markdown"
    PDF = "pdf"
    HTML = "html"
    WORD = "word"
    JUPYTER = "jupyter"
    TEXT = "text"
    API_SPEC = "api_spec"
    CODE = "code"
    UNKNOWN = "unknown"

class DocumentStatus(str, Enum):
    """Enum for document status"""
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"

@dataclass
class Chunk:
    """Represents a chunk of document content for semantic processing"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    content: str = ""
    start_char: int = 0
    end_char: int = 0
    embedding: List[float] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DocumentMetadata:
    """Metadata for a document"""
    title: str = ""
    description: str = ""
    authors: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    document_type: DocumentType = DocumentType.UNKNOWN
    status: DocumentStatus = DocumentStatus.DRAFT
    version: str = "1.0.0"
    tags: List[str] = field(default_factory=list)
    source_path: str = ""
    language: str = "en"
    word_count: int = 0
    reading_time_minutes: float = 0
    avg_readability_score: float = 0
    custom_metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DocumentRelationship:
    """Represents a relationship between a document and another entity"""
    entity_id: str
    entity_type: str  # feature, milestone, roadmap_item, document, etc.
    relationship_type: str  # documents, references, extends, etc.
    metadata: Dict[str, Any] = field(default_factory=dict)
    bidirectional: bool = False
    strength: float = 1.0  # Relationship strength (0.0 to 1.0)

@dataclass
class Document:
    """
    Represents a document in the documentation management system.
    
    Includes metadata, content, chunked representation for vector search,
    and relationships to other entities in the knowledge graph.
    """
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    metadata: DocumentMetadata = field(default_factory=DocumentMetadata)
    content: str = ""
    raw_content: bytes = field(default=b"")
    chunks: List[Chunk] = field(default_factory=list)
    relationships: List[DocumentRelationship] = field(default_factory=list)
    validation_results: Any = None  # Will be of type ValidationResult
    embedding: List[float] = field(default_factory=list)
    vector_id: str = ""  # ID in the vector store
    
    def __post_init__(self):
        """Initialize any missing fields with defaults"""
        if not self.vector_id and self.id:
            self.vector_id = f"doc_{self.id}"
    
    @property
    def is_valid(self) -> bool:
        """Check if document is valid based on validation results"""
        if not self.validation_results:
            return False
        return self.validation_results.is_valid
    
    @property
    def summary(self) -> str:
        """Get a short summary of the document"""
        return self.metadata.description or (self.content[:250] + "..." if len(self.content) > 250 else self.content)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert document to dictionary for serialization"""
        result = {
            "id": self.id,
            "metadata": {
                "title": self.metadata.title,
                "description": self.metadata.description,
                "authors": self.metadata.authors,
                "created_at": self.metadata.created_at.isoformat(),
                "updated_at": self.metadata.updated_at.isoformat(),
                "document_type": self.metadata.document_type.value,
                "status": self.metadata.status.value,
                "version": self.metadata.version,
                "tags": self.metadata.tags,
                "source_path": self.metadata.source_path,
                "language": self.metadata.language,
                "word_count": self.metadata.word_count,
                "reading_time_minutes": self.metadata.reading_time_minutes,
                "avg_readability_score": self.metadata.avg_readability_score,
                "custom_metadata": self.metadata.custom_metadata
            },
            "relationships": [
                {
                    "entity_id": rel.entity_id,
                    "entity_type": rel.entity_type,
                    "relationship_type": rel.relationship_type,
                    "metadata": rel.metadata,
                    "bidirectional": rel.bidirectional,
                    "strength": rel.strength
                }
                for rel in self.relationships
            ],
            "vector_id": self.vector_id,
            "is_valid": self.is_valid,
            "summary": self.summary
        }
        
        # Only include content in dictionary if it's not too large
        if len(self.content) < 10000:  # Limit to 10KB
            result["content"] = self.content
        else:
            result["content"] = f"{self.content[:5000]}...{self.content[-5000:]}"
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Document':
        """Create document from dictionary"""
        metadata = DocumentMetadata(
            title=data["metadata"].get("title", ""),
            description=data["metadata"].get("description", ""),
            authors=data["metadata"].get("authors", []),
            created_at=datetime.fromisoformat(data["metadata"].get("created_at", datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data["metadata"].get("updated_at", datetime.now().isoformat())),
            document_type=DocumentType(data["metadata"].get("document_type", DocumentType.UNKNOWN.value)),
            status=DocumentStatus(data["metadata"].get("status", DocumentStatus.DRAFT.value)),
            version=data["metadata"].get("version", "1.0.0"),
            tags=data["metadata"].get("tags", []),
            source_path=data["metadata"].get("source_path", ""),
            language=data["metadata"].get("language", "en"),
            word_count=data["metadata"].get("word_count", 0),
            reading_time_minutes=data["metadata"].get("reading_time_minutes", 0),
            avg_readability_score=data["metadata"].get("avg_readability_score", 0),
            custom_metadata=data["metadata"].get("custom_metadata", {})
        )
        
        relationships = [
            DocumentRelationship(
                entity_id=rel.get("entity_id", ""),
                entity_type=rel.get("entity_type", ""),
                relationship_type=rel.get("relationship_type", ""),
                metadata=rel.get("metadata", {}),
                bidirectional=rel.get("bidirectional", False),
                strength=rel.get("strength", 1.0)
            )
            for rel in data.get("relationships", [])
        ]
        
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            metadata=metadata,
            content=data.get("content", ""),
            relationships=relationships,
            vector_id=data.get("vector_id", "")
        )