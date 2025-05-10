#!/usr/bin/env python3
"""
AI-Driven Document Tagging Example

This script demonstrates how to use the AI-driven tagging system to automatically 
categorize and tag documents when adding them to the knowledge base.
"""

import os
import sys
import json
from pathlib import Path
import argparse

# Add project root to path
PROJECT_ROOT = '/mnt/c/Users/angel/devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Import knowledge API
try:
    from agents.utils.knowledge_api import knowledge_api
    KNOWLEDGE_API_AVAILABLE = True
except ImportError:
    print("Knowledge API not available. Please check your installation.")
    KNOWLEDGE_API_AVAILABLE = False
    sys.exit(1)

def print_colorized(message, color="reset"):
    """Print message with color"""
    colors = {
        "red": "\033[91m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "magenta": "\033[95m",
        "cyan": "\033[96m",
        "white": "\033[97m",
        "reset": "\033[0m"
    }
    
    start_color = colors.get(color.lower(), colors["reset"])
    end_color = colors["reset"]
    
    print(f"{start_color}{message}{end_color}")

def add_document_with_ai_tagging(file_path, manual_tags=None):
    """Add document to knowledge base with AI tagging"""
    if not os.path.exists(file_path):
        print_colorized(f"Error: File not found: {file_path}", "red")
        return
    
    # Validate file extension
    file_ext = os.path.splitext(file_path)[1].lower()
    if file_ext not in ['.pdf', '.txt', '.md']:
        print_colorized(f"Error: Unsupported file type: {file_ext}. Only PDF, TXT, and MD files are supported.", "red")
        return
    
    print_colorized(f"Processing document: {file_path}", "blue")
    print("This may take a minute for large documents...")
    
    # Add document with auto-tagging
    result = knowledge_api.add_document(
        file_path=file_path,
        tags=manual_tags,
        auto_tag=True  # Enable AI tagging
    )
    
    if "error" in result:
        print_colorized(f"Error: {result['error']}", "red")
        return
    
    # Display results
    print_colorized("\n===== DOCUMENT ADDED SUCCESSFULLY =====", "green")
    print(f"Document ID: {result['doc_id']}")
    print(f"File: {result['metadata']['filename']}")
    
    # Display metadata
    metadata = result['metadata']
    print_colorized("\n----- DOCUMENT METADATA -----", "cyan")
    if 'metadata' in metadata:
        print(f"Title: {metadata['metadata'].get('title', 'N/A')}")
        print(f"File size: {metadata['file_size']} bytes")
        if 'document_type' in metadata['metadata']:
            print(f"Document type: {metadata['metadata']['document_type']}")
        if 'document_purpose' in metadata['metadata']:
            print(f"Document purpose: {metadata['metadata']['document_purpose']}")
        if 'technical_level' in metadata['metadata']:
            print(f"Technical level: {metadata['metadata']['technical_level']}")
        if 'estimated_reading_time' in metadata['metadata']:
            print(f"Estimated reading time: {metadata['metadata']['estimated_reading_time']} minutes")
    
    # Display tags
    print_colorized("\n----- TAGS -----", "yellow")
    if 'tags' in metadata:
        if manual_tags:
            print("Manual tags:")
            for tag in manual_tags:
                print(f"  - {tag}")
        
        if 'ai_generated_tags' in metadata and metadata['ai_generated_tags']:
            print("\nAI-generated tags:")
            for tag in metadata['ai_generated_tags']:
                print(f"  - {tag}")
    
    # Display categories
    if 'categories' in metadata and metadata['categories']:
        print_colorized("\n----- CATEGORIES -----", "magenta")
        for category in metadata['categories']:
            print(f"  - {category}")
    
    # Display topics and entities
    if 'metadata' in metadata:
        if 'primary_topics' in metadata['metadata'] and metadata['metadata']['primary_topics']:
            print_colorized("\n----- PRIMARY TOPICS -----", "blue")
            for topic in metadata['metadata']['primary_topics']:
                print(f"  - {topic}")
        
        if 'key_entities' in metadata['metadata'] and metadata['metadata']['key_entities']:
            print_colorized("\n----- KEY ENTITIES -----", "green")
            for entity in metadata['metadata']['key_entities']:
                print(f"  - {entity}")
    
    # Display summary
    if 'summary' in metadata and metadata['summary']:
        print_colorized("\n----- SUMMARY -----", "white")
        # Print only first 200 chars of summary
        summary = metadata['summary'][:200] + "..." if len(metadata['summary']) > 200 else metadata['summary']
        print(summary)
    
    print_colorized("\n===== DOCUMENT PROCESSING COMPLETE =====", "green")

def main():
    """Parse arguments and run the example"""
    parser = argparse.ArgumentParser(description="AI-Driven Document Tagging Example")
    parser.add_argument("file_path", help="Path to the document file (PDF, TXT, or MD)")
    parser.add_argument("--tags", nargs="*", help="Optional manual tags to add")
    
    args = parser.parse_args()
    
    if not KNOWLEDGE_API_AVAILABLE:
        print_colorized("Knowledge API not available. Please check your installation.", "red")
        return
    
    add_document_with_ai_tagging(args.file_path, args.tags)

if __name__ == "__main__":
    main()