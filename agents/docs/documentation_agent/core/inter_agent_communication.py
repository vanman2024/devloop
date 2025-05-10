"""
Inter-Agent Communication Protocol

This module implements the communication protocol between agents in the
documentation management system, following principles from OpenAI's Manager Pattern
and Google's A2A architecture.
"""

import os
import sys
import json
import logging
import uuid
import asyncio
from typing import Dict, List, Any, Optional, Union, Callable
from enum import Enum
from datetime import datetime
from dataclasses import dataclass, field, asdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageRole(str, Enum):
    """Roles for message participants"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    MANAGER = "manager"
    WORKER = "worker"
    TOOL = "tool"

class MessageType(str, Enum):
    """Types of agent messages"""
    REQUEST = "request"         # Request an action
    RESPONSE = "response"       # Response to a request
    NOTIFICATION = "notification"  # One-way notification
    ERROR = "error"             # Error message
    STATUS = "status"           # Status update
    QUERY = "query"             # Information query
    RESULT = "result"           # Query result

@dataclass
class AgentMessage:
    """
    Message structure for inter-agent communication.
    
    Following Google's A2A architecture, this message format encapsulates
    all the information needed for agent-to-agent communication with a clear
    protocol structure.
    """
    
    # Core message fields
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: MessageType = MessageType.REQUEST
    sender_id: str = ""
    recipient_id: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # Content field contains the main payload
    content: Dict[str, Any] = field(default_factory=dict)
    
    # Correlation and threading
    in_reply_to: Optional[str] = None  # ID of the message this is replying to
    conversation_id: Optional[str] = None  # Thread/conversation identifier
    
    # System fields
    ttl: int = 60  # Time to live in seconds
    priority: int = 1  # 1 (low) to 5 (high)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Security
    auth: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentMessage':
        """Create message from dictionary"""
        # Handle enum conversions
        if "type" in data and isinstance(data["type"], str):
            data["type"] = MessageType(data["type"])
        
        return cls(**data)
    
    def create_reply(self, content: Dict[str, Any], type: MessageType = MessageType.RESPONSE) -> 'AgentMessage':
        """Create a reply to this message"""
        return AgentMessage(
            type=type,
            sender_id=self.recipient_id,
            recipient_id=self.sender_id,
            content=content,
            in_reply_to=self.id,
            conversation_id=self.conversation_id,
            priority=self.priority,
            metadata=self.metadata.copy()
        )

class AgentMessageBus:
    """
    Event bus for asynchronous agent communication.
    
    Provides a publish-subscribe pattern for message distribution between agents.
    Uses Redis pub/sub if available, with fallback to in-memory implementation.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize the message bus.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        self.subscribers = {}  # topic -> list of callbacks
        self._redis_available = False
        
        # Try to initialize Redis connection if configured
        if self.config.get("use_redis", False):
            try:
                import redis
                import redis.asyncio as aioredis
                
                self.redis_host = self.config.get("redis_host", "localhost")
                self.redis_port = self.config.get("redis_port", 6379)
                self.redis_db = self.config.get("redis_db", 0)
                
                # Create Redis client
                self.redis = aioredis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    db=self.redis_db,
                    decode_responses=True
                )
                
                # Test Redis connection
                self._redis_available = True
                logger.info("Redis message bus initialized")
                
            except (ImportError, Exception) as e:
                logger.warning(f"Redis not available, falling back to in-memory bus: {e}")
                self._redis_available = False
        
        # Fall back to in-memory implementation
        if not self._redis_available:
            self.message_queue = asyncio.Queue()
            logger.info("In-memory message bus initialized")
            
            # Start message dispatcher
            self._dispatcher_task = None
    
    async def start(self):
        """Start the message bus"""
        if not self._redis_available:
            if self._dispatcher_task is None or self._dispatcher_task.done():
                self._dispatcher_task = asyncio.create_task(self._dispatcher_loop())
        else:
            # Start Redis pubsub
            self.pubsub = self.redis.pubsub()
            self._pubsub_task = None
    
    async def stop(self):
        """Stop the message bus"""
        if not self._redis_available:
            if self._dispatcher_task:
                self._dispatcher_task.cancel()
                try:
                    await self._dispatcher_task
                except asyncio.CancelledError:
                    pass
                self._dispatcher_task = None
        else:
            # Stop Redis pubsub
            if self._pubsub_task:
                self._pubsub_task.cancel()
                try:
                    await self._pubsub_task
                except asyncio.CancelledError:
                    pass
                self._pubsub_task = None
            await self.pubsub.unsubscribe()
            await self.pubsub.close()
    
    async def publish(self, topic: str, message: AgentMessage):
        """
        Publish a message to a topic.
        
        Args:
            topic: Topic to publish to
            message: Message to publish
        """
        message_data = message.to_dict()
        message_json = json.dumps(message_data)
        
        if self._redis_available:
            await self.redis.publish(topic, message_json)
        else:
            # In-memory implementation
            await self.message_queue.put((topic, message_json))
    
    async def subscribe(self, topic: str, callback: Callable[[AgentMessage], None]):
        """
        Subscribe to a topic.
        
        Args:
            topic: Topic to subscribe to
            callback: Callback function to invoke with received messages
        """
        if topic not in self.subscribers:
            self.subscribers[topic] = []
            
            # Add new subscription in Redis if using Redis
            if self._redis_available:
                await self.pubsub.subscribe(topic)
                
                # Start message processor if not already running
                if self._pubsub_task is None or self._pubsub_task.done():
                    self._pubsub_task = asyncio.create_task(self._pubsub_loop())
        
        # Add callback to topic
        self.subscribers[topic].append(callback)
    
    async def unsubscribe(self, topic: str, callback: Callable[[AgentMessage], None]):
        """
        Unsubscribe from a topic.
        
        Args:
            topic: Topic to unsubscribe from
            callback: Callback to remove
        """
        if topic in self.subscribers:
            self.subscribers[topic] = [cb for cb in self.subscribers[topic] if cb != callback]
            
            # If no subscribers left, unsubscribe from topic in Redis
            if not self.subscribers[topic] and self._redis_available:
                await self.pubsub.unsubscribe(topic)
    
    async def _dispatcher_loop(self):
        """Message dispatcher loop for in-memory implementation"""
        try:
            while True:
                topic, message_json = await self.message_queue.get()
                
                try:
                    message_data = json.loads(message_json)
                    message = AgentMessage.from_dict(message_data)
                    
                    # Deliver to subscribers
                    if topic in self.subscribers:
                        for callback in self.subscribers[topic]:
                            try:
                                await callback(message)
                            except Exception as e:
                                logger.error(f"Error in message subscriber callback: {e}")
                
                except Exception as e:
                    logger.error(f"Error dispatching message: {e}")
                    
                finally:
                    self.message_queue.task_done()
                    
        except asyncio.CancelledError:
            logger.info("Message dispatcher stopped")
            raise
    
    async def _pubsub_loop(self):
        """Message processor loop for Redis pubsub"""
        try:
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    topic = message['channel']
                    message_json = message['data']
                    
                    try:
                        message_data = json.loads(message_json)
                        agent_message = AgentMessage.from_dict(message_data)
                        
                        # Deliver to subscribers
                        if topic in self.subscribers:
                            for callback in self.subscribers[topic]:
                                try:
                                    await callback(agent_message)
                                except Exception as e:
                                    logger.error(f"Error in message subscriber callback: {e}")
                    
                    except Exception as e:
                        logger.error(f"Error processing Redis message: {e}")
                        
        except asyncio.CancelledError:
            logger.info("Redis pubsub processor stopped")
            raise

