#!/usr/bin/env python3
"""
Tag Management for Feature Creation Agent

This module provides tag normalization, caching, and deduplication
to prevent tag proliferation in the knowledge graph.
"""

import os
import sys
import json
import logging
import re
from typing import List, Dict, Any, Set, Optional
import time

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'tag_management.log'))
    ]
)
logger = logging.getLogger('tag_management')

try:
    # Try to import nltk for better text normalization
    import nltk
    import zipfile  # Add this import for BadZipFile exception
    from nltk.stem import WordNetLemmatizer
    from nltk.corpus import stopwords
    
    # Set NLTK data path to project directory to avoid permission issues
    nltk_data_path = os.path.join(PROJECT_ROOT, 'nltk_data')
    os.makedirs(nltk_data_path, exist_ok=True)
    nltk.data.path.insert(0, nltk_data_path)
    
    # Download required resources if not already downloaded
    try:
        # Try to find the resources in our custom path first
        nltk.data.find('corpora/wordnet')
    except (LookupError, zipfile.BadZipFile) as e:
        # Download to our custom path
        try:
            nltk.download('wordnet', download_dir=nltk_data_path)
            logger.info(f"Downloaded wordnet to {nltk_data_path}")
        except Exception as e2:
            logger.warning(f"Failed to download wordnet: {str(e2)}")
    
    try:
        nltk.data.find('corpora/stopwords')
    except (LookupError, zipfile.BadZipFile) as e:
        try:
            nltk.download('stopwords', download_dir=nltk_data_path)
            logger.info(f"Downloaded stopwords to {nltk_data_path}")
        except Exception as e2:
            logger.warning(f"Failed to download stopwords: {str(e2)}")
    
    # Only enable NLTK if we can actually initialize the components
    try:
        lemmatizer = WordNetLemmatizer()
        stop_words = set(stopwords.words('english'))
        NLTK_AVAILABLE = True
        logger.info("NLTK successfully initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize NLTK components: {str(e)}")
        NLTK_AVAILABLE = False
    
except ImportError:
    logger.warning("NLTK not available - using simple normalization")
    NLTK_AVAILABLE = False


