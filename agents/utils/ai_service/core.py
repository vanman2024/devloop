#!/usr/bin/env python3
"""
AI Service Core Module

Provides AI capabilities to all agents in the Devloop system.
Adapted from the preserved scripts AI service layer.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ai_service")

class ClaudeClient:
    """Client for Claude API interactions"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-sonnet-20240229"):
        """Initialize the Claude client
        
        Args:
            api_key: Anthropic API key (defaults to environment variable)
            model: Model to use for completions
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.model = model
        
        if not self.api_key:
            logger.warning("No API key provided. Functionality will be limited.")
            
        # Import Anthropic client if available
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
            self.anthropic_available = True
            logger.info(f"Anthropic client initialized with model {model}")
        except ImportError:
            logger.warning("Anthropic package not available. Using mock implementation.")
            self.client = None
            self.anthropic_available = False
    
    def complete(self, prompt: str, 
                system_prompt: Optional[str] = None,
                max_tokens: int = 1000,
                temperature: float = 0.7) -> str:
        """Generate a completion from Claude
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Generated text from Claude
        """
        if not self.anthropic_available or not self.api_key:
            logger.warning("Using mock response due to missing API key or package")
            return self._mock_completion(prompt)
        
        try:
            # Prepare messages
            messages = [{"role": "user", "content": prompt}]
            
            # Send request to Claude
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=messages
            )
            
            # Extract and return content
            return response.content[0].text
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return f"Error: {str(e)}"
    
    def _mock_completion(self, prompt: str) -> str:
        """Generate a mock completion for testing
        
        Args:
            prompt: The user prompt
            
        Returns:
            Mock response text
        """
        if "analyze" in prompt.lower():
            return "Mock analysis: The system appears to be in good health with no critical issues detected."
        elif "suggest" in prompt.lower():
            return "Mock suggestion: Consider optimizing the database queries for better performance."
        elif "error" in prompt.lower():
            return "Mock troubleshooting: The error is likely caused by a missing configuration file. Check if config.json exists."
        else:
            return "Mock response: I've processed your request. Everything looks good."


class ContextManager:
    """Manages context for AI interactions"""
    
    def __init__(self, max_tokens: int = 16000):
        """Initialize the context manager
        
        Args:
            max_tokens: Maximum context tokens to maintain
        """
        self.max_tokens = max_tokens
        self.context_items = []
        self.system_prompt = None
    
    def add_system_prompt(self, prompt: str) -> None:
        """Set the system prompt
        
        Args:
            prompt: System prompt text
        """
        self.system_prompt = prompt
    
    def add(self, content: str, role: str = "user", importance: float = 1.0,
           metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add an item to the context
        
        Args:
            content: Content text
            role: Role (user, assistant, system)
            importance: Importance factor (0.0-1.0)
            metadata: Additional metadata
        """
        self.context_items.append({
            "content": content,
            "role": role,
            "importance": importance,
            "timestamp": time.time(),
            "metadata": metadata or {}
        })
        
        # Trim context if needed
        self._trim_context()
    
    def _trim_context(self) -> None:
        """Trim context to stay within token limit"""
        # Simple estimation: assume 4 chars per token
        total_chars = sum(len(item["content"]) for item in self.context_items)
        estimated_tokens = total_chars / 4
        
        if estimated_tokens > self.max_tokens:
            # Sort by importance (descending) and timestamp (descending)
            self.context_items.sort(key=lambda x: (-x["importance"], -x["timestamp"]))
            
            # Keep removing items until under limit
            while estimated_tokens > self.max_tokens and len(self.context_items) > 1:
                # Remove the least important item
                removed = self.context_items.pop()
                estimated_tokens -= len(removed["content"]) / 4
    
    def get_context(self, format_type: str = "claude") -> Union[List[Dict[str, str]], str]:
        """Get the current context in specified format
        
        Args:
            format_type: Format type (claude, text, openai)
            
        Returns:
            Formatted context
        """
        if format_type == "claude":
            # Claude-style message format
            messages = []
            
            # Add system message if available
            if self.system_prompt:
                messages.append({"role": "system", "content": self.system_prompt})
            
            # Add other messages
            for item in self.context_items:
                messages.append({
                    "role": item["role"],
                    "content": item["content"]
                })
            
            return messages
        
        elif format_type == "text":
            # Plain text format
            text_context = ""
            
            # Add system prompt if available
            if self.system_prompt:
                text_context += f"System: {self.system_prompt}\n\n"
            
            # Add other messages
            for item in self.context_items:
                text_context += f"{item['role'].capitalize()}: {item['content']}\n\n"
            
            return text_context
        
        elif format_type == "openai":
            # OpenAI-style message format
            messages = []
            
            # Add system message if available
            if self.system_prompt:
                messages.append({"role": "system", "content": self.system_prompt})
            
            # Add other messages (map 'user' and 'assistant', others to 'user')
            for item in self.context_items:
                role = item["role"] if item["role"] in ["user", "assistant"] else "user"
                messages.append({
                    "role": role,
                    "content": item["content"]
                })
            
            return messages
        
        else:
            raise ValueError(f"Unknown format type: {format_type}")


