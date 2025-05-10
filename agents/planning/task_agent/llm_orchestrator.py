#!/usr/bin/env python3
"""
LLM Orchestrator for Task Agent

This module provides a structured interface for interacting with large language models
using the OpenAI SDK architecture. It manages prompt templates, API calls, and response
processing for the Task Agent.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
import time
import uuid
from datetime import datetime

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('llm_orchestrator')

# Import required libraries
# Import OpenAI
import openai
from openai import OpenAI
OPENAI_AVAILABLE = True
logger.info("OpenAI library available")

# Import LLM connector
LLM_CONNECTOR_AVAILABLE = True

# Import the LLM connector from feature_creation
try:
    from agents.planning.feature_creation.llm_connector import LLMConnector
    LLM_CONNECTOR_AVAILABLE = True
    logger.info("LLMConnector available")
except ImportError:
    logger.warning("LLMConnector not available")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'llm_orchestrator.log'))
    ]
)
logger = logging.getLogger('llm_orchestrator')

class LLMOrchestrator:
    """Orchestrates interactions with large language models using the OpenAI SDK architecture"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the LLM Orchestrator with configuration
        
        Args:
            config: Configuration dictionary for the orchestrator
        """
        self.config = config or {}
        self.model = self.config.get('llm_model', 'gpt-4-0125-preview')
        self.prompt_templates_path = self.config.get('prompt_templates_path', 
                                                    os.path.join(os.path.dirname(__file__), 
                                                                'templates', 'prompt_templates.json'))
        self.prompt_templates = self._load_prompt_templates()
        
        # Initialize OpenAI client if available
        self.client = None
        if OPENAI_AVAILABLE:
            try:
                self.client = OpenAI()
                logger.info("OpenAI client initialized")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {e}")
        
        # Initialize LLMConnector as fallback
        self.llm_connector = None
        if LLM_CONNECTOR_AVAILABLE:
            try:
                self.llm_connector = LLMConnector()
                logger.info("LLMConnector initialized as fallback")
            except Exception as e:
                logger.error(f"Error initializing LLMConnector: {e}")
        
        # Log warning if neither is available
        if not OPENAI_AVAILABLE and not LLM_CONNECTOR_AVAILABLE:
            logger.warning("Neither OpenAI nor LLMConnector is available - using mock responses")
        
        # Tracking for rate limiting and telemetry
        self.request_count = 0
        self.token_usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
        self.request_history = []
        
        logger.info(f"LLM Orchestrator initialized with model {self.model}")
    
    def _load_prompt_templates(self) -> Dict[str, Any]:
        """
        Load prompt templates from the specified path
        
        Returns:
            Dictionary of prompt templates
        """
        if not os.path.exists(self.prompt_templates_path):
            logger.warning(f"Prompt templates file not found at {self.prompt_templates_path}, using empty templates")
            return {}
        
        try:
            with open(self.prompt_templates_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading prompt templates: {e}")
            return {}
    
    def get_prompt_template(self, template_name: str) -> Dict[str, Any]:
        """
        Get a prompt template by name
        
        Args:
            template_name: Name of the template to retrieve
            
        Returns:
            Prompt template dictionary or empty dictionary if not found
        """
        return self.prompt_templates.get(template_name, {})
    
    def _format_prompt(self, template_name: str, parameters: Dict[str, Any]) -> Tuple[str, str, Dict[str, Any]]:
        """
        Format a prompt template with parameters
        
        Args:
            template_name: Name of the template to use
            parameters: Parameters to substitute in the template
            
        Returns:
            Tuple of (system_message, user_message, template_config)
        """
        template = self.get_prompt_template(template_name)
        if not template:
            # Use a basic default if template not found
            system_message = f"You are an AI assistant helping with task '{template_name}'."
            user_message = f"Help with this task using the following information: {json.dumps(parameters)}"
            return system_message, user_message, {}
        
        # Get the system and user messages from the template
        system_message = template.get('system', "You are an AI assistant specialized in software engineering tasks.")
        user_message = template.get('user', "")
        
        # Format the user message with parameters
        for key, value in parameters.items():
            if isinstance(value, (list, dict)):
                placeholder = f"{{{key}}}"
                json_value = json.dumps(value, indent=2)
                user_message = user_message.replace(placeholder, json_value)
                
                # Also handle _json suffix for explicit JSON formatting
                json_placeholder = f"{{{key}_json}}"
                user_message = user_message.replace(json_placeholder, json_value)
            else:
                placeholder = f"{{{key}}}"
                str_value = str(value)
                user_message = user_message.replace(placeholder, str_value)
        
        # Get other template config
        template_config = {
            "temperature": template.get('temperature', 0.7),
            "response_format": template.get('response_format', None)
        }
        
        return system_message, user_message, template_config
    
    def generate(self, template_name: str, parameters: Dict[str, Any]) -> Any:
        """
        Generate a response using the specified template and parameters
        
        Args:
            template_name: Name of the template to use
            parameters: Parameters to substitute in the template
            
        Returns:
            Generated response, could be text or parsed JSON based on the template
        """
        system_message, user_message, template_config = self._format_prompt(template_name, parameters)
        
        # Track request
        request_id = str(uuid.uuid4())
        request_time = datetime.now().isoformat()
        self.request_count += 1
        
        # Try OpenAI client first if available
        if self.client:
            try:
                # Prepare messages
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ]
                
                # Get response format
                response_format = template_config.get('response_format')
                kwargs = {}
                if response_format:
                    kwargs["response_format"] = response_format
                
                # Call the API
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=template_config.get('temperature', 0.7),
                    **kwargs
                )
                
                # Extract content
                content = response.choices[0].message.content
                
                # Update token usage
                if hasattr(response, 'usage'):
                    self.token_usage["prompt_tokens"] += response.usage.prompt_tokens
                    self.token_usage["completion_tokens"] += response.usage.completion_tokens
                    self.token_usage["total_tokens"] += response.usage.total_tokens
                
                # Log request
                self.request_history.append({
                    "id": request_id,
                    "template": template_name,
                    "timestamp": request_time,
                    "status": "success",
                    "model": self.model,
                    "tokens": response.usage.total_tokens if hasattr(response, 'usage') else None
                })
                
                # Try to parse JSON if response_format is json_object
                if response_format and response_format.get('type') == 'json_object':
                    try:
                        return json.loads(content)
                    except json.JSONDecodeError:
                        logger.warning(f"Response was not valid JSON despite json_object format being requested")
                        return content
                
                return content
            
            except Exception as e:
                logger.error(f"Error generating with OpenAI client: {e}")
                # Log error request
                self.request_history.append({
                    "id": request_id,
                    "template": template_name,
                    "timestamp": request_time,
                    "status": "error",
                    "error": str(e),
                    "model": self.model
                })
        
        # Fall back to LLMConnector if available
        if self.llm_connector:
            try:
                # Combine messages for simplicity since LLMConnector might not support multiple messages
                combined_prompt = f"{system_message}\n\n{user_message}"
                
                response = self.llm_connector.generate(combined_prompt)
                
                # Log request
                self.request_history.append({
                    "id": request_id,
                    "template": template_name,
                    "timestamp": request_time,
                    "status": "success (fallback)",
                    "model": "fallback_model"
                })
                
                # Try to parse JSON if response_format is json_object
                if template_config.get('response_format') and template_config['response_format'].get('type') == 'json_object':
                    try:
                        # Find JSON in the response
                        json_start = response.find('{')
                        json_end = response.rfind('}') + 1
                        if json_start >= 0 and json_end > json_start:
                            json_str = response[json_start:json_end]
                            return json.loads(json_str)
                    except json.JSONDecodeError:
                        logger.warning(f"Response was not valid JSON despite json_object format being requested")
                        pass
                
                return response
            
            except Exception as e:
                logger.error(f"Error generating with LLMConnector: {e}")
                # Log error request
                self.request_history.append({
                    "id": request_id,
                    "template": template_name,
                    "timestamp": request_time,
                    "status": "error (fallback)",
                    "error": str(e),
                    "model": "fallback_model"
                })
        
        # If all methods fail, return an error message
        error_message = "Unable to generate response. No LLM service available."
        logger.error(error_message)
        return error_message
    
    def generate_tasks_from_feature(self, feature_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate tasks from a feature using the task_extraction template
        
        Args:
            feature_data: Feature data dictionary
            
        Returns:
            List of extracted tasks
        """
        parameters = {
            "feature_name": feature_data.get("name", ""),
            "feature_description": feature_data.get("description", ""),
            "domain": feature_data.get("domain", ""),
            "purpose": feature_data.get("purpose", ""),
            "requirements": feature_data.get("requirements", []),
            "user_stories": feature_data.get("user_stories", [])
        }
        
        try:
            result = self.generate("task_extraction", parameters)
            
            # Handle the response based on type
            if isinstance(result, list):
                # Already parsed as JSON
                return result
            elif isinstance(result, dict) and "tasks" in result:
                # Response was structured with a tasks field
                return result["tasks"]
            elif isinstance(result, str):
                # Try to extract JSON from string
                try:
                    # Find JSON array in the response
                    json_start = result.find('[')
                    json_end = result.rfind(']') + 1
                    
                    if json_start >= 0 and json_end > json_start:
                        tasks_json = result[json_start:json_end]
                        tasks = json.loads(tasks_json)
                        return tasks
                except json.JSONDecodeError:
                    logger.error("Failed to parse JSON from response")
            
            logger.error(f"Unexpected response format from task_extraction: {type(result)}")
            return []
            
        except Exception as e:
            logger.error(f"Error generating tasks from feature: {e}")
            return []
    
    def analyze_task_dependencies(self, feature_name: str, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze dependencies between tasks
        
        Args:
            feature_name: Name of the feature
            tasks: List of tasks to analyze
            
        Returns:
            List of tasks with dependencies
        """
        parameters = {
            "feature_name": feature_name,
            "tasks": tasks,
            "tasks_json": json.dumps(tasks, indent=2)
        }
        
        try:
            result = self.generate("dependency_analysis", parameters)
            
            # Handle the response based on type
            if isinstance(result, list):
                # Create a mapping from task_id to dependencies
                dependency_map = {}
                for item in result:
                    task_id = item.get("task_id")
                    depends_on = item.get("depends_on", [])
                    if task_id:
                        dependency_map[task_id] = depends_on
                
                # Apply dependencies to original tasks
                for task in tasks:
                    task_id = task.get("id")
                    if task_id and task_id in dependency_map:
                        task["depends_on"] = dependency_map[task_id]
                    else:
                        task["depends_on"] = []
                
                return tasks
            
            logger.error(f"Unexpected response format from dependency_analysis: {type(result)}")
            return tasks
            
        except Exception as e:
            logger.error(f"Error analyzing task dependencies: {e}")
            # Return original tasks without dependencies
            for task in tasks:
                task["depends_on"] = []
            return tasks
    
    def estimate_task_complexity(self, feature_name: str, domain: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estimate complexity and effort for a task
        
        Args:
            feature_name: Name of the feature
            domain: Domain of the feature
            task: Task to estimate
            
        Returns:
            Updated task with complexity estimation
        """
        parameters = {
            "feature_name": feature_name,
            "domain": domain,
            "task_name": task.get("name", ""),
            "task_description": task.get("description", "")
        }
        
        try:
            result = self.generate("task_estimation", parameters)
            
            # Handle the response based on type
            if isinstance(result, dict):
                # Apply estimation to task
                task["complexity"] = result.get("complexity", task.get("complexity", "medium"))
                task["priority"] = result.get("priority", task.get("priority", "medium"))
                task["estimated_hours"] = result.get("estimated_hours", task.get("estimated_hours", 4))
                task["estimation_reasoning"] = result.get("reasoning", "Estimated by AI")
            
            return task
            
        except Exception as e:
            logger.error(f"Error estimating task complexity: {e}")
            return task
    
    def generate_task_summary(self, feature_name: str, tasks: List[Dict[str, Any]]) -> str:
        """
        Generate a summary of tasks for a feature
        
        Args:
            feature_name: Name of the feature
            tasks: List of tasks
            
        Returns:
            Summary text
        """
        parameters = {
            "feature_name": feature_name,
            "tasks": tasks,
            "tasks_json": json.dumps(tasks, indent=2)
        }
        
        try:
            return self.generate("task_summary", parameters)
        except Exception as e:
            logger.error(f"Error generating task summary: {e}")
            return f"Generated {len(tasks)} tasks for feature '{feature_name}'."
    
    def get_usage_statistics(self) -> Dict[str, Any]:
        """
        Get usage statistics for the LLM Orchestrator
        
        Returns:
            Dictionary with usage statistics
        """
        return {
            "request_count": self.request_count,
            "token_usage": self.token_usage.copy(),
            "recent_requests": self.request_history[-10:] if self.request_history else []
        }

# Singleton instance
_orchestrator_instance = None

def get_llm_orchestrator(config: Optional[Dict[str, Any]] = None) -> LLMOrchestrator:
    """
    Get the singleton instance of the LLM Orchestrator
    
    Args:
        config: Optional configuration to override defaults
        
    Returns:
        LLMOrchestrator instance
    """
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = LLMOrchestrator(config)
    elif config:
        # Update config if provided
        _orchestrator_instance.config.update(config)
    return _orchestrator_instance