#!/usr/bin/env python3
"""
Intent Recognition System for SDK-First Architecture

This module provides an intent recognition system for natural language commands
that integrates with OpenAI's function calling capabilities. Adapted from the
preserved_scripts/intent_recognition system.

Usage:
    from agents.sdk.utils.intent_recognizer import IntentRecognizer
    
    recognizer = IntentRecognizer()
    result = recognizer.process("create a feature for user authentication")
"""

import os
import sys
import json
import logging
import re
from typing import Dict, List, Any, Optional, Union, NamedTuple

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
logger = logging.getLogger("intent_recognizer")

# Default intent model - can be customized in configuration
DEFAULT_INTENT_MODEL = {
    "intents": [
        {
            "name": "create_feature",
            "description": "Create a new feature or component",
            "parameters": [
                {"name": "feature_name", "type": "string", "required": True, 
                 "description": "Name of the feature to create"},
                {"name": "module_name", "type": "string", "required": False, 
                 "description": "Module or section where the feature belongs"},
                {"name": "description", "type": "string", "required": False, 
                 "description": "Description of the feature to create"}
            ]
        },
        {
            "name": "run_feature",
            "description": "Run or execute an existing feature",
            "parameters": [
                {"name": "feature_name", "type": "string", "required": True, 
                 "description": "Name of the feature to run"},
                {"name": "mode", "type": "string", "required": False, 
                 "description": "Mode to run the feature in (e.g., debug, production)"}
            ]
        },
        {
            "name": "query_knowledge",
            "description": "Query the knowledge base or documentation",
            "parameters": [
                {"name": "query", "type": "string", "required": True, 
                 "description": "Search query or question"},
                {"name": "category", "type": "string", "required": False, 
                 "description": "Category to search within"}
            ]
        },
        {
            "name": "system_status",
            "description": "Check status of system components",
            "parameters": [
                {"name": "component", "type": "string", "required": False, 
                 "description": "Specific component to check status for"}
            ]
        }
    ]
}

class IntentResult(NamedTuple):
    """Result of intent recognition."""
    intent: str
    parameters: Dict[str, Any]
    confidence: float
    validation_errors: List[str] = []
    
    def is_valid(self) -> bool:
        """Check if the intent result is valid."""
        return len(self.validation_errors) == 0

