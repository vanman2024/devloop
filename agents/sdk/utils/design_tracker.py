#!/usr/bin/env python3
"""
Design Tracker for SDK

This module provides tools to track design implementations in the SDK,
facilitating the workflow from designs to code. It helps manage design assets,
track implementation progress, and organize design files.

Adapted from the design-to-code utility for integration with the SDK architecture.
"""

import os
import sys
import json
import datetime
import glob
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# SDK Core imports
from .sdk_logger import get_logger

# Initialize logger
logger = get_logger(__name__)

class DesignTracker:
    """
    Tracks design implementations and manages design assets
    for the SDK architecture.
    """
    
    # Design categories
    CATEGORIES = [
        "Components", 
        "Layouts", 
        "Interactions", 
        "Workflows", 
        "System Architecture",
        "Data Models"
    ]
    
    # File extensions to look for
    DESIGN_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.pdf']
    
    def __init__(self, design_dirs: Optional[List[str]] = None, tracking_file: Optional[str] = None):
        """Initialize the design tracker"""
        # Default design directories
        self.design_dirs = design_dirs or [
            os.path.expanduser("~/Designs"),
            os.path.expanduser("~/Documents/Designs"),
            os.path.expanduser("~/Pictures/Designs")
        ]
        
        # Storage directory for tracking data
        self.storage_dir = os.path.expanduser("~/.devloop/sdk/design_tracker")
        os.makedirs(self.storage_dir, exist_ok=True)
        
        # Tracking file for design implementation progress
        self.tracking_file = tracking_file or os.path.join(self.storage_dir, "implementation_tracking.json")
    
    def find_design(self, design_name: str) -> Optional[str]:
        """
        Find a design file by name across configured directories
        
        Args:
            design_name: Name or partial name of the design file
            
        Returns:
            Full path to the design file, or None if not found
        """
        # If it's a full path and exists, use it directly
        if os.path.isfile(design_name):
            return design_name
        
        # Check for exact matches first
        for design_dir in self.design_dirs:
            expanded_dir = os.path.expanduser(design_dir)
            if os.path.exists(expanded_dir):
                # Look in each category subdirectory
                for category in self.CATEGORIES:
                    category_dir = os.path.join(expanded_dir, category)
                    if os.path.exists(category_dir):
                        # Check for exact match
                        for ext in self.DESIGN_EXTENSIONS:
                            full_path = os.path.join(category_dir, f"{design_name}{ext}")
                            if os.path.isfile(full_path):
                                return full_path
        
        # If no exact match, look for partial matches
        best_matches = []
        
        for design_dir in self.design_dirs:
            expanded_dir = os.path.expanduser(design_dir)
            if os.path.exists(expanded_dir):
                for category in self.CATEGORIES:
                    category_dir = os.path.join(expanded_dir, category)
                    if os.path.exists(category_dir):
                        # Find all design files in this directory
                        for file in os.listdir(category_dir):
                            file_path = os.path.join(category_dir, file)
                            if os.path.isfile(file_path) and any(file.lower().endswith(ext) for ext in self.DESIGN_EXTENSIONS):
                                file_base = os.path.splitext(file)[0].lower()
                                design_name_lower = design_name.lower()
                                
                                # Check if the design name is contained in the filename
                                if design_name_lower in file_base:
                                    match_score = len(design_name_lower) / len(file_base)
                                    best_matches.append((file_path, match_score))
        
        # Return the best partial match if any found
        if best_matches:
            best_matches.sort(key=lambda x: x[1], reverse=True)
            return best_matches[0][0]
        
        return None
    
    def get_design_metadata(self, design_path: str) -> Dict:
        """
        Extract metadata from a design file
        
        Args:
            design_path: Path to the design file
            
        Returns:
            Dictionary with design metadata
        """
        if not os.path.exists(design_path):
            logger.error(f"Design file not found: {design_path}")
            return {}
        
        # Extract category from path
        path_parts = design_path.split(os.sep)
        category = next((part for part in path_parts if part in self.CATEGORIES), "Uncategorized")
        
        # Extract design name without extension
        basename = os.path.basename(design_path)
        name = os.path.splitext(basename)[0]
        
        # Get file stats
        stats = os.stat(design_path)
        modified = datetime.datetime.fromtimestamp(stats.st_mtime).isoformat()
        size = stats.st_size
        
        return {
            "name": name,
            "path": design_path,
            "category": category,
            "modified": modified,
            "size": size,
            "extension": os.path.splitext(design_path)[1],
            "last_viewed": None,
            "implementation_status": "not_started"
        }
    
    def load_tracking_data(self) -> Dict:
        """
        Load design implementation tracking data
        
        Returns:
            Dictionary with tracking data
        """
        if os.path.exists(self.tracking_file):
            try:
                with open(self.tracking_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading tracking data: {str(e)}")
        
        # Return default tracking data
        return {
            "designs": {},
            "implementations": [],
            "last_updated": datetime.datetime.now().isoformat()
        }
    
    def save_tracking_data(self, tracking_data: Dict) -> bool:
        """
        Save design implementation tracking data
        
        Args:
            tracking_data: The tracking data to save
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure storage directory exists
            os.makedirs(os.path.dirname(self.tracking_file), exist_ok=True)
            
            # Update timestamp
            tracking_data["last_updated"] = datetime.datetime.now().isoformat()
            
            # Save to file
            with open(self.tracking_file, 'w') as f:
                json.dump(tracking_data, f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Error saving tracking data: {str(e)}")
            return False
    
    def register_design(self, design_name: str) -> Optional[Dict]:
        """
        Register a design for implementation tracking
        
        Args:
            design_name: Name or path of the design
            
        Returns:
            Design metadata if successful, None otherwise
        """
        # Find the design file
        design_path = self.find_design(design_name)
        if not design_path:
            logger.error(f"Design not found: {design_name}")
            return None
        
        # Get design metadata
        metadata = self.get_design_metadata(design_path)
        
        # Load tracking data
        tracking_data = self.load_tracking_data()
        
        # Generate a unique ID for the design
        design_id = metadata["name"].lower().replace(" ", "_")
        count = 0
        original_id = design_id
        while design_id in tracking_data["designs"]:
            count += 1
            design_id = f"{original_id}_{count}"
        
        # Record the design
        metadata["id"] = design_id
        metadata["registered_at"] = datetime.datetime.now().isoformat()
        tracking_data["designs"][design_id] = metadata
        
        # Save tracking data
        if self.save_tracking_data(tracking_data):
            logger.info(f"Registered design: {design_name} with ID: {design_id}")
            return metadata
        
        return None
    
    def start_implementation(self, design_id: str, implementation_details: Dict) -> Optional[Dict]:
        """
        Start tracking implementation of a design
        
        Args:
            design_id: ID of the registered design
            implementation_details: Details about the implementation
            
        Returns:
            Implementation metadata if successful, None otherwise
        """
        # Load tracking data
        tracking_data = self.load_tracking_data()
        
        # Check if design exists
        if design_id not in tracking_data["designs"]:
            logger.error(f"Design not registered: {design_id}")
            return None
        
        # Create implementation record
        implementation = {
            "id": f"impl_{int(datetime.datetime.now().timestamp())}",
            "design_id": design_id,
            "design_name": tracking_data["designs"][design_id]["name"],
            "start_time": datetime.datetime.now().isoformat(),
            "status": "in_progress",
            "details": implementation_details,
            "files": [],
            "notes": []
        }
        
        # Update design status
        tracking_data["designs"][design_id]["implementation_status"] = "in_progress"
        tracking_data["designs"][design_id]["current_implementation"] = implementation["id"]
        
        # Add to implementations list
        tracking_data["implementations"].append(implementation)
        
        # Save tracking data
        if self.save_tracking_data(tracking_data):
            logger.info(f"Started implementation for design: {design_id}")
            return implementation
        
        return None
    
    def update_implementation(self, implementation_id: str, updates: Dict) -> bool:
        """
        Update an implementation tracking record
        
        Args:
            implementation_id: ID of the implementation
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False otherwise
        """
        # Load tracking data
        tracking_data = self.load_tracking_data()
        
        # Find the implementation
        for i, impl in enumerate(tracking_data["implementations"]):
            if impl["id"] == implementation_id:
                # Update the record
                for key, value in updates.items():
                    if key in ["id", "design_id"]:
                        # Don't allow changing these fields
                        continue
                    
                    if key == "files" and "files" in impl:
                        # Append to files rather than replace
                        impl["files"].extend([f for f in value if f not in impl["files"]])
                    elif key == "notes" and "notes" in impl:
                        # Append to notes
                        impl["notes"].extend(value)
                    else:
                        impl[key] = value
                
                # Update timestamp
                impl["last_updated"] = datetime.datetime.now().isoformat()
                
                # Update design status if implementation status changed
                if "status" in updates and impl["design_id"] in tracking_data["designs"]:
                    tracking_data["designs"][impl["design_id"]]["implementation_status"] = updates["status"]
                
                # Save tracking data
                if self.save_tracking_data(tracking_data):
                    logger.info(f"Updated implementation: {implementation_id}")
                    return True
                return False
        
        logger.error(f"Implementation not found: {implementation_id}")
        return False
    
    def complete_implementation(self, implementation_id: str, output_files: List[str], notes: Optional[str] = None) -> bool:
        """
        Mark an implementation as complete
        
        Args:
            implementation_id: ID of the implementation
            output_files: List of files created during implementation
            notes: Optional notes about the implementation
            
        Returns:
            True if successful, False otherwise
        """
        updates = {
            "status": "completed",
            "end_time": datetime.datetime.now().isoformat(),
            "files": output_files
        }
        
        if notes:
            updates["notes"] = [{"timestamp": datetime.datetime.now().isoformat(), "text": notes}]
        
        return self.update_implementation(implementation_id, updates)
    
    def get_design(self, design_id: str) -> Optional[Dict]:
        """
        Get design details by ID
        
        Args:
            design_id: ID of the design
            
        Returns:
            Design metadata if found, None otherwise
        """
        tracking_data = self.load_tracking_data()
        return tracking_data["designs"].get(design_id)
    
    def get_implementation(self, implementation_id: str) -> Optional[Dict]:
        """
        Get implementation details by ID
        
        Args:
            implementation_id: ID of the implementation
            
        Returns:
            Implementation metadata if found, None otherwise
        """
        tracking_data = self.load_tracking_data()
        for impl in tracking_data["implementations"]:
            if impl["id"] == implementation_id:
                return impl
        return None
    
    def list_designs(self, category: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        """
        List registered designs with optional filtering
        
        Args:
            category: Optional category to filter by
            status: Optional implementation status to filter by
            
        Returns:
            List of design metadata
        """
        tracking_data = self.load_tracking_data()
        designs = list(tracking_data["designs"].values())
        
        # Apply filters
        if category:
            designs = [d for d in designs if d.get("category") == category]
        
        if status:
            designs = [d for d in designs if d.get("implementation_status") == status]
        
        # Sort by registration time (newest first)
        designs.sort(key=lambda d: d.get("registered_at", ""), reverse=True)
        
        return designs
    
    def list_implementations(self, status: Optional[str] = None, design_id: Optional[str] = None) -> List[Dict]:
        """
        List implementations with optional filtering
        
        Args:
            status: Optional status to filter by
            design_id: Optional design ID to filter by
            
        Returns:
            List of implementation metadata
        """
        tracking_data = self.load_tracking_data()
        implementations = tracking_data["implementations"]
        
        # Apply filters
        if status:
            implementations = [i for i in implementations if i.get("status") == status]
        
        if design_id:
            implementations = [i for i in implementations if i.get("design_id") == design_id]
        
        # Sort by start time (newest first)
        implementations.sort(key=lambda i: i.get("start_time", ""), reverse=True)
        
        return implementations
    
    def search_designs(self, query: str) -> List[Dict]:
        """
        Search for designs by name or category
        
        Args:
            query: Search query
            
        Returns:
            List of matching design metadata
        """
        tracking_data = self.load_tracking_data()
        designs = list(tracking_data["designs"].values())
        
        # Filter by query
        query = query.lower()
        matching_designs = []
        
        for design in designs:
            name = design.get("name", "").lower()
            category = design.get("category", "").lower()
            
            if query in name or query in category:
                # Calculate relevance score
                name_score = name.count(query) * 2  # Name matches are more important
                category_score = category.count(query)
                design["relevance"] = name_score + category_score
                matching_designs.append(design)
        
        # Sort by relevance, then by registration time
        matching_designs.sort(key=lambda d: (d.get("relevance", 0), d.get("registered_at", "")), reverse=True)
        
        # Remove relevance field before returning
        for design in matching_designs:
            if "relevance" in design:
                del design["relevance"]
        
        return matching_designs
    
    def get_implementation_stats(self) -> Dict:
        """
        Get statistics about design implementations
        
        Returns:
            Dictionary with implementation statistics
        """
        tracking_data = self.load_tracking_data()
        
        # Count designs and implementations by status
        design_count = len(tracking_data["designs"])
        design_status_counts = {}
        for design in tracking_data["designs"].values():
            status = design.get("implementation_status", "unknown")
            design_status_counts[status] = design_status_counts.get(status, 0) + 1
        
        impl_count = len(tracking_data["implementations"])
        impl_status_counts = {}
        for impl in tracking_data["implementations"]:
            status = impl.get("status", "unknown")
            impl_status_counts[status] = impl_status_counts.get(status, 0) + 1
        
        # Calculate completion rate
        completion_rate = 0
        if design_count > 0:
            completed = design_status_counts.get("completed", 0)
            completion_rate = (completed / design_count) * 100
        
        # Count implementations by category
        category_counts = {}
        for impl in tracking_data["implementations"]:
            design_id = impl.get("design_id")
            if design_id and design_id in tracking_data["designs"]:
                category = tracking_data["designs"][design_id].get("category", "unknown")
                category_counts[category] = category_counts.get(category, 0) + 1
        
        return {
            "total_designs": design_count,
            "total_implementations": impl_count,
            "design_status_counts": design_status_counts,
            "implementation_status_counts": impl_status_counts,
            "completion_rate": completion_rate,
            "implementations_by_category": category_counts,
            "last_updated": datetime.datetime.now().isoformat()
        }