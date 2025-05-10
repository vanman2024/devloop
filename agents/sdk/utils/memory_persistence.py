#!/usr/bin/env python3
"""
Memory Persistence System for SDK

This module provides a robust persistence layer for the SDK's state management,
adapted from the Python-based Memory Manager. It handles JSON path queries,
validation, and storage operations.

Key features:
- Persistent state management across SDK sessions
- JSON path-based state queries and updates
- Schema validation for stored data
- Backup and restoration capabilities
"""

import os
import sys
import json
import datetime
import re
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Tuple

# SDK Core imports
from .sdk_logger import get_logger

# Initialize logger
logger = get_logger(__name__)

class MemoryPersistence:
    """
    Handles persistence operations for SDK state management.
    Provides a unified interface for reading, writing, and querying state data.
    """
    
    def __init__(self, storage_dir: Optional[str] = None, schema_file: Optional[str] = None):
        """Initialize the memory persistence system"""
        # Default storage location is ~/.devloop/sdk/storage
        self.storage_dir = storage_dir or os.path.expanduser("~/.devloop/sdk/storage")
        self.backup_dir = os.path.join(self.storage_dir, "backups")
        self.schema_file = schema_file or os.path.join(self.storage_dir, "schema.json")
        
        # Create directories if they don't exist
        os.makedirs(self.storage_dir, exist_ok=True)
        os.makedirs(self.backup_dir, exist_ok=True)
        
        # Initialize lock files map
        self.locks = {}
    
    def get_timestamp(self) -> str:
        """Return current ISO 8601 timestamp"""
        return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    def acquire_lock(self, memory_file: str, timeout: int = 10) -> bool:
        """Acquire a lock for atomic memory operations"""
        lock_file = f"{memory_file}.lock"
        start_time = datetime.datetime.now()
        
        while os.path.exists(lock_file):
            # Calculate lock age
            lock_stat = os.stat(lock_file)
            lock_age = (datetime.datetime.now() - 
                      datetime.datetime.fromtimestamp(lock_stat.st_mtime)).total_seconds()
            
            # If lock is older than 30 seconds, it's probably stale
            if lock_age > 30:
                logger.warning(f"Stale lock detected ({int(lock_age)}s old) for {memory_file}, removing")
                os.remove(lock_file)
                break
            
            # If we've waited too long, give up
            if (datetime.datetime.now() - start_time).total_seconds() > timeout:
                logger.error(f"Could not acquire lock for {memory_file} after {timeout}s")
                return False
            
            # Wait a bit before retrying
            import time
            time.sleep(0.5)
        
        # Create the lock file
        with open(lock_file, 'w') as f:
            f.write(str(os.getpid()))
        
        # Track the lock
        self.locks[memory_file] = lock_file
        return True
    
    def release_lock(self, memory_file: str) -> None:
        """Release the memory lock"""
        lock_file = self.locks.get(memory_file) or f"{memory_file}.lock"
        if os.path.exists(lock_file):
            os.remove(lock_file)
            
        # Remove from tracking
        if memory_file in self.locks:
            del self.locks[memory_file]
    
    def read_memory(self, memory_file: str) -> Optional[Dict]:
        """Read a memory file and return its contents as a dictionary"""
        try:
            with open(memory_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Memory file not found: {memory_file}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in memory file: {memory_file}")
            logger.error(f"  {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error reading memory file: {str(e)}")
            return None
    
    def write_memory(self, memory_file: str, memory_data: Dict, update_timestamp: bool = True) -> bool:
        """Write memory data to a file with optional timestamp update"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(memory_file), exist_ok=True)
            
            # Update timestamp if requested
            if update_timestamp and isinstance(memory_data, dict) and "meta" in memory_data:
                memory_data["meta"]["lastUpdated"] = self.get_timestamp()
            
            # Write the memory file with pretty formatting
            with open(memory_file, 'w') as f:
                json.dump(memory_data, f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Error writing memory file: {str(e)}")
            return False
    
    def get_memory_value(self, memory_data: Dict, json_path: str, default: Any = None) -> Any:
        """Get a value from memory data using a JSON path"""
        if not memory_data:
            return default
        
        # Support jq-style paths
        if json_path.startswith("."):
            json_path = json_path[1:]
        
        # Handle empty path
        if not json_path:
            return memory_data
        
        # Split the path
        parts = json_path.split(".")
        current = memory_data
        
        # Navigate through the path
        for part in parts:
            # Handle array indexing
            if "[" in part and part.endswith("]"):
                name, index_str = part.split("[", 1)
                index = int(index_str.rstrip("]"))
                
                if name:
                    if name not in current:
                        return default
                    current = current[name]
                
                if not isinstance(current, list) or index >= len(current):
                    return default
                
                current = current[index]
            else:
                # Regular object property
                if not isinstance(current, dict) or part not in current:
                    return default
                current = current[part]
        
        return current
    
    def set_memory_value(self, memory_data: Dict, json_path: str, value: Any) -> bool:
        """Set a value in memory data using a JSON path"""
        if not memory_data:
            return False
        
        # Support jq-style paths
        if json_path.startswith("."):
            json_path = json_path[1:]
        
        # Split the path
        parts = json_path.split(".")
        
        # Navigate to the parent object
        current = memory_data
        for i, part in enumerate(parts[:-1]):
            # Handle array indexing
            if "[" in part and part.endswith("]"):
                name, index_str = part.split("[", 1)
                index = int(index_str.rstrip("]"))
                
                if name:
                    if name not in current or not isinstance(current[name], list):
                        current[name] = []
                    current = current[name]
                
                # Extend the list if needed
                while len(current) <= index:
                    current.append({})
                
                current = current[index]
            else:
                # Regular object property
                if part not in current or not isinstance(current[part], dict):
                    current[part] = {}
                current = current[part]
        
        # Set the value in the final object
        final_part = parts[-1]
        
        # Handle array indexing in the final part
        if "[" in final_part and final_part.endswith("]"):
            name, index_str = final_part.split("[", 1)
            index = int(index_str.rstrip("]"))
            
            if name:
                if name not in current or not isinstance(current[name], list):
                    current[name] = []
                current = current[name]
            
            # Extend the list if needed
            while len(current) <= index:
                current.append(None)
            
            current[index] = value
        else:
            # Regular object property
            current[final_part] = value
        
        return True
    
    def backup_memory(self, memory_file: str, backup_reason: str = "manual") -> Optional[str]:
        """Create a backup of the specified memory file"""
        # Check if memory file exists
        if not os.path.exists(memory_file):
            logger.error(f"Memory file not found: {memory_file}")
            return None
        
        try:
            # Create backup directory if it doesn't exist
            os.makedirs(self.backup_dir, exist_ok=True)
            
            # Generate backup filename
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            memory_basename = os.path.basename(memory_file)
            backup_file = os.path.join(self.backup_dir, f"{os.path.splitext(memory_basename)[0]}_{timestamp}.json")
            
            # Copy the file
            shutil.copy2(memory_file, backup_file)
            
            # Add backup metadata
            memory_data = self.read_memory(backup_file)
            if memory_data:
                if isinstance(memory_data, dict):
                    memory_data["_backup"] = {
                        "reason": backup_reason,
                        "timestamp": self.get_timestamp(),
                        "source": memory_file
                    }
                    self.write_memory(backup_file, memory_data, False)
            
            logger.info(f"Created backup: {backup_file}")
            return backup_file
        
        except Exception as e:
            logger.error(f"Error creating backup: {str(e)}")
            return None
    
    def restore_memory(self, backup_file: str, target_file: Optional[str] = None) -> bool:
        """Restore memory from a backup file"""
        # Check if backup file exists
        if not os.path.exists(backup_file):
            logger.error(f"Backup file not found: {backup_file}")
            return False
        
        try:
            # If target file not specified, try to extract from backup metadata
            if not target_file:
                memory_data = self.read_memory(backup_file)
                if memory_data and "_backup" in memory_data and "source" in memory_data["_backup"]:
                    target_file = memory_data["_backup"]["source"]
                    logger.info(f"Restoring to original location: {target_file}")
                else:
                    logger.error("No target file specified and no source in backup metadata")
                    return False
            
            # Create a backup of the current state before restoring
            if os.path.exists(target_file):
                self.backup_memory(target_file, "pre-restore")
            
            # Remove backup metadata
            memory_data = self.read_memory(backup_file)
            if "_backup" in memory_data:
                del memory_data["_backup"]
            
            # Restore the memory
            if self.write_memory(target_file, memory_data, False):
                logger.info(f"Restored memory from backup: {backup_file}")
                return True
            else:
                return False
        
        except Exception as e:
            logger.error(f"Error restoring from backup: {str(e)}")
            return False
    
    def validate_memory(self, memory_data: Dict) -> Tuple[bool, List[str]]:
        """Validate memory data against schema"""
        if not os.path.exists(self.schema_file):
            logger.warning(f"Schema file not found: {self.schema_file}")
            # Basic validation
            if not isinstance(memory_data, dict):
                return False, ["Memory data must be a dictionary"]
            return True, []
        
        errors = []
        try:
            with open(self.schema_file, 'r') as f:
                schema = json.load(f)
            
            # Check required fields
            for field in schema.get("required", []):
                if field not in memory_data:
                    errors.append(f"Missing required field: {field}")
            
            # Validate properties
            for prop, prop_schema in schema.get("properties", {}).items():
                if prop in memory_data:
                    # Check type
                    if "type" in prop_schema:
                        if prop_schema["type"] == "object" and not isinstance(memory_data[prop], dict):
                            errors.append(f"Field '{prop}' must be an object")
                        elif prop_schema["type"] == "array" and not isinstance(memory_data[prop], list):
                            errors.append(f"Field '{prop}' must be an array")
                        # Add other type validations as needed
            
            return len(errors) == 0, errors
            
        except Exception as e:
            logger.error(f"Error validating memory: {str(e)}")
            return False, [str(e)]
    
    # Higher-level operations for SDK state management
    
    def get_state(self, state_key: str, default: Optional[Dict] = None) -> Dict:
        """
        Get a state object by key
        
        Args:
            state_key: The unique identifier for the state
            default: Default value if state doesn't exist
            
        Returns:
            The state object or default if not found
        """
        state_file = os.path.join(self.storage_dir, f"{state_key}.json")
        state = self.read_memory(state_file)
        if state is None:
            return default or {}
        return state
    
    def set_state(self, state_key: str, state: Dict, update_timestamp: bool = True) -> bool:
        """
        Save a state object by key
        
        Args:
            state_key: The unique identifier for the state
            state: The state object to save
            update_timestamp: Whether to update the timestamp in meta field
            
        Returns:
            True if successful, False otherwise
        """
        state_file = os.path.join(self.storage_dir, f"{state_key}.json")
        
        # Try to acquire lock
        if not self.acquire_lock(state_file):
            return False
        
        try:
            # Ensure state has meta information
            if update_timestamp and isinstance(state, dict):
                if "meta" not in state:
                    state["meta"] = {}
                
                timestamp = self.get_timestamp()
                if "createdAt" not in state["meta"]:
                    state["meta"]["createdAt"] = timestamp
                state["meta"]["lastUpdated"] = timestamp
            
            # Validate schema
            valid, errors = self.validate_memory(state)
            if not valid:
                logger.error(f"Invalid state data for {state_key}: {', '.join(errors)}")
                return False
            
            # Write the state file
            return self.write_memory(state_file, state, False)  # Skip timestamp since we handled it above
        finally:
            # Always release the lock
            self.release_lock(state_file)
    
    def update_state(self, state_key: str, updates: Dict) -> bool:
        """
        Update specific fields in a state object
        
        Args:
            state_key: The unique identifier for the state
            updates: Dictionary of updates where keys are JSON paths
            
        Returns:
            True if successful, False otherwise
        """
        state_file = os.path.join(self.storage_dir, f"{state_key}.json")
        
        # Try to acquire lock
        if not self.acquire_lock(state_file):
            return False
        
        try:
            # Read current state
            state = self.read_memory(state_file)
            if state is None:
                # Create new state if it doesn't exist
                state = {"meta": {"createdAt": self.get_timestamp()}}
            
            # Apply updates
            for path, value in updates.items():
                self.set_memory_value(state, path, value)
            
            # Update timestamp
            if "meta" not in state:
                state["meta"] = {}
            state["meta"]["lastUpdated"] = self.get_timestamp()
            
            # Write updated state
            return self.write_memory(state_file, state, False)  # Skip timestamp since we handled it above
        finally:
            # Always release the lock
            self.release_lock(state_file)
    
    def delete_state(self, state_key: str) -> bool:
        """
        Delete a state object by key
        
        Args:
            state_key: The unique identifier for the state
            
        Returns:
            True if successful, False otherwise
        """
        state_file = os.path.join(self.storage_dir, f"{state_key}.json")
        
        # Create backup before deletion
        if os.path.exists(state_file):
            self.backup_memory(state_file, "pre-deletion")
            
            try:
                os.remove(state_file)
                logger.info(f"Deleted state: {state_key}")
                return True
            except Exception as e:
                logger.error(f"Error deleting state {state_key}: {str(e)}")
                return False
        
        return True  # State didn't exist, so consider it success