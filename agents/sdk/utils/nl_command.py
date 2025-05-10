#!/usr/bin/env python3
"""
Natural Language Command Processor for SDK

This module provides natural language command processing capabilities for the SDK,
enabling more intuitive interaction with the SDK's features. It handles intent
detection, entity extraction, and command execution.

Adapted from test_command.py and integrates with the SDK architecture.
"""

import os
import sys
import re
import json
import logging
from typing import Dict, List, Optional, Tuple, Any, Callable

# SDK Core imports
from .sdk_logger import get_logger

# Initialize logger
logger = get_logger(__name__)

class IntentDetector:
    """
    Detects intents from natural language commands.
    Provides both rule-based and AI-powered intent detection.
    """
    
    def __init__(self, intent_map: Optional[Dict] = None, use_ai: bool = False):
        """Initialize the intent detector"""
        self.intent_map = intent_map or {
            "create": ["create", "make", "new", "generate", "build", "init", "setup"],
            "update": ["update", "modify", "change", "edit", "alter", "revise"],
            "get": ["get", "fetch", "retrieve", "find", "search", "list", "show"],
            "delete": ["delete", "remove", "drop", "clear", "erase"],
            "run": ["run", "execute", "start", "launch", "trigger", "perform"],
            "help": ["help", "assist", "guide", "support", "explain"]
        }
        
        # Entity patterns for extraction
        self.entity_patterns = {
            "component": r"(?:component|module|feature)(?:\s+named|\s+called)?\s+['\"]?([a-zA-Z0-9_\-]+)['\"]?",
            "file": r"(?:file|document)(?:\s+named|\s+called)?\s+['\"]?([a-zA-Z0-9_\-\.]+)['\"]?",
            "path": r"(?:path|directory|folder)(?:\s+at|\s+in)?\s+['\"]?([a-zA-Z0-9_\-\/\.]+)['\"]?",
            "design": r"(?:design|mockup|wireframe)(?:\s+named|\s+called)?\s+['\"]?([a-zA-Z0-9_\-\s]+)['\"]?"
        }
        
        # Flag for AI-powered intent detection
        self.use_ai = use_ai
        self.ai_client = None
        
        # If using AI, initialize the client
        if self.use_ai:
            try:
                # Import optional dependencies for AI-powered detection
                from ..adapters.ai_service_adapter import AIServiceAdapter
                self.ai_client = AIServiceAdapter()
            except (ImportError, Exception) as e:
                logger.warning(f"AI-powered intent detection not available: {str(e)}")
                self.use_ai = False
    
    def detect_intent(self, command: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect intent and extract entities from a natural language command
        
        Args:
            command: The natural language command
            
        Returns:
            Tuple of (intent, entities)
        """
        # Try AI-powered detection first if enabled
        if self.use_ai and self.ai_client:
            try:
                ai_intent, ai_entities = self._detect_intent_ai(command)
                if ai_intent:
                    return ai_intent, ai_entities
            except Exception as e:
                logger.warning(f"AI intent detection failed: {str(e)}")
        
        # Fall back to rule-based detection
        return self._detect_intent_rules(command)
    
    def _detect_intent_rules(self, command: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect intent and extract entities using rule-based approach
        
        Args:
            command: The natural language command
            
        Returns:
            Tuple of (intent, entities)
        """
        command_lower = command.lower()
        
        # Find the intent based on keywords
        intent = "unknown"
        highest_score = 0
        
        for intent_name, keywords in self.intent_map.items():
            score = sum(1 for keyword in keywords if keyword in command_lower)
            if score > highest_score:
                highest_score = score
                intent = intent_name
        
        # Extract entities
        entities = {}
        
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.search(pattern, command, re.IGNORECASE)
            if matches:
                entities[entity_type] = matches.group(1)
        
        # Extract resource type (noun after the intent verb)
        resource_pattern = r"\b(?:{})\s+([a-zA-Z]+)".format("|".join(self.intent_map.get(intent, [])))
        resource_match = re.search(resource_pattern, command_lower)
        if resource_match:
            entities["resource_type"] = resource_match.group(1)
        
        return intent, entities
    
    def _detect_intent_ai(self, command: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect intent and extract entities using AI
        
        Args:
            command: The natural language command
            
        Returns:
            Tuple of (intent, entities)
        """
        if not self.ai_client:
            return "unknown", {}
            
        # Create a prompt for the AI
        prompt = f"""
        Analyze the following command and extract the intent and entities.
        Return the response as JSON with 'intent' and 'entities' keys.
        
        Command: "{command}"
        
        Valid intents are: create, update, get, delete, run, help
        
        Example output:
        {{
            "intent": "create",
            "entities": {{
                "resource_type": "component",
                "component": "UserProfile",
                "path": "/src/components"
            }}
        }}
        """
        
        try:
            # Get AI response
            response = self.ai_client.analyze_text(prompt)
            
            # Parse the response
            try:
                result = json.loads(response)
                if "intent" in result and "entities" in result:
                    return result["intent"], result["entities"]
            except json.JSONDecodeError:
                logger.warning(f"AI response not valid JSON: {response}")
                
        except Exception as e:
            logger.warning(f"AI intent detection error: {str(e)}")
        
        return "unknown", {}


class CommandProcessor:
    """
    Processes natural language commands for the SDK.
    Maps intents to handler functions and executes commands.
    """
    
    def __init__(self, intent_detector: Optional[IntentDetector] = None):
        """Initialize the command processor"""
        self.intent_detector = intent_detector or IntentDetector()
        self.handlers = {}
        self.default_handler = None
        
        # Register built-in handlers
        self._register_builtin_handlers()
    
    def register_handler(self, intent: str, handler: Callable) -> None:
        """
        Register a handler function for an intent
        
        Args:
            intent: The intent to handle
            handler: The handler function
        """
        self.handlers[intent] = handler
        logger.debug(f"Registered handler for intent: {intent}")
    
    def register_default_handler(self, handler: Callable) -> None:
        """
        Register a default handler for unknown intents
        
        Args:
            handler: The default handler function
        """
        self.default_handler = handler
        logger.debug("Registered default handler")
    
    def _register_builtin_handlers(self) -> None:
        """Register built-in handlers for common intents"""
        # These are placeholder handlers - implement actual functionality as needed
        self.register_handler("create", self._handle_create)
        self.register_handler("update", self._handle_update)
        self.register_handler("get", self._handle_get)
        self.register_handler("delete", self._handle_delete)
        self.register_handler("run", self._handle_run)
        self.register_handler("help", self._handle_help)
        
        # Register default handler
        self.register_default_handler(self._handle_unknown)
    
    def process_command(self, command: str, debug: bool = False) -> Dict[str, Any]:
        """
        Process a natural language command
        
        Args:
            command: The natural language command
            debug: Whether to include debug information in the result
            
        Returns:
            Dictionary with command processing result
        """
        # Detect intent and entities
        intent, entities = self.intent_detector.detect_intent(command)
        
        # Create result object
        result = {
            "command": command,
            "intent": intent,
            "entities": entities,
            "success": False,
            "message": "",
            "data": {}
        }
        
        # Execute handler
        handler = self.handlers.get(intent, self.default_handler)
        if handler:
            try:
                handler_result = handler(command, entities)
                
                # Update result with handler result
                if isinstance(handler_result, dict):
                    if "success" in handler_result:
                        result["success"] = handler_result["success"]
                    if "message" in handler_result:
                        result["message"] = handler_result["message"]
                    if "data" in handler_result:
                        result["data"] = handler_result["data"]
                else:
                    result["success"] = bool(handler_result)
                    
            except Exception as e:
                logger.error(f"Error executing handler for intent '{intent}': {str(e)}")
                result["success"] = False
                result["message"] = f"Error: {str(e)}"
        else:
            result["message"] = f"No handler found for intent: {intent}"
        
        # Remove debug info unless requested
        if not debug:
            if "entities" in result:
                del result["entities"]
            
        return result
    
    # Built-in handlers
    
    def _handle_create(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle create intent"""
        resource_type = entities.get("resource_type", "unknown")
        logger.info(f"Creating {resource_type}")
        
        result = {
            "success": True,
            "message": f"Created {resource_type}",
            "data": {"resource_type": resource_type}
        }
        
        # Add type-specific details
        if resource_type == "component" and "component" in entities:
            result["message"] = f"Created component: {entities['component']}"
            result["data"]["component"] = entities["component"]
        elif resource_type == "file" and "file" in entities:
            result["message"] = f"Created file: {entities['file']}"
            result["data"]["file"] = entities["file"]
        
        return result
    
    def _handle_update(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle update intent"""
        resource_type = entities.get("resource_type", "unknown")
        logger.info(f"Updating {resource_type}")
        
        return {
            "success": True,
            "message": f"Updated {resource_type}",
            "data": entities
        }
    
    def _handle_get(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle get intent"""
        resource_type = entities.get("resource_type", "unknown")
        logger.info(f"Getting {resource_type}")
        
        return {
            "success": True,
            "message": f"Retrieved {resource_type}",
            "data": entities
        }
    
    def _handle_delete(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle delete intent"""
        resource_type = entities.get("resource_type", "unknown")
        logger.info(f"Deleting {resource_type}")
        
        return {
            "success": True,
            "message": f"Deleted {resource_type}",
            "data": entities
        }
    
    def _handle_run(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle run intent"""
        resource_type = entities.get("resource_type", "unknown")
        logger.info(f"Running {resource_type}")
        
        return {
            "success": True,
            "message": f"Executed {resource_type}",
            "data": entities
        }
    
    def _handle_help(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle help intent"""
        resource_type = entities.get("resource_type")
        
        if resource_type:
            help_message = f"Help for {resource_type}"
        else:
            help_message = "Available commands: create, update, get, delete, run, help"
        
        return {
            "success": True,
            "message": help_message,
            "data": {"commands": list(self.handlers.keys())}
        }
    
    def _handle_unknown(self, command: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Handle unknown intent"""
        logger.warning(f"Unknown intent for command: {command}")
        
        return {
            "success": False,
            "message": "I don't understand what you're asking. Try a different command or use 'help' for assistance.",
            "data": {}
        }


# Convenient functions for external use

def detect_intent(command: str) -> Tuple[str, Dict[str, Any]]:
    """
    Detect intent and entities from a natural language command
    
    Args:
        command: The natural language command
        
    Returns:
        Tuple of (intent, entities)
    """
    detector = IntentDetector()
    return detector.detect_intent(command)

def process_command(command: str, debug: bool = False) -> Dict[str, Any]:
    """
    Process a natural language command
    
    Args:
        command: The natural language command
        debug: Whether to include debug information in the result
        
    Returns:
        Dictionary with command processing result
    """
    processor = CommandProcessor()
    return processor.process_command(command, debug)