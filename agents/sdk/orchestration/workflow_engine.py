"""
WorkflowEngine for orchestrating agent workflows with high performance.

This module implements a high-performance workflow engine that orchestrates
multiple agents following the manager pattern. It incorporates:

1. Connection pooling for Redis, MongoDB, and Neo4j
2. Redis caching with compression (zlib + msgpack)
3. Asynchronous operations throughout
4. Payload compression for data storage
5. Pagination for query results
6. Intelligent batching for workflow operations
7. Asynchronous logging and monitoring
8. Knowledge Graph integration for workflow context and execution tracking

The workflow engine serves as the orchestration layer in the SDK-first architecture,
enabling explicit agent handoffs and maintaining execution context across the multi-tier
memory system (Redis, MongoDB, Neo4j).
"""

import asyncio
import logging
import time
import json
import zlib
import msgpack
import os
import jsonschema
from typing import Dict, List, Any, Optional, Union, Callable
import uuid
import traceback
from datetime import datetime

# Core dependencies
from ..core.agent import SDKAgent
from ..utils.prompt_manager import PromptManager, AdaptivePromptManager, PromptTemplate, TemplateVariable
from ..adapters.ai_service_adapter import AIServiceAdapter

# Optional activity logging import
try:
    from ..utils.activity_logger import log_activity, ActivityLogger
    HAS_ACTIVITY_LOGGER = True
except ImportError:
    HAS_ACTIVITY_LOGGER = False
    # Fallback activity logger
    def log_activity(activity_type: str, details: Dict[str, Any], title: str = None):
        """Fallback activity logger that just logs to the workflow_engine logger."""
        logger.debug(f"Activity: {activity_type} - {title or 'No title'} - {details}")
    
    class ActivityLogger:
        """Fallback ActivityLogger class"""
        
        @staticmethod
        def log_workflow_created(workflow_id: str, name: str, agent_count: int, step_count: int):
            """Log workflow creation."""
            log_activity("workflow_created", {
                "workflow_id": workflow_id,
                "name": name,
                "agent_count": agent_count,
                "step_count": step_count
            }, f"Workflow {name} created")
        
        @staticmethod
        def log_workflow_execution_started(execution_id: str, workflow_id: str, name: str):
            """Log workflow execution start."""
            log_activity("workflow_execution_started", {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "name": name
            }, f"Workflow {name} execution started")
        
        @staticmethod
        def log_workflow_execution_completed(execution_id: str, workflow_id: str, name: str, 
                                           status: str, duration: float):
            """Log workflow execution completion."""
            log_activity("workflow_execution_completed", {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "name": name,
                "status": status,
                "duration": duration
            }, f"Workflow {name} execution {status.lower()}")
        
        @staticmethod
        def log_step_execution(execution_id: str, workflow_id: str, step_id: str, 
                             agent_id: str, status: str, duration: float = None):
            """Log step execution."""
            log_activity("workflow_step_execution", {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "step_id": step_id,
                "agent_id": agent_id,
                "status": status,
                "duration": duration
            }, f"Step {step_id} {status.lower()}")
        
        @staticmethod
        def log_workflow_checkpoint(checkpoint_id: str, execution_id: str, 
                                  workflow_id: str, reason: str):
            """Log workflow checkpoint creation."""
            log_activity("workflow_checkpoint_created", {
                "checkpoint_id": checkpoint_id,
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "reason": reason
            }, f"Workflow checkpoint created: {reason}")
        
        @staticmethod
        def log_workflow_resumed(checkpoint_id: str, execution_id: str, 
                               workflow_id: str, resume_count: int):
            """Log workflow resumption."""
            log_activity("workflow_execution_resumed", {
                "checkpoint_id": checkpoint_id,
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "resume_count": resume_count
            }, f"Workflow execution resumed from checkpoint")
        
        @staticmethod
        def log_error(component: str, error_type: str, message: str, details: Dict[str, Any] = None):
            """Log error."""
            log_activity("error", {
                "component": component,
                "error_type": error_type,
                "message": message,
                "details": details or {}
            }, f"Error in {component}: {message}")
        
        @staticmethod
        def log_workflow_validation(workflow_id: str, name: str, is_valid: bool, errors: List[str] = None):
            """Log workflow validation result."""
            log_activity("workflow_validation", {
                "workflow_id": workflow_id,
                "name": name,
                "is_valid": is_valid,
                "errors": errors or []
            }, f"Workflow validation {'succeeded' if is_valid else 'failed'}")

# Performance optimizations
import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import AsyncGraphDatabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connection pools
class ConnectionManager:
    """Manages connection pools for databases and caching."""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConnectionManager, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance
    
    def __init__(self):
        if self.initialized:
            return
            
        # Configuration should be loaded from environment variables or config files
        self.redis_config = {
            "host": "localhost",
            "port": 6379,
            "db": 0,
            "decode_responses": True,
            "max_connections": 100
        }
        
        self.mongodb_config = {
            "uri": "mongodb://localhost:27017",
            "db_name": "devloop",
            "max_pool_size": 100,
            "min_pool_size": 10
        }
        
        self.neo4j_config = {
            "uri": "neo4j://localhost:7687",
            "auth": ("neo4j", "password"),
            "max_connection_lifetime": 3600,
            "max_connection_pool_size": 100
        }
        
        # Initialize connection pools
        self.redis_pool = None
        self.mongodb_client = None
        self.neo4j_driver = None
        self.initialized = True
    
    async def get_redis_connection(self) -> redis.Redis:
        """Get a Redis connection from the pool."""
        if self.redis_pool is None:
            self.redis_pool = redis.Redis(
                connection_pool=redis.ConnectionPool(**self.redis_config)
            )
        return self.redis_pool
    
    def get_mongodb_client(self) -> AsyncIOMotorClient:
        """Get a MongoDB connection from the pool."""
        if self.mongodb_client is None:
            self.mongodb_client = AsyncIOMotorClient(
                self.mongodb_config["uri"],
                maxPoolSize=self.mongodb_config["max_pool_size"],
                minPoolSize=self.mongodb_config["min_pool_size"]
            )
        return self.mongodb_client
    
    def get_neo4j_driver(self) -> AsyncGraphDatabase.driver:
        """Get a Neo4j connection from the pool."""
        if self.neo4j_driver is None:
            self.neo4j_driver = AsyncGraphDatabase.driver(
                self.neo4j_config["uri"],
                auth=self.neo4j_config["auth"],
                max_connection_lifetime=self.neo4j_config["max_connection_lifetime"],
                max_connection_pool_size=self.neo4j_config["max_connection_pool_size"]
            )
        return self.neo4j_driver
    
    async def close_all_connections(self):
        """Close all connection pools."""
        if self.redis_pool is not None:
            await self.redis_pool.close()
        
        if self.mongodb_client is not None:
            self.mongodb_client.close()
        
        if self.neo4j_driver is not None:
            await self.neo4j_driver.close()


