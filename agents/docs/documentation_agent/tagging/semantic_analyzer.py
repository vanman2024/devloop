"""
Semantic Analyzer - Document content analysis

This module implements the SemanticAnalyzer which analyzes document content
to extract topics, themes, and key concepts for advanced tagging.
"""

import re
import logging
import asyncio
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import Counter

# Import document models
from ..models.document_model import Document

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SemanticAnalyzer:
    """
    Semantic analyzer for document content analysis.
    
    Provides advanced natural language processing capabilities to extract
    topics, themes, key concepts, and other semantic information from documents.
    """
    
    def __init__(self, config: Dict[str, Any], llm_connector=None):
        """
        Initialize the semantic analyzer.
        
        Args:
            config: Configuration dictionary
            llm_connector: LLM service connector
        """
        self.config = config
        self.llm_connector = llm_connector
        
        # Extract analyzer-specific configuration
        analyzer_config = config.get("semantic_analyzer", {})
        
        # Configure analyzer options
        self.max_topics = analyzer_config.get("max_topics", 5)
        self.max_key_terms = analyzer_config.get("max_key_terms", 10)
        self.extract_entities = analyzer_config.get("extract_entities", True)
        self.use_llm = analyzer_config.get("use_llm", True)
        
        # Initialize NLP components
        self._initialize_nlp()
        
        logger.info("Semantic analyzer initialized")
    
    async def analyze_document(self, document: Document) -> Dict[str, Any]:
        """
        Analyze document content to extract semantic information.
        
        Args:
            document: Document to analyze
            
        Returns:
            Dictionary with analysis results
        """
        logger.info(f"Analyzing document: {document.id}")
        
        # Extract text content
        content = document.content
        title = document.metadata.title
        
        # Prepare clean content for analysis
        clean_content = self._clean_text(content)
        
        # Combine multiple analysis methods
        analysis_results = await asyncio.gather(
            self._extract_topics(document),
            self._extract_key_terms(clean_content),
            self._extract_entities(clean_content) if self.extract_entities else asyncio.sleep(0)
        )
        
        # Combine results
        topics = analysis_results[0]
        key_terms = analysis_results[1]
        entities = analysis_results[2] if self.extract_entities else {}
        
        # Combine all results into a single analysis
        analysis = {
            "topics": topics,
            "key_terms": key_terms,
            "entities": entities
        }
        
        logger.info(f"Completed analysis for document {document.id}")
        return analysis
    
    async def _extract_topics(self, document: Document) -> Dict[str, float]:
        """
        Extract main topics from document.
        
        Args:
            document: Document to analyze
            
        Returns:
            Dictionary mapping topics to relevance scores
        """
        # Use LLM-based extraction if available
        if self.use_llm and self.llm_connector:
            try:
                return await self._extract_topics_with_llm(document)
            except Exception as e:
                logger.error(f"Error extracting topics with LLM: {e}")
        
        # Fall back to keyword-based topic extraction
        topics = {}
        content = document.content
        title = document.metadata.title
        
        # Clean content
        clean_content = self._clean_text(content)
        
        # Extract topics based on term frequency
        words = re.findall(r'\b\w+\b', clean_content.lower())
        word_counts = Counter(words)
        
        # Remove stop words
        stop_words = {"the", "and", "this", "that", "with", "for", "from", "have", "has", 
                     "not", "but", "are", "what", "when", "where", "who", "how", "why", 
                     "which", "their", "they", "them", "there", "these", "those", "then"}
        
        for word in stop_words:
            if word in word_counts:
                del word_counts[word]
        
        # Use top words as topics
        for word, count in word_counts.most_common(self.max_topics):
            # Skip very short words
            if len(word) <= 3:
                continue
                
            # Calculate relevance score based on frequency
            relevance = min(count / 100, 0.95)  # Cap at 0.95
            topics[word] = relevance
            
            if len(topics) >= self.max_topics:
                break
        
        # Add title words as topics with high relevance
        title_words = re.findall(r'\b\w+\b', title.lower())
        for word in title_words:
            if word not in stop_words and len(word) > 3 and word not in topics:
                topics[word] = 0.9
                if len(topics) >= self.max_topics:
                    break
        
        return topics
    
    async def _extract_topics_with_llm(self, document: Document) -> Dict[str, float]:
        """
        Extract main topics from document using LLM.
        
        Args:
            document: Document to analyze
            
        Returns:
            Dictionary mapping topics to relevance scores
        """
        # Prepare document content for analysis
        title = document.metadata.title
        description = document.metadata.description
        
        # Limit content size
        content_preview = document.content[:5000]
        
        # Generate prompt
        prompt = f"""
        Please analyze this document and identify the main topics or themes.
        
        Document Title: {title}
        Description: {description}
        
        Content Preview:
        {content_preview}
        
        Extract {self.max_topics} main topics from this document. For each topic:
        1. Provide a short phrase (1-3 words) that represents the topic
        2. Assign a relevance score between 0.0 and 1.0 indicating how central the topic is to the document
        
        Return the results as a JSON object with topics as keys and relevance scores as values.
        Example: {{"api design": 0.9, "documentation": 0.8, "best practices": 0.7}}
        
        Return only the JSON object, nothing else.
        """
        
        # Generate topics using LLM
        response = await self.llm_connector.generate_text(prompt)
        
        # Parse response
        topics = {}
        
        if response:
            try:
                # Try to parse JSON response
                import json
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    topics = json.loads(json_str)
                    
                    # Ensure values are floats
                    topics = {k: float(v) for k, v in topics.items()}
            except Exception as e:
                logger.error(f"Error parsing LLM topic response: {e}")
                
                # Fall back to simple parsing
                topics = {}
                lines = response.split("\n")
                for line in lines:
                    if ":" in line:
                        parts = line.split(":", 1)
                        topic = parts[0].strip().strip('"\'').lower()
                        try:
                            score = float(parts[1].strip().strip(','))
                            topics[topic] = min(max(score, 0.0), 1.0)  # Clamp to 0.0-1.0
                        except ValueError:
                            pass
        
        return topics
    
    async def _extract_key_terms(self, content: str) -> List[str]:
        """
        Extract key terms from document content.
        
        Args:
            content: Document content
            
        Returns:
            List of key terms
        """
        key_terms = []
        
        # Extract potential key terms (words, bigrams, and trigrams)
        words = re.findall(r'\b[A-Za-z][A-Za-z-]+\b', content)
        word_counts = Counter(words)
        
        # Generate n-grams
        bigrams = []
        for i in range(len(words) - 1):
            bigram = f"{words[i]} {words[i+1]}"
            bigrams.append(bigram)
        
        trigrams = []
        for i in range(len(words) - 2):
            trigram = f"{words[i]} {words[i+1]} {words[i+2]}"
            trigrams.append(trigram)
        
        # Count n-grams
        bigram_counts = Counter(bigrams)
        trigram_counts = Counter(trigrams)
        
        # Filter stop words
        stop_words = {"the", "and", "this", "that", "with", "for", "from", "have", "has", 
                     "not", "but", "are", "what", "when", "where", "who", "how", "why", 
                     "which", "their", "they", "them", "there", "these", "those", "then"}
        
        # Add most common words (excluding stop words)
        for word, count in word_counts.most_common(self.max_key_terms * 2):
            if word.lower() not in stop_words and len(word) > 3:
                key_terms.append(word)
                if len(key_terms) >= self.max_key_terms:
                    break
        
        # Add most common bigrams
        for bigram, count in bigram_counts.most_common(self.max_key_terms // 2):
            # Skip if contains stop words
            words = bigram.split()
            if any(word.lower() in stop_words for word in words):
                continue
                
            if bigram not in key_terms:
                key_terms.append(bigram)
                if len(key_terms) >= self.max_key_terms:
                    break
        
        # Add most common trigrams
        for trigram, count in trigram_counts.most_common(self.max_key_terms // 3):
            # Skip if middle word is a stop word
            words = trigram.split()
            if words[1].lower() in stop_words:
                continue
                
            if trigram not in key_terms:
                key_terms.append(trigram)
                if len(key_terms) >= self.max_key_terms:
                    break
        
        return key_terms[:self.max_key_terms]
    
    async def _extract_entities(self, content: str) -> Dict[str, List[str]]:
        """
        Extract named entities from document content.
        
        Args:
            content: Document content
            
        Returns:
            Dictionary mapping entity types to lists of entities
        """
        entities = {
            "people": [],
            "organizations": [],
            "technologies": [],
            "locations": []
        }
        
        # Simple pattern-based entity extraction
        # In a real implementation, this would use NER models
        
        # Extract potential people names
        name_pattern = r'(?:[A-Z][a-z]+\s+){1,2}[A-Z][a-z]+'
        potential_names = re.findall(name_pattern, content)
        
        # Extract potential organizations
        org_pattern = r'(?:[A-Z][a-zA-Z]*\s*){2,}'
        potential_orgs = re.findall(org_pattern, content)
        
        # Extract potential technologies
        tech_pattern = r'\b(?:React|Angular|Vue|Node\.js|Python|JavaScript|TypeScript|Java|Go|Ruby|PHP|C\+\+|Swift|Kotlin|Rust|SQL|MongoDB|PostgreSQL|MySQL|Redis|Docker|Kubernetes|AWS|Azure|GCP|API|REST|GraphQL|JSON|XML|HTML|CSS)\b'
        technologies = re.findall(tech_pattern, content)
        
        # Crude filtering
        for name in potential_names:
            # Skip names that look like headings or all caps
            if name.isupper() or any(word in name.lower() for word in ["chapter", "section", "part"]):
                continue
                
            entities["people"].append(name)
        
        for org in potential_orgs:
            # Skip very short organizations or common words
            if len(org) < 5 or any(word in org.lower() for word in ["the", "this", "that", "these", "those"]):
                continue
                
            entities["organizations"].append(org)
        
        # Add technologies
        entities["technologies"] = list(set(technologies))
        
        # Deduplicate
        for entity_type in entities:
            entities[entity_type] = list(dict.fromkeys(entities[entity_type]))
        
        return entities
    
    def _clean_text(self, text: str) -> str:
        """
        Clean text for analysis by removing code blocks, etc.
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text
        """
        # Remove code blocks
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        
        # Remove inline code
        text = re.sub(r'`[^`]+`', '', text)
        
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        
        # Remove image references
        text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove table formatting
        text = re.sub(r'\|.*?\|', '', text)
        
        return text
    
    def _initialize_nlp(self):
        """Initialize NLP components"""
        # In a real implementation, this would initialize spaCy, NLTK, or other NLP libraries
        pass
    
    async def get_semantic_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate semantic similarity between two texts.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        if not self.llm_connector:
            # Fall back to simple overlap-based similarity
            return self._calculate_token_overlap(text1, text2)
        
        try:
            # Generate embeddings
            embedding1 = await self.llm_connector.create_embedding(text1)
            embedding2 = await self.llm_connector.create_embedding(text2)
            
            # Calculate cosine similarity
            import numpy as np
            embedding1 = np.array(embedding1)
            embedding2 = np.array(embedding2)
            
            dot_product = np.dot(embedding1, embedding2)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            similarity = dot_product / (norm1 * norm2)
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {e}")
            return self._calculate_token_overlap(text1, text2)
    
    def _calculate_token_overlap(self, text1: str, text2: str) -> float:
        """
        Calculate simple token overlap as a fallback similarity measure.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        # Tokenize and normalize
        tokens1 = set(re.findall(r'\b\w+\b', text1.lower()))
        tokens2 = set(re.findall(r'\b\w+\b', text2.lower()))
        
        # Remove common stop words
        stop_words = {"the", "and", "this", "that", "with", "for", "from", "to", "of", "in", "on", "is", "are", "be"}
        tokens1 = tokens1 - stop_words
        tokens2 = tokens2 - stop_words
        
        # Calculate Jaccard similarity
        if not tokens1 or not tokens2:
            return 0.0
            
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        
        return len(intersection) / len(union)

# Singleton instance
_analyzer_instance = None

def get_semantic_analyzer(config: Dict[str, Any] = None, llm_connector=None) -> SemanticAnalyzer:
    """
    Get singleton instance of SemanticAnalyzer.
    
    Args:
        config: Optional configuration dictionary
        llm_connector: Optional LLM connector
        
    Returns:
        SemanticAnalyzer instance
    """
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = SemanticAnalyzer(config or {}, llm_connector)
    return _analyzer_instance