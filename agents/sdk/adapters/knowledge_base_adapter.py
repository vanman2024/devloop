#!/usr/bin/env python3
"""
Knowledge Base Adapter for SDK-First Architecture

This module provides adapters for connecting to different knowledge base systems
including vector databases, knowledge graphs, and caching layers.
"""

import os
import sys
import json
import logging
import time
import hashlib
from typing import Dict, List, Any, Optional, Union, Tuple, Callable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("knowledge_base_adapter")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, caching will be disabled")

try:
    import pymongo
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    logger.warning("MongoDB not available, persistent storage will be disabled")

try:
    from langchain.vectorstores import Chroma
    from langchain.embeddings import OpenAIEmbeddings
    VECTOR_DB_AVAILABLE = True
except ImportError:
    VECTOR_DB_AVAILABLE = False
    logger.warning("Vector database dependencies not available, semantic search will be disabled")


class KnowledgeBaseAdapter:
    """Base adapter for knowledge base systems"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the knowledge base adapter.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
    
    def query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Query the knowledge base.
        
        Args:
            query: Query string
            **kwargs: Additional query parameters
            
        Returns:
            List of results
        """
        raise NotImplementedError("Subclasses must implement query")
    
    def store(self, data: Dict[str, Any], **kwargs) -> Optional[str]:
        """
        Store data in the knowledge base.
        
        Args:
            data: Data to store
            **kwargs: Additional storage parameters
            
        Returns:
            ID of stored data if available
        """
        raise NotImplementedError("Subclasses must implement store")
    
    def update(self, id: str, data: Dict[str, Any], **kwargs) -> bool:
        """
        Update data in the knowledge base.
        
        Args:
            id: ID of data to update
            data: Updated data
            **kwargs: Additional update parameters
            
        Returns:
            True if successful
        """
        raise NotImplementedError("Subclasses must implement update")
    
    def delete(self, id: str, **kwargs) -> bool:
        """
        Delete data from the knowledge base.
        
        Args:
            id: ID of data to delete
            **kwargs: Additional deletion parameters
            
        Returns:
            True if successful
        """
        raise NotImplementedError("Subclasses must implement delete")


