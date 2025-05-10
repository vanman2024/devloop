#!/usr/bin/env python3
"""
Agent Orchestration Service

This module implements a unified orchestration service for managing interactions
between agents across different AI providers (Anthropic, OpenAI, Google).
It serves as the coordination layer in our multi-agent architecture.

The orchestration service can operate in both manager and decentralized patterns:
1. Manager Pattern: A central manager agent delegates tasks to specialized agents
2. Decentralized Pattern: Agents can directly handoff tasks to other agents

Features:
- Unified interface for different AI providers (Anthropic, OpenAI, Google)
- Support for both synchronous and asynchronous agent communication
- Configurable routing based on agent capabilities
- Task tracking and execution monitoring
- Conversation state preservation across agents
- Fallback mechanisms for handling agent failures
- Integration with knowledge graph for agent relationship management
"""

import os
import sys
import json
import time
import uuid
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("orchestration_service")

# Add project root to path
PROJECT_ROOT = '/mnt/c/Users/angel/devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Try to import AI service adapters
try:
    # Anthropic adapter
    from agents.utils.ai_service.core import AIService, ContextManager
    ANTHROPIC_AVAILABLE = True
except ImportError:
    logger.warning("Anthropic AI service not available")
    ANTHROPIC_AVAILABLE = False

try:
    # OpenAI adapter
    from agents.sdk.core.agent import SDKAgent
    OPENAI_SDK_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI SDK agent not available")
    OPENAI_SDK_AVAILABLE = False

try:
    # Google A2A adapter (placeholder - replace with actual import when available)
    # from agents.utils.a2a_adapter import A2AClient
    # GOOGLE_A2A_AVAILABLE = True
    GOOGLE_A2A_AVAILABLE = False
    logger.warning("Google A2A adapter not available yet")
except ImportError:
    logger.warning("Google A2A adapter not available")
    GOOGLE_A2A_AVAILABLE = False

# Try to import knowledge graph connector
try:
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    KG_AVAILABLE = True
except ImportError:
    logger.warning("Knowledge graph connector not available")
    KG_AVAILABLE = False

# Try to import knowledge API for enhanced context
try:
    from agents.utils.knowledge_api import knowledge_api
    KNOWLEDGE_API_AVAILABLE = True
    logger.info("Knowledge API is available for enhanced context")
except ImportError:
    logger.warning("Knowledge API not available")
    KNOWLEDGE_API_AVAILABLE = False

# Try to import agent communication service
try:
    from agents.utils.agent_communication import AgentCommunicationService, AgentMessage
    AGENT_COMM_AVAILABLE = True
except ImportError:
    logger.warning("Agent communication service not available")
    AGENT_COMM_AVAILABLE = False