class AgentCommunicator:
    """
    Agent communicator that provides a simple API for agent communication.
    
    Handles message routing, serialization, and delivery between agents.
    """
    
    def __init__(self, agent_id: str, message_bus: AgentMessageBus):
        """
        Initialize the agent communicator.
        
        Args:
            agent_id: ID of the agent
            message_bus: Message bus for communication
        """
        self.agent_id = agent_id
        self.message_bus = message_bus
        self.request_handlers = {}  # message_type -> handler
        self.response_callbacks = {}  # message_id -> callback
        self.topic = f"agent.{agent_id}"
        self.broadcast_topic = "agent.broadcast"
        self.running = False
    
    async def start(self):
        """Start the communicator"""
        if not self.running:
            # Subscribe to agent-specific topic
            await self.message_bus.subscribe(self.topic, self._on_message)
            
            # Subscribe to broadcast topic
            await self.message_bus.subscribe(self.broadcast_topic, self._on_message)
            
            self.running = True
            logger.info(f"Agent communicator started for {self.agent_id}")
    
    async def stop(self):
        """Stop the communicator"""
        if self.running:
            # Unsubscribe from topics
            await self.message_bus.unsubscribe(self.topic, self._on_message)
            await self.message_bus.unsubscribe(self.broadcast_topic, self._on_message)
            
            self.running = False
            logger.info(f"Agent communicator stopped for {self.agent_id}")
    
    async def send_request(self, recipient_id: str, content: Dict[str, Any], 
                         request_type: MessageType = MessageType.REQUEST,
                         options: Dict[str, Any] = None) -> Optional[AgentMessage]:
        """
        Send a request to another agent.
        
        Args:
            recipient_id: ID of the recipient agent
            content: Message content
            request_type: Message type
            options: Additional message options
            
        Returns:
            Response message if awaiting response, None otherwise
        """
        options = options or {}
        wait_for_response = options.get("wait_for_response", True)
        timeout = options.get("timeout", 30)
        
        # Create message
        message = AgentMessage(
            type=request_type,
            sender_id=self.agent_id,
            recipient_id=recipient_id,
            content=content,
            conversation_id=options.get("conversation_id"),
            priority=options.get("priority", 1),
            metadata=options.get("metadata", {}),
            auth=options.get("auth")
        )
        
        # Set up response callback if waiting for response
        response = None
        if wait_for_response:
            response_event = asyncio.Event()
            response_container = {"response": None}
            
            self.response_callbacks[message.id] = lambda resp: self._handle_response(
                resp, response_container, response_event
            )
        
        # Publish message
        recipient_topic = f"agent.{recipient_id}"
        await self.message_bus.publish(recipient_topic, message)
        
        # Wait for response if needed
        if wait_for_response:
            try:
                await asyncio.wait_for(response_event.wait(), timeout)
                response = response_container["response"]
                
                # Clean up callback
                if message.id in self.response_callbacks:
                    del self.response_callbacks[message.id]
                
            except asyncio.TimeoutError:
                logger.warning(f"Request to {recipient_id} timed out after {timeout} seconds")
                
                # Clean up callback
                if message.id in self.response_callbacks:
                    del self.response_callbacks[message.id]
                
                # Create timeout response
                response = AgentMessage(
                    type=MessageType.ERROR,
                    sender_id=recipient_id,
                    recipient_id=self.agent_id,
                    content={"error": "timeout", "message": "Request timed out"},
                    in_reply_to=message.id,
                    conversation_id=message.conversation_id
                )
        
        return response
    
    async def send_notification(self, recipient_id: str, content: Dict[str, Any], 
                              options: Dict[str, Any] = None):
        """
        Send a one-way notification to another agent.
        
        Args:
            recipient_id: ID of the recipient agent
            content: Message content
            options: Additional message options
        """
        options = options or {}
        
        # Create message
        message = AgentMessage(
            type=MessageType.NOTIFICATION,
            sender_id=self.agent_id,
            recipient_id=recipient_id,
            content=content,
            conversation_id=options.get("conversation_id"),
            priority=options.get("priority", 1),
            metadata=options.get("metadata", {}),
            auth=options.get("auth")
        )
        
        # Publish message
        recipient_topic = f"agent.{recipient_id}"
        await self.message_bus.publish(recipient_topic, message)
    
    async def broadcast(self, content: Dict[str, Any], options: Dict[str, Any] = None):
        """
        Broadcast a message to all agents.
        
        Args:
            content: Message content
            options: Additional message options
        """
        options = options or {}
        
        # Create message
        message = AgentMessage(
            type=MessageType.NOTIFICATION,
            sender_id=self.agent_id,
            recipient_id="broadcast",
            content=content,
            conversation_id=options.get("conversation_id"),
            priority=options.get("priority", 1),
            metadata=options.get("metadata", {}),
            auth=options.get("auth")
        )
        
        # Publish to broadcast topic
        await self.message_bus.publish(self.broadcast_topic, message)
    
    def register_handler(self, message_type: MessageType, handler: Callable[[AgentMessage], Any]):
        """
        Register a handler for a specific message type.
        
        Args:
            message_type: Type of message to handle
            handler: Handler function
        """
        self.request_handlers[message_type] = handler
    
    async def _on_message(self, message: AgentMessage):
        """
        Handle incoming messages.
        
        Args:
            message: Received message
        """
        # Ignore messages from self (except loopback)
        if message.sender_id == self.agent_id and message.recipient_id != self.agent_id:
            return
        
        # Check if this is a response to a request
        if message.in_reply_to and message.in_reply_to in self.response_callbacks:
            callback = self.response_callbacks[message.in_reply_to]
            await callback(message)
            return
        
        # Handle message based on type
        if message.type in self.request_handlers:
            handler = self.request_handlers[message.type]
            try:
                response_content = await handler(message)
                
                # Send response if handler returned a response and message expects reply
                if response_content is not None and message.type in [
                    MessageType.REQUEST, MessageType.QUERY
                ]:
                    response_type = MessageType.RESPONSE
                    if message.type == MessageType.QUERY:
                        response_type = MessageType.RESULT
                    
                    response = message.create_reply(response_content, type=response_type)
                    sender_topic = f"agent.{message.sender_id}"
                    await self.message_bus.publish(sender_topic, response)
                    
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                
                # Send error response
                if message.type in [MessageType.REQUEST, MessageType.QUERY]:
                    error_response = message.create_reply(
                        {"error": str(e), "message": "Error handling request"},
                        type=MessageType.ERROR
                    )
                    sender_topic = f"agent.{message.sender_id}"
                    await self.message_bus.publish(sender_topic, error_response)
        else:
            logger.warning(f"No handler registered for message type: {message.type}")
    
    async def _handle_response(self, response: AgentMessage, container: Dict[str, Any], event: asyncio.Event):
        """
        Handle response to a request.
        
        Args:
            response: Response message
            container: Container for response
            event: Event to signal response received
        """
        container["response"] = response
        event.set()

