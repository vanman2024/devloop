#!/usr/bin/env python3
"""
search.py - A utility to search through the knowledge base

This script provides a simple search function to find relevant information
in the knowledge base documentation.
"""

import os
import re
import sys
from pathlib import Path

def search_kb(query, base_path=None):
    """
    Search the knowledge base for the given query.
    
    Args:
        query (str): The search term to look for
        base_path (str, optional): Base path for the knowledge base. Defaults to None.
    
    Returns:
        list: A list of tuples containing (file_path, line_number, line)
    """
    if base_path is None:
        # Default to the directory where this script is located
        base_path = Path(os.path.dirname(os.path.abspath(__file__)))
    else:
        base_path = Path(base_path)
    
    results = []
    
    # Walk through all files in the knowledge base
    for root, _, files in os.walk(base_path):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, base_path)
                
                # Search through the file content
                with open(file_path, 'r') as f:
                    for i, line in enumerate(f, 1):
                        if query.lower() in line.lower():
                            results.append((rel_path, i, line.strip()))
    
    return results

def print_results(results, max_results=10):
    """
    Print the search results in a formatted way.
    
    Args:
        results (list): List of search results
        max_results (int, optional): Maximum number of results to display. Defaults to 10.
    """
    if not results:
        print("No results found.")
        return
    
    print(f"Found {len(results)} results:")
    print("-" * 80)
    
    for i, (file_path, line_num, line) in enumerate(results[:max_results], 1):
        print(f"{i}. {file_path} (line {line_num}):")
        print(f"   {line}")
        print()
    
    if len(results) > max_results:
        print(f"...and {len(results) - max_results} more results.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python search.py <query>")
        return
    
    query = " ".join(sys.argv[1:])
    results = search_kb(query)
    print_results(results)

if __name__ == "__main__":
    main()