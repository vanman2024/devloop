#!/usr/bin/env python3
"""
Integrations Module for SDK-First Architecture

This module provides integration helpers for connecting the SDK components
with external systems like LangChain, Redis, MongoDB, and vector databases.
"""

import os
import sys
import json
import logging
import importlib.util
from typing import Dict, List, Any, Optional, Union, Callable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("integrations")

def dynamic_import(module_name: str, paths: List[str] = None) -> Optional[Any]:
    """
    Dynamically import a module by name, searching additional paths if provided.
    
    Args:
        module_name: Name of the module to import
        paths: Additional paths to search
        
    Returns:
        Imported module or None if not found
    """
    # Try standard import first
    try:
        return importlib.import_module(module_name)
    except ImportError:
        pass
    
    # Try with provided paths
    if paths:
        for path in paths:
            if path not in sys.path and os.path.exists(path):
                sys.path.append(path)
        
        # Try import again with updated paths
        try:
            return importlib.import_module(module_name)
        except ImportError:
            pass
    
    # Try searching for the module file
    module_filename = f"{module_name.replace('.', os.sep)}.py"
    search_paths = sys.path.copy()
    
    # Add script directory and parent
    script_dir = os.path.dirname(os.path.abspath(__file__))
    search_paths.extend([
        script_dir,
        os.path.abspath(os.path.join(script_dir, "..")),
        os.path.abspath(os.path.join(script_dir, "..", "..")),
        os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    ])
    
    for path in search_paths:
        module_path = os.path.join(path, module_filename)
        if os.path.isfile(module_path):
            # Found module file, import it
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            if spec:
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                return module
    
    return None

def get_knowledge_base_adapter(config: Dict[str, Any] = None) -> Optional[Any]:
    """
    Get the appropriate knowledge base adapter based on configuration.
    
    Args:
        config: Configuration dictionary with adapter settings
        
    Returns:
        Knowledge base adapter or None if not available
    """
    if config is None:
        config = {}
    
    # Try to import the adapter module
    search_paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "adapters"))
    ]
    
    adapter_module = dynamic_import("knowledge_base_adapter", search_paths)
    if not adapter_module:
        logger.warning("Knowledge base adapter module not found")
        return None
    
    # Determine adapter type
    adapter_type = config.get("adapter_type", "knowledge_graph")
    
    # Create adapter
    try:
        adapter = adapter_module.KnowledgeBaseFactory.create_adapter(adapter_type, config)
        return adapter
    except Exception as e:
        logger.error(f"Failed to create knowledge base adapter: {e}")
        return None

def get_langchain_integration(config: Dict[str, Any] = None) -> Optional[Any]:
    """
    Get the LangChain integration adapter based on configuration.
    
    Args:
        config: Configuration dictionary with LangChain settings
        
    Returns:
        LangChain integration or None if not available
    """
    if config is None:
        config = {}
    
    # Check if LangChain is available
    try:
        import langchain
        from langchain.schema import Document
    except ImportError:
        logger.warning("LangChain not available")
        return None
    
    # Initialize LangChain components
    try:
        # This is a simplified implementation - a real integration would
        # create proper adapters for various LangChain components
        return {
            "langchain_available": True,
            "document_class": Document,
            "config": config
        }
    except Exception as e:
        logger.error(f"Failed to initialize LangChain integration: {e}")
        return None

def get_redis_client(config: Dict[str, Any] = None) -> Optional[Any]:
    """
    Get a Redis client instance based on configuration.
    
    Args:
        config: Configuration dictionary with Redis settings
        
    Returns:
        Redis client or None if not available
    """
    if config is None:
        config = {}
    
    # Check if Redis is available
    try:
        import redis
    except ImportError:
        logger.warning("Redis not available")
        return None
    
    # Connect to Redis
    try:
        client = redis.Redis(
            host=config.get("redis_host", "localhost"),
            port=config.get("redis_port", 6379),
            db=config.get("redis_db", 0),
            password=config.get("redis_password"),
            decode_responses=config.get("decode_responses", True)
        )
        
        # Test connection
        client.ping()
        return client
    
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return None

def get_mongodb_client(config: Dict[str, Any] = None) -> Optional[Any]:
    """
    Get a MongoDB client instance based on configuration.
    
    Args:
        config: Configuration dictionary with MongoDB settings
        
    Returns:
        MongoDB client or None if not available
    """
    if config is None:
        config = {}
    
    # Check if MongoDB is available
    try:
        import pymongo
    except ImportError:
        logger.warning("MongoDB not available")
        return None
    
    # Connect to MongoDB
    try:
        client = pymongo.MongoClient(
            host=config.get("mongo_host", "localhost"),
            port=config.get("mongo_port", 27017),
            username=config.get("mongo_username"),
            password=config.get("mongo_password")
        )
        
        # Test connection
        client.admin.command("ping")
        return client
    
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        return None