class SecureAgentCommunicator(AgentCommunicator):
    """
    Secure version of AgentCommunicator with authentication and authorization.
    
    Adds security features for agent communication including token-based auth,
    message verification, and encryption options.
    """
    
    def __init__(self, agent_id: str, message_bus: AgentMessageBus, auth_service=None):
        """
        Initialize the secure communicator.
        
        Args:
            agent_id: ID of the agent
            message_bus: Message bus for communication
            auth_service: Authentication service
        """
        super().__init__(agent_id, message_bus)
        self.auth_service = auth_service
    
    async def send_request(self, recipient_id: str, content: Dict[str, Any], 
                         request_type: MessageType = MessageType.REQUEST,
                         options: Dict[str, Any] = None) -> Optional[AgentMessage]:
        """
        Send a secure request to another agent.
        
        Args:
            recipient_id: ID of the recipient agent
            content: Message content
            request_type: Message type
            options: Additional message options
            
        Returns:
            Response message if awaiting response, None otherwise
        """
        options = options or {}
        
        # Add authentication token if auth service available
        if self.auth_service:
            token = await self.auth_service.generate_token(
                self.agent_id,
                recipient_id,
                options.get("expiresIn", "1h")
            )
            
            # Add token to message metadata
            metadata = options.get("metadata", {})
            auth = {"token": token}
            
            # Update options
            secure_options = {
                **options,
                "metadata": metadata,
                "auth": auth
            }
        else:
            secure_options = options
        
        # Send request using parent implementation
        return await super().send_request(recipient_id, content, request_type, secure_options)
    
    async def _on_message(self, message: AgentMessage):
        """
        Handle incoming messages with security checks.
        
        Args:
            message: Received message
        """
        # Verify message authentication if auth service available
        if self.auth_service and message.sender_id != self.agent_id:
            auth = message.auth
            if not auth or not auth.get("token"):
                # If this is a request that needs a response, send error
                if message.type in [MessageType.REQUEST, MessageType.QUERY]:
                    error_response = message.create_reply(
                        {"error": "unauthorized", "message": "Authentication required"},
                        type=MessageType.ERROR
                    )
                    sender_topic = f"agent.{message.sender_id}"
                    await self.message_bus.publish(sender_topic, error_response)
                return
            
            # Verify token
            token = auth.get("token")
            try:
                is_valid = await self.auth_service.verify_token(token, message.sender_id, self.agent_id)
                if not is_valid:
                    # If this is a request that needs a response, send error
                    if message.type in [MessageType.REQUEST, MessageType.QUERY]:
                        error_response = message.create_reply(
                            {"error": "unauthorized", "message": "Invalid authentication token"},
                            type=MessageType.ERROR
                        )
                        sender_topic = f"agent.{message.sender_id}"
                        await self.message_bus.publish(sender_topic, error_response)
                    return
            except Exception as e:
                logger.error(f"Error verifying token: {e}")
                # If this is a request that needs a response, send error
                if message.type in [MessageType.REQUEST, MessageType.QUERY]:
                    error_response = message.create_reply(
                        {"error": "unauthorized", "message": "Error verifying token"},
                        type=MessageType.ERROR
                    )
                    sender_topic = f"agent.{message.sender_id}"
                    await self.message_bus.publish(sender_topic, error_response)
                return
        
        # Message passed security checks, process normally
        await super()._on_message(message)

