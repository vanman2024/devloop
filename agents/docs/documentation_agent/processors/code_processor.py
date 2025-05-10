"""
Code Processor - Document processor for source code files

This module implements the code document processor, which handles
parsing source code files and extracting documentation, structure,
and relationships.
"""

import os
import re
import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

from ..models.document_model import Document, DocumentMetadata, DocumentType, Chunk

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Language specific patterns for extracting documentation
LANGUAGE_PATTERNS = {
    # Python - docstrings and comments
    "python": {
        "extensions": [".py"],
        "docstring": r'"""(.*?)"""',
        "docstring_single": r"'''(.*?)'''",
        "comment": r"#\s*(.*)",
        "function": r"def\s+(\w+)\s*\(([^)]*)\)\s*(?:->.*?)?:",
        "class": r"class\s+(\w+)\s*(?:\([^)]*\))?\s*:",
        "import": r"(?:from\s+([\w.]+)\s+)?import\s+([\w.]+)"
    },
    # JavaScript/TypeScript - JSDoc and comments
    "javascript": {
        "extensions": [".js", ".jsx", ".ts", ".tsx"],
        "docstring": r"/\*\*(.*?)\*/",
        "comment": r"//\s*(.*)",
        "function": r"(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>)",
        "class": r"class\s+(\w+)",
        "import": r"import\s+(?:{[^}]*}|[^;]+)\s+from\s+['\"]([^'\"]+)['\"]"
    },
    # Java - JavaDoc and comments
    "java": {
        "extensions": [".java"],
        "docstring": r"/\*\*(.*?)\*/",
        "comment": r"//\s*(.*)",
        "function": r"(?:public|private|protected|static|\s) +(?:[a-zA-Z0-9_]+) +([a-zA-Z0-9_]+) *\([^)]*\)",
        "class": r"class\s+(\w+)",
        "import": r"import\s+([^;]+);"
    },
    # Go - GoDoc and comments
    "go": {
        "extensions": [".go"],
        "comment": r"//\s*(.*)",
        "function": r"func\s+(?:\([^)]*\)\s*)?(\w+)\s*\([^)]*\)",
        "struct": r"type\s+(\w+)\s+struct",
        "import": r"import\s+(?:\"([^\"]+)\"|(?:\([^)]*\)))"
    },
    # Ruby - RDoc and comments
    "ruby": {
        "extensions": [".rb"],
        "comment": r"#\s*(.*)",
        "function": r"def\s+(\w+)",
        "class": r"class\s+(\w+)",
        "module": r"module\s+(\w+)",
        "require": r"require\s+['\"]([^'\"]+)['\"]"
    },
    # C/C++ - Doxygen and comments
    "c": {
        "extensions": [".c", ".cpp", ".h", ".hpp"],
        "docstring": r"/\*\*(.*?)\*/",
        "docstring_alt": r"/\*(.*?)\*/",
        "comment": r"//\s*(.*)",
        "function": r"(?:[a-zA-Z0-9_]+\s+)+([a-zA-Z0-9_]+)\s*\([^;]*\)",
        "class": r"class\s+(\w+)",
        "include": r"#include\s+[<\"]([^>\"]+)[>\"]"
    }
}


