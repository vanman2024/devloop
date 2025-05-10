#!/usr/bin/env python3
"""
Memory Manager for Task Agent

This module provides memory management capabilities for the Task Agent,
allowing it to store and retrieve information about processed features,
agent thoughts, and task history.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'logs', 'memory_manager.log'))
    ]
)
logger = logging.getLogger('memory_manager')

class MemoryManager:
    """Memory manager for the Task Agent"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None, persistence_dir: Optional[str] = None):
        """
        Initialize the memory manager
        
        Args:
            config: Configuration dictionary
            persistence_dir: Directory for memory persistence
        """
        self.config = config or {}
        self.persistence_enabled = self.config.get('memory_persistence', True)
        
        # Set up persistence directory
        if persistence_dir:
            self.persistence_dir = persistence_dir
        else:
            self.persistence_dir = os.path.join(os.path.dirname(__file__), 'memory')
        
        # Create directory if it doesn't exist
        if self.persistence_enabled and not os.path.exists(self.persistence_dir):
            try:
                os.makedirs(self.persistence_dir)
                logger.info(f"Created memory persistence directory at {self.persistence_dir}")
            except Exception as e:
                logger.error(f"Error creating memory persistence directory: {e}")
                self.persistence_enabled = False
        
        # Initialize memory
        self.memory = {
            "processed_features": {},
            "task_history": [],
            "agent_thoughts": []
        }
        
        # Load persisted memory if enabled
        if self.persistence_enabled:
            self._load_memory()
            
        logger.info("Memory Manager initialized")
    
    def _get_memory_path(self, memory_type: str) -> str:
        """
        Get the path for a memory file
        
        Args:
            memory_type: Type of memory (processed_features, task_history, agent_thoughts)
            
        Returns:
            Path to the memory file
        """
        return os.path.join(self.persistence_dir, f"{memory_type}.json")
    
    def _load_memory(self):
        """Load memory from persistence directory"""
        for memory_type in self.memory.keys():
            path = self._get_memory_path(memory_type)
            if os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        data = json.load(f)
                        self.memory[memory_type] = data
                    logger.info(f"Loaded {memory_type} memory ({len(data)} items)")
                except Exception as e:
                    logger.error(f"Error loading {memory_type} memory: {e}")
    
    def _save_memory(self, memory_type: str):
        """
        Save memory to persistence directory
        
        Args:
            memory_type: Type of memory to save
        """
        if not self.persistence_enabled:
            return
            
        path = self._get_memory_path(memory_type)
        try:
            with open(path, 'w') as f:
                json.dump(self.memory[memory_type], f, indent=2)
            logger.info(f"Saved {memory_type} memory")
        except Exception as e:
            logger.error(f"Error saving {memory_type} memory: {e}")
    
    def store_processed_feature(self, feature_id: str, feature_data: Dict[str, Any], tasks: List[Dict[str, Any]], 
                              summary: Optional[str] = None):
        """
        Store information about a processed feature
        
        Args:
            feature_id: ID of the feature
            feature_data: Feature data
            tasks: Tasks created for the feature
            summary: Summary of the tasks
        """
        self.memory["processed_features"][feature_id] = {
            "feature_data": feature_data,
            "tasks": tasks,
            "summary": summary,
            "timestamp": datetime.now().isoformat(),
            "processed_by": "task_agent"
        }
        
        self._save_memory("processed_features")
        logger.info(f"Stored processed feature {feature_id} with {len(tasks)} tasks")
    
    def retrieve_processed_feature(self, feature_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve information about a processed feature
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Feature information or None if not found
        """
        return self.memory["processed_features"].get(feature_id)
    
    def track_agent_thought(self, thought: str, feature_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Track an agent thought
        
        Args:
            thought: Thought content
            feature_id: Optional feature ID associated with the thought
            
        Returns:
            Thought entry that was created
        """
        thought_id = str(uuid.uuid4())
        thought_entry = {
            "id": thought_id,
            "timestamp": datetime.now().isoformat(),
            "thought": thought,
            "feature_id": feature_id
        }
        
        self.memory["agent_thoughts"].append(thought_entry)
        
        # Only keep the last 1000 thoughts to avoid memory bloat
        if len(self.memory["agent_thoughts"]) > 1000:
            self.memory["agent_thoughts"] = self.memory["agent_thoughts"][-1000:]
        
        self._save_memory("agent_thoughts")
        logger.debug(f"Tracked agent thought: {thought[:50]}...")
        
        return thought_entry
    
    def get_agent_thoughts_for_feature(self, feature_id: str) -> List[Dict[str, Any]]:
        """
        Get agent thoughts related to a feature
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            List of thought entries
        """
        return [t for t in self.memory["agent_thoughts"] if t.get("feature_id") == feature_id]
    
    def log_task_history(self, task_id: str, feature_id: str, status: str, previous_status: Optional[str] = None):
        """
        Log a task history event
        
        Args:
            task_id: ID of the task
            feature_id: ID of the feature
            status: New status
            previous_status: Previous status
        """
        history_entry = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "feature_id": feature_id,
            "status": status,
            "previous_status": previous_status,
            "timestamp": datetime.now().isoformat()
        }
        
        self.memory["task_history"].append(history_entry)
        
        # Only keep the last 1000 history entries to avoid memory bloat
        if len(self.memory["task_history"]) > 1000:
            self.memory["task_history"] = self.memory["task_history"][-1000:]
        
        self._save_memory("task_history")
        logger.info(f"Logged task history for {task_id}: {previous_status} -> {status}")
    
    def get_task_history(self, task_id: Optional[str] = None, feature_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get task history
        
        Args:
            task_id: Optional task ID to filter by
            feature_id: Optional feature ID to filter by
            
        Returns:
            List of history entries
        """
        if task_id:
            return [h for h in self.memory["task_history"] if h.get("task_id") == task_id]
        elif feature_id:
            return [h for h in self.memory["task_history"] if h.get("feature_id") == feature_id]
        else:
            return self.memory["task_history"]
    
    def clear_memory(self, memory_type: Optional[str] = None):
        """
        Clear memory
        
        Args:
            memory_type: Optional type of memory to clear (processed_features, task_history, agent_thoughts)
        """
        if memory_type:
            if memory_type in self.memory:
                if memory_type == "processed_features":
                    self.memory[memory_type] = {}
                else:
                    self.memory[memory_type] = []
                self._save_memory(memory_type)
                logger.info(f"Cleared {memory_type} memory")
        else:
            for memory_type in self.memory:
                if memory_type == "processed_features":
                    self.memory[memory_type] = {}
                else:
                    self.memory[memory_type] = []
                self._save_memory(memory_type)
            logger.info("Cleared all memory")
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """
        Get memory statistics
        
        Returns:
            Dictionary with memory statistics
        """
        return {
            "processed_features_count": len(self.memory["processed_features"]),
            "task_history_count": len(self.memory["task_history"]),
            "agent_thoughts_count": len(self.memory["agent_thoughts"]),
            "persistence_enabled": self.persistence_enabled,
            "persistence_dir": self.persistence_dir
        }

# Singleton instance
_memory_manager_instance = None

def get_memory_manager(config: Optional[Dict[str, Any]] = None, 
                     persistence_dir: Optional[str] = None) -> MemoryManager:
    """
    Get the singleton instance of the Memory Manager
    
    Args:
        config: Optional configuration to override defaults
        persistence_dir: Optional directory for memory persistence
        
    Returns:
        MemoryManager instance
    """
    global _memory_manager_instance
    if _memory_manager_instance is None:
        _memory_manager_instance = MemoryManager(config, persistence_dir)
    elif config:
        # Update config if provided
        _memory_manager_instance.config.update(config)
    return _memory_manager_instance