def get_vector_db_client(config: Dict[str, Any] = None) -> Optional[Any]:
    """
    Get a vector database client based on configuration.
    
    Args:
        config: Configuration dictionary with vector DB settings
        
    Returns:
        Vector DB client or None if not available
    """
    if config is None:
        config = {}
    
    # Check if vector DB dependencies are available
    try:
        from langchain.vectorstores import Chroma
        from langchain.embeddings import OpenAIEmbeddings
    except ImportError:
        logger.warning("Vector database dependencies not available")
        return None
    
    # Initialize vector DB
    try:
        # Initialize embeddings model
        embedding_model = OpenAIEmbeddings(
            openai_api_key=config.get("openai_api_key")
        )
        
        # Initialize vector database
        persist_directory = config.get("persist_directory")
        if not persist_directory:
            persist_directory = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "vector_db"
            )
            os.makedirs(persist_directory, exist_ok=True)
        
        vector_db = Chroma(
            persist_directory=persist_directory,
            embedding_function=embedding_model
        )
        
        return vector_db
    
    except Exception as e:
        logger.error(f"Failed to initialize vector database: {e}")
        return None

def load_integration_config() -> Dict[str, Any]:
    """
    Load integration configuration from environment or config file.
    
    Returns:
        Integration configuration dictionary
    """
    config = {}
    
    # Check for config file
    config_file = os.environ.get("SDK_INTEGRATION_CONFIG")
    if config_file and os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
        except Exception as e:
            logger.error(f"Failed to load integration config file: {e}")
    
    # Override with environment variables
    env_prefix = "SDK_"
    for key, value in os.environ.items():
        if key.startswith(env_prefix):
            config_key = key[len(env_prefix):].lower()
            config[config_key] = value
    
    return config

def initialize_integrations() -> Dict[str, Any]:
    """
    Initialize all available integrations.
    
    Returns:
        Dictionary of available integrations
    """
    # Load configuration
    config = load_integration_config()
    
    # Initialize integrations
    integrations = {}
    
    # Knowledge base
    kb_adapter = get_knowledge_base_adapter(config.get("knowledge_base", {}))
    if kb_adapter:
        integrations["knowledge_base"] = kb_adapter
    
    # LangChain
    langchain_integration = get_langchain_integration(config.get("langchain", {}))
    if langchain_integration:
        integrations["langchain"] = langchain_integration
    
    # Redis
    redis_client = get_redis_client(config.get("redis", {}))
    if redis_client:
        integrations["redis"] = redis_client
    
    # MongoDB
    mongodb_client = get_mongodb_client(config.get("mongodb", {}))
    if mongodb_client:
        integrations["mongodb"] = mongodb_client
    
    # Vector DB
    vector_db_client = get_vector_db_client(config.get("vector_db", {}))
    if vector_db_client:
        integrations["vector_db"] = vector_db_client
    
    return integrations


# Global instance
integrations = None

def get_integrations() -> Dict[str, Any]:
    """
    Get initialized integrations, initializing them if needed.
    
    Returns:
        Dictionary of available integrations
    """
    global integrations
    if integrations is None:
        integrations = initialize_integrations()
    return integrations


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="SDK Integrations")
    parser.add_argument("--list", action="store_true", help="List available integrations")
    parser.add_argument("--test", help="Test specific integration")
    parser.add_argument("--config", help="Configuration file path")
    
    args = parser.parse_args()
    
    # Set config file if provided
    if args.config:
        os.environ["SDK_INTEGRATION_CONFIG"] = args.config
    
    # Initialize integrations
    available_integrations = get_integrations()
    
    # List available integrations
    if args.list:
        print("Available integrations:")
        for name in available_integrations:
            print(f"- {name}")
    
    # Test specific integration
    if args.test:
        if args.test in available_integrations:
            print(f"Integration {args.test} is available")
            
            # Perform basic test
            if args.test == "knowledge_base":
                # Test query
                kb = available_integrations["knowledge_base"]
                results = kb.query("test")
                print(f"Found {len(results)} results")
            
            elif args.test == "redis":
                # Test set/get
                redis_client = available_integrations["redis"]
                redis_client.set("test_key", "test_value")
                value = redis_client.get("test_key")
                print(f"Redis test: {value}")
            
            elif args.test == "mongodb":
                # Test connection
                mongodb_client = available_integrations["mongodb"]
                dbs = mongodb_client.list_database_names()
                print(f"MongoDB databases: {dbs}")
            
            elif args.test == "vector_db":
                # Test basic operation
                vector_db = available_integrations["vector_db"]
                collection_name = vector_db._collection_name
                print(f"Vector DB collection: {collection_name}")
        
        else:
            print(f"Integration {args.test} is not available")