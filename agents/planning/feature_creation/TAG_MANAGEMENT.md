# Tag Management for Feature Creation Agent

This document describes the tag management system added to the Enhanced Feature Creation Agent to prevent tag proliferation.

## Overview

The tag management system provides:

1. **Tag Normalization**: Converting tags to a consistent format
2. **Tag Deduplication**: Preventing duplicate or similar tags
3. **Tag Caching**: Storing previously used tags for reuse
4. **Tag Suggestions**: Recommending tags based on feature descriptions
5. **Tag Persistence**: Storing tags in a database for long-term use

## Key Features

### Tag Normalization

The system normalizes tags by:
- Converting to lowercase
- Removing special characters
- Removing trailing periods
- Applying stemming or lemmatization when NLTK is available

```python
def normalize_tag(self, tag: str) -> str:
    """
    Normalize a tag by removing special characters, converting to lowercase,
    and applying stemming or lemmatization if available
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
```

### Tag Similarity Detection

The system identifies similar tags using:
- Exact matches after normalization
- Containment checks (one tag contained within another)
- Levenshtein distance for string similarity

```python
def is_similar(self, tag1: str, tag2: str) -> bool:
    """Check if two tags are similar"""
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
        
        # Levenshtein distance calculation...
        distance = levenshtein(norm1, norm2)
        return distance <= max_distance
    
    return False
```

### Tag Processing

The main processing function combines normalization, deduplication, and similarity checking:

```python
def process_tags(self, tags: List[str], domain: Optional[str] = None) -> List[str]:
    """
    Process a list of tags: normalize, deduplicate, find similar tags,
    and update the tag cache
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
            if all(self.normalize_tag(best_match) != normalized for tag in similar_tags):
                processed_tags.append(original)
        else:
            # No similar tags, add the original
            processed_tags.append(original)
    
    # Update the cache with the new tags
    self.batch_add_tags(processed_tags, domain)
    
    return processed_tags
```

### Tag Caching

Tags are cached for efficient reuse:

```python
def _load_cache(self):
    """Load tag cache from file or database"""
    # Check if cache exists and should be reloaded
    current_time = time.time()
    if current_time - self._last_load_time < self._cache_ttl and self._tag_cache:
        return
    
    self._last_load_time = current_time
    
    # Try to load from database first
    if self.db_connection:
        # Database loading logic...
        pass
    
    # Fall back to file cache
    if not self._tag_cache and os.path.exists(self.cache_path):
        with open(self.cache_path, 'r') as f:
            data = json.load(f)
            self._tag_cache = data.get('tags', {})
            self._tag_similarity = data.get('similarity', {})
```

### Tag Suggestions

The system can suggest tags based on text content:

```python
def suggest_tags(self, text: str, domain: Optional[str] = None, limit: int = 10) -> List[str]:
    """Suggest tags based on text content and domain"""
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
    
    # Create final suggestions...
    return suggestions
```

## Integration with Knowledge Graph

The tag management system integrates with the knowledge graph connector:

```python
# Process tags if tag manager is available
processed_tags = tags
if TAG_MANAGER_AVAILABLE:
    try:
        tag_manager = get_tag_manager()
        processed_tags = tag_manager.process_tags(tags, domain=domain)
        logger.info(f"Processed {len(tags)} tags into {len(processed_tags)} tags using tag manager")
    except Exception as e:
        logger.error(f"Error processing tags with tag manager: {e}")

for tag in processed_tags:
    # Create concept node for tag...
    # Connect feature to concept...
```

## Integration with Enhanced Core

The tag manager is initialized in the EnhancedFeatureCreationAgent:

```python
def _init_integrations(self):
    """Initialize all integrations"""
    # ...other initializations...
    
    # Initialize tag manager if available
    if 'TAG_MANAGER_AVAILABLE' in globals() and TAG_MANAGER_AVAILABLE:
        self.tag_manager = get_tag_manager()
        logger.info("Tag manager initialized")
    else:
        self.tag_manager = None
        logger.info("Tag manager not available")
```

And used during feature processing:

```python
# Process tags if tag manager is available
if hasattr(self, 'tag_manager') and self.tag_manager:
    try:
        combined_tags = self.tag_manager.process_tags(combined_tags, domain=analysis_result['domain'])
        logger.info(f"Processed {len(combined_tags)} tags using tag manager")
    except Exception as e:
        logger.error(f"Error processing tags with tag manager: {e}")
```

## Persistence Options

The system supports multiple persistence options:

1. **File-based Cache**: Stores tags in a JSON file
2. **Database Integration**: Optional database connection for tag storage
3. **In-memory Cache**: Fast access to recently used tags

## Benefits

1. **Reduced Tag Proliferation**: Prevents creation of thousands of similar tags
2. **Improved Semantics**: Creates a more coherent concept hierarchy in the knowledge graph
3. **Better Feature Discovery**: Consistent tags make finding related features easier
4. **Efficient Storage**: Reduces storage requirements by avoiding duplicate concepts
5. **Domain-Specific Tags**: Tags are organized by domain for better categorization

## Example Usage

```python
# Initialize tag manager
tag_manager = get_tag_manager()

# Process tags
tags = ["UI", "user interface", "visualization", "dashboard"]
processed_tags = tag_manager.process_tags(tags, domain="ui")
# Result: ["UI", "dashboard", "visualization"]  (deduplicates "UI" and "user interface")

# Suggest tags for a description
description = "Create a dashboard for visualizing data with interactive charts"
suggested_tags = tag_manager.suggest_tags(description, domain="ui")
# Result: ["dashboard", "visualization", "interactive", "charts", "UI"]
```

## Enhanced Feature Creation Example

```python
# Get tags from LLM analysis
suggested_tags = ["UI", "visualization", "interface", "dashboard", "interactive"]

# Get user-provided tags
user_tags = ["data-visualization", "charts", "ui-component"]

# Combine and process
combined_tags = list(set(user_tags + suggested_tags))
processed_tags = tag_manager.process_tags(combined_tags, domain="ui")
# Result: ["UI", "charts", "dashboard", "interactive", "visualization"]  (deduplicating similar tags)
```