class CachedKnowledgeBaseAdapter(KnowledgeBaseAdapter):
    """Knowledge base adapter with caching support"""
    
    def __init__(self, config: Dict[str, Any], adapter: KnowledgeBaseAdapter):
        """
        Initialize the cached knowledge base adapter.
        
        Args:
            config: Configuration dictionary
            adapter: Base knowledge base adapter to wrap
        """
        super().__init__(config)
        self.adapter = adapter
        self.cache_enabled = config.get("cache_enabled", True) and REDIS_AVAILABLE
        self.cache_ttl = config.get("cache_ttl", 3600)  # 1 hour default
        
        if self.cache_enabled:
            try:
                self.redis = redis.Redis(
                    host=config.get("redis_host", "localhost"),
                    port=config.get("redis_port", 6379),
                    db=config.get("redis_db", 0),
                    password=config.get("redis_password")
                )
                # Test connection
                self.redis.ping()
                logger.info("Redis cache connected")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.cache_enabled = False
    
    def _get_cache_key(self, operation: str, *args, **kwargs) -> str:
        """
        Generate a cache key for the operation and parameters.
        
        Args:
            operation: Operation name
            *args: Operation arguments
            **kwargs: Operation keyword arguments
            
        Returns:
            Cache key
        """
        # Create a string representation of the operation and parameters
        key_parts = [operation]
        key_parts.extend([str(arg) for arg in args])
        key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
        key_str = "|".join(key_parts)
        
        # Hash the string to create a fixed-length key
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        return f"kb:{key_hash}"
    
    def query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Query the knowledge base with caching.
        
        Args:
            query: Query string
            **kwargs: Additional query parameters
            
        Returns:
            List of results
        """
        # Skip cache for certain operations
        skip_cache = kwargs.pop("skip_cache", False)
        
        if self.cache_enabled and not skip_cache:
            # Check cache
            cache_key = self._get_cache_key("query", query, **kwargs)
            cached_result = self.redis.get(cache_key)
            
            if cached_result:
                try:
                    logger.debug(f"Cache hit for query: {query}")
                    return json.loads(cached_result)
                except Exception as e:
                    logger.warning(f"Failed to parse cached result: {e}")
        
        # Get result from adapter
        result = self.adapter.query(query, **kwargs)
        
        # Cache result
        if self.cache_enabled and not skip_cache:
            try:
                self.redis.setex(
                    cache_key,
                    self.cache_ttl,
                    json.dumps(result)
                )
            except Exception as e:
                logger.warning(f"Failed to cache result: {e}")
        
        return result
    
    def store(self, data: Dict[str, Any], **kwargs) -> Optional[str]:
        """
        Store data in the knowledge base and invalidate related caches.
        
        Args:
            data: Data to store
            **kwargs: Additional storage parameters
            
        Returns:
            ID of stored data if available
        """
        # Store in adapter
        result = self.adapter.store(data, **kwargs)
        
        # Invalidate cache
        if self.cache_enabled and result:
            # We can't know exactly which queries will be affected, so we don't
            # invalidate specific keys. Cluster environments would need more
            # sophisticated cache invalidation strategies.
            pass
        
        return result
    
    def update(self, id: str, data: Dict[str, Any], **kwargs) -> bool:
        """
        Update data in the knowledge base and invalidate related caches.
        
        Args:
            id: ID of data to update
            data: Updated data
            **kwargs: Additional update parameters
            
        Returns:
            True if successful
        """
        # Update in adapter
        result = self.adapter.update(id, data, **kwargs)
        
        # Invalidate cache
        if self.cache_enabled and result:
            # Similar to store, we don't attempt to invalidate specific keys
            pass
        
        return result
    
    def delete(self, id: str, **kwargs) -> bool:
        """
        Delete data from the knowledge base and invalidate related caches.
        
        Args:
            id: ID of data to delete
            **kwargs: Additional deletion parameters
            
        Returns:
            True if successful
        """
        # Delete from adapter
        result = self.adapter.delete(id, **kwargs)
        
        # Invalidate cache
        if self.cache_enabled and result:
            # Similar to store, we don't attempt to invalidate specific keys
            pass
        
        return result


class KnowledgeGraphAdapter(KnowledgeBaseAdapter):
    """Adapter for the Devloop Knowledge Graph"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the knowledge graph adapter.
        
        Args:
            config: Configuration dictionary
        """
        super().__init__(config)
        
        self.kg_path = config.get("kg_path")
        if not self.kg_path or not os.path.exists(self.kg_path):
            raise ValueError(f"Knowledge graph path not found: {self.kg_path}")
        
        # Dynamic import of the knowledge graph module
        try:
            # Add potential import paths
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
            
            # First try the SDK module paths
            for module_path in [
                "memory_knowledge_graph",
                "memory.manager.memory_knowledge_graph",
                "backups.system-core-backup.system-core.memory.manager.memory_knowledge_graph"
            ]:
                try:
                    module_parts = module_path.split(".")
                    if len(module_parts) > 1:
                        parent_module = __import__(module_path, fromlist=[module_parts[-1]])
                        self.kg_module = parent_module
                        break
                except (ImportError, AttributeError):
                    continue
            
            # If not found, try absolute import as fallback
            if not hasattr(self, "kg_module"):
                # Hard fallback using fixed path - not recommended but necessary
                # for compatibility with existing system
                sys.path.append("/mnt/c/Users/angel/Devloop/backups/system-core-backup/system-core/memory/manager")
                import memory_knowledge_graph
                self.kg_module = memory_knowledge_graph
            
            # Load the knowledge graph
            self.kg = self.kg_module.load_knowledge_graph(self.kg_path)
            logger.info(f"Knowledge graph loaded from {self.kg_path}")
        
        except Exception as e:
            logger.error(f"Failed to load knowledge graph: {e}")
            raise
    
    def query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Query the knowledge graph.
        
        Args:
            query: Query string
            **kwargs: Additional query parameters
                - node_types: List of node types to filter by
                - relationship_types: List of relationship types to traverse
                - max_results: Maximum number of results to return
                - traverse_depth: Maximum depth to traverse relationships
            
        Returns:
            List of results
        """
        node_types = kwargs.get("node_types", [])
        relationship_types = kwargs.get("relationship_types", [])
        max_results = kwargs.get("max_results", 10)
        traverse_depth = kwargs.get("traverse_depth", 1)
        
        results = []
        
        # First query by node types
        if node_types:
            for node_type in node_types:
                nodes = self.kg.get_nodes_by_type(node_type)
                
                for node in nodes:
                    # Simple keyword matching for now
                    # In production, this should use vector embeddings
                    name = node["properties"].get("name", "").lower()
                    description = node["properties"].get("description", "").lower()
                    
                    if query.lower() in name or query.lower() in description:
                        results.append(node)
        
        # If no results or no node_types specified, try general search
        if not results:
            # Search all nodes
            for node_id, node in self.kg.memory["knowledge_graph"]["nodes"].items():
                # Simple keyword matching
                name = node["properties"].get("name", "").lower()
                description = node["properties"].get("description", "").lower()
                
                if query.lower() in name or query.lower() in description:
                    results.append(node)
        
        # Traverse relationships if specified
        if relationship_types and results and traverse_depth > 0:
            related_nodes = set()
            
            for node in results:
                # For each result, traverse its relationships
                for relationship_type in relationship_types:
                    # Get outgoing edges of this type
                    edges = [e for e in self.kg.get_outgoing_edges(node["id"]) 
                             if e["type"] == relationship_type]
                    
                    # Add target nodes
                    for edge in edges:
                        target_node = self.kg.get_node(edge["target"])
                        if target_node:
                            related_nodes.add(target_node["id"])
            
            # Add related nodes to results
            for node_id in related_nodes:
                node = self.kg.get_node(node_id)
                if node and node not in results:
                    results.append(node)
        
        # Limit results
        results = results[:max_results]
        
        # Convert to consistent format
        formatted_results = []
        for node in results:
            formatted_results.append({
                "id": node["id"],
                "type": node["type"],
                "properties": node["properties"],
                "metadata": node.get("metadata", {})
            })
        
        return formatted_results
    
    def store(self, data: Dict[str, Any], **kwargs) -> Optional[str]:
        """
        Store a node in the knowledge graph.
        
        Args:
            data: Node data including type and properties
            **kwargs: Additional parameters
                - node_id: Optional ID for the node
                - save: Whether to save changes to disk
            
        Returns:
            ID of the node
        """
        node_id = kwargs.get("node_id") or data.get("id")
        if not node_id:
            node_id = f"{data.get('type', 'node')}-{str(uuid.uuid4())[:8]}"
        
        node_type = data.get("type", "unknown")
        properties = data.get("properties", {})
        metadata = data.get("metadata", {})
        
        # Add the node
        self.kg.add_node(node_id, node_type, properties, metadata)
        
        # Save changes if requested
        if kwargs.get("save", True):
            save_path = kwargs.get("save_path", self.kg_path)
            self.kg.save(save_path)
        
        return node_id
    
    def update(self, id: str, data: Dict[str, Any], **kwargs) -> bool:
        """
        Update a node in the knowledge graph.
        
        Args:
            id: ID of the node to update
            data: Updated node data
            **kwargs: Additional parameters
                - save: Whether to save changes to disk
            
        Returns:
            True if successful
        """
        node = self.kg.get_node(id)
        if not node:
            return False
        
        # Update properties
        if "properties" in data:
            node["properties"].update(data["properties"])
        
        # Update metadata
        if "metadata" in data:
            if "metadata" not in node:
                node["metadata"] = {}
            node["metadata"].update(data["metadata"])
        
        # Update timestamp
        node["updated_at"] = time.time()
        
        # Save changes if requested
        if kwargs.get("save", True):
            save_path = kwargs.get("save_path", self.kg_path)
            self.kg.save(save_path)
        
        return True
    
    def delete(self, id: str, **kwargs) -> bool:
        """
        Delete a node from the knowledge graph.
        
        Args:
            id: ID of the node to delete
            **kwargs: Additional parameters
                - save: Whether to save changes to disk
                - remove_edges: Whether to remove connected edges
            
        Returns:
            True if successful
        """
        remove_edges = kwargs.get("remove_edges", True)
        
        # Remove the node
        success = self.kg.remove_node(id, remove_edges)
        
        # Save changes if requested
        if success and kwargs.get("save", True):
            save_path = kwargs.get("save_path", self.kg_path)
            self.kg.save(save_path)
        
        return success


