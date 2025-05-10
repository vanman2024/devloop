"""
Document Vector Store Connector

This module provides a specialized connector for storing and retrieving
document embeddings in a vector store for semantic search capabilities.
"""

import os
import sys
import json
import logging
import uuid
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union

# Import document models
from ..models.document_model import Document, Chunk

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
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'document_vector_store.log'))
    ]
)
logger = logging.getLogger('document_vector_store')

# Try to import the vector_store from feature_creation
try:
    from agents.planning.feature_creation.vector_store import VectorStore as BaseVectorStore
    USING_BASE_VECTOR_STORE = True
except ImportError:
    logger.warning("Could not import base VectorStore, using simplified implementation")
    USING_BASE_VECTOR_STORE = False
    
    # Simple vector store implementation if the real one isn't available
    class BaseVectorStore:
        """Simplified vector store implementation"""
        
        def __init__(self, vector_dim=1536):
            self.vector_dim = vector_dim
            self.vectors = {}  # id -> vector
            self.documents = {}  # id -> content
            self.metadata = {}  # id -> metadata
            self.storage_path = os.path.expanduser("~/.devloop/sdk/storage/document_vectors.json")
            self._load()
        
        def _load(self):
            """Load vectors from storage"""
            if os.path.exists(self.storage_path):
                try:
                    with open(self.storage_path, 'r') as f:
                        data = json.load(f)
                        self.vectors = {k: np.array(v) for k, v in data.get("vectors", {}).items()}
                        self.documents = data.get("documents", {})
                        self.metadata = data.get("metadata", {})
                except Exception as e:
                    logger.error(f"Error loading vector store: {e}")
        
        def _save(self):
            """Save vectors to storage"""
            try:
                os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
                with open(self.storage_path, 'w') as f:
                    data = {
                        "vectors": {k: v.tolist() if isinstance(v, np.ndarray) else v 
                                   for k, v in self.vectors.items()},
                        "documents": self.documents,
                        "metadata": self.metadata
                    }
                    json.dump(data, f)
                return True
            except Exception as e:
                logger.error(f"Error saving vector store: {e}")
                return False
        
        def add(self, id, content, vector=None, metadata=None):
            """Add a document to the vector store"""
            if vector is None:
                # Create a deterministic vector if none provided
                vector = self._deterministic_embedding(content)
            
            self.vectors[id] = vector
            self.documents[id] = content
            self.metadata[id] = metadata or {}
            
            self._save()
            return id
        
        def search(self, query, k=5):
            """
            Search for similar documents
            
            Args:
                query: Query string or vector
                k: Number of results to return
                
            Returns:
                List of document IDs
            """
            if not self.vectors:
                return []
            
            # Convert query to vector if it's a string
            if isinstance(query, str):
                query_vector = self._deterministic_embedding(query)
            else:
                query_vector = query
            
            # Calculate similarities using cosine similarity
            similarities = {}
            for doc_id, doc_vector in self.vectors.items():
                similarity = self._cosine_similarity(query_vector, doc_vector)
                similarities[doc_id] = similarity
            
            # Sort by similarity and return top k
            sorted_results = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            return [doc_id for doc_id, _ in sorted_results[:k]]
        
        def _deterministic_embedding(self, text):
            """Create a deterministic embedding from text"""
            if not text:
                return np.zeros(self.vector_dim)
            
            # Use a simple hash function to create a deterministic embedding
            import hashlib
            hash_object = hashlib.sha256(text.encode())
            hash_bytes = hash_object.digest()
            
            # Create a vector from the hash bytes
            vector = np.zeros(self.vector_dim)
            for i in range(min(len(hash_bytes), self.vector_dim)):
                vector[i] = hash_bytes[i] / 255.0
            
            # Normalize the vector
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
            
            return vector
        
        def _cosine_similarity(self, vec1, vec2):
            """Calculate cosine similarity between two vectors"""
            if isinstance(vec1, list):
                vec1 = np.array(vec1)
            if isinstance(vec2, list):
                vec2 = np.array(vec2)
                
            if len(vec1) == 0 or len(vec2) == 0:
                return 0.0
                
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            return np.dot(vec1, vec2) / (norm1 * norm2)
        
        def list_documents(self):
            """List all documents in the store"""
            return list(self.documents.keys())
        
        def get_document(self, id):
            """Get a document by ID"""
            return self.documents.get(id)
        
        def get_metadata(self, id):
            """Get metadata for a document"""
            return self.metadata.get(id)
        
        def delete(self, id):
            """Delete a document"""
            if id in self.vectors:
                del self.vectors[id]
            if id in self.documents:
                del self.documents[id]
            if id in self.metadata:
                del self.metadata[id]
            
            self._save()
            return True