class AgentProvider(Enum):
    """Enumeration of supported AI agent providers"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    UNKNOWN = "unknown"


class AgentType(Enum):
    """Enumeration of agent types in the system"""
    FEATURE_CREATION = "feature_creation"
    TASK = "task"
    RELATIONSHIP = "relationship"
    CHAT = "chat"
    ORCHESTRATOR = "orchestrator"
    KNOWLEDGE_GRAPH = "knowledge_graph"
    CUSTOM = "custom"


class AgentRole(Enum):
    """Enumeration of agent roles in the system"""
    MANAGER = "manager"
    WORKER = "worker"
    PEER = "peer"
    EVALUATOR = "evaluator"


class TaskStatus(Enum):
    """Enumeration of task statuses"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Task:
    """Represents a task in the orchestration system"""
    
    def __init__(
        self,
        task_id: Optional[str] = None,
        description: str = "",
        agent_id: Optional[str] = None,
        input_data: Dict[str, Any] = None,
        parent_task_id: Optional[str] = None,
        priority: int = 1
    ):
        """Initialize a task
        
        Args:
            task_id: Optional task ID (generated if not provided)
            description: Task description
            agent_id: ID of the agent assigned to the task
            input_data: Input data for the task
            parent_task_id: ID of the parent task (if this is a subtask)
            priority: Task priority (1-5, with 5 being highest)
        """
        self.task_id = task_id or f"task_{str(uuid.uuid4())}"
        self.description = description
        self.agent_id = agent_id
        self.input_data = input_data or {}
        self.parent_task_id = parent_task_id
        self.priority = max(1, min(5, priority))  # Ensure priority is between 1-5
        
        # Task tracking
        self.status = TaskStatus.PENDING
        self.created_at = datetime.now().isoformat()
        self.started_at = None
        self.completed_at = None
        self.current_agent_id = agent_id
        self.previous_agents = []
        self.subtasks = []
        self.result = None
        self.error = None
        
        # Execution tracking
        self.execution_history = []
        self.max_retries = 3
        self.retry_count = 0
        self.execution_time = 0
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary
        
        Returns:
            Dictionary representation of the task
        """
        return {
            "task_id": self.task_id,
            "description": self.description,
            "agent_id": self.agent_id,
            "input_data": self.input_data,
            "parent_task_id": self.parent_task_id,
            "priority": self.priority,
            "status": self.status.value,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "current_agent_id": self.current_agent_id,
            "previous_agents": self.previous_agents,
            "subtasks": [subtask.task_id for subtask in self.subtasks],
            "result": self.result,
            "error": self.error,
            "execution_history": self.execution_history,
            "retry_count": self.retry_count,
            "execution_time": self.execution_time
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create a task from dictionary
        
        Args:
            data: Dictionary representation of the task
            
        Returns:
            Task instance
        """
        task = cls(
            task_id=data.get("task_id"),
            description=data.get("description", ""),
            agent_id=data.get("agent_id"),
            input_data=data.get("input_data", {}),
            parent_task_id=data.get("parent_task_id"),
            priority=data.get("priority", 1)
        )
        
        # Set task status
        status_value = data.get("status")
        if status_value:
            task.status = TaskStatus(status_value)
        
        # Set tracking properties
        task.created_at = data.get("created_at", task.created_at)
        task.started_at = data.get("started_at")
        task.completed_at = data.get("completed_at")
        task.current_agent_id = data.get("current_agent_id")
        task.previous_agents = data.get("previous_agents", [])
        task.result = data.get("result")
        task.error = data.get("error")
        task.execution_history = data.get("execution_history", [])
        task.retry_count = data.get("retry_count", 0)
        task.execution_time = data.get("execution_time", 0)
        
        return task
    
    def start(self, agent_id: Optional[str] = None) -> None:
        """Start the task
        
        Args:
            agent_id: ID of the agent starting the task
        """
        if agent_id and agent_id != self.current_agent_id:
            self.previous_agents.append(self.current_agent_id)
            self.current_agent_id = agent_id
        
        self.status = TaskStatus.IN_PROGRESS
        self.started_at = datetime.now().isoformat()
        self.execution_history.append({
            "timestamp": self.started_at,
            "action": "start",
            "agent_id": self.current_agent_id,
            "details": f"Task started by agent {self.current_agent_id}"
        })
    
    def complete(self, result: Any) -> None:
        """Complete the task
        
        Args:
            result: Task result
        """
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now().isoformat()
        self.result = result
        
        # Calculate execution time
        if self.started_at:
            start_time = datetime.fromisoformat(self.started_at)
            end_time = datetime.fromisoformat(self.completed_at)
            self.execution_time = (end_time - start_time).total_seconds()
        
        self.execution_history.append({
            "timestamp": self.completed_at,
            "action": "complete",
            "agent_id": self.current_agent_id,
            "details": f"Task completed by agent {self.current_agent_id}"
        })
    
    def fail(self, error: str) -> None:
        """Mark the task as failed
        
        Args:
            error: Error message
        """
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.now().isoformat()
        self.error = error
        
        # Calculate execution time
        if self.started_at:
            start_time = datetime.fromisoformat(self.started_at)
            end_time = datetime.fromisoformat(self.completed_at)
            self.execution_time = (end_time - start_time).total_seconds()
        
        self.execution_history.append({
            "timestamp": self.completed_at,
            "action": "fail",
            "agent_id": self.current_agent_id,
            "details": f"Task failed: {error}"
        })
    
    def retry(self, agent_id: Optional[str] = None) -> bool:
        """Retry the task
        
        Args:
            agent_id: ID of the agent to retry the task
            
        Returns:
            True if the task can be retried, False otherwise
        """
        if self.retry_count >= self.max_retries:
            return False
        
        self.retry_count += 1
        self.status = TaskStatus.PENDING
        self.started_at = None
        self.completed_at = None
        self.error = None
        
        if agent_id:
            self.previous_agents.append(self.current_agent_id)
            self.current_agent_id = agent_id
        
        self.execution_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": "retry",
            "agent_id": self.current_agent_id,
            "details": f"Task retry #{self.retry_count}"
        })
        
        return True
    
    def reassign(self, agent_id: str) -> None:
        """Reassign the task to another agent
        
        Args:
            agent_id: ID of the agent to reassign the task to
        """
        self.previous_agents.append(self.current_agent_id)
        self.current_agent_id = agent_id
        
        self.execution_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": "reassign",
            "agent_id": agent_id,
            "details": f"Task reassigned to agent {agent_id}"
        })
    
    def add_subtask(self, subtask: 'Task') -> None:
        """Add a subtask
        
        Args:
            subtask: Subtask to add
        """
        subtask.parent_task_id = self.task_id
        self.subtasks.append(subtask)
        
        self.execution_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": "add_subtask",
            "agent_id": self.current_agent_id,
            "details": f"Added subtask {subtask.task_id}"
        })
    
    def log_event(self, action: str, details: str, agent_id: Optional[str] = None) -> None:
        """Log an event in the task execution history
        
        Args:
            action: Event action
            details: Event details
            agent_id: ID of the agent that triggered the event
        """
        self.execution_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "agent_id": agent_id or self.current_agent_id,
            "details": details
        })


