"""
Auto-Tagging Agent - ML-based document tagging

This module implements the AutoTaggingAgent which uses machine learning
techniques to automatically tag documents based on their content.
"""

import os
import re
import logging
import asyncio
from typing import Dict, List, Any, Optional, Set, Tuple

# Import document models
from ..models.document_model import Document, DocumentMetadata
from ..models.tag_model import Tag, TagType, DocumentTagAssociation, TaggingSuggestion

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AutoTaggingAgent:
    """
    Auto-tagging agent for ML-based document tagging.
    
    Uses various techniques including LLM prompting, keyword extraction,
    and similarity analysis to automatically generate tags for documents.
    """
    
    def __init__(self, config: Dict[str, Any], llm_connector=None, knowledge_graph=None, vector_store=None):
        """
        Initialize the auto-tagging agent.
        
        Args:
            config: Configuration dictionary
            llm_connector: LLM service connector
            knowledge_graph: Knowledge graph connector
            vector_store: Vector store connector
        """
        self.config = config
        self.llm_connector = llm_connector
        self.kg = knowledge_graph
        self.vector_store = vector_store
        
        # Extract tagging-specific configuration
        tagging_config = config.get("tagging", {})
        
        # Configure tagging options
        self.min_confidence = tagging_config.get("min_confidence", 0.7)
        self.max_tags = tagging_config.get("max_tags", 10)
        self.tag_registry_enabled = tagging_config.get("use_tag_registry", True)
        
        # Tag registry for controlling available tags
        self.tag_registry = {}
        if self.tag_registry_enabled:
            self._load_tag_registry()
        
        logger.info("Auto-tagging agent initialized")
    
    async def tag_document(self, document: Document) -> TaggingSuggestion:
        """
        Generate tags for a document.
        
        Args:
            document: Document to tag
            
        Returns:
            Tagging suggestion
        """
        logger.info(f"Generating tags for document: {document.id}")
        
        # Initialize tagging suggestion
        suggestion = TaggingSuggestion(
            document_id=document.id,
            suggested_tags=[],
            confidence_scores={},
            source="auto",
            status="pending"
        )
        
        # Combine multiple tagging methods
        tagging_results = await asyncio.gather(
            self._generate_llm_tags(document),
            self._extract_keyword_tags(document),
            self._find_similar_document_tags(document)
        )
        
        # Merge results
        all_tags = {}
        for method_tags, method_scores, method_name in tagging_results:
            for tag in method_tags:
                if tag in all_tags:
                    # Update with higher confidence if available
                    if method_scores[tag] > all_tags[tag]["score"]:
                        all_tags[tag] = {
                            "score": method_scores[tag],
                            "source": method_name
                        }
                else:
                    all_tags[tag] = {
                        "score": method_scores[tag],
                        "source": method_name
                    }
        
        # Filter tags by confidence and registry
        filtered_tags = []
        filtered_scores = {}
        
        for tag, info in all_tags.items():
            # Skip low confidence tags
            if info["score"] < self.min_confidence:
                continue
            
            # Check tag registry if enabled
            if self.tag_registry_enabled:
                # Check if tag exists in registry or add it
                normalized_tag = tag.lower().strip()
                if normalized_tag in self.tag_registry:
                    # Use canonical tag name from registry
                    canonical_tag = self.tag_registry[normalized_tag]["name"]
                    filtered_tags.append(canonical_tag)
                    filtered_scores[canonical_tag] = info["score"]
                else:
                    # Add new tag to registry if allowed
                    if self.config.get("tagging", {}).get("add_new_tags", True):
                        self._add_to_tag_registry(tag, {
                            "source": info["source"],
                            "created_by": "auto_tagging_agent"
                        })
                        filtered_tags.append(tag)
                        filtered_scores[tag] = info["score"]
            else:
                # No registry, add all tags
                filtered_tags.append(tag)
                filtered_scores[tag] = info["score"]
        
        # Limit number of tags
        if len(filtered_tags) > self.max_tags:
            # Sort by confidence score
            sorted_tags = sorted(filtered_tags, key=lambda t: filtered_scores[t], reverse=True)
            filtered_tags = sorted_tags[:self.max_tags]
            filtered_scores = {tag: filtered_scores[tag] for tag in filtered_tags}
        
        # Update suggestion
        suggestion.suggested_tags = filtered_tags
        suggestion.confidence_scores = filtered_scores
        suggestion.metadata["tag_sources"] = {tag: all_tags[tag]["source"] for tag in filtered_tags if tag in all_tags}
        
        logger.info(f"Generated {len(filtered_tags)} tags for document {document.id}")
        return suggestion
    
    async def apply_tagging_suggestion(self, document: Document, suggestion: TaggingSuggestion) -> Document:
        """
        Apply a tagging suggestion to a document.
        
        Args:
            document: Document to tag
            suggestion: Tagging suggestion to apply
            
        Returns:
            Updated document
        """
        logger.info(f"Applying tagging suggestion to document: {document.id}")
        
        # Update document tags
        document.metadata.tags = list(set(document.metadata.tags + suggestion.suggested_tags))
        
        # Create tag associations if knowledge graph is available
        if self.kg:
            for tag in suggestion.suggested_tags:
                tag_id = f"tag-{tag.lower().replace(' ', '-')}"
                
                # Create tag association
                association = DocumentTagAssociation(
                    document_id=document.id,
                    tag_id=tag_id,
                    confidence=suggestion.confidence_scores.get(tag, 1.0),
                    source=suggestion.source,
                    user_confirmed=False
                )
                
                # Store association in knowledge graph
                await self.kg.add_document_tag_association(association)
        
        # Update suggestion status
        suggestion.status = "accepted"
        
        logger.info(f"Applied {len(suggestion.suggested_tags)} tags to document {document.id}")
        return document
    
    async def batch_tag_documents(self, documents: List[Document]) -> Dict[str, TaggingSuggestion]:
        """
        Generate tags for multiple documents.
        
        Args:
            documents: List of documents to tag
            
        Returns:
            Dictionary mapping document IDs to tagging suggestions
        """
        logger.info(f"Batch tagging {len(documents)} documents")
        
        tagging_tasks = []
        for document in documents:
            task = asyncio.create_task(self.tag_document(document))
            tagging_tasks.append((document.id, task))
        
        # Wait for all tagging tasks to complete
        suggestions = {}
        for doc_id, task in tagging_tasks:
            try:
                suggestions[doc_id] = await task
            except Exception as e:
                logger.error(f"Error tagging document {doc_id}: {e}")
                # Create empty suggestion for failed documents
                suggestions[doc_id] = TaggingSuggestion(
                    document_id=doc_id,
                    suggested_tags=[],
                    confidence_scores={},
                    source="auto",
                    status="error",
                    metadata={"error": str(e)}
                )
        
        logger.info(f"Completed batch tagging for {len(suggestions)} documents")
        return suggestions
    
    async def _generate_llm_tags(self, document: Document) -> Tuple[List[str], Dict[str, float], str]:
        """
        Generate tags using LLM.
        
        Args:
            document: Document to tag
            
        Returns:
            Tuple of (tags, confidence scores, method name)
        """
        if not self.llm_connector:
            return [], {}, "llm"
        
        try:
            # Prepare document content for analysis
            title = document.metadata.title
            description = document.metadata.description
            
            # Limit content size
            content_preview = document.content[:5000]
            
            # Check if document already has tags
            existing_tags = document.metadata.tags
            
            # Generate prompt
            prompt = f"""
            Please analyze this document and suggest relevant tags that categorize its content.
            
            Document Title: {title}
            Description: {description}
            
            Content Preview:
            {content_preview}
            
            {f"Existing tags: {', '.join(existing_tags)}" if existing_tags else ""}
            
            Generate 5-10 relevant tags that accurately describe this document's content, purpose, and domain.
            Tags should be single words or short phrases (1-3 words).
            Return only a comma-separated list of tags, nothing else.
            """
            
            # Generate tags using LLM
            response = await self.llm_connector.generate_text(prompt)
            
            # Parse response
            tags = []
            confidence_scores = {}
            
            if response:
                # Split by commas and clean up
                raw_tags = [tag.strip() for tag in response.split(',')]
                
                # Filter and clean tags
                for tag in raw_tags:
                    if tag and 1 <= len(tag.split()) <= 3:
                        clean_tag = tag.strip()
                        tags.append(clean_tag)
                        # Assign confidence based on position (first tags are usually more relevant)
                        confidence = max(0.95 - 0.02 * raw_tags.index(tag), 0.7)
                        confidence_scores[clean_tag] = confidence
            
            return tags, confidence_scores, "llm"
            
        except Exception as e:
            logger.error(f"Error generating LLM tags: {e}")
            return [], {}, "llm"
    
    async def _extract_keyword_tags(self, document: Document) -> Tuple[List[str], Dict[str, float], str]:
        """
        Extract keyword tags from document content.
        
        Args:
            document: Document to tag
            
        Returns:
            Tuple of (tags, confidence scores, method name)
        """
        try:
            tags = []
            confidence_scores = {}
            
            # Get document content
            content = document.content
            title = document.metadata.title
            
            # Extract keywords using TF-IDF approach
            # In a real implementation, this would use proper NLP libraries
            # Here we use a simplified approach
            
            # 1. Clean and tokenize
            content = re.sub(r'```.*?```', '', content, flags=re.DOTALL)  # Remove code blocks
            content = re.sub(r'`[^`]+`', '', content)  # Remove inline code
            content = re.sub(r'[^\w\s]', ' ', content)  # Remove punctuation
            
            words = [word.lower() for word in content.split() if len(word) > 3]
            
            # 2. Count word frequencies
            word_counts = {}
            for word in words:
                word_counts[word] = word_counts.get(word, 0) + 1
            
            # 3. Remove common stop words
            stop_words = {"the", "and", "this", "that", "with", "from", "for", "have", "has", "had", 
                         "not", "but", "what", "all", "are", "was", "were", "when", "where", "while", "then"}
            word_counts = {word: count for word, count in word_counts.items() if word not in stop_words}
            
            # 4. Sort by frequency
            sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
            
            # 5. Extract top N single-word tags
            single_word_tags = [word for word, _ in sorted_words[:15]]
            
            # 6. Find common 2-3 word phrases (simple approach)
            text = ' '.join(words)
            ngrams = []
            
            # Extract 2-grams
            for i in range(len(words) - 1):
                if words[i] not in stop_words and words[i+1] not in stop_words:
                    ngram = f"{words[i]} {words[i+1]}"
                    ngrams.append(ngram)
            
            # Extract 3-grams
            for i in range(len(words) - 2):
                if words[i] not in stop_words and words[i+2] not in stop_words:
                    ngram = f"{words[i]} {words[i+1]} {words[i+2]}"
                    ngrams.append(ngram)
            
            # Count n-gram frequencies
            ngram_counts = {}
            for ngram in ngrams:
                ngram_counts[ngram] = ngram_counts.get(ngram, 0) + 1
            
            # Sort by frequency
            sorted_ngrams = sorted(ngram_counts.items(), key=lambda x: x[1], reverse=True)
            
            # Extract top N multi-word tags
            multi_word_tags = [ngram for ngram, _ in sorted_ngrams[:10]]
            
            # Combine tags and add confidence scores
            for i, tag in enumerate(single_word_tags[:5]):
                tags.append(tag)
                confidence_scores[tag] = 0.9 - (i * 0.02)
            
            for i, tag in enumerate(multi_word_tags[:5]):
                tags.append(tag)
                confidence_scores[tag] = 0.85 - (i * 0.02)
            
            # Add title words as high-confidence tags
            title_words = [word.lower() for word in title.split() if len(word) > 3 and word.lower() not in stop_words]
            for word in title_words:
                if word not in tags:
                    tags.append(word)
                    confidence_scores[word] = 0.95
            
            return tags, confidence_scores, "keyword"
            
        except Exception as e:
            logger.error(f"Error extracting keyword tags: {e}")
            return [], {}, "keyword"
    
    async def _find_similar_document_tags(self, document: Document) -> Tuple[List[str], Dict[str, float], str]:
        """
        Find tags from similar documents.
        
        Args:
            document: Document to tag
            
        Returns:
            Tuple of (tags, confidence scores, method name)
        """
        if not self.vector_store or not self.kg:
            return [], {}, "similarity"
        
        try:
            tags = []
            confidence_scores = {}
            
            # Create document embedding
            embedding = document.embedding
            if not embedding and self.llm_connector:
                # Generate embedding for document
                content_for_embedding = f"{document.metadata.title}\n{document.metadata.description}\n{document.content[:1000]}"
                embedding = await self.llm_connector.create_embedding(content_for_embedding)
            
            if not embedding:
                return [], {}, "similarity"
            
            # Find similar documents
            similar_doc_ids = await self.vector_store.search(embedding, k=5)
            
            # Get tags from similar documents
            tag_counts = {}
            
            for doc_id in similar_doc_ids:
                if doc_id == document.id:
                    continue  # Skip self
                
                # Get document tags
                similar_doc = await self.kg.get_document(doc_id)
                if similar_doc:
                    similar_tags = similar_doc.metadata.tags
                    for tag in similar_tags:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
            # Calculate confidence based on frequency
            total_docs = len(similar_doc_ids)
            if total_docs > 0:
                for tag, count in tag_counts.items():
                    tags.append(tag)
                    # Higher confidence for tags that appear in more documents
                    confidence_scores[tag] = 0.7 + (0.25 * count / total_docs)
            
            return tags, confidence_scores, "similarity"
            
        except Exception as e:
            logger.error(f"Error finding similar document tags: {e}")
            return [], {}, "similarity"
    
    def _load_tag_registry(self):
        """Load tag registry from configuration or storage"""
        registry_path = self.config.get("tagging", {}).get("registry_path")
        
        try:
            if registry_path and os.path.exists(registry_path):
                with open(registry_path, 'r') as f:
                    import json
                    self.tag_registry = json.load(f)
                logger.info(f"Loaded {len(self.tag_registry)} tags from registry")
            else:
                # Initialize with predefined tags if available
                predefined_tags = self.config.get("tagging", {}).get("predefined_tags", {})
                for category, tags in predefined_tags.items():
                    for tag in tags:
                        normalized_tag = tag.lower().strip()
                        self.tag_registry[normalized_tag] = {
                            "name": tag,
                            "category": category,
                            "source": "predefined"
                        }
                logger.info(f"Initialized registry with {len(self.tag_registry)} predefined tags")
        except Exception as e:
            logger.error(f"Error loading tag registry: {e}")
            # Initialize empty registry
            self.tag_registry = {}
    
    def _save_tag_registry(self):
        """Save tag registry to storage"""
        registry_path = self.config.get("tagging", {}).get("registry_path")
        
        if registry_path:
            try:
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(registry_path), exist_ok=True)
                
                with open(registry_path, 'w') as f:
                    import json
                    json.dump(self.tag_registry, f, indent=2)
                logger.info(f"Saved {len(self.tag_registry)} tags to registry")
            except Exception as e:
                logger.error(f"Error saving tag registry: {e}")
    
    def _add_to_tag_registry(self, tag: str, metadata: Dict[str, Any] = None):
        """
        Add a tag to the registry.
        
        Args:
            tag: Tag to add
            metadata: Tag metadata
        """
        normalized_tag = tag.lower().strip()
        self.tag_registry[normalized_tag] = {
            "name": tag,
            "category": metadata.get("category", "auto"),
            "source": metadata.get("source", "auto"),
            "created_by": metadata.get("created_by", "system")
        }
        
        # Save registry
        self._save_tag_registry()
        logger.info(f"Added tag '{tag}' to registry")
    
    def _normalize_tag(self, tag: str) -> str:
        """
        Normalize tag for consistency.
        
        Args:
            tag: Tag to normalize
            
        Returns:
            Normalized tag
        """
        # Convert to lowercase
        tag = tag.lower()
        
        # Replace special characters
        tag = re.sub(r'[^\w\s-]', '', tag)
        
        # Replace multiple spaces with single space
        tag = re.sub(r'\s+', ' ', tag)
        
        # Trim
        tag = tag.strip()
        
        return tag