"""
Tag Model - Data structures for document tagging

This module defines data models for representing tags and categories
for documents in the documentation management system.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional, Set

class TagType(str, Enum):
    """Type of tags"""
    CATEGORY = "category"  # High-level document category
    FEATURE = "feature"    # Related features
    MODULE = "module"      # Related modules
    DOMAIN = "domain"      # Domain-specific tag
    TECHNOLOGY = "technology"  # Technology-specific tags
    AUDIENCE = "audience"  # Target audience
    STATUS = "status"      # Document status tags
    CUSTOM = "custom"      # Custom tags
    AUTOMATIC = "automatic"  # Automatically generated tags

@dataclass
class Tag:
    """
    Represents a tag in the documentation management system.
    
    Tags are used to classify and categorize documents for better
    organization and search capabilities.
    """
    id: str
    name: str
    type: TagType
    description: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    color: Optional[str] = None  # HTML color code
    icon: Optional[str] = None   # Icon identifier
    
    # Related tags (parent/child relationships)
    parent_tags: List[str] = field(default_factory=list)
    child_tags: List[str] = field(default_factory=list)
    
    # Confidence score for automatically generated tags
    confidence: float = 1.0  # 0.0 to 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "metadata": self.metadata,
            "color": self.color,
            "icon": self.icon,
            "parent_tags": self.parent_tags,
            "child_tags": self.child_tags,
            "confidence": self.confidence
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Tag':
        """Create from dictionary"""
        tag = cls(
            id=data["id"],
            name=data["name"],
            type=TagType(data["type"]),
            description=data.get("description", ""),
            metadata=data.get("metadata", {}),
            color=data.get("color"),
            icon=data.get("icon"),
            parent_tags=data.get("parent_tags", []),
            child_tags=data.get("child_tags", []),
            confidence=data.get("confidence", 1.0)
        )
        
        if "created_at" in data:
            tag.created_at = datetime.fromisoformat(data["created_at"])
        
        if "updated_at" in data:
            tag.updated_at = datetime.fromisoformat(data["updated_at"])
            
        return tag

@dataclass
class DocumentTagAssociation:
    """
    Represents the association between a document and a tag,
    including metadata about the association.
    """
    document_id: str
    tag_id: str
    created_at: datetime = field(default_factory=datetime.now)
    confidence: float = 1.0  # 0.0 to 1.0
    source: str = "manual"  # manual, auto, imported, etc.
    user_confirmed: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "document_id": self.document_id,
            "tag_id": self.tag_id,
            "created_at": self.created_at.isoformat(),
            "confidence": self.confidence,
            "source": self.source,
            "user_confirmed": self.user_confirmed,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DocumentTagAssociation':
        """Create from dictionary"""
        assoc = cls(
            document_id=data["document_id"],
            tag_id=data["tag_id"],
            confidence=data.get("confidence", 1.0),
            source=data.get("source", "manual"),
            user_confirmed=data.get("user_confirmed", False),
            metadata=data.get("metadata", {})
        )
        
        if "created_at" in data:
            assoc.created_at = datetime.fromisoformat(data["created_at"])
            
        return assoc

@dataclass
class TagSet:
    """
    A collection of related tags that can be applied as a group.
    
    Used for predefined sets of related tags that are commonly
    used together.
    """
    id: str
    name: str
    description: str = ""
    tags: List[str] = field(default_factory=list)  # List of tag IDs
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TagSet':
        """Create from dictionary"""
        tag_set = cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            tags=data.get("tags", []),
            metadata=data.get("metadata", {})
        )
        
        if "created_at" in data:
            tag_set.created_at = datetime.fromisoformat(data["created_at"])
        
        if "updated_at" in data:
            tag_set.updated_at = datetime.fromisoformat(data["updated_at"])
            
        return tag_set

@dataclass
class TaggingSuggestion:
    """
    A suggestion for tagging a document, produced by the auto-tagging system.
    
    Includes confidence scores and can be reviewed and accepted/rejected by users.
    """
    document_id: str
    suggested_tags: List[str]  # List of tag IDs
    confidence_scores: Dict[str, float]  # tag_id -> confidence score
    created_at: datetime = field(default_factory=datetime.now)
    source: str = "auto"  # auto, similar_docs, kg_inference, etc.
    metadata: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, accepted, rejected, partial
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "document_id": self.document_id,
            "suggested_tags": self.suggested_tags,
            "confidence_scores": self.confidence_scores,
            "created_at": self.created_at.isoformat(),
            "source": self.source,
            "metadata": self.metadata,
            "status": self.status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TaggingSuggestion':
        """Create from dictionary"""
        suggestion = cls(
            document_id=data["document_id"],
            suggested_tags=data["suggested_tags"],
            confidence_scores=data["confidence_scores"],
            source=data.get("source", "auto"),
            metadata=data.get("metadata", {}),
            status=data.get("status", "pending")
        )
        
        if "created_at" in data:
            suggestion.created_at = datetime.fromisoformat(data["created_at"])
            
        return suggestion