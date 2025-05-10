#!/usr/bin/env python3
"""
SDK Logger for Devloop SDK

This module provides logging utilities for the Devloop SDK.
"""

import os
import sys
import logging
from typing import Optional

# Configure default log formatter
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

def get_logger(name: str, level: Optional[int] = None) -> logging.Logger:
    """
    Get a configured logger instance for the given name
    
    Args:
        name: Logger name (usually __name__)
        level: Optional log level (defaults to INFO)
        
    Returns:
        Configured logger instance
    """
    # Default to INFO if not specified
    if level is None:
        level = logging.INFO
        
    # Get or create logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Only add handlers if none exist
    if not logger.handlers:
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(console_handler)
        
        # Try to add file handler if logs directory exists
        try:
            # Get project root (adjust as needed)
            project_root = os.environ.get('DEVLOOP_ROOT')
            if not project_root:
                # Try to find it
                current_dir = os.path.dirname(os.path.abspath(__file__))
                while current_dir and os.path.basename(current_dir) != 'Devloop':
                    current_dir = os.path.dirname(current_dir)
                
                project_root = current_dir if os.path.basename(current_dir) == 'Devloop' else None
            
            # Add file handler if project root found
            if project_root:
                logs_dir = os.path.join(project_root, 'logs')
                os.makedirs(logs_dir, exist_ok=True)
                
                file_handler = logging.FileHandler(os.path.join(logs_dir, f"{name.split('.')[-1]}.log"))
                file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
                logger.addHandler(file_handler)
        except Exception:
            # Silently continue if file handler can't be added
            pass
    
    return logger