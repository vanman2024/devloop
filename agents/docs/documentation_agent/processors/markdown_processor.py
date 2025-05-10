"""
Markdown Processor - Document processor for Markdown files

This module implements the Markdown document processor, which handles
parsing and extraction of text, metadata, and structure from Markdown files.
"""

import os
import re
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple

from ..models.document_model import Document, DocumentMetadata, DocumentType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MarkdownProcessor:
    """
    Markdown document processor that handles extraction of text, metadata,
    and structure from Markdown files.
    
    Extracts YAML frontmatter if present and preserves document structure
    for better understanding of document organization.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the Markdown processor.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.extract_frontmatter = config.get("markdown", {}).get("extract_frontmatter", True)
        self.parse_structure = config.get("markdown", {}).get("parse_structure", True)
        
        logger.info("Markdown processor initialized")
    
    async def process(self, document: Document) -> Document:
        """
        Process a Markdown document to extract text, metadata, and structure.
        
        Args:
            document: Document with Markdown content
            
        Returns:
            Processed document with extracted content
        """
        if document.metadata.document_type != DocumentType.MARKDOWN:
            logger.warning(f"Document is not Markdown: {document.metadata.document_type}")
            return document
        
        logger.info(f"Processing Markdown document: {document.id}")
        
        try:
            # Decode content
            if document.content:
                content = document.content
            else:
                try:
                    content = document.raw_content.decode('utf-8')
                except UnicodeDecodeError:
                    content = document.raw_content.decode('latin-1')
                document.content = content
            
            # Extract frontmatter if present
            if self.extract_frontmatter:
                document = await self._extract_frontmatter(document)
            
            # Parse document structure if enabled
            if self.parse_structure:
                document = await self._parse_structure(document)
            
            # Extract links from the document
            document = await self._extract_links(document)
            
        except Exception as e:
            logger.error(f"Error processing Markdown document: {e}")
            if not document.content:
                document.content = f"Error processing Markdown document: {str(e)}"
        
        logger.info(f"Markdown processing completed: {document.id}")
        return document
    
    async def _extract_frontmatter(self, document: Document) -> Document:
        """
        Extract YAML frontmatter from Markdown document and update metadata.
        
        Args:
            document: Document with Markdown content
            
        Returns:
            Document with updated metadata and content
        """
        content = document.content
        
        # Check for YAML frontmatter (between --- delimiters)
        frontmatter_pattern = r"^---\s*\n(.*?)\n---\s*\n"
        frontmatter_match = re.search(frontmatter_pattern, content, re.DOTALL)
        
        if frontmatter_match:
            logger.info(f"Extracting frontmatter from document: {document.id}")
            frontmatter_text = frontmatter_match.group(1)
            
            try:
                import yaml
                frontmatter = yaml.safe_load(frontmatter_text)
                
                # Update document metadata from frontmatter
                if frontmatter and isinstance(frontmatter, dict):
                    if "title" in frontmatter and frontmatter["title"]:
                        document.metadata.title = frontmatter["title"]
                    
                    if "description" in frontmatter and frontmatter["description"]:
                        document.metadata.description = frontmatter["description"]
                    
                    if "authors" in frontmatter:
                        if isinstance(frontmatter["authors"], list):
                            document.metadata.authors = frontmatter["authors"]
                        elif isinstance(frontmatter["authors"], str):
                            document.metadata.authors = [frontmatter["authors"]]
                    elif "author" in frontmatter:
                        if isinstance(frontmatter["author"], str):
                            document.metadata.authors = [frontmatter["author"]]
                    
                    if "tags" in frontmatter and isinstance(frontmatter["tags"], list):
                        document.metadata.tags = frontmatter["tags"]
                    
                    if "version" in frontmatter and frontmatter["version"]:
                        document.metadata.version = str(frontmatter["version"])
                    
                    # Store all frontmatter in custom_metadata
                    document.metadata.custom_metadata["frontmatter"] = frontmatter
                
                # Remove frontmatter from content
                document.content = content[frontmatter_match.end():]
                
            except Exception as e:
                logger.error(f"Error parsing frontmatter: {e}")
        
        return document
    
    async def _parse_structure(self, document: Document) -> Document:
        """
        Parse the structure of the Markdown document to understand organization.
        
        Args:
            document: Document with Markdown content
            
        Returns:
            Document with structure analysis in metadata
        """
        content = document.content
        
        # Extract heading structure
        heading_pattern = r"^(#{1,6})\s+(.+)$"
        headings = []
        
        for line_num, line in enumerate(content.splitlines()):
            heading_match = re.match(heading_pattern, line)
            if heading_match:
                level = len(heading_match.group(1))
                text = heading_match.group(2).strip()
                headings.append({
                    "level": level,
                    "text": text,
                    "line": line_num + 1
                })
        
        # Build table of contents
        toc = []
        current_path = [0, 0, 0, 0, 0, 0]  # h1, h2, h3, h4, h5, h6
        
        for heading in headings:
            level = heading["level"]
            
            # Update the current path
            current_path[level - 1] += 1
            for i in range(level, 6):
                current_path[i] = 0
            
            # Generate the section number
            section_path = current_path[:level]
            section_number = ".".join(str(x) for x in section_path if x > 0)
            
            toc.append({
                "level": level,
                "text": heading["text"],
                "section": section_number,
                "line": heading["line"]
            })
        
        # Store structure in metadata
        document.metadata.custom_metadata["structure"] = {
            "headings": headings,
            "toc": toc
        }
        
        # Update word count
        words = content.split()
        document.metadata.word_count = len(words)
        
        # Calculate reading time (average reading speed: 200 words per minute)
        document.metadata.reading_time_minutes = document.metadata.word_count / 200
        
        # If document doesn't have a title, use the first h1 heading if available
        if not document.metadata.title and headings and headings[0]["level"] == 1:
            document.metadata.title = headings[0]["text"]
        
        return document
    
    async def _extract_links(self, document: Document) -> Document:
        """
        Extract links from the Markdown document for relationship tracking.
        
        Args:
            document: Document with Markdown content
            
        Returns:
            Document with extracted links in metadata
        """
        content = document.content
        
        # Extract Markdown links [text](url)
        md_link_pattern = r"\[(.+?)\]\((.+?)\)"
        md_links = re.findall(md_link_pattern, content)
        
        # Extract reference links [text][reference]
        ref_link_pattern = r"\[(.+?)\]\[(.+?)\]"
        ref_links = re.findall(ref_link_pattern, content)
        
        # Extract reference definitions [reference]: url
        ref_def_pattern = r"^\[(.+?)\]:\s*(.+?)$"
        ref_defs = {}
        for line in content.splitlines():
            ref_def_match = re.match(ref_def_pattern, line)
            if ref_def_match:
                ref_defs[ref_def_match.group(1)] = ref_def_match.group(2)
        
        # Extract inline links <url>
        inline_link_pattern = r"<(https?://[^>]+)>"
        inline_links = re.findall(inline_link_pattern, content)
        
        # Collect all links
        links = []
        
        # Process Markdown links
        for text, url in md_links:
            links.append({
                "text": text,
                "url": url,
                "type": "markdown"
            })
        
        # Process reference links
        for text, ref in ref_links:
            if ref in ref_defs:
                links.append({
                    "text": text,
                    "url": ref_defs[ref],
                    "type": "reference",
                    "reference": ref
                })
        
        # Process inline links
        for url in inline_links:
            links.append({
                "text": url,
                "url": url,
                "type": "inline"
            })
        
        # Store links in metadata
        document.metadata.custom_metadata["links"] = links
        
        return document