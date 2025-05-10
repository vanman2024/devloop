#!/usr/bin/env python3
"""
Configuration for Feature Creation Agent

This module provides configuration settings for API keys, endpoints,
and other environment-specific settings.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional

# Find project root
PROJECT_ROOT = os.environ.get('PROJECT_ROOT')
if not PROJECT_ROOT:
    # Try to find it by traversing up from the current file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)  # agents/planning
    parent_dir = os.path.dirname(parent_dir)   # agents
    PROJECT_ROOT = os.path.dirname(parent_dir) # Devloop root

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('config')

# Default config values
DEFAULT_CONFIG = {
    "openai": {
        "api_key": None,
        "model": "gpt-4o",
        "embedding_model": "text-embedding-3-large",
        "temperature": 0.0,
        "max_tokens": 2000
    },
    "redis": {
        "url": "redis://localhost:6379/0",
        "ttl": 3600  # 1 hour
    },
    "mongodb": {
        "uri": "mongodb://localhost:27017/",
        "db_name": "devloop"
    },
    "vector_store": {
        "storage_path": "~/.devloop/sdk/storage/vector_store.json"
    },
    "knowledge_graph": {
        "storage_path": "~/.devloop/sdk/storage/knowledge_graph.json"
    }
}

def load_env_file() -> Dict[str, str]:
    """Load environment variables from .env file"""
    env_vars = {}
    env_file = os.path.join(PROJECT_ROOT, '.env')
    
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    # Skip comments and empty lines
                    if not line or line.startswith('#'):
                        continue
                    
                    # Parse key-value pairs
                    if '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
            
            logger.info(f"Loaded environment variables from {env_file}")
        except Exception as e:
            logger.warning(f"Error loading .env file: {e}")
    
    return env_vars

def load_config() -> Dict[str, Any]:
    """
    Load configuration from .env file, environment variables, and config file
    
    Priority: Environment variables > .env file > config file > defaults
    
    Returns:
        Configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    
    # Try to load from .env file
    env_vars = load_env_file()
    
    # Try to load from config file
    config_file = os.environ.get('DEVLOOP_CONFIG', '~/.devloop/config.json')
    config_file = os.path.expanduser(config_file)
    
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                # Update config with file values
                for section, values in file_config.items():
                    if section in config:
                        config[section].update(values)
                    else:
                        config[section] = values
            logger.info(f"Loaded configuration from {config_file}")
        except Exception as e:
            logger.warning(f"Error loading config file {config_file}: {e}")
    
    # Apply .env file values
    # For OpenAI, check RAG_OPENAI_API_KEY first, then OPENAI_API_KEY
    if 'RAG_OPENAI_API_KEY' in env_vars:
        config['openai']['api_key'] = env_vars['RAG_OPENAI_API_KEY']
    elif 'OPENAI_API_KEY' in env_vars:
        config['openai']['api_key'] = env_vars['OPENAI_API_KEY']
    
    if 'OPENAI_MODEL' in env_vars:
        config['openai']['model'] = env_vars['OPENAI_MODEL']
    
    if 'OPENAI_EMBEDDING_MODEL' in env_vars:
        config['openai']['embedding_model'] = env_vars['OPENAI_EMBEDDING_MODEL']
    
    if 'OPENAI_TEMPERATURE' in env_vars:
        try:
            config['openai']['temperature'] = float(env_vars['OPENAI_TEMPERATURE'])
        except (ValueError, TypeError):
            pass
    
    if 'OPENAI_MAX_TOKENS' in env_vars:
        try:
            config['openai']['max_tokens'] = int(env_vars['OPENAI_MAX_TOKENS'])
        except (ValueError, TypeError):
            pass
    
    # Override with direct environment variables (highest priority)
    # OpenAI
    if os.environ.get('OPENAI_API_KEY'):
        config['openai']['api_key'] = os.environ.get('OPENAI_API_KEY')
    
    if os.environ.get('OPENAI_MODEL'):
        config['openai']['model'] = os.environ.get('OPENAI_MODEL')
    
    # Redis
    if os.environ.get('REDIS_URL'):
        config['redis']['url'] = os.environ.get('REDIS_URL')
    
    # MongoDB
    if os.environ.get('MONGODB_URI'):
        config['mongodb']['uri'] = os.environ.get('MONGODB_URI')
    
    if os.environ.get('MONGODB_DB_NAME'):
        config['mongodb']['db_name'] = os.environ.get('MONGODB_DB_NAME')
    
    # Check for required values
    has_openai = bool(config['openai']['api_key'])
    
    if has_openai:
        logger.info("OpenAI API key is configured")
    else:
        logger.warning("OpenAI API key is not configured - LLM features will be disabled")
    
    return config

# Singleton config instance
_config = None

def get_config() -> Dict[str, Any]:
    """
    Get the configuration singleton
    
    Returns:
        Configuration dictionary
    """
    global _config
    if _config is None:
        _config = load_config()
    return _config

def get_openai_api_key() -> Optional[str]:
    """Get the OpenAI API key"""
    return get_config()['openai']['api_key']

def is_llm_available() -> bool:
    """Check if LLM is available (API key is configured)"""
    return bool(get_openai_api_key())