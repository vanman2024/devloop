#!/usr/bin/env python3
"""
LLM Connector for Feature Creation Agent

This module provides a connector for OpenAI's GPT-4o model,
enabling LLM capabilities for the feature creation agent.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional, Tuple, Union

# Add project root to path to allow importing common modules
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'llm_connector.log'))
    ]
)
logger = logging.getLogger('llm_connector')

# Import config
try:
    from config import get_config, is_llm_available
except ImportError:
    from agents.planning.feature_creation.config import get_config, is_llm_available

class LLMConnector:
    """
    Connector for OpenAI LLM models
    
    Provides a unified interface for interacting with GPT-4o and other
    OpenAI models, with fallbacks for when the API is not available.
    """
    
    def __init__(self):
        """Initialize the LLM connector"""
        self.config = get_config()
        self.openai_config = self.config['openai']
        self.llm_available = is_llm_available()
        
        # Set default values for potential missing config
        self.temperature = float(self.openai_config.get('temperature', 0.0))
        self.max_tokens = int(self.openai_config.get('max_tokens', 2000))
        self.model = self.openai_config.get('model', 'gpt-4o')
        
        # Initialize OpenAI API if available
        if self.llm_available:
            self._init_openai()
            logger.info(f"Initialized OpenAI API with model: {self.openai_config['model']}")
        else:
            logger.warning("OpenAI API not available - using mock responses")
    
    def _init_openai(self):
        """Initialize the OpenAI API client"""
        try:
            import openai
            self.client = openai.OpenAI(api_key=self.openai_config['api_key'])
            self.model = self.openai_config['model']
            self.temperature = float(self.openai_config.get('temperature', 0.0))
            self.max_tokens = int(self.openai_config.get('max_tokens', 2000))
            self.openai_available = True
        except ImportError:
            logger.warning("OpenAI Python package not installed - please install with 'pip install openai'")
            self.openai_available = False
        except Exception as e:
            logger.error(f"Error initializing OpenAI API: {e}")
            self.openai_available = False
    
    def generate_text(self, prompt: str, temperature: Optional[float] = None, 
                     max_tokens: Optional[int] = None) -> str:
        """
        Generate text using the LLM
        
        Args:
            prompt: The prompt to send to the LLM
            temperature: Optional temperature override
            max_tokens: Optional max tokens override
            
        Returns:
            Generated text
        """
        # Use provided values or defaults
        temperature = temperature if temperature is not None else self.temperature
        max_tokens = max_tokens if max_tokens is not None else self.max_tokens
        
        if self.llm_available and self.openai_available:
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "system", "content": "You are a helpful AI assistant specialized in software development and feature creation."},
                              {"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"Error generating text with OpenAI: {e}")
                return self._generate_mock_response(prompt)
        else:
            return self._generate_mock_response(prompt)
    
    def _generate_mock_response(self, prompt: str) -> str:
        """
        Generate a mock response when OpenAI is not available
        
        Args:
            prompt: The prompt that would have been sent to the LLM
            
        Returns:
            A mock response
        """
        logger.info("Generating mock response")
        
        # Simple template-based response system
        if "analyze" in prompt.lower() and "feature" in prompt.lower():
            return json.dumps({
                "domain": "ui" if "ui" in prompt.lower() else "api" if "api" in prompt.lower() else "data",
                "concepts": ["integration", "component", "feature", "system"],
                "purpose": "enhancement" if "enhance" in prompt.lower() else "new_feature"
            })
        
        if "suggest placement" in prompt.lower() or "recommend" in prompt.lower():
            return json.dumps({
                "suggested_milestone": "milestone-core-foundation",
                "suggested_phase": "phase-01",
                "suggested_module": "core-infrastructure",
                "confidence": 0.7,
                "reasoning": "This appears to be a core infrastructure feature based on the description."
            })
        
        if "implementation plan" in prompt.lower() or "steps" in prompt.lower():
            return """
Implementation Sequence:

