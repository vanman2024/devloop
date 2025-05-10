#!/usr/bin/env python3
"""
Agent Communication Service for Task Agent

This module provides communication capabilities for the Task Agent,
allowing it to send and receive messages to/from other agents in the system.
"""

import os
import sys
import json
import logging
import uuid
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'logs', 'agent_communication.log'))
    ]
)
logger = logging.getLogger('agent_communication')

class AgentMessage:
    """Represents a message between agents"""
    
    def __init__(self, sender: str, recipient: str, content: Dict[str, Any], 
               message_type: str = "request", id: Optional[str] = None):
        """
        Initialize an agent message
        
        Args:
            sender: ID of the sending agent
            recipient: ID of the receiving agent
            content: Message content
            message_type: Message type (request, response, notification, handoff)
            id: Optional message ID (generated if not provided)
        """
        self.id = id or str(uuid.uuid4())
        self.sender = sender
        self.recipient = recipient
        self.content = content
        self.message_type = message_type
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the message to a dictionary
        
        Returns:
            Dictionary representation of the message
        """
        return {
            "id": self.id,
            "sender": self.sender,
            "recipient": self.recipient,
            "content": self.content,
            "message_type": self.message_type,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentMessage':
        """
        Create a message from a dictionary
        
        Args:
            data: Dictionary representation of the message
            
        Returns:
            AgentMessage instance
        """
        return cls(
            sender=data.get("sender", "unknown"),
            recipient=data.get("recipient", "unknown"),
            content=data.get("content", {}),
            message_type=data.get("message_type", "request"),
            id=data.get("id")
        )

class AgentCommunicationService:
    """Service for agent communication"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None, message_store_path: Optional[str] = None):
        """
        Initialize the agent communication service
        
        Args:
            config: Configuration dictionary
            message_store_path: Path to the message store file
        """
        self.config = config or {}
        self.enabled = self.config.get('agent_communication_enabled', True)
        
        # Set up message store path
        self.message_store_path = message_store_path
        if not self.message_store_path:
            message_dir = os.path.join(os.path.dirname(__file__), 'memory')
            self.message_store_path = os.path.join(message_dir, 'messages.json')
        
        # Create directory if it doesn't exist
        message_dir = os.path.dirname(self.message_store_path)
        if not os.path.exists(message_dir):
            try:
                os.makedirs(message_dir)
                logger.info(f"Created message store directory at {message_dir}")
            except Exception as e:
                logger.error(f"Error creating message store directory: {e}")
        
        # Initialize message store
        self.messages = []
        
        # Load persisted messages
        self._load_messages()
        
        logger.info("Agent Communication Service initialized")
    
    def _load_messages(self):
        """Load messages from the message store file"""
        if os.path.exists(self.message_store_path):
            try:
                with open(self.message_store_path, 'r') as f:
                    data = json.load(f)
                    self.messages = [AgentMessage.from_dict(m) for m in data]
                logger.info(f"Loaded {len(self.messages)} messages from {self.message_store_path}")
            except Exception as e:
                logger.error(f"Error loading messages: {e}")
    
    def _save_messages(self):
        """Save messages to the message store file"""
        try:
            with open(self.message_store_path, 'w') as f:
                # Convert messages to dictionaries
                message_dicts = [m.to_dict() for m in self.messages]
                # Only keep the last 1000 messages to avoid file size issues
                if len(message_dicts) > 1000:
                    message_dicts = message_dicts[-1000:]
                json.dump(message_dicts, f, indent=2)
            logger.info(f"Saved {len(self.messages)} messages to {self.message_store_path}")
        except Exception as e:
            logger.error(f"Error saving messages: {e}")
    
    def send_message(self, message: Union[AgentMessage, Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Send a message to another agent
        
        Args:
            message: Message to send (AgentMessage instance or dictionary)
            
        Returns:
            Tuple of (success, message)
        """
        if not self.enabled:
            return False, "Agent communication is disabled"
        
        try:
            # Convert dictionary to AgentMessage if needed
            if isinstance(message, dict):
                message = AgentMessage(
                    sender=message.get("sender"),
                    recipient=message.get("recipient"),
                    content=message.get("content", {}),
                    message_type=message.get("message_type", "request")
                )
            
            # Add message to store
            self.messages.append(message)
            self._save_messages()
            
            logger.info(f"Sent message from {message.sender} to {message.recipient} of type {message.message_type}")
            
            # Check for any integration with real message passing systems
            self._process_outgoing_message(message)
            
            return True, f"Message sent: {message.id}"
        
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return False, f"Error sending message: {str(e)}"
    
    def _process_outgoing_message(self, message: AgentMessage):
        """
        Process an outgoing message
        
        This can be extended to integrate with real message passing systems
        like RabbitMQ, Redis, webhook APIs, etc.
        
        Args:
            message: Message to process
        """
        # Currently just logs the message - this is where you would add integration code
        logger.debug(f"Processing outgoing message: {json.dumps(message.to_dict(), indent=2)}")
    
    def get_messages(self, recipient: Optional[str] = None, sender: Optional[str] = None, 
                   limit: int = 10) -> List[AgentMessage]:
        """
        Get messages
        
        Args:
            recipient: Optional recipient to filter by
            sender: Optional sender to filter by
            limit: Maximum number of messages to return
            
        Returns:
            List of messages
        """
        filtered_messages = self.messages
        
        if recipient:
            filtered_messages = [m for m in filtered_messages if m.recipient == recipient]
        
        if sender:
            filtered_messages = [m for m in filtered_messages if m.sender == sender]
        
        # Sort by timestamp (newest first) and limit
        sorted_messages = sorted(filtered_messages, 
                               key=lambda m: m.timestamp if hasattr(m, 'timestamp') else "", 
                               reverse=True)
        
        return sorted_messages[:limit]
    
    def get_message_by_id(self, message_id: str) -> Optional[AgentMessage]:
        """
        Get a message by ID
        
        Args:
            message_id: ID of the message
            
        Returns:
            AgentMessage instance or None if not found
        """
        for message in self.messages:
            if message.id == message_id:
                return message
        return None
    
    def create_response(self, request_message: AgentMessage, 
                      content: Dict[str, Any]) -> AgentMessage:
        """
        Create a response to a request message
        
        Args:
            request_message: Original request message
            content: Response content
            
        Returns:
            Response message
        """
        return AgentMessage(
            sender=request_message.recipient,
            recipient=request_message.sender,
            content=content,
            message_type="response"
        )
    
    def send_notification(self, sender: str, recipient: str, 
                        action: str, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Send a notification message
        
        Args:
            sender: ID of the sending agent
            recipient: ID of the receiving agent
            action: Action type (e.g., "feature_created", "task_completed")
            data: Notification data
            
        Returns:
            Tuple of (success, message)
        """
        content = {
            "action": action,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "requires_response": False
        }
        
        message = AgentMessage(
            sender=sender,
            recipient=recipient,
            content=content,
            message_type="notification"
        )
        
        return self.send_message(message)
    
    def send_handoff(self, sender: str, recipient: str, 
                   action: str, data: Dict[str, Any], 
                   requires_response: bool = True) -> Tuple[bool, str]:
        """
        Send a handoff message
        
        Args:
            sender: ID of the sending agent
            recipient: ID of the receiving agent
            action: Action type (e.g., "analyze_dependencies", "process_feature")
            data: Handoff data
            requires_response: Whether a response is required
            
        Returns:
            Tuple of (success, message)
        """
        content = {
            "action": action,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "requires_response": requires_response
        }
        
        message = AgentMessage(
            sender=sender,
            recipient=recipient,
            content=content,
            message_type="handoff"
        )
        
        return self.send_message(message)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get communication statistics
        
        Returns:
            Dictionary with statistics
        """
        message_types = {}
        for message in self.messages:
            message_type = message.message_type
            if message_type in message_types:
                message_types[message_type] += 1
            else:
                message_types[message_type] = 1
        
        return {
            "total_messages": len(self.messages),
            "message_types": message_types,
            "enabled": self.enabled,
            "message_store_path": self.message_store_path
        }

# Singleton instance
_communication_service_instance = None

def get_agent_communication_service(config: Optional[Dict[str, Any]] = None, 
                                  message_store_path: Optional[str] = None) -> AgentCommunicationService:
    """
    Get the singleton instance of the Agent Communication Service
    
    Args:
        config: Optional configuration to override defaults
        message_store_path: Optional path to the message store file
        
    Returns:
        AgentCommunicationService instance
    """
    global _communication_service_instance
    if _communication_service_instance is None:
        _communication_service_instance = AgentCommunicationService(config, message_store_path)
    elif config:
        # Update config if provided
        _communication_service_instance.config.update(config)
    return _communication_service_instance