class CodeProcessor:
    """
    Source code processor that extracts documentation, structure,
    and relationships from code files.
    
    Handles various programming languages and can extract:
    - Documentation comments and docstrings
    - Function and class definitions
    - Import/require statements for dependency tracking
    - Code structure information
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the code processor.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.extract_imports = config.get("code", {}).get("extract_imports", True)
        self.extract_structure = config.get("code", {}).get("extract_structure", True)
        self.include_code = config.get("code", {}).get("include_code", True)
        self.doc_comment_only = config.get("code", {}).get("doc_comment_only", False)
        
        # Initialize language extension mapping for quick lookup
        self.extension_to_language = {}
        for lang, patterns in LANGUAGE_PATTERNS.items():
            for ext in patterns["extensions"]:
                self.extension_to_language[ext] = lang
        
        logger.info("Code processor initialized")
    
    async def process(self, document: Document) -> Document:
        """
        Process a code document to extract documentation, structure, and imports.
        
        Args:
            document: Document with code content
            
        Returns:
            Processed document with extracted content
        """
        # Determine the programming language from the file extension or content
        file_ext = os.path.splitext(document.metadata.source_path)[1].lower()
        language = self.extension_to_language.get(file_ext)
        
        if not language:
            logger.warning(f"Unknown code language for {document.metadata.source_path}")
            # Try to determine language from content or use generic extraction
            language = await self._detect_language(document)
        
        # Store language in metadata
        document.metadata.custom_metadata["language"] = language
        
        logger.info(f"Processing code document: {document.id}, language: {language}")
        
        try:
            # Extract documentation and structure
            document = await self._extract_documentation(document, language)
            
            # Extract imports and dependencies if enabled
            if self.extract_imports:
                document = await self._extract_imports(document, language)
            
            # Extract code structure if enabled
            if self.extract_structure:
                document = await self._extract_structure(document, language)
            
            # If we don't want to include the raw code, create a clean document with 
            # just the extracted information (for storage efficiency)
            if not self.include_code:
                # Store original content temporarily
                original_content = document.content
                
                # Create a document with just the extracted information
                doc_content = []
                
                # Add file information
                doc_content.append(f"# {os.path.basename(document.metadata.source_path)}")
                doc_content.append(f"Language: {language}")
                doc_content.append("")
                
                # Add extracted documentation
                if "documentation" in document.metadata.custom_metadata:
                    doc_content.append("## Documentation")
                    doc_content.append("")
                    doc_content.append(document.metadata.custom_metadata["documentation"])
                    doc_content.append("")
                
                # Add structure information
                if "structure" in document.metadata.custom_metadata:
                    doc_content.append("## Structure")
                    doc_content.append("")
                    
                    structure = document.metadata.custom_metadata["structure"]
                    
                    if "classes" in structure:
                        doc_content.append("### Classes")
                        for cls in structure["classes"]:
                            doc_content.append(f"- {cls}")
                        doc_content.append("")
                    
                    if "functions" in structure:
                        doc_content.append("### Functions")
                        for func in structure["functions"]:
                            doc_content.append(f"- {func}")
                        doc_content.append("")
                
                # Add import information
                if "imports" in document.metadata.custom_metadata:
                    doc_content.append("## Dependencies")
                    doc_content.append("")
                    
                    imports = document.metadata.custom_metadata["imports"]
                    for imp in imports:
                        doc_content.append(f"- {imp}")
                    doc_content.append("")
                
                # Update document content
                document.content = "\n".join(doc_content)
                
                # Store original code in metadata
                document.metadata.custom_metadata["original_code"] = original_content
            
            logger.info(f"Code processing completed: {document.id}")
            
        except Exception as e:
            logger.error(f"Error processing code document: {e}")
            document.content = f"Error processing code document: {str(e)}"
        
        return document
    
    async def _detect_language(self, document: Document) -> str:
        """
        Attempt to detect the programming language from the content.
        
        Args:
            document: Document to analyze
            
        Returns:
            Detected language or "unknown"
        """
        # Simple heuristics for language detection
        content = document.content or ""
        
        # Check for Python
        if content.count("def ") > 0 and content.count(":") > 0 and content.count("import ") > 0:
            return "python"
        
        # Check for JavaScript/TypeScript
        if content.count("function ") > 0 or content.count("const ") > 0 or content.count("=> {") > 0:
            if content.count("interface ") > 0 or content.count(": ") > 0:
                return "javascript"  # TypeScript is handled by the same patterns
            return "javascript"
        
        # Check for Java
        if content.count("public class ") > 0 or content.count("private ") > 0:
            return "java"
        
        # Check for Go
        if content.count("func ") > 0 and content.count("package ") > 0:
            return "go"
        
        # Check for Ruby
        if content.count("def ") > 0 and content.count("end") > 0:
            return "ruby"
        
        # Check for C/C++
        if content.count("#include ") > 0:
            return "c"
        
        # Default to unknown
        return "unknown"
    
    async def _extract_documentation(self, document: Document, language: str) -> Document:
        """
        Extract documentation comments and docstrings from code.
        
        Args:
            document: Document to extract from
            language: Programming language
            
        Returns:
            Document with extracted documentation
        """
        content = document.content or ""
        
        if language not in LANGUAGE_PATTERNS:
            # For unknown languages, use generic extraction
            language = "unknown"
            docstrings = []
            comments = []
        else:
            patterns = LANGUAGE_PATTERNS[language]
            
            # Extract docstrings if pattern exists
            docstrings = []
            if "docstring" in patterns:
                docstrings.extend(re.findall(patterns["docstring"], content, re.DOTALL))
            
            if "docstring_single" in patterns:
                docstrings.extend(re.findall(patterns["docstring_single"], content, re.DOTALL))
                
            if "docstring_alt" in patterns:
                docstrings.extend(re.findall(patterns["docstring_alt"], content, re.DOTALL))
            
            # Extract comments
            comments = []
            if "comment" in patterns:
                # Get single-line comments
                comments = re.findall(patterns["comment"], content)
        
        # Clean up and combine documentation
        doc_parts = []
        
        # Process docstrings
        for docstring in docstrings:
            # Clean up docstring
            clean_docstring = self._clean_docstring(docstring)
            if clean_docstring:
                doc_parts.append(clean_docstring)
        
        # Process comments (if not doc_comment_only)
        if not self.doc_comment_only:
            current_comment_block = []
            
            for comment in comments:
                if comment.strip():
                    current_comment_block.append(comment)
                elif current_comment_block:
                    # End of comment block
                    doc_parts.append("\n".join(current_comment_block))
                    current_comment_block = []
            
            # Add any remaining comment block
            if current_comment_block:
                doc_parts.append("\n".join(current_comment_block))
        
        # Store documentation in metadata
        document.metadata.custom_metadata["documentation"] = "\n\n".join(doc_parts)
        
        logger.info(f"Extracted {len(docstrings)} docstrings and {len(comments)} comments")
        return document
    
    def _clean_docstring(self, docstring: str) -> str:
        """Clean up a docstring by removing indentation and markers."""
        lines = docstring.split("\n")
        cleaned_lines = []
        
        for line in lines:
            # Remove common indentation patterns
            stripped = line.strip()
            
            # Skip lines that are just markers
            if stripped in ('"""', "'''", "*/", "*"):
                continue
                
            # Remove leading asterisks (common in JSDoc, JavaDoc)
            if stripped.startswith("* "):
                stripped = stripped[2:]
                
            cleaned_lines.append(stripped)
        
        return "\n".join(cleaned_lines).strip()
    
    async def _extract_imports(self, document: Document, language: str) -> Document:
        """
        Extract import statements and dependencies.
        
        Args:
            document: Document to extract from
            language: Programming language
            
        Returns:
            Document with extracted imports
        """
        content = document.content or ""
        imports = []
        
        if language in LANGUAGE_PATTERNS and "import" in LANGUAGE_PATTERNS[language]:
            pattern = LANGUAGE_PATTERNS[language]["import"]
            
            # Find all import statements
            for match in re.finditer(pattern, content):
                if language == "python":
                    # Handle Python's "from x import y" syntax
                    if match.group(1):  # from module import
                        base_module = match.group(1)
                        imported = match.group(2)
                        imports.append(f"{base_module}.{imported}")
                    else:
                        imports.append(match.group(2))
                else:
                    # For other languages, get the full match
                    if match.lastindex:
                        imported = match.group(match.lastindex)
                        imports.append(imported)
        
        # Store imports in metadata
        document.metadata.custom_metadata["imports"] = imports
        
        logger.info(f"Extracted {len(imports)} imports/dependencies")
        return document
    
    async def _extract_structure(self, document: Document, language: str) -> Document:
        """
        Extract code structure (classes, functions, etc.).
        
        Args:
            document: Document to extract from
            language: Programming language
            
        Returns:
            Document with extracted structure
        """
        content = document.content or ""
        structure = {
            "classes": [],
            "functions": [],
        }
        
        if language in LANGUAGE_PATTERNS:
            patterns = LANGUAGE_PATTERNS[language]
            
            # Extract classes
            if "class" in patterns:
                for match in re.finditer(patterns["class"], content):
                    class_name = match.group(1)
                    structure["classes"].append(class_name)
            
            # Extract structs (Go)
            if "struct" in patterns:
                for match in re.finditer(patterns["struct"], content):
                    struct_name = match.group(1)
                    structure["classes"].append(struct_name)
            
            # Extract functions
            if "function" in patterns:
                for match in re.finditer(patterns["function"], content):
                    # Get the captured group that isn't None
                    func_name = next((g for g in match.groups() if g is not None), "")
                    if func_name:
                        structure["functions"].append(func_name)
        
        # Store structure in metadata
        document.metadata.custom_metadata["structure"] = structure
        
        logger.info(f"Extracted {len(structure['classes'])} classes and {len(structure['functions'])} functions")
        return document