class CacheManager:
    """Manages caching operations with Redis and compression."""
    
    def __init__(self):
        self.conn_manager = ConnectionManager()
        self.default_ttl = 3600  # 1 hour
    
    async def get_cache(self, key: str) -> Any:
        """Get a cached value with decompression."""
        redis_client = await self.conn_manager.get_redis_connection()
        cached_data = await redis_client.get(key)
        
        if not cached_data:
            return None
        
        # Decompress and deserialize
        try:
            decompressed = zlib.decompress(cached_data)
            return msgpack.unpackb(decompressed)
        except Exception as e:
            logger.error(f"Error decompressing cache: {e}")
            return None
    
    async def set_cache(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set a cached value with compression."""
        redis_client = await self.conn_manager.get_redis_connection()
        
        # Serialize and compress
        try:
            serialized = msgpack.packb(value)
            compressed = zlib.compress(serialized)
            return await redis_client.set(
                key, 
                compressed, 
                ex=ttl if ttl is not None else self.default_ttl
            )
        except Exception as e:
            logger.error(f"Error compressing cache: {e}")
            return False
    
    async def invalidate_cache(self, key: str) -> bool:
        """Invalidate a cached value."""
        redis_client = await self.conn_manager.get_redis_connection()
        return await redis_client.delete(key) > 0


class WorkflowDefinition:
    """Defines a workflow with steps, agents, and transition conditions."""
    
    def __init__(self, workflow_id: str, name: str, description: str = ""):
        self.workflow_id = workflow_id
        self.name = name
        self.description = description
        self.steps = []
        self.transitions = {}
        self.agents = {}
        self.global_context = {}
        self.on_error = None
        self.metadata = {}
        self.parallel_execution_enabled = True  # Default to enabled
    
    def add_step(self, step_id: str, agent_id: str, 
                 input_mapping: Dict = None, 
                 output_mapping: Dict = None) -> 'WorkflowDefinition':
        """Add a step to the workflow."""
        self.steps.append({
            "step_id": step_id,
            "agent_id": agent_id,
            "input_mapping": input_mapping or {},
            "output_mapping": output_mapping or {}
        })
        return self
    
    def add_transition(self, from_step: str, to_step: str, 
                      condition: Callable = None) -> 'WorkflowDefinition':
        """Add a transition between steps with an optional condition."""
        if from_step not in self.transitions:
            self.transitions[from_step] = []
        
        self.transitions[from_step].append({
            "to_step": to_step,
            "condition": condition
        })
        return self
    
    def add_agent(self, agent_id: str, agent_config: Dict) -> 'WorkflowDefinition':
        """Register an agent configuration to be used in the workflow."""
        self.agents[agent_id] = agent_config
        return self
    
    def set_error_handler(self, handler: Callable) -> 'WorkflowDefinition':
        """Set a global error handler for the workflow."""
        self.on_error = handler
        return self
    
    def to_dict(self) -> Dict:
        """Convert workflow definition to dictionary for storage."""
        return {
            "workflow_id": self.workflow_id,
            "name": self.name,
            "description": self.description,
            "steps": self.steps,
            "transitions": {
                step: [
                    {"to_step": t["to_step"]} 
                    for t in transitions
                ] 
                for step, transitions in self.transitions.items()
            },
            "agents": self.agents,
            "global_context": self.global_context,
            "metadata": self.metadata,
            "parallel_execution_enabled": self.parallel_execution_enabled
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'WorkflowDefinition':
        """Create a workflow definition from a dictionary."""
        workflow = cls(
            workflow_id=data["workflow_id"],
            name=data["name"],
            description=data.get("description", "")
        )
        
        workflow.steps = data["steps"]
        workflow.agents = data["agents"]
        workflow.global_context = data.get("global_context", {})
        workflow.metadata = data.get("metadata", {})
        workflow.parallel_execution_enabled = data.get("parallel_execution_enabled", True)
        
        # Reconstruct transitions without conditions (which can't be serialized)
        for step, transitions in data.get("transitions", {}).items():
            workflow.transitions[step] = [
                {"to_step": t["to_step"], "condition": None} 
                for t in transitions
            ]
        
        return workflow
        
    def build_dependency_graph(self) -> Dict[str, List[str]]:
        """Build a dependency graph of steps based on transitions.
        
        Returns:
            Dictionary mapping each step to its dependencies
        """
        # Initialize dependency graph with empty dependencies for all steps
        dependencies = {step["step_id"]: [] for step in self.steps}
        
        # Add dependencies based on transitions
        for from_step, transitions in self.transitions.items():
            for transition in transitions:
                to_step = transition["to_step"]
                if to_step in dependencies:
                    dependencies[to_step].append(from_step)
        
        return dependencies
    
    def get_parallel_execution_groups(self) -> List[List[str]]:
        """Identify groups of steps that can be executed in parallel.
        
        Returns:
            List of lists, where each inner list contains steps that can be executed in parallel
        """
        if not self.parallel_execution_enabled:
            # If parallel execution is disabled, each step is its own group
            return [[step["step_id"]] for step in self.steps]
        
        # Build dependency graph
        dependencies = self.build_dependency_graph()
        
        # Find the execution order (topological sort)
        execution_order = self.topological_sort(dependencies)
        
        # Group steps by their level (steps at the same level can be executed in parallel)
        levels = {}
        for step_id in execution_order:
            # Calculate the maximum level of all dependencies plus 1
            max_dep_level = -1
            for dep in dependencies[step_id]:
                if dep in levels:
                    max_dep_level = max(max_dep_level, levels[dep])
            
            # The level of this step is one more than its highest dependency
            level = max_dep_level + 1
            if level not in levels:
                levels[level] = []
            levels[level].append(step_id)
        
        # Convert levels dictionary to list of lists
        return [steps for _, steps in sorted(levels.items())]
    
    def topological_sort(self, dependencies: Dict[str, List[str]]) -> List[str]:
        """Perform a topological sort of steps based on dependencies.
        
        Args:
            dependencies: Dictionary mapping each step to its dependencies
            
        Returns:
            Ordered list of steps
        """
        # Count incoming edges for each step
        incoming_edges = {step: 0 for step in dependencies}
        for step in dependencies:
            for dep in dependencies[step]:
                incoming_edges[step] += 1
        
        # Start with steps that have no dependencies
        queue = [step for step in incoming_edges if incoming_edges[step] == 0]
        result = []
        
        # Process steps in order
        while queue:
            current = queue.pop(0)
            result.append(current)
            
            # Decrement incoming edges for steps that depend on the current step
            for step in dependencies:
                if current in dependencies[step]:
                    incoming_edges[step] -= 1
                    if incoming_edges[step] == 0:
                        queue.append(step)
        
        # Check for cycles
        if len(result) != len(dependencies):
            logger.warning(f"Cycle detected in workflow {self.workflow_id}")
        
        return result


class WorkflowExecution:
    """Manages a single execution of a workflow."""
    
    def __init__(self, 
                 workflow_definition: WorkflowDefinition, 
                 initial_context: Dict = None,
                 execution_id: str = None):
        self.workflow = workflow_definition
        self.execution_id = execution_id or str(uuid.uuid4())
        self.context = initial_context or {}
        self.context.update(self.workflow.global_context)
        self.current_step = None
        self.step_results = {}
        self.start_time = None
        self.end_time = None
        self.status = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, PAUSED
        self.error = None
        self.logs = []
        
        # Additional tracking for parallel execution
        self.step_statuses = {}  # PENDING, RUNNING, COMPLETED, FAILED, PAUSED
        self.step_dependencies_met = {}
        self.active_steps = set()  # Currently executing steps
        
        # Checkpointing information
        self.last_checkpoint_time = None
        self.checkpoint_count = 0
        self.resume_count = 0
        self.pause_reason = None
        
        # Initialize step statuses for all steps
        for step in self.workflow.steps:
            step_id = step["step_id"]
            self.step_statuses[step_id] = "PENDING"
            self.step_dependencies_met[step_id] = False
        
    def to_dict(self) -> Dict:
        """Convert execution state to dictionary for storage."""
        return {
            "execution_id": self.execution_id,
            "workflow_id": self.workflow.workflow_id,
            "context": self.context,
            "current_step": self.current_step,
            "step_results": self.step_results,
            "step_statuses": self.step_statuses,
            "active_steps": list(self.active_steps),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "status": self.status,
            "error": str(self.error) if self.error else None,
            "logs": self.logs,
            "last_checkpoint_time": self.last_checkpoint_time,
            "checkpoint_count": self.checkpoint_count,
            "resume_count": self.resume_count,
            "pause_reason": self.pause_reason,
            "step_dependencies_met": self.step_dependencies_met
        }
    
    def log(self, message: str, level: str = "INFO"):
        """Add a log entry to the execution logs."""
        self.logs.append({
            "timestamp": time.time(),
            "level": level,
            "message": message
        })
        
        if level == "INFO":
            logger.info(f"[{self.execution_id}] {message}")
        elif level == "ERROR":
            logger.error(f"[{self.execution_id}] {message}")
        elif level == "WARNING":
            logger.warning(f"[{self.execution_id}] {message}")
    
    def get_next_steps(self) -> List[str]:
        """Get the next steps based on the current step and transitions."""
        if not self.current_step:
            # If no current step, return the first step
            if self.workflow.steps:
                return [self.workflow.steps[0]["step_id"]]
            return []
        
        if self.current_step not in self.workflow.transitions:
            return []
        
        next_steps = []
        for transition in self.workflow.transitions[self.current_step]:
            condition = transition.get("condition")
            if condition is None or condition(self.context, self.step_results):
                next_steps.append(transition["to_step"])
        
        return next_steps
    
    def mark_step_status(self, step_id: str, status: str):
        """Mark the status of a step."""
        if step_id in self.step_statuses:
            old_status = self.step_statuses[step_id]
            self.step_statuses[step_id] = status
            
            if status == "RUNNING":
                self.active_steps.add(step_id)
            elif status in ["COMPLETED", "FAILED"] and step_id in self.active_steps:
                self.active_steps.remove(step_id)
            
            self.log(f"Step {step_id} status changed from {old_status} to {status}")
    
    def update_dependencies_met(self):
        """Update which steps have their dependencies met."""
        dependencies = self.workflow.build_dependency_graph()
        
        for step_id, deps in dependencies.items():
            # A step's dependencies are met if all its dependent steps are completed
            deps_met = True
            for dep in deps:
                if self.step_statuses.get(dep) != "COMPLETED":
                    deps_met = False
                    break
            
            self.step_dependencies_met[step_id] = deps_met
    
    def get_ready_steps(self) -> List[str]:
        """Get steps that are ready to execute (dependencies met and not started)."""
        ready_steps = []
        
        # Update dependencies first
        self.update_dependencies_met()
        
        for step_id, status in self.step_statuses.items():
            if status == "PENDING" and self.step_dependencies_met.get(step_id, False):
                ready_steps.append(step_id)
        
        return ready_steps
    
    def is_workflow_complete(self) -> bool:
        """Check if all steps have been completed or failed."""
        for status in self.step_statuses.values():
            if status not in ["COMPLETED", "FAILED"]:
                return False
        return True


# Default workflow definition schema
WORKFLOW_SCHEMA = {
    "type": "object",
    "required": ["workflow_id", "name", "steps", "agents"],
    "properties": {
        "workflow_id": {"type": "string"},
        "name": {"type": "string"},
        "description": {"type": "string"},
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["step_id", "agent_id"],
                "properties": {
                    "step_id": {"type": "string"},
                    "agent_id": {"type": "string"},
                    "input_mapping": {"type": "object"},
                    "output_mapping": {"type": "object"}
                }
            }
        },
        "transitions": {
            "type": "object",
            "additionalProperties": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["to_step"],
                    "properties": {
                        "to_step": {"type": "string"}
                    }
                }
            }
        },
        "agents": {
            "type": "object",
            "additionalProperties": {
                "type": "object",
                "required": ["type"],
                "properties": {
                    "type": {"type": "string"},
                    "name": {"type": "string"},
                    "system_prompt": {"type": "string"},
                    "system_prompt_template": {"type": "string"},
                    "system_prompt_variables": {"type": "object"},
                    "model": {"type": "string"},
                    "tools": {"type": "array"},
                    "use_knowledge_graph": {"type": "boolean"},
                    "knowledge_query": {"type": "string"}
                }
            }
        },
        "global_context": {"type": "object"},
        "metadata": {"type": "object"},
        "parallel_execution_enabled": {"type": "boolean"}
    }
}

# Schema for step execution
STEP_EXECUTION_SCHEMA = {
    "type": "object",
    "required": ["step_id", "agent_id", "input"],
    "properties": {
        "step_id": {"type": "string"},
        "agent_id": {"type": "string"},
        "input": {"type": "object"},
        "timeout": {"type": "number", "minimum": 0}
    }
}

class WorkflowEngine:
    """High-performance workflow engine for orchestrating agent workflows."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the workflow engine.
        
        Args:
            config: Optional configuration dictionary with the following options:
                - templates_dir: Directory for prompt templates
                - memory_kg_path: Path to knowledge graph
                - max_context_tokens: Maximum tokens for context
                - vector_embeddings_enabled: Whether to use vector embeddings
                - event_stream_enabled: Whether to use event stream
                - adaptive_prompt_manager: Whether to use the advanced prompt manager
                - parallel_execution: Whether to enable parallel step execution
                - max_parallel_steps: Maximum number of steps to execute in parallel
                - concurrency_control: Strategy for controlling concurrency ("aimd", "fixed", "dynamic")
                - step_timeout: Timeout in seconds for individual step execution
                - sync_interval: Interval in seconds to sync workflow state for parallel execution
                - auto_checkpoint_interval: Interval in seconds for automatic checkpointing (0 to disable)
                - checkpoint_storage: Storage backend for checkpoints ("mongodb", "redis", "file")
                - max_checkpoint_history: Maximum number of checkpoints to keep per workflow
                - schema_validation: Whether to validate workflow definitions against a schema
                - custom_schemas: Optional dictionary of custom validation schemas
        """
        # Configuration
        self.config = config or {}
        
        # Initialize connection managers
        self.conn_manager = ConnectionManager()
        self.cache_manager = CacheManager()
        
        # Initialize prompt management
        templates_dir = self.config.get("templates_dir")
        memory_kg_path = self.config.get("memory_kg_path")
        max_context_tokens = self.config.get("max_context_tokens", 16000)
        
        if self.config.get("adaptive_prompt_manager", True):
            # Use the enhanced prompt manager with knowledge graph integration
            self.prompt_manager = AdaptivePromptManager(
                templates_dir=templates_dir,
                memory_kg_path=memory_kg_path,
                max_context_tokens=max_context_tokens
            )
            self.using_adaptive_manager = True
            log_activity("workflow_engine_init", {
                "prompt_manager": "adaptive",
                "templates_dir": templates_dir,
                "memory_kg_path": memory_kg_path
            }, "Initialized WorkflowEngine with AdaptivePromptManager")
        else:
            # Fall back to basic prompt manager
            self.prompt_manager = PromptManager()
            self.using_adaptive_manager = False
            log_activity("workflow_engine_init", {
                "prompt_manager": "basic"
            }, "Initialized WorkflowEngine with basic PromptManager")
        
        # Initialize AI service adapter
        self.ai_service_adapter = AIServiceAdapter()
        
        # Set up performance metrics
        self.metrics = self._setup_metrics()
        
        # Set up vector embeddings for semantic search
        self.vector_embeddings = self._setup_vector_embeddings()
        
        # Set up event stream for workflow state changes
        self.event_stream = self._setup_event_stream()
        
        # Internal tracking
        self.active_workflows = {}
        self.pending_tasks = set()
        
        # Circuit breakers for external services
        self.circuit_breakers = {}
        
        # Performance optimizations
        self.batch_queue = {}
        self.batch_queue_lock = asyncio.Lock()
        
        # Workflow templates cache
        self.workflow_templates = {}
        
        # Parallel execution configuration
        self.parallel_execution_enabled = self.config.get("parallel_execution", True)
        self.max_parallel_steps = self.config.get("max_parallel_steps", 10)
        self.concurrency_control = self.config.get("concurrency_control", "dynamic")
        self.step_timeout = self.config.get("step_timeout", 300)  # 5 minutes default
        self.sync_interval = self.config.get("sync_interval", 5)  # 5 seconds default
        
        # Checkpointing configuration
        self.auto_checkpoint_interval = self.config.get("auto_checkpoint_interval", 300)  # 5 minutes default, 0 to disable
        self.checkpoint_storage = self.config.get("checkpoint_storage", "mongodb")
        self.max_checkpoint_history = self.config.get("max_checkpoint_history", 5)
        
        # Parallel execution tracking
        self.step_tasks = {}  # Mapping of execution_id -> {step_id -> task}
        
        # Checkpoint trackers
        self.checkpoint_timers = {}  # Mapping of execution_id -> next checkpoint time
        
        # Schema validation configuration
        self.schema_validation_enabled = self.config.get("schema_validation", True)
        self.custom_schemas = self.config.get("custom_schemas", {})
        
        # Combine default schemas with custom schemas
        self.schemas = {
            "workflow": WORKFLOW_SCHEMA,
            "step_execution": STEP_EXECUTION_SCHEMA
        }
        self.schemas.update(self.custom_schemas)
    
    def _setup_metrics(self) -> Dict[str, Any]:
        """Set up performance metrics for monitoring workflow execution.
        
        Returns:
            Dictionary of metrics collectors
        """
        # Metrics for workflow operations
        return {
            "execution_duration": {},
            "step_duration": {},
            "cache_hits": 0,
            "cache_misses": 0,
            "db_operations": {},
            "api_latency": {}
        }
    
    def _setup_vector_embeddings(self) -> Optional[Any]:
        """Set up vector embeddings for semantic search capabilities.
        
        Returns:
            Vector database connection or None if not configured
        """
        # Check if vector embeddings are enabled in config
        if not self.config.get("vector_embeddings_enabled", False):
            return None
            
        try:
            # This would normally connect to Pinecone, Qdrant, or similar
            # For now, return a placeholder
            logger.info("Vector embeddings initialized")
            return {"status": "initialized"}
        except Exception as e:
            logger.error(f"Error initializing vector embeddings: {e}")
            return None
    
    def _setup_event_stream(self) -> Optional[Any]:
        """Set up event stream for workflow state changes.
        
        Returns:
            Event stream connection or None if not configured
        """
        # Check if event stream is enabled in config
        if not self.config.get("event_stream_enabled", False):
            return None
            
        try:
            # This would normally connect to Redis Streams or Kafka
            # For now, return a placeholder
            logger.info("Event stream initialized")
            return {"status": "initialized"}
        except Exception as e:
            logger.error(f"Error initializing event stream: {e}")
            return None
    
    async def initialize(self):
        """Initialize the workflow engine and its dependencies."""
        # Initialize connections
        redis_client = await self.conn_manager.get_redis_connection()
        mongodb_client = self.conn_manager.get_mongodb_client()
        neo4j_driver = self.conn_manager.get_neo4j_driver()
        
        # Initialize circuit breakers
        self.circuit_breakers = {
            "redis": {"failures": 0, "threshold": 5, "status": "closed"},
            "mongodb": {"failures": 0, "threshold": 5, "status": "closed"},
            "neo4j": {"failures": 0, "threshold": 5, "status": "closed"}
        }
        
        # Perform health checks
        try:
            # Redis health check
            await redis_client.ping()
            logger.info("Redis connection successful")
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            
        try:
            # MongoDB health check
            db = mongodb_client[self.conn_manager.mongodb_config["db_name"]]
            await db.command("ping")
            logger.info("MongoDB connection successful")
        except Exception as e:
            logger.warning(f"MongoDB health check failed: {e}")
            
        try:
            # Neo4j health check
            async with neo4j_driver.session() as session:
                result = await session.run("RETURN 1 as n")
                record = await result.single()
                if record["n"] == 1:
                    logger.info("Neo4j connection successful")
        except Exception as e:
            logger.warning(f"Neo4j health check failed: {e}")
    
    async def load_workflow(self, workflow_id: str) -> Optional[WorkflowDefinition]:
        """Load a workflow definition from storage."""
        # Try cache first
        cached = await self.cache_manager.get_cache(f"workflow:{workflow_id}")
        if cached:
            return WorkflowDefinition.from_dict(cached)
        
        # Load from database
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        workflow_data = await db.workflows.find_one({"workflow_id": workflow_id})
        if not workflow_data:
            return None
        
        # Cache the result
        await self.cache_manager.set_cache(f"workflow:{workflow_id}", workflow_data)
        
        return WorkflowDefinition.from_dict(workflow_data)
    
    def validate_workflow_definition(self, workflow_data: Dict) -> List[str]:
        """Validate a workflow definition against the schema.
        
        Args:
            workflow_data: Workflow definition data to validate
            
        Returns:
            List of validation errors, empty if valid
        """
        if not self.schema_validation_enabled:
            return []
        
        errors = []
        
        try:
            jsonschema.validate(workflow_data, self.schemas["workflow"])
        except jsonschema.exceptions.ValidationError as e:
            errors.append(f"Schema validation error: {e.message}")
            return errors
        
        # Additional validations beyond basic schema
        
        # Check that all agent_ids in steps exist in agents
        agent_ids = set(workflow_data.get("agents", {}).keys())
        for step in workflow_data.get("steps", []):
            if step["agent_id"] not in agent_ids:
                errors.append(f"Step {step['step_id']} references non-existent agent {step['agent_id']}")
        
        # Check that all steps in transitions exist
        step_ids = set(step["step_id"] for step in workflow_data.get("steps", []))
        for from_step, transitions in workflow_data.get("transitions", {}).items():
            if from_step not in step_ids:
                errors.append(f"Transition from non-existent step {from_step}")
            
            for transition in transitions:
                to_step = transition.get("to_step")
                if to_step not in step_ids:
                    errors.append(f"Transition to non-existent step {to_step}")
        
        # Check for cycles in the workflow
        try:
            workflow = WorkflowDefinition.from_dict(workflow_data)
            dependency_graph = workflow.build_dependency_graph()
            workflow.topological_sort(dependency_graph)
        except Exception as e:
            errors.append(f"Workflow contains a cycle: {str(e)}")
        
        # Log validation result
        ActivityLogger.log_workflow_validation(
            workflow_id=workflow_data.get("workflow_id", "unknown"),
            name=workflow_data.get("name", "unknown"),
            is_valid=len(errors) == 0,
            errors=errors
        )
        
        return errors
    
    def validate_step_execution(self, step_execution: Dict) -> List[str]:
        """Validate a step execution against the schema.
        
        Args:
            step_execution: Step execution data to validate
            
        Returns:
            List of validation errors, empty if valid
        """
        if not self.schema_validation_enabled:
            return []
        
        errors = []
        
        try:
            jsonschema.validate(step_execution, self.schemas["step_execution"])
        except jsonschema.exceptions.ValidationError as e:
            errors.append(f"Schema validation error: {e.message}")
        
        return errors
    
    async def save_workflow(self, workflow: WorkflowDefinition) -> bool:
        """Save a workflow definition to storage."""
        workflow_dict = workflow.to_dict()
        
        # Validate workflow definition
        if self.schema_validation_enabled:
            errors = self.validate_workflow_definition(workflow_dict)
            if errors:
                logger.error(f"Workflow {workflow.workflow_id} validation failed: {errors}")
                ActivityLogger.log_error(
                    component="WorkflowEngine",
                    error_type="ValidationError",
                    message=f"Workflow {workflow.workflow_id} validation failed",
                    details={"workflow_id": workflow.workflow_id, "errors": errors}
                )
                return False
        
        # Save to database
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        try:
            # Check if this is a new workflow or an update
            existing = await db.workflows.find_one({"workflow_id": workflow.workflow_id})
            is_new = existing is None
            
            await db.workflows.update_one(
                {"workflow_id": workflow.workflow_id},
                {"$set": workflow_dict},
                upsert=True
            )
            
            # Update cache
            await self.cache_manager.set_cache(
                f"workflow:{workflow.workflow_id}", 
                workflow_dict
            )
            
            # Log workflow creation or update
            if is_new:
                ActivityLogger.log_workflow_created(
                    workflow_id=workflow.workflow_id,
                    name=workflow.name,
                    agent_count=len(workflow.agents),
                    step_count=len(workflow.steps)
                )
            else:
                log_activity("workflow_updated", {
                    "workflow_id": workflow.workflow_id,
                    "name": workflow.name,
                    "agent_count": len(workflow.agents),
                    "step_count": len(workflow.steps)
                }, f"Workflow {workflow.name} updated")
            
            return True
        except Exception as e:
            logger.error(f"Error saving workflow: {e}")
            ActivityLogger.log_error(
                component="WorkflowEngine",
                error_type="DatabaseError",
                message=f"Error saving workflow {workflow.workflow_id}",
                details={"workflow_id": workflow.workflow_id, "error": str(e)}
            )
            return False
    
    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow definition from storage."""
        # Delete from database
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        try:
            await db.workflows.delete_one({"workflow_id": workflow_id})
            
            # Invalidate cache
            await self.cache_manager.invalidate_cache(f"workflow:{workflow_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting workflow: {e}")
            return False
    
    async def list_workflows(self, 
                            page: int = 1, 
                            page_size: int = 20,
                            filters: Dict = None) -> Dict:
        """List workflow definitions with pagination."""
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        filter_query = filters or {}
        
        # Calculate skip for pagination
        skip = (page - 1) * page_size
        
        # Get paginated results
        cursor = db.workflows.find(
            filter_query,
            {"_id": 0}  # Exclude MongoDB _id field
        ).skip(skip).limit(page_size).sort("name", 1)
        
        workflows = await cursor.to_list(length=page_size)
        
        # Get total count for pagination
        total_count = await db.workflows.count_documents(filter_query)
        
        return {
            "workflows": workflows,
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    
    async def validate_all_workflows(self) -> Dict[str, List[str]]:
        """Validate all workflows in the database.
        
        Returns:
            Dictionary mapping workflow IDs to lists of validation errors
        """
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        validation_results = {}
        
        async for workflow_data in db.workflows.find({}):
            workflow_id = workflow_data.get("workflow_id")
            if not workflow_id:
                continue
            
            errors = self.validate_workflow_definition(workflow_data)
            if errors:
                validation_results[workflow_id] = errors
        
        return validation_results
    
    async def create_execution(self, 
                              workflow_id: str, 
                              initial_context: Dict = None,
                              context_query: str = None,
                              from_checkpoint_id: str = None,
                              skip_validation: bool = False) -> Optional[str]:
        """Create a new workflow execution or resume from a checkpoint.
        
        Args:
            workflow_id: ID of the workflow to execute
            initial_context: Initial context for the execution
            context_query: Optional query to extract relevant context from knowledge graph
            from_checkpoint_id: Optional checkpoint ID to resume from
            skip_validation: Whether to skip workflow validation
            
        Returns:
            Execution ID if successful, None otherwise
        """
        # Start timing for metrics
        start_time = time.time()
        
        # Load workflow definition
        workflow = await self.load_workflow(workflow_id)
        if not workflow:
            logger.error(f"Workflow {workflow_id} not found")
            return None
        
        # Validate workflow if schema validation is enabled
        if self.schema_validation_enabled and not skip_validation:
            errors = self.validate_workflow_definition(workflow.to_dict())
            if errors:
                logger.error(f"Workflow {workflow_id} validation failed: {errors}")
                return None
        
        # Check if we're resuming from a checkpoint
        if from_checkpoint_id:
            checkpoint = await self._load_checkpoint(from_checkpoint_id)
            if not checkpoint:
                logger.error(f"Checkpoint {from_checkpoint_id} not found")
                return None
            
            # Create execution from checkpoint
            execution = await self._create_execution_from_checkpoint(checkpoint, workflow)
            
            # Log resumption
            execution.log(f"Resuming execution from checkpoint {from_checkpoint_id}")
            execution.resume_count += 1
            
            # Mark all previously completed steps as COMPLETED
            for step_id, status in execution.step_statuses.items():
                if status == "COMPLETED":
                    execution.log(f"Step {step_id} already completed from checkpoint")
            
            ActivityLogger.log_workflow_resumed(
                checkpoint_id=from_checkpoint_id,
                execution_id=execution.execution_id,
                workflow_id=workflow_id,
                resume_count=execution.resume_count
            )
        else:
            # Start with provided context or empty dict
            context = initial_context or {}
            
            # Enrich context with knowledge graph data if query provided
            if context_query and self.using_adaptive_manager:
                try:
                    kg_context = self.prompt_manager.extract_relevant_context(context_query)
                    if kg_context:
                        # Add knowledge graph context under a dedicated key
                        context["knowledge_context"] = kg_context
                        
                        # Log successful context enrichment
                        log_activity("workflow_context_enriched", {
                            "workflow_id": workflow_id,
                            "query": context_query,
                            "context_size": len(kg_context)
                        })
                except Exception as e:
                    logger.warning(f"Failed to enrich context from knowledge graph: {e}")
            
            # Create new execution object
            execution = WorkflowExecution(
                workflow_definition=workflow,
                initial_context=context
            )
        
        # Save execution to database with optimistic locking
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        try:
            # Add execution to active workflows tracking
            self.active_workflows[execution.execution_id] = {
                "status": "PENDING",
                "start_time": time.time(),
                "workflow_id": workflow_id
            }
            
            # Store execution in database
            execution_dict = execution.to_dict()
            await db.workflow_executions.insert_one(execution_dict)
            
            # Cache execution summary in Redis for fast retrieval
            redis_client = await self.conn_manager.get_redis_connection()
            
            # Create compact representation for caching
            execution_summary = {
                "id": execution.execution_id,
                "workflow_id": workflow_id,
                "status": "PENDING",
                "created_at": time.time()
            }
            
            # Use msgpack and compression for efficient storage
            serialized = msgpack.packb(execution_summary)
            compressed = zlib.compress(serialized)
            
            # Store in Redis with TTL
            await redis_client.set(
                f"workflow:execution:{execution.execution_id}:summary", 
                compressed,
                ex=3600  # 1 hour TTL
            )
            
            # Start asynchronous execution with error handling
            task = asyncio.create_task(
                self._execute_workflow(execution)
            )
            self.pending_tasks.add(task)
            task.add_done_callback(lambda t: self._handle_task_completion(t, execution.execution_id))
            
            # Record metrics for this operation
            creation_time = time.time() - start_time
            if "execution_creation" not in self.metrics["api_latency"]:
                self.metrics["api_latency"]["execution_creation"] = []
            self.metrics["api_latency"]["execution_creation"].append(creation_time)
            
            # Log execution creation
            ActivityLogger.log_workflow_execution_started(
                execution_id=execution.execution_id,
                workflow_id=workflow_id,
                name=workflow.name
            )
            
            log_activity("workflow_execution_created", {
                "execution_id": execution.execution_id,
                "workflow_id": workflow_id,
                "context_size": len(json.dumps(context)) if context else 0,
                "creation_time": creation_time
            })
            
            return execution.execution_id
        except Exception as e:
            logger.error(f"Error creating execution: {e}")
            
            # Remove from active workflows if there was an error
            if execution.execution_id in self.active_workflows:
                del self.active_workflows[execution.execution_id]
                
            # Record error metrics
            if "execution_errors" not in self.metrics:
                self.metrics["execution_errors"] = {}
            if "creation" not in self.metrics["execution_errors"]:
                self.metrics["execution_errors"]["creation"] = 0
            self.metrics["execution_errors"]["creation"] += 1
            
            return None
    
    def _handle_task_completion(self, task: asyncio.Task, execution_id: str) -> None:
        """Handle task completion, cleanup, and error logging.
        
        Args:
            task: The completed task
            execution_id: ID of the execution that completed
        """
        # Remove from pending tasks set
        self.pending_tasks.discard(task)
        
        # Remove from active workflows tracking
        if execution_id in self.active_workflows:
            # Update status first
            status = "COMPLETED"
            
            # Check for exception
            if task.exception():
                status = "FAILED"
                logger.error(f"Workflow execution {execution_id} failed: {task.exception()}")
                
                # Record error in metrics
                if "execution_errors" not in self.metrics:
                    self.metrics["execution_errors"] = {}
                if "runtime" not in self.metrics["execution_errors"]:
                    self.metrics["execution_errors"]["runtime"] = 0
                self.metrics["execution_errors"]["runtime"] += 1
            
            # Log task completion
            log_activity("workflow_execution_completed", {
                "execution_id": execution_id,
                "status": status,
                "duration": time.time() - self.active_workflows[execution_id]["start_time"]
            })
            
            # Remove from active workflows
            del self.active_workflows[execution_id]
    
    async def _execute_workflow(self, execution: WorkflowExecution):
        """Execute a workflow asynchronously, with optional parallel step execution."""
        execution.start_time = time.time() if not execution.start_time else execution.start_time
        execution.status = "RUNNING"
        
        # Save initial execution state
        await self._save_execution_state(execution)
        
        # Setup auto-checkpointing if enabled
        if self.auto_checkpoint_interval > 0:
            self.checkpoint_timers[execution.execution_id] = time.time() + self.auto_checkpoint_interval
        
        # Track this execution's steps
        self.step_tasks[execution.execution_id] = {}
        
        try:
            # Initialize agents
            agents = {}
            for agent_id, agent_config in execution.workflow.agents.items():
                agent = self._create_agent(agent_id, agent_config)
                agents[agent_id] = agent
            
            # Check if parallel execution is enabled for this workflow
            parallel_enabled = (self.parallel_execution_enabled and 
                               execution.workflow.parallel_execution_enabled)
            
            if parallel_enabled:
                await self._execute_workflow_parallel(execution, agents)
            else:
                await self._execute_workflow_sequential(execution, agents)
            
            # Workflow completed successfully if we get here and status is still RUNNING
            if execution.status == "RUNNING":
                execution.status = "COMPLETED"
            
        except asyncio.CancelledError:
            # This is a controlled cancellation, possibly for checkpointing
            if execution.status == "PAUSED":
                execution.log("Workflow execution paused for checkpointing")
            else:
                execution.log("Workflow execution cancelled")
                execution.status = "CANCELLED"
            
        except Exception as e:
            execution.log(f"Unexpected error in workflow execution: {str(e)}", "ERROR")
            traceback.print_exc()
            execution.status = "FAILED"
            execution.error = str(e)
        
        finally:
            # Don't set end_time if paused
            if execution.status != "PAUSED":
                execution.end_time = time.time()
            
            await self._save_execution_state(execution)
            
            # Clean up step tasks
            if execution.execution_id in self.step_tasks:
                del self.step_tasks[execution.execution_id]
            
            # Remove checkpoint timer
            if execution.execution_id in self.checkpoint_timers:
                del self.checkpoint_timers[execution.execution_id]
            
            # Record workflow completion in knowledge graph and log activity
            if execution.status in ["COMPLETED", "FAILED", "CANCELLED"]:
                try:
                    await self._record_workflow_completion(execution)
                    
                    # Log workflow completion
                    duration = (execution.end_time or time.time()) - execution.start_time if execution.start_time else 0
                    ActivityLogger.log_workflow_execution_completed(
                        execution_id=execution.execution_id,
                        workflow_id=execution.workflow.workflow_id,
                        name=execution.workflow.name,
                        status=execution.status,
                        duration=duration
                    )
                except Exception as e:
                    logger.error(f"Error recording workflow completion: {e}")
                    ActivityLogger.log_error(
                        component="WorkflowEngine",
                        error_type="CompletionRecordingError",
                        message=f"Error recording workflow completion for {execution.execution_id}",
                        details={
                            "execution_id": execution.execution_id,
                            "workflow_id": execution.workflow.workflow_id,
                            "error": str(e)
                        }
                    )
    
    async def _execute_workflow_sequential(self, execution: WorkflowExecution, agents: Dict[str, SDKAgent]):
        """Execute a workflow sequentially (one step at a time)."""
        # Start with first step if not continuing
        if not execution.current_step and execution.workflow.steps:
            execution.current_step = execution.workflow.steps[0]["step_id"]
        
        # Execute steps until completion
        while execution.current_step:
            # Get current step details
            step = next(
                (s for s in execution.workflow.steps 
                 if s["step_id"] == execution.current_step),
                None
            )
            
            if not step:
                execution.log(
                    f"Step {execution.current_step} not found in workflow",
                    "ERROR"
                )
                execution.status = "FAILED"
                execution.error = f"Step {execution.current_step} not found"
                break
            
            # Get the agent for this step
            agent_id = step["agent_id"]
            if agent_id not in agents:
                execution.log(
                    f"Agent {agent_id} not found for step {execution.current_step}",
                    "ERROR"
                )
                execution.status = "FAILED"
                execution.error = f"Agent {agent_id} not found"
                break
            
            agent = agents[agent_id]
            
            # Prepare input for the agent based on mapping
            agent_input = self._prepare_step_input(execution, step)
            
            # Execute the agent
            execution.log(
                f"Executing step {execution.current_step} with agent {agent_id}"
            )
            
            try:
                result = await agent.execute(agent_input)
                
                # Store the result
                execution.step_results[execution.current_step] = result
                
                # Update context based on output mapping
                self._process_step_output(execution, step, result)
                
                # Determine next step
                next_steps = execution.get_next_steps()
                if next_steps:
                    execution.current_step = next_steps[0]  # For now, take first
                else:
                    execution.current_step = None  # End of workflow
                
            except Exception as e:
                execution.log(
                    f"Error executing step {execution.current_step}: {str(e)}",
                    "ERROR"
                )
                traceback.print_exc()
                
                if execution.workflow.on_error:
                    try:
                        # Call error handler
                        next_step = execution.workflow.on_error(
                            execution.current_step, 
                            e, 
                            execution.context,
                            execution.step_results
                        )
                        execution.current_step = next_step
                    except Exception as err:
                        execution.log(f"Error in error handler: {str(err)}", "ERROR")
                        execution.status = "FAILED"
                        execution.error = str(e)
                        break
                else:
                    execution.status = "FAILED"
                    execution.error = str(e)
                    break
            
            # Save execution state after each step
            await self._save_execution_state(execution)
            
            # Check if auto-checkpoint is due
            await self._check_auto_checkpoint(execution)
    
    async def _execute_workflow_parallel(self, execution: WorkflowExecution, agents: Dict[str, SDKAgent]):
        """Execute a workflow with parallel step execution where possible."""
        execution.log("Starting parallel workflow execution")
        
        # Get parallel execution groups (steps that can be executed in parallel)
        execution_groups = execution.workflow.get_parallel_execution_groups()
        
        # Execute each group in sequence, but steps within a group in parallel
        for group_idx, step_group in enumerate(execution_groups):
            execution.log(f"Executing parallel step group {group_idx + 1} of {len(execution_groups)}")
            
            # Create tasks for all steps in this group
            tasks = {}
            for step_id in step_group:
                # Get step details
                step = next(
                    (s for s in execution.workflow.steps if s["step_id"] == step_id),
                    None
                )
                
                if not step:
                    execution.log(f"Step {step_id} not found in workflow", "ERROR")
                    continue
                
                # Get the agent for this step
                agent_id = step["agent_id"]
                if agent_id not in agents:
                    execution.log(
                        f"Agent {agent_id} not found for step {step_id}", 
                        "ERROR"
                    )
                    continue
                
                # Mark step as running
                execution.mark_step_status(step_id, "RUNNING")
                
                # Create task for this step
                task = asyncio.create_task(
                    self._execute_single_step(execution, step, agents[agent_id])
                )
                tasks[step_id] = task
                
                # Store task for tracking and potential cancellation
                self.step_tasks[execution.execution_id][step_id] = task
            
            # Wait for all tasks in this group to complete
            if tasks:
                # Use asyncio.gather with return_exceptions=True to catch exceptions
                results = await asyncio.gather(*tasks.values(), return_exceptions=True)
                
                # Process results
                for step_id, result in zip(tasks.keys(), results):
                    # If this step failed, check if we should stop the workflow
                    if isinstance(result, Exception):
                        execution.log(f"Step {step_id} failed: {str(result)}", "ERROR")
                        execution.mark_step_status(step_id, "FAILED")
                        
                        # If there's an error handler, call it
                        if execution.workflow.on_error:
                            try:
                                # Call error handler - we might want to continue
                                continue_execution = execution.workflow.on_error(
                                    step_id, 
                                    result, 
                                    execution.context,
                                    execution.step_results
                                )
                                if not continue_execution:
                                    execution.status = "FAILED"
                                    execution.error = str(result)
                                    return  # Exit the parallel execution
                            except Exception as err:
                                execution.log(f"Error in error handler: {str(err)}", "ERROR")
                                execution.status = "FAILED"
                                execution.error = str(result)
                                return  # Exit the parallel execution
                        else:
                            # No error handler, so we fail the workflow
                            execution.status = "FAILED"
                            execution.error = str(result)
                            return  # Exit the parallel execution
            
            # Save execution state after each group
            await self._save_execution_state(execution)
            
            # Check if auto-checkpoint is due
            await self._check_auto_checkpoint(execution)
            
            # If workflow was marked as failed or paused during this group, stop
            if execution.status in ["FAILED", "PAUSED"]:
                break
        
        # Check if all steps completed successfully
        if execution.is_workflow_complete() and execution.status != "FAILED":
            execution.log("All steps completed successfully")
    
    async def _execute_single_step(self, execution: WorkflowExecution, step: Dict, agent: SDKAgent) -> Any:
        """Execute a single workflow step.
        
        Args:
            execution: The workflow execution
            step: The step configuration
            agent: The agent to execute the step
            
        Returns:
            The result of the step execution
            
        Raises:
            Exception: If the step execution fails
        """
        step_id = step["step_id"]
        agent_id = step["agent_id"]
        start_time = time.time()
        
        # Log step execution start
        ActivityLogger.log_step_execution(
            execution_id=execution.execution_id,
            workflow_id=execution.workflow.workflow_id,
            step_id=step_id,
            agent_id=agent_id,
            status="STARTED"
        )
        
        try:
            # Prepare input for the agent
            agent_input = self._prepare_step_input(execution, step)
            
            # Validate step execution if schema validation is enabled
            if self.schema_validation_enabled:
                step_execution_data = {
                    "step_id": step_id,
                    "agent_id": agent_id,
                    "input": agent_input,
                    "timeout": self.step_timeout
                }
                
                errors = self.validate_step_execution(step_execution_data)
                if errors:
                    raise ValueError(f"Step execution validation failed: {errors}")
            
            # Execute the agent with timeout
            result = await asyncio.wait_for(
                agent.execute(agent_input),
                timeout=self.step_timeout
            )
            
            # Store the result
            execution.step_results[step_id] = result
            
            # Update context based on output mapping
            self._process_step_output(execution, step, result)
            
            # Mark step as completed
            execution.mark_step_status(step_id, "COMPLETED")
            
            # Record timing information
            duration = time.time() - start_time
            if "step_times" not in execution.workflow.metadata:
                execution.workflow.metadata["step_times"] = {}
            execution.workflow.metadata["step_times"][f"{step_id}_start"] = start_time
            execution.workflow.metadata["step_times"][f"{step_id}_end"] = time.time()
            execution.workflow.metadata["step_times"][f"{step_id}_duration"] = duration
            
            # Log step completion
            ActivityLogger.log_step_execution(
                execution_id=execution.execution_id,
                workflow_id=execution.workflow.workflow_id,
                step_id=step_id,
                agent_id=agent_id,
                status="COMPLETED",
                duration=duration
            )
            
            return result
            
        except asyncio.TimeoutError:
            execution.log(f"Step {step_id} timed out after {self.step_timeout} seconds", "ERROR")
            execution.mark_step_status(step_id, "FAILED")
            
            # Log step timeout
            ActivityLogger.log_step_execution(
                execution_id=execution.execution_id,
                workflow_id=execution.workflow.workflow_id,
                step_id=step_id,
                agent_id=agent_id,
                status="FAILED",
                duration=time.time() - start_time
            )
            
            ActivityLogger.log_error(
                component="WorkflowEngine",
                error_type="StepTimeoutError",
                message=f"Step {step_id} timed out after {self.step_timeout} seconds",
                details={
                    "execution_id": execution.execution_id,
                    "workflow_id": execution.workflow.workflow_id,
                    "step_id": step_id,
                    "agent_id": agent_id,
                    "timeout": self.step_timeout
                }
            )
            
            raise Exception(f"Step {step_id} timed out")
            
        except Exception as e:
            execution.log(f"Error executing step {step_id}: {str(e)}", "ERROR")
            execution.mark_step_status(step_id, "FAILED")
            
            # Log step failure
            ActivityLogger.log_step_execution(
                execution_id=execution.execution_id,
                workflow_id=execution.workflow.workflow_id,
                step_id=step_id,
                agent_id=agent_id,
                status="FAILED",
                duration=time.time() - start_time
            )
            
            ActivityLogger.log_error(
                component="WorkflowEngine",
                error_type="StepExecutionError",
                message=f"Error executing step {step_id}: {str(e)}",
                details={
                    "execution_id": execution.execution_id,
                    "workflow_id": execution.workflow.workflow_id,
                    "step_id": step_id,
                    "agent_id": agent_id,
                    "error": str(e)
                }
            )
            
            raise
    
    def _prepare_step_input(self, execution: WorkflowExecution, step: Dict) -> Dict:
        """Prepare input for a step based on input mapping.
        
        Args:
            execution: The workflow execution
            step: The step configuration
            
        Returns:
            Dictionary of input values for the agent
        """
        agent_input = {}
        for target, source in step.get("input_mapping", {}).items():
            if source.startswith("context."):
                path = source.split(".", 1)[1]
                value = self._get_nested_value(execution.context, path)
            elif source.startswith("results."):
                parts = source.split(".", 2)
                if len(parts) < 3:
                    value = None
                else:
                    step_id, path = parts[1], parts[2]
                    if step_id in execution.step_results:
                        value = self._get_nested_value(
                            execution.step_results[step_id], 
                            path
                        )
                    else:
                        value = None
            else:
                value = source
            
            if value is not None:
                agent_input[target] = value
        
        return agent_input
    
    def _process_step_output(self, execution: WorkflowExecution, step: Dict, result: Any):
        """Process the output of a step and update the execution context.
        
        Args:
            execution: The workflow execution
            step: The step configuration
            result: The result of the step execution
        """
        for target, source in step.get("output_mapping", {}).items():
            value = self._get_nested_value(result, source)
            if value is not None:
                self._set_nested_value(execution.context, target, value)
    
    def _create_agent(self, agent_id: str, agent_config: Dict) -> SDKAgent:
        """Create an agent instance based on configuration.
        
        This method creates an SDKAgent instance with the correct configuration
        structure, integrating with the prompt manager for context handling.
        
        Args:
            agent_id: Unique identifier for the agent
            agent_config: Configuration for the agent
            
        Returns:
            Configured SDKAgent instance
        """
        # Start with the base configuration
        config = {
            "agent_id": agent_id,
            "agent_type": agent_config.get("type", "default"),
            "agent_name": agent_config.get("name", agent_id),
            "api_key": agent_config.get("api_key") or os.environ.get("OPENAI_API_KEY"),
        }
        
        # Add system prompt through prompt manager if provided as a template
        if "system_prompt_template" in agent_config:
            try:
                template_name = agent_config["system_prompt_template"]
                template_vars = agent_config.get("system_prompt_variables", {})
                config["instructions"] = self.prompt_manager.render_template(
                    template_name, template_vars
                )
            except Exception as e:
                logger.warning(f"Error rendering system prompt template: {e}")
                config["instructions"] = agent_config.get("system_prompt", "")
        else:
            config["instructions"] = agent_config.get("system_prompt", "")
        
        # Configure model
        config["model"] = agent_config.get("model", "gpt-4o")
        
        # Configure tools
        if "tools" in agent_config:
            config["tools"] = agent_config["tools"]
        
        # Add knowledge base context if specified
        if agent_config.get("use_knowledge_graph", False):
            knowledge_context = self.prompt_manager.extract_relevant_context(
                agent_config.get("knowledge_query", "")
            )
            if knowledge_context:
                if not config.get("instructions"):
                    config["instructions"] = ""
                config["instructions"] += f"\n\nKnowledge Context:\n{knowledge_context}"
        
        # Create the agent
        try:
            # Measure agent creation time for metrics
            start_time = time.time()
            
            agent = SDKAgent(config)
            
            # Record metrics
            creation_time = time.time() - start_time
            if "agent_creation" not in self.metrics["api_latency"]:
                self.metrics["api_latency"]["agent_creation"] = []
            self.metrics["api_latency"]["agent_creation"].append(creation_time)
            
            logger.info(f"Created agent {agent_id} of type {config['agent_type']}")
            return agent
            
        except Exception as e:
            logger.error(f"Error creating agent {agent_id}: {e}")
            # Fall back to a minimal agent configuration if there was an error
            fallback_config = {
                "agent_id": agent_id,
                "agent_name": f"fallback-{agent_id}",
                "agent_type": "generic"
            }
            return SDKAgent(fallback_config)
    
    async def _save_execution_state(self, execution: WorkflowExecution):
        """Save the execution state to the database."""
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        try:
            execution_dict = execution.to_dict()
            await db.workflow_executions.update_one(
                {"execution_id": execution.execution_id},
                {"$set": execution_dict},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error saving execution state: {e}")
    
    async def _record_workflow_completion(self, execution: WorkflowExecution):
        """Record workflow completion in the knowledge graph.
        
        This method implements the multi-tier memory architecture by:
        1. Storing execution metadata in Neo4j (long-term memory)
        2. Caching execution results in Redis (short-term memory)
        3. Publishing execution events to the event stream
        4. Storing detailed analytics in MongoDB (medium-term memory)
        
        Args:
            execution: The completed workflow execution
        """
        if execution.status not in ["COMPLETED", "FAILED", "CANCELLED"]:
            return
        
        # Start timing for metrics
        start_time = time.time()
        
        # Get connections for each memory tier
        neo4j_driver = self.conn_manager.get_neo4j_driver()
        redis_client = await self.conn_manager.get_redis_connection()
        mongodb_client = self.conn_manager.get_mongodb_client()
        
        # Calculate execution metrics
        duration = (execution.end_time or time.time()) - execution.start_time if execution.start_time else 0
        
        try:
            # 1. Knowledge Graph (Neo4j) - Long-term memory
            async with neo4j_driver.session() as session:
                # Create workflow execution node with improved semantics
                await session.run("""
                    MERGE (w:Workflow {id: $workflow_id})
                    SET w.name = $workflow_name,
                        w.description = $workflow_description,
                        w.last_executed = $end_time,
                        w.execution_count = COALESCE(w.execution_count, 0) + 1
                    
                    MERGE (e:Execution {id: $execution_id})
                    SET e.status = $status,
                        e.start_time = $start_time,
                        e.end_time = $end_time,
                        e.duration = $duration,
                        e.error = $error,
                        e.context_summary = $context_summary
                    
                    MERGE (e)-[:EXECUTION_OF]->(w)
                    
                    // Connect to any related entities from metadata
                    WITH e
                    UNWIND $related_entities AS entity
                    MATCH (r {id: entity.id})
                    MERGE (e)-[:RELATED_TO {type: entity.type}]->(r)
                """, {
                    "workflow_id": execution.workflow.workflow_id,
                    "workflow_name": execution.workflow.name,
                    "workflow_description": execution.workflow.description,
                    "execution_id": execution.execution_id,
                    "status": execution.status,
                    "start_time": execution.start_time,
                    "end_time": execution.end_time,
                    "duration": duration,
                    "error": str(execution.error) if execution.error else None,
                    "context_summary": json.dumps(execution.context)[:1000] if execution.context else None,
                    "related_entities": execution.workflow.metadata.get("related_entities", [])
                })
                
                # Record step executions with more detailed relationships
                for step_id, result in execution.step_results.items():
                    # Find the step definition
                    step = next(
                        (s for s in execution.workflow.steps if s["step_id"] == step_id),
                        None
                    )
                    
                    if step:
                        agent_id = step["agent_id"]
                        
                        # Process result to extract entities and relationships if available
                        extracted_entities = []
                        try:
                            if isinstance(result, dict) and "entities" in result:
                                extracted_entities = result["entities"]
                        except Exception:
                            pass
                        
                        # Create step execution record with enhanced semantics
                        await session.run("""
                            MATCH (e:Execution {id: $execution_id})
                            
                            MERGE (s:Step {id: $step_id, workflow_id: $workflow_id})
                            ON CREATE SET s.agent_id = $agent_id,
                                          s.name = $step_name,
                                          s.created_at = $current_time
                            
                            MERGE (a:Agent {id: $agent_id})
                            ON CREATE SET a.created_at = $current_time,
                                          a.type = $agent_type
                            
                            MERGE (s)-[:ASSIGNED_TO]->(a)
                            
                            MERGE (se:StepExecution {
                                id: $execution_id + "_" + $step_id
                            })
                            SET se.status = $step_status,
                                se.start_time = $step_start_time,
                                se.end_time = $step_end_time,
                                se.duration = $step_duration,
                                se.result_summary = $result_summary
                                
                            MERGE (se)-[:STEP_OF]->(s)
                            MERGE (se)-[:PART_OF]->(e)
                            
                            // Order steps by their sequence
                            WITH se, e
                            OPTIONAL MATCH (e)-[:CONTAINS_STEP]->(previous_se:StepExecution)
                            WHERE previous_se.sequence = $sequence - 1
                            FOREACH (prev IN CASE WHEN previous_se IS NOT NULL THEN [previous_se] ELSE [] END | 
                                MERGE (prev)-[:NEXT_STEP]->(se)
                            )
                            
                            MERGE (e)-[:CONTAINS_STEP {sequence: $sequence}]->(se)
                            
                            // Connect to any extracted entities
                            WITH se
                            UNWIND $extracted_entities AS entity
                            MERGE (ex:Entity {id: entity.id})
                            ON CREATE SET ex += entity.properties
                            MERGE (se)-[:IDENTIFIED {confidence: entity.confidence}]->(ex)
                        """, {
                            "execution_id": execution.execution_id,
                            "workflow_id": execution.workflow.workflow_id,
                            "step_id": step_id,
                            "step_name": step.get("name", step_id),
                            "agent_id": agent_id,
                            "agent_type": execution.workflow.agents.get(agent_id, {}).get("type", "default"),
                            "current_time": time.time(),
                            "step_status": "COMPLETED",
                            "step_start_time": execution.workflow.metadata.get("step_times", {}).get(f"{step_id}_start"),
                            "step_end_time": execution.workflow.metadata.get("step_times", {}).get(f"{step_id}_end"),
                            "step_duration": execution.workflow.metadata.get("step_times", {}).get(f"{step_id}_duration"),
                            "result_summary": json.dumps(result)[:1000] if result else None,
                            "sequence": execution.workflow.steps.index(step) if step in execution.workflow.steps else 0,
                            "extracted_entities": extracted_entities
                        })

            # 2. Cache recent execution data in Redis (short-term memory)
            execution_data = {
                "id": execution.execution_id,
                "workflow_id": execution.workflow.workflow_id,
                "status": execution.status,
                "duration": duration,
                "completed_at": execution.end_time,
                "step_count": len(execution.step_results)
            }
            
            # Use msgpack and compression for efficient storage
            try:
                serialized = msgpack.packb(execution_data)
                compressed = zlib.compress(serialized)
                
                # Store in Redis with TTL
                await redis_client.set(
                    f"workflow:execution:{execution.execution_id}:summary", 
                    compressed,
                    ex=3600  # 1 hour TTL
                )
                
                # Update recent executions list
                await redis_client.lpush(
                    f"workflow:{execution.workflow.workflow_id}:recent_executions",
                    execution.execution_id
                )
                await redis_client.ltrim(
                    f"workflow:{execution.workflow.workflow_id}:recent_executions",
                    0, 9  # Keep only 10 most recent
                )
            except Exception as e:
                logger.warning(f"Error caching execution data in Redis: {e}")
                
            # 3. Publish to event stream if enabled
            if self.event_stream and execution.status == "COMPLETED":
                try:
                    event_data = {
                        "type": "workflow_completed",
                        "workflow_id": execution.workflow.workflow_id,
                        "execution_id": execution.execution_id,
                        "timestamp": time.time(),
                        "status": execution.status,
                        "duration": duration
                    }
                    
                    # In a real implementation, this would publish to Redis Streams or Kafka
                    logger.info(f"Published workflow completion event: {event_data}")
                except Exception as e:
                    logger.warning(f"Error publishing workflow event: {e}")
                
            # 4. Store detailed analytics in MongoDB (medium-term memory)
            try:
                db = mongodb_client[self.conn_manager.mongodb_config["db_name"]]
                
                # Store execution analytics
                analytics_data = {
                    "execution_id": execution.execution_id,
                    "workflow_id": execution.workflow.workflow_id,
                    "workflow_name": execution.workflow.name,
                    "status": execution.status,
                    "start_time": execution.start_time,
                    "end_time": execution.end_time,
                    "duration": duration,
                    "step_count": len(execution.step_results),
                    "error": str(execution.error) if execution.error else None,
                    "context_size": len(json.dumps(execution.context)) if execution.context else 0,
                    "steps": [
                        {
                            "step_id": step_id,
                            "agent_id": next(
                                (s["agent_id"] for s in execution.workflow.steps if s["step_id"] == step_id),
                                None
                            ),
                            "result_size": len(json.dumps(result)) if result else 0
                        }
                        for step_id, result in execution.step_results.items()
                    ],
                    "created_at": time.time()
                }
                
                await db.workflow_analytics.insert_one(analytics_data)
            except Exception as e:
                logger.warning(f"Error storing workflow analytics: {e}")
                
            # Record metrics for this operation
            self.metrics["db_operations"]["record_workflow_completion"] = time.time() - start_time
            
        except Exception as e:
            logger.error(f"Error recording workflow completion: {e}")
            # Store the error but don't fail the entire operation
            try:
                # Record failure in MongoDB for debugging
                db = mongodb_client[self.conn_manager.mongodb_config["db_name"]]
                await db.workflow_errors.insert_one({
                    "execution_id": execution.execution_id,
                    "workflow_id": execution.workflow.workflow_id,
                    "error": str(e),
                    "traceback": traceback.format_exc(),
                    "timestamp": time.time()
                })
            except Exception as inner_e:
                logger.error(f"Failed to record workflow error: {inner_e}")
    
    async def create_batch_execution(self, 
                                  workflow_id: str,
                                  batch_inputs: List[Dict], 
                                  shared_context: Dict = None,
                                  parallel_execution: bool = True) -> Dict[str, str]:
        """Create multiple workflow executions in a batch.
        
        This implements intelligent batching for high throughput workflow execution.
        
        Args:
            workflow_id: ID of the workflow to execute
            batch_inputs: List of input contexts for each execution
            shared_context: Context shared across all executions
            parallel_execution: Whether to process executions in parallel
            
        Returns:
            Dictionary mapping batch item indices to execution IDs
        """
        # Start timing for metrics
        start_time = time.time()
        batch_size = len(batch_inputs)
        
        if batch_size == 0:
            logger.warning("Empty batch inputs provided for batch execution")
            return {}
        
        # Load workflow definition once (shared across all executions)
        workflow = await self.load_workflow(workflow_id)
        if not workflow:
            logger.error(f"Workflow {workflow_id} not found for batch execution")
            return {}
        
        # Initialize tracking
        execution_ids = {}
        tasks = []
        
        try:
            # Create base shared context
            base_context = shared_context or {}
            
            # Reserve batch ID
            batch_id = str(uuid.uuid4())
            
            # Log batch execution creation
            log_activity("workflow_batch_created", {
                "batch_id": batch_id,
                "workflow_id": workflow_id,
                "batch_size": batch_size,
                "parallel": parallel_execution
            })
            
            # Process all items
            for index, input_context in enumerate(batch_inputs):
                # Merge shared context with input-specific context
                merged_context = {**base_context, **input_context}
                merged_context["batch_metadata"] = {
                    "batch_id": batch_id,
                    "batch_index": index,
                    "batch_size": batch_size
                }
                
                if parallel_execution:
                    # Create execution asynchronously
                    task = asyncio.create_task(
                        self.create_execution(
                            workflow_id=workflow_id,
                            initial_context=merged_context
                        )
                    )
                    tasks.append((index, task))
                else:
                    # Create execution synchronously
                    execution_id = await self.create_execution(
                        workflow_id=workflow_id,
                        initial_context=merged_context
                    )
                    if execution_id:
                        execution_ids[str(index)] = execution_id
            
            # Wait for all parallel executions to be created
            if parallel_execution:
                for index, task in tasks:
                    execution_id = await task
                    if execution_id:
                        execution_ids[str(index)] = execution_id
            
            # Record batch creation in MongoDB for tracking
            mongodb = self.conn_manager.get_mongodb_client()
            db = mongodb[self.conn_manager.mongodb_config["db_name"]]
            
            await db.workflow_batches.insert_one({
                "batch_id": batch_id,
                "workflow_id": workflow_id,
                "execution_ids": execution_ids,
                "batch_size": batch_size,
                "successful_executions": len(execution_ids),
                "created_at": time.time(),
                "status": "PROCESSING"
            })
            
            # Record batch creation in Redis for fast lookup
            redis_client = await self.conn_manager.get_redis_connection()
            for index, execution_id in execution_ids.items():
                await redis_client.set(
                    f"workflow:batch:{batch_id}:execution:{index}",
                    execution_id,
                    ex=86400  # 24 hour TTL
                )
            
            # Record metrics
            batch_creation_time = time.time() - start_time
            if "batch_creation" not in self.metrics["api_latency"]:
                self.metrics["api_latency"]["batch_creation"] = []
            self.metrics["api_latency"]["batch_creation"].append(batch_creation_time)
            
            return execution_ids
            
        except Exception as e:
            logger.error(f"Error creating batch execution: {e}")
            traceback.print_exc()
            
            # Record error metrics
            if "execution_errors" not in self.metrics:
                self.metrics["execution_errors"] = {}
            if "batch_creation" not in self.metrics["execution_errors"]:
                self.metrics["execution_errors"]["batch_creation"] = 0
            self.metrics["execution_errors"]["batch_creation"] += 1
            
            # Return any successful executions
            return execution_ids
    
    async def get_batch_status(self, batch_id: str) -> Dict[str, Any]:
        """Get the status of a batch execution.
        
        Args:
            batch_id: ID of the batch to check
            
        Returns:
            Batch status information
        """
        # Get batch info from MongoDB
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        batch_data = await db.workflow_batches.find_one(
            {"batch_id": batch_id},
            {"_id": 0}  # Exclude MongoDB _id field
        )
        
        if not batch_data:
            return {"error": "Batch not found"}
        
        # Get status of each execution
        execution_statuses = {}
        execution_ids = batch_data.get("execution_ids", {})
        
        # Use batched Redis calls for better performance
        redis_client = await self.conn_manager.get_redis_connection()
        pipeline = redis_client.pipeline()
        
        # Queue all status lookups
        for index, execution_id in execution_ids.items():
            pipeline.get(f"workflow:execution:{execution_id}:summary")
        
        # Execute all lookups at once
        results = await pipeline.execute()
        
        # Process results
        for i, (index, execution_id) in enumerate(execution_ids.items()):
            cached_data = results[i]
            if cached_data:
                try:
                    # Decompress and deserialize
                    decompressed = zlib.decompress(cached_data)
                    execution_data = msgpack.unpackb(decompressed)
                    execution_statuses[index] = {
                        "execution_id": execution_id,
                        "status": execution_data.get("status", "UNKNOWN")
                    }
                    continue
                except Exception:
                    pass
            
            # Fall back to database lookup if cache miss
            execution_data = await self.get_execution(execution_id)
            if execution_data:
                execution_statuses[index] = {
                    "execution_id": execution_id,
                    "status": execution_data.get("status", "UNKNOWN")
                }
            else:
                execution_statuses[index] = {
                    "execution_id": execution_id,
                    "status": "UNKNOWN"
                }
        
        # Calculate summary statistics
        status_counts = {}
        for status_data in execution_statuses.values():
            status = status_data.get("status", "UNKNOWN")
            if status not in status_counts:
                status_counts[status] = 0
            status_counts[status] += 1
        
        # Determine overall batch status
        overall_status = "COMPLETED"
        if "RUNNING" in status_counts or "PENDING" in status_counts:
            overall_status = "PROCESSING"
        elif "FAILED" in status_counts:
            if status_counts.get("FAILED", 0) == len(execution_ids):
                overall_status = "FAILED"
            else:
                overall_status = "PARTIALLY_COMPLETED"
        
        # Update batch status in database if it has changed
        if overall_status != batch_data.get("status"):
            await db.workflow_batches.update_one(
                {"batch_id": batch_id},
                {"$set": {"status": overall_status}}
            )
        
        return {
            "batch_id": batch_id,
            "workflow_id": batch_data.get("workflow_id"),
            "status": overall_status,
            "execution_count": len(execution_ids),
            "created_at": batch_data.get("created_at"),
            "execution_statuses": execution_statuses,
            "status_counts": status_counts
        }
    
    async def checkpoint_workflow(self, execution_id: str, reason: str = "manual checkpoint") -> Optional[str]:
        """Create a checkpoint for a running workflow execution.
        
        This method pauses the workflow execution, saves its state, and returns a checkpoint ID
        that can be used to resume the workflow later.
        
        Args:
            execution_id: ID of the execution to checkpoint
            reason: Optional reason for checkpointing
            
        Returns:
            Checkpoint ID if successful, None otherwise
        """
        # Get the execution
        execution_data = await self.get_execution(execution_id)
        if not execution_data:
            logger.error(f"Execution {execution_id} not found for checkpointing")
            return None
        
        # Check if the execution is in a state that can be checkpointed
        if execution_data["status"] not in ["RUNNING", "PENDING"]:
            logger.error(f"Cannot checkpoint execution {execution_id} with status {execution_data['status']}")
            return None
        
        # Cancel running tasks to pause execution
        await self._cancel_step_tasks(execution_id)
        
        # Update execution state to PAUSED
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        # Generate checkpoint ID
        checkpoint_id = f"checkpoint_{execution_id}_{int(time.time())}"
        
        try:
            # Update execution status
            await db.workflow_executions.update_one(
                {"execution_id": execution_id},
                {"$set": {
                    "status": "PAUSED",
                    "pause_reason": reason,
                    "last_checkpoint_time": time.time(),
                    "checkpoint_count": execution_data.get("checkpoint_count", 0) + 1,
                    "logs": execution_data.get("logs", []) + [{
                        "timestamp": time.time(),
                        "level": "INFO",
                        "message": f"Execution paused for checkpointing: {reason}"
                    }]
                }}
            )
            
            # Create checkpoint record
            checkpoint_data = {
                "checkpoint_id": checkpoint_id,
                "execution_id": execution_id,
                "workflow_id": execution_data["workflow_id"],
                "execution_data": execution_data,
                "created_at": time.time(),
                "reason": reason
            }
            
            await db.workflow_checkpoints.insert_one(checkpoint_data)
            
            # Keep only the most recent N checkpoints per workflow
            if self.max_checkpoint_history > 0:
                # Get all checkpoints for this execution, sorted by creation time
                cursor = db.workflow_checkpoints.find(
                    {"execution_id": execution_id}
                ).sort("created_at", -1).skip(self.max_checkpoint_history)
                
                # Get old checkpoint IDs
                old_checkpoints = []
                async for doc in cursor:
                    old_checkpoints.append(doc["checkpoint_id"])
                
                # Delete old checkpoints
                if old_checkpoints:
                    await db.workflow_checkpoints.delete_many(
                        {"checkpoint_id": {"$in": old_checkpoints}}
                    )
            
            # Invalidate cache
            await self.cache_manager.invalidate_cache(f"execution:{execution_id}")
            
            # Log checkpoint creation
            ActivityLogger.log_workflow_checkpoint(
                checkpoint_id=checkpoint_id,
                execution_id=execution_id,
                workflow_id=execution_data["workflow_id"],
                reason=reason
            )
            
            return checkpoint_id
            
        except Exception as e:
            logger.error(f"Error creating checkpoint for execution {execution_id}: {e}")
            return None
    
    async def resume_workflow(self, checkpoint_id: str) -> Optional[str]:
        """Resume a workflow execution from a checkpoint.
        
        Args:
            checkpoint_id: ID of the checkpoint to resume from
            
        Returns:
            Execution ID if successful, None otherwise
        """
        # Load the checkpoint
        checkpoint = await self._load_checkpoint(checkpoint_id)
        if not checkpoint:
            logger.error(f"Checkpoint {checkpoint_id} not found")
            return None
        
        # Get workflow ID from checkpoint
        workflow_id = checkpoint["workflow_id"]
        
        # Create new execution from checkpoint
        return await self.create_execution(
            workflow_id=workflow_id,
            from_checkpoint_id=checkpoint_id
        )
    
    async def _load_checkpoint(self, checkpoint_id: str) -> Optional[Dict]:
        """Load a checkpoint from storage.
        
        Args:
            checkpoint_id: ID of the checkpoint to load
            
        Returns:
            Checkpoint data if found, None otherwise
        """
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        checkpoint = await db.workflow_checkpoints.find_one(
            {"checkpoint_id": checkpoint_id}
        )
        
        if not checkpoint:
            return None
        
        return checkpoint
    
    async def _create_execution_from_checkpoint(self, checkpoint: Dict, workflow: WorkflowDefinition) -> WorkflowExecution:
        """Create a new workflow execution from a checkpoint.
        
        Args:
            checkpoint: Checkpoint data
            workflow: Workflow definition
            
        Returns:
            New WorkflowExecution instance with state restored from checkpoint
        """
        execution_data = checkpoint["execution_data"]
        
        # Create new execution with same ID
        execution = WorkflowExecution(
            workflow_definition=workflow,
            execution_id=execution_data["execution_id"]
        )
        
        # Restore state from checkpoint
        execution.context = execution_data.get("context", {})
        execution.current_step = execution_data.get("current_step")
        execution.step_results = execution_data.get("step_results", {})
        execution.step_statuses = execution_data.get("step_statuses", {})
        execution.step_dependencies_met = execution_data.get("step_dependencies_met", {})
        execution.start_time = execution_data.get("start_time")
        execution.logs = execution_data.get("logs", [])
        execution.checkpoint_count = execution_data.get("checkpoint_count", 0)
        execution.resume_count = execution_data.get("resume_count", 0)
        execution.last_checkpoint_time = execution_data.get("last_checkpoint_time")
        
        # Set status to RUNNING
        execution.status = "RUNNING"
        
        return execution
    
    async def _check_auto_checkpoint(self, execution: WorkflowExecution):
        """Check if it's time for auto-checkpointing and create a checkpoint if needed.
        
        Args:
            execution: The workflow execution to check
        """
        # Skip if auto-checkpointing is disabled or execution is not in a valid state
        if (self.auto_checkpoint_interval <= 0 or
            execution.execution_id not in self.checkpoint_timers or
            execution.status != "RUNNING"):
            return
        
        # Check if it's time for a checkpoint
        current_time = time.time()
        if current_time >= self.checkpoint_timers[execution.execution_id]:
            # Create checkpoint
            checkpoint_id = await self.checkpoint_workflow(
                execution.execution_id,
                reason="auto checkpoint"
            )
            
            if checkpoint_id:
                execution.log(f"Auto-checkpoint created: {checkpoint_id}")
                
                # Schedule next checkpoint
                self.checkpoint_timers[execution.execution_id] = current_time + self.auto_checkpoint_interval
            else:
                execution.log("Failed to create auto-checkpoint", "WARNING")
    
    async def list_checkpoints(self, 
                              execution_id: str = None,
                              workflow_id: str = None,
                              page: int = 1,
                              page_size: int = 20) -> Dict:
        """List checkpoints with filtering and pagination.
        
        Args:
            execution_id: Optional execution ID to filter by
            workflow_id: Optional workflow ID to filter by
            page: Page number (starting from 1)
            page_size: Number of checkpoints per page
            
        Returns:
            Dictionary with checkpoint list and pagination info
        """
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        # Build filter query
        filter_query = {}
        if execution_id:
            filter_query["execution_id"] = execution_id
        if workflow_id:
            filter_query["workflow_id"] = workflow_id
        
        # Calculate skip for pagination
        skip = (page - 1) * page_size
        
        # Get paginated results with sorting
        cursor = db.workflow_checkpoints.find(
            filter_query,
            {"_id": 0}  # Exclude MongoDB _id field
        ).skip(skip).limit(page_size).sort("created_at", -1)
        
        checkpoints = await cursor.to_list(length=page_size)
        
        # Get total count for pagination
        total_count = await db.workflow_checkpoints.count_documents(filter_query)
        
        return {
            "checkpoints": checkpoints,
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    
    async def get_execution(self, execution_id: str) -> Optional[Dict]:
        """Get the current state of a workflow execution.
        
        Args:
            execution_id: ID of the execution to retrieve
            
        Returns:
            Execution state or None if not found
        """
        # Start timing for metrics
        start_time = time.time()
        
        # Check if this is an active workflow first
        if execution_id in self.active_workflows:
            # For active workflows, always check the database for the most up-to-date state
            pass
        else:
            # Try cache first for non-active workflows
            try:
                cached = await self.cache_manager.get_cache(f"execution:{execution_id}")
                if cached:
                    # Record cache hit in metrics
                    self.metrics["cache_hits"] += 1
                    
                    # Record timing
                    query_time = time.time() - start_time
                    if "execution_query_cached" not in self.metrics["api_latency"]:
                        self.metrics["api_latency"]["execution_query_cached"] = []
                    self.metrics["api_latency"]["execution_query_cached"].append(query_time)
                    
                    return cached
            except Exception as e:
                logger.warning(f"Cache error when getting execution {execution_id}: {e}")
        
        # Cache miss or active workflow, query database
        self.metrics["cache_misses"] += 1
        
        try:
            # Use circuit breaker pattern for database operations
            if self.circuit_breakers["mongodb"]["status"] == "open":
                logger.warning("MongoDB circuit breaker open, skipping database query")
                return None
            
            # Get from database
            mongodb = self.conn_manager.get_mongodb_client()
            db = mongodb[self.conn_manager.mongodb_config["db_name"]]
            
            execution_data = await db.workflow_executions.find_one(
                {"execution_id": execution_id},
                {"_id": 0}  # Exclude MongoDB _id field
            )
            
            if not execution_data:
                return None
            
            # Cache the result with appropriate TTL
            if execution_data.get("status") in ["RUNNING", "PENDING"]:
                # Short TTL for active executions
                await self.cache_manager.set_cache(
                    f"execution:{execution_id}", 
                    execution_data,
                    ttl=60  # 1 minute
                )
            else:
                # Longer TTL for completed executions
                await self.cache_manager.set_cache(
                    f"execution:{execution_id}", 
                    execution_data,
                    ttl=3600  # 1 hour
                )
            
            # Record timing
            query_time = time.time() - start_time
            if "execution_query_db" not in self.metrics["api_latency"]:
                self.metrics["api_latency"]["execution_query_db"] = []
            self.metrics["api_latency"]["execution_query_db"].append(query_time)
            
            # Reset circuit breaker failure count on success
            self.circuit_breakers["mongodb"]["failures"] = 0
            
            return execution_data
            
        except Exception as e:
            # Increment circuit breaker failure count
            self.circuit_breakers["mongodb"]["failures"] += 1
            
            # Open circuit breaker if threshold is reached
            if self.circuit_breakers["mongodb"]["failures"] >= self.circuit_breakers["mongodb"]["threshold"]:
                self.circuit_breakers["mongodb"]["status"] = "open"
                logger.error(f"MongoDB circuit breaker opened after {self.circuit_breakers['mongodb']['failures']} failures")
                
                # Schedule circuit breaker reset after cool-down period
                asyncio.create_task(self._reset_circuit_breaker("mongodb", 60))
            
            logger.error(f"Error getting execution {execution_id}: {e}")
            return None
    
    async def _reset_circuit_breaker(self, service: str, cooldown_seconds: int) -> None:
        """Reset a circuit breaker after the cooldown period.
        
        Args:
            service: Service name to reset
            cooldown_seconds: Cooldown period in seconds
        """
        await asyncio.sleep(cooldown_seconds)
        
        if service in self.circuit_breakers:
            self.circuit_breakers[service]["status"] = "closed"
            self.circuit_breakers[service]["failures"] = 0
            logger.info(f"Reset {service} circuit breaker after cooldown period")
    
    async def cancel_execution(self, execution_id: str, reason: str = "cancelled by user") -> bool:
        """Cancel a running workflow execution.
        
        This method handles graceful cancellation of an entire workflow execution, including
        any running parallel steps.
        
        Args:
            execution_id: ID of the execution to cancel
            reason: Optional reason for cancellation
            
        Returns:
            True if cancellation was successful, False otherwise
        """
        execution_data = await self.get_execution(execution_id)
        if not execution_data:
            return False
        
        if execution_data["status"] not in ["RUNNING", "PENDING"]:
            return False
        
        # Cancel any running step tasks
        await self._cancel_step_tasks(execution_id)
        
        # Update execution status
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        try:
            now = time.time()
            await db.workflow_executions.update_one(
                {"execution_id": execution_id},
                {"$set": {
                    "status": "CANCELLED",
                    "end_time": now,
                    "logs": execution_data.get("logs", []) + [{
                        "timestamp": now,
                        "level": "INFO",
                        "message": f"Execution {reason}"
                    }]
                }}
            )
            
            # Invalidate cache
            await self.cache_manager.invalidate_cache(f"execution:{execution_id}")
            
            # Log cancellation
            log_activity("workflow_execution_cancelled", {
                "execution_id": execution_id,
                "reason": reason,
                "cancelled_at": now
            })
            
            return True
        except Exception as e:
            logger.error(f"Error cancelling execution: {e}")
            return False
    
    async def _cancel_step_tasks(self, execution_id: str) -> None:
        """Cancel all running step tasks for a workflow execution.
        
        This method will attempt to gracefully cancel any running tasks 
        for the specified workflow execution.
        
        Args:
            execution_id: ID of the execution whose steps should be cancelled
        """
        if execution_id not in self.step_tasks:
            return
        
        # Get all running tasks
        step_tasks = self.step_tasks[execution_id]
        
        # Cancel each task
        for step_id, task in step_tasks.items():
            if not task.done():
                # Log the cancellation
                logger.info(f"Cancelling step {step_id} for execution {execution_id}")
                
                # Cancel the task
                task.cancel()
        
        # Wait for all tasks to be cancelled
        pending_tasks = [task for task in step_tasks.values() if not task.done()]
        if pending_tasks:
            try:
                # Wait for tasks to be cancelled, with timeout
                await asyncio.wait(pending_tasks, timeout=5.0)
            except asyncio.CancelledError:
                pass
            
        # Clean up the step tasks
        self.step_tasks[execution_id] = {}
    
    async def list_executions(self, 
                             workflow_id: str = None,
                             status: str = None,
                             page: int = 1,
                             page_size: int = 20,
                             sort_by: str = "start_time",
                             sort_order: int = -1) -> Dict:
        """List workflow executions with filtering and pagination."""
        mongodb = self.conn_manager.get_mongodb_client()
        db = mongodb[self.conn_manager.mongodb_config["db_name"]]
        
        # Build filter query
        filter_query = {}
        if workflow_id:
            filter_query["workflow_id"] = workflow_id
        if status:
            filter_query["status"] = status
        
        # Calculate skip for pagination
        skip = (page - 1) * page_size
        
        # Get paginated results with sorting
        cursor = db.workflow_executions.find(
            filter_query,
            {"_id": 0}  # Exclude MongoDB _id field
        ).skip(skip).limit(page_size).sort(sort_by, sort_order)
        
        executions = await cursor.to_list(length=page_size)
        
        # Get total count for pagination
        total_count = await db.workflow_executions.count_documents(filter_query)
        
        return {
            "executions": executions,
            "page": page,
            "page_size": page_size,
            "total": total_count,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    
    def _get_nested_value(self, obj: Dict, path: str) -> Any:
        """Get a nested value from an object using dot notation."""
        parts = path.split(".")
        current = obj
        
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        
        return current
    
    def _set_nested_value(self, obj: Dict, path: str, value: Any):
        """Set a nested value in an object using dot notation."""
        parts = path.split(".")
        current = obj
        
        # Navigate to the correct nested object
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            current = current[part]
        
        # Set the value
        current[parts[-1]] = value
    
    def register_custom_schema(self, schema_name: str, schema: Dict) -> None:
        """Register a custom schema for validation.
        
        Args:
            schema_name: Name of the schema
            schema: JSON Schema definition
        """
        self.schemas[schema_name] = schema
        
        # Validate the schema itself
        try:
            jsonschema.Draft7Validator.check_schema(schema)
            logger.info(f"Registered custom schema: {schema_name}")
        except Exception as e:
            logger.error(f"Invalid schema {schema_name}: {e}")
            
    def set_schema_validation(self, enabled: bool) -> None:
        """Enable or disable schema validation.
        
        Args:
            enabled: Whether schema validation should be enabled
        """
        self.schema_validation_enabled = enabled
        logger.info(f"Schema validation {'enabled' if enabled else 'disabled'}")
            
    async def shutdown(self):
        """Shutdown the workflow engine and its dependencies."""
        # Cancel all running workflow executions
        active_executions = list(self.active_workflows.keys())
        for execution_id in active_executions:
            try:
                await self.cancel_execution(execution_id, reason="cancelled due to system shutdown")
            except Exception as e:
                logger.error(f"Error cancelling execution {execution_id} during shutdown: {e}")
        
        # Cancel all pending tasks
        for task in self.pending_tasks:
            if not task.done():
                task.cancel()
        
        # Wait for all pending tasks to complete or be cancelled
        if self.pending_tasks:
            try:
                await asyncio.wait(self.pending_tasks, timeout=10.0)
            except Exception as e:
                logger.error(f"Error waiting for pending tasks during shutdown: {e}")
        
        # Close all database connections
        await self.conn_manager.close_all_connections()