#!/usr/bin/env python3
"""
PromptManager - Agent Template Management System

Centralized template management for the Devloop agent architecture.
Provides template loading, validation, and rendering services.
"""

import os
import sys
import json
import logging
import time
import re
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("prompt_manager")

class TemplateVariable:
    """Class representing a variable in a prompt template"""
    
    def __init__(self, name: str, default_value: Optional[str] = None, 
                 description: Optional[str] = None, required: bool = False):
        """Initialize a template variable
        
        Args:
            name: Variable name
            default_value: Default value if not provided
            description: Description of the variable
            required: Whether the variable is required
        """
        self.name = name
        self.default_value = default_value
        self.description = description or f"Value for {name}"
        self.required = required
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "default_value": self.default_value,
            "description": self.description,
            "required": self.required
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TemplateVariable':
        """Create from dictionary"""
        return cls(
            name=data["name"],
            default_value=data.get("default_value"),
            description=data.get("description"),
            required=data.get("required", False)
        )

class Template:
    """Class representing a prompt template"""
    
    def __init__(self, name: str, template: str, description: Optional[str] = None,
                 variables: Optional[List[TemplateVariable]] = None,
                 tags: Optional[List[str]] = None, version: str = "1.0.0",
                 prompt_type: str = "command", created_at: Optional[str] = None):
        """Initialize a prompt template
        
        Args:
            name: Template name
            template: Template text with {variable} placeholders
            description: Template description
            variables: List of template variables
            tags: Tags for categorization
            version: Template version
            prompt_type: Type of prompt (command, response, evaluation, handoff)
            created_at: Creation timestamp
        """
        self.name = name
        self.template = template
        self.description = description or f"Template for {name}"
        self.variables = variables or []
        self.tags = tags or []
        self.version = version
        self.prompt_type = prompt_type
        self.created_at = created_at or time.strftime("%Y-%m-%dT%H:%M:%SZ")
        self.usage_count = 0
        self.success_count = 0
        self.last_used = None
        self.performance_score = 0.0
        
        # Extract variable names from template
        pattern = r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}'
        extracted_vars = set(re.findall(pattern, template))
        defined_vars = {var.name for var in self.variables}
        
        # Add any missing variables from the template
        for var_name in extracted_vars:
            if var_name not in defined_vars:
                self.variables.append(TemplateVariable(var_name))
    
    def render(self, variables: Dict[str, Any]) -> str:
        """Render the template with the provided variables
        
        Args:
            variables: Dictionary of variable values
            
        Returns:
            Rendered template
            
        Raises:
            ValueError: If a required variable is missing
        """
        # Check for required variables
        for var in self.variables:
            if var.required and var.name not in variables and var.default_value is None:
                raise ValueError(f"Required variable '{var.name}' missing")
        
        # Combine provided variables with defaults
        all_vars = {}
        for var in self.variables:
            if var.name in variables:
                all_vars[var.name] = variables[var.name]
            elif var.default_value is not None:
                all_vars[var.name] = var.default_value
        
        # Format string with variables
        try:
            result = self.template.format(**all_vars)
            
            # Update usage statistics
            self.usage_count += 1
            self.last_used = int(time.time())
            
            return result
        except KeyError as e:
            missing_var = str(e).strip("'")
            raise ValueError(f"Variable '{missing_var}' referenced in template but not provided") from e
    
    def record_feedback(self, success: bool, score: Optional[float] = None) -> None:
        """Record feedback for this template
        
        Args:
            success: Whether the template was successful
            score: Optional performance score (0.0 to 1.0)
        """
        if success:
            self.success_count += 1
        
        if score is not None:
            # Moving average of performance scores
            if self.usage_count > 1:
                self.performance_score = (self.performance_score * (self.usage_count - 1) + score) / self.usage_count
            else:
                self.performance_score = score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "created_at": self.created_at,
            "prompt_type": self.prompt_type,
            "template": self.template,
            "variables": [var.to_dict() for var in self.variables],
            "tags": self.tags,
            "usage_count": self.usage_count,
            "success_count": self.success_count,
            "last_used": self.last_used,
            "performance_score": self.performance_score
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Template':
        """Create template from dictionary"""
        # Handle variables
        variables = [TemplateVariable.from_dict(var) for var in data.get("variables", [])]
        if "variables" in data and isinstance(data["variables"], list) and \
           all(isinstance(v, str) for v in data["variables"]):
            # Handle simple variable name list
            variables = [TemplateVariable(name=var) for var in data["variables"]]
            
        template = cls(
            name=data["name"],
            template=data["template"],
            description=data.get("description"),
            variables=variables,
            tags=data.get("tags", []),
            version=data.get("version", "1.0.0"),
            prompt_type=data.get("prompt_type", "command"),
            created_at=data.get("created_at")
        )
        
        # Set statistics if available
        template.usage_count = data.get("usage_count", 0)
        template.success_count = data.get("success_count", 0)
        template.last_used = data.get("last_used")
        template.performance_score = data.get("performance_score", 0.0)
        
        return template
    
    @classmethod
    def from_file(cls, file_path: str) -> 'Template':
        """Load template from a JSON file
        
        Args:
            file_path: Path to the template JSON file
            
        Returns:
            Template instance
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls.from_dict(data)


class PromptManager:
    """Manager for prompt templates in the agent architecture"""
    
    def __init__(self, primary_template_dir: str, agent_template_dir: Optional[str] = None):
        """Initialize the prompt manager
        
        Args:
            primary_template_dir: Path to the central template directory
            agent_template_dir: Path to agent-specific templates (optional)
        """
        self.primary_template_dir = primary_template_dir
        self.agent_template_dir = agent_template_dir
        self.templates: Dict[str, Template] = {}
        self.template_dirs: Dict[str, List[str]] = {
            "commands": ["commands"],
            "responses": ["responses"],
            "evaluations": ["evaluations"],
            "handoffs": ["handoffs"],
            "adaptive": ["adaptive"]
        }
        self.load_templates()
    
    def load_templates(self) -> None:
        """Load templates from primary and agent directories"""
        # Load from primary directory
        self._load_from_directory(self.primary_template_dir)
        
        # Load from agent directory if specified
        if self.agent_template_dir and os.path.exists(self.agent_template_dir):
            self._load_from_directory(self.agent_template_dir)
    
    def _load_from_directory(self, base_dir: str) -> None:
        """Load templates from a directory and its subdirectories
        
        Args:
            base_dir: Base directory to load from
        """
        if not os.path.exists(base_dir):
            logger.warning(f"Template directory does not exist: {base_dir}")
            return
        
        # Load templates directly in the base directory
        for file in os.listdir(base_dir):
            if file.endswith('.json'):
                self._load_template_file(os.path.join(base_dir, file))
        
        # Load templates from subdirectories
        for subdir in os.listdir(base_dir):
            subdir_path = os.path.join(base_dir, subdir)
            if os.path.isdir(subdir_path):
                for file in os.listdir(subdir_path):
                    if file.endswith('.json'):
                        self._load_template_file(os.path.join(subdir_path, file))
    
    def _load_template_file(self, file_path: str) -> None:
        """Load a template from a JSON file
        
        Args:
            file_path: Path to the template JSON file
        """
        try:
            template = Template.from_file(file_path)
            self.templates[template.name] = template
            logger.info(f"Loaded template: {template.name} ({file_path})")
        except Exception as e:
            logger.error(f"Error loading template file {file_path}: {e}")
    
    def get_template(self, name: str) -> Optional[Template]:
        """Get a template by name
        
        Args:
            name: Template name
            
        Returns:
            Template or None if not found
        """
        return self.templates.get(name)
    
    def render_template(self, name: str, variables: Dict[str, Any]) -> str:
        """Render a template with the provided variables
        
        Args:
            name: Template name
            variables: Dictionary of variable values
            
        Returns:
            Rendered template
            
        Raises:
            ValueError: If the template is not found or required variables are missing
        """
        template = self.get_template(name)
        if not template:
            raise ValueError(f"Template not found: {name}")
        return template.render(variables)
    
    def find_templates(self, prompt_type: Optional[str] = None, 
                     tags: Optional[List[str]] = None, 
                     text: Optional[str] = None) -> List[Template]:
        """Find templates matching type, tags and/or containing text
        
        Args:
            prompt_type: Type of prompt (command, response, evaluation, handoff)
            tags: List of tags to filter by
            text: Text to search for in name or description
            
        Returns:
            List of matching templates
        """
        results = list(self.templates.values())
        
        # Filter by prompt type if provided
        if prompt_type:
            results = [t for t in results if t.prompt_type == prompt_type]
        
        # Filter by tags if provided
        if tags:
            results = [t for t in results if any(tag in t.tags for tag in tags)]
        
        # Filter by text if provided
        if text:
            text = text.lower()
            results = [t for t in results if 
                      text in t.name.lower() or 
                      text in t.description.lower()]
        
        return results
    
    def select_best_template(self, prompt_type: str, tags: Optional[List[str]] = None) -> Optional[Template]:
        """Select the best template based on type, tags, and performance
        
        Args:
            prompt_type: Type of prompt (command, response, evaluation, handoff)
            tags: List of tags to filter by
            
        Returns:
            Best matching template or None if no matches
        """
        # Find templates matching type and tags
        candidates = self.find_templates(prompt_type=prompt_type, tags=tags)
        
        if not candidates:
            return None
        
        # Sort by performance score, then by usage count
        candidates.sort(key=lambda t: (t.performance_score, t.usage_count), reverse=True)
        
        return candidates[0]
    
    def save_templates(self, directory: Optional[str] = None) -> None:
        """Save all templates to a directory
        
        Args:
            directory: Directory to save to (defaults to primary_template_dir)
        """
        save_dir = directory or self.primary_template_dir
        if not save_dir:
            logger.error("No template directory specified for saving")
            return
        
        os.makedirs(save_dir, exist_ok=True)
        
        for name, template in self.templates.items():
            # Determine subdirectory based on prompt type
            subdir = template.prompt_type + "s"  # e.g., "command" -> "commands"
            subdir_path = os.path.join(save_dir, subdir)
            os.makedirs(subdir_path, exist_ok=True)
            
            # Save to the appropriate subdirectory
            filename = os.path.join(subdir_path, f"{name}.json")
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(template.to_dict(), f, indent=2)
                logger.info(f"Saved template: {name} to {filename}")
            except Exception as e:
                logger.error(f"Error saving template {name}: {e}")
    
    def record_feedback(self, template_name: str, success: bool, 
                     score: Optional[float] = None) -> None:
        """Record feedback for a template
        
        Args:
            template_name: Template name
            success: Whether the template was successful
            score: Optional performance score (0.0 to 1.0)
        """
        template = self.get_template(template_name)
        if template:
            template.record_feedback(success, score)
            logger.info(f"Recorded feedback for template {template_name}: success={success}, score={score}")
    
    def validate_required_templates(self, template_names: List[str]) -> List[str]:
        """Validate that required templates are available
        
        Args:
            template_names: List of required template names
            
        Returns:
            List of missing template names
        """
        missing = []
        for name in template_names:
            if not self.get_template(name):
                missing.append(name)
                logger.warning(f"Required template not found: {name}")
        return missing


# Direct usage example
if __name__ == "__main__":
    # Example usage
    template_dir = "/mnt/c/Users/angel/Devloop/agents/templates"
    manager = PromptManager(template_dir)
    
    # Show available templates
    print("Available templates:")
    for name, template in manager.templates.items():
        print(f"- {name} ({template.prompt_type}): {template.description}")
    
    # Render a template
    if "agent_command" in manager.templates:
        rendered = manager.render_template("agent_command", {
            "agent_id": "example-agent",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "action": "test_rendering",
            "parameters": "param1=value1&param2=value2",
            "deadline": "1h",
            "priority": "medium",
            "output_format": "json",
            "examples": "Example usage"
        })
        print("\nRendered template:")
        print(rendered)