class IntentRecognizer:
    """Intent recognition system with OpenAI integration."""
    
    def __init__(self, config_path: Optional[str] = None, client=None):
        """
        Initialize the intent recognizer.
        
        Args:
            config_path: Path to configuration file. If None, uses default.
            client: OpenAI client instance (if None, will be created when needed)
        """
        self.config = self._load_config(config_path)
        self.client = client
        self.intent_model = self.config.get("intent_model", DEFAULT_INTENT_MODEL)
        self.confidence_threshold = self.config.get("confidence_threshold", 0.7)
        
        logger.info("Intent Recognizer initialized")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Load configuration from file or defaults.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Dict containing configuration values
        """
        # Default configuration
        config = {
            "openai_model": "gpt-4o-mini",
            "confidence_threshold": 0.7,
            "validate_parameters": True,
            "use_legacy_fallback": False,
        }
        
        # If config path provided, load from file
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    # Update defaults with file values
                    config.update(file_config)
                logger.info(f"Configuration loaded from {config_path}")
            except Exception as e:
                logger.error(f"Error loading configuration from {config_path}: {e}")
        
        return config
    
    def _get_openai_client(self):
        """Get or create an OpenAI client."""
        if self.client is not None:
            return self.client
        
        try:
            import openai
            self.client = openai.OpenAI()
            return self.client
        except ImportError:
            logger.error("OpenAI package not installed. Please install it with: pip install openai")
            raise
    
    def process(self, command: str, context: Optional[Dict[str, Any]] = None) -> IntentResult:
        """
        Process a natural language command.
        
        Args:
            command: The natural language command to process
            context: Optional context information
            
        Returns:
            IntentResult containing recognized intent and parameters
        """
        logger.info(f"Processing command: {command}")
        
        # Process with OpenAI function calling
        result = self._recognize_with_openai(command, context)
        
        if result and result["confidence"] >= self.confidence_threshold:
            # Validate parameters if needed
            validation_errors = []
            if self.config.get("validate_parameters", True):
                validation_errors = self._validate_parameters(
                    result["intent"], 
                    result["parameters"]
                )
            
            logger.info(f"Intent recognized: {result['intent']} (confidence: {result['confidence']})")
            
            return IntentResult(
                intent=result["intent"],
                parameters=result["parameters"],
                confidence=result["confidence"],
                validation_errors=validation_errors
            )
        
        # If no intent recognized
        logger.warning(f"No intent could be recognized for: {command}")
        return IntentResult(
            intent="unknown",
            parameters={},
            confidence=0.0,
            validation_errors=["Could not recognize a valid intent"]
        )
    
    def _recognize_with_openai(self, command: str, context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Recognize intent using OpenAI function calling.
        
        Args:
            command: The natural language command
            context: Optional context information
            
        Returns:
            Dict containing intent, parameters, and confidence
        """
        try:
            client = self._get_openai_client()
            
            # Convert intent model to OpenAI function schema
            functions = self._create_functions_from_intent_model()
            
            # Create messages with context if provided
            messages = []
            if context and "system_prompt" in context:
                messages.append({"role": "system", "content": context["system_prompt"]})
            else:
                messages.append({
                    "role": "system",
                    "content": "You are an AI assistant that helps recognize user intents from natural language commands."
                })
            
            if context and "conversation_history" in context:
                messages.extend(context["conversation_history"])
            
            # Add the current command
            messages.append({"role": "user", "content": command})
            
            # Call OpenAI API with function calling
            response = client.chat.completions.create(
                model=self.config.get("openai_model", "gpt-4o-mini"),
                messages=messages,
                functions=functions,
                function_call="auto"
            )
            
            # Extract function call information
            message = response.choices[0].message
            if hasattr(message, 'function_call') and message.function_call:
                function_name = message.function_call.name
                function_args = json.loads(message.function_call.arguments)
                
                # Map to our intent format
                return {
                    "intent": function_name,
                    "parameters": function_args,
                    "confidence": 0.9  # Function calls typically have high confidence
                }
            else:
                # Try to extract intent information from the response text
                return self._extract_intent_from_text(message.content)
            
        except Exception as e:
            logger.error(f"Error in OpenAI intent recognition: {e}")
            return None
    
    def _create_functions_from_intent_model(self) -> List[Dict[str, Any]]:
        """
        Convert our intent model to OpenAI function definitions.
        
        Returns:
            List of function definitions for OpenAI API
        """
        functions = []
        
        for intent in self.intent_model["intents"]:
            function = {
                "name": intent["name"],
                "description": intent["description"],
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
            
            # Add parameters
            for param in intent["parameters"]:
                function["parameters"]["properties"][param["name"]] = {
                    "type": param["type"],
                    "description": param["description"]
                }
                
                if param.get("required", False):
                    function["parameters"]["required"].append(param["name"])
            
            functions.append(function)
        
        return functions
    
    def _extract_intent_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract intent information from text response when function calling fails.
        
        Args:
            text: Response text from the model
            
        Returns:
            Dict containing intent, parameters, and confidence
        """
        try:
            # Try to extract structured content
            intent_match = re.search(r'intent:?\s*(\w+)', text, re.IGNORECASE)
            if intent_match:
                intent = intent_match.group(1).lower()
                
                # Extract parameters (primitive approach)
                parameters = {}
                param_matches = re.findall(r'(\w+):\s*([^\n,]+)', text)
                for key, value in param_matches:
                    if key.lower() != "intent" and key.lower() != "confidence":
                        parameters[key.lower()] = value.strip()
                
                # Extract confidence if present
                confidence = 0.7  # Default confidence
                confidence_match = re.search(r'confidence:?\s*(0\.\d+|1\.0)', text, re.IGNORECASE)
                if confidence_match:
                    confidence = float(confidence_match.group(1))
                
                return {
                    "intent": intent,
                    "parameters": parameters,
                    "confidence": confidence
                }
            
            # If no structured content found, return None
            return None
            
        except Exception as e:
            logger.error(f"Error extracting intent from text: {e}")
            return None
    
    def _validate_parameters(self, intent: str, parameters: Dict[str, Any]) -> List[str]:
        """
        Validate parameters for a given intent.
        
        Args:
            intent: The recognized intent
            parameters: The extracted parameters
            
        Returns:
            List of validation error messages, empty if valid
        """
        errors = []
        
        # Find the intent definition
        intent_def = None
        for intent_item in self.intent_model["intents"]:
            if intent_item["name"] == intent:
                intent_def = intent_item
                break
        
        if not intent_def:
            return [f"Unknown intent: {intent}"]
        
        # Check required parameters
        for param in intent_def["parameters"]:
            if param.get("required", False) and param["name"] not in parameters:
                errors.append(f"Missing required parameter: {param['name']}")
        
        return errors
    
    def add_intent(self, intent_definition: Dict[str, Any]) -> None:
        """
        Add a new intent to the intent model.
        
        Args:
            intent_definition: Definition of the intent to add
        """
        # Check if intent already exists
        for i, existing_intent in enumerate(self.intent_model["intents"]):
            if existing_intent["name"] == intent_definition["name"]:
                # Update existing intent
                self.intent_model["intents"][i] = intent_definition
                logger.info(f"Updated existing intent: {intent_definition['name']}")
                return
        
        # Add new intent
        self.intent_model["intents"].append(intent_definition)
        logger.info(f"Added new intent: {intent_definition['name']}")
    
    def remove_intent(self, intent_name: str) -> bool:
        """
        Remove an intent from the intent model.
        
        Args:
            intent_name: Name of the intent to remove
            
        Returns:
            True if intent was removed, False if not found
        """
        for i, intent in enumerate(self.intent_model["intents"]):
            if intent["name"] == intent_name:
                del self.intent_model["intents"][i]
                logger.info(f"Removed intent: {intent_name}")
                return True
        
        logger.warning(f"Intent not found for removal: {intent_name}")
        return False
    
    def save_model(self, file_path: str) -> None:
        """
        Save the current intent model to a file.
        
        Args:
            file_path: Path to save the model to
        """
        try:
            with open(file_path, 'w') as f:
                json.dump(self.intent_model, f, indent=2)
            logger.info(f"Intent model saved to {file_path}")
        except Exception as e:
            logger.error(f"Error saving intent model: {e}")


if __name__ == "__main__":
    # Example usage
    import os
    
    # Create recognizer
    recognizer = IntentRecognizer()
    
    # Test with a few commands
    test_commands = [
        "Create a new feature called user authentication",
        "Run the dashboard feature",
        "What's the current status of the system?",
        "Search the documentation for information about adapters"
    ]
    
    for command in test_commands:
        result = recognizer.process(command)
        print(f"\nCommand: {command}")
        print(f"Intent: {result.intent}")
        print(f"Confidence: {result.confidence}")
        print(f"Parameters: {result.parameters}")
        if not result.is_valid():
            print(f"Validation errors: {result.validation_errors}")