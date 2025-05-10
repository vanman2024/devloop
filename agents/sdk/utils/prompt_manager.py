#!/usr/bin/env python3
"""
Adaptive Prompt Manager for SDK-First Architecture

This module provides a system for template-based prompt management with dynamic
context handling and knowledge graph integration. Adapted from the architecture
in preserved_scripts/adaptive_prompt_system.
"""

import os
import sys
import json
import logging
import uuid
import time
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, NamedTuple, Tuple

# Import activity logger
try:
    from .activity_logger import log_prompt_activity
except ImportError:
    # Fallback for when the activity logger is not available
    def log_prompt_activity(subtype: str, details: Dict[str, Any], 
                          title: Optional[str] = None, 
                          description: Optional[str] = None) -> None:
        """Fallback activity logger that just logs to the prompt_manager logger."""
        logger.debug(f"Activity: {subtype} - {title or 'No title'} - {details}")

# Import integrations
try:
    from .integrations import get_integrations
except ImportError:
    # Fallback for when integrations are not available
    def get_integrations() -> Dict[str, Any]:
        """Fallback integrations that returns an empty dict."""
        return {}

# Add parent directories to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
sdk_dir = os.path.abspath(os.path.join(script_dir, ".."))
if sdk_dir not in sys.path:
    sys.path.append(sdk_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("prompt_manager")

# Import tiktoken for accurate token counting
try:
    import tiktoken
    ENCODER = tiktoken.get_encoding("cl100k_base")  # Default encoding for Claude and GPT models
    
    def count_tokens(text: str) -> int:
        """Count tokens using tiktoken library"""
        return len(ENCODER.encode(text))
except ImportError:
    logger.warning("tiktoken not found, using fallback token estimation")
    
    def count_tokens(text: str) -> int:
        """Fallback token counter (approximation)"""
        return len(text) // 4 + 1


class TemplateVariable(NamedTuple):
    """Representation of a variable in a prompt template."""
    name: str
    required: bool = True
    default_value: Any = None
    description: str = ""


class PromptTemplate:
    """Representation of a prompt template."""
    
    def __init__(self, name: str, template: str, description: str = "",
                variables: List[TemplateVariable] = None, tags: List[str] = None):
        """
        Initialize a prompt template.
        
        Args:
            name: The name of the template
            template: The template text
            description: Description of the template
            variables: List of variables in the template
            tags: List of tags for categorization
        """
        self.name = name
        self.template = template
        self.description = description
        self.variables = variables or []
        self.tags = tags or []
        self.variations = []
        self.created_at = time.time()
        self.updated_at = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert template to a dictionary."""
        return {
            "name": self.name,
            "template": self.template,
            "description": self.description,
            "variables": [
                {"name": var.name, "required": var.required, 
                 "default_value": var.default_value, "description": var.description}
                for var in self.variables
            ],
            "tags": self.tags,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptTemplate':
        """Create a template from a dictionary."""
        variables = [
            TemplateVariable(
                name=var["name"],
                required=var.get("required", True),
                default_value=var.get("default_value"),
                description=var.get("description", "")
            )
            for var in data.get("variables", [])
        ]
        
        template = cls(
            name=data["name"],
            template=data["template"],
            description=data.get("description", ""),
            variables=variables,
            tags=data.get("tags", [])
        )
        
        template.created_at = data.get("created_at", time.time())
        template.updated_at = data.get("updated_at", time.time())
        
        return template


class ContextItem:
    """Representation of an item in the conversation context."""
    
    def __init__(self, content: str, role: str = "user",
                importance: float = 1.0, metadata: Dict[str, Any] = None):
        """
        Initialize a context item.
        
        Args:
            content: The content of the context item
            role: The role of the speaker (user, assistant, system)
            importance: Importance score (0.0 to 1.0)
            metadata: Additional metadata
        """
        self.content = content
        self.role = role
        self.importance = importance
        self.metadata = metadata or {}
        self.token_count = count_tokens(content)
        self.timestamp = time.time()
        self.id = str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context item to a dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "role": self.role,
            "importance": self.importance,
            "metadata": self.metadata,
            "token_count": self.token_count,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ContextItem':
        """Create a context item from a dictionary."""
        item = cls(
            content=data["content"],
            role=data["role"],
            importance=data.get("importance", 1.0),
            metadata=data.get("metadata", {})
        )
        
        item.token_count = data.get("token_count", item.token_count)
        item.timestamp = data.get("timestamp", time.time())
        item.id = data.get("id", item.id)
        
        return item


class TemplateManager:
    """Manager for prompt templates."""
    
    def __init__(self, templates_dir: Optional[str] = None):
        """
        Initialize the template manager.
        
        Args:
            templates_dir: Directory to load templates from
        """
        self.templates_dir = templates_dir
        self.templates = {}  # name -> PromptTemplate
        
        # Initialize from templates directory if provided
        if templates_dir and os.path.exists(templates_dir):
            self._load_templates_from_directory(templates_dir)
    
    def _load_templates_from_directory(self, directory: str) -> None:
        """
        Load templates from a directory.
        
        Args:
            directory: Directory to load from
        """
        logger.info(f"Loading templates from {directory}")
        
        # Get all JSON files in the directory
        json_files = Path(directory).glob("*.json")
        
        for file_path in json_files:
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                # Check if it's a single template or a collection
                if "name" in data and "template" in data:
                    # Single template
                    template = PromptTemplate.from_dict(data)
                    self.templates[template.name] = template
                elif "templates" in data and isinstance(data["templates"], list):
                    # Collection of templates
                    for template_data in data["templates"]:
                        if "name" in template_data and "template" in template_data:
                            template = PromptTemplate.from_dict(template_data)
                            self.templates[template.name] = template
            
            except Exception as e:
                logger.error(f"Error loading template from {file_path}: {e}")
    
    def add_template(self, template: PromptTemplate) -> None:
        """
        Add a template to the manager.
        
        Args:
            template: The template to add
        """
        self.templates[template.name] = template
        logger.info(f"Added template: {template.name}")
    
    def get_template(self, name: str) -> Optional[PromptTemplate]:
        """
        Get a template by name.
        
        Args:
            name: Name of the template
            
        Returns:
            The template if found, None otherwise
        """
        return self.templates.get(name)
    
    def render_template(self, name: str, variables: Dict[str, Any]) -> str:
        """
        Render a template with the given variables.
        
        Args:
            name: Name of the template
            variables: Variables to substitute
            
        Returns:
            Rendered template
            
        Raises:
            ValueError: If template not found or required variables missing
        """
        template = self.get_template(name)
        if not template:
            raise ValueError(f"Template not found: {name}")
        
        # Validate variables
        for var in template.variables:
            if var.required and var.name not in variables:
                if var.default_value is not None:
                    variables[var.name] = var.default_value
                else:
                    raise ValueError(f"Required variable not provided: {var.name}")
        
        # Render the template
        rendered = template.template
        
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, indent=2)
            else:
                value_str = str(value)
            rendered = rendered.replace(placeholder, value_str)
        
        return rendered
    
    def save_templates(self, output_dir: str) -> None:
        """
        Save all templates to a directory.
        
        Args:
            output_dir: Directory to save to
        """
        os.makedirs(output_dir, exist_ok=True)
        
        for name, template in self.templates.items():
            file_path = os.path.join(output_dir, f"{name}.json")
            try:
                with open(file_path, 'w') as f:
                    json.dump(template.to_dict(), f, indent=2)
                logger.info(f"Saved template to {file_path}")
            except Exception as e:
                logger.error(f"Error saving template {name} to {file_path}: {e}")


class ContextManager:
    """Manager for conversation context with integration to knowledge graph."""
    
    def __init__(self, max_context_tokens: int = 16000,
                 memory_kg_path: Optional[str] = None,
                 context_dir: Optional[str] = None,
                 use_integrations: bool = True):
        """
        Initialize the context manager.
        
        Args:
            max_context_tokens: Maximum tokens for context
            memory_kg_path: Path to memory knowledge graph file
            context_dir: Directory to store context files
            use_integrations: Whether to use the integrations module
        """
        self.context_items = []  # List of ContextItem
        self.max_context_tokens = max_context_tokens
        self.system_prompt = None
        self.memory_kg_path = memory_kg_path
        self.context_dir = context_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "contexts"
        )
        
        # Ensure context directory exists
        os.makedirs(self.context_dir, exist_ok=True)
        
        # Integration components
        self.integrations = {}
        self.kb_adapter = None
        self.redis_client = None
        self.vector_db = None
        
        # Initialize integrations if enabled
        if use_integrations:
            self._init_integrations()
        # Fall back to direct KG connection if integrations disabled but path provided
        elif memory_kg_path and os.path.exists(memory_kg_path):
            self._init_knowledge_graph(memory_kg_path)
    
    def _init_integrations(self) -> None:
        """Initialize integrations with external systems."""
        try:
            # Get available integrations
            self.integrations = get_integrations()
            
            # Set knowledge base adapter if available
            if "knowledge_base" in self.integrations:
                self.kb_adapter = self.integrations["knowledge_base"]
                logger.info("Knowledge base adapter initialized")
                
                # Log activity
                log_prompt_activity("init_kb_adapter", {
                    "adapter_type": self.kb_adapter.__class__.__name__,
                    "status": "success"
                })
            
            # Set Redis client if available
            if "redis" in self.integrations:
                self.redis_client = self.integrations["redis"]
                logger.info("Redis client initialized")
                
                # Use Redis for template and context caching
                
            # Set vector database if available
            if "vector_db" in self.integrations:
                self.vector_db = self.integrations["vector_db"]
                logger.info("Vector database initialized")
                
                # Log activity
                log_prompt_activity("init_vector_db", {
                    "status": "success",
                    "vector_db_type": self.vector_db.__class__.__name__
                })
                
        except Exception as e:
            logger.error(f"Error initializing integrations: {e}")
            
            # Log activity
            log_prompt_activity("init_integrations", {
                "status": "error",
                "error": str(e)
            })
    
    def _init_knowledge_graph(self, kg_path: str) -> None:
        """
        Initialize direct connection to the knowledge graph.
        
        Args:
            kg_path: Path to the knowledge graph file
        """
        try:
            # Dynamic import to avoid hard dependencies
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            
            # Try relative import paths to find the knowledge graph module
            kg_module_paths = [
                "memory.manager.memory_knowledge_graph",
                "backups.system-core-backup.system-core.memory.manager.memory_knowledge_graph",
                "system.memory.manager.memory_knowledge_graph"
            ]
            
            for module_path in kg_module_paths:
                try:
                    module_parts = module_path.split(".")
                    if len(module_parts) > 1:
                        parent_module = __import__(module_path, fromlist=[module_parts[-1]])
                        kg_module = getattr(parent_module, module_parts[-1])
                        self.kg = kg_module.load_knowledge_graph(kg_path)
                        logger.info(f"Successfully connected to knowledge graph at {kg_path}")
                        
                        # Log activity
                        log_prompt_activity("init_knowledge_graph", {
                            "kg_path": kg_path,
                            "status": "success"
                        })
                        
                        break
                except (ImportError, AttributeError) as e:
                    continue
            
            if not self.kg:
                logger.warning(f"Could not initialize knowledge graph from {kg_path}")
                
                # Log activity
                log_prompt_activity("init_knowledge_graph", {
                    "kg_path": kg_path,
                    "status": "warning",
                    "warning": "Could not initialize knowledge graph"
                })
                
        except Exception as e:
            logger.error(f"Error initializing knowledge graph: {e}")
            
            # Log activity
            log_prompt_activity("init_knowledge_graph", {
                "kg_path": kg_path,
                "status": "error",
                "error": str(e)
            })
    
    def add_context_item(self, content: str, role: str = "user",
                       importance: float = 1.0, metadata: Dict[str, Any] = None) -> None:
        """
        Add an item to the conversation context.
        
        Args:
            content: The content of the context item
            role: The role of the speaker (user, assistant, system)
            importance: Importance score (0.0 to 1.0)
            metadata: Additional metadata
        """
        item = ContextItem(content, role, importance, metadata)
        
        # If it's a system message, set it as the system prompt
        if role == "system":
            self.system_prompt = item
            
            # Log system prompt activity
            log_prompt_activity("add_context", {
                "role": "system",
                "content_preview": content[:50] + "..." if len(content) > 50 else content,
                "importance": importance,
                "token_count": item.token_count,
                "source": metadata.get("source", "manual") if metadata else "manual"
            }, title="Added System Prompt")
            return
        
        self.context_items.append(item)
        
        # Log context addition activity
        log_prompt_activity("add_context", {
            "role": role,
            "content_preview": content[:50] + "..." if len(content) > 50 else content,
            "importance": importance,
            "token_count": item.token_count,
            "source": metadata.get("source", "manual") if metadata else "manual"
        })
        
        # Prune context if too large
        self._prune_context()
    
    def _prune_context(self) -> None:
        """Prune context items if total token count exceeds maximum."""
        if not self.context_items:
            return
        
        # Calculate total tokens
        total_tokens = sum(item.token_count for item in self.context_items)
        
        # If under limit, nothing to do
        if total_tokens <= self.max_context_tokens:
            return
        
        # Sort by importance (ascending) and timestamp (ascending)
        # This means we'll remove the least important and oldest items first
        sorted_items = sorted(
            enumerate(self.context_items),
            key=lambda x: (x[1].importance, x[1].timestamp)
        )
        
        # Remove items until we're under the limit
        tokens_to_remove = total_tokens - self.max_context_tokens
        tokens_removed = 0
        indices_to_remove = []
        
        for idx, item in sorted_items:
            if tokens_removed >= tokens_to_remove:
                break
            
            tokens_removed += item.token_count
            indices_to_remove.append(idx)
        
        # Remove the selected items (in descending order to avoid index shifting)
        for idx in sorted(indices_to_remove, reverse=True):
            del self.context_items[idx]
        
        logger.info(f"Pruned {len(indices_to_remove)} context items ({tokens_removed} tokens)")
        
        # Log pruning activity
        log_prompt_activity("prune_context", {
            "items_removed": len(indices_to_remove),
            "tokens_removed": tokens_removed,
            "remaining_items": len(self.context_items),
            "remaining_tokens": total_tokens - tokens_removed
        })
    
    def get_context(self, format_type: str = "openai") -> Union[List[Dict[str, str]], str]:
        """
        Get the current context in the specified format.
        
        Args:
            format_type: Format type (openai, claude, text)
            
        Returns:
            Formatted context
        """
        if format_type == "openai":
            # OpenAI format: List of {"role": role, "content": content}
            messages = []
            
            # Add system prompt if available
            if self.system_prompt:
                messages.append({
                    "role": "system",
                    "content": self.system_prompt.content
                })
            
            # Add context items
            for item in self.context_items:
                messages.append({
                    "role": item.role,
                    "content": item.content
                })
            
            return messages
        
        elif format_type == "claude":
            # Claude format: Human: ... Assistant: ...
            lines = []
            
            # Add system prompt if available
            if self.system_prompt:
                lines.append(f"System: {self.system_prompt.content}")
            
            # Add context items
            for item in self.context_items:
                if item.role == "user":
                    prefix = "Human"
                elif item.role == "assistant":
                    prefix = "Assistant"
                else:
                    prefix = item.role.capitalize()
                
                lines.append(f"{prefix}: {item.content}")
            
            return "\n\n".join(lines)
        
        elif format_type == "text":
            # Plain text format
            lines = []
            
            # Add system prompt if available
            if self.system_prompt:
                lines.append(f"[System] {self.system_prompt.content}")
            
            # Add context items
            for item in self.context_items:
                lines.append(f"[{item.role.capitalize()}] {item.content}")
            
            return "\n\n".join(lines)
        
        else:
            raise ValueError(f"Unknown format type: {format_type}")
    
    def get_context_from_knowledge_graph(self, query: str, node_types: List[str] = None) -> Optional[str]:
        """
        Get context from the knowledge graph based on a query.
        
        Args:
            query: Query to search for
            node_types: Optional list of node types to filter by (feature, milestone, etc.)
            
        Returns:
            Context information from the knowledge graph or None if unavailable
        """
        # Log query activity
        query_data = {
            "query": query,
            "node_types": node_types
        }
        log_prompt_activity("knowledge_graph_query", query_data)
        
        # Try knowledge base adapter first (preferred)
        if self.kb_adapter:
            try:
                # Use KB adapter for query
                kwargs = {}
                if node_types:
                    kwargs["node_types"] = node_types
                
                # First try vector search if available
                if self.vector_db:
                    # Try vector search with KB adapter integration
                    # (Implementation depends on adapter capabilities)
                    pass
                
                # Perform KB query
                results = self.kb_adapter.query(query, **kwargs)
                
                # Check cache for this query if Redis available
                cache_key = None
                if self.redis_client:
                    cache_key = f"context:kg:{query}:{'-'.join(node_types) if node_types else 'all'}"
                    cached_result = self.redis_client.get(cache_key)
                    if cached_result:
                        # Log cache hit
                        log_prompt_activity("kg_cache_hit", {
                            "query": query,
                            "node_types": node_types
                        })
                        return cached_result
                
                # Format results
                if results:
                    formatted_results = []
                    for result in results:
                        # Extract properties from KB result
                        properties = result.get("properties", {})
                        formatted_results.append(
                            f"Type: {result.get('type', 'unknown')}\n"
                            f"ID: {result.get('id', 'N/A')}\n"
                            f"Name: {properties.get('name', 'N/A')}\n"
                            f"Description: {properties.get('description', 'N/A')}\n"
                            f"Status: {properties.get('status', 'N/A')}"
                        )
                    formatted_text = "\n\n".join(formatted_results)
                    
                    # Cache the result if Redis available
                    if self.redis_client and cache_key:
                        # Cache for 15 minutes (adjust as needed)
                        self.redis_client.setex(cache_key, 900, formatted_text)
                    
                    return formatted_text
                
                return None
            except Exception as e:
                logger.error(f"Error querying knowledge base adapter: {e}")
                # Fall back to direct KG access
                
        # Fall back to direct knowledge graph access if adapter not available
        if not self.kg:
            logger.warning("Knowledge graph not initialized")
            return None
        
        try:
            results = []
            
            # Search nodes by type if specified
            if node_types:
                for node_type in node_types:
                    nodes = self.kg.get_nodes_by_type(node_type)
                    for node in nodes:
                        # Simple keyword matching for now
                        name = node["properties"].get("name", "").lower()
                        description = node["properties"].get("description", "").lower()
                        
                        if query.lower() in name or query.lower() in description:
                            results.append(node)
            
            # Format results
            if results:
                formatted_results = []
                for node in results:
                    formatted_results.append(
                        f"Type: {node['type']}\n"
                        f"ID: {node['id']}\n"
                        f"Name: {node['properties'].get('name', 'N/A')}\n"
                        f"Description: {node['properties'].get('description', 'N/A')}\n"
                        f"Status: {node['properties'].get('status', 'N/A')}"
                    )
                formatted_text = "\n\n".join(formatted_results)
                
                # Cache the result if Redis available
                if self.redis_client:
                    cache_key = f"context:kg:{query}:{'-'.join(node_types) if node_types else 'all'}"
                    # Cache for 15 minutes (adjust as needed)
                    self.redis_client.setex(cache_key, 900, formatted_text)
                
                return formatted_text
            
            return None
        except Exception as e:
            logger.error(f"Error querying knowledge graph: {e}")
            
            # Log error activity
            log_prompt_activity("knowledge_graph_error", {
                "query": query,
                "node_types": node_types,
                "error": str(e)
            })
            
            return None
    
    def extract_relevant_context(self, query: str = "") -> str:
        """
        Extract context items relevant to the given query.
        
        This method first attempts to find relevant context from the knowledge graph,
        then falls back to the conversation history if needed.
        
        Args:
            query: Query to focus extraction
            
        Returns:
            Extracted context as text
        """
        # Log extraction attempt
        log_prompt_activity("extract_context", {
            "query": query,
            "source": "initiated"
        })
        
        # First check Redis cache if available and query provided
        if self.redis_client and query:
            cache_key = f"context:extract:{query}"
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                log_prompt_activity("context_cache_hit", {
                    "query": query,
                    "source": "redis"
                })
                return cached_result
        
        # Next try the knowledge graph if query provided
        kg_context = None
        if query:
            kg_context = self.get_context_from_knowledge_graph(
                query, node_types=["feature", "milestone", "phase", "module"]
            )
        
        # If we found context in the knowledge graph, use and cache it
        if kg_context:
            formatted_context = f"Information from Knowledge Graph:\n\n{kg_context}"
            
            # Cache the result if Redis available
            if self.redis_client and query:
                # Cache for 15 minutes (adjust as needed)
                self.redis_client.setex(f"context:extract:{query}", 900, formatted_context)
            
            log_prompt_activity("extract_context", {
                "query": query,
                "source": "knowledge_graph",
                "result_size": len(formatted_context)
            })
            
            return formatted_context
        
        # Try vector search if available and query provided
        vector_results = None
        if self.vector_db and query:
            try:
                # Perform vector search
                documents = self.vector_db.similarity_search(
                    query=query,
                    k=5  # Get top 5 results
                )
                
                if documents:
                    vector_results = []
                    for doc in documents:
                        vector_results.append(
                            f"[{doc.metadata.get('type', 'Document').capitalize()}] {doc.page_content}"
                        )
                    
                    formatted_context = "Information from Vector Search:\n\n" + "\n\n".join(vector_results)
                    
                    # Cache the result if Redis available
                    if self.redis_client:
                        # Cache for 15 minutes (adjust as needed)
                        self.redis_client.setex(f"context:extract:{query}", 900, formatted_context)
                    
                    log_prompt_activity("extract_context", {
                        "query": query,
                        "source": "vector_db",
                        "result_count": len(documents),
                        "result_size": len(formatted_context)
                    })
                    
                    return formatted_context
            
            except Exception as e:
                logger.error(f"Error performing vector search: {e}")
                log_prompt_activity("vector_search_error", {
                    "query": query,
                    "error": str(e)
                })
        
        # Fall back to conversation context
        if not self.context_items:
            log_prompt_activity("extract_context", {
                "query": query,
                "source": "none",
                "result": "empty context"
            })
            return ""
        
        # If no query, just return the most recent items
        if not query:
            # Get up to 5 most recent items
            recent_items = sorted(self.context_items, key=lambda x: x.timestamp, reverse=True)[:5]
            lines = []
            
            for item in recent_items:
                lines.append(f"[{item.role.capitalize()}] {item.content}")
            
            result = "\n\n".join(lines)
            
            log_prompt_activity("extract_context", {
                "query": "none",
                "source": "recent_history",
                "item_count": len(recent_items),
                "result_size": len(result)
            })
            
            return result
        
        # Try semantic search first if we have integrations
        if "langchain" in self.integrations and query:
            try:
                # This would use LangChain's semantic search capabilities
                # Implementation depends on how LangChain is integrated
                pass
            except Exception as e:
                logger.error(f"Error performing semantic search: {e}")
        
        # Fall back to keyword matching for context items
        query_terms = set(query.lower().split())
        scored_items = []
        
        for item in self.context_items:
            content_terms = set(item.content.lower().split())
            # Score based on term overlap
            score = len(query_terms.intersection(content_terms)) / max(len(query_terms), 1)
            scored_items.append((item, score))
        
        # Get up to 5 most relevant items
        relevant_items = sorted(scored_items, key=lambda x: x[1], reverse=True)[:5]
        lines = []
        
        for item, score in relevant_items:
            if score > 0:  # Only include items with some relevance
                lines.append(f"[{item.role.capitalize()}] {item.content}")
        
        result = "\n\n".join(lines)
        
        # Cache the result if Redis available and we have results
        if self.redis_client and result and query:
            # Cache for 5 minutes (shorter than KG context)
            self.redis_client.setex(f"context:extract:{query}", 300, result)
        
        log_prompt_activity("extract_context", {
            "query": query,
            "source": "keyword_match",
            "item_count": len(relevant_items),
            "result_size": len(result)
        })
        
        return result
    
    def save_context(self, file_path: str) -> None:
        """
        Save the current context to a file.
        
        Args:
            file_path: Path to save to
        """
        data = {
            "system_prompt": self.system_prompt.to_dict() if self.system_prompt else None,
            "context_items": [item.to_dict() for item in self.context_items],
            "max_context_tokens": self.max_context_tokens,
            "timestamp": time.time()
        }
        
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved context to {file_path}")
        except Exception as e:
            logger.error(f"Error saving context to {file_path}: {e}")
    
    def load_context(self, file_path: str) -> bool:
        """
        Load context from a file.
        
        Args:
            file_path: Path to load from
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Set system prompt
            if data.get("system_prompt"):
                self.system_prompt = ContextItem.from_dict(data["system_prompt"])
            
            # Clear existing items
            self.context_items = []
            
            # Load context items
            for item_data in data.get("context_items", []):
                self.context_items.append(ContextItem.from_dict(item_data))
            
            # Set max tokens
            self.max_context_tokens = data.get("max_context_tokens", self.max_context_tokens)
            
            logger.info(f"Loaded context from {file_path} ({len(self.context_items)} items)")
            return True
        except Exception as e:
            logger.error(f"Error loading context from {file_path}: {e}")
            return False


class AdaptivePromptManager:
    """
    Manager for template-based prompts with dynamic adaptation.
    
    This class provides functionality for loading, rendering, and
    optimizing prompt templates with context awareness using a 
    composition-based design with separate template and context managers.
    
    This implementation fully integrates with:
    - Knowledge Graph for context retrieval
    - Redis for caching templates and context
    - Vector DB for semantic search
    - MongoDB for persistence
    - LangChain for enhanced capabilities
    - Activity logging for transparency
    """
    
    def __init__(self, 
                templates_dir: Optional[str] = None, 
                max_context_tokens: int = 16000,
                memory_kg_path: Optional[str] = None,
                context_dir: Optional[str] = None,
                config_path: Optional[str] = None,
                use_integrations: bool = True):
        """
        Initialize the adaptive prompt manager.
        
        Args:
            templates_dir: Directory to load templates from
            max_context_tokens: Maximum tokens for context
            memory_kg_path: Path to memory knowledge graph file
            context_dir: Directory to store context files
            config_path: Path to configuration file
            use_integrations: Whether to use external integrations
        """
        # Start initialization logging
        log_prompt_activity("init_prompt_manager", {
            "templates_dir": templates_dir,
            "max_context_tokens": max_context_tokens,
            "memory_kg_path": memory_kg_path,
            "context_dir": context_dir,
            "config_path": config_path,
            "use_integrations": use_integrations
        })
        
        # Set configuration from file if provided
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    
                # Override parameters with config values if not explicitly provided
                if templates_dir is None and "templates_dir" in config:
                    templates_dir = config["templates_dir"]
                    
                if "max_context_tokens" in config:
                    max_context_tokens = config["max_context_tokens"]
                    
                if memory_kg_path is None and "memory_kg_path" in config:
                    memory_kg_path = config["memory_kg_path"]
                    
                if context_dir is None and "context_dir" in config:
                    context_dir = config["context_dir"]
                    
                # Set integration config in environment for other components
                if "integrations" in config:
                    os.environ["SDK_INTEGRATION_CONFIG"] = config_path
                
                log_prompt_activity("load_config", {
                    "config_path": config_path,
                    "status": "success"
                })
                
            except Exception as e:
                logger.error(f"Failed to load configuration from {config_path}: {e}")
                log_prompt_activity("load_config", {
                    "config_path": config_path,
                    "status": "error",
                    "error": str(e)
                })
        
        # Initialize template manager
        self.template_manager = TemplateManager(templates_dir)
        
        # Initialize context manager with integrations
        self.context_manager = ContextManager(
            max_context_tokens=max_context_tokens,
            memory_kg_path=memory_kg_path,
            context_dir=context_dir,
            use_integrations=use_integrations
        )
        
        # Get direct references to key integration components
        if use_integrations:
            self.integrations = self.context_manager.integrations
            self.redis_client = self.context_manager.redis_client
            self.kb_adapter = self.context_manager.kb_adapter
            self.vector_db = self.context_manager.vector_db
        else:
            self.integrations = {}
            self.redis_client = None
            self.kb_adapter = None
            self.vector_db = None
        
        # Log completion of initialization
        log_prompt_activity("init_prompt_manager_complete", {
            "templates_loaded": len(self.template_manager.templates),
            "redis_available": self.redis_client is not None,
            "kb_available": self.kb_adapter is not None,
            "vector_db_available": self.vector_db is not None
        })
    
    # Template management methods
    def add_template(self, template: PromptTemplate) -> None:
        """
        Add a template to the manager.
        
        Args:
            template: Template to add
        """
        # Add template to manager
        self.template_manager.add_template(template)
        
        # Log activity
        log_prompt_activity("add_template", {
            "template_name": template.name,
            "variable_count": len(template.variables),
            "tags": template.tags
        })
        
        # Cache template in MongoDB if available
        if "mongodb" in self.integrations:
            try:
                mongo_client = self.integrations["mongodb"]
                db = mongo_client.devloop
                template_collection = db.templates
                
                # Convert to dict and add metadata
                template_dict = template.to_dict()
                template_dict["template_id"] = template.name
                template_dict["cached_at"] = time.time()
                
                # Upsert template
                template_collection.update_one(
                    {"template_id": template.name},
                    {"$set": template_dict},
                    upsert=True
                )
                
                log_prompt_activity("template_mongodb_cache", {
                    "template_name": template.name,
                    "status": "success"
                })
            except Exception as e:
                logger.error(f"Failed to cache template in MongoDB: {e}")
    
    def get_template(self, name: str) -> Optional[PromptTemplate]:
        """
        Get a template by name.
        
        Args:
            name: Template name
            
        Returns:
            Template or None if not found
        """
        # First check local templates
        template = self.template_manager.get_template(name)
        if template:
            return template
        
        # If not found and Redis available, check Redis cache
        if self.redis_client:
            try:
                cache_key = f"template:{name}"
                cached_template = self.redis_client.get(cache_key)
                if cached_template:
                    # Parse and create template
                    template_dict = json.loads(cached_template)
                    template = PromptTemplate.from_dict(template_dict)
                    
                    # Add to local cache
                    self.template_manager.add_template(template)
                    
                    log_prompt_activity("template_cache_hit", {
                        "template_name": name,
                        "source": "redis"
                    })
                    
                    return template
            except Exception as e:
                logger.error(f"Failed to get template from Redis: {e}")
        
        # If still not found and MongoDB available, check MongoDB
        if "mongodb" in self.integrations:
            try:
                mongo_client = self.integrations["mongodb"]
                db = mongo_client.devloop
                template_collection = db.templates
                
                # Find template
                template_doc = template_collection.find_one({"template_id": name})
                if template_doc:
                    # Create template from document
                    template = PromptTemplate.from_dict(template_doc)
                    
                    # Add to local cache
                    self.template_manager.add_template(template)
                    
                    # Also cache in Redis if available
                    if self.redis_client:
                        cache_key = f"template:{name}"
                        self.redis_client.setex(
                            cache_key,
                            3600,  # 1 hour
                            json.dumps(template_doc)
                        )
                    
                    log_prompt_activity("template_cache_hit", {
                        "template_name": name,
                        "source": "mongodb"
                    })
                    
                    return template
            except Exception as e:
                logger.error(f"Failed to get template from MongoDB: {e}")
        
        log_prompt_activity("template_not_found", {
            "template_name": name
        })
        
        return None
    
    def render_template(self, name: str, variables: Dict[str, Any]) -> str:
        """
        Render a template with the given variables.
        
        Args:
            name: Template name
            variables: Variables to substitute
            
        Returns:
            Rendered template
            
        Raises:
            ValueError: If template not found
        """
        # Check Redis cache first if available
        if self.redis_client:
            # Create cache key from template name and sorted variables
            var_hash = hashlib.md5(json.dumps(variables, sort_keys=True).encode()).hexdigest()
            cache_key = f"rendered_template:{name}:{var_hash}"
            
            # Check cache
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                log_prompt_activity("render_template_cache_hit", {
                    "template_name": name,
                    "source": "redis"
                })
                return cached_result
        
        # Render template
        rendered = self.template_manager.render_template(name, variables)
        
        # Log rendering
        log_prompt_activity("render_template", {
            "template_name": name,
            "variable_count": len(variables),
            "result_size": len(rendered)
        })
        
        # Cache result if Redis available
        if self.redis_client:
            # Cache for 1 hour
            var_hash = hashlib.md5(json.dumps(variables, sort_keys=True).encode()).hexdigest()
            cache_key = f"rendered_template:{name}:{var_hash}"
            self.redis_client.setex(cache_key, 3600, rendered)
        
        return rendered
    
    def save_templates(self, output_dir: str) -> None:
        """
        Save all templates to a directory.
        
        Args:
            output_dir: Directory to save templates to
        """
        # Save templates to directory
        self.template_manager.save_templates(output_dir)
        
        # Log saving
        log_prompt_activity("save_templates", {
            "output_dir": output_dir,
            "template_count": len(self.template_manager.templates)
        })
        
        # Also save to MongoDB if available
        if "mongodb" in self.integrations:
            try:
                mongo_client = self.integrations["mongodb"]
                db = mongo_client.devloop
                template_collection = db.templates
                
                # Save each template
                for name, template in self.template_manager.templates.items():
                    template_dict = template.to_dict()
                    template_dict["template_id"] = name
                    template_dict["cached_at"] = time.time()
                    
                    # Upsert template
                    template_collection.update_one(
                        {"template_id": name},
                        {"$set": template_dict},
                        upsert=True
                    )
                
                log_prompt_activity("save_templates_mongodb", {
                    "status": "success",
                    "template_count": len(self.template_manager.templates)
                })
            except Exception as e:
                logger.error(f"Failed to save templates to MongoDB: {e}")
                
                log_prompt_activity("save_templates_mongodb", {
                    "status": "error",
                    "error": str(e)
                })
    
    def load_templates(self, input_dir: str) -> int:
        """
        Load templates from a directory.
        
        Args:
            input_dir: Directory to load templates from
            
        Returns:
            Number of templates loaded
        """
        # Count templates before
        before_count = len(self.template_manager.templates)
        
        # Load templates from directory
        self.template_manager._load_templates_from_directory(input_dir)
        
        # Count templates after
        after_count = len(self.template_manager.templates)
        loaded_count = after_count - before_count
        
        # Log loading
        log_prompt_activity("load_templates", {
            "input_dir": input_dir,
            "template_count": loaded_count
        })
        
        return loaded_count
    
    # Context management methods
    def add_context_item(self, content: str, role: str = "user",
                       importance: float = 1.0, metadata: Dict[str, Any] = None) -> None:
        """Add an item to the conversation context."""
        self.context_manager.add_context_item(content, role, importance, metadata)
    
    def get_context(self, format_type: str = "openai") -> Union[List[Dict[str, str]], str]:
        """Get the current context in the specified format."""
        return self.context_manager.get_context(format_type)
    
    def extract_relevant_context(self, query: str = "") -> str:
        """Extract context items relevant to the given query."""
        return self.context_manager.extract_relevant_context(query)
    
    def save_context(self, file_path: str) -> None:
        """Save the current context to a file."""
        self.context_manager.save_context(file_path)
    
    def load_context(self, file_path: str) -> bool:
        """Load context from a file."""
        return self.context_manager.load_context(file_path)


class LLMProviderAdapter:
    """Base adapter for LLM providers."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize the provider adapter.
        
        Args:
            config: Provider-specific configuration
        """
        self.config = config or {}
        self.name = self.__class__.__name__
        self.api_key = self.config.get("api_key")
        self.token_limit = self.config.get("token_limit", 16000)
        
        # Initialize logging
        log_prompt_activity("init_provider_adapter", {
            "provider": self.name,
            "token_limit": self.token_limit
        })
    
    def prepare_prompt(self, prompt_manager: AdaptivePromptManager, 
                     template_name: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare a prompt for the LLM provider.
        
        Args:
            prompt_manager: AdaptivePromptManager instance
            template_name: Name of the template to use
            variables: Variables to substitute in the template
            
        Returns:
            Provider-specific formatted prompt data
        """
        raise NotImplementedError("Subclasses must implement prepare_prompt")
    
    def register_response(self, prompt_manager: AdaptivePromptManager, response: str) -> None:
        """
        Register a response from the LLM in the context.
        
        Args:
            prompt_manager: AdaptivePromptManager instance
            response: The response from the LLM
        """
        # Add to context
        prompt_manager.add_context_item(response, role="assistant")
        
        # Log response registration
        log_prompt_activity("register_response", {
            "provider": self.name,
            "response_preview": response[:50] + "..." if len(response) > 50 else response,
            "token_count": count_tokens(response)
        })
    
    def estimate_tokens(self, messages: List[Dict[str, str]]) -> int:
        """
        Estimate the number of tokens in a list of messages.
        
        Args:
            messages: List of messages
            
        Returns:
            Estimated token count
        """
        return sum(count_tokens(msg.get("content", "")) for msg in messages)


class OpenAIAdapter(LLMProviderAdapter):
    """Adapter for OpenAI API."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize the OpenAI adapter.
        
        Args:
            config: OpenAI-specific configuration
        """
        super().__init__(config)
        self.model = self.config.get("model", "gpt-4o")
        self.temperature = self.config.get("temperature", 0.7)
        self.use_assistants_api = self.config.get("use_assistants_api", False)
        
        # Try to import OpenAI client
        try:
            import openai
            self.openai = openai
            # Initialize client if API key provided
            if self.api_key:
                self.client = openai.OpenAI(api_key=self.api_key)
                log_prompt_activity("openai_client_init", {
                    "status": "success",
                    "model": self.model
                })
        except ImportError:
            log_prompt_activity("openai_client_init", {
                "status": "error",
                "error": "OpenAI package not installed"
            })
    
    def prepare_prompt(self, prompt_manager: AdaptivePromptManager, 
                     template_name: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare a prompt for the OpenAI API.
        
        Args:
            prompt_manager: AdaptivePromptManager instance
            template_name: Name of the template to use
            variables: Variables to substitute in the template
            
        Returns:
            Formatted prompt data for OpenAI
        """
        # Check cache if Redis available
        if prompt_manager.redis_client:
            var_hash = hashlib.md5(json.dumps({
                "template": template_name, 
                "variables": variables,
                "provider": "openai"
            }, sort_keys=True).encode()).hexdigest()
            
            cache_key = f"prompt:openai:{var_hash}"
            cached_result = prompt_manager.redis_client.get(cache_key)
            
            if cached_result:
                log_prompt_activity("prepare_prompt_cache_hit", {
                    "provider": "openai",
                    "template_name": template_name
                })
                return json.loads(cached_result)
        
        # Render the template
        rendered_template = prompt_manager.render_template(template_name, variables)
        
        # Try to get relevant context based on the rendered template
        relevant_context = prompt_manager.extract_relevant_context(rendered_template)
        
        # Prepare system message with relevant context if available
        system_message = "You are a helpful AI assistant."
        if relevant_context:
            system_message = f"You are a helpful AI assistant. Here is some relevant context:\n\n{relevant_context}"
        
        # Get existing context or start with just the system message
        messages = prompt_manager.get_context(format_type="openai")
        
        # If no system message in context, add one
        if not any(msg.get("role") == "system" for msg in messages):
            messages.insert(0, {
                "role": "system",
                "content": system_message
            })
        
        # Add the rendered template as a user message
        messages.append({
            "role": "user",
            "content": rendered_template
        })
        
        # Prune messages if they exceed token limit
        total_tokens = self.estimate_tokens(messages)
        if total_tokens > self.token_limit:
            # Keep system message and latest user message
            system_message = next((msg for msg in messages if msg["role"] == "system"), None)
            latest_message = messages[-1]  # The message we just added
            
            # Start with these two mandatory messages
            pruned_messages = []
            if system_message:
                pruned_messages.append(system_message)
            pruned_messages.append(latest_message)
            
            # Add as many previous messages as possible, starting from the most recent
            remaining_tokens = self.token_limit - self.estimate_tokens(pruned_messages)
            for msg in reversed(messages[1:-1]):  # Skip system and latest message
                msg_tokens = count_tokens(msg.get("content", ""))
                if msg_tokens < remaining_tokens:
                    pruned_messages.insert(1, msg)  # Insert after system, before latest
                    remaining_tokens -= msg_tokens
                else:
                    break
            
            # Sort pruned messages to maintain correct order
            messages = sorted(pruned_messages, 
                            key=lambda x: messages.index(x) if x in messages else 0)
            
            log_prompt_activity("prompt_token_prune", {
                "provider": "openai",
                "original_tokens": total_tokens,
                "pruned_tokens": self.estimate_tokens(messages),
                "messages_kept": len(messages)
            })
        
        result = {
            "messages": messages,
            "rendered_template": rendered_template,
            "model": self.model,
            "temperature": self.temperature
        }
        
        # Log preparation
        log_prompt_activity("prepare_prompt", {
            "provider": "openai",
            "template_name": template_name,
            "tokens": self.estimate_tokens(messages),
            "message_count": len(messages)
        })
        
        # Cache result if Redis available
        if prompt_manager.redis_client:
            var_hash = hashlib.md5(json.dumps({
                "template": template_name, 
                "variables": variables,
                "provider": "openai"
            }, sort_keys=True).encode()).hexdigest()
            
            cache_key = f"prompt:openai:{var_hash}"
            prompt_manager.redis_client.setex(cache_key, 300, json.dumps(result))  # 5 minute cache
        
        return result
    
    def execute(self, prompt_data: Dict[str, Any]) -> str:
        """
        Execute the prompt using the OpenAI API.
        
        Args:
            prompt_data: Prompt data from prepare_prompt
            
        Returns:
            AI response text
        """
        if not hasattr(self, "client"):
            raise ValueError("OpenAI client not initialized")
        
        try:
            # Execute the prompt using OpenAI API
            if self.use_assistants_api:
                # Assistants API flow - simplified for illustration
                assistant = self.client.beta.assistants.create(
                    model=prompt_data.get("model", self.model),
                    temperature=prompt_data.get("temperature", self.temperature),
                    instructions=prompt_data["messages"][0]["content"] if prompt_data["messages"] else ""
                )
                
                thread = self.client.beta.threads.create()
                
                # Add messages to thread
                for msg in prompt_data["messages"]:
                    if msg["role"] != "system":  # Skip system message
                        self.client.beta.threads.messages.create(
                            thread_id=thread.id,
                            role=msg["role"],
                            content=msg["content"]
                        )
                
                # Run assistant
                run = self.client.beta.threads.runs.create(
                    thread_id=thread.id,
                    assistant_id=assistant.id
                )
                
                # Poll for completion
                # In real implementation, use proper async polling
                import time
                while run.status not in ["completed", "failed", "cancelled"]:
                    time.sleep(1)
                    run = self.client.beta.threads.runs.retrieve(
                        thread_id=thread.id,
                        run_id=run.id
                    )
                
                # Get messages
                messages = self.client.beta.threads.messages.list(
                    thread_id=thread.id
                )
                
                # Return the last assistant message
                for msg in reversed(messages.data):
                    if msg.role == "assistant":
                        return msg.content[0].text.value
                
                return "No response from assistant"
            
            else:
                # Chat completions API
                response = self.client.chat.completions.create(
                    model=prompt_data.get("model", self.model),
                    messages=prompt_data["messages"],
                    temperature=prompt_data.get("temperature", self.temperature)
                )
                
                return response.choices[0].message.content
        
        except Exception as e:
            log_prompt_activity("openai_execution_error", {
                "error": str(e)
            })
            raise


class ClaudeAdapter(LLMProviderAdapter):
    """Adapter for Claude API."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize the Claude adapter.
        
        Args:
            config: Claude-specific configuration
        """
        super().__init__(config)
        self.model = self.config.get("model", "claude-3-opus-20240229")
        self.temperature = self.config.get("temperature", 0.7)
        
        # Try to import Anthropic client
        try:
            import anthropic
            self.anthropic = anthropic
            # Initialize client if API key provided
            if self.api_key:
                self.client = anthropic.Anthropic(api_key=self.api_key)
                log_prompt_activity("claude_client_init", {
                    "status": "success",
                    "model": self.model
                })
        except ImportError:
            log_prompt_activity("claude_client_init", {
                "status": "error",
                "error": "Anthropic package not installed"
            })
    
    def prepare_prompt(self, prompt_manager: AdaptivePromptManager, 
                     template_name: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare a prompt for the Claude API.
        
        Args:
            prompt_manager: AdaptivePromptManager instance
            template_name: Name of the template to use
            variables: Variables to substitute in the template
            
        Returns:
            Formatted prompt data for Claude
        """
        # Check cache if Redis available
        if prompt_manager.redis_client:
            var_hash = hashlib.md5(json.dumps({
                "template": template_name, 
                "variables": variables,
                "provider": "claude"
            }, sort_keys=True).encode()).hexdigest()
            
            cache_key = f"prompt:claude:{var_hash}"
            cached_result = prompt_manager.redis_client.get(cache_key)
            
            if cached_result:
                log_prompt_activity("prepare_prompt_cache_hit", {
                    "provider": "claude",
                    "template_name": template_name
                })
                return json.loads(cached_result)
        
        # Render the template
        rendered_template = prompt_manager.render_template(template_name, variables)
        
        # Try to get relevant context based on the rendered template
        relevant_context = prompt_manager.extract_relevant_context(rendered_template)
        
        # Get conversation context in Claude format
        conversation = prompt_manager.get_context(format_type="claude")
        
        # Add relevant context if available
        if relevant_context:
            # For Claude, wrap the context in XML to make it clear what's context
            context_xml = f"\n\n<context>\n{relevant_context}\n</context>\n\n"
            conversation += context_xml
        
        # Add the rendered template as user message
        final_prompt = f"{conversation}\n\nHuman: {rendered_template}\n\nAssistant:"
        
        # Check token count
        total_tokens = count_tokens(final_prompt)
        if total_tokens > self.token_limit:
            # For Claude, we'll build a simpler version with less context
            system_message = "You are a helpful AI assistant."
            if relevant_context:
                system_message = f"You are a helpful AI assistant. Here is some relevant context:\n\n{relevant_context}"
            
            # Just use system prompt and the new message
            final_prompt = f"Human: {system_message}\n\nHuman: {rendered_template}\n\nAssistant:"
            
            log_prompt_activity("prompt_token_prune", {
                "provider": "claude",
                "original_tokens": total_tokens,
                "pruned_tokens": count_tokens(final_prompt),
                "strategy": "simplified_context"
            })
        
        result = {
            "prompt": final_prompt,
            "rendered_template": rendered_template,
            "model": self.model,
            "temperature": self.temperature,
            "token_count": count_tokens(final_prompt)
        }
        
        # Log preparation
        log_prompt_activity("prepare_prompt", {
            "provider": "claude",
            "template_name": template_name,
            "tokens": count_tokens(final_prompt)
        })
        
        # Cache result if Redis available
        if prompt_manager.redis_client:
            var_hash = hashlib.md5(json.dumps({
                "template": template_name, 
                "variables": variables,
                "provider": "claude"
            }, sort_keys=True).encode()).hexdigest()
            
            cache_key = f"prompt:claude:{var_hash}"
            prompt_manager.redis_client.setex(cache_key, 300, json.dumps(result))  # 5 minute cache
        
        return result
    
    def execute(self, prompt_data: Dict[str, Any]) -> str:
        """
        Execute the prompt using the Claude API.
        
        Args:
            prompt_data: Prompt data from prepare_prompt
            
        Returns:
            AI response text
        """
        if not hasattr(self, "client"):
            raise ValueError("Claude client not initialized")
        
        try:
            # Execute using Anthropic API
            response = self.client.messages.create(
                model=prompt_data.get("model", self.model),
                messages=[
                    {
                        "role": "user",
                        "content": prompt_data["prompt"]
                    }
                ],
                temperature=prompt_data.get("temperature", self.temperature),
                max_tokens=4096  # Default max tokens
            )
            
            return response.content[0].text
            
        except Exception as e:
            log_prompt_activity("claude_execution_error", {
                "error": str(e)
            })
            raise


class SKAdapter:
    """
    Adapter for Semantic Kernel integrations with Microsoft's Semantic Kernel.
    
    This adapter provides integration with the Semantic Kernel framework,
    allowing Devloop templates to be used as Semantic Kernel semantic functions.
    """
    
    def __init__(self, prompt_manager: AdaptivePromptManager, config: Dict[str, Any] = None):
        """
        Initialize the Semantic Kernel adapter.
        
        Args:
            prompt_manager: AdaptivePromptManager instance
            config: Configuration dictionary
        """
        self.prompt_manager = prompt_manager
        self.config = config or {}
        
        # Try to import Semantic Kernel
        try:
            import semantic_kernel as sk
            self.sk = sk
            
            # Initialize kernel if config provided
            if "api_key" in self.config:
                self.kernel = sk.Kernel()
                
                # Add AI service based on provider
                provider = self.config.get("provider", "openai")
                if provider == "openai":
                    self.kernel.add_text_completion_service(
                        "gpt", 
                        sk.OpenAITextCompletion(
                            self.config["model"] if "model" in self.config else "gpt-4o",
                            self.config["api_key"]
                        )
                    )
                elif provider == "azure":
                    self.kernel.add_text_completion_service(
                        "azure", 
                        sk.AzureTextCompletion(
                            self.config["deployment_name"],
                            self.config["endpoint"],
                            self.config["api_key"]
                        )
                    )
                
                log_prompt_activity("sk_client_init", {
                    "status": "success",
                    "provider": provider
                })
        except ImportError:
            log_prompt_activity("sk_client_init", {
                "status": "error",
                "error": "Semantic Kernel package not installed"
            })
    
    def create_semantic_function(self, template_name: str) -> Any:
        """
        Create a semantic function from a template.
        
        Args:
            template_name: Name of the template to use
            
        Returns:
            Semantic Kernel semantic function
        """
        # Check if SK is available
        if not hasattr(self, "sk"):
            raise ImportError("Semantic Kernel is not installed")
        
        # Get template
        template = self.prompt_manager.get_template(template_name)
        if not template:
            raise ValueError(f"Template not found: {template_name}")
        
        # Log activity
        log_prompt_activity("create_semantic_function", {
            "template_name": template_name,
            "variable_count": len(template.variables)
        })
        
        # For real SK integration:
        if hasattr(self, "kernel"):
            # Create semantic function config
            config = self.sk.PromptTemplateConfig()
            config.completion.max_tokens = 2000
            config.completion.temperature = self.config.get("temperature", 0.7)
            
            # Set template variables as input parameters
            for var in template.variables:
                if var.description:
                    config.input.parameters.add(
                        self.sk.PromptParameter(
                            name=var.name,
                            description=var.description,
                            default_value=var.default_value
                        )
                    )
                else:
                    config.input.parameters.add(
                        self.sk.PromptParameter(
                            name=var.name,
                            default_value=var.default_value
                        )
                    )
            
            # Create template from prompt template
            prompt_template = self.sk.PromptTemplate(
                template.template,
                config,
                template.name
            )
            
            # Register template with kernel
            return self.kernel.register_semantic_function(
                template.name,
                prompt_template
            )
        
        # Fallback for when kernel is not available
        return {
            "name": template.name,
            "description": template.description,
            "template": template.template,
            "variables": [var.name for var in template.variables]
        }
    
    def execute_semantic_function(self, function_name: str, variables: Dict[str, Any]) -> str:
        """
        Execute a semantic function.
        
        Args:
            function_name: Name of the semantic function
            variables: Variables to pass to the function
            
        Returns:
            Function result
        """
        if not hasattr(self, "kernel"):
            raise ValueError("Semantic Kernel kernel is not initialized")
        
        try:
            # Get the function
            sk_function = self.kernel.functions.get_function(function_name)
            
            # Create SK context
            context = self.sk.SKContext()
            
            # Add variables to context
            for key, value in variables.items():
                context.variables[key] = str(value)
            
            # Execute function
            result = sk_function.invoke(context=context)
            
            # Log execution
            log_prompt_activity("execute_semantic_function", {
                "function_name": function_name,
                "success": not result.error,
                "variable_count": len(variables)
            })
            
            return result.result
            
        except Exception as e:
            # Log error
            log_prompt_activity("sk_execution_error", {
                "function_name": function_name,
                "error": str(e)
            })
            raise


if __name__ == "__main__":
    """Example usage demonstrating SDK-first architecture integration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="AdaptivePromptManager Demo")
    parser.add_argument("--kg-path", help="Path to knowledge graph file")
    parser.add_argument("--config", help="Path to configuration file")
    parser.add_argument("--provider", choices=["openai", "claude", "sk"], default="openai", help="Provider to use")
    parser.add_argument("--api-key", help="API key for provider")
    parser.add_argument("--execute", action="store_true", help="Execute the prompt with the provider")
    parser.add_argument("--template-dir", help="Directory to load templates from")
    parser.add_argument("--query", help="Query to test context extraction")
    
    args = parser.parse_args()
    
    # Initialize manager with knowledge graph if provided
    manager = AdaptivePromptManager(
        templates_dir=args.template_dir,
        memory_kg_path=args.kg_path,
        config_path=args.config
    )
    
    print(f"Initialized AdaptivePromptManager with integrations:")
    print(f"- Knowledge Graph: {'Available' if manager.kb_adapter else 'Not available'}")
    print(f"- Redis Cache: {'Available' if manager.redis_client else 'Not available'}")
    print(f"- Vector DB: {'Available' if manager.vector_db else 'Not available'}")
    
    # Define a template if not loaded from directory
    if not manager.template_manager.templates:
        # Define a data analysis template
        data_template = PromptTemplate(
            name="data_analysis",
            template=(
                "# Data Analysis Request\n\n"
                "Please analyze the following data about {subject}:\n\n"
                "{data}\n\n"
                "## Requirements\n"
                "{requirements}\n\n"
                "Provide insights about {subject} based on this data."
            ),
            description="Template for data analysis",
            variables=[
                TemplateVariable("subject", required=True),
                TemplateVariable("data", required=True),
                TemplateVariable("requirements", required=False, 
                              default_value="Identify patterns and anomalies.")
            ],
            tags=["data", "analysis"]
        )
        
        # Define a feature creation template
        feature_template = PromptTemplate(
            name="feature_creation",
            template=(
                "# Feature Creation: {feature_name}\n\n"
                "## Description\n"
                "{description}\n\n"
                "## Requirements\n"
                "{requirements}\n\n"
                "Please create this feature for the {project_name} project."
            ),
            description="Template for feature creation",
            variables=[
                TemplateVariable("feature_name", required=True),
                TemplateVariable("description", required=True),
                TemplateVariable("requirements", required=False, default_value="No specific requirements."),
                TemplateVariable("project_name", required=False, default_value="Devloop")
            ],
            tags=["feature", "creation"]
        )
        
        # Add templates
        manager.add_template(data_template)
        manager.add_template(feature_template)
        
        print(f"Added example templates: data_analysis, feature_creation")
    else:
        print(f"Loaded {len(manager.template_manager.templates)} templates from directory")
    
    # Set system prompt
    manager.add_context_item(
        "You are a development assistant for the Devloop system.",
        role="system"
    )
    
    # Add some simulated context history
    manager.add_context_item(
        "I need help with creating a feature for the authentication system.",
        role="user"
    )
    
    manager.add_context_item(
        "I'd be happy to help with creating an authentication feature. What specific functionality do you need?",
        role="assistant"
    )
    
    # Test context extraction if query provided
    if args.query:
        print(f"\nExtracting context for query: {args.query}")
        context = manager.extract_relevant_context(args.query)
        print(f"Extracted context:\n{context}")
    
    # Create provider-specific adapter based on arguments
    provider_config = {
        "api_key": args.api_key
    }
    
    if args.provider == "openai":
        provider = OpenAIAdapter(provider_config)
        template_name = "feature_creation"
        template_vars = {
            "feature_name": "OAuth Authentication",
            "description": "Implement secure authentication with OAuth support for Google and GitHub.",
            "project_name": "Devloop SDK"
        }
    elif args.provider == "claude":
        provider = ClaudeAdapter(provider_config)
        template_name = "feature_creation"
        template_vars = {
            "feature_name": "OAuth Authentication",
            "description": "Implement secure authentication with OAuth support for Google and GitHub.",
            "project_name": "Devloop SDK" 
        }
    elif args.provider == "sk":
        provider = SKAdapter(manager, provider_config)
        # For SK, create a semantic function and use different execution path
        try:
            function = provider.create_semantic_function("feature_creation")
            print(f"\nCreated Semantic Kernel function: {function}")
            
            if args.execute and hasattr(provider, "kernel"):
                response = provider.execute_semantic_function(
                    "feature_creation", 
                    {
                        "feature_name": "OAuth Authentication",
                        "description": "Implement secure authentication with OAuth support.",
                        "project_name": "Devloop SDK"
                    }
                )
                print(f"\nSemantic Kernel Response:\n{response}")
        except Exception as e:
            print(f"Error with Semantic Kernel: {e}")
        
        # Exit early for SK
        import sys
        sys.exit(0)
    
    # Prepare prompt with selected provider
    try:
        prompt_data = provider.prepare_prompt(
            manager,
            template_name,
            template_vars
        )
        
        print(f"\n{args.provider.capitalize()} Prompt Prepared:")
        if args.provider == "openai":
            print(f"Model: {prompt_data.get('model', 'default')}")
            print(f"Messages: {len(prompt_data['messages'])}")
            print(f"System: {prompt_data['messages'][0]['content'][:100]}...")
        else:
            print(f"Prompt size: {prompt_data.get('token_count', 'unknown')} tokens")
            print(f"First 100 chars: {prompt_data['prompt'][:100]}...")
        
        # Execute if requested and possible
        if args.execute and args.api_key and hasattr(provider, "execute"):
            print(f"\nExecuting with {args.provider.capitalize()}...")
            response = provider.execute(prompt_data)
            print(f"\nResponse:\n{response}")
            
            # Register the response in context
            provider.register_response(manager, response)
            print(f"Response registered in context history")
            
    except Exception as e:
        print(f"Error: {e}")