class VectorDatabaseAdapter(KnowledgeBaseAdapter):
    """Adapter for vector databases with semantic search"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the vector database adapter.
        
        Args:
            config: Configuration dictionary
        """
        super().__init__(config)
        
        if not VECTOR_DB_AVAILABLE:
            raise ImportError("Vector database dependencies not available")
        
        self.persist_directory = config.get("persist_directory")
        if not self.persist_directory:
            self.persist_directory = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "vector_db"
            )
            os.makedirs(self.persist_directory, exist_ok=True)
        
        # Initialize embeddings model
        self.embedding_model = OpenAIEmbeddings(
            openai_api_key=config.get("openai_api_key")
        )
        
        # Initialize vector database
        try:
            self.vector_db = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_model
            )
            logger.info(f"Vector database initialized at {self.persist_directory}")
        except Exception as e:
            logger.error(f"Failed to initialize vector database: {e}")
            raise
    
    def query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Query the vector database using semantic search.
        
        Args:
            query: Query string
            **kwargs: Additional query parameters
                - k: Number of results to return
                - filter: Filter to apply to results
            
        Returns:
            List of results
        """
        k = kwargs.get("k", 5)
        filter_dict = kwargs.get("filter")
        
        try:
            # Perform similarity search
            documents = self.vector_db.similarity_search(
                query=query,
                k=k,
                filter=filter_dict
            )
            
            # Format results
            results = []
            for doc in documents:
                result = {
                    "id": doc.metadata.get("id", "unknown"),
                    "content": doc.page_content,
                    "metadata": doc.metadata
                }
                results.append(result)
            
            return results
        
        except Exception as e:
            logger.error(f"Vector database query failed: {e}")
            return []
    
    def store(self, data: Dict[str, Any], **kwargs) -> Optional[str]:
        """
        Store data in the vector database.
        
        Args:
            data: Data to store
                - content: Text content to embed
                - metadata: Metadata for the document
            **kwargs: Additional storage parameters
                - id: Optional ID for the document
            
        Returns:
            ID of stored data if available
        """
        content = data.get("content")
        if not content:
            raise ValueError("Content is required for vector database storage")
        
        metadata = data.get("metadata", {})
        doc_id = kwargs.get("id") or str(uuid.uuid4())
        
        # Add ID to metadata
        metadata["id"] = doc_id
        
        try:
            # Add to vector database
            self.vector_db.add_texts(
                texts=[content],
                metadatas=[metadata],
                ids=[doc_id]
            )
            
            # Persist changes
            self.vector_db.persist()
            
            return doc_id
        
        except Exception as e:
            logger.error(f"Vector database storage failed: {e}")
            return None
    
    def update(self, id: str, data: Dict[str, Any], **kwargs) -> bool:
        """
        Update data in the vector database.
        
        Args:
            id: ID of data to update
            data: Updated data
                - content: New text content
                - metadata: Updated metadata
            **kwargs: Additional update parameters
            
        Returns:
            True if successful
        """
        # Vector databases typically don't support direct updates
        # We need to delete and re-add the document
        try:
            # Delete existing document
            self.vector_db.delete([id])
            
            # Add updated document
            content = data.get("content")
            metadata = data.get("metadata", {})
            metadata["id"] = id
            
            self.vector_db.add_texts(
                texts=[content],
                metadatas=[metadata],
                ids=[id]
            )
            
            # Persist changes
            self.vector_db.persist()
            
            return True
        
        except Exception as e:
            logger.error(f"Vector database update failed: {e}")
            return False
    
    def delete(self, id: str, **kwargs) -> bool:
        """
        Delete data from the vector database.
        
        Args:
            id: ID of data to delete
            **kwargs: Additional deletion parameters
            
        Returns:
            True if successful
        """
        try:
            # Delete document
            self.vector_db.delete([id])
            
            # Persist changes
            self.vector_db.persist()
            
            return True
        
        except Exception as e:
            logger.error(f"Vector database deletion failed: {e}")
            return False


class MongoDBAdapter(KnowledgeBaseAdapter):
    """Adapter for MongoDB persistent storage"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the MongoDB adapter.
        
        Args:
            config: Configuration dictionary
        """
        super().__init__(config)
        
        if not MONGODB_AVAILABLE:
            raise ImportError("MongoDB not available")
        
        # Connect to MongoDB
        try:
            self.client = pymongo.MongoClient(
                host=config.get("mongo_host", "localhost"),
                port=config.get("mongo_port", 27017),
                username=config.get("mongo_username"),
                password=config.get("mongo_password")
            )
            
            # Get database and collection
            db_name = config.get("mongo_db", "devloop")
            collection_name = config.get("mongo_collection", "knowledge")
            
            self.db = self.client[db_name]
            self.collection = self.db[collection_name]
            
            logger.info(f"MongoDB connected to {db_name}.{collection_name}")
        
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def query(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Query MongoDB.
        
        Args:
            query: Query string (used as text search if text index exists)
            **kwargs: Additional query parameters
                - filter: MongoDB filter dictionary
                - projection: MongoDB projection dictionary
                - sort: MongoDB sort specification
                - limit: Maximum number of results
                - skip: Number of results to skip
            
        Returns:
            List of results
        """
        filter_dict = kwargs.get("filter", {})
        projection = kwargs.get("projection", {})
        sort = kwargs.get("sort", [("_id", pymongo.DESCENDING)])
        limit = kwargs.get("limit", 100)
        skip = kwargs.get("skip", 0)
        
        # Add text search if query is provided and no filter is specified
        if query and not filter_dict:
            try:
                # Try text search if text index exists
                results = list(self.collection.find(
                    {"$text": {"$search": query}},
                    projection=projection,
                    sort=sort,
                    limit=limit,
                    skip=skip
                ))
                
                # If results found, return them
                if results:
                    return self._format_mongo_results(results)
            
            except pymongo.errors.OperationFailure:
                # Text index might not exist, use regex search instead
                pass
            
            # Fallback to regex search
            filter_dict = {
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                    {"content": {"$regex": query, "$options": "i"}}
                ]
            }
        
        # Perform query
        try:
            results = list(self.collection.find(
                filter=filter_dict,
                projection=projection,
                sort=sort,
                limit=limit,
                skip=skip
            ))
            
            return self._format_mongo_results(results)
        
        except Exception as e:
            logger.error(f"MongoDB query failed: {e}")
            return []
    
    def _format_mongo_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Format MongoDB results for consistency.
        
        Args:
            results: MongoDB query results
            
        Returns:
            Formatted results
        """
        formatted_results = []
        
        for result in results:
            # Convert MongoDB _id to string id
            result_id = str(result.pop("_id"))
            
            formatted_result = {
                "id": result.get("id", result_id),
                "type": result.get("type", "document"),
                "properties": result.get("properties", {}),
                "metadata": result.get("metadata", {})
            }
            
            # Copy other fields
            for key, value in result.items():
                if key not in ["id", "type", "properties", "metadata"]:
                    formatted_result[key] = value
            
            formatted_results.append(formatted_result)
        
        return formatted_results
    
    def store(self, data: Dict[str, Any], **kwargs) -> Optional[str]:
        """
        Store data in MongoDB.
        
        Args:
            data: Data to store
            **kwargs: Additional storage parameters
                - id: Optional ID for the document
            
        Returns:
            ID of stored data if available
        """
        # Prepare document
        doc = data.copy()
        
        # Use provided ID or generate one
        doc_id = kwargs.get("id") or doc.get("id") or str(uuid.uuid4())
        doc["id"] = doc_id
        
        try:
            # Insert document
            result = self.collection.insert_one(doc)
            return doc_id
        
        except Exception as e:
            logger.error(f"MongoDB storage failed: {e}")
            return None
    
    def update(self, id: str, data: Dict[str, Any], **kwargs) -> bool:
        """
        Update data in MongoDB.
        
        Args:
            id: ID of data to update
            data: Updated data
            **kwargs: Additional update parameters
                - upsert: Whether to insert if not exists
            
        Returns:
            True if successful
        """
        upsert = kwargs.get("upsert", False)
        
        try:
            # Prepare update document
            update_doc = {"$set": data}
            
            # Update document
            result = self.collection.update_one(
                {"id": id},
                update_doc,
                upsert=upsert
            )
            
            return result.modified_count > 0 or (upsert and result.upserted_id)
        
        except Exception as e:
            logger.error(f"MongoDB update failed: {e}")
            return False
    
    def delete(self, id: str, **kwargs) -> bool:
        """
        Delete data from MongoDB.
        
        Args:
            id: ID of data to delete
            **kwargs: Additional deletion parameters
            
        Returns:
            True if successful
        """
        try:
            # Delete document
            result = self.collection.delete_one({"id": id})
            return result.deleted_count > 0
        
        except Exception as e:
            logger.error(f"MongoDB deletion failed: {e}")
            return False


class KnowledgeBaseFactory:
    """Factory for creating knowledge base adapters"""
    
    @staticmethod
    def create_adapter(adapter_type: str, config: Dict[str, Any]) -> KnowledgeBaseAdapter:
        """
        Create a knowledge base adapter.
        
        Args:
            adapter_type: Type of adapter to create
            config: Configuration dictionary
            
        Returns:
            Knowledge base adapter
        """
        adapter_map = {
            "knowledge_graph": KnowledgeGraphAdapter,
            "vector_db": VectorDatabaseAdapter,
            "mongodb": MongoDBAdapter
        }
        
        if adapter_type not in adapter_map:
            raise ValueError(f"Unknown adapter type: {adapter_type}")
        
        # Create the adapter
        try:
            adapter = adapter_map[adapter_type](config)
            
            # Wrap with caching if enabled
            if config.get("cache_enabled", True) and REDIS_AVAILABLE:
                return CachedKnowledgeBaseAdapter(config, adapter)
            
            return adapter
        
        except Exception as e:
            logger.error(f"Failed to create adapter of type {adapter_type}: {e}")
            raise


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Knowledge Base Adapter")
    parser.add_argument("--type", choices=["knowledge_graph", "vector_db", "mongodb"],
                        default="knowledge_graph", help="Adapter type")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--query", help="Query string")
    parser.add_argument("--kg-path", help="Knowledge graph path")
    
    args = parser.parse_args()
    
    # Load configuration
    config = {}
    if args.config:
        with open(args.config, 'r') as f:
            config = json.load(f)
    
    # Override with command line arguments
    if args.kg_path:
        config["kg_path"] = args.kg_path
    
    # Create adapter
    try:
        adapter = KnowledgeBaseFactory.create_adapter(args.type, config)
        
        # Perform query if provided
        if args.query:
            results = adapter.query(args.query)
            print(json.dumps(results, indent=2))
    
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)