class Agent:
    """Represents an agent in the orchestration system"""
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        agent_type: AgentType,
        provider: AgentProvider,
        role: AgentRole = AgentRole.WORKER,
        capabilities: List[str] = None,
        domain: str = "",
        config: Dict[str, Any] = None
    ):
        """Initialize an agent
        
        Args:
            agent_id: Agent ID
            name: Agent name
            agent_type: Agent type
            provider: Agent provider
            role: Agent role
            capabilities: List of agent capabilities
            domain: Agent domain
            config: Agent configuration
        """
        self.agent_id = agent_id
        self.name = name
        self.agent_type = agent_type
        self.provider = provider
        self.role = role
        self.capabilities = capabilities or []
        self.domain = domain
        self.config = config or {}
        
        # Agent state
        self.status = "idle"
        self.current_task_id = None
        self.task_history = []
        self.last_active = None
        self.version = self.config.get("version", "1.0.0")
        self.created_at = datetime.now().isoformat()
        
        # Initialize the underlying agent implementation
        self._agent_impl = None
        self._initialize_agent()
    
    def _initialize_agent(self) -> None:
        """Initialize the underlying agent implementation based on provider"""
        try:
            if self.provider == AgentProvider.ANTHROPIC:
                if ANTHROPIC_AVAILABLE:
                    # Initialize Anthropic AI service
                    self._agent_impl = AIService(
                        api_key=self.config.get("api_key"),
                        model=self.config.get("model", "claude-3-opus-20240229")
                    )
                    # Set system prompt
                    self._agent_impl.set_system_prompt(self.config.get("instructions", ""))
                else:
                    logger.warning(f"Anthropic AI service not available for agent {self.agent_id}")
            
            elif self.provider == AgentProvider.OPENAI:
                if OPENAI_SDK_AVAILABLE:
                    # Initialize OpenAI SDK agent
                    self._agent_impl = SDKAgent(self.config)
                else:
                    logger.warning(f"OpenAI SDK not available for agent {self.agent_id}")
            
            elif self.provider == AgentProvider.GOOGLE:
                if GOOGLE_A2A_AVAILABLE:
                    # Initialize Google A2A client (placeholder)
                    # self._agent_impl = A2AClient(self.config)
                    pass
                else:
                    logger.warning(f"Google A2A adapter not available for agent {self.agent_id}")
        
        except Exception as e:
            logger.error(f"Error initializing agent {self.agent_id}: {e}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to dictionary
        
        Returns:
            Dictionary representation of the agent
        """
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "agent_type": self.agent_type.value,
            "provider": self.provider.value,
            "role": self.role.value,
            "capabilities": self.capabilities,
            "domain": self.domain,
            "status": self.status,
            "current_task_id": self.current_task_id,
            "task_history": self.task_history,
            "last_active": self.last_active,
            "version": self.version,
            "created_at": self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], config: Dict[str, Any] = None) -> 'Agent':
        """Create an agent from dictionary
        
        Args:
            data: Dictionary representation of the agent
            config: Agent configuration
            
        Returns:
            Agent instance
        """
        agent = cls(
            agent_id=data["agent_id"],
            name=data["name"],
            agent_type=AgentType(data["agent_type"]),
            provider=AgentProvider(data["provider"]),
            role=AgentRole(data.get("role", AgentRole.WORKER.value)),
            capabilities=data.get("capabilities", []),
            domain=data.get("domain", ""),
            config=config or {}
        )
        
        # Set agent state
        agent.status = data.get("status", "idle")
        agent.current_task_id = data.get("current_task_id")
        agent.task_history = data.get("task_history", [])
        agent.last_active = data.get("last_active")
        agent.version = data.get("version", "1.0.0")
        agent.created_at = data.get("created_at", agent.created_at)
        
        return agent
    
    def is_available(self) -> bool:
        """Check if the agent is available
        
        Returns:
            True if the agent is available, False otherwise
        """
        return self.status == "idle" and self._agent_impl is not None
    
    def execute(self, task: Task) -> Dict[str, Any]:
        """Execute a task with the agent

        Args:
            task: Task to execute

        Returns:
            Task execution result
        """
        if not self._agent_impl:
            raise ValueError(f"Agent {self.agent_id} implementation not available")

        # Update agent state
        self.status = "busy"
        self.current_task_id = task.task_id
        self.last_active = datetime.now().isoformat()

        # Start the task
        task.start(self.agent_id)

        try:
            # Execute the task based on provider
            if self.provider == AgentProvider.ANTHROPIC:
                # Check if we have knowledge context to enhance the prompt
                knowledge_context = task.input_data.get("knowledge_context", [])
                system_prompt = task.input_data.get("system_prompt", "")

                # Enhance system prompt with knowledge context if available
                if knowledge_context:
                    # Create formatted knowledge context
                    knowledge_text = "Here is relevant knowledge from our knowledge base:\n\n"

                    for i, doc in enumerate(knowledge_context):
                        knowledge_text += f"Document {i+1}: {doc.get('title', 'Untitled')}\n"

                        if doc.get('summary'):
                            knowledge_text += f"Summary: {doc.get('summary')}\n"

                        if doc.get('snippet'):
                            knowledge_text += f"Relevant excerpt: {doc.get('snippet')}\n"

                        knowledge_text += "\n"

                    # Add knowledge context to system prompt
                    if system_prompt:
                        enhanced_system_prompt = f"{system_prompt}\n\n{knowledge_text}"
                    else:
                        enhanced_system_prompt = f"You are a helpful assistant with access to the following knowledge:\n\n{knowledge_text}"

                    # Log that we're using enhanced context
                    logger.info(f"Enhancing task {task.task_id} with knowledge context from {len(knowledge_context)} documents")
                else:
                    enhanced_system_prompt = system_prompt

                # Execute with Anthropic AI service
                response = self._agent_impl.generate_response(
                    prompt=task.input_data.get("prompt"),
                    system_prompt=enhanced_system_prompt,
                    template_content=task.input_data.get("template_content"),
                    template_variables=task.input_data.get("template_variables"),
                    include_context=task.input_data.get("include_context", True),
                    max_tokens=task.input_data.get("max_tokens", 1000),
                    temperature=task.input_data.get("temperature", 0.7)
                )

                # Task completed successfully
                task.complete(response)
                result = {
                    "success": True,
                    "output": response,
                    "task": task.to_dict()
                }

            elif self.provider == AgentProvider.OPENAI:
                # Check if we have knowledge context to enhance the prompt
                knowledge_context = task.input_data.get("knowledge_context", [])
                prompt = task.input_data.get("prompt", "")

                # Enhance prompt with knowledge context if available
                if knowledge_context:
                    # Create formatted knowledge context
                    knowledge_text = "\n\nRelevant knowledge from our knowledge base:\n\n"

                    for i, doc in enumerate(knowledge_context):
                        knowledge_text += f"Document {i+1}: {doc.get('title', 'Untitled')}\n"

                        if doc.get('summary'):
                            knowledge_text += f"Summary: {doc.get('summary')}\n"

                        if doc.get('snippet'):
                            knowledge_text += f"Relevant excerpt: {doc.get('snippet')}\n"

                        knowledge_text += "\n"

                    # Add knowledge context to prompt
                    enhanced_prompt = f"{prompt}\n\n{knowledge_text}\nPlease use this information in your response."

                    # Log that we're using enhanced context
                    logger.info(f"Enhancing task {task.task_id} with knowledge context from {len(knowledge_context)} documents")
                else:
                    enhanced_prompt = prompt

                # Execute with OpenAI SDK agent
                response = self._agent_impl.execute(enhanced_prompt)

                # Task completed successfully
                task.complete(response)
                result = {
                    "success": True,
                    "output": response,
                    "task": task.to_dict()
                }

            elif self.provider == AgentProvider.GOOGLE:
                # Execute with Google A2A (placeholder)
                # response = self._agent_impl.execute_task(task.to_dict())

                # Task completed successfully
                # task.complete(response)
                result = {
                    "success": False,
                    "error": "Google A2A integration not implemented yet",
                    "task": task.to_dict()
                }

            else:
                # Unknown provider
                raise ValueError(f"Unknown agent provider: {self.provider}")

        except Exception as e:
            # Task failed
            task.fail(str(e))
            result = {
                "success": False,
                "error": str(e),
                "task": task.to_dict()
            }

        # Update agent state
        self.status = "idle"
        self.current_task_id = None
        self.task_history.append(task.task_id)

        return result
    
    async def execute_async(self, task: Task) -> Dict[str, Any]:
        """Execute a task asynchronously

        Args:
            task: Task to execute

        Returns:
            Task execution result
        """
        # Create a future to execute the task
        # This will use the same execute method which handles knowledge context integration
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, self.execute, task)
        return result


class OrchestrationService:
    """Orchestration service for agent coordination"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the orchestration service
        
        Args:
            config: Service configuration
        """
        self.config = config or {}
        
        # Initialize agent registry
        self.agents = {}
        
        # Initialize task registry
        self.tasks = {}
        
        # Initialize knowledge graph connector
        self.kg_connector = None
        if KG_AVAILABLE:
            try:
                self.kg_connector = get_knowledge_graph_connector()
                logger.info("Knowledge graph connector initialized")
            except Exception as e:
                logger.error(f"Error initializing knowledge graph connector: {e}")
        
        # Initialize agent communication service
        self.comm_service = None
        if AGENT_COMM_AVAILABLE:
            try:
                self.comm_service = AgentCommunicationService()
                logger.info("Agent communication service initialized")
            except Exception as e:
                logger.error(f"Error initializing agent communication service: {e}")
        
        # Load existing agents if available
        if self.config.get("load_agents", True):
            self._load_agents()
    
    def _load_agents(self) -> None:
        """Load existing agents from configuration"""
        agent_configs = self.config.get("agents", [])
        
        for agent_config in agent_configs:
            try:
                agent_id = agent_config.get("agent_id")
                if not agent_id:
                    continue
                
                # Create agent from configuration
                agent = Agent(
                    agent_id=agent_id,
                    name=agent_config.get("name", f"Agent-{agent_id}"),
                    agent_type=AgentType(agent_config.get("agent_type", AgentType.CUSTOM.value)),
                    provider=AgentProvider(agent_config.get("provider", AgentProvider.UNKNOWN.value)),
                    role=AgentRole(agent_config.get("role", AgentRole.WORKER.value)),
                    capabilities=agent_config.get("capabilities", []),
                    domain=agent_config.get("domain", ""),
                    config=agent_config
                )
                
                # Register agent
                self.agents[agent_id] = agent
                logger.info(f"Loaded agent {agent_id} ({agent.name})")
            
            except Exception as e:
                logger.error(f"Error loading agent from config: {e}")
    
    def register_agent(self, agent: Agent) -> bool:
        """Register an agent with the orchestration service
        
        Args:
            agent: Agent to register
            
        Returns:
            True if the agent was registered successfully, False otherwise
        """
        if agent.agent_id in self.agents:
            logger.warning(f"Agent {agent.agent_id} already registered")
            return False
        
        # Register agent
        self.agents[agent.agent_id] = agent
        logger.info(f"Registered agent {agent.agent_id} ({agent.name})")
        
        # Register agent in knowledge graph
        if self.kg_connector:
            try:
                # Check if agent node exists
                agent_node = self.kg_connector.kg.get_node(agent.agent_id)
                
                if not agent_node:
                    # Create agent node
                    self.kg_connector.kg.add_node(
                        node_id=agent.agent_id,
                        node_type="agent",
                        properties=agent.to_dict()
                    )
                    logger.info(f"Added agent {agent.agent_id} to knowledge graph")
                else:
                    # Update agent node
                    self.kg_connector.kg.update_node(
                        node_id=agent.agent_id,
                        properties=agent.to_dict()
                    )
                    logger.info(f"Updated agent {agent.agent_id} in knowledge graph")
            except Exception as e:
                logger.error(f"Error registering agent in knowledge graph: {e}")
        
        return True
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an agent by ID
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent instance or None if not found
        """
        return self.agents.get(agent_id)
    
    def find_agents(
        self,
        agent_type: Optional[AgentType] = None,
        provider: Optional[AgentProvider] = None,
        role: Optional[AgentRole] = None,
        capabilities: Optional[List[str]] = None,
        domain: Optional[str] = None,
        available_only: bool = False
    ) -> List[Agent]:
        """Find agents matching the specified criteria
        
        Args:
            agent_type: Agent type filter
            provider: Agent provider filter
            role: Agent role filter
            capabilities: Agent capabilities filter
            domain: Agent domain filter
            available_only: Only return available agents
            
        Returns:
            List of matching agents
        """
        matching_agents = []
        
        for agent in self.agents.values():
            # Apply filters
            if agent_type and agent.agent_type != agent_type:
                continue
            
            if provider and agent.provider != provider:
                continue
            
            if role and agent.role != role:
                continue
            
            if capabilities:
                if not all(cap in agent.capabilities for cap in capabilities):
                    continue
            
            if domain and agent.domain != domain:
                continue
            
            if available_only and not agent.is_available():
                continue
            
            matching_agents.append(agent)
        
        return matching_agents
    
    def create_task(
        self,
        description: str,
        agent_id: Optional[str] = None,
        input_data: Dict[str, Any] = None,
        parent_task_id: Optional[str] = None,
        priority: int = 1
    ) -> Task:
        """Create a new task
        
        Args:
            description: Task description
            agent_id: ID of the agent to assign the task to
            input_data: Input data for the task
            parent_task_id: ID of the parent task (if this is a subtask)
            priority: Task priority (1-5, with 5 being highest)
            
        Returns:
            Created task
        """
        # Create task
        task = Task(
            description=description,
            agent_id=agent_id,
            input_data=input_data or {},
            parent_task_id=parent_task_id,
            priority=priority
        )
        
        # Register task
        self.tasks[task.task_id] = task
        
        # Log task creation
        logger.info(f"Created task {task.task_id}: {description}")
        
        # If parent task exists, add this as a subtask
        if parent_task_id and parent_task_id in self.tasks:
            parent_task = self.tasks[parent_task_id]
            parent_task.add_subtask(task)
        
        # Register task in knowledge graph
        if self.kg_connector:
            try:
                # Create task node
                self.kg_connector.kg.add_node(
                    node_id=task.task_id,
                    node_type="task",
                    properties=task.to_dict()
                )
                
                # If parent task exists, add edge from parent to child
                if parent_task_id:
                    self.kg_connector.kg.add_edge(
                        source=parent_task_id,
                        target=task.task_id,
                        edge_type="subtask",
                        properties={}
                    )
                
                # If agent is assigned, add edge from agent to task
                if agent_id:
                    self.kg_connector.kg.add_edge(
                        source=agent_id,
                        target=task.task_id,
                        edge_type="assigned_to",
                        properties={
                            "assigned_at": datetime.now().isoformat()
                        }
                    )
                
                logger.info(f"Added task {task.task_id} to knowledge graph")
            except Exception as e:
                logger.error(f"Error registering task in knowledge graph: {e}")
        
        return task
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID
        
        Args:
            task_id: Task ID
            
        Returns:
            Task instance or None if not found
        """
        return self.tasks.get(task_id)
    
    def find_tasks(
        self,
        agent_id: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        parent_task_id: Optional[str] = None,
        min_priority: Optional[int] = None
    ) -> List[Task]:
        """Find tasks matching the specified criteria
        
        Args:
            agent_id: Agent ID filter
            status: Task status filter
            parent_task_id: Parent task ID filter
            min_priority: Minimum priority filter
            
        Returns:
            List of matching tasks
        """
        matching_tasks = []
        
        for task in self.tasks.values():
            # Apply filters
            if agent_id and task.current_agent_id != agent_id:
                continue
            
            if status and task.status != status:
                continue
            
            if parent_task_id and task.parent_task_id != parent_task_id:
                continue
            
            if min_priority and task.priority < min_priority:
                continue
            
            matching_tasks.append(task)
        
        return matching_tasks
    
    def assign_task(self, task_id: str, agent_id: str) -> bool:
        """Assign a task to an agent
        
        Args:
            task_id: Task ID
            agent_id: Agent ID
            
        Returns:
            True if the task was assigned successfully, False otherwise
        """
        # Get task and agent
        task = self.get_task(task_id)
        agent = self.get_agent(agent_id)
        
        if not task:
            logger.error(f"Task {task_id} not found")
            return False
        
        if not agent:
            logger.error(f"Agent {agent_id} not found")
            return False
        
        # Check if agent is available
        if not agent.is_available():
            logger.warning(f"Agent {agent_id} is not available")
            return False
        
        # Assign task to agent
        task.reassign(agent_id)
        
        # Update knowledge graph
        if self.kg_connector:
            try:
                # Update task assignment in knowledge graph
                self.kg_connector.kg.add_edge(
                    source=agent_id,
                    target=task_id,
                    edge_type="assigned_to",
                    properties={
                        "assigned_at": datetime.now().isoformat()
                    }
                )
                
                logger.info(f"Updated task {task_id} assignment in knowledge graph")
            except Exception as e:
                logger.error(f"Error updating task assignment in knowledge graph: {e}")
        
        return True
    
    def enhance_task_context(self, task: Task) -> Task:
        """Enhance task context with relevant knowledge

        Args:
            task: Task to enhance

        Returns:
            Enhanced task
        """
        # Skip if knowledge API is not available
        if not KNOWLEDGE_API_AVAILABLE:
            return task

        try:
            # Extract relevant keywords from task description
            keywords = task.description.split()
            description_lower = task.description.lower()

            # Try to identify task domain and relevant tags
            tags = []

            # Check for feature creation tasks
            if task.agent_id and "feature" in description_lower:
                tags.append("feature_creation")

            # Check for architecture tasks
            if "architecture" in description_lower or "design" in description_lower:
                tags.append("architecture")

            # Check for integration tasks
            if "integration" in description_lower or "connector" in description_lower:
                tags.append("integration")

            # Check for documentation tasks
            if "documentation" in description_lower or "document" in description_lower:
                tags.append("documentation")

            # Check agent type for additional tags
            if task.agent_id:
                agent = self.get_agent(task.agent_id)
                if agent and agent.agent_type:
                    tags.append(agent.agent_type.value)

            # Search for relevant documents
            context_docs = []
            search_result = knowledge_api.search_documents(
                query=task.description,
                tags=tags if tags else None,
                limit=3
            )

            if "error" not in search_result and search_result.get("count", 0) > 0:
                # Add document snippets to context
                for doc in search_result.get("results", []):
                    # Get document summary
                    summary = knowledge_api.get_document_summary(doc["doc_id"])

                    if "error" not in summary:
                        context_docs.append({
                            "title": doc.get("title", doc["filename"]),
                            "doc_id": doc["doc_id"],
                            "snippet": doc["snippet"],
                            "summary": summary.get("summary", "")[:500]
                        })

            # Add relevant knowledge to task input data
            if context_docs:
                logger.info(f"Adding knowledge context to task {task.task_id} from {len(context_docs)} documents")

                # Create or update knowledge context in task input
                if "knowledge_context" not in task.input_data:
                    task.input_data["knowledge_context"] = context_docs
                else:
                    # Append new context if it's already a list
                    if isinstance(task.input_data["knowledge_context"], list):
                        task.input_data["knowledge_context"].extend(context_docs)
                    else:
                        # Replace with new context
                        task.input_data["knowledge_context"] = context_docs

                # Log the enhancement
                task.log_event(
                    action="enhance_context",
                    details=f"Added knowledge context from {len(context_docs)} documents",
                    agent_id=None
                )

        except Exception as e:
            logger.error(f"Error enhancing task context: {e}")

        return task

    def execute_task(self, task_id: str) -> Dict[str, Any]:
        """Execute a task

        Args:
            task_id: Task ID

        Returns:
            Task execution result
        """
        # Get task
        task = self.get_task(task_id)

        if not task:
            logger.error(f"Task {task_id} not found")
            return {
                "success": False,
                "error": f"Task {task_id} not found"
            }

        # Check if task can be executed
        if task.status != TaskStatus.PENDING:
            logger.warning(f"Task {task_id} is not pending (status: {task.status.value})")
            return {
                "success": False,
                "error": f"Task {task_id} is not pending (status: {task.status.value})"
            }

        # Get assigned agent
        agent = self.get_agent(task.current_agent_id)

        if not agent:
            logger.error(f"Agent {task.current_agent_id} not found")
            return {
                "success": False,
                "error": f"Agent {task.current_agent_id} not found"
            }

        # Enhance task context with knowledge
        if KNOWLEDGE_API_AVAILABLE:
            task = self.enhance_task_context(task)

        # Execute task with agent
        result = agent.execute(task)

        # Update knowledge graph
        if self.kg_connector:
            try:
                # Update task status in knowledge graph
                self.kg_connector.kg.update_node(
                    node_id=task_id,
                    properties=task.to_dict()
                )

                logger.info(f"Updated task {task_id} status in knowledge graph")
            except Exception as e:
                logger.error(f"Error updating task status in knowledge graph: {e}")

        return result
    
    async def execute_task_async(self, task_id: str) -> Dict[str, Any]:
        """Execute a task asynchronously

        Args:
            task_id: Task ID

        Returns:
            Task execution result
        """
        # Get task
        task = self.get_task(task_id)

        if not task:
            logger.error(f"Task {task_id} not found")
            return {
                "success": False,
                "error": f"Task {task_id} not found"
            }

        # Check if task can be executed
        if task.status != TaskStatus.PENDING:
            logger.warning(f"Task {task_id} is not pending (status: {task.status.value})")
            return {
                "success": False,
                "error": f"Task {task_id} is not pending (status: {task.status.value})"
            }

        # Get assigned agent
        agent = self.get_agent(task.current_agent_id)

        if not agent:
            logger.error(f"Agent {task.current_agent_id} not found")
            return {
                "success": False,
                "error": f"Agent {task.current_agent_id} not found"
            }

        # Enhance task context with knowledge
        if KNOWLEDGE_API_AVAILABLE:
            task = self.enhance_task_context(task)

        # Execute task with agent asynchronously
        result = await agent.execute_async(task)

        # Update knowledge graph
        if self.kg_connector:
            try:
                # Update task status in knowledge graph
                self.kg_connector.kg.update_node(
                    node_id=task_id,
                    properties=task.to_dict()
                )

                logger.info(f"Updated task {task_id} status in knowledge graph")
            except Exception as e:
                logger.error(f"Error updating task status in knowledge graph: {e}")

        return result
    
    def execute_workflow(
        self,
        tasks: List[Task],
        sequential: bool = True,
        max_concurrency: int = 5
    ) -> Dict[str, Any]:
        """Execute a workflow of tasks
        
        Args:
            tasks: List of tasks to execute
            sequential: Whether to execute tasks sequentially or in parallel
            max_concurrency: Maximum number of concurrent task executions
            
        Returns:
            Workflow execution result
        """
        workflow_id = f"workflow_{str(uuid.uuid4())}"
        workflow_start = datetime.now().isoformat()
        
        results = {
            "workflow_id": workflow_id,
            "started_at": workflow_start,
            "completed_at": None,
            "success": True,
            "task_results": {},
            "errors": []
        }
        
        if sequential:
            # Execute tasks sequentially
            for task in tasks:
                # Register task if not already registered
                if task.task_id not in self.tasks:
                    self.tasks[task.task_id] = task
                
                # Execute task
                task_result = self.execute_task(task.task_id)
                results["task_results"][task.task_id] = task_result
                
                # Check if task failed
                if not task_result.get("success", False):
                    results["success"] = False
                    results["errors"].append({
                        "task_id": task.task_id,
                        "error": task_result.get("error", "Unknown error")
                    })
                    
                    # Stop workflow if task failed
                    if self.config.get("stop_on_failure", True):
                        logger.warning(f"Workflow {workflow_id} stopped due to task failure")
                        break
        else:
            # Execute tasks in parallel with asyncio
            loop = asyncio.get_event_loop()
            
            async def execute_workflow_async():
                # Register tasks if not already registered
                for task in tasks:
                    if task.task_id not in self.tasks:
                        self.tasks[task.task_id] = task
                
                # Execute tasks in batches
                tasks_to_execute = tasks.copy()
                while tasks_to_execute:
                    # Get batch of tasks
                    batch = tasks_to_execute[:max_concurrency]
                    tasks_to_execute = tasks_to_execute[max_concurrency:]
                    
                    # Execute batch
                    batch_results = await asyncio.gather(
                        *(self.execute_task_async(task.task_id) for task in batch),
                        return_exceptions=True
                    )
                    
                    # Process batch results
                    for task, result in zip(batch, batch_results):
                        if isinstance(result, Exception):
                            # Task execution raised an exception
                            task_result = {
                                "success": False,
                                "error": str(result)
                            }
                            results["success"] = False
                            results["errors"].append({
                                "task_id": task.task_id,
                                "error": str(result)
                            })
                        else:
                            # Normal task result
                            task_result = result
                            
                            # Check if task failed
                            if not task_result.get("success", False):
                                results["success"] = False
                                results["errors"].append({
                                    "task_id": task.task_id,
                                    "error": task_result.get("error", "Unknown error")
                                })
                        
                        # Store task result
                        results["task_results"][task.task_id] = task_result
                    
                    # Stop workflow if any task failed and stop_on_failure is true
                    if not results["success"] and self.config.get("stop_on_failure", True):
                        logger.warning(f"Workflow {workflow_id} stopped due to task failure")
                        break
            
            # Run workflow asynchronously
            loop.run_until_complete(execute_workflow_async())
        
        # Set workflow completion time
        results["completed_at"] = datetime.now().isoformat()
        
        # Calculate execution time
        start_time = datetime.fromisoformat(workflow_start)
        end_time = datetime.fromisoformat(results["completed_at"])
        execution_time = (end_time - start_time).total_seconds()
        
        results["execution_time"] = execution_time
        
        # Register workflow in knowledge graph
        if self.kg_connector:
            try:
                # Create workflow node
                self.kg_connector.kg.add_node(
                    node_id=workflow_id,
                    node_type="workflow",
                    properties={
                        "workflow_id": workflow_id,
                        "started_at": workflow_start,
                        "completed_at": results["completed_at"],
                        "success": results["success"],
                        "execution_time": execution_time,
                        "task_count": len(tasks),
                        "error_count": len(results["errors"])
                    }
                )
                
                # Add edges from workflow to tasks
                for task in tasks:
                    self.kg_connector.kg.add_edge(
                        source=workflow_id,
                        target=task.task_id,
                        edge_type="workflow_task",
                        properties={}
                    )
                
                logger.info(f"Added workflow {workflow_id} to knowledge graph")
            except Exception as e:
                logger.error(f"Error registering workflow in knowledge graph: {e}")
        
        return results
    
    def handle_agent_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a message from an agent
        
        Args:
            message: Agent message
            
        Returns:
            Message handling result
        """
        # Convert message to AgentMessage if agent communication service is available
        if AGENT_COMM_AVAILABLE and self.comm_service:
            agent_message = AgentMessage(
                sender=message.get("sender"),
                action=message.get("action"),
                data=message.get("data", {}),
                timestamp=message.get("timestamp", datetime.now().isoformat())
            )
            
            # Process message with communication service
            try:
                return self.comm_service.process_message(agent_message)
            except Exception as e:
                logger.error(f"Error processing agent message: {e}")
                return {
                    "success": False,
                    "error": f"Error processing agent message: {e}"
                }
        else:
            # Process message directly
            sender = message.get("sender")
            action = message.get("action")
            data = message.get("data", {})
            
            if not sender or not action:
                return {
                    "success": False,
                    "error": "Invalid message: sender and action are required"
                }
            
            if action == "register_agent":
                # Register agent
                agent_config = data.get("agent_config", {})
                if not agent_config:
                    return {
                        "success": False,
                        "error": "Invalid message: agent_config is required for register_agent action"
                    }
                
                try:
                    agent = Agent(
                        agent_id=agent_config.get("agent_id", sender),
                        name=agent_config.get("name", f"Agent-{sender}"),
                        agent_type=AgentType(agent_config.get("agent_type", AgentType.CUSTOM.value)),
                        provider=AgentProvider(agent_config.get("provider", AgentProvider.UNKNOWN.value)),
                        role=AgentRole(agent_config.get("role", AgentRole.WORKER.value)),
                        capabilities=agent_config.get("capabilities", []),
                        domain=agent_config.get("domain", ""),
                        config=agent_config
                    )
                    
                    # Register agent
                    if self.register_agent(agent):
                        return {
                            "success": True,
                            "message": f"Agent {agent.agent_id} registered successfully"
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Failed to register agent {agent.agent_id}"
                        }
                except Exception as e:
                    logger.error(f"Error registering agent from message: {e}")
                    return {
                        "success": False,
                        "error": f"Error registering agent: {e}"
                    }
            
            elif action == "create_task":
                # Create task
                try:
                    task = self.create_task(
                        description=data.get("description", ""),
                        agent_id=data.get("agent_id"),
                        input_data=data.get("input_data", {}),
                        parent_task_id=data.get("parent_task_id"),
                        priority=data.get("priority", 1)
                    )
                    
                    return {
                        "success": True,
                        "task_id": task.task_id,
                        "message": f"Task {task.task_id} created successfully"
                    }
                except Exception as e:
                    logger.error(f"Error creating task from message: {e}")
                    return {
                        "success": False,
                        "error": f"Error creating task: {e}"
                    }
            
            elif action == "execute_task":
                # Execute task
                task_id = data.get("task_id")
                if not task_id:
                    return {
                        "success": False,
                        "error": "Invalid message: task_id is required for execute_task action"
                    }
                
                try:
                    result = self.execute_task(task_id)
                    return result
                except Exception as e:
                    logger.error(f"Error executing task from message: {e}")
                    return {
                        "success": False,
                        "error": f"Error executing task: {e}"
                    }
            
            elif action == "handoff_task":
                # Handoff task to another agent
                task_id = data.get("task_id")
                target_agent_id = data.get("target_agent_id")
                
                if not task_id or not target_agent_id:
                    return {
                        "success": False,
                        "error": "Invalid message: task_id and target_agent_id are required for handoff_task action"
                    }
                
                try:
                    # Assign task to target agent
                    if self.assign_task(task_id, target_agent_id):
                        return {
                            "success": True,
                            "message": f"Task {task_id} handed off to agent {target_agent_id} successfully"
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Failed to hand off task {task_id} to agent {target_agent_id}"
                        }
                except Exception as e:
                    logger.error(f"Error handing off task from message: {e}")
                    return {
                        "success": False,
                        "error": f"Error handing off task: {e}"
                    }
            
            elif action == "get_agent_info":
                # Get agent information
                agent_id = data.get("agent_id")
                if not agent_id:
                    return {
                        "success": False,
                        "error": "Invalid message: agent_id is required for get_agent_info action"
                    }
                
                agent = self.get_agent(agent_id)
                if not agent:
                    return {
                        "success": False,
                        "error": f"Agent {agent_id} not found"
                    }
                
                return {
                    "success": True,
                    "agent": agent.to_dict()
                }
            
            elif action == "get_task_info":
                # Get task information
                task_id = data.get("task_id")
                if not task_id:
                    return {
                        "success": False,
                        "error": "Invalid message: task_id is required for get_task_info action"
                    }
                
                task = self.get_task(task_id)
                if not task:
                    return {
                        "success": False,
                        "error": f"Task {task_id} not found"
                    }
                
                return {
                    "success": True,
                    "task": task.to_dict()
                }
            
            else:
                # Unknown action
                return {
                    "success": False,
                    "error": f"Unknown action: {action}"
                }


# Create singleton instance
_orchestration_service_instance = None

def get_orchestration_service(config: Dict[str, Any] = None) -> OrchestrationService:
    """Get the singleton instance of the orchestration service
    
    Args:
        config: Optional configuration to override defaults
        
    Returns:
        OrchestrationService instance
    """
    global _orchestration_service_instance
    if _orchestration_service_instance is None:
        _orchestration_service_instance = OrchestrationService(config)
    elif config:
        # Update config if provided
        _orchestration_service_instance.config.update(config)
    return _orchestration_service_instance


if __name__ == "__main__":
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description="Agent Orchestration Service")
    parser.add_argument("--config", help="Path to configuration file")
    parser.add_argument("--register-agent", help="Register an agent from a JSON file")
    parser.add_argument("--create-task", help="Create a task from a JSON file")
    parser.add_argument("--execute-task", help="Execute a task by ID")
    
    args = parser.parse_args()
    
    # Load configuration
    config = {}
    if args.config:
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
            logger.info(f"Loaded configuration from {args.config}")
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
    
    # Initialize orchestration service
    orchestration_service = get_orchestration_service(config)
    
    # Process commands
    if args.register_agent:
        try:
            # Load agent configuration
            with open(args.register_agent, 'r') as f:
                agent_config = json.load(f)
            
            # Create agent
            agent = Agent(
                agent_id=agent_config.get("agent_id"),
                name=agent_config.get("name"),
                agent_type=AgentType(agent_config.get("agent_type")),
                provider=AgentProvider(agent_config.get("provider")),
                role=AgentRole(agent_config.get("role", AgentRole.WORKER.value)),
                capabilities=agent_config.get("capabilities", []),
                domain=agent_config.get("domain", ""),
                config=agent_config
            )
            
            # Register agent
            if orchestration_service.register_agent(agent):
                print(f"Agent {agent.agent_id} registered successfully")
            else:
                print(f"Failed to register agent {agent.agent_id}")
        except Exception as e:
            logger.error(f"Error registering agent: {e}")
            print(f"Error registering agent: {e}")
    
    elif args.create_task:
        try:
            # Load task configuration
            with open(args.create_task, 'r') as f:
                task_config = json.load(f)
            
            # Create task
            task = orchestration_service.create_task(
                description=task_config.get("description", ""),
                agent_id=task_config.get("agent_id"),
                input_data=task_config.get("input_data", {}),
                parent_task_id=task_config.get("parent_task_id"),
                priority=task_config.get("priority", 1)
            )
            
            print(f"Task {task.task_id} created successfully")
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            print(f"Error creating task: {e}")
    
    elif args.execute_task:
        try:
            # Execute task
            result = orchestration_service.execute_task(args.execute_task)
            
            if result.get("success", False):
                print(f"Task {args.execute_task} executed successfully")
                print(json.dumps(result, indent=2))
            else:
                print(f"Task {args.execute_task} execution failed")
                print(f"Error: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"Error executing task: {e}")
            print(f"Error executing task: {e}")
    
    else:
        # No command specified, print help
        parser.print_help()