1. First, analyze requirements and create a design document
2. Set up the core data structures in the infrastructure layer
3. Implement the service interfaces
4. Create the API endpoints
5. Add frontend components
6. Write unit and integration tests
7. Document the new feature
8. Submit for code review
            """
        
        # Default response for other prompts
        return "I am unable to provide a detailed response without LLM connectivity."
    
    def generate_structured_output(self, prompt: str, output_schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate structured output using the LLM with a defined schema
        
        Args:
            prompt: The prompt to send to the LLM
            output_schema: The schema that defines the expected structure
            
        Returns:
            A dictionary conforming to the output schema
        """
        if self.llm_available and self.openai_available:
            try:
                # Create a system message that includes the schema
                system_message = f"""
You are a helpful AI assistant specialized in software development and feature creation.
Your response will be parsed as JSON, so make sure to adhere to the following schema:

{json.dumps(output_schema, indent=2)}

IMPORTANT: Only respond with valid JSON that matches this schema exactly.
"""
                
                # Use response_format=json_object to ensure consistent JSON output
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "system", "content": system_message},
                              {"role": "user", "content": prompt}],
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    response_format={"type": "json_object"}
                )
                
                # Parse the response
                content = response.choices[0].message.content
                return json.loads(content)
                
            except Exception as e:
                logger.error(f"Error generating structured output with OpenAI: {e}")
                # Fall back to mock response
                return self._generate_mock_structured_output(prompt, output_schema)
        else:
            # Generate mock structured output
            return self._generate_mock_structured_output(prompt, output_schema)
    
    def _generate_mock_structured_output(self, prompt: str, output_schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a mock structured response
        
        Args:
            prompt: The prompt that would have been sent to the LLM
            output_schema: The schema that defines the expected structure
            
        Returns:
            A dictionary conforming to the output schema
        """
        logger.info("Generating mock structured output")
        
        # Create a basic mock output that conforms to the schema
        result = {}
        
        # Recursively build a structure that matches the schema
        def build_structure(schema_part, output):
            if "type" in schema_part:
                if schema_part["type"] == "object" and "properties" in schema_part:
                    # Build an object
                    for prop_name, prop_schema in schema_part["properties"].items():
                        output[prop_name] = build_structure(prop_schema, {})
                elif schema_part["type"] == "array" and "items" in schema_part:
                    # Build an array with a single mock item
                    return [build_structure(schema_part["items"], {})]
                elif schema_part["type"] == "string":
                    # Return a mock string
                    if "enum" in schema_part:
                        return schema_part["enum"][0]
                    return "Mock string value"
                elif schema_part["type"] == "number":
                    return 0.7
                elif schema_part["type"] == "integer":
                    return 42
                elif schema_part["type"] == "boolean":
                    return True
            return output
        
        # Build the structure
        result = build_structure({"type": "object", "properties": output_schema}, {})
        
        # Apply some domain-specific mock values based on the prompt
        if "domain" in result and "ui" in prompt.lower():
            result["domain"] = "ui"
        if "confidence" in result:
            result["confidence"] = 0.7
        
        return result
    
    def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Create embeddings for a list of texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if self.llm_available and self.openai_available:
            try:
                # Use the embedding model defined in config
                embedding_model = self.openai_config.get('embedding_model', 'text-embedding-3-large')
                
                response = self.client.embeddings.create(
                    input=texts,
                    model=embedding_model
                )
                
                # Extract the embedding vectors
                embeddings = [data.embedding for data in response.data]
                return embeddings
                
            except Exception as e:
                logger.error(f"Error creating embeddings with OpenAI: {e}")
                # Fall back to mock embeddings
                return self._create_mock_embeddings(texts)
        else:
            # Generate mock embeddings
            return self._create_mock_embeddings(texts)
    
    def _create_mock_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Create mock embeddings for a list of texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of mock embedding vectors
        """
        logger.info("Generating mock embeddings")
        
        import hashlib
        
        # Create a deterministic "embedding" for each text
        embeddings = []
        dimension = 1536  # OpenAI's dimension
        
        for text in texts:
            # Create a deterministic hash of the input text
            text_hash = hashlib.sha256(text.encode('utf-8')).digest()
            
            # Convert the hash to a list of normalized floats
            embedding = []
            for i in range(dimension):
                # Use modulo to cycle through the hash bytes
                hash_byte = text_hash[i % len(text_hash)]
                # Convert to a float between -1 and 1
                embedding.append((hash_byte / 127.5) - 1.0)
            
            embeddings.append(embedding)
        
        return embeddings

# Singleton instance
_llm_connector = None

def get_llm_connector() -> LLMConnector:
    """
    Get the LLM connector singleton
    
    Returns:
        LLMConnector instance
    """
    global _llm_connector
    if _llm_connector is None:
        _llm_connector = LLMConnector()
    return _llm_connector