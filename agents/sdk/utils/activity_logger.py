#!/usr/bin/env python3
"""
Activity Logger for SDK-First Architecture

This module provides a system for logging activities to the Devloop activity system.
"""

import os
import sys
import json
import time
import uuid
import logging
import requests
from typing import Dict, List, Any, Optional, Union
from threading import Thread
from queue import Queue

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("activity_logger")

class ActivityLogger:
    """Logger for Devloop activities"""
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern to ensure only one logger instance"""
        if cls._instance is None:
            cls._instance = super(ActivityLogger, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, 
                 websocket_service: Optional[str] = None, 
                 agent_id: Optional[str] = None,
                 batch_size: int = 10,
                 flush_interval: int = 5):
        """
        Initialize the activity logger.
        
        Args:
            websocket_service: URL of the websocket activity service
            agent_id: ID of the agent
            batch_size: Number of activities to batch before sending
            flush_interval: Seconds between forced flushes
        """
        # Only initialize once due to singleton pattern
        if self._initialized:
            return
            
        self.websocket_service = websocket_service or os.environ.get("WEBSOCKET_ACTIVITY_SERVICE")
        self.agent_id = agent_id or os.environ.get("CURRENT_AGENT_ID", "system")
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        
        # Queue for batching activities
        self.activity_queue = Queue()
        self.last_flush_time = time.time()
        
        # Start background worker thread for sending activities
        self.worker_thread = Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
        
        self._initialized = True
        logger.info(f"Activity logger initialized for agent {self.agent_id}")
    
    def log_activity(self, 
                    activity_type: str, 
                    subtype: str, 
                    title: str, 
                    description: str, 
                    details: Optional[Dict[str, Any]] = None, 
                    status: str = "success") -> None:
        """
        Log an activity to the activity system.
        
        Args:
            activity_type: Primary type of activity (prompt_manager, agent, tool, etc.)
            subtype: Specific subtype of activity 
            title: Title for the activity
            description: Short description of the activity
            details: Additional details about the activity
            status: Status of the activity (success, warning, error, etc.)
        """
        if not self.websocket_service:
            return  # Silently skip if not configured
        
        # Prepare activity data
        activity_data = {
            "id": f"act-{time.strftime('%Y-%m-%d')}-{str(uuid.uuid4())[:8]}",
            "type": activity_type,
            "subtype": subtype,
            "title": title,
            "description": description,
            "timestamp": int(time.time() * 1000),  # Milliseconds
            "agent_id": self.agent_id,
            "details": details or {},
            "status": status
        }
        
        # Add to queue for batched sending
        self.activity_queue.put(activity_data)
        
        # Force flush if we've reached batch size
        if self.activity_queue.qsize() >= self.batch_size:
            self.flush()
    
    def log_prompt_activity(self,
                           subtype: str,
                           details: Dict[str, Any],
                           title: Optional[str] = None,
                           description: Optional[str] = None) -> None:
        """
        Log a prompt manager activity.
        
        Args:
            subtype: Specific prompt manager activity (add_context, render_template, etc.)
            details: Details about the prompt activity
            title: Optional override for the activity title
            description: Optional override for the activity description
        """
        # Generate default title and description if not provided
        if not title:
            title_map = {
                "add_context": "Added Context Item",
                "prune_context": "Pruned Context",
                "knowledge_graph_query": "Knowledge Graph Query",
                "add_template": "Added Template",
                "render_template": "Rendered Template",
                "prepare_openai_prompt": "Prepared OpenAI Prompt",
                "prepare_claude_prompt": "Prepared Claude Prompt",
                "register_response": "Registered AI Response"
            }
            title = title_map.get(subtype, f"Prompt Activity: {subtype}")
        
        if not description:
            # Generate descriptive text based on subtype and details
            if subtype == "add_context":
                role = details.get("role", "user")
                description = f"Added {role} context with {details.get('token_count', 0)} tokens"
            elif subtype == "prune_context":
                description = f"Removed {details.get('items_removed', 0)} items ({details.get('tokens_removed', 0)} tokens)"
            elif subtype == "knowledge_graph_query":
                description = f"Retrieved context from knowledge graph for query '{details.get('query', '')}'"
            elif subtype == "add_template":
                description = f"Added template '{details.get('template_name', '')}'"
            elif subtype == "render_template":
                description = f"Rendered template '{details.get('template_name', '')}' with {len(details.get('variables', []))} variables"
            elif subtype == "prepare_openai_prompt" or subtype == "prepare_claude_prompt":
                provider = "OpenAI" if subtype == "prepare_openai_prompt" else "Claude"
                description = f"Prepared {provider} prompt using template '{details.get('template_name', '')}'"
            elif subtype == "register_response":
                description = f"Registered {details.get('token_count', 0)}-token response from {details.get('provider', 'AI')}"
            else:
                description = f"Prompt manager activity: {subtype}"
        
        # Log the activity
        self.log_activity(
            activity_type="prompt_manager",
            subtype=subtype,
            title=title,
            description=description,
            details=details
        )
    
    def flush(self) -> None:
        """Manually flush the activity queue."""
        self.last_flush_time = time.time()
        
        # Signal the worker to flush
        self.activity_queue.put(None)
    
    def _worker(self) -> None:
        """Background worker to send batched activities."""
        activities = []
        
        while True:
            try:
                # Wait for an activity or timeout
                try:
                    activity = self.activity_queue.get(timeout=self.flush_interval)
                except:
                    # Timed out, check if we should flush
                    if activities and time.time() - self.last_flush_time >= self.flush_interval:
                        self._send_activities(activities)
                        activities = []
                        self.last_flush_time = time.time()
                    continue
                
                # None is a signal to flush
                if activity is None:
                    if activities:
                        self._send_activities(activities)
                        activities = []
                    continue
                
                # Add to batch
                activities.append(activity)
                
                # If batch is full, send it
                if len(activities) >= self.batch_size:
                    self._send_activities(activities)
                    activities = []
                    self.last_flush_time = time.time()
            
            except Exception as e:
                logger.error(f"Error in activity logger worker: {e}")
                
                # Don't lose activities if there's an error
                if activities:
                    try:
                        self._send_activities(activities)
                    except:
                        pass
                activities = []
    
    def _send_activities(self, activities: List[Dict[str, Any]]) -> None:
        """Send a batch of activities to the activity service."""
        if not self.websocket_service or not activities:
            return
        
        try:
            # Send to websocket service (non-blocking)
            requests.post(
                f"{self.websocket_service}/activity/batch",
                json={"activities": activities},
                timeout=2.0  # Short timeout to avoid blocking
            )
        except Exception as e:
            # Log but don't fail if activity logging fails
            logger.warning(f"Failed to send activities: {e}")


# Global instance for convenience
activity_logger = ActivityLogger()


def log_activity(activity_type: str, 
                subtype: str, 
                title: str, 
                description: str, 
                details: Optional[Dict[str, Any]] = None, 
                status: str = "success") -> None:
    """Convenience function to log an activity."""
    activity_logger.log_activity(
        activity_type=activity_type,
        subtype=subtype,
        title=title,
        description=description,
        details=details,
        status=status
    )


def log_prompt_activity(subtype: str,
                       details: Dict[str, Any],
                       title: Optional[str] = None,
                       description: Optional[str] = None) -> None:
    """Convenience function to log a prompt manager activity."""
    activity_logger.log_prompt_activity(
        subtype=subtype,
        details=details,
        title=title,
        description=description
    )


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Activity Logger")
    parser.add_argument("--service", help="Websocket service URL")
    parser.add_argument("--agent", help="Agent ID")
    parser.add_argument("--test", action="store_true", help="Send test activities")
    
    args = parser.parse_args()
    
    if args.service:
        activity_logger = ActivityLogger(
            websocket_service=args.service,
            agent_id=args.agent or "test-agent"
        )
    
    if args.test:
        # Send test activities
        activity_logger.log_activity(
            activity_type="test",
            subtype="initialize",
            title="Test Activity",
            description="This is a test activity",
            details={"test_key": "test_value"},
            status="success"
        )
        
        activity_logger.log_prompt_activity(
            subtype="add_template",
            details={
                "template_name": "test_template",
                "variables": ["var1", "var2"],
                "tags": ["test"]
            }
        )
        
        activity_logger.log_prompt_activity(
            subtype="knowledge_graph_query",
            details={
                "query": "test query",
                "results_found": 3
            }
        )
        
        # Force flush
        activity_logger.flush()
        
        print("Sent test activities")