class TagManager:
    """
    Tag Manager for Feature Creation Agent
    
    Provides tag normalization, caching, and deduplication
    to prevent tag proliferation in the knowledge graph.
    """
    
    def __init__(self, cache_path: Optional[str] = None, db_connection = None):
        """
        Initialize the tag manager
        
        Args:
            cache_path: Path to the tag cache file
            db_connection: Database connection for tag storage (if available)
        """
        self.cache_path = cache_path or os.path.expanduser("~/.devloop/sdk/storage/tag_cache.json")
        self.db_connection = db_connection
        
        # Make sure the directory exists
        os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)
        
        # In-memory tag cache
        self._tag_cache = {}
        self._tag_similarity = {}
        self._last_load_time = 0
        self._cache_ttl = 60  # Reload cache every 60 seconds
        
        # Load the tag cache
        self._load_cache()
    
    def _load_cache(self):
        """Load tag cache from file or database"""
        # Check if cache exists and should be reloaded
        current_time = time.time()
        if current_time - self._last_load_time < self._cache_ttl and self._tag_cache:
            return
        
        self._last_load_time = current_time
        
        # Try to load from database first
        if self.db_connection:
            try:
                # Implementation depends on database type
                # Example for MongoDB:
                # tags = self.db_connection.tags.find()
                # self._tag_cache = {tag['normalized']: tag for tag in tags}
                pass
            except Exception as e:
                logger.error(f"Error loading tags from database: {e}")
        
        # Fall back to file cache
        if not self._tag_cache and os.path.exists(self.cache_path):
            try:
                with open(self.cache_path, 'r') as f:
                    data = json.load(f)
                    self._tag_cache = data.get('tags', {})
                    self._tag_similarity = data.get('similarity', {})
                logger.info(f"Loaded {len(self._tag_cache)} tags from cache")
            except Exception as e:
                logger.error(f"Error loading tag cache: {e}")
                self._tag_cache = {}
                self._tag_similarity = {}
    
    def _save_cache(self):
        """Save tag cache to file and database"""
        # Save to file
        try:
            with open(self.cache_path, 'w') as f:
                json.dump({
                    'tags': self._tag_cache,
                    'similarity': self._tag_similarity,
                    'updated_at': time.time()
                }, f, indent=2)
            logger.info(f"Saved {len(self._tag_cache)} tags to cache")
        except Exception as e:
            logger.error(f"Error saving tag cache: {e}")
        
        # Save to database if available
        if self.db_connection:
            try:
                # Implementation depends on database type
                # Example for MongoDB:
                # for normalized, tag in self._tag_cache.items():
                #     self.db_connection.tags.update_one(
                #         {'normalized': normalized},
                #         {'$set': tag},
                #         upsert=True
                #     )
                pass
            except Exception as e:
                logger.error(f"Error saving tags to database: {e}")
    
    def normalize_tag(self, tag: str) -> str:
        """
        Normalize a tag by removing special characters, converting to lowercase,
        and applying stemming or lemmatization if available
        
        Args:
            tag: The tag to normalize
            
        Returns:
            Normalized tag
        """
        # Remove special characters and convert to lowercase
        normalized = re.sub(r'[^\w\s]', '', tag.lower())
        normalized = normalized.strip()
        
        # Remove periods at the end (common in extracted concepts)
        normalized = normalized.rstrip('.')
        
        # Apply lemmatization if NLTK is available
        if NLTK_AVAILABLE:
            # Skip stop words
            if normalized in stop_words:
                return normalized
            
            # Lemmatize
            normalized = lemmatizer.lemmatize(normalized)
        
        return normalized
    
    def is_similar(self, tag1: str, tag2: str) -> bool:
        """
        Check if two tags are similar
        
        Args:
            tag1: First tag
            tag2: Second tag
            
        Returns:
            True if tags are similar, False otherwise
        """
        # Normalize tags
        norm1 = self.normalize_tag(tag1)
        norm2 = self.normalize_tag(tag2)
        
        # Check if they're the same after normalization
        if norm1 == norm2:
            return True
        
        # Check if one is contained in the other
        if norm1 in norm2 or norm2 in norm1:
            return True
        
        # Check Levenshtein distance (string edit distance)
        if len(norm1) > 3 and len(norm2) > 3:
            # For longer tags, allow more distance
            max_distance = min(len(norm1), len(norm2)) // 3
            
            # Simple Levenshtein distance
            def levenshtein(s1, s2):
                if len(s1) < len(s2):
                    return levenshtein(s2, s1)
                
                if len(s2) == 0:
                    return len(s1)
                
                previous_row = range(len(s2) + 1)
                for i, c1 in enumerate(s1):
                    current_row = [i + 1]
                    for j, c2 in enumerate(s2):
                        insertions = previous_row[j + 1] + 1
                        deletions = current_row[j] + 1
                        substitutions = previous_row[j] + (c1 != c2)
                        current_row.append(min(insertions, deletions, substitutions))
                    previous_row = current_row
                
                return previous_row[-1]
            
            distance = levenshtein(norm1, norm2)
            return distance <= max_distance
        
        return False
    
    def get_similar_tags(self, tag: str) -> List[str]:
        """
        Get similar existing tags
        
        Args:
            tag: The tag to find similar tags for
            
        Returns:
            List of similar tags
        """
        # Normalize the tag
        normalized = self.normalize_tag(tag)
        
        # Check cache for similar tags
        if normalized in self._tag_similarity:
            return self._tag_similarity[normalized]
        
        # Find similar tags
        similar_tags = []
        for existing_tag in self._tag_cache.keys():
            if self.is_similar(normalized, existing_tag):
                similar_tags.append(self._tag_cache[existing_tag]['original'])
        
        # Cache the result
        self._tag_similarity[normalized] = similar_tags
        
        return similar_tags
    
    def add_tag(self, tag: str, domain: Optional[str] = None, count: int = 1) -> str:
        """
        Add a tag to the cache and return the normalized form
        
        Args:
            tag: The tag to add
            domain: Optional domain the tag belongs to
            count: Initial count for the tag
            
        Returns:
            Normalized tag
        """
        # Normalize the tag
        normalized = self.normalize_tag(tag)
        
        # Skip empty tags
        if not normalized:
            return ""
        
        # Update or create tag entry
        if normalized in self._tag_cache:
            # Update existing tag
            self._tag_cache[normalized]['count'] += count
            if domain and domain not in self._tag_cache[normalized]['domains']:
                self._tag_cache[normalized]['domains'].append(domain)
        else:
            # Create new tag entry
            self._tag_cache[normalized] = {
                'original': tag,
                'normalized': normalized,
                'count': count,
                'domains': [domain] if domain else [],
                'created_at': time.time()
            }
        
        # Save the cache
        self._save_cache()
        
        return normalized
    
    def batch_add_tags(self, tags: List[str], domain: Optional[str] = None) -> List[str]:
        """
        Add multiple tags to the cache and return normalized forms
        
        Args:
            tags: The tags to add
            domain: Optional domain the tags belong to
            
        Returns:
            List of normalized tags
        """
        normalized_tags = []
        
        for tag in tags:
            normalized = self.add_tag(tag, domain)
            if normalized:
                normalized_tags.append(normalized)
        
        return normalized_tags
    
    def get_top_tags(self, domain: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get the most frequently used tags
        
        Args:
            domain: Optional domain to filter by
            limit: Maximum number of tags to return
            
        Returns:
            List of tag objects
        """
        # Load the latest cache
        self._load_cache()
        
        # Filter by domain if provided
        if domain:
            filtered_tags = [tag for tag in self._tag_cache.values() if domain in tag.get('domains', [])]
        else:
            filtered_tags = list(self._tag_cache.values())
        
        # Sort by count
        sorted_tags = sorted(filtered_tags, key=lambda x: x.get('count', 0), reverse=True)
        
        # Return top N
        return sorted_tags[:limit]
    
    def suggest_tags(self, text: str, domain: Optional[str] = None, limit: int = 10) -> List[str]:
        """
        Suggest tags based on text content and domain
        
        Args:
            text: The text to extract tags from
            domain: Optional domain to filter suggestions
            limit: Maximum number of suggestions
            
        Returns:
            List of suggested tags
        """
        # For now, we'll use a simple approach
        # Extract words and match against existing tags
        
        # Tokenize the text
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Get domain-specific tags
        top_tags = self.get_top_tags(domain=domain, limit=100)
        top_tag_values = [tag['original'] for tag in top_tags]
        
        # Score each tag based on word matches
        tag_scores = {}
        for tag in top_tag_values:
            tag_words = re.findall(r'\b\w+\b', tag.lower())
            score = sum(1 for word in tag_words if word in words)
            if score > 0:
                tag_scores[tag] = score
        
        # Get tags from normalized words
        additional_tags = []
        for word in words:
            if len(word) > 3:  # Skip short words
                normalized = self.normalize_tag(word)
                if normalized in self._tag_cache:
                    additional_tags.append(self._tag_cache[normalized]['original'])
        
        # Create the final suggestions
        suggestions = []
        
        # Add the top scored tags
        scored_tags = sorted(tag_scores.items(), key=lambda x: x[1], reverse=True)
        suggestions.extend([tag for tag, score in scored_tags[:limit]])
        
        # Add additional tags
        remaining_slots = limit - len(suggestions)
        if remaining_slots > 0:
            for tag in additional_tags:
                if tag not in suggestions:
                    suggestions.append(tag)
                    remaining_slots -= 1
                    if remaining_slots <= 0:
                        break
        
        return suggestions
    
    def process_tags(self, tags: List[str], domain: Optional[str] = None) -> List[str]:
        """
        Process a list of tags: normalize, deduplicate, find similar tags,
        and update the tag cache
        
        Args:
            tags: The tags to process
            domain: Optional domain the tags belong to
            
        Returns:
            Processed list of tags
        """
        # Load the latest cache
        self._load_cache()
        
        processed_tags = []
        normalized_map = {}
        
        # First pass: normalize and create a map
        for tag in tags:
            normalized = self.normalize_tag(tag)
            if normalized:
                normalized_map[normalized] = tag
        
        # Second pass: deduplicate and find similar tags
        for normalized, original in normalized_map.items():
            # Check if we already have a similar tag
            similar_tags = self.get_similar_tags(normalized)
            
            if similar_tags:
                # Use the most common similar tag
                best_match = similar_tags[0]
                if best_match not in processed_tags:
                    processed_tags.append(best_match)
                
                # Add the new tag as well if it's different enough
                # This preserves variants like "UI" and "User Interface"
                if all(self.normalize_tag(best_match) != normalized for tag in similar_tags):
                    processed_tags.append(original)
            else:
                # No similar tags, add the original
                processed_tags.append(original)
        
        # Update the cache with the new tags
        self.batch_add_tags(processed_tags, domain)
        
        return processed_tags


# Singleton instance of the tag manager
_tag_manager_instance = None

def get_tag_manager() -> TagManager:
    """
    Get the singleton instance of the tag manager
    
    Returns:
        TagManager instance
    """
    global _tag_manager_instance
    if _tag_manager_instance is None:
        _tag_manager_instance = TagManager()
    return _tag_manager_instance


# Example usage
if __name__ == "__main__":
    tag_manager = get_tag_manager()
    
    # Add some sample tags
    tag_manager.add_tag("UI", domain="ui")
    tag_manager.add_tag("User Interface", domain="ui")
    tag_manager.add_tag("Frontend", domain="ui")
    tag_manager.add_tag("Dashboard", domain="ui")
    tag_manager.add_tag("Data Visualization", domain="data")
    tag_manager.add_tag("visualize", domain="data")
    tag_manager.add_tag("interactive", domain="ui")
    
    # Test normalization
    print("Normalized tags:")
    print(f"UI -> {tag_manager.normalize_tag('UI')}")
    print(f"user-interface -> {tag_manager.normalize_tag('user-interface')}")
    print(f"Visualization. -> {tag_manager.normalize_tag('Visualization.')}")
    
    # Test similar tags
    print("\nSimilar tags:")
    print(f"UI similar to: {tag_manager.get_similar_tags('UI')}")
    print(f"visualization similar to: {tag_manager.get_similar_tags('visualization')}")
    
    # Test tag processing
    tags = ["UI", "user interface", "visualize", "dashboard", "visual", "interactive", "data-analysis"]
    processed = tag_manager.process_tags(tags, domain="ui")
    print(f"\nProcessed tags: {processed}")
    
    # Test tag suggestions
    text = "Create a dashboard for visualizing user data with interactive charts and filters"
    suggestions = tag_manager.suggest_tags(text, domain="ui")
    print(f"\nSuggested tags for '{text}': {suggestions}")
    
    # Test top tags
    top_tags = tag_manager.get_top_tags(domain="ui")
    print("\nTop UI tags:")
    for tag in top_tags:
        print(f"  - {tag['original']} (count: {tag['count']})")