#!/usr/bin/env python3
"""
Asset Manager for SDK

This module provides tools for managing visual assets and screenshots,
facilitating documentation, testing, and design workflows. It helps organize,
retrieve, and analyze image assets within the SDK architecture.

Adapted from screenshot utility tools for integration with the SDK architecture.
"""

import os
import sys
import re
import shutil
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

# SDK Core imports
from .sdk_logger import get_logger

# Initialize logger
logger = get_logger(__name__)

class AssetManager:
    """
    Manages visual assets and screenshots for the SDK architecture.
    Provides tools for organizing, retrieving, and analyzing image assets.
    """
    
    # Asset categories
    CATEGORIES = {
        "UI Components": ["component", "button", "input", "card", "nav", "menu"],
        "Workflows": ["flow", "sequence", "process", "diagram", "step"],
        "Documentation": ["doc", "instruction", "guide", "example", "tutorial"],
        "Architecture": ["architecture", "structure", "system", "diagram", "model"],
        "Testing": ["test", "result", "output", "comparison", "validation"],
        "Errors": ["error", "bug", "issue", "problem", "exception"]
    }
    
    # Asset extensions we handle
    ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.pdf']
    
    def __init__(self, asset_dirs: Optional[List[str]] = None, storage_dir: Optional[str] = None):
        """Initialize the asset manager"""
        # Default asset directories
        self.asset_dirs = asset_dirs or [
            os.path.expanduser("~/Screenshots"),
            os.path.expanduser("~/Pictures/Screenshots"),
            os.path.expanduser("~/Documents/Assets")
        ]
        
        # WSL-specific paths
        if os.name != 'nt' and os.path.exists("/mnt/c"):
            self.asset_dirs.extend([
                "/mnt/c/Users/angel/OneDrive/Desktop/Screenshots",
                "/mnt/c/Users/angel/Pictures/Screenshots"
            ])
        
        # Storage directory for organized assets
        self.storage_dir = storage_dir or os.path.expanduser("~/.devloop/sdk/assets")
        
        # Ensure storage directory exists
        os.makedirs(self.storage_dir, exist_ok=True)
        
        # Create category subdirectories
        for category in self.CATEGORIES.keys():
            os.makedirs(os.path.join(self.storage_dir, category), exist_ok=True)
    
    def find_asset(self, filename: str) -> Optional[str]:
        """
        Find an asset by name across configured directories
        
        Args:
            filename: Name or partial name of the asset file
            
        Returns:
            Full path to the asset file, or None if not found
        """
        # If it's a full path and exists, use it directly
        if os.path.isfile(filename):
            return filename
        
        # Check if it's just a filename and search in configured directories
        for directory in self.asset_dirs:
            if os.path.exists(directory):
                # Check for exact match
                full_path = os.path.join(directory, filename)
                if os.path.isfile(full_path):
                    return full_path
                
                # Check for partial matches (if filename is a substring)
                for file in os.listdir(directory):
                    if filename.lower() in file.lower() and os.path.isfile(os.path.join(directory, file)):
                        return os.path.join(directory, file)
        
        # Check in our organized storage directory
        for category in self.CATEGORIES.keys():
            category_dir = os.path.join(self.storage_dir, category)
            if os.path.exists(category_dir):
                for file in os.listdir(category_dir):
                    if filename.lower() in file.lower() and os.path.isfile(os.path.join(category_dir, file)):
                        return os.path.join(category_dir, file)
        
        return None
    
    def list_recent_assets(self, count: int = 10, category: Optional[str] = None) -> List[Dict]:
        """
        List recent assets with optional category filtering
        
        Args:
            count: Maximum number of assets to list
            category: Optional category to filter by
            
        Returns:
            List of asset information dictionaries
        """
        assets = []
        
        # Function to check if a file is a valid asset
        def is_valid_asset(file_path: str) -> bool:
            return (os.path.isfile(file_path) and 
                   any(file_path.lower().endswith(ext) for ext in self.ASSET_EXTENSIONS))
        
        # Collect assets from source directories
        for directory in self.asset_dirs:
            if os.path.exists(directory):
                for file in os.listdir(directory):
                    file_path = os.path.join(directory, file)
                    if is_valid_asset(file_path):
                        mtime = os.path.getmtime(file_path)
                        assets.append({
                            "path": file_path,
                            "name": file,
                            "modified": mtime,
                            "formatted_time": datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M'),
                            "category": self._categorize_asset(file),
                            "size": os.path.getsize(file_path)
                        })
        
        # Collect assets from organized storage
        for category_name in self.CATEGORIES.keys():
            # Skip if filtering by different category
            if category and category != category_name:
                continue
                
            category_dir = os.path.join(self.storage_dir, category_name)
            if os.path.exists(category_dir):
                for file in os.listdir(category_dir):
                    file_path = os.path.join(category_dir, file)
                    if is_valid_asset(file_path):
                        mtime = os.path.getmtime(file_path)
                        assets.append({
                            "path": file_path,
                            "name": file,
                            "modified": mtime,
                            "formatted_time": datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M'),
                            "category": category_name,
                            "size": os.path.getsize(file_path)
                        })
        
        # Sort by modification time (newest first)
        assets.sort(key=lambda x: x["modified"], reverse=True)
        
        # Apply category filter if requested
        if category:
            assets = [a for a in assets if a["category"] == category]
        
        return assets[:count]
    
    def _categorize_asset(self, filename: str) -> str:
        """
        Determine the appropriate category for an asset based on filename
        
        Args:
            filename: Name of the asset file
            
        Returns:
            Category name
        """
        filename_lower = filename.lower()
        
        # Check each category's keywords
        for category, keywords in self.CATEGORIES.items():
            for keyword in keywords:
                if keyword.lower() in filename_lower:
                    return category
        
        # Default category
        return "Uncategorized"
    
    def organize_asset(self, file_path: str, target_category: Optional[str] = None, rename: Optional[str] = None) -> Optional[str]:
        """
        Organize an asset by copying it to the appropriate category directory
        
        Args:
            file_path: Path to the asset file
            target_category: Optional specific category (auto-detect if not provided)
            rename: Optional new name for the asset
            
        Returns:
            Path to the organized asset, or None if failed
        """
        if not os.path.isfile(file_path):
            logger.error(f"Asset file not found: {file_path}")
            return None
        
        # Determine category
        category = target_category or self._categorize_asset(os.path.basename(file_path))
        
        # Ensure category is valid
        if category not in self.CATEGORIES and category != "Uncategorized":
            logger.warning(f"Invalid category '{category}', using 'Uncategorized'")
            category = "Uncategorized"
            
        # Create category directory if it doesn't exist
        category_dir = os.path.join(self.storage_dir, category)
        os.makedirs(category_dir, exist_ok=True)
        
        # Determine destination filename
        if rename:
            # Ensure extension is preserved
            orig_ext = os.path.splitext(file_path)[1]
            if not rename.endswith(orig_ext):
                rename += orig_ext
            dest_filename = rename
        else:
            # Use original filename but add timestamp if needed to avoid conflicts
            dest_filename = os.path.basename(file_path)
            base, ext = os.path.splitext(dest_filename)
            
            # Check if file already exists and add timestamp if it does
            if os.path.exists(os.path.join(category_dir, dest_filename)):
                timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                dest_filename = f"{base}_{timestamp}{ext}"
        
        dest_path = os.path.join(category_dir, dest_filename)
        
        try:
            # Copy the file
            shutil.copy2(file_path, dest_path)
            logger.info(f"Organized asset: {file_path} → {dest_path}")
            return dest_path
        except Exception as e:
            logger.error(f"Error organizing asset: {str(e)}")
            return None
    
    def bulk_organize(self, source_dir: Optional[str] = None, limit: Optional[int] = None) -> Dict:
        """
        Bulk organize assets from a source directory
        
        Args:
            source_dir: Directory to organize assets from (default: most recent in asset_dirs)
            limit: Maximum number of assets to organize
            
        Returns:
            Dictionary with organization results
        """
        # Determine source directory
        if not source_dir:
            # Use the most recently modified directory from asset_dirs
            valid_dirs = [(d, os.path.getmtime(d)) for d in self.asset_dirs if os.path.exists(d)]
            if not valid_dirs:
                logger.error("No valid source directories found")
                return {"success": False, "message": "No valid source directories found"}
            
            source_dir = sorted(valid_dirs, key=lambda x: x[1], reverse=True)[0][0]
        
        if not os.path.exists(source_dir):
            logger.error(f"Source directory not found: {source_dir}")
            return {"success": False, "message": f"Source directory not found: {source_dir}"}
        
        # Find asset files in the source directory
        assets = []
        for file in os.listdir(source_dir):
            file_path = os.path.join(source_dir, file)
            if (os.path.isfile(file_path) and 
                any(file.lower().endswith(ext) for ext in self.ASSET_EXTENSIONS)):
                assets.append((file_path, os.path.getmtime(file_path)))
        
        # Sort by modification time (newest first)
        assets.sort(key=lambda x: x[1], reverse=True)
        
        # Limit the number of assets if requested
        if limit and len(assets) > limit:
            assets = assets[:limit]
        
        # Organize each asset
        results = {
            "total": len(assets),
            "organized": 0,
            "skipped": 0,
            "failed": 0,
            "categories": {}
        }
        
        for file_path, _ in assets:
            category = self._categorize_asset(os.path.basename(file_path))
            
            # Track statistics by category
            if category not in results["categories"]:
                results["categories"][category] = {"count": 0, "files": []}
            
            # Organize the asset
            dest_path = self.organize_asset(file_path, category)
            if dest_path:
                results["organized"] += 1
                results["categories"][category]["count"] += 1
                results["categories"][category]["files"].append(os.path.basename(dest_path))
            else:
                results["failed"] += 1
        
        results["success"] = results["failed"] == 0
        return results
    
    def get_asset_info(self, asset_path: str) -> Dict:
        """
        Get detailed information about an asset
        
        Args:
            asset_path: Path to the asset
            
        Returns:
            Dictionary with asset information
        """
        if not os.path.isfile(asset_path):
            logger.error(f"Asset file not found: {asset_path}")
            return {"success": False, "message": f"Asset file not found: {asset_path}"}
        
        # Get file stats
        stats = os.stat(asset_path)
        
        # Extract information
        filename = os.path.basename(asset_path)
        extension = os.path.splitext(filename)[1].lower()
        
        # Determine if it's in our organized storage
        is_organized = self.storage_dir in asset_path
        
        # Determine category
        if is_organized:
            relative_path = os.path.relpath(asset_path, self.storage_dir)
            parts = relative_path.split(os.sep)
            category = parts[0] if len(parts) > 1 else "Uncategorized"
        else:
            category = self._categorize_asset(filename)
        
        # Calculate human-readable size
        size_bytes = stats.st_size
        if size_bytes < 1024:
            size_str = f"{size_bytes} bytes"
        elif size_bytes < 1024 * 1024:
            size_str = f"{size_bytes / 1024:.1f} KB"
        else:
            size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
        
        return {
            "success": True,
            "path": asset_path,
            "filename": filename,
            "category": category,
            "extension": extension,
            "size": size_bytes,
            "size_formatted": size_str,
            "created": datetime.datetime.fromtimestamp(stats.st_ctime).isoformat(),
            "modified": datetime.datetime.fromtimestamp(stats.st_mtime).isoformat(),
            "is_organized": is_organized,
            "media_type": self._get_media_type(extension)
        }
    
    def _get_media_type(self, extension: str) -> str:
        """
        Determine media type from file extension
        
        Args:
            extension: File extension
            
        Returns:
            Media type string
        """
        image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        vector_extensions = ['.svg', '.eps', '.ai']
        document_extensions = ['.pdf', '.doc', '.docx']
        
        extension = extension.lower()
        
        if extension in image_extensions:
            return "image"
        elif extension in vector_extensions:
            return "vector"
        elif extension in document_extensions:
            return "document"
        else:
            return "unknown"
    
    def search_assets(self, query: str, category: Optional[str] = None) -> List[Dict]:
        """
        Search for assets by name or category
        
        Args:
            query: Search query
            category: Optional category to filter by
            
        Returns:
            List of matching asset information dictionaries
        """
        results = []
        query = query.lower()
        
        # Search in all asset directories
        for directory in self.asset_dirs:
            if os.path.exists(directory):
                for file in os.listdir(directory):
                    if not any(file.lower().endswith(ext) for ext in self.ASSET_EXTENSIONS):
                        continue
                        
                    file_path = os.path.join(directory, file)
                    if os.path.isfile(file_path) and query in file.lower():
                        file_category = self._categorize_asset(file)
                        
                        # Skip if category filter doesn't match
                        if category and category != file_category:
                            continue
                            
                        results.append(self.get_asset_info(file_path))
        
        # Search in organized storage
        for category_name in self.CATEGORIES.keys():
            # Skip if filtering by different category
            if category and category != category_name:
                continue
                
            category_dir = os.path.join(self.storage_dir, category_name)
            if os.path.exists(category_dir):
                for file in os.listdir(category_dir):
                    if not any(file.lower().endswith(ext) for ext in self.ASSET_EXTENSIONS):
                        continue
                        
                    file_path = os.path.join(category_dir, file)
                    if os.path.isfile(file_path) and query in file.lower():
                        results.append(self.get_asset_info(file_path))
        
        # Sort by modification time (newest first)
        results.sort(key=lambda x: x.get("modified", ""), reverse=True)
        
        return results