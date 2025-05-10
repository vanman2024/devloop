"""
Tag Registry - Centralized tag management system

This module implements the TagRegistry which provides a centralized
repository for managing document tags with standardization and validation.
"""

import os
import json
import logging
import re
from typing import Dict, List, Any, Optional, Set

# Import tag models
from ..models.tag_model import Tag, TagType, TagSet

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TagRegistry:
    """
    Centralized tag registry for managing document tags.
    
    Provides functionality to register, validate, normalize, and suggest
    tags, ensuring consistency across the documentation system.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the tag registry.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Extract registry-specific configuration
        registry_config = config.get("tagging", {}).get("registry", {})
        
        # Configure registry options
        self.case_sensitive = registry_config.get("case_sensitive", False)
        self.auto_normalize = registry_config.get("auto_normalize", True)
        self.require_registration = registry_config.get("require_registration", False)
        
        # Registry storage path
        self.storage_path = registry_config.get("storage_path")
        if not self.storage_path:
            self.storage_path = os.path.join(os.path.dirname(__file__), "tag_registry.json")
        
        # Initialize registry data
        self.tags = {}  # id -> Tag
        self.tag_sets = {}  # id -> TagSet
        self.name_index = {}  # normalized name -> id
        self.category_index = {}  # category -> [id]
        
        # Normalization patterns
        self.normalization_patterns = [
            (r'[^\w\s-]', ''),  # Remove special characters
            (r'\s+', ' '),  # Replace multiple spaces with single space
            (r'_', '-'),  # Replace underscores with hyphens
        ]
        
        # Load registry data
        self._load_registry()
        
        logger.info(f"Tag registry initialized with {len(self.tags)} tags")
    
    def get_tag(self, tag_id: str) -> Optional[Tag]:
        """
        Get a tag by ID.
        
        Args:
            tag_id: Tag ID
            
        Returns:
            Tag if found, None otherwise
        """
        return self.tags.get(tag_id)
    
    def get_tag_by_name(self, name: str) -> Optional[Tag]:
        """
        Get a tag by name.
        
        Args:
            name: Tag name
            
        Returns:
            Tag if found, None otherwise
        """
        normalized_name = self.normalize_tag(name) if self.auto_normalize else name.lower()
        tag_id = self.name_index.get(normalized_name)
        if tag_id:
            return self.tags.get(tag_id)
        return None
    
    def get_tags_by_type(self, tag_type: TagType) -> List[Tag]:
        """
        Get all tags of a specific type.
        
        Args:
            tag_type: Tag type
            
        Returns:
            List of matching tags
        """
        return [tag for tag in self.tags.values() if tag.type == tag_type]
    
    def register_tag(self, tag: Tag) -> bool:
        """
        Register a new tag.
        
        Args:
            tag: Tag to register
            
        Returns:
            Success status
        """
        # Check if tag already exists
        existing_tag = self.get_tag(tag.id)
        if existing_tag:
            logger.warning(f"Tag with ID {tag.id} already exists")
            return False
        
        # Check if name is already used
        normalized_name = self.normalize_tag(tag.name) if self.auto_normalize else tag.name.lower()
        if normalized_name in self.name_index:
            logger.warning(f"Tag with name '{tag.name}' already exists")
            return False
        
        # Add tag to registry
        self.tags[tag.id] = tag
        self.name_index[normalized_name] = tag.id
        
        # Update category index
        category = tag.type.value
        if category not in self.category_index:
            self.category_index[category] = []
        self.category_index[category].append(tag.id)
        
        # Save registry
        self._save_registry()
        
        logger.info(f"Registered tag '{tag.name}' with ID {tag.id}")
        return True
    
    def update_tag(self, tag_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update an existing tag.
        
        Args:
            tag_id: ID of the tag to update
            updates: Dictionary of updates to apply
            
        Returns:
            Success status
        """
        # Check if tag exists
        tag = self.get_tag(tag_id)
        if not tag:
            logger.warning(f"Tag with ID {tag_id} not found")
            return False
        
        # Remove from indices
        old_normalized_name = self.normalize_tag(tag.name) if self.auto_normalize else tag.name.lower()
        if old_normalized_name in self.name_index:
            del self.name_index[old_normalized_name]
        
        old_category = tag.type.value
        if old_category in self.category_index and tag_id in self.category_index[old_category]:
            self.category_index[old_category].remove(tag_id)
        
        # Update tag properties
        if "name" in updates:
            tag.name = updates["name"]
        if "type" in updates:
            tag.type = updates["type"]
        if "description" in updates:
            tag.description = updates["description"]
        if "color" in updates:
            tag.color = updates["color"]
        if "icon" in updates:
            tag.icon = updates["icon"]
        if "metadata" in updates:
            tag.metadata.update(updates["metadata"])
        
        # Add to indices
        new_normalized_name = self.normalize_tag(tag.name) if self.auto_normalize else tag.name.lower()
        self.name_index[new_normalized_name] = tag_id
        
        new_category = tag.type.value
        if new_category not in self.category_index:
            self.category_index[new_category] = []
        if tag_id not in self.category_index[new_category]:
            self.category_index[new_category].append(tag_id)
        
        # Save registry
        self._save_registry()
        
        logger.info(f"Updated tag '{tag.name}' (ID: {tag_id})")
        return True
    
    def delete_tag(self, tag_id: str) -> bool:
        """
        Delete a tag from the registry.
        
        Args:
            tag_id: ID of the tag to delete
            
        Returns:
            Success status
        """
        # Check if tag exists
        tag = self.get_tag(tag_id)
        if not tag:
            logger.warning(f"Tag with ID {tag_id} not found")
            return False
        
        # Remove from indices
        normalized_name = self.normalize_tag(tag.name) if self.auto_normalize else tag.name.lower()
        if normalized_name in self.name_index:
            del self.name_index[normalized_name]
        
        category = tag.type.value
        if category in self.category_index and tag_id in self.category_index[category]:
            self.category_index[category].remove(tag_id)
        
        # Remove from tag sets
        for tag_set in self.tag_sets.values():
            if tag_id in tag_set.tags:
                tag_set.tags.remove(tag_id)
        
        # Remove tag
        del self.tags[tag_id]
        
        # Save registry
        self._save_registry()
        
        logger.info(f"Deleted tag '{tag.name}' (ID: {tag_id})")
        return True
    
    def normalize_tag(self, tag_name: str) -> str:
        """
        Normalize a tag name for consistent lookups.
        
        Args:
            tag_name: Tag name to normalize
            
        Returns:
            Normalized tag name
        """
        if not self.case_sensitive:
            tag_name = tag_name.lower()
        
        # Apply normalization patterns
        for pattern, replacement in self.normalization_patterns:
            tag_name = re.sub(pattern, replacement, tag_name)
        
        # Trim whitespace
        tag_name = tag_name.strip()
        
        return tag_name
    
    def validate_tag(self, tag_name: str) -> bool:
        """
        Validate if a tag name is valid and registered.
        
        Args:
            tag_name: Tag name to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Check if tag is empty
        if not tag_name or not tag_name.strip():
            return False
        
        # Check if tag is too long
        if len(tag_name) > 50:
            return False
        
        # Check if tag is registered (if required)
        if self.require_registration:
            normalized_name = self.normalize_tag(tag_name)
            return normalized_name in self.name_index
        
        return True
    
    def suggest_tags(self, partial_name: str, max_suggestions: int = 5) -> List[Tag]:
        """
        Suggest tags based on partial name.
        
        Args:
            partial_name: Partial tag name
            max_suggestions: Maximum number of suggestions
            
        Returns:
            List of suggested tags
        """
        partial_name = partial_name.lower()
        suggestions = []
        
        # Find tags that start with the partial name
        for tag_id, normalized_name in self.name_index.items():
            tag = self.tags.get(tag_id)
            if tag and tag.name.lower().startswith(partial_name):
                suggestions.append(tag)
                if len(suggestions) >= max_suggestions:
                    break
        
        # If we need more suggestions, find tags that contain the partial name
        if len(suggestions) < max_suggestions:
            for tag_id, normalized_name in self.name_index.items():
                tag = self.tags.get(tag_id)
                if tag and partial_name in tag.name.lower() and tag not in suggestions:
                    suggestions.append(tag)
                    if len(suggestions) >= max_suggestions:
                        break
        
        return suggestions
    
    def process_tags(self, tags: List[str], domain: str = None) -> List[str]:
        """
        Process a list of tags, normalizing and validating them.
        
        Args:
            tags: List of tag names
            domain: Optional domain context
            
        Returns:
            List of processed tag names
        """
        processed_tags = []
        
        for tag in tags:
            # Skip empty tags
            if not tag or not tag.strip():
                continue
            
            # Normalize tag
            if self.auto_normalize:
                normalized_tag = self.normalize_tag(tag)
            else:
                normalized_tag = tag
            
            # Check if tag is registered
            tag_id = self.name_index.get(normalized_tag)
            if tag_id:
                # Use canonical name from registry
                processed_tags.append(self.tags[tag_id].name)
            elif self.validate_tag(tag):
                # Use original tag if valid
                processed_tags.append(tag)
        
        # Remove duplicates
        processed_tags = list(dict.fromkeys(processed_tags))
        
        return processed_tags
    
    def get_tag_set(self, tag_set_id: str) -> Optional[TagSet]:
        """
        Get a tag set by ID.
        
        Args:
            tag_set_id: Tag set ID
            
        Returns:
            TagSet if found, None otherwise
        """
        return self.tag_sets.get(tag_set_id)
    
    def register_tag_set(self, tag_set: TagSet) -> bool:
        """
        Register a new tag set.
        
        Args:
            tag_set: Tag set to register
            
        Returns:
            Success status
        """
        # Check if tag set already exists
        if tag_set.id in self.tag_sets:
            logger.warning(f"Tag set with ID {tag_set.id} already exists")
            return False
        
        # Add tag set to registry
        self.tag_sets[tag_set.id] = tag_set
        
        # Save registry
        self._save_registry()
        
        logger.info(f"Registered tag set '{tag_set.name}' with ID {tag_set.id}")
        return True
    
    def _load_registry(self):
        """Load registry data from storage"""
        if not os.path.exists(self.storage_path):
            # Initialize with default categories if registry doesn't exist
            self._initialize_default_categories()
            return
        
        try:
            with open(self.storage_path, 'r') as f:
                data = json.load(f)
            
            # Load tags
            for tag_data in data.get("tags", []):
                tag = Tag.from_dict(tag_data)
                self.tags[tag.id] = tag
                normalized_name = self.normalize_tag(tag.name) if self.auto_normalize else tag.name.lower()
                self.name_index[normalized_name] = tag.id
                
                # Update category index
                category = tag.type.value
                if category not in self.category_index:
                    self.category_index[category] = []
                self.category_index[category].append(tag.id)
            
            # Load tag sets
            for tag_set_data in data.get("tag_sets", []):
                tag_set = TagSet.from_dict(tag_set_data)
                self.tag_sets[tag_set.id] = tag_set
            
            logger.info(f"Loaded {len(self.tags)} tags and {len(self.tag_sets)} tag sets from registry")
            
        except Exception as e:
            logger.error(f"Error loading tag registry: {e}")
            # Initialize with defaults on error
            self._initialize_default_categories()
    
    def _save_registry(self):
        """Save registry data to storage"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            
            data = {
                "tags": [tag.to_dict() for tag in self.tags.values()],
                "tag_sets": [tag_set.to_dict() for tag_set in self.tag_sets.values()]
            }
            
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
                
            logger.info(f"Saved {len(self.tags)} tags and {len(self.tag_sets)} tag sets to registry")
            
        except Exception as e:
            logger.error(f"Error saving tag registry: {e}")
    
    def _initialize_default_categories(self):
        """Initialize registry with default categories"""
        # Get predefined tags from config
        predefined_tags = self.config.get("tagging", {}).get("predefined_tags", {})
        
        for category, tags in predefined_tags.items():
            tag_type = TagType.CUSTOM
            
            # Map category to tag type
            if category.lower() == "category":
                tag_type = TagType.CATEGORY
            elif category.lower() == "feature":
                tag_type = TagType.FEATURE
            elif category.lower() == "technology":
                tag_type = TagType.TECHNOLOGY
            elif category.lower() == "audience":
                tag_type = TagType.AUDIENCE
            
            # Register tags
            for i, tag_name in enumerate(tags):
                tag_id = f"{category.lower()}-{i+1}"
                tag = Tag(
                    id=tag_id,
                    name=tag_name,
                    type=tag_type,
                    description=f"{category} tag: {tag_name}"
                )
                self.register_tag(tag)
        
        # Create a default tag set if any tags were created
        if self.tags:
            default_tag_set = TagSet(
                id="default",
                name="Default Tags",
                description="Default tag set with predefined tags",
                tags=list(self.tags.keys())
            )
            self.register_tag_set(default_tag_set)
        
        logger.info(f"Initialized registry with {len(self.tags)} default tags")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the tag registry.
        
        Returns:
            Dictionary with statistics
        """
        # Count tags by type
        type_counts = {}
        for tag in self.tags.values():
            tag_type = tag.type.value
            type_counts[tag_type] = type_counts.get(tag_type, 0) + 1
        
        # Count tag sets
        tag_set_count = len(self.tag_sets)
        
        # Get most frequently used tags in tag sets
        tag_usage = {}
        for tag_set in self.tag_sets.values():
            for tag_id in tag_set.tags:
                tag_usage[tag_id] = tag_usage.get(tag_id, 0) + 1
        
        top_tags = sorted(tag_usage.items(), key=lambda x: x[1], reverse=True)[:10]
        top_tags = [(self.tags[tag_id].name, count) if tag_id in self.tags else (tag_id, count) 
                    for tag_id, count in top_tags]
        
        return {
            "total_tags": len(self.tags),
            "total_tag_sets": tag_set_count,
            "tags_by_type": type_counts,
            "top_tags": top_tags
        }

# Singleton instance
_registry_instance = None

def get_tag_registry(config: Dict[str, Any] = None) -> TagRegistry:
    """
    Get singleton instance of TagRegistry.
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        TagRegistry instance
    """
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = TagRegistry(config or {})
    return _registry_instance