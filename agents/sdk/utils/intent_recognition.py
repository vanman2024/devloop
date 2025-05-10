#!/usr/bin/env python3
"""
Intent Recognition System for SDK-First Architecture

This module provides intent recognition capabilities to identify user intents
from natural language inputs and extract relevant parameters.
"""

import os
import sys
import json
import re
import logging
import time
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] - %(message)s"
)
logger = logging.getLogger("intent_recognition")

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
        """Fallback activity logger that just logs to the intent_recognition logger."""
        logger.debug(f"Activity: {subtype} - {title or 'No title'} - {details}")


# Default command types - a subset of the full list from preserved_scripts
DEFAULT_COMMAND_TYPES = [
    "create_feature", "run_feature", "test_feature", "update_feature_status",
    "create_enhancement", "run_enhancement", "test_enhancement",
    "create_refactoring", "run_refactoring", "test_refactoring",
    "create_maintenance", "run_maintenance",
    "create_milestone", "create_phase", "update_phase_status",
    "run_tests", "validate_system", "update_dashboard", "launch_dashboard",
    "clean_project", "clean_directory", 
    "view_screenshot", "list_screenshots",
    "view_design", "list_designs", "convert_design"
]

# Default intent patterns for regex-based matching
DEFAULT_INTENT_PATTERNS = {
    # Design management intent patterns
    "view_design": [
        r"view (?:the )?design(?: of| for| containing)? (.+)",
        r"show (?:the )?design(?: of| for| containing)? (.+)",
        r"open (?:the )?design(?: of| for| containing)? (.+)",
        r"display (?:the )?design(?: of| for| containing)? (.+)",
        r"analyze (?:the )?design(?: of| for| containing)? (.+)",
        r"view design ['\"](.*)['\"]",
        r"view design (c:\\.*\.[a-z]+)"
    ],
    # Screenshot management intent patterns
    "view_screenshot": [
        r"view (?:the )?screenshot(?: of| for| containing)? (.+)",
        r"show (?:the )?screenshot(?: of| for| containing)? (.+)",
        r"open (?:the )?screenshot(?: of| for| containing)? (.+)",
        r"display (?:the )?screenshot(?: of| for| containing)? (.+)",
        r"analyze (?:the )?screenshot(?: of| for| containing)? (.+)",
        r"view screenshot ['\"](.*)['\"]",
        r"view screenshot (c:\\.*\.png)"
    ],
    # Cleanup intent patterns
    "clean_project": [
        r"clean (?:up)?(?: the)? (?:project|workspace|devloop|repository)",
        r"tidy (?:up)?(?: the)? (?:workspace|project)",
        r"(?:perform|run)(?: a)? (?:project )?cleanup",
        r"organize (?:the )?(?:project|workspace|devloop|repository)",
        r"(?:remove|cleanup|clean up) (?:temporary|temp) files",
        r"preview (?:cleanup|clean up)",
        r"(?:run|perform)(?: a)? deep clean(?:up)?"
    ],
    "clean_directory": [
        r"clean (?:up)?(?: the)? ([\/\w\-\.]+)(?: directory)?",
        r"tidy (?:up)?(?: the)? ([\/\w\-\.]+)(?: directory)?",
        r"organize (?:the )?([\/\w\-\.]+)(?: directory)?",
        r"(?:run|perform) cleanup (?:on|in)(?: the)? ([\/\w\-\.]+)(?: directory)?"
    ],
    # Feature management
    "create_feature": [
        r"create (?:a )?feature (?:for|that|to handle) (.+)",
        r"(?:i need|we need) (?:a )?feature (?:for|that|to handle) (.+)",
        r"add (?:a )?feature (?:for|that|to handle) (.+)"
    ],
    "run_feature": [
        r"run (?:the )?(.+?) feature",
        r"execute (?:the )?(.+?) feature"
    ],
    # Dashboard management
    "update_dashboard": [
        r"update (?:the )?dashboard",
        r"refresh (?:the )?dashboard"
    ],
    "launch_dashboard": [
        r"launch (?:the )?dashboard",
        r"start (?:the )?dashboard",
        r"open (?:the )?dashboard"
    ]
}