class DocumentVectorStoreConnector:
    """
    Vector store connector for document embeddings.
    
    This class provides semantic search capabilities for documents by
    storing and retrieving document embeddings in a vector store.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the document vector store connector.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Vector dimension
        self.vector_dim = config.get("vector_dim", 1536)  # Default for OpenAI embeddings
        
        # Initialize vector store
        if USING_BASE_VECTOR_STORE:
            self.vector_store = BaseVectorStore(vector_dim=self.vector_dim)
        else:
            self.vector_store = BaseVectorStore(vector_dim=self.vector_dim)
        
        # Chunk-level vector store for more granular search
        self.chunk_vector_store = BaseVectorStore(vector_dim=self.vector_dim)
        
        # Storage paths
        storage_dir = config.get("vector_store_dir", 
                               os.path.join(PROJECT_ROOT, "backups", "vector_store"))
        os.makedirs(storage_dir, exist_ok=True)
        
        self.document_vectors_path = os.path.join(storage_dir, "document_vectors.json")
        self.chunk_vectors_path = os.path.join(storage_dir, "chunk_vectors.json")
        
        # Try to import LLM connector for embedding generation
        try:
            from agents.planning.feature_creation.llm_connector import get_llm_connector
            self.llm_connector = get_llm_connector()
            self.embedding_available = True
        except ImportError:
            logger.warning("Could not import LLM connector, using deterministic embeddings")
            self.llm_connector = None
            self.embedding_available = False
        
        logger.info("Document vector store connector initialized")
    
    async def add_document(self, 
                         document_id: str,
                         content: str,
                         embedding: List[float] = None,
                         metadata: Dict[str, Any] = None) -> str:
        """
        Add a document to the vector store.
        
        Args:
            document_id: ID of the document
            content: Document text content
            embedding: Optional pre-computed embedding
            metadata: Optional metadata
            
        Returns:
            Vector store ID
        """
        try:
            logger.info(f"Adding document {document_id} to vector store")
            
            # Generate embedding if not provided
            if embedding is None or len(embedding) == 0:
                embedding = await self._generate_embedding(content[:10000])  # Limit to 10K chars
            
            # Add to vector store
            vector_id = self.vector_store.add(
                id=document_id,
                content=content[:10000],  # Limit content size
                vector=embedding,
                metadata=metadata
            )
            
            logger.info(f"Document {document_id} added to vector store with ID {vector_id}")
            return vector_id
        
        except Exception as e:
            logger.error(f"Error adding document to vector store: {str(e)}")
            return document_id
    
    async def add_document_chunks(self, 
                                document_id: str,
                                chunks: List[Chunk]) -> List[str]:
        """
        Add document chunks to the vector store.
        
        Args:
            document_id: ID of the parent document
            chunks: List of document chunks
            
        Returns:
            List of chunk vector IDs
        """
        try:
            logger.info(f"Adding {len(chunks)} chunks for document {document_id} to vector store")
            
            chunk_ids = []
            for chunk in chunks:
                # Generate chunk ID if not provided
                chunk_id = chunk.id or f"{document_id}_chunk_{len(chunk_ids)}"
                
                # Generate embedding if not provided
                embedding = chunk.embedding
                if not embedding or len(embedding) == 0:
                    embedding = await self._generate_embedding(chunk.content)
                
                # Add to chunk vector store
                self.chunk_vector_store.add(
                    id=chunk_id,
                    content=chunk.content,
                    vector=embedding,
                    metadata={
                        "document_id": document_id,
                        "chunk_index": chunk.metadata.get("chunk_index", 0),
                        "start_char": chunk.start_char,
                        "end_char": chunk.end_char
                    }
                )
                
                chunk_ids.append(chunk_id)
            
            logger.info(f"Added {len(chunk_ids)} chunks to vector store for document {document_id}")
            return chunk_ids
        
        except Exception as e:
            logger.error(f"Error adding document chunks to vector store: {str(e)}")
            return []
    
    async def search(self, query: Union[str, List[float]], k: int = 5) -> List[str]:
        """
        Search for similar documents.
        
        Args:
            query: Query string or embedding vector
            k: Number of results to return
            
        Returns:
            List of document IDs
        """
        try:
            logger.info(f"Searching for query: {query if isinstance(query, str) else 'vector'}")
            
            # Convert query to embedding if it's a string
            if isinstance(query, str) and query:
                query_embedding = await self._generate_embedding(query)
            else:
                query_embedding = query
            
            # Perform search
            results = self.vector_store.search(query_embedding, k=k)
            
            logger.info(f"Found {len(results)} documents for query")
            return results
        
        except Exception as e:
            logger.error(f"Error searching vector store: {str(e)}")
            return []
    
    async def search_chunks(self, query: Union[str, List[float]], k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for similar document chunks.
        
        Args:
            query: Query string or embedding vector
            k: Number of results to return
            
        Returns:
            List of dictionaries with chunk information
        """
        try:
            logger.info(f"Searching chunks for query: {query if isinstance(query, str) else 'vector'}")
            
            # Convert query to embedding if it's a string
            if isinstance(query, str) and query:
                query_embedding = await self._generate_embedding(query)
            else:
                query_embedding = query
            
            # Perform search
            chunk_ids = self.chunk_vector_store.search(query_embedding, k=k)
            
            # Get chunk data
            results = []
            for chunk_id in chunk_ids:
                content = self.chunk_vector_store.get_document(chunk_id)
                metadata = self.chunk_vector_store.get_metadata(chunk_id)
                
                if content and metadata:
                    results.append({
                        "id": chunk_id,
                        "content": content,
                        "document_id": metadata.get("document_id", ""),
                        "chunk_index": metadata.get("chunk_index", 0),
                        "start_char": metadata.get("start_char", 0),
                        "end_char": metadata.get("end_char", 0)
                    })
            
            logger.info(f"Found {len(results)} chunks for query")
            return results
        
        except Exception as e:
            logger.error(f"Error searching chunk vector store: {str(e)}")
            return []
    
    async def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from the vector store.
        
        Args:
            document_id: ID of the document to delete
            
        Returns:
            Success status
        """
        try:
            logger.info(f"Deleting document {document_id} from vector store")
            
            # Delete from document vector store
            self.vector_store.delete(document_id)
            
            # Delete associated chunks
            chunk_ids = []
            for chunk_id in self.chunk_vector_store.list_documents():
                metadata = self.chunk_vector_store.get_metadata(chunk_id)
                if metadata and metadata.get("document_id") == document_id:
                    chunk_ids.append(chunk_id)
            
            for chunk_id in chunk_ids:
                self.chunk_vector_store.delete(chunk_id)
            
            logger.info(f"Deleted document {document_id} and {len(chunk_ids)} chunks from vector store")
            return True
        
        except Exception as e:
            logger.error(f"Error deleting document from vector store: {str(e)}")
            return False
    
    async def get_similar_documents(self, document_id: str, k: int = 5) -> List[str]:
        """
        Get documents similar to a given document.
        
        Args:
            document_id: ID of the reference document
            k: Number of results to return
            
        Returns:
            List of similar document IDs
        """
        try:
            # Get document content or embedding
            content = self.vector_store.get_document(document_id)
            if not content:
                logger.warning(f"Document {document_id} not found in vector store")
                return []
            
            # Use the document as the query
            similar_docs = await self.search(content, k=k+1)  # +1 to account for self-match
            
            # Remove self from results
            similar_docs = [doc_id for doc_id in similar_docs if doc_id != document_id]
            
            return similar_docs[:k]
        
        except Exception as e:
            logger.error(f"Error getting similar documents: {str(e)}")
            return []
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding for text.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector
        """
        if not text:
            return [0.0] * self.vector_dim
        
        # Use LLM connector if available
        if self.embedding_available and self.llm_connector:
            try:
                embeddings = await self.llm_connector.create_embeddings([text])
                if embeddings and len(embeddings) > 0:
                    return embeddings[0]
            except Exception as e:
                logger.error(f"Error generating embedding with LLM connector: {str(e)}")
        
        # Fall back to deterministic embedding
        return self._deterministic_embedding(text)
    
    def _deterministic_embedding(self, text: str) -> List[float]:
        """
        Generate a deterministic embedding for text (for fallback).
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector
        """
        if not text:
            return [0.0] * self.vector_dim
        
        import hashlib
        import numpy as np
        
        # Use a hash function to create a deterministic embedding
        hash_object = hashlib.sha256(text.encode())
        hash_bytes = hash_object.digest()
        
        # Create a vector from the hash bytes
        vector = np.zeros(self.vector_dim)
        for i in range(min(len(hash_bytes), self.vector_dim)):
            vector[i] = hash_bytes[i] / 255.0
        
        # Extend the vector if needed
        if len(hash_bytes) < self.vector_dim:
            for i in range(len(hash_bytes), self.vector_dim):
                # Use a simple function of the previous elements
                vector[i] = (vector[i % len(hash_bytes)] + vector[(i * 7) % len(hash_bytes)]) / 2.0
        
        # Normalize the vector
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        return vector.tolist()

# Singleton instance
_connector_instance = None

def get_document_vector_store_connector(config: Dict[str, Any] = None) -> DocumentVectorStoreConnector:
    """
    Get singleton instance of DocumentVectorStoreConnector.
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        DocumentVectorStoreConnector instance
    """
    global _connector_instance
    if _connector_instance is None:
        _connector_instance = DocumentVectorStoreConnector(config or {})
    return _connector_instance