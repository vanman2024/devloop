"""
Inter-Agent Handoff Protocol - Formalized handoff system for agent communication

This module implements a formal handoff protocol for agent-to-agent transfers,
ensuring clear communication, context preservation, and accountability.
"""

import os
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Callable
from enum import Enum
from dataclasses import dataclass, field, asdict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HandoffStatus(str, Enum):
    """Status of agent handoffs"""
    INITIATED = "initiated"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

class HandoffPriority(str, Enum):
    """Priority levels for handoffs"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class HandoffContext:
    """Context information passed during a handoff"""
    document_id: Optional[str] = None
    document_metadata: Dict[str, Any] = field(default_factory=dict)
    reasoning_history: List[Dict[str, Any]] = field(default_factory=list)
    previous_actions: List[Dict[str, Any]] = field(default_factory=list)
    work_completed: Dict[str, Any] = field(default_factory=dict)
    work_remaining: Dict[str, Any] = field(default_factory=dict)
    validation_results: Dict[str, Any] = field(default_factory=dict)
    knowledge_graph_updates: List[Dict[str, Any]] = field(default_factory=list)
    custom_data: Dict[str, Any] = field(default_factory=dict)

@dataclass
class HandoffRequest:
    """A request for handoff from one agent to another"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str = ""
    recipient_id: str = ""
    task: str = ""
    context: HandoffContext = field(default_factory=HandoffContext)
    priority: HandoffPriority = HandoffPriority.MEDIUM
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    expires_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = asdict(self)
        result["priority"] = self.priority.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HandoffRequest':
        """Create from dictionary"""
        if "priority" in data and isinstance(data["priority"], str):
            data["priority"] = HandoffPriority(data["priority"])
        
        if "context" in data and isinstance(data["context"], dict):
            data["context"] = HandoffContext(**data["context"])
            
        return cls(**data)

