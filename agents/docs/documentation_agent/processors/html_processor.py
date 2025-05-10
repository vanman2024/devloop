"""
HTML Processor - Document processor for HTML files

This module implements the HTML document processor, which handles
parsing and extraction of text, metadata, and structure from HTML files.
"""

import re
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple

from ..models.document_model import Document, DocumentMetadata, DocumentType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HTMLProcessor:
    """
    HTML document processor that handles extraction of text, metadata,
    and structure from HTML files.
    
    Extracts metadata from HTML head elements and parses document
    structure for better understanding of document organization.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the HTML processor.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.extract_metadata = config.get("html", {}).get("extract_metadata", True)
        self.remove_boilerplate = config.get("html", {}).get("remove_boilerplate", True)
        self.convert_to_markdown = config.get("html", {}).get("convert_to_markdown", False)
        
        logger.info("HTML processor initialized")
    
    async def process(self, document: Document) -> Document:
        """
        Process an HTML document to extract text, metadata, and structure.
        
        Args:
            document: Document with HTML content
            
        Returns:
            Processed document with extracted content
        """
        if document.metadata.document_type != DocumentType.HTML:
            logger.warning(f"Document is not HTML: {document.metadata.document_type}")
            return document
        
        logger.info(f"Processing HTML document: {document.id}")
        
        try:
            # Decode content
            if document.content:
                html_content = document.content
            else:
                try:
                    html_content = document.raw_content.decode('utf-8')
                except UnicodeDecodeError:
                    html_content = document.raw_content.decode('latin-1', errors='replace')
                document.content = html_content
            
            # Extract metadata from HTML head
            if self.extract_metadata:
                document = await self._extract_metadata(document)
            
            # Extract and clean main content
            document = await self._extract_main_content(document)
            
            # Convert to Markdown if configured
            if self.convert_to_markdown:
                document = await self._convert_to_markdown(document)
            
            # Extract links from the document
            document = await self._extract_links(document)
            
        except Exception as e:
            logger.error(f"Error processing HTML document: {e}")
            if not document.content:
                document.content = f"Error processing HTML document: {str(e)}"
        
        logger.info(f"HTML processing completed: {document.id}")
        return document
    
    async def _extract_metadata(self, document: Document) -> Document:
        """
        Extract metadata from HTML head elements.
        
        Args:
            document: Document with HTML content
            
        Returns:
            Document with updated metadata
        """
        html_content = document.content
        
        # Try to use BeautifulSoup for better parsing
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract title
            title_tag = soup.find('title')
            if title_tag and title_tag.string:
                document.metadata.title = title_tag.string.strip()
            
            # Extract description from meta tags
            desc_tag = soup.find('meta', attrs={'name': 'description'})
            if desc_tag and desc_tag.get('content'):
                document.metadata.description = desc_tag['content'].strip()
            
            # Extract Open Graph metadata
            og_tags = {}
            for meta in soup.find_all('meta', attrs={'property': re.compile(r'^og:')}):
                og_property = meta.get('property')
                og_content = meta.get('content')
                if og_property and og_content:
                    og_tags[og_property[3:]] = og_content  # Remove 'og:' prefix
            
            # Extract Twitter Card metadata
            twitter_tags = {}
            for meta in soup.find_all('meta', attrs={'name': re.compile(r'^twitter:')}):
                twitter_name = meta.get('name')
                twitter_content = meta.get('content')
                if twitter_name and twitter_content:
                    twitter_tags[twitter_name[8:]] = twitter_content  # Remove 'twitter:' prefix
            
            # Extract other interesting meta tags
            meta_tags = {}
            for meta in soup.find_all('meta'):
                name = meta.get('name') or meta.get('property')
                content = meta.get('content')
                if name and content:
                    meta_tags[name] = content
            
            # Update document metadata
            if 'og:title' in og_tags and not document.metadata.title:
                document.metadata.title = og_tags['title']
            
            if 'og:description' in og_tags and not document.metadata.description:
                document.metadata.description = og_tags['description']
            
            if 'author' in meta_tags:
                document.metadata.authors = [meta_tags['author']]
            
            if 'keywords' in meta_tags:
                document.metadata.tags = [
                    tag.strip() for tag in meta_tags['keywords'].split(',')
                ]
            
            # Store all extracted metadata in custom_metadata
            document.metadata.custom_metadata["html_metadata"] = {
                "meta_tags": meta_tags,
                "open_graph": og_tags,
                "twitter_card": twitter_tags
            }
            
        except ImportError:
            logger.warning("BeautifulSoup not available, using regex for metadata extraction")
            # Fallback to regex-based extraction
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
            if title_match:
                document.metadata.title = title_match.group(1).strip()
            
            desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']\s*/?>', html_content, re.IGNORECASE)
            if desc_match:
                document.metadata.description = desc_match.group(1).strip()
        
        return document
    
    async def _extract_main_content(self, document: Document) -> Document:
        """
        Extract and clean the main content from HTML.
        
        Args:
            document: Document with HTML content
            
        Returns:
            Document with extracted main content
        """
        html_content = document.content
        
        # Try to use BeautifulSoup for better parsing
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for element in soup(['script', 'style', 'iframe', 'noscript']):
                element.decompose()
            
            # Try to find main content container
            main_content = None
            
            # Look for common content container elements in order of preference
            for selector in ['main', 'article', '[role="main"]', '#content', '#main', '.content', '.main', 'body']:
                if selector.startswith('#'):
                    element = soup.select_one(selector)
                elif selector.startswith('.'):
                    element = soup.select_one(selector)
                elif selector.startswith('['):
                    element = soup.select_one(selector)
                else:
                    element = soup.find(selector)
                
                if element:
                    main_content = element
                    break
            
            # If no main content container found, use body
            if not main_content:
                main_content = soup.body or soup
            
            # If configured to remove boilerplate, try to clean up the content
            if self.remove_boilerplate:
                # Remove navigation elements
                for nav in main_content.find_all(['nav', 'header', 'footer', 'aside']):
                    nav.decompose()
                
                # Remove common classes for non-content elements
                for element in main_content.select('.sidebar, .navigation, .menu, .comments, .ads, .advertisement'):
                    element.decompose()
            
            # Get the text content
            text_content = main_content.get_text(separator='\n')
            
            # Clean up the text
            lines = [line.strip() for line in text_content.splitlines()]
            cleaned_content = '\n'.join(line for line in lines if line)
            
            # Store both HTML and cleaned text
            document.metadata.custom_metadata["html_content"] = str(main_content)
            document.content = cleaned_content
            
            # Update word count
            document.metadata.word_count = len(cleaned_content.split())
            
            # Calculate reading time (average reading speed: 200 words per minute)
            document.metadata.reading_time_minutes = document.metadata.word_count / 200
            
        except ImportError:
            logger.warning("BeautifulSoup not available, using simple regex for content extraction")
            # Fallback to simple regex-based extraction
            # Remove script and style tags
            content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html_content, flags=re.IGNORECASE)
            content = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', content, flags=re.IGNORECASE)
            
            # Remove HTML tags
            content = re.sub(r'<[^>]+>', ' ', content)
            
            # Clean up whitespace
            content = re.sub(r'\s+', ' ', content)
            document.content = content.strip()
        
        return document
    
    async def _convert_to_markdown(self, document: Document) -> Document:
        """
        Convert HTML content to Markdown format.
        
        Args:
            document: Document with HTML content
            
        Returns:
            Document with content converted to Markdown
        """
        html_content = document.metadata.custom_metadata.get("html_content", document.content)
        
        try:
            import html2text
            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = False
            h.ignore_tables = False
            h.ignore_emphasis = False
            h.body_width = 0  # No wrapping
            
            markdown_content = h.handle(html_content)
            document.content = markdown_content
            document.metadata.custom_metadata["converted_to_markdown"] = True
            
        except ImportError:
            logger.warning("html2text not available, skipping Markdown conversion")
        
        return document
    
    async def _extract_links(self, document: Document) -> Document:
        """
        Extract links from the HTML document for relationship tracking.
        
        Args:
            document: Document with HTML content
            
        Returns:
            Document with extracted links in metadata
        """
        html_content = document.metadata.custom_metadata.get("html_content", document.content)
        
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            links = []
            for a_tag in soup.find_all('a', href=True):
                link = {
                    "url": a_tag['href'],
                    "text": a_tag.get_text().strip(),
                    "title": a_tag.get('title', ''),
                    "rel": a_tag.get('rel', ''),
                    "type": "link"
                }
                links.append(link)
            
            # Store links in metadata
            document.metadata.custom_metadata["links"] = links
            
        except ImportError:
            logger.warning("BeautifulSoup not available, using regex for link extraction")
            # Fallback to regex-based extraction
            link_pattern = r'<a\s+(?:[^>]*?\s+)?href=(["\'])(.*?)\1'
            links = []
            for match in re.finditer(link_pattern, html_content, re.IGNORECASE):
                links.append({
                    "url": match.group(2),
                    "text": "",
                    "type": "link"
                })
            
            document.metadata.custom_metadata["links"] = links
        
        return document