#!/usr/bin/env python3
"""
Knowledge API Test Script

This script provides utilities for testing the knowledge API functionality,
including adding documents, querying, and integration with the orchestration service.
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Add project root to path
PROJECT_ROOT = '/mnt/c/Users/angel/devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Try to import knowledge API
try:
    from agents.utils.knowledge_api import knowledge_api
    KNOWLEDGE_API_AVAILABLE = True
except ImportError:
    print("Knowledge API not available. Please check your installation.")
    KNOWLEDGE_API_AVAILABLE = False
    sys.exit(1)

def list_documents():
    """List all documents in the knowledge base"""
    result = knowledge_api.list_documents()
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    print(f"Found {result['count']} documents in the knowledge base:")
    
    for i, doc in enumerate(result['documents']):
        print(f"{i+1}. {doc.get('title', doc['filename'])} (ID: {doc['doc_id']})")
        print(f"   Type: {doc['file_type']}, Tags: {', '.join(doc['tags'])}")
        if doc.get('summary'):
            print(f"   Summary: {doc['summary'][:100]}...")
        print()


def add_document(file_path, tags=None):
    """Add a document to the knowledge base"""
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return
    
    print(f"Adding document: {file_path}")
    result = knowledge_api.add_document(file_path, tags=tags or [])
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    print(f"Document added successfully!")
    print(f"Document ID: {result['doc_id']}")
    print(f"Status: {result['status']}")
    
    # Print some metadata
    metadata = result.get('metadata', {})
    if metadata:
        print("\nMetadata:")
        print(f"  Filename: {metadata.get('filename', 'Unknown')}")
        print(f"  File type: {metadata.get('file_type', 'Unknown')}")
        print(f"  File size: {metadata.get('file_size', 0)} bytes")
        print(f"  Tags: {', '.join(metadata.get('tags', []))}")
        
        if metadata.get('summary'):
            print(f"\nSummary:\n{metadata['summary'][:200]}...")


def query_document(doc_id, query):
    """Query a specific document"""
    print(f"Querying document {doc_id} with: {query}")
    result = knowledge_api.query_document(doc_id, query)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    print(f"\nQuery: {result['query']}")
    print(f"Answer: {result['answer']}")
    print(f"Source: {result.get('source', 'Unknown')}")


def search_documents(query, tags=None, limit=5):
    """Search across all documents"""
    print(f"Searching documents for: {query}")
    if tags:
        print(f"Filtering by tags: {', '.join(tags)}")
    
    result = knowledge_api.search_documents(query, tags=tags, limit=limit)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    print(f"\nFound {result['count']} matching documents:")
    
    for i, doc in enumerate(result['results']):
        print(f"\n{i+1}. {doc.get('title', doc['filename'])} (ID: {doc['doc_id']})")
        print(f"   Tags: {', '.join(doc['tags'])}")
        print(f"   Snippet: {doc['snippet']}")


def get_document_summary(doc_id):
    """Get a comprehensive summary of a document"""
    print(f"Getting summary for document {doc_id}")
    result = knowledge_api.get_document_summary(doc_id)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    print(f"\nSummary (source: {result.get('source', 'Unknown')}):")
    print(result['summary'])


def interactive_mode():
    """Run in interactive mode"""
    print("Knowledge API Interactive Mode")
    print("Type 'help' for available commands, 'exit' to quit")
    
    while True:
        command = input("\nknowledge> ").strip()
        
        if command.lower() in ["exit", "quit", "q"]:
            break
        
        if command.lower() in ["help", "h", "?"]:
            print("\nAvailable commands:")
            print("  list                  - List all documents")
            print("  add <file_path> [tags]- Add a document")
            print("  query <doc_id> <query>- Query a specific document")
            print("  search <query> [tags] - Search across documents")
            print("  summary <doc_id>      - Get document summary")
            print("  exit                  - Exit interactive mode")
            continue
        
        parts = command.split()
        if not parts:
            continue
        
        if parts[0] == "list":
            list_documents()
        
        elif parts[0] == "add" and len(parts) >= 2:
            file_path = parts[1]
            tags = parts[2:] if len(parts) > 2 else []
            add_document(file_path, tags)
        
        elif parts[0] == "query" and len(parts) >= 3:
            doc_id = parts[1]
            query = " ".join(parts[2:])
            query_document(doc_id, query)
        
        elif parts[0] == "search" and len(parts) >= 2:
            # Check if we have tags (format: search query --tags tag1 tag2)
            if "--tags" in parts:
                tags_index = parts.index("--tags")
                query = " ".join(parts[1:tags_index])
                tags = parts[tags_index+1:]
            else:
                query = " ".join(parts[1:])
                tags = None
            
            search_documents(query, tags)
        
        elif parts[0] == "summary" and len(parts) >= 2:
            doc_id = parts[1]
            get_document_summary(doc_id)
        
        else:
            print("Unknown command. Type 'help' for available commands.")


def main():
    """Parse arguments and run the selected command"""
    parser = argparse.ArgumentParser(description="Knowledge API Test Script")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # List documents command
    subparsers.add_parser("list", help="List all documents in the knowledge base")
    
    # Add document command
    add_parser = subparsers.add_parser("add", help="Add a document to the knowledge base")
    add_parser.add_argument("file_path", help="Path to the document file")
    add_parser.add_argument("--tags", nargs="+", help="Tags for the document")
    
    # Query document command
    query_parser = subparsers.add_parser("query", help="Query a specific document")
    query_parser.add_argument("doc_id", help="Document ID")
    query_parser.add_argument("query", help="Query text")
    
    # Search documents command
    search_parser = subparsers.add_parser("search", help="Search across all documents")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--tags", nargs="+", help="Filter by tags")
    search_parser.add_argument("--limit", type=int, default=5, help="Maximum number of results")
    
    # Get document summary command
    summary_parser = subparsers.add_parser("summary", help="Get a comprehensive summary of a document")
    summary_parser.add_argument("doc_id", help="Document ID")
    
    # Interactive mode command
    subparsers.add_parser("interactive", help="Run in interactive mode")
    
    args = parser.parse_args()
    
    if not KNOWLEDGE_API_AVAILABLE:
        print("Knowledge API not available. Please check your installation.")
        return
    
    if args.command == "list":
        list_documents()
    
    elif args.command == "add":
        add_document(args.file_path, args.tags)
    
    elif args.command == "query":
        query_document(args.doc_id, args.query)
    
    elif args.command == "search":
        search_documents(args.query, args.tags, args.limit)
    
    elif args.command == "summary":
        get_document_summary(args.doc_id)
    
    elif args.command == "interactive":
        interactive_mode()
    
    else:
        # Default to interactive mode if no command is provided
        interactive_mode()


if __name__ == "__main__":
    main()