# Default intent model for AI classification
DEFAULT_INTENT_MODEL = {
    "intents": [
        {
            "name": "create_feature",
            "description": "Create a new feature in the Devloop system",
            "examples": [
                "create a feature for user authentication",
                "I need a feature for dashboard widgets",
                "add a feature for error logging"
            ],
            "parameters": [
                {
                    "name": "feature_name",
                    "description": "The name or purpose of the feature",
                    "required": True
                },
                {
                    "name": "module_name",
                    "description": "Module to create the feature in",
                    "required": False
                }
            ]
        },
        {
            "name": "run_feature",
            "description": "Execute an existing feature in the system",
            "examples": [
                "run the dashboard feature",
                "execute the logging feature",
                "run the authentication feature"
            ],
            "parameters": [
                {
                    "name": "feature_name",
                    "description": "The name of the feature to run",
                    "required": True
                }
            ]
        },
        {
            "name": "create_enhancement",
            "description": "Create an enhancement for an existing feature",
            "examples": [
                "enhance the dashboard feature with sorting",
                "add filtering to the report feature",
                "enhance memory status with Python-based memory manager"
            ],
            "parameters": [
                {
                    "name": "feature_name",
                    "description": "The name of the feature to enhance",
                    "required": True
                },
                {
                    "name": "enhancement_name",
                    "description": "The name or purpose of the enhancement",
                    "required": True
                }
            ]
        },
        {
            "name": "view_screenshot",
            "description": "View or analyze a screenshot",
            "examples": [
                "view the screenshot of the dashboard",
                "show the screenshot containing the login page",
                "view screenshot 'C:\\path\\to\\screenshot.png'"
            ],
            "parameters": [
                {
                    "name": "screenshot_path",
                    "description": "The path to the screenshot file",
                    "required": True
                }
            ]
        },
        {
            "name": "update_dashboard",
            "description": "Update the project dashboard",
            "examples": [
                "update the dashboard",
                "refresh the dashboard"
            ],
            "parameters": []
        }
    ]
}


class Intent:
    """Representation of a recognized intent"""
    
    def __init__(self, intent_type: str, confidence: float = 1.0, 
               parameters: Dict[str, Any] = None, raw_text: str = ""):
        """
        Initialize an intent.
        
        Args:
            intent_type: Type of intent (e.g., create_feature)
            confidence: Confidence score (0.0 to 1.0)
            parameters: Extracted parameters
            raw_text: Original text that triggered this intent
        """
        self.intent_type = intent_type
        self.confidence = confidence
        self.parameters = parameters or {}
        self.raw_text = raw_text
        self.timestamp = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "intent_type": self.intent_type,
            "confidence": self.confidence,
            "parameters": self.parameters,
            "raw_text": self.raw_text,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Intent':
        """Create from dictionary"""
        intent = cls(
            intent_type=data["intent_type"],
            confidence=data.get("confidence", 1.0),
            parameters=data.get("parameters", {}),
            raw_text=data.get("raw_text", "")
        )
        
        intent.timestamp = data.get("timestamp", time.time())
        
        return intent
    
    def __str__(self) -> str:
        """String representation"""
        param_str = ", ".join(f"{k}={v}" for k, v in self.parameters.items())
        return f"Intent({self.intent_type}, confidence={self.confidence:.2f}, params={{{param_str}}})"


