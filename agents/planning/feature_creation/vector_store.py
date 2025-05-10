#!/usr/bin/env python3
"""
Vector Store for Feature Creation Agent

This module provides a vector storage system for feature descriptions and attributes,
enabling semantic search and concept matching for better feature analysis and placement.
It uses embedding models to encode feature descriptions and supports efficient similarity search.
"""

import os
import sys
import json
import logging
import time
import hashlib
from typing import Dict, List, Any, Optional, Tuple, Union

# Add project root to path to allow importing common modules
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'vector_store.log'))
    ]
)
logger = logging.getLogger('vector_store')

class FeatureVectorStore:
    """
    Vector store for feature descriptions to enable semantic search
    and concept matching across features in the Devloop ecosystem.
    """
    
    def __init__(self, vector_file: Optional[str] = None, embedding_model: str = "openai"):
        """
        Initialize the vector store
        
        Args:
            vector_file: Path to vector data file
            embedding_model: Model to use for creating embeddings
        """
        self.vector_file = vector_file or os.path.join(
            os.path.expanduser("~/.devloop/sdk/storage"), 
            "feature_vectors.json"
        )
        self.embedding_model = embedding_model
        self.vector_data = self._load_vector_data()
        
        # Initialize embedding model
        self._init_embedding_model()
    
    def _init_embedding_model(self):
        """Initialize the embedding model based on configuration"""
        self.embedding_dimension = 1536  # Default for OpenAI models
        
        # TODO: Replace with actual embedding model initialization
        # This is a placeholder for the embedding model
        logger.info(f"Using embedding model: {self.embedding_model}")
        logger.info("Note: This is a placeholder implementation")
    
    def _load_vector_data(self) -> Dict[str, Any]:
        """Load vector data from file"""
        try:
            if os.path.exists(self.vector_file):
                with open(self.vector_file, 'r') as f:
                    return json.load(f)
            else:
                logger.info(f"Vector file not found: {self.vector_file}")
                return {
                    "features": {},
                    "metadata": {
                        "embedding_model": self.embedding_model,
                        "embedding_dimension": 1536,
                        "last_updated": time.time()
                    }
                }
        except Exception as e:
            logger.error(f"Error loading vector data: {str(e)}")
            return {
                "features": {},
                "metadata": {
                    "embedding_model": self.embedding_model,
                    "embedding_dimension": 1536,
                    "last_updated": time.time()
                }
            }
    
    def _save_vector_data(self) -> bool:
        """Save vector data to file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.vector_file), exist_ok=True)
            
            # Update metadata
            self.vector_data["metadata"]["last_updated"] = time.time()
            
            # Save to file
            with open(self.vector_file, 'w') as f:
                json.dump(self.vector_data, f, indent=2)
            
            logger.info(f"Saved vector data to {self.vector_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving vector data: {str(e)}")
            return False
    
    def _compute_embedding(self, text: str) -> List[float]:
        """
        Compute embedding for a text string
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as a list of floats
        """
        try:
            # Try to use the LLM connector for embeddings
            from llm_connector import get_llm_connector
            
            llm_connector = get_llm_connector()
            
            if llm_connector.llm_available:
                # Use the LLM connector to create embeddings
                embeddings = llm_connector.create_embeddings([text])
                if embeddings and len(embeddings) > 0:
                    return embeddings[0]
        except ImportError:
            logger.warning("LLM connector not available for embeddings")
        except Exception as e:
            logger.error(f"Error computing embedding with LLM connector: {e}")
        
        # Fall back to deterministic hash-based embeddings
        logger.info("Using hash-based embeddings (fallback)")
        
        # Create a deterministic hash of the input text
        text_hash = hashlib.sha256(text.encode('utf-8')).digest()
        
        # Convert the hash to a list of floats normalized between -1 and 1
        # with the correct embedding dimension
        embedding = []
        for i in range(self.embedding_dimension):
            # Use modulo to cycle through the hash bytes
            hash_byte = text_hash[i % len(text_hash)]
            # Convert to a float between -1 and 1
            embedding.append((hash_byte / 127.5) - 1.0)
        
        return embedding
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Compute cosine similarity between two vectors
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity (between -1 and 1)
        """
        # Ensure vectors are the same length
        if len(vec1) != len(vec2):
            raise ValueError("Vectors must be the same length")
        
        # Compute dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # Compute magnitudes
        mag1 = sum(a * a for a in vec1) ** 0.5
        mag2 = sum(b * b for b in vec2) ** 0.5
        
        # Compute similarity
        if mag1 == 0 or mag2 == 0:
            return 0.0
        else:
            return dot_product / (mag1 * mag2)
    
    def add_feature(self, feature_id: str, feature_data: Dict[str, Any]) -> bool:
        """
        Add a feature to the vector store
        
        Args:
            feature_id: Unique identifier for the feature
            feature_data: Feature data dictionary with name, description, etc.
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Extract text for embedding
            feature_text = f"{feature_data.get('name', '')} {feature_data.get('description', '')}"
            
            # Add tags if available
            if 'tags' in feature_data and isinstance(feature_data['tags'], list):
                feature_text += " " + " ".join(feature_data['tags'])
            
            # Compute embedding
            embedding = self._compute_embedding(feature_text)
            
            # Store feature data and embedding
            self.vector_data["features"][feature_id] = {
                "name": feature_data.get('name', ''),
                "description": feature_data.get('description', ''),
                "tags": feature_data.get('tags', []),
                "domain": feature_data.get('domain', ''),
                "purpose": feature_data.get('purpose', ''),
                "milestone": feature_data.get('milestone', ''),
                "phase": feature_data.get('phase', ''),
                "module": feature_data.get('module', ''),
                "embedding": embedding,
                "created_at": time.time()
            }
            
            # Save updated vector data
            self._save_vector_data()
            
            logger.info(f"Added feature {feature_id} to vector store")
            return True
        
        except Exception as e:
            logger.error(f"Error adding feature to vector store: {str(e)}")
            return False
    
    def search_similar_features(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for features similar to a query text
        
        Args:
            query_text: Text to search for
            top_k: Number of results to return
            
        Returns:
            List of (feature_id, feature_data, similarity) tuples
        """
        try:
            # Compute query embedding
            query_embedding = self._compute_embedding(query_text)
            
            # Compute similarities with all features
            similarities = []
            for feature_id, feature_data in self.vector_data["features"].items():
                if "embedding" in feature_data:
                    similarity = self._cosine_similarity(query_embedding, feature_data["embedding"])
                    similarities.append({
                        "id": feature_id,
                        "data": feature_data,
                        "similarity": similarity
                    })
            
            # Sort by similarity (descending)
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            
            # Return top k results
            return similarities[:top_k]
        
        except Exception as e:
            logger.error(f"Error searching for similar features: {str(e)}")
            return []
    
    def get_related_features(self, feature_description: str, domain: str, purpose: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Get features related to a new feature description
        
        Args:
            feature_description: Description of the new feature
            domain: Domain of the new feature
            purpose: Purpose of the new feature
            top_k: Number of results to return
            
        Returns:
            List of related features with similarity scores
        """
        # Create a combined query
        query = f"{feature_description} domain:{domain} purpose:{purpose}"
        
        # Search for similar features
        similar_features = self.search_similar_features(query, top_k)
        
        # Format results
        results = []
        for result in similar_features:
            feature_data = result["data"]
            results.append({
                "id": result["id"],
                "name": feature_data.get("name", ""),
                "description": feature_data.get("description", ""),
                "tags": feature_data.get("tags", []),
                "domain": feature_data.get("domain", ""),
                "purpose": feature_data.get("purpose", ""),
                "milestone": feature_data.get("milestone", ""),
                "phase": feature_data.get("phase", ""),
                "module": feature_data.get("module", ""),
                "similarity": result["similarity"]
            })
        
        return results
    
    def suggest_placement(self, feature_description: str, domain: str, purpose: str) -> Dict[str, Any]:
        """
        Suggest placement for a new feature based on similar features
        
        Args:
            feature_description: Description of the new feature
            domain: Domain of the new feature
            purpose: Purpose of the new feature
            
        Returns:
            Dictionary with suggested milestone, phase, module, and confidence
        """
        # Get related features
        related_features = self.get_related_features(feature_description, domain, purpose)
        
        # If no related features, return empty result
        if not related_features:
            return {
                "milestone": None,
                "phase": None,
                "module": None,
                "confidence": 0.0
            }
        
        # Count occurrences of milestones, phases, and modules weighted by similarity
        milestone_scores = {}
        phase_scores = {}
        module_scores = {}
        
        for feature in related_features:
            similarity = feature["similarity"]
            
            # Add weighted score for milestone
            milestone = feature.get("milestone")
            if milestone:
                milestone_scores[milestone] = milestone_scores.get(milestone, 0) + similarity
            
            # Add weighted score for phase
            phase = feature.get("phase")
            if phase:
                phase_scores[phase] = phase_scores.get(phase, 0) + similarity
            
            # Add weighted score for module
            module = feature.get("module")
            if module:
                module_scores[module] = module_scores.get(module, 0) + similarity
        
        # Find top scoring values
        milestone = max(milestone_scores.items(), key=lambda x: x[1])[0] if milestone_scores else None
        phase = max(phase_scores.items(), key=lambda x: x[1])[0] if phase_scores else None
        module = max(module_scores.items(), key=lambda x: x[1])[0] if module_scores else None
        
        # Calculate confidence based on similarity of top feature
        confidence = related_features[0]["similarity"] if related_features else 0.0
        
        return {
            "milestone": milestone,
            "phase": phase,
            "module": module,
            "confidence": confidence
        }
    
    def remove_feature(self, feature_id: str) -> bool:
        """
        Remove a feature from the vector store
        
        Args:
            feature_id: ID of the feature to remove
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if feature_id in self.vector_data["features"]:
                del self.vector_data["features"][feature_id]
                self._save_vector_data()
                logger.info(f"Removed feature {feature_id} from vector store")
                return True
            else:
                logger.warning(f"Feature {feature_id} not found in vector store")
                return False
        except Exception as e:
            logger.error(f"Error removing feature from vector store: {str(e)}")
            return False

# Singleton instance of the vector store
_vector_store_instance = None

def get_vector_store() -> FeatureVectorStore:
    """
    Get the singleton instance of the vector store
    
    Returns:
        FeatureVectorStore instance
    """
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = FeatureVectorStore()
    return _vector_store_instance