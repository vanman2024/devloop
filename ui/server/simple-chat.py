#!/usr/bin/env python3
"""
Simple chat script that directly calls Claude API
"""

import os
import sys
import json
from typing import Dict, Any, Optional

# Add the absolute path to the system
script_dir = os.path.dirname(os.path.abspath(__file__))
devloop_dir = "/mnt/c/Users/angel/devloop"
if devloop_dir not in sys.path:
    sys.path.append(devloop_dir)

# Direct import using the full path
sys.path.append("/mnt/c/Users/angel/devloop/system-core/scripts/utils")
from ai_service import AIService

def chat_simple(message: str, system_prompt: Optional[str] = None) -> str:
    """
    Simple function to generate a chat response
    
    Args:
        message: User message
        system_prompt: Optional system prompt
        
    Returns:
        Generated response
    """
    # Default system prompt if none provided
    if not system_prompt:
        system_prompt = "You are the AI assistant for the Devloop system. You help users with software development tasks. Respond directly and helpfully."
    
    # Create context with system prompt
    context = {"system_prompt": system_prompt}
    
    # Use AIService to generate response
    service = AIService()
    response = service.generate_text(message, context=context)
    
    return response

if __name__ == "__main__":
    # Parse arguments
    if len(sys.argv) < 2:
        print("Usage: python3 simple-chat.py \"message\" [system_prompt]")
        sys.exit(1)
    
    message = sys.argv[1]
    system_prompt = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Generate response
    response = chat_simple(message, system_prompt)
    
    # Print response
    print(response)