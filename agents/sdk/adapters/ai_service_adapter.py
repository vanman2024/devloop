#!/usr/bin/env python3
"""
AI Service Adapter for SDK-First Architecture

This module adapts the functionality of the original AIService to work with
the SDK-first architecture using OpenAI's Assistants API. It preserves the
core functionality while adapting it to the new architecture.
"""

import os
import sys
import json
import logging
import time
import uuid
from typing import Dict, List, Any, Optional, Union, Tuple

# Add parent directories to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.abspath(os.path.join(script_dir, "../../"))
if agents_dir not in sys.path:
    sys.path.append(agents_dir)

# Import SDK core
from sdk.core.agent import SDKAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(script_dir, "ai_service_adapter.log"))
    ]
)
logger = logging.getLogger(__name__)

class AIServiceAdapter:
    """Adapter for the AI Service to work with the SDK-first architecture."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the AI service adapter.
        
        Args:
            config_path: Path to configuration file. If None, uses default.
        """
        self.config = self._load_config(config_path)
        self.agent_instance = None
        self.context_id = str(uuid.uuid4())  # Generate a unique context ID
        self.contexts = {}  # Dictionary to store contexts
        logger.info("AI Service Adapter initialized")
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Load configuration from file or environment.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Dict containing configuration values
        """
        # Default configuration
        config = {
            "api_key": os.environ.get("OPENAI_API_KEY"),
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o"),
            "templates_dir": os.path.join(agents_dir, "templates/prompt"),
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
    
    def _get_or_create_agent(self) -> SDKAgent:
        """
        Get an existing agent or create a new one.
        
        Returns:
            An SDKAgent instance
        """
        if self.agent_instance is None:
            agent_config = {
                "agent_name": "ai-service-agent",
                "agent_type": "service",
                "instructions": "You are an AI service agent for the Devloop system, providing advanced text generation and processing capabilities.",
                "model": self.config.get("model", "gpt-4o"),
                "api_key": self.config.get("api_key"),
                "tools": [
                    {
                        "name": "extract_json",
                        "description": "Extract JSON from text content",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "content": {
                                    "type": "string",
                                    "description": "Text content to extract JSON from"
                                }
                            },
                            "required": ["content"]
                        }
                    },
                    {
                        "name": "extract_thinking",
                        "description": "Extract thinking steps from text content",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "content": {
                                    "type": "string",
                                    "description": "Text content to extract thinking from"
                                }
                            },
                            "required": ["content"]
                        }
                    }
                ]
            }
            
            # Create the agent instance
            self.agent_instance = SDKAgent(agent_config)
            
            # Add tool methods
            def extract_json(self, content: str) -> Dict[str, Any]:
                """Extract JSON from text content"""
                try:
                    import re
                    # Look for JSON blocks
                    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
                    if json_match:
                        json_str = json_match.group(1)
                        return json.loads(json_str)
                    
                    # Try to find JSON directly
                    json_match = re.search(r'(\{[\s\S]*\})', content)
                    if json_match:
                        json_str = json_match.group(1)
                        return json.loads(json_str)
                except Exception as e:
                    logger.warning(f"Could not extract JSON from content: {e}")
                
                # Return empty result if extraction fails
                return {"error": "Could not extract JSON from content"}
            
            def extract_thinking(self, content: str) -> Dict[str, Any]:
                """Extract thinking steps from text content"""
                try:
                    import re
                    
                    # Look for thinking tag
                    thinking_match = re.search(r'<thinking>([\s\S]*?)</thinking>', content)
                    if thinking_match:
                        thinking_text = thinking_match.group(1).strip()
                        
                        # Extract steps if present
                        steps = []
                        step_matches = re.finditer(r'(?:Step\s+(\d+)[:.]\s+)?(.*?)(?=Step\s+\d+[:.]\s+|$)', thinking_text, re.DOTALL)
                        
                        for match in step_matches:
                            step_num = match.group(1)
                            step_text = match.group(2).strip()
                            if step_text:
                                steps.append({
                                    "number": step_num or len(steps) + 1,
                                    "text": step_text
                                })
                        
                        return {
                            "thinking": thinking_text,
                            "steps": steps if steps else None
                        }
                except Exception as e:
                    logger.warning(f"Could not extract thinking from content: {e}")
                
                # Return the raw content if extraction fails
                return {"thinking": content}
            
            # Attach methods to the agent instance
            self.agent_instance.__class__.extract_json = extract_json
            self.agent_instance.__class__.extract_thinking = extract_thinking
        
        return self.agent_instance
    
    def process_command(self, command: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a command with AI assistance.
        
        Args:
            command: The command text to process
            context: Optional context information
            
        Returns:
            Dict containing the processing result
        """
        start_time = time.time()
        logger.info(f"Processing command: {command}")
        
        # Get or create context
        if context is None:
            context = {}
        
        # Update context with command
        context_id = context.get("context_id", self.context_id)
        self._update_context(context_id, {"last_command": command})
        
        # Get the agent instance
        agent = self._get_or_create_agent()
        
        # Process command with AI
        try:
            # Prepare system message with context
            context_info = self._get_context(context_id)
            system_message = f"""
            Process the following command. Use the provided context if relevant.
            
            Context:
            {json.dumps(context_info, indent=2)}
            
            When providing a response, if appropriate, include a JSON object with your structured result.
            """
            
            # Create prompt for the agent
            prompt = f"""
            {system_message}
            
            Command: {command}
            """
            
            # Execute the agent
            response = agent.execute(prompt)
            
            # Try to extract structured result
            try:
                # Call the extract_json tool
                result = json.loads(agent.execute(f"Extract JSON from this text:\n\n{response}"))
            except Exception:
                # If JSON extraction fails, use the raw response
                result = {"text": response}
            
            # Update context with result
            self._update_context(context_id, {"last_result": result})
            
            # Log completion
            elapsed_time = time.time() - start_time
            logger.info(f"Command processed in {elapsed_time:.2f}s")
            
            return {
                "success": True,
                "result": result,
                "context_id": context_id,
                "elapsed_time": elapsed_time
            }
            
        except Exception as e:
            logger.error(f"Error processing command: {e}")
            return {
                "success": False,
                "error": str(e),
                "context_id": context_id
            }
    
    def prompt_with_template(self, template_name: str, variables: Dict[str, Any], 
                            context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a prompt using a specific template.
        
        Args:
            template_name: Name of the template to use
            variables: Variables to substitute in the template
            context: Optional context information
            
        Returns:
            Dict containing the processing result
        """
        start_time = time.time()
        logger.info(f"Processing template: {template_name}")
        
        # Get or create context
        if context is None:
            context = {}
        
        context_id = context.get("context_id", self.context_id)
        
        # Add context to variables
        variables["context"] = self._get_context(context_id)
        
        # Get template content
        template_content = self._load_template(template_name)
        if not template_content:
            return {
                "success": False,
                "error": f"Template {template_name} not found",
                "context_id": context_id
            }
        
        try:
            # Render the template
            prompt = self._render_template(template_content, variables)
            
            # Get the agent instance
            agent = self._get_or_create_agent()
            
            # Call the agent
            response = agent.execute(prompt)
            
            # Update context
            self._update_context(context_id, {
                "last_template": template_name,
                "last_response": response
            })
            
            # Log completion
            elapsed_time = time.time() - start_time
            logger.info(f"Template processed in {elapsed_time:.2f}s")
            
            return {
                "success": True,
                "result": response,
                "context_id": context_id,
                "elapsed_time": elapsed_time
            }
            
        except Exception as e:
            logger.error(f"Error processing template: {e}")
            return {
                "success": False,
                "error": str(e),
                "context_id": context_id
            }
    
    def generate_text(self, prompt: str, context: Optional[Dict[str, Any]] = None, 
                    max_tokens: int = 1000, temperature: float = 0.7) -> str:
        """
        Generate text using the AI service. This method is used by create_milestone.py
        and other scripts that expect a simple text generation interface.
        
        Args:
            prompt: The prompt to generate text from
            context: Optional context information
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            
        Returns:
            Generated text as a string
        """
        start_time = time.time()
        logger.info(f"Generating text with prompt: {prompt[:50]}...")
        
        try:
            # Add system prompt from context if available
            system_prompt = None
            if context and "system_prompt" in context:
                system_prompt = context.get("system_prompt")
            
            # Create a complete prompt with system message if provided
            if system_prompt:
                full_prompt = f"""
                System instruction: {system_prompt}
                
                User prompt: {prompt}
                
                Please respond to the user prompt above, following the system instruction.
                """
            else:
                full_prompt = prompt
            
            # Get the agent instance
            agent = self._get_or_create_agent()
            
            # Call the agent (with temp/max_tokens as part of the prompt)
            response = agent.execute(f"""
            Please respond to the following prompt.
            Use a temperature of {temperature} (where higher means more creative).
            Keep your response concise, with approximately {max_tokens} tokens.
            
            PROMPT:
            {full_prompt}
            """)
            
            # Log completion
            elapsed_time = time.time() - start_time
            logger.info(f"Text generation completed in {elapsed_time:.2f}s")
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating text: {e}")
            raise e
    
    def thinking(self, prompt: str, max_tokens: int = 4000) -> Dict[str, Any]:
        """
        Perform deep thinking on a complex prompt.
        
        Args:
            prompt: The thinking prompt
            max_tokens: Maximum tokens for response
            
        Returns:
            Dict containing the thinking result
        """
        start_time = time.time()
        logger.info(f"Starting thinking process: {prompt[:50]}...")
        
        try:
            # Get the agent instance
            agent = self._get_or_create_agent()
            
            # Create thinking system message
            thinking_prompt = f"""
            I want you to think deeply about the following prompt.
            Break down your thinking process into clear, logical steps.
            
            Use the format:
            <thinking>
            Step 1: Initial analysis of the problem
            [Your detailed thoughts for step 1]
            
            Step 2: Exploring possible approaches
            [Your detailed thoughts for step 2]
            
            ...and so on
            </thinking>
            
            After your thinking process, provide a concise summary of your conclusion.
            
            PROMPT: {prompt}
            """
            
            # Execute the agent
            response = agent.execute(thinking_prompt)
            
            # Extract thinking from the response
            # Call the extract_thinking tool
            thinking_result = json.loads(agent.execute(f"Extract thinking from this text:\n\n{response}"))
            
            # Log completion
            elapsed_time = time.time() - start_time
            logger.info(f"Thinking completed in {elapsed_time:.2f}s")
            
            return {
                "success": True,
                "result": thinking_result,
                "elapsed_time": elapsed_time
            }
            
        except Exception as e:
            logger.error(f"Error in thinking process: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _load_template(self, template_name: str) -> Optional[str]:
        """
        Load a template from file.
        
        Args:
            template_name: Name of the template to load
            
        Returns:
            Template content as string or None if not found
        """
        templates_dir = self.config.get("templates_dir")
        if not templates_dir:
            logger.error("Templates directory not configured")
            return None
        
        # Try different extensions
        for ext in [".txt", ".md", ".json"]:
            template_path = os.path.join(templates_dir, f"{template_name}{ext}")
            if os.path.exists(template_path):
                try:
                    with open(template_path, 'r') as f:
                        return f.read()
                except Exception as e:
                    logger.error(f"Error loading template {template_path}: {e}")
                    return None
        
        logger.warning(f"Template {template_name} not found in {templates_dir}")
        return None
    
    def _render_template(self, template: str, variables: Dict[str, Any]) -> str:
        """
        Render a template with variables.
        
        Args:
            template: Template content
            variables: Variables to substitute
            
        Returns:
            Rendered template as string
        """
        rendered = template
        
        # Simple variable substitution
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, indent=2)
            else:
                value_str = str(value)
            rendered = rendered.replace(placeholder, value_str)
        
        return rendered
    
    def _get_context(self, context_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get a context by ID or the current context.
        
        Args:
            context_id: Optional context ID
            
        Returns:
            Context dictionary
        """
        if context_id is None:
            context_id = self.context_id
        
        # Return existing context or create new one
        if context_id not in self.contexts:
            self.contexts[context_id] = {
                "id": context_id,
                "created_at": time.time(),
                "last_updated": time.time()
            }
        
        return self.contexts[context_id]
    
    def _update_context(self, context_id: Optional[str], data: Dict[str, Any]) -> None:
        """
        Update a context with new data.
        
        Args:
            context_id: Context ID to update
            data: Data to add to the context
        """
        context = self._get_context(context_id)
        context.update(data)
        context["last_updated"] = time.time()
        self.contexts[context_id] = context


# CLI interface for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="AI Service Adapter")
    parser.add_argument("command", help="Command to process")
    parser.add_argument("--config", help="Path to configuration file")
    parser.add_argument("--thinking", action="store_true", help="Use thinking mode")
    parser.add_argument("--template", help="Template to use")
    parser.add_argument("--vars", help="Variables for template (JSON)")
    
    args = parser.parse_args()
    
    service = AIServiceAdapter(config_path=args.config)
    
    if args.thinking:
        result = service.thinking(args.command)
    elif args.template:
        vars_dict = {}
        if args.vars:
            vars_dict = json.loads(args.vars)
        result = service.prompt_with_template(args.template, vars_dict)
    else:
        result = service.process_command(args.command)
    
    print(json.dumps(result, indent=2))