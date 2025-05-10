#!/usr/bin/env python3
"""
Enhanced Context Manager for SDK-First Architecture

This module extends the ContextManager in the AdaptivePromptManager with
additional capabilities for managing persistent context across sessions,
context serialization, and storage optimization.
"""

import os
import sys
import json
import time
import uuid
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] - %(message)s"
)
logger = logging.getLogger("enhanced_context_manager")

# Add parent directories to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
sdk_dir = os.path.abspath(os.path.join(script_dir, ".."))
if sdk_dir not in sys.path:
    sys.path.append(sdk_dir)

try:
    from utils.activity_logger import log_prompt_activity
except ImportError:
    # Fallback for when activity logger is not available
    def log_prompt_activity(subtype: str, details: Dict[str, Any], 
                         title: Optional[str] = None, 
                         description: Optional[str] = None) -> None:
        """Fallback activity logger that just logs to the enhanced_context_manager logger."""
        logger.debug(f"Activity: {subtype} - {title or 'No title'} - {details}")


class EnhancedContextManager:
    """Enhanced context manager with persistent storage and session management"""
    
    def __init__(self, 
               base_context_manager: Optional[Any] = None,
               context_dir: Optional[str] = None,
               max_history: int = 20,
               use_redis: bool = True,
               use_mongodb: bool = True):
        """
        Initialize the enhanced context manager.
        
        Args:
            base_context_manager: Optional existing context manager to wrap
            context_dir: Directory to store context files
            max_history: Maximum number of commands to store in history
            use_redis: Whether to use Redis for caching context
            use_mongodb: Whether to use MongoDB for persistent storage
        """
        self.base_context_manager = base_context_manager
        self.context_dir = context_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "contexts"
        )
        self.max_history = max_history
        self.contexts = {}
        self.current_context_id = None
        self.active_sessions = set()
        
        # Ensure context directory exists
        os.makedirs(self.context_dir, exist_ok=True)
        
        # Initialize integrations
        self.redis_client = None
        self.mongo_client = None
        self.database = None
        
        if use_redis or use_mongodb:
            self._init_integrations(use_redis, use_mongodb)
        
        logger.info(f"Enhanced context manager initialized with directory: {self.context_dir}")
        
        log_prompt_activity("init_enhanced_context", {
            "context_dir": self.context_dir,
            "max_history": max_history,
            "redis_enabled": self.redis_client is not None,
            "mongodb_enabled": self.mongo_client is not None
        })
    
    def _init_integrations(self, use_redis: bool, use_mongodb: bool) -> None:
        """Initialize integrations with Redis and MongoDB"""
        # Try to import from integrations if available
        try:
            # Try to import with relative path
            from .integrations import get_redis_client, get_mongodb_client
            
            # Try to get Redis client
            if use_redis:
                self.redis_client = get_redis_client()
                if self.redis_client:
                    logger.info("Redis client initialized for enhanced context")
            
            # Try to get MongoDB client
            if use_mongodb:
                self.mongo_client = get_mongodb_client()
                if self.mongo_client:
                    self.database = self.mongo_client.get_database("devloop")
                    logger.info("MongoDB client initialized for enhanced context")
        
        except ImportError:
            # Direct initialization if integrations module not available
            if use_redis:
                try:
                    import redis
                    self.redis_client = redis.Redis(
                        host=os.environ.get("REDIS_HOST", "localhost"),
                        port=int(os.environ.get("REDIS_PORT", 6379)),
                        db=int(os.environ.get("REDIS_DB", 0)),
                        password=os.environ.get("REDIS_PASSWORD", None),
                        decode_responses=True
                    )
                    # Test connection
                    self.redis_client.ping()
                    logger.info("Redis client initialized for enhanced context")
                except (ImportError, Exception) as e:
                    logger.warning(f"Failed to initialize Redis: {e}")
            
            if use_mongodb:
                try:
                    import pymongo
                    self.mongo_client = pymongo.MongoClient(
                        host=os.environ.get("MONGO_HOST", "localhost"),
                        port=int(os.environ.get("MONGO_PORT", 27017)),
                        username=os.environ.get("MONGO_USERNAME", None),
                        password=os.environ.get("MONGO_PASSWORD", None)
                    )
                    self.database = self.mongo_client.get_database("devloop")
                    logger.info("MongoDB client initialized for enhanced context")
                except (ImportError, Exception) as e:
                    logger.warning(f"Failed to initialize MongoDB: {e}")
    
    def create_context(self, context_id: Optional[str] = None, metadata: Dict[str, Any] = None) -> str:
        """
        Create a new context.
        
        Args:
            context_id: Optional ID for the context
            metadata: Optional metadata for the context
            
        Returns:
            Context ID
        """
        # Generate ID if not provided
        if not context_id:
            context_id = str(uuid.uuid4())
        
        # Create context structure
        self.contexts[context_id] = {
            "id": context_id,
            "created_at": time.time(),
            "updated_at": time.time(),
            "history": [],
            "data": {},
            "metadata": metadata or {},
            "sessions": []
        }
        
        self.current_context_id = context_id
        logger.info(f"Created context: {context_id}")
        
        # Log activity
        log_prompt_activity("create_context", {
            "context_id": context_id,
            "metadata": metadata
        })
        
        return context_id
    
    def get_context(self, context_id: Optional[str] = None, create_if_missing: bool = True) -> Dict[str, Any]:
        """
        Get a context by ID.
        
        Args:
            context_id: ID of the context to get
            create_if_missing: Whether to create context if not found
            
        Returns:
            Context data
        """
        # Use current context if none specified
        if not context_id:
            context_id = self.get_current_context_id()
        
        # If context is already loaded, return it
        if context_id in self.contexts:
            return self.contexts[context_id]
        
        # Try to get from Redis cache first
        if self.redis_client:
            try:
                redis_key = f"context:{context_id}"
                cached_context = self.redis_client.get(redis_key)
                if cached_context:
                    self.contexts[context_id] = json.loads(cached_context)
                    logger.info(f"Loaded context {context_id} from Redis")
                    
                    # Log activity
                    log_prompt_activity("load_context_from_cache", {
                        "context_id": context_id,
                        "source": "redis"
                    })
                    
                    return self.contexts[context_id]
            except Exception as e:
                logger.error(f"Error loading context from Redis: {e}")
        
        # Try to get from MongoDB next
        if self.database:
            try:
                context_collection = self.database.get_collection("contexts")
                context_doc = context_collection.find_one({"id": context_id})
                if context_doc:
                    # Remove MongoDB _id
                    if "_id" in context_doc:
                        del context_doc["_id"]
                    
                    self.contexts[context_id] = context_doc
                    logger.info(f"Loaded context {context_id} from MongoDB")
                    
                    # Cache in Redis if available
                    if self.redis_client:
                        try:
                            redis_key = f"context:{context_id}"
                            self.redis_client.setex(
                                redis_key, 
                                3600,  # 1 hour TTL
                                json.dumps(context_doc)
                            )
                        except Exception as e:
                            logger.error(f"Error caching context in Redis: {e}")
                    
                    # Log activity
                    log_prompt_activity("load_context", {
                        "context_id": context_id,
                        "source": "mongodb"
                    })
                    
                    return self.contexts[context_id]
            except Exception as e:
                logger.error(f"Error loading context from MongoDB: {e}")
        
        # Try to load from file
        try:
            self.load_context(context_id)
            
            # If loaded successfully, return the context
            if context_id in self.contexts:
                return self.contexts[context_id]
        except Exception as e:
            logger.error(f"Error loading context from file: {e}")
        
        # Create new context if requested and not found
        if create_if_missing:
            self.create_context(context_id)
            return self.contexts.get(context_id, {})
        
        # Return empty dict if not found and not created
        return {}
    
    def update_context(self, 
                    context_id: Optional[str] = None, 
                    data: Dict[str, Any] = None,
                    command: Optional[str] = None,
                    metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Update a context with new data.
        
        Args:
            context_id: ID of the context to update
            data: Data to add to the context
            command: Optional command to add to history
            metadata: Optional metadata to update
            
        Returns:
            Context ID
        """
        if data is None:
            data = {}
        
        # Get or create context
        if not context_id:
            context_id = self.get_current_context_id()
            
        context = self.get_context(context_id)
        
        # Update context data
        context["data"].update(data)
        context["updated_at"] = time.time()
        
        # Update metadata if provided
        if metadata:
            if "metadata" not in context:
                context["metadata"] = {}
            context["metadata"].update(metadata)
        
        # Add to history if command present
        if command:
            history_item = {
                "command": command,
                "timestamp": time.time()
            }
            
            if "history" not in context:
                context["history"] = []
            
            context["history"].insert(0, history_item)
            
            # Trim history if needed
            if len(context["history"]) > self.max_history:
                context["history"] = context["history"][:self.max_history]
        
        self.current_context_id = context_id
        
        # Save the updated context
        self.save_context(context_id)
        
        # Log activity
        log_prompt_activity("update_context", {
            "context_id": context_id,
            "data_keys": list(data.keys()) if data else [],
            "command": command,
            "metadata_keys": list(metadata.keys()) if metadata else []
        })
        
        return context_id
    
    def get_current_context_id(self) -> str:
        """
        Get the current context ID or create a new context.
        
        Returns:
            Current context ID
        """
        if not self.current_context_id:
            self.create_context()
            
        return self.current_context_id
    
    def set_current_context(self, context_id: str) -> bool:
        """
        Set the current context ID.
        
        Args:
            context_id: ID of the context to make current
            
        Returns:
            Success status
        """
        # Ensure the context exists or can be loaded
        if context_id not in self.contexts:
            # Try to load the context
            if not self.load_context(context_id):
                logger.warning(f"Cannot set current context to non-existent context: {context_id}")
                return False
        
        self.current_context_id = context_id
        logger.info(f"Set current context to: {context_id}")
        
        # Log activity
        log_prompt_activity("set_current_context", {
            "context_id": context_id
        })
        
        return True
    
    def save_context(self, context_id: str) -> bool:
        """
        Save a context to disk and/or database.
        
        Args:
            context_id: ID of the context to save
            
        Returns:
            Success status
        """
        if context_id not in self.contexts:
            logger.warning(f"Cannot save non-existent context: {context_id}")
            return False
        
        # Update timestamp
        self.contexts[context_id]["updated_at"] = time.time()
        
        # Save to MongoDB if available (most durable option)
        if self.database:
            try:
                context_collection = self.database.get_collection("contexts")
                # Use upsert to create or update
                context_collection.update_one(
                    {"id": context_id},
                    {"$set": self.contexts[context_id]},
                    upsert=True
                )
                logger.info(f"Saved context to MongoDB: {context_id}")
                
                # Update Redis cache if available
                if self.redis_client:
                    try:
                        redis_key = f"context:{context_id}"
                        self.redis_client.setex(
                            redis_key, 
                            3600,  # 1 hour TTL
                            json.dumps(self.contexts[context_id])
                        )
                    except Exception as e:
                        logger.error(f"Error updating context in Redis: {e}")
                
                # Log activity
                log_prompt_activity("save_context", {
                    "context_id": context_id,
                    "destination": "mongodb"
                })
                
                # Since we saved to MongoDB, we can optionally skip file storage
                # for efficiency, but still save to file for robustness
            except Exception as e:
                logger.error(f"Error saving context to MongoDB: {e}")
                # Fall back to file storage
        
        # Save to file (always do this as final backup option)
        context_file = os.path.join(self.context_dir, f"{context_id}.json")
        
        try:
            with open(context_file, 'w') as f:
                json.dump(self.contexts[context_id], f, indent=2)
            logger.info(f"Saved context to file: {context_file}")
            
            # Log activity if we didn't already log MongoDB save
            if not self.database:
                log_prompt_activity("save_context", {
                    "context_id": context_id,
                    "destination": "file",
                    "file_path": context_file
                })
            
            return True
        except Exception as e:
            logger.error(f"Error saving context to file {context_file}: {e}")
            return False
    
    def load_context(self, context_id: str) -> bool:
        """
        Load a context from disk or database.
        
        Args:
            context_id: ID of the context to load
            
        Returns:
            Success status
        """
        # Try Redis cache first if available
        if self.redis_client:
            try:
                redis_key = f"context:{context_id}"
                cached_context = self.redis_client.get(redis_key)
                if cached_context:
                    self.contexts[context_id] = json.loads(cached_context)
                    logger.info(f"Loaded context {context_id} from Redis")
                    
                    # Log activity
                    log_prompt_activity("load_context", {
                        "context_id": context_id,
                        "source": "redis"
                    })
                    
                    return True
            except Exception as e:
                logger.error(f"Error loading context from Redis: {e}")
        
        # Try MongoDB next if available
        if self.database:
            try:
                context_collection = self.database.get_collection("contexts")
                context_doc = context_collection.find_one({"id": context_id})
                if context_doc:
                    # Remove MongoDB _id
                    if "_id" in context_doc:
                        del context_doc["_id"]
                    
                    self.contexts[context_id] = context_doc
                    logger.info(f"Loaded context {context_id} from MongoDB")
                    
                    # Update Redis cache if available
                    if self.redis_client:
                        try:
                            redis_key = f"context:{context_id}"
                            self.redis_client.setex(
                                redis_key, 
                                3600,  # 1 hour TTL
                                json.dumps(context_doc)
                            )
                        except Exception as e:
                            logger.error(f"Error caching context in Redis: {e}")
                    
                    # Log activity
                    log_prompt_activity("load_context", {
                        "context_id": context_id,
                        "source": "mongodb"
                    })
                    
                    return True
            except Exception as e:
                logger.error(f"Error loading context from MongoDB: {e}")
        
        # Fall back to file-based storage
        context_file = os.path.join(self.context_dir, f"{context_id}.json")
        
        if not os.path.exists(context_file):
            logger.warning(f"Context file not found: {context_file}")
            return False
            
        try:
            with open(context_file, 'r') as f:
                self.contexts[context_id] = json.load(f)
            logger.info(f"Loaded context from file: {context_file}")
            
            # Cache in Redis if available
            if self.redis_client:
                try:
                    redis_key = f"context:{context_id}"
                    self.redis_client.setex(
                        redis_key, 
                        3600,  # 1 hour TTL
                        json.dumps(self.contexts[context_id])
                    )
                except Exception as e:
                    logger.error(f"Error caching context in Redis: {e}")
            
            # Log activity
            log_prompt_activity("load_context", {
                "context_id": context_id,
                "source": "file"
            })
            
            return True
        except Exception as e:
            logger.error(f"Error loading context {context_id} from file: {e}")
            return False
    
    def delete_context(self, context_id: str) -> bool:
        """
        Delete a context from all storage options.
        
        Args:
            context_id: ID of the context to delete
            
        Returns:
            Success status
        """
        success = True
        
        # Remove from memory
        if context_id in self.contexts:
            del self.contexts[context_id]
        
        # Remove from MongoDB if available
        if self.database:
            try:
                context_collection = self.database.get_collection("contexts")
                context_collection.delete_one({"id": context_id})
                logger.info(f"Deleted context {context_id} from MongoDB")
            except Exception as e:
                logger.error(f"Error deleting context from MongoDB: {e}")
                success = False
        
        # Remove from Redis if available
        if self.redis_client:
            try:
                redis_key = f"context:{context_id}"
                self.redis_client.delete(redis_key)
                logger.info(f"Deleted context {context_id} from Redis")
            except Exception as e:
                logger.error(f"Error deleting context from Redis: {e}")
                # Not critical for overall success
        
        # Remove file if it exists
        context_file = os.path.join(self.context_dir, f"{context_id}.json")
        if os.path.exists(context_file):
            try:
                os.remove(context_file)
                logger.info(f"Deleted context file: {context_file}")
            except Exception as e:
                logger.error(f"Error deleting context file {context_file}: {e}")
                success = False
        
        # Reset current context if this was it
        if self.current_context_id == context_id:
            self.current_context_id = None
            
        # Log activity
        log_prompt_activity("delete_context", {
            "context_id": context_id,
            "success": success
        })
        
        return success
    
    def get_context_history(self, context_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get the command history for a context.
        
        Args:
            context_id: ID of the context
            
        Returns:
            List of history items
        """
        context = self.get_context(context_id)
        return context.get("history", [])
    
    def list_contexts(self) -> List[Dict[str, Any]]:
        """
        List all available contexts with metadata.
        
        Returns:
            List of context information (id, created_at, updated_at, metadata)
        """
        contexts_info = []
        
        # Get contexts from MongoDB if available (most comprehensive)
        if self.database:
            try:
                context_collection = self.database.get_collection("contexts")
                for doc in context_collection.find({}, {"_id": 0, "id": 1, "created_at": 1, "updated_at": 1, "metadata": 1}):
                    contexts_info.append(doc)
                
                logger.info(f"Listed {len(contexts_info)} contexts from MongoDB")
                
                # If we found contexts in MongoDB, return them (most comprehensive)
                if contexts_info:
                    return contexts_info
            except Exception as e:
                logger.error(f"Error listing contexts from MongoDB: {e}")
        
        # If MongoDB not available or empty, fall back to files
        try:
            context_files = []
            for filename in os.listdir(self.context_dir):
                if filename.endswith('.json'):
                    context_id = filename.replace('.json', '')
                    context_files.append(context_id)
            
            # Load basic info for each context file
            for context_id in context_files:
                try:
                    context_file = os.path.join(self.context_dir, f"{context_id}.json")
                    with open(context_file, 'r') as f:
                        context_data = json.load(f)
                        contexts_info.append({
                            "id": context_id,
                            "created_at": context_data.get("created_at", 0),
                            "updated_at": context_data.get("updated_at", 0),
                            "metadata": context_data.get("metadata", {})
                        })
                except Exception as e:
                    logger.error(f"Error reading context file {context_id}: {e}")
                    # Add with limited information
                    contexts_info.append({
                        "id": context_id,
                        "created_at": 0,
                        "updated_at": 0,
                        "metadata": {"error": "Failed to read"}
                    })
        except Exception as e:
            logger.error(f"Error listing contexts from files: {e}")
        
        # Add in-memory contexts that aren't already included
        existing_ids = {ctx["id"] for ctx in contexts_info}
        for context_id, context_data in self.contexts.items():
            if context_id not in existing_ids:
                contexts_info.append({
                    "id": context_id,
                    "created_at": context_data.get("created_at", 0),
                    "updated_at": context_data.get("updated_at", 0),
                    "metadata": context_data.get("metadata", {})
                })
        
        # Log activity
        log_prompt_activity("list_contexts", {
            "count": len(contexts_info)
        })
        
        return contexts_info
    
    def create_session(self, context_id: Optional[str] = None, session_data: Dict[str, Any] = None) -> str:
        """
        Create a new session within a context.
        
        Args:
            context_id: Optional context ID (uses current if None)
            session_data: Optional data for the session
            
        Returns:
            Session ID
        """
        if not context_id:
            context_id = self.get_current_context_id()
        
        context = self.get_context(context_id)
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Create session
        session = {
            "id": session_id,
            "context_id": context_id,
            "created_at": time.time(),
            "updated_at": time.time(),
            "data": session_data or {},
            "items": []
        }
        
        # Add to context
        if "sessions" not in context:
            context["sessions"] = []
        
        context["sessions"].append(session)
        self.active_sessions.add(session_id)
        
        # Save context
        self.save_context(context_id)
        
        # Log activity
        log_prompt_activity("create_session", {
            "session_id": session_id,
            "context_id": context_id
        })
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a session by ID.
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data or None if not found
        """
        # Check all contexts for the session
        for context_id, context in self.contexts.items():
            for session in context.get("sessions", []):
                if session["id"] == session_id:
                    return session
        
        # If not found in memory, search through all contexts
        for context_info in self.list_contexts():
            context_id = context_info["id"]
            
            # Skip contexts we've already checked in memory
            if context_id in self.contexts:
                continue
            
            # Load the context and check
            context = self.get_context(context_id)
            for session in context.get("sessions", []):
                if session["id"] == session_id:
                    return session
        
        # Not found
        return None
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """
        Update a session with new data.
        
        Args:
            session_id: Session ID
            data: Data to update
            
        Returns:
            Success status
        """
        # Find the session and its context
        for context_id, context in self.contexts.items():
            for i, session in enumerate(context.get("sessions", [])):
                if session["id"] == session_id:
                    # Update data
                    session["data"].update(data)
                    session["updated_at"] = time.time()
                    
                    # Update in context
                    context["sessions"][i] = session
                    
                    # Save context
                    self.save_context(context_id)
                    
                    # Log activity
                    log_prompt_activity("update_session", {
                        "session_id": session_id,
                        "context_id": context_id,
                        "data_keys": list(data.keys())
                    })
                    
                    return True
        
        # Not found
        logger.warning(f"Session not found: {session_id}")
        return False
    
    def add_session_item(self, session_id: str, item: Dict[str, Any]) -> bool:
        """
        Add an item to a session.
        
        Args:
            session_id: Session ID
            item: Item to add
            
        Returns:
            Success status
        """
        # Add timestamp if not provided
        if "timestamp" not in item:
            item["timestamp"] = time.time()
        
        # Find the session and its context
        for context_id, context in self.contexts.items():
            for i, session in enumerate(context.get("sessions", [])):
                if session["id"] == session_id:
                    # Add item
                    if "items" not in session:
                        session["items"] = []
                    session["items"].append(item)
                    session["updated_at"] = time.time()
                    
                    # Update in context
                    context["sessions"][i] = session
                    
                    # Save context
                    self.save_context(context_id)
                    
                    # Log activity
                    log_prompt_activity("add_session_item", {
                        "session_id": session_id,
                        "context_id": context_id,
                        "item_type": item.get("type", "unknown")
                    })
                    
                    return True
        
        # Not found
        logger.warning(f"Session not found: {session_id}")
        return False
    
    def end_session(self, session_id: str) -> bool:
        """
        End a session (mark as inactive).
        
        Args:
            session_id: Session ID
            
        Returns:
            Success status
        """
        # Find the session and its context
        for context_id, context in self.contexts.items():
            for i, session in enumerate(context.get("sessions", [])):
                if session["id"] == session_id:
                    # Mark as inactive
                    session["active"] = False
                    session["ended_at"] = time.time()
                    
                    # Update in context
                    context["sessions"][i] = session
                    
                    # Save context
                    self.save_context(context_id)
                    
                    # Remove from active sessions
                    if session_id in self.active_sessions:
                        self.active_sessions.remove(session_id)
                    
                    # Log activity
                    log_prompt_activity("end_session", {
                        "session_id": session_id,
                        "context_id": context_id
                    })
                    
                    return True
        
        # Not found
        logger.warning(f"Session not found: {session_id}")
        return False
    
    def export_context(self, context_id: str, format_type: str = "json") -> Dict[str, Any]:
        """
        Export a context in a specified format.
        
        Args:
            context_id: Context ID to export
            format_type: Format to export (json, minimal, full)
            
        Returns:
            Exported context data
        """
        context = self.get_context(context_id)
        
        if format_type == "minimal":
            # Include only essential data for lightweight storage
            return {
                "id": context.get("id"),
                "created_at": context.get("created_at"),
                "updated_at": context.get("updated_at"),
                "metadata": context.get("metadata", {}),
                "data": context.get("data", {})
                # Omit history, sessions
            }
        
        elif format_type == "full":
            # Include everything including session details
            return context
        
        else:  # Default to json
            # Default format includes most fields but can prune large data items
            return {
                "id": context.get("id"),
                "created_at": context.get("created_at"),
                "updated_at": context.get("updated_at"),
                "metadata": context.get("metadata", {}),
                "data": context.get("data", {}),
                "history": context.get("history", [])[:10],  # Limit to 10 most recent
                "sessions": [
                    {
                        "id": s.get("id"),
                        "created_at": s.get("created_at"),
                        "updated_at": s.get("updated_at"),
                        "data": s.get("data", {}),
                        "item_count": len(s.get("items", []))
                        # Omit actual items for brevity
                    }
                    for s in context.get("sessions", [])
                ]
            }
    
    def import_context(self, context_data: Dict[str, Any], overwrite: bool = False) -> str:
        """
        Import a context from data.
        
        Args:
            context_data: Context data to import
            overwrite: Whether to overwrite existing context with same ID
            
        Returns:
            Context ID
        """
        # Ensure context has an ID
        if "id" not in context_data:
            context_data["id"] = str(uuid.uuid4())
        
        context_id = context_data["id"]
        
        # Check if context already exists
        if context_id in self.contexts and not overwrite:
            logger.warning(f"Context {context_id} already exists, not overwriting")
            return context_id
        
        # Set timestamps if not provided
        if "created_at" not in context_data:
            context_data["created_at"] = time.time()
        if "updated_at" not in context_data:
            context_data["updated_at"] = time.time()
        
        # Store the context
        self.contexts[context_id] = context_data
        
        # Save to storage
        self.save_context(context_id)
        
        # Log activity
        log_prompt_activity("import_context", {
            "context_id": context_id,
            "overwrite": overwrite
        })
        
        return context_id


# Integration with AdaptivePromptManager's ContextManager
def integrate_with_context_manager(prompt_manager_path: str) -> bool:
    """
    Integrate the EnhancedContextManager with the AdaptivePromptManager.
    
    Args:
        prompt_manager_path: Path to prompt_manager.py
        
    Returns:
        Success status
    """
    try:
        # Check if file exists
        if not os.path.exists(prompt_manager_path):
            logger.error(f"Prompt manager file not found at {prompt_manager_path}")
            return False
        
        # Read the file
        with open(prompt_manager_path, 'r') as f:
            content = f.read()
        
        # Check if integration already exists
        if "EnhancedContextManager" in content:
            logger.info("EnhancedContextManager integration already exists")
            return True
        
        # Find the ContextManager implementation in the file
        context_class_start = content.find("class ContextManager:")
        if context_class_start == -1:
            logger.error("ContextManager class not found in the file")
            return False
        
        # Determine where to insert the integration code in the AdaptivePromptManager.__init__ method
        init_method = "def __init__(self,"
        init_method_pos = content.find(init_method, content.find("class AdaptivePromptManager:"))
        if init_method_pos == -1:
            logger.error("AdaptivePromptManager.__init__ method not found")
            return False
        
        # Find where the context_manager is initialized
        context_init = "self.context_manager = ContextManager("
        context_init_pos = content.find(context_init, init_method_pos)
        if context_init_pos == -1:
            logger.error("context_manager initialization not found")
            return False
        
        # Define the import for EnhancedContextManager
        import_code = """
try:
    from .enhanced_context_manager import EnhancedContextManager
except ImportError:
    # If enhanced context manager not available, we'll use the basic one
    EnhancedContextManager = None
"""
        
        # Define the integration code to replace the context_manager initialization
        integration_code = """
        # Initialize context manager (enhanced if available)
        use_enhanced_context = config.get("enhanced_context", {}).get("enabled", False)
        
        if use_enhanced_context and EnhancedContextManager:
            # Create the basic context manager first
            base_context_manager = ContextManager(
                max_context_tokens=max_context_tokens,
                memory_kg_path=memory_kg_path,
                context_dir=context_dir,
                use_integrations=use_integrations
            )
            
            # Wrap it with the enhanced context manager
            self.context_manager = EnhancedContextManager(
                base_context_manager=base_context_manager,
                context_dir=context_dir,
                max_history=config.get("enhanced_context", {}).get("max_history", 20),
                use_redis=config.get("enhanced_context", {}).get("use_redis", True),
                use_mongodb=config.get("enhanced_context", {}).get("use_mongodb", True)
            )
            logger.info("Using EnhancedContextManager")
        else:
            # Use the basic context manager
            self.context_manager = ContextManager(
                max_context_tokens=max_context_tokens,
                memory_kg_path=memory_kg_path,
                context_dir=context_dir,
                use_integrations=use_integrations
            )"""
        
        # Insert the import code after imports
        imports_end = content.find("# Configure logging")
        if imports_end == -1:
            # Try another marker
            imports_end = content.find("logger = logging.getLogger")
        
        if imports_end == -1:
            logger.error("Could not find the end of imports section")
            return False
        
        # Insert the import
        content = content[:imports_end] + import_code + content[imports_end:]
        
        # Find the updated position of context_init (it shifted due to the import insertion)
        context_init_pos = content.find(context_init)
        
        # Find the end of the context manager initialization statement
        context_init_end = content.find(")", context_init_pos) + 1
        
        # Replace the context manager initialization
        content = content[:context_init_pos] + integration_code + content[context_init_end:]
        
        # Write the updated file
        with open(prompt_manager_path, 'w') as f:
            f.write(content)
        
        logger.info(f"Successfully integrated EnhancedContextManager with {prompt_manager_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error integrating with context manager: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Context Manager")
    parser.add_argument("--context-dir", help="Directory to store context files")
    parser.add_argument("--create", action="store_true", help="Create a new context")
    parser.add_argument("--get", metavar="ID", help="Get a context by ID")
    parser.add_argument("--update", metavar="ID", help="Update a context")
    parser.add_argument("--data", help="JSON data for update")
    parser.add_argument("--delete", metavar="ID", help="Delete a context")
    parser.add_argument("--list", action="store_true", help="List all contexts")
    parser.add_argument("--export", metavar="ID", help="Export a context")
    parser.add_argument("--format", choices=["json", "minimal", "full"], default="json", help="Export format")
    parser.add_argument("--session", action="store_true", help="Create a new session")
    parser.add_argument("--integrate", help="Path to prompt_manager.py for integration")
    parser.add_argument("--redis", action="store_true", help="Use Redis for caching")
    parser.add_argument("--mongodb", action="store_true", help="Use MongoDB for storage")
    
    args = parser.parse_args()
    
    # Create manager
    manager = EnhancedContextManager(
        context_dir=args.context_dir,
        use_redis=args.redis,
        use_mongodb=args.mongodb
    )
    
    # Handle integration
    if args.integrate:
        success = integrate_with_context_manager(args.integrate)
        if success:
            print(f"Successfully integrated with {args.integrate}")
        else:
            print(f"Failed to integrate with {args.integrate}")
        sys.exit(0)
    
    # Handle commands
    if args.create:
        context_id = manager.create_context()
        print(f"Created context: {context_id}")
        
    elif args.get:
        context = manager.get_context(args.get)
        print(json.dumps(context, indent=2))
        
    elif args.update:
        data = {}
        if args.data:
            data = json.loads(args.data)
        context_id = manager.update_context(args.update, data)
        print(f"Updated context: {context_id}")
        
    elif args.delete:
        success = manager.delete_context(args.delete)
        print(f"Deleted context: {success}")
        
    elif args.list:
        contexts = manager.list_contexts()
        print(f"Available contexts ({len(contexts)}):")
        for context in contexts:
            print(f"  {context['id']} - Created: {context['created_at']}, Updated: {context['updated_at']}")
            if context.get("metadata"):
                print(f"    Metadata: {context['metadata']}")
            
    elif args.export:
        context = manager.export_context(args.export, args.format)
        print(json.dumps(context, indent=2))
        
    elif args.session:
        if not args.get:
            print("Error: --get context-id is required for --session")
            sys.exit(1)
        session_id = manager.create_session(args.get)
        print(f"Created session {session_id} in context {args.get}")
        
    else:
        parser.print_help()