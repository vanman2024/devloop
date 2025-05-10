#!/usr/bin/env python3
"""
index_generator.py - Generates an index of all knowledge base content

This script scans the knowledge base directory structure and generates
an index file with links to all documents, making it easier to navigate.
"""

import os
from pathlib import Path
import re

def extract_title(file_path):
    """
    Extract the title from a markdown file (first h1 heading).
    
    Args:
        file_path (Path): Path to the markdown file
    
    Returns:
        str: The title or the filename if no title is found
    """
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            match = re.search(r'^# (.+)$', content, re.MULTILINE)
            if match:
                return match.group(1)
    except Exception:
        pass
    
    # Fallback to filename if no title found
    return file_path.stem.replace('_', ' ').title()

def scan_directory(directory):
    """
    Scan a directory and return a dictionary of all markdown files.
    
    Args:
        directory (Path): Directory to scan
    
    Returns:
        dict: Dictionary with key=category, value=list of (path, title) tuples
    """
    result = {}
    
    for item in sorted(directory.iterdir()):
        if item.is_dir() and not item.name.startswith('.'):
            # This is a category directory
            category_name = item.name.replace('_', ' ').title()
            result[category_name] = []
            
            # Get all markdown files in this directory
            for md_file in sorted(item.glob('*.md')):
                if md_file.name != 'README.md':  # Skip README files
                    title = extract_title(md_file)
                    rel_path = md_file.relative_to(directory)
                    result[category_name].append((rel_path, title))
        
        elif item.is_file() and item.suffix == '.md' and item.name != 'README.md' and item.name != 'index.md':
            # This is a top-level markdown file
            if 'General' not in result:
                result['General'] = []
            
            title = extract_title(item)
            rel_path = item.relative_to(directory)
            result['General'].append((rel_path, title))
    
    return result

def generate_index(directory):
    """
    Generate an index.md file for the knowledge base.
    
    Args:
        directory (Path): Knowledge base directory
    """
    index_data = scan_directory(directory)
    
    with open(directory / 'index.md', 'w') as f:
        f.write("# Knowledge Base Index\n\n")
        f.write("This document serves as an index to all content in the knowledge base.\n\n")
        
        for category, files in index_data.items():
            if files:  # Only write categories with files
                f.write(f"## {category}\n\n")
                
                for file_path, title in files:
                    f.write(f"- [{title}]({file_path})\n")
                
                f.write("\n")
        
        f.write("\n---\n\n")
        f.write("*This index was automatically generated. To regenerate, run `python index_generator.py`.*\n")

def main():
    # Get the directory where this script is located
    current_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    generate_index(current_dir)
    print(f"Index generated at {current_dir / 'index.md'}")

if __name__ == "__main__":
    main()