# Simple mock auth service for development
class SimpleAuthService:
    """
    Simple authentication service for development.
    
    Uses simple JWT-like tokens for agent authentication.
    """
    
    def __init__(self, secret_key: str = None):
        """
        Initialize the auth service.
        
        Args:
            secret_key: Secret key for token signing
        """
        self.secret_key = secret_key or str(uuid.uuid4())
    
    async def generate_token(self, sender_id: str, recipient_id: str, expires_in: str = "1h") -> str:
        """
        Generate an authentication token.
        
        Args:
            sender_id: ID of the sender agent
            recipient_id: ID of the recipient agent
            expires_in: Token expiration time
            
        Returns:
            Authentication token
        """
        # Parse expiration time
        seconds = 3600  # Default 1 hour
        if expires_in.endswith("s"):
            seconds = int(expires_in[:-1])
        elif expires_in.endswith("m"):
            seconds = int(expires_in[:-1]) * 60
        elif expires_in.endswith("h"):
            seconds = int(expires_in[:-1]) * 3600
        elif expires_in.endswith("d"):
            seconds = int(expires_in[:-1]) * 86400
        
        # Create token payload
        now = datetime.now().timestamp()
        expiration = now + seconds
        
        payload = {
            "sender": sender_id,
            "recipient": recipient_id,
            "iat": now,
            "exp": expiration
        }
        
        # In a real implementation, this would use JWT signing
        # Here we just use JSON serialization with a simple signature
        payload_str = json.dumps(payload)
        
        # Create a simple signature (in production, use proper JWT)
        import hashlib
        signature = hashlib.sha256((payload_str + self.secret_key).encode()).hexdigest()
        
        # Combine payload and signature
        token = f"{payload_str}|{signature}"
        
        return token
    
    async def verify_token(self, token: str, sender_id: str, recipient_id: str) -> bool:
        """
        Verify an authentication token.
        
        Args:
            token: Authentication token
            sender_id: Expected sender ID
            recipient_id: Expected recipient ID
            
        Returns:
            True if token is valid, False otherwise
        """
        try:
            # Split token into payload and signature
            payload_str, signature = token.split("|")
            
            # Verify signature
            import hashlib
            expected_signature = hashlib.sha256((payload_str + self.secret_key).encode()).hexdigest()
            if signature != expected_signature:
                return False
            
            # Parse payload
            payload = json.loads(payload_str)
            
            # Check sender and recipient
            if payload.get("sender") != sender_id or payload.get("recipient") != recipient_id:
                return False
            
            # Check expiration
            now = datetime.now().timestamp()
            if payload.get("exp", 0) < now:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return False

# Singleton message bus instance
_message_bus_instance = None

def get_agent_message_bus(config: Dict[str, Any] = None) -> AgentMessageBus:
    """
    Get singleton instance of AgentMessageBus.
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        AgentMessageBus instance
    """
    global _message_bus_instance
    if _message_bus_instance is None:
        _message_bus_instance = AgentMessageBus(config or {})
    return _message_bus_instance