class IntentRecognizer:
    """System for recognizing intents from natural language input"""
    
    def __init__(self, model_path: Optional[str] = None,
               use_ai_recognition: bool = True,
               default_threshold: float = 0.6):
        """
        Initialize the intent recognizer.
        
        Args:
            model_path: Path to custom intent model file
            use_ai_recognition: Whether to use AI for intent recognition
            default_threshold: Default confidence threshold
        """
        self.intent_patterns = DEFAULT_INTENT_PATTERNS.copy()
        self.command_types = DEFAULT_COMMAND_TYPES.copy()
        self.intent_model = DEFAULT_INTENT_MODEL.copy()
        self.default_threshold = default_threshold
        self.use_ai_recognition = use_ai_recognition
        self.ai_client = None
        
        # Load custom model if provided
        if model_path:
            self._load_custom_model(model_path)
        
        # Try to initialize AI client if needed
        if use_ai_recognition:
            self._init_ai_client()
        
        # Log initialization
        log_prompt_activity("init_intent_recognizer", {
            "intent_count": len(self.intent_model["intents"]),
            "pattern_count": sum(len(patterns) for patterns in self.intent_patterns.values()),
            "use_ai_recognition": use_ai_recognition,
            "default_threshold": default_threshold
        })
    
    def _load_custom_model(self, model_path: str) -> None:
        """
        Load a custom intent model from file.
        
        Args:
            model_path: Path to the model file
        """
        try:
            with open(model_path, 'r') as f:
                model_data = json.load(f)
            
            # Update patterns if present
            if "intent_patterns" in model_data:
                self.intent_patterns.update(model_data["intent_patterns"])
            
            # Update command types if present
            if "command_types" in model_data:
                self.command_types = model_data["command_types"]
            
            # Update intent model if present
            if "intents" in model_data:
                # Replace or add intents
                intent_map = {intent["name"]: i for i, intent in enumerate(self.intent_model["intents"])}
                
                for intent in model_data["intents"]:
                    name = intent["name"]
                    if name in intent_map:
                        # Replace existing intent
                        self.intent_model["intents"][intent_map[name]] = intent
                    else:
                        # Add new intent
                        self.intent_model["intents"].append(intent)
                
            logger.info(f"Loaded custom intent model from {model_path}")
            
            # Log activity
            log_prompt_activity("load_custom_model", {
                "model_path": model_path,
                "intent_count": len(self.intent_model["intents"]),
                "pattern_count": sum(len(patterns) for patterns in self.intent_patterns.values())
            })
            
        except Exception as e:
            logger.error(f"Error loading custom intent model: {e}")
    
    def _init_ai_client(self) -> None:
        """Initialize AI client for intent recognition"""
        # Try to use OpenAI first
        try:
            import openai
            self.ai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            logger.info("Initialized OpenAI client for intent recognition")
            return
        except (ImportError, Exception) as e:
            logger.warning(f"Failed to initialize OpenAI client: {e}")
        
        # Try Anthropic Claude next
        try:
            import anthropic
            self.ai_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            logger.info("Initialized Anthropic client for intent recognition")
            return
        except (ImportError, Exception) as e:
            logger.warning(f"Failed to initialize Anthropic client: {e}")
        
        # Fall back to regex-only matching
        logger.warning("No AI clients available, falling back to regex-only matching")
        self.use_ai_recognition = False
    
    def recognize_intent(self, text: str) -> Intent:
        """
        Recognize intent from text.
        
        Args:
            text: Input text to recognize intent from
            
        Returns:
            Recognized intent
        """
        # Log the recognition attempt
        log_prompt_activity("recognize_intent", {
            "text": text[:100] + "..." if len(text) > 100 else text,
            "use_ai": self.use_ai_recognition
        })
        
        # Try AI recognition first if enabled
        if self.use_ai_recognition and self.ai_client:
            ai_intent = self._recognize_intent_ai(text)
            if ai_intent and ai_intent.confidence >= self.default_threshold:
                return ai_intent
        
        # Fall back to regex pattern matching
        regex_intent = self._recognize_intent_regex(text)
        
        # If AI intent exists but with low confidence, and regex also found something,
        # choose the higher confidence one
        if self.use_ai_recognition and 'ai_intent' in locals() and ai_intent and regex_intent:
            if ai_intent.confidence > regex_intent.confidence:
                return ai_intent
            else:
                return regex_intent
        
        # Return regex intent if found, or the low-confidence AI intent if that's all we have
        if regex_intent:
            return regex_intent
        elif self.use_ai_recognition and 'ai_intent' in locals() and ai_intent:
            return ai_intent
        
        # No intent recognized
        return Intent("unknown", confidence=0.0, raw_text=text)
    
    def _recognize_intent_regex(self, text: str) -> Optional[Intent]:
        """
        Recognize intent using regex patterns.
        
        Args:
            text: Input text
            
        Returns:
            Recognized intent or None
        """
        best_match = None
        best_confidence = 0.0
        best_params = {}
        
        # Try each pattern
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    # Confidence is static for regex matches, but we slightly
                    # boost confidence for longer patterns as they're more specific
                    confidence = 0.8 + min(0.15, len(pattern) / 1000)
                    
                    # Extract parameters based on capture groups
                    params = {}
                    for i, group in enumerate(match.groups()):
                        if group:  # Skip empty groups
                            # Prefer named groups if available, otherwise use positional
                            if match.lastgroup and match.lastgroup[i+1]:
                                param_name = match.lastgroup[i+1]
                            else:
                                # Default param names based on intent type
                                if intent_type == "create_feature":
                                    param_name = "feature_name"
                                elif intent_type == "run_feature":
                                    param_name = "feature_name"
                                elif intent_type == "view_screenshot":
                                    param_name = "screenshot_path"
                                elif intent_type == "view_design":
                                    param_name = "design_path"
                                elif intent_type == "clean_directory":
                                    param_name = "directory_path"
                                else:
                                    param_name = f"param{i+1}"
                            
                            params[param_name] = group
                    
                    # If better than current best, update
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = intent_type
                        best_params = params
        
        if best_match:
            # Log the match
            log_prompt_activity("regex_intent_match", {
                "intent_type": best_match,
                "confidence": best_confidence,
                "parameters": best_params
            })
            
            return Intent(best_match, best_confidence, best_params, text)
        
        return None
    
    def _recognize_intent_ai(self, text: str) -> Optional[Intent]:
        """
        Recognize intent using AI.
        
        Args:
            text: Input text
            
        Returns:
            Recognized intent or None
        """
        # Check if client is available
        if not self.ai_client:
            return None
        
        try:
            # Convert intent model to prompt format
            system_prompt = "You are an intent recognition system that extracts intents and parameters from natural language."
            
            # Create a list of available intents with their descriptions
            intent_descriptions = []
            for intent in self.intent_model["intents"]:
                description = f"- {intent['name']}: {intent['description']}"
                intent_descriptions.append(description)
            
            # Combine into the prompt
            intent_guide = "\n".join(intent_descriptions)
            
            # Create the prompt
            user_prompt = f"""Extract the intent and parameters from the following text:

"{text}"

Available intents:
{intent_guide}

Respond with a single JSON object with the following format:
{{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "parameters": {{
    "param1": "value1",
    "param2": "value2"
  }}
}}

If no intent can be determined, use "unknown" as the intent name with a confidence of 0.0.
"""
            
            # Call the appropriate API based on the client
            if hasattr(self.ai_client, "chat") and hasattr(self.ai_client.chat, "completions"):
                # OpenAI
                response = self.ai_client.chat.completions.create(
                    model="gpt-4o",  # or other model as appropriate
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,  # Low temperature for more deterministic results
                    response_format={"type": "json_object"}
                )
                
                response_text = response.choices[0].message.content
                
            elif hasattr(self.ai_client, "messages") and hasattr(self.ai_client.messages, "create"):
                # Anthropic Claude
                response = self.ai_client.messages.create(
                    model="claude-3-opus-20240229",  # or other model as appropriate
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    max_tokens=500
                )
                
                response_text = response.content[0].text
            
            else:
                logger.warning("Unsupported AI client type")
                return None
            
            # Parse JSON response
            result = json.loads(response_text)
            
            # Create intent from result
            intent = Intent(
                intent_type=result["intent"],
                confidence=result["confidence"],
                parameters=result.get("parameters", {}),
                raw_text=text
            )
            
            # Log the AI recognition
            log_prompt_activity("ai_intent_recognition", {
                "intent_type": intent.intent_type,
                "confidence": intent.confidence,
                "parameters": intent.parameters
            })
            
            return intent
            
        except Exception as e:
            logger.error(f"Error recognizing intent with AI: {e}")
            return None
    
    def get_intent_parameters(self, intent_type: str) -> List[Dict[str, Any]]:
        """
        Get parameter definitions for an intent type.
        
        Args:
            intent_type: Intent type to get parameters for
            
        Returns:
            List of parameter definitions
        """
        # Look up in intent model
        for intent in self.intent_model["intents"]:
            if intent["name"] == intent_type:
                return intent.get("parameters", [])
        
        # Not found
        return []
    
    def extract_parameters(self, intent_type: str, text: str) -> Dict[str, Any]:
        """
        Extract parameters for a specific intent from text.
        
        Args:
            intent_type: Intent type
            text: Text to extract parameters from
            
        Returns:
            Extracted parameters
        """
        # Get parameter definitions
        param_defs = self.get_intent_parameters(intent_type)
        if not param_defs:
            # If no definitions, try regex patterns
            return self._extract_parameters_regex(intent_type, text)
        
        # Try to use AI for parameter extraction if available
        if self.use_ai_recognition and self.ai_client:
            ai_params = self._extract_parameters_ai(intent_type, text, param_defs)
            if ai_params:
                return ai_params
        
        # Fall back to regex
        return self._extract_parameters_regex(intent_type, text)
    
    def _extract_parameters_regex(self, intent_type: str, text: str) -> Dict[str, Any]:
        """
        Extract parameters using regex patterns.
        
        Args:
            intent_type: Intent type
            text: Text to extract parameters from
            
        Returns:
            Extracted parameters
        """
        params = {}
        
        # Check if we have patterns for this intent
        if intent_type in self.intent_patterns:
            patterns = self.intent_patterns[intent_type]
            
            # Try each pattern
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    # Extract groups
                    for i, group in enumerate(match.groups()):
                        if group:
                            # Default parameter names based on intent type
                            if intent_type == "create_feature":
                                params["feature_name"] = group
                            elif intent_type == "run_feature":
                                params["feature_name"] = group
                            elif intent_type == "view_screenshot":
                                params["screenshot_path"] = group
                            elif intent_type == "view_design":
                                params["design_path"] = group
                            elif intent_type == "clean_directory":
                                params["directory_path"] = group
                            else:
                                params[f"param{i+1}"] = group
                    
                    # If we found parameters, return them
                    if params:
                        return params
        
        return params
    
    def _extract_parameters_ai(self, intent_type: str, text: str, 
                            param_defs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extract parameters using AI.
        
        Args:
            intent_type: Intent type
            text: Text to extract parameters from
            param_defs: Parameter definitions
            
        Returns:
            Extracted parameters
        """
        # Check if client is available
        if not self.ai_client:
            return {}
        
        try:
            # Create parameter descriptions
            param_descriptions = []
            for param in param_defs:
                required = " (required)" if param.get("required", False) else " (optional)"
                description = f"- {param['name']}: {param.get('description', 'No description')}{required}"
                param_descriptions.append(description)
            
            param_guide = "\n".join(param_descriptions)
            
            # Create the prompt
            system_prompt = "You are a parameter extraction system that extracts structured data from natural language."
            
            user_prompt = f"""Extract the parameters for the '{intent_type}' intent from the following text:

"{text}"

Parameters to extract:
{param_guide}

Respond with a single JSON object containing the extracted parameters:
{{
  "param1": "value1",
  "param2": "value2"
}}

If a parameter can't be extracted, omit it from the response. Ensure the parameter names match exactly those specified.
"""
            
            # Call the appropriate API based on the client
            if hasattr(self.ai_client, "chat") and hasattr(self.ai_client.chat, "completions"):
                # OpenAI
                response = self.ai_client.chat.completions.create(
                    model="gpt-4o",  # or other model as appropriate
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                
                response_text = response.choices[0].message.content
                
            elif hasattr(self.ai_client, "messages") and hasattr(self.ai_client.messages, "create"):
                # Anthropic Claude
                response = self.ai_client.messages.create(
                    model="claude-3-opus-20240229",  # or other model as appropriate
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.1,
                    max_tokens=500
                )
                
                response_text = response.content[0].text
            
            else:
                logger.warning("Unsupported AI client type")
                return {}
            
            # Parse JSON response
            params = json.loads(response_text)
            
            # Log the extraction
            log_prompt_activity("ai_parameter_extraction", {
                "intent_type": intent_type,
                "parameters": params
            })
            
            return params
            
        except Exception as e:
            logger.error(f"Error extracting parameters with AI: {e}")
            return {}
    
    def validate_parameters(self, intent_type: str, parameters: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate parameters for an intent.
        
        Args:
            intent_type: Intent type
            parameters: Parameters to validate
            
        Returns:
            Tuple of (valid, missing_required)
        """
        # Get parameter definitions
        param_defs = self.get_intent_parameters(intent_type)
        
        # If no definitions, all parameters are valid
        if not param_defs:
            return True, []
        
        # Check for required parameters
        missing = []
        for param in param_defs:
            if param.get("required", False) and param["name"] not in parameters:
                missing.append(param["name"])
        
        return len(missing) == 0, missing


class IntentProcessor:
    """Processes recognized intents into executable actions"""
    
    def __init__(self, recognizer: Optional[IntentRecognizer] = None):
        """
        Initialize the intent processor.
        
        Args:
            recognizer: Optional intent recognizer
        """
        self.recognizer = recognizer or IntentRecognizer()
        self.handlers = {}
        self.default_handler = None
        
        # Log initialization
        log_prompt_activity("init_intent_processor", {
            "handler_count": len(self.handlers)
        })
    
    def register_handler(self, intent_type: str, handler: Callable) -> None:
        """
        Register a handler for an intent type.
        
        Args:
            intent_type: Intent type to handle
            handler: Handler function
        """
        self.handlers[intent_type] = handler
        
        # Log registration
        log_prompt_activity("register_intent_handler", {
            "intent_type": intent_type,
            "handler": handler.__name__ if hasattr(handler, "__name__") else str(handler)
        })
    
    def register_default_handler(self, handler: Callable) -> None:
        """
        Register a default handler for unknown intents.
        
        Args:
            handler: Handler function
        """
        self.default_handler = handler
        
        # Log registration
        log_prompt_activity("register_default_handler", {
            "handler": handler.__name__ if hasattr(handler, "__name__") else str(handler)
        })
    
    def process_text(self, text: str) -> Dict[str, Any]:
        """
        Process text into an intent and execute the handler.
        
        Args:
            text: Input text
            
        Returns:
            Processing result
        """
        # Recognize intent
        intent = self.recognizer.recognize_intent(text)
        
        # Process the intent
        return self.process_intent(intent)
    
    def process_intent(self, intent: Intent) -> Dict[str, Any]:
        """
        Process a recognized intent.
        
        Args:
            intent: Recognized intent
            
        Returns:
            Processing result
        """
        # Log the processing attempt
        log_prompt_activity("process_intent", {
            "intent_type": intent.intent_type,
            "confidence": intent.confidence,
            "parameters": intent.parameters
        })
        
        # Validate parameters
        valid, missing = self.recognizer.validate_parameters(intent.intent_type, intent.parameters)
        
        # If invalid, try to extract missing parameters
        if not valid and missing:
            # Log the validation failure
            log_prompt_activity("intent_validation_failure", {
                "intent_type": intent.intent_type,
                "missing": missing
            })
            
            # Try to extract missing parameters
            extracted = self.recognizer.extract_parameters(intent.intent_type, intent.raw_text)
            for param in missing:
                if param in extracted:
                    intent.parameters[param] = extracted[param]
            
            # Revalidate
            valid, missing = self.recognizer.validate_parameters(intent.intent_type, intent.parameters)
        
        # Check if we have a handler for this intent
        if intent.intent_type in self.handlers:
            handler = self.handlers[intent.intent_type]
            
            try:
                # Execute handler with parameters
                result = handler(intent.parameters)
                
                # Log successful processing
                log_prompt_activity("intent_processed", {
                    "intent_type": intent.intent_type,
                    "success": True,
                    "parameters": intent.parameters
                })
                
                return {
                    "success": True,
                    "intent": intent.to_dict(),
                    "result": result
                }
            except Exception as e:
                # Log error
                logger.error(f"Error processing intent {intent.intent_type}: {e}")
                log_prompt_activity("intent_processing_error", {
                    "intent_type": intent.intent_type,
                    "error": str(e)
                })
                
                return {
                    "success": False,
                    "intent": intent.to_dict(),
                    "error": str(e)
                }
        
        # Try default handler if available
        elif self.default_handler:
            try:
                result = self.default_handler(intent)
                
                # Log default handling
                log_prompt_activity("default_intent_handler", {
                    "intent_type": intent.intent_type,
                    "success": True
                })
                
                return {
                    "success": True,
                    "intent": intent.to_dict(),
                    "result": result
                }
            except Exception as e:
                logger.error(f"Error in default handler for intent {intent.intent_type}: {e}")
                
                log_prompt_activity("default_handler_error", {
                    "intent_type": intent.intent_type,
                    "error": str(e)
                })
                
                return {
                    "success": False,
                    "intent": intent.to_dict(),
                    "error": str(e)
                }
        
        # No handler available
        return {
            "success": False,
            "intent": intent.to_dict(),
            "error": f"No handler registered for intent type: {intent.intent_type}"
        }


# Integration with AdaptivePromptManager
def integrate_with_prompt_manager(prompt_manager_path: str) -> bool:
    """
    Integrate the IntentRecognizer with the AdaptivePromptManager.
    
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
        if "IntentRecognizer" in content:
            logger.info("IntentRecognizer integration already exists")
            return True
        
        # Define the import for IntentRecognizer
        import_code = """
try:
    from .intent_recognition import IntentRecognizer, IntentProcessor
except ImportError:
    # If intent recognition not available, we'll use None
    IntentRecognizer = None
    IntentProcessor = None
"""
        
        # Define the integration code for initialization
        init_code = """
        # Initialize intent recognition if enabled
        self.intent_recognizer = None
        self.intent_processor = None
        
        if config.get("intent_recognition", {}).get("enabled", False) and IntentRecognizer:
            try:
                self.intent_recognizer = IntentRecognizer(
                    model_path=config.get("intent_recognition", {}).get("model_path"),
                    use_ai_recognition=config.get("intent_recognition", {}).get("use_ai", True)
                )
                
                # Create intent processor
                self.intent_processor = IntentProcessor(self.intent_recognizer)
                logger.info("Intent recognition system initialized")
            except Exception as e:
                logger.error(f"Failed to initialize intent recognition: {e}")
"""
        
        # Define methods for intent recognition
        methods_code = """
    def recognize_intent(self, text: str) -> Dict[str, Any]:
        """
        Recognize intent from text input.
        
        Args:
            text: Input text
            
        Returns:
            Intent recognition result
        """
        if not hasattr(self, "intent_recognizer") or not self.intent_recognizer:
            return {
                "success": False,
                "error": "Intent recognition not enabled"
            }
        
        try:
            # Recognize intent
            intent = self.intent_recognizer.recognize_intent(text)
            
            return {
                "success": True,
                "intent": intent.to_dict()
            }
        except Exception as e:
            logger.error(f"Error recognizing intent: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_intent(self, text: str) -> Dict[str, Any]:
        """
        Process text into an intent and execute the appropriate handler.
        
        Args:
            text: Input text
            
        Returns:
            Intent processing result
        """
        if not hasattr(self, "intent_processor") or not self.intent_processor:
            return {
                "success": False,
                "error": "Intent processing not enabled"
            }
        
        try:
            # Process the text
            result = self.intent_processor.process_text(text)
            return result
        except Exception as e:
            logger.error(f"Error processing text as intent: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def register_intent_handler(self, intent_type: str, handler: callable) -> bool:
        """
        Register a handler for an intent type.
        
        Args:
            intent_type: Intent type to handle
            handler: Handler function
            
        Returns:
            Success status
        """
        if not hasattr(self, "intent_processor") or not self.intent_processor:
            return False
        
        try:
            self.intent_processor.register_handler(intent_type, handler)
            return True
        except Exception as e:
            logger.error(f"Error registering intent handler: {e}")
            return False
"""
        
        # Find import location
        imports_end = content.find("# Configure logging")
        if imports_end == -1:
            imports_end = content.find("logger = logging.getLogger")
        
        # Insert imports
        content = content[:imports_end] + import_code + content[imports_end:]
        
        # Find init location
        init_end = content.find("# Log completion of initialization")
        if init_end == -1:
            init_end = content.find("log_prompt_activity(\"init_prompt_manager_complete\"")
        
        # Insert init code
        content = content[:init_end] + init_code + content[init_end:]
        
        # Find class end for methods
        class_end = content.find("if __name__ == \"__main__\":")
        
        # Insert methods
        content = content[:class_end] + methods_code + content[class_end:]
        
        # Write updated file
        with open(prompt_manager_path, 'w') as f:
            f.write(content)
        
        logger.info(f"Successfully integrated IntentRecognizer with {prompt_manager_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error integrating with prompt manager: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Intent Recognition System")
    parser.add_argument("--model", help="Path to custom intent model")
    parser.add_argument("--text", help="Text to recognize intent from")
    parser.add_argument("--intent", help="Intent type to extract parameters for")
    parser.add_argument("--list", action="store_true", help="List available intents")
    parser.add_argument("--integrate", help="Path to prompt_manager.py for integration")
    parser.add_argument("--no-ai", action="store_true", help="Disable AI recognition")
    
    args = parser.parse_args()
    
    # Create recognizer
    recognizer = IntentRecognizer(
        model_path=args.model,
        use_ai_recognition=not args.no_ai
    )
    
    # Handle integration
    if args.integrate:
        success = integrate_with_prompt_manager(args.integrate)
        if success:
            print(f"Successfully integrated with {args.integrate}")
        else:
            print(f"Failed to integrate with {args.integrate}")
        sys.exit(0)
    
    # List available intents
    if args.list:
        print("Available intents:")
        for intent in recognizer.intent_model["intents"]:
            print(f"- {intent['name']}: {intent['description']}")
            parameters = intent.get("parameters", [])
            if parameters:
                print("  Parameters:")
                for param in parameters:
                    required = " (required)" if param.get("required", False) else " (optional)"
                    print(f"  - {param['name']}: {param.get('description', 'No description')}{required}")
        sys.exit(0)
    
    # Recognize intent from text
    if args.text:
        intent = recognizer.recognize_intent(args.text)
        print(f"Recognized intent: {intent.intent_type}")
        print(f"Confidence: {intent.confidence:.2f}")
        print(f"Parameters: {intent.parameters}")
        
        # Try to extract additional parameters if requested
        if args.intent:
            print(f"\nExtracting parameters for intent {args.intent}:")
            params = recognizer.extract_parameters(args.intent, args.text)
            print(f"Extracted parameters: {params}")
            
            # Validate
            valid, missing = recognizer.validate_parameters(args.intent, params)
            print(f"Valid: {valid}")
            if not valid:
                print(f"Missing required parameters: {missing}")
        
        sys.exit(0)
    
    # Extract parameters for intent
    if args.intent:
        if not args.text:
            print("Error: --text is required for parameter extraction")
            sys.exit(1)
        
        params = recognizer.extract_parameters(args.intent, args.text)
        print(f"Extracted parameters for intent {args.intent}: {params}")
        
        # Validate
        valid, missing = recognizer.validate_parameters(args.intent, params)
        print(f"Valid: {valid}")
        if not valid:
            print(f"Missing required parameters: {missing}")
        
        sys.exit(0)
    
    # If no action specified, print help
    parser.print_help()