class AIService:
    """Main AI service for agent capabilities"""
    
    def __init__(self, api_key: Optional[str] = None, 
                model: str = "claude-3-sonnet-20240229",
                max_context_tokens: int = 16000):
        """Initialize the AI service
        
        Args:
            api_key: API key for Claude
            model: Model to use
            max_context_tokens: Maximum context tokens
        """
        self.claude_client = ClaudeClient(api_key, model)
        self.context_manager = ContextManager(max_context_tokens)
        self.last_response = None
    
    def set_system_prompt(self, prompt: str) -> None:
        """Set the system prompt
        
        Args:
            prompt: System prompt text
        """
        self.context_manager.add_system_prompt(prompt)
    
    def add_to_context(self, content: str, role: str = "user", 
                     importance: float = 1.0) -> None:
        """Add content to the conversation context
        
        Args:
            content: Content text
            role: Role (user, assistant, system)
            importance: Importance factor (0.0-1.0)
        """
        self.context_manager.add(content, role, importance)
    
    def generate_response(self, prompt: Optional[str] = None, 
                        system_prompt: Optional[str] = None,
                        template_content: Optional[str] = None,
                        template_variables: Optional[Dict[str, Any]] = None,
                        include_context: bool = True,
                        max_tokens: int = 1000,
                        temperature: float = 0.7) -> Dict[str, Any]:
        """Generate a response using Claude
        
        Args:
            prompt: Optional new prompt (if not using context)
            system_prompt: Optional one-time system prompt
            template_content: Optional template string
            template_variables: Variables for template
            include_context: Whether to include conversation context
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Response data including text and metadata
        """
        # Determine the actual prompt to use
        actual_prompt = prompt
        
        # Use template if provided
        if template_content and template_variables:
            try:
                actual_prompt = template_content.format(**template_variables)
            except KeyError as e:
                logger.error(f"Missing template variable: {e}")
                return {"error": f"Missing template variable: {e}"}
        
        # If including context and there's a new prompt, add it first
        if include_context and actual_prompt:
            self.context_manager.add(actual_prompt, "user")
        
        # Get the appropriate context format
        context = None
        if include_context:
            system = system_prompt or self.context_manager.system_prompt
            
            if not actual_prompt:
                # Using full context without new prompt
                context = self.context_manager.get_context("text")
            else:
                # If we added a new prompt, don't send it again
                prev_context = self.context_manager.get_context("text")
        
        # Generate completion
        response_text = self.claude_client.complete(
            prompt=actual_prompt if not include_context else context,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        # Save the response to context if including context
        if include_context:
            self.context_manager.add(response_text, "assistant")
        
        # Save last response
        self.last_response = response_text
        
        return {
            "text": response_text,
            "model": self.claude_client.model,
            "timestamp": time.time()
        }
    
    def analyze_system(self, system_data: Dict[str, Any], 
                     analysis_type: str = "health",
                     template_content: Optional[str] = None) -> Dict[str, Any]:
        """Analyze system data using AI capabilities
        
        Args:
            system_data: System data to analyze
            analysis_type: Type of analysis to perform
            template_content: Optional template for prompt
            
        Returns:
            Analysis results
        """
        # Create standard system prompt for analysis
        system_prompt = (
            "You are DevloopAI, a specialized system analysis assistant. "
            "Your task is to analyze system data and provide actionable insights. "
            "Focus on identifying issues, suggesting optimizations, and explaining patterns."
        )
        
        # Format the system data
        formatted_data = json.dumps(system_data, indent=2)
        
        # Create a prompt based on analysis type
        if template_content:
            prompt = template_content.format(system_data=formatted_data)
        else:
            if analysis_type == "health":
                prompt = (
                    f"Perform a health analysis on the following system data:\n\n"
                    f"{formatted_data}\n\n"
                    f"Identify any issues, evaluate component health, and suggest improvements."
                )
            elif analysis_type == "performance":
                prompt = (
                    f"Analyze the performance metrics in the following system data:\n\n"
                    f"{formatted_data}\n\n"
                    f"Identify bottlenecks, evaluate efficiency, and suggest optimizations."
                )
            elif analysis_type == "security":
                prompt = (
                    f"Perform a security analysis on the following system data:\n\n"
                    f"{formatted_data}\n\n"
                    f"Identify potential vulnerabilities, evaluate security posture, and suggest improvements."
                )
            else:
                prompt = (
                    f"Analyze the following system data:\n\n"
                    f"{formatted_data}\n\n"
                    f"Provide insights and recommendations."
                )
        
        # Generate analysis
        response = self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            include_context=False,
            temperature=0.3  # Lower temperature for more factual analysis
        )
        
        # Add analysis type to response
        response["analysis_type"] = analysis_type
        
        return response
    
    def suggest_action_plan(self, analysis_results: Dict[str, Any],
                          template_content: Optional[str] = None) -> Dict[str, Any]:
        """Generate an action plan based on analysis results
        
        Args:
            analysis_results: Previous analysis results
            template_content: Optional template for prompt
            
        Returns:
            Action plan
        """
        # Create system prompt for action planning
        system_prompt = (
            "You are DevloopAI, a specialized system planning assistant. "
            "Your task is to create concrete, prioritized action plans based on system analysis. "
            "Focus on practical steps, clear priorities, and measurable outcomes."
        )
        
        # Format the analysis results
        analysis_text = analysis_results.get("text", "")
        
        # Create prompt
        if template_content:
            prompt = template_content.format(analysis=analysis_text)
        else:
            prompt = (
                f"Based on the following system analysis, create a prioritized action plan:\n\n"
                f"{analysis_text}\n\n"
                f"Create a step-by-step plan with clear priorities, responsible components, and expected outcomes."
            )
        
        # Generate action plan
        response = self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            include_context=False,
            temperature=0.4  # Balanced temperature for creativity and structure
        )
        
        return response


# Example usage
if __name__ == "__main__":
    # Create AI service
    ai_service = AIService()
    
    # Set system prompt
    ai_service.set_system_prompt(
        "You are DevloopAI, an assistant for the Devloop system. "
        "You help analyze and improve system performance and health."
    )
    
    # Add context
    ai_service.add_to_context(
        "I'm seeing high memory usage in the worker processes.",
        role="user"
    )
    
    # Generate response
    response = ai_service.generate_response()
    
    print(f"Response: {response['text']}")
    
    # Example system data
    system_data = {
        "memory": {"total": 16384, "used": 12288, "free": 4096},
        "cpu": {"usage": 85, "temperature": 72},
        "disk": {"total": 512000, "used": 450000, "free": 62000}
    }
    
    # Analyze system
    analysis = ai_service.analyze_system(system_data)
    
    print(f"\nAnalysis: {analysis['text']}")
    
    # Generate action plan
    action_plan = ai_service.suggest_action_plan(analysis)
    
    print(f"\nAction Plan: {action_plan['text']}")