@dataclass
class HandoffResponse:
    """Response to a handoff request"""
    request_id: str
    status: HandoffStatus
    responder_id: str
    response_time: str = field(default_factory=lambda: datetime.now().isoformat())
    reason: Optional[str] = None
    updated_context: Optional[HandoffContext] = None
    next_steps: Optional[List[str]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = asdict(self)
        result["status"] = self.status.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HandoffResponse':
        """Create from dictionary"""
        if "status" in data and isinstance(data["status"], str):
            data["status"] = HandoffStatus(data["status"])
            
        if "updated_context" in data and isinstance(data["updated_context"], dict):
            data["updated_context"] = HandoffContext(**data["updated_context"])
            
        return cls(**data)

@dataclass
class HandoffCompletion:
    """Completion notification for a handoff"""
    request_id: str
    status: HandoffStatus
    completed_by: str
    completion_time: str = field(default_factory=lambda: datetime.now().isoformat())
    results: Dict[str, Any] = field(default_factory=dict)
    updated_context: Optional[HandoffContext] = None
    follow_up_actions: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = asdict(self)
        result["status"] = self.status.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HandoffCompletion':
        """Create from dictionary"""
        if "status" in data and isinstance(data["status"], str):
            data["status"] = HandoffStatus(data["status"])
            
        if "updated_context" in data and isinstance(data["updated_context"], dict):
            data["updated_context"] = HandoffContext(**data["updated_context"])
            
        return cls(**data)

class HandoffRegistry:
    """
    Registry for tracking and managing agent handoffs.
    
    Provides centralized logging, status tracking, and monitoring of
    all agent-to-agent handoffs in the system.
    """
    
    def __init__(self, storage_path: Optional[str] = None, event_bus = None):
        """
        Initialize the handoff registry.
        
        Args:
            storage_path: Path to store handoff records
            event_bus: Event bus for notifications
        """
        self.storage_path = storage_path
        self.event_bus = event_bus
        
        # Initialize storage
        self.handoffs = {}
        self.agents = {}
        self.metrics = {
            "total_handoffs": 0,
            "successful_handoffs": 0,
            "failed_handoffs": 0,
            "agent_performance": {},
            "average_completion_time": 0
        }
        
        logger.info("Handoff registry initialized")
    
    async def register_handoff(self, request: HandoffRequest) -> str:
        """
        Register a new handoff request.
        
        Args:
            request: Handoff request
            
        Returns:
            Handoff ID
        """
        handoff_id = request.id
        
        # Store handoff
        self.handoffs[handoff_id] = {
            "request": request.to_dict(),
            "response": None,
            "completion": None,
            "status": HandoffStatus.INITIATED.value,
            "history": [
                {
                    "timestamp": datetime.now().isoformat(),
                    "event": "initiated",
                    "agent_id": request.sender_id,
                    "details": f"Handoff initiated from {request.sender_id} to {request.recipient_id}"
                }
            ]
        }
        
        # Update metrics
        self.metrics["total_handoffs"] += 1
        
        # Update agent stats
        if request.sender_id not in self.agents:
            self.agents[request.sender_id] = {"sent": 0, "received": 0, "completed": 0, "failed": 0}
        
        if request.recipient_id not in self.agents:
            self.agents[request.recipient_id] = {"sent": 0, "received": 0, "completed": 0, "failed": 0}
            
        self.agents[request.sender_id]["sent"] += 1
        self.agents[request.recipient_id]["received"] += 1
        
        # Publish event if event bus available
        if self.event_bus:
            await self.event_bus.publish(
                "handoff.initiated",
                {"handoff_id": handoff_id, "request": request.to_dict()}
            )
        
        # Save to storage
        await self._save_handoff(handoff_id)
        
        logger.info(f"Handoff registered: {handoff_id} from {request.sender_id} to {request.recipient_id}")
        return handoff_id
    
    async def update_handoff_status(self, response: HandoffResponse) -> bool:
        """
        Update the status of a handoff based on a response.
        
        Args:
            response: Handoff response
            
        Returns:
            Success status
        """
        handoff_id = response.request_id
        
        # Check if handoff exists
        if handoff_id not in self.handoffs:
            logger.warning(f"Handoff not found: {handoff_id}")
            return False
        
        # Update handoff
        self.handoffs[handoff_id]["response"] = response.to_dict()
        self.handoffs[handoff_id]["status"] = response.status.value
        self.handoffs[handoff_id]["history"].append({
            "timestamp": datetime.now().isoformat(),
            "event": response.status.value,
            "agent_id": response.responder_id,
            "details": response.reason or f"Handoff {response.status.value}"
        })
        
        # Publish event if event bus available
        if self.event_bus:
            await self.event_bus.publish(
                f"handoff.{response.status.value}",
                {"handoff_id": handoff_id, "response": response.to_dict()}
            )
        
        # Save to storage
        await self._save_handoff(handoff_id)
        
        logger.info(f"Handoff status updated: {handoff_id} - {response.status.value}")
        return True
    
    async def complete_handoff(self, completion: HandoffCompletion) -> bool:
        """
        Mark a handoff as completed.
        
        Args:
            completion: Handoff completion
            
        Returns:
            Success status
        """
        handoff_id = completion.request_id
        
        # Check if handoff exists
        if handoff_id not in self.handoffs:
            logger.warning(f"Handoff not found: {handoff_id}")
            return False
        
        # Update handoff
        self.handoffs[handoff_id]["completion"] = completion.to_dict()
        self.handoffs[handoff_id]["status"] = completion.status.value
        self.handoffs[handoff_id]["history"].append({
            "timestamp": datetime.now().isoformat(),
            "event": "completed",
            "agent_id": completion.completed_by,
            "details": f"Handoff completed with status: {completion.status.value}"
        })
        
        # Update metrics
        if completion.status == HandoffStatus.COMPLETED:
            self.metrics["successful_handoffs"] += 1
            
            # Update agent stats
            request = HandoffRequest.from_dict(self.handoffs[handoff_id]["request"])
            self.agents[request.recipient_id]["completed"] += 1
            
            # Calculate completion time
            request_time = datetime.fromisoformat(request.created_at)
            completion_time = datetime.fromisoformat(completion.completion_time)
            elapsed_time = (completion_time - request_time).total_seconds()
            
            # Update average completion time
            current_avg = self.metrics["average_completion_time"]
            total_successful = self.metrics["successful_handoffs"]
            
            self.metrics["average_completion_time"] = (
                (current_avg * (total_successful - 1) + elapsed_time) / total_successful
            )
        else:
            self.metrics["failed_handoffs"] += 1
            
            # Update agent stats
            request = HandoffRequest.from_dict(self.handoffs[handoff_id]["request"])
            self.agents[request.recipient_id]["failed"] += 1
        
        # Publish event if event bus available
        if self.event_bus:
            await self.event_bus.publish(
                "handoff.completed",
                {"handoff_id": handoff_id, "completion": completion.to_dict()}
            )
        
        # Save to storage
        await self._save_handoff(handoff_id)
        
        logger.info(f"Handoff completed: {handoff_id} by {completion.completed_by} with status {completion.status.value}")
        return True
    
    async def get_handoff(self, handoff_id: str) -> Optional[Dict[str, Any]]:
        """
        Get handoff details.
        
        Args:
            handoff_id: Handoff ID
            
        Returns:
            Handoff details
        """
        if handoff_id in self.handoffs:
            return self.handoffs[handoff_id]
        
        # Try to load from storage
        if self.storage_path:
            handoff_path = os.path.join(self.storage_path, f"{handoff_id}.json")
            if os.path.exists(handoff_path):
                try:
                    with open(handoff_path, 'r') as f:
                        handoff = json.load(f)
                        
                    # Cache for future access
                    self.handoffs[handoff_id] = handoff
                    
                    return handoff
                except Exception as e:
                    logger.error(f"Error loading handoff from storage: {e}")
        
        return None
    
    def get_agent_handoffs(self, agent_id: str, role: str = "any", status: Optional[str] = None, 
                       limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get handoffs for a specific agent.
        
        Args:
            agent_id: Agent ID
            role: Role filter (sender, recipient, any)
            status: Status filter
            limit: Maximum number of handoffs to return
            
        Returns:
            List of handoffs
        """
        matching_handoffs = []
        
        for handoff_id, handoff in self.handoffs.items():
            request = HandoffRequest.from_dict(handoff["request"])
            
            # Filter by role
            if role == "sender" and request.sender_id != agent_id:
                continue
            
            if role == "recipient" and request.recipient_id != agent_id:
                continue
            
            if role == "any" and request.sender_id != agent_id and request.recipient_id != agent_id:
                continue
            
            # Filter by status
            if status and handoff["status"] != status:
                continue
            
            matching_handoffs.append({
                "id": handoff_id,
                "status": handoff["status"],
                "sender": request.sender_id,
                "recipient": request.recipient_id,
                "task": request.task,
                "created_at": request.created_at
            })
            
            if len(matching_handoffs) >= limit:
                break
        
        return matching_handoffs
    
    def get_agent_performance(self, agent_id: str) -> Dict[str, Any]:
        """
        Get performance metrics for an agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Performance metrics
        """
        if agent_id not in self.agents:
            return {
                "sent": 0,
                "received": 0,
                "completed": 0,
                "failed": 0,
                "success_rate": 0,
                "handoff_volume": 0
            }
        
        stats = self.agents[agent_id]
        
        # Calculate success rate
        received = stats["received"]
        completed = stats["completed"]
        success_rate = completed / received if received > 0 else 0
        
        # Calculate handoff volume (sent + received)
        handoff_volume = stats["sent"] + stats["received"]
        
        return {
            **stats,
            "success_rate": success_rate,
            "handoff_volume": handoff_volume
        }
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """
        Get system-wide handoff metrics.
        
        Returns:
            System metrics
        """
        # Calculate overall success rate
        total = self.metrics["total_handoffs"]
        successful = self.metrics["successful_handoffs"]
        success_rate = successful / total if total > 0 else 0
        
        # Get top agents by volume
        agent_volume = [(agent_id, stats["sent"] + stats["received"]) 
                       for agent_id, stats in self.agents.items()]
        
        top_agents = sorted(agent_volume, key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_handoffs": total,
            "successful_handoffs": successful,
            "failed_handoffs": self.metrics["failed_handoffs"],
            "success_rate": success_rate,
            "average_completion_time": self.metrics["average_completion_time"],
            "top_agents": [{"agent_id": a[0], "volume": a[1]} for a in top_agents]
        }
    
    async def _save_handoff(self, handoff_id: str) -> bool:
        """
        Save handoff to storage.
        
        Args:
            handoff_id: Handoff ID
            
        Returns:
            Success status
        """
        if not self.storage_path:
            return False
        
        try:
            os.makedirs(self.storage_path, exist_ok=True)
            handoff_path = os.path.join(self.storage_path, f"{handoff_id}.json")
            
            with open(handoff_path, 'w') as f:
                json.dump(self.handoffs[handoff_id], f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Error saving handoff to storage: {e}")
            return False
    
    async def load_handoffs(self) -> bool:
        """
        Load handoffs from storage.
        
        Returns:
            Success status
        """
        if not self.storage_path or not os.path.exists(self.storage_path):
            return False
        
        try:
            # Load handoffs
            for filename in os.listdir(self.storage_path):
                if filename.endswith(".json"):
                    handoff_path = os.path.join(self.storage_path, filename)
                    handoff_id = filename.replace(".json", "")
                    
                    with open(handoff_path, 'r') as f:
                        self.handoffs[handoff_id] = json.load(f)
            
            # Rebuild metrics
            self._rebuild_metrics()
            
            logger.info(f"Loaded {len(self.handoffs)} handoffs from storage")
            return True
        except Exception as e:
            logger.error(f"Error loading handoffs from storage: {e}")
            return False
    
    def _rebuild_metrics(self):
        """Rebuild metrics from loaded handoffs"""
        self.metrics = {
            "total_handoffs": len(self.handoffs),
            "successful_handoffs": 0,
            "failed_handoffs": 0,
            "agent_performance": {},
            "average_completion_time": 0
        }
        
        self.agents = {}
        
        # Process each handoff
        for handoff_id, handoff in self.handoffs.items():
            request = HandoffRequest.from_dict(handoff["request"])
            
            # Update agent stats
            sender_id = request.sender_id
            recipient_id = request.recipient_id
            
            if sender_id not in self.agents:
                self.agents[sender_id] = {"sent": 0, "received": 0, "completed": 0, "failed": 0}
            
            if recipient_id not in self.agents:
                self.agents[recipient_id] = {"sent": 0, "received": 0, "completed": 0, "failed": 0}
                
            self.agents[sender_id]["sent"] += 1
            self.agents[recipient_id]["received"] += 1
            
            # Process based on status
            status = handoff["status"]
            
            if status == HandoffStatus.COMPLETED.value:
                self.metrics["successful_handoffs"] += 1
                self.agents[recipient_id]["completed"] += 1
                
                # Calculate completion time if possible
                if "completion" in handoff and handoff["completion"]:
                    completion = HandoffCompletion.from_dict(handoff["completion"])
                    request_time = datetime.fromisoformat(request.created_at)
                    completion_time = datetime.fromisoformat(completion.completion_time)
                    elapsed_time = (completion_time - request_time).total_seconds()
                    
                    # Accumulate for average calculation
                    self.metrics["average_completion_time"] += elapsed_time
            
            elif status in [HandoffStatus.FAILED.value, HandoffStatus.TIMEOUT.value, HandoffStatus.CANCELLED.value]:
                self.metrics["failed_handoffs"] += 1
                self.agents[recipient_id]["failed"] += 1
        
        # Calculate average completion time
        if self.metrics["successful_handoffs"] > 0:
            self.metrics["average_completion_time"] /= self.metrics["successful_handoffs"]

class HandoffManager:
    """
    Manager for handling agent handoffs.
    
    Provides high-level handoff functionality including request initiation,
    acceptance, rejection, and completion tracking.
    """
    
    def __init__(self, agent_id: str, registry: HandoffRegistry, message_bus = None):
        """
        Initialize the handoff manager.
        
        Args:
            agent_id: ID of the agent using this manager
            registry: Handoff registry
            message_bus: Message bus for communication
        """
        self.agent_id = agent_id
        self.registry = registry
        self.message_bus = message_bus
        self.callbacks = {}
        
        logger.info(f"Handoff manager initialized for agent {agent_id}")
    
    async def initiate_handoff(self, recipient_id: str, task: str, context: Union[Dict[str, Any], HandoffContext], 
                          priority: Union[str, HandoffPriority] = HandoffPriority.MEDIUM,
                          expires_in: Optional[int] = None) -> str:
        """
        Initiate a handoff to another agent.
        
        Args:
            recipient_id: ID of the recipient agent
            task: Task description
            context: Handoff context
            priority: Handoff priority
            expires_in: Expiration time in seconds
            
        Returns:
            Handoff ID
        """
        # Convert context if needed
        if isinstance(context, dict):
            context = HandoffContext(**context)
        
        # Convert priority if needed
        if isinstance(priority, str):
            priority = HandoffPriority(priority)
        
        # Calculate expiration time if provided
        expires_at = None
        if expires_in is not None:
            expires_at = (datetime.now() + datetime.timedelta(seconds=expires_in)).isoformat()
        
        # Create handoff request
        request = HandoffRequest(
            sender_id=self.agent_id,
            recipient_id=recipient_id,
            task=task,
            context=context,
            priority=priority,
            expires_at=expires_at
        )
        
        # Register handoff
        handoff_id = await self.registry.register_handoff(request)
        
        # Publish to message bus if available
        if self.message_bus:
            await self.message_bus.publish(
                f"agent.{recipient_id}.handoff",
                {"type": "handoff_request", "request": request.to_dict()}
            )
        
        logger.info(f"Initiated handoff {handoff_id} to {recipient_id}")
        return handoff_id
    
    async def accept_handoff(self, request_id: str) -> bool:
        """
        Accept a handoff request.
        
        Args:
            request_id: Handoff request ID
            
        Returns:
            Success status
        """
        # Create handoff response
        response = HandoffResponse(
            request_id=request_id,
            status=HandoffStatus.ACCEPTED,
            responder_id=self.agent_id,
            reason="Handoff accepted"
        )
        
        # Update handoff status
        success = await self.registry.update_handoff_status(response)
        
        # Get handoff details
        handoff = await self.registry.get_handoff(request_id)
        if handoff and success:
            request = HandoffRequest.from_dict(handoff["request"])
            
            # Publish to message bus if available
            if self.message_bus:
                await self.message_bus.publish(
                    f"agent.{request.sender_id}.handoff",
                    {"type": "handoff_accepted", "response": response.to_dict()}
                )
        
        logger.info(f"Accepted handoff {request_id}")
        return success
    
    async def reject_handoff(self, request_id: str, reason: str) -> bool:
        """
        Reject a handoff request.
        
        Args:
            request_id: Handoff request ID
            reason: Rejection reason
            
        Returns:
            Success status
        """
        # Create handoff response
        response = HandoffResponse(
            request_id=request_id,
            status=HandoffStatus.REJECTED,
            responder_id=self.agent_id,
            reason=reason
        )
        
        # Update handoff status
        success = await self.registry.update_handoff_status(response)
        
        # Get handoff details
        handoff = await self.registry.get_handoff(request_id)
        if handoff and success:
            request = HandoffRequest.from_dict(handoff["request"])
            
            # Publish to message bus if available
            if self.message_bus:
                await self.message_bus.publish(
                    f"agent.{request.sender_id}.handoff",
                    {"type": "handoff_rejected", "response": response.to_dict()}
                )
        
        logger.info(f"Rejected handoff {request_id}: {reason}")
        return success
    
    async def complete_handoff(self, request_id: str, results: Dict[str, Any], 
                          updated_context: Optional[Union[Dict[str, Any], HandoffContext]] = None,
                          status: HandoffStatus = HandoffStatus.COMPLETED) -> bool:
        """
        Complete a handoff.
        
        Args:
            request_id: Handoff request ID
            results: Handoff results
            updated_context: Updated context information
            status: Completion status
            
        Returns:
            Success status
        """
        # Convert context if needed
        if isinstance(updated_context, dict):
            updated_context = HandoffContext(**updated_context)
        
        # Create handoff completion
        completion = HandoffCompletion(
            request_id=request_id,
            status=status,
            completed_by=self.agent_id,
            results=results,
            updated_context=updated_context
        )
        
        # Complete handoff
        success = await self.registry.complete_handoff(completion)
        
        # Get handoff details
        handoff = await self.registry.get_handoff(request_id)
        if handoff and success:
            request = HandoffRequest.from_dict(handoff["request"])
            
            # Publish to message bus if available
            if self.message_bus:
                await self.message_bus.publish(
                    f"agent.{request.sender_id}.handoff",
                    {"type": "handoff_completed", "completion": completion.to_dict()}
                )
        
        logger.info(f"Completed handoff {request_id} with status {status.value}")
        return success
    
    async def register_callback(self, event_type: str, callback: Callable) -> bool:
        """
        Register a callback for handoff events.
        
        Args:
            event_type: Event type (request, accepted, rejected, completed)
            callback: Callback function
            
        Returns:
            Success status
        """
        if not self.message_bus:
            logger.warning("Cannot register callback: No message bus available")
            return False
        
        # Map event type to message bus topic
        topic = f"agent.{self.agent_id}.handoff"
        
        # Store callback
        if event_type not in self.callbacks:
            self.callbacks[event_type] = []
        
        self.callbacks[event_type].append(callback)
        
        # Subscribe to message bus
        await self.message_bus.subscribe(topic, self._handle_message)
        
        logger.info(f"Registered callback for {event_type} events")
        return True
    
    async def _handle_message(self, message):
        """Handle incoming messages from the message bus"""
        # Check if this is a handoff message
        if hasattr(message, "content") and isinstance(message.content, dict) and "type" in message.content:
            event_type = message.content["type"]
            
            # Check if we have callbacks for this event type
            if event_type in self.callbacks:
                for callback in self.callbacks[event_type]:
                    try:
                        if event_type == "handoff_request":
                            request = HandoffRequest.from_dict(message.content["request"])
                            await callback(request)
                        elif event_type in ["handoff_accepted", "handoff_rejected"]:
                            response = HandoffResponse.from_dict(message.content["response"])
                            await callback(response)
                        elif event_type == "handoff_completed":
                            completion = HandoffCompletion.from_dict(message.content["completion"])
                            await callback(completion)
                    except Exception as e:
                        logger.error(f"Error in handoff callback: {e}")

# Singleton registry instance
_registry_instance = None

def get_handoff_registry(storage_path: Optional[str] = None, event_bus = None) -> HandoffRegistry:
    """
    Get singleton instance of HandoffRegistry.
    
    Args:
        storage_path: Optional storage path
        event_bus: Optional event bus
        
    Returns:
        HandoffRegistry instance
    """
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = HandoffRegistry(storage_path, event_bus)
    return _registry_instance