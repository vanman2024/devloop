"""
PDF Document Processor

This module provides functionality for processing PDF documents using Anthropic's Claude API
and integrating with the knowledge base. It includes:

1. PDF text extraction
2. Document chunking
3. Claude API integration for understanding complex PDFs
4. Metadata extraction
5. Integration with knowledge graph

The processor supports efficient caching to minimize redundant API calls.
"""

import os
import hashlib
import json
import time
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import logging
import base64

try:
    import fitz  # PyMuPDF
except ImportError:
    logging.warning("PyMuPDF not installed. Install with: pip install pymupdf")

try:
    import anthropic
except ImportError:
    logging.warning("Anthropic Python SDK not installed. Install with: pip install anthropic")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
CACHE_DIR = os.environ.get("KNOWLEDGE_CACHE_DIR", "knowledge_cache")
CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CHUNK_SIZE = 10000  # Characters per chunk
CHUNK_OVERLAP = 1000  # Character overlap between chunks


class PDFProcessor:
    """
    Process PDF documents for knowledge base integration with Claude API.
    """

    def __init__(self, cache_dir: str = CACHE_DIR, use_claude: bool = True):
        """
        Initialize the PDF processor.

        Args:
            cache_dir: Directory to store cached results
            use_claude: Whether to use Claude API for enhanced PDF understanding
        """
        self.cache_dir = Path(cache_dir)
        self.use_claude = use_claude
        self.claude_client = None

        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize Claude client if API key is available
        if self.use_claude and CLAUDE_API_KEY:
            try:
                self.claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Claude client: {e}")
                self.use_claude = False
        elif self.use_claude:
            logger.warning("ANTHROPIC_API_KEY not set. Claude API integration disabled.")
            self.use_claude = False

    def _generate_document_id(self, file_path: str, content: Optional[bytes] = None) -> str:
        """
        Generate a unique ID for a document based on its content or path.

        Args:
            file_path: Path to the PDF file
            content: Optional binary content of the PDF

        Returns:
            str: Unique document ID
        """
        if content:
            return hashlib.sha256(content).hexdigest()
        
        with open(file_path, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()

    def _get_cache_path(self, doc_id: str, cache_type: str) -> Path:
        """
        Get the cache file path for a document.

        Args:
            doc_id: Document ID
            cache_type: Type of cached data (e.g., 'text', 'metadata', 'claude')

        Returns:
            Path: Path to the cache file
        """
        return self.cache_dir / f"{doc_id}_{cache_type}.json"

    def _load_from_cache(self, doc_id: str, cache_type: str) -> Optional[Dict]:
        """
        Load document data from cache if available.

        Args:
            doc_id: Document ID
            cache_type: Type of cached data

        Returns:
            Optional[Dict]: Cached data or None if not available/expired
        """
        cache_path = self._get_cache_path(doc_id, cache_type)
        
        if not cache_path.exists():
            return None
            
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
                
            # Check cache expiration
            cache_ttl = cache_data.get('ttl', 0)
            if cache_ttl > 0 and time.time() > cache_data.get('timestamp', 0) + cache_ttl:
                logger.info(f"Cache expired for {doc_id} ({cache_type})")
                return None
                
            return cache_data
        except Exception as e:
            logger.warning(f"Error loading cache for {doc_id} ({cache_type}): {e}")
            return None

    def _save_to_cache(self, doc_id: str, cache_type: str, data: Dict, ttl: int = 0) -> None:
        """
        Save document data to cache.

        Args:
            doc_id: Document ID
            cache_type: Type of cached data
            data: Data to cache
            ttl: Time-to-live in seconds (0 = no expiration)
        """
        cache_path = self._get_cache_path(doc_id, cache_type)
        
        # Add timestamp and TTL
        cache_data = {
            **data,
            'timestamp': time.time(),
            'ttl': ttl
        }
        
        try:
            with open(cache_path, 'w') as f:
                json.dump(cache_data, f)
        except Exception as e:
            logger.error(f"Error saving cache for {doc_id} ({cache_type}): {e}")

    def extract_text_from_pdf(self, file_path: str) -> Dict[str, Any]:
        """
        Extract text and metadata from a PDF file.

        Args:
            file_path: Path to the PDF file

        Returns:
            Dict: Dictionary with text content and metadata
        """
        # Generate document ID
        doc_id = self._generate_document_id(file_path)
        
        # Check cache first
        cached_data = self._load_from_cache(doc_id, 'text')
        if cached_data:
            logger.info(f"Using cached text extraction for {file_path}")
            return cached_data
            
        # Extract text and metadata from PDF
        try:
            pdf_document = fitz.open(file_path)
            
            # Extract metadata
            metadata = {
                'title': pdf_document.metadata.get('title', ''),
                'author': pdf_document.metadata.get('author', ''),
                'subject': pdf_document.metadata.get('subject', ''),
                'keywords': pdf_document.metadata.get('keywords', ''),
                'creator': pdf_document.metadata.get('creator', ''),
                'producer': pdf_document.metadata.get('producer', ''),
                'page_count': len(pdf_document),
                'file_size': os.path.getsize(file_path),
                'file_name': os.path.basename(file_path)
            }
            
            # Extract text content
            text_content = []
            for page_num, page in enumerate(pdf_document):
                text = page.get_text()
                text_content.append({
                    'page_num': page_num + 1,
                    'text': text
                })
                
            # Create result
            result = {
                'doc_id': doc_id,
                'file_path': file_path,
                'metadata': metadata,
                'text_content': text_content,
                'full_text': '\n\n'.join([page['text'] for page in text_content])
            }
            
            # Cache result (30 days TTL)
            self._save_to_cache(doc_id, 'text', result, ttl=30 * 24 * 60 * 60)
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            raise

    def chunk_document(self, document: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Split document into manageable chunks for processing.

        Args:
            document: Document dictionary with text content

        Returns:
            List[Dict]: List of document chunks
        """
        doc_id = document['doc_id']
        
        # Check cache first
        cached_data = self._load_from_cache(doc_id, 'chunks')
        if cached_data:
            logger.info(f"Using cached chunks for {document['file_path']}")
            return cached_data['chunks']
            
        # Get full text
        full_text = document['full_text']
        
        # Create chunks with overlap
        chunks = []
        start = 0
        
        while start < len(full_text):
            end = min(start + CHUNK_SIZE, len(full_text))
            
            # Try to find a good breaking point
            if end < len(full_text):
                # Look for paragraph break
                paragraph_break = full_text.rfind('\n\n', start, end)
                if paragraph_break != -1 and paragraph_break > start + CHUNK_SIZE // 2:
                    end = paragraph_break
                else:
                    # Look for line break
                    line_break = full_text.rfind('\n', start, end)
                    if line_break != -1 and line_break > start + CHUNK_SIZE // 2:
                        end = line_break
                    else:
                        # Look for space
                        space = full_text.rfind(' ', start, end)
                        if space != -1 and space > start + CHUNK_SIZE // 2:
                            end = space
            
            # Create chunk
            chunk_text = full_text[start:end].strip()
            if chunk_text:
                chunk = {
                    'doc_id': doc_id,
                    'chunk_id': f"{doc_id}_chunk_{len(chunks)}",
                    'text': chunk_text,
                    'start_char': start,
                    'end_char': end,
                    'metadata': {
                        **document['metadata'],
                        'chunk_index': len(chunks)
                    }
                }
                chunks.append(chunk)
            
            # Move to next chunk with overlap
            start = end - CHUNK_OVERLAP
            if start < 0:
                start = 0
                
        # Cache chunks (30 days TTL)
        self._save_to_cache(doc_id, 'chunks', {'chunks': chunks}, ttl=30 * 24 * 60 * 60)
        
        return chunks

    def process_with_claude(self, document: Dict[str, Any], query: Optional[str] = None) -> Dict[str, Any]:
        """
        Process document with Claude API for enhanced understanding.

        Args:
            document: Document dictionary
            query: Optional specific query about the document

        Returns:
            Dict: Claude's analysis of the document
        """
        if not self.use_claude or not self.claude_client:
            logger.error("Claude API not available")
            return {"error": "Claude API not available"}
            
        doc_id = document['doc_id']
        
        # Generate a cache key that includes the query if present
        cache_key = f"claude_{query.replace(' ', '_')[:50]}" if query else "claude_summary"
        
        # Check cache first
        cached_data = self._load_from_cache(doc_id, cache_key)
        if cached_data:
            logger.info(f"Using cached Claude analysis for {document['file_path']}")
            return cached_data
            
        try:
            # Prepare prompt for Claude
            if query:
                prompt = f"""
                <document>
                {document['full_text'][:100000]}  # Limit to first 100K chars for API limits
                </document>

                Answer the following question about the document above:
                {query}

                Provide a detailed and accurate response based only on the document contents.
                """
            else:
                prompt = f"""
                <document>
                {document['full_text'][:100000]}  # Limit to first 100K chars for API limits
                </document>

                Please analyze this document and provide:
                1. A comprehensive summary (3-5 paragraphs)
                2. Key topics and concepts covered
                3. Important entities mentioned (people, organizations, technologies)
                4. Main arguments or findings
                5. Document structure overview

                Format your response as JSON with these sections as keys.
                """
            
            # Call Claude API
            response = self.claude_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=4000,
                temperature=0,
                system="You are a document analysis assistant that helps extract key information from PDFs. Always provide accurate information based solely on the document contents.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Process response
            analysis = {
                'doc_id': doc_id,
                'query': query,
                'response': response.content[0].text,
                'model': "claude-3-opus-20240229"
            }
            
            # Try to parse JSON if it's a summary (no query)
            if not query:
                try:
                    # Find JSON block if it exists
                    import re
                    json_match = re.search(r'```json\n(.*?)\n```', analysis['response'], re.DOTALL)
                    
                    if json_match:
                        json_text = json_match.group(1)
                        analysis['structured_data'] = json.loads(json_text)
                    else:
                        # Try parsing the whole response as JSON
                        analysis['structured_data'] = json.loads(analysis['response'])
                except Exception as e:
                    logger.warning(f"Could not parse Claude response as JSON: {e}")
                    # Create a simple structured data
                    analysis['structured_data'] = {
                        'summary': analysis['response']
                    }
            
            # Cache analysis (7 days TTL)
            self._save_to_cache(doc_id, cache_key, analysis, ttl=7 * 24 * 60 * 60)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error processing document with Claude: {e}")
            return {"error": str(e)}

    def process_document_with_vision(self, file_path: str, query: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a document using Claude's vision capabilities for PDFs with complex layouts.

        Args:
            file_path: Path to the PDF file
            query: Optional specific query about the document

        Returns:
            Dict: Claude's analysis of the document including visual elements
        """
        if not self.use_claude or not self.claude_client:
            logger.error("Claude API not available")
            return {"error": "Claude API not available"}
            
        # Generate document ID
        doc_id = self._generate_document_id(file_path)
        
        # Generate a cache key that includes the query if present
        cache_key = f"vision_{query.replace(' ', '_')[:50]}" if query else "vision_analysis"
        
        # Check cache first
        cached_data = self._load_from_cache(doc_id, cache_key)
        if cached_data:
            logger.info(f"Using cached vision analysis for {file_path}")
            return cached_data
            
        try:
            # Open PDF and convert first few pages to images
            pdf_document = fitz.open(file_path)
            max_pages = min(10, len(pdf_document))  # Limit to first 10 pages
            
            # Start building the message content
            content = []
            
            # Add query if provided
            if query:
                content.append({
                    "type": "text",
                    "text": f"Please analyze this PDF document and answer the following question: {query}"
                })
            else:
                content.append({
                    "type": "text",
                    "text": "Please analyze this PDF document. Extract the key information, including text content, tables, charts, and figures. Provide a comprehensive summary and identify the main topics covered."
                })
            
            # Add each page as an image
            for page_num in range(max_pages):
                page = pdf_document[page_num]
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scaling for better resolution
                img_data = pixmap.tobytes("png")
                
                # Encode image to base64
                img_base64 = base64.b64encode(img_data).decode('utf-8')
                
                # Add to content
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": img_base64
                    }
                })
                
                # Add page separator
                if page_num < max_pages - 1:
                    content.append({
                        "type": "text",
                        "text": f"--- Page {page_num + 1} end ---"
                    })
            
            # Call Claude vision API
            response = self.claude_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=4000,
                temperature=0,
                system="You are a document analysis assistant specializing in PDF analysis. Extract key information from the PDF including text, tables, charts, and figures. Provide accurate information based solely on the document contents.",
                messages=[
                    {"role": "user", "content": content}
                ]
            )
            
            # Process response
            analysis = {
                'doc_id': doc_id,
                'query': query,
                'file_path': file_path,
                'response': response.content[0].text,
                'model': "claude-3-opus-20240229",
                'pages_analyzed': max_pages
            }
            
            # Cache analysis (7 days TTL)
            self._save_to_cache(doc_id, cache_key, analysis, ttl=7 * 24 * 60 * 60)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error processing document with Claude Vision: {e}")
            return {"error": str(e)}

    def query_document(self, file_path: str, query: str, use_vision: bool = False) -> Dict[str, Any]:
        """
        Query a PDF document with a specific question.

        Args:
            file_path: Path to the PDF file
            query: Specific question about the document
            use_vision: Whether to use Claude's vision capabilities

        Returns:
            Dict: Response to the query
        """
        # Process with vision if requested
        if use_vision:
            return self.process_document_with_vision(file_path, query)
            
        # Otherwise process with text extraction
        document = self.extract_text_from_pdf(file_path)
        return self.process_with_claude(document, query)

    def get_document_summary(self, file_path: str, use_vision: bool = False) -> Dict[str, Any]:
        """
        Generate a comprehensive summary of a PDF document.

        Args:
            file_path: Path to the PDF file
            use_vision: Whether to use Claude's vision capabilities

        Returns:
            Dict: Document summary
        """
        # Process with vision if requested
        if use_vision:
            return self.process_document_with_vision(file_path)
            
        # Otherwise process with text extraction
        document = self.extract_text_from_pdf(file_path)
        return self.process_with_claude(document)

    def extract_structured_data(self, file_path: str, data_type: str = "all") -> Dict[str, Any]:
        """
        Extract structured data from a PDF document.

        Args:
            file_path: Path to the PDF file
            data_type: Type of data to extract ("tables", "lists", "key_value", "all")

        Returns:
            Dict: Extracted structured data
        """
        doc_id = self._generate_document_id(file_path)
        
        # Check cache first
        cache_key = f"structured_{data_type}"
        cached_data = self._load_from_cache(doc_id, cache_key)
        if cached_data:
            logger.info(f"Using cached structured data for {file_path}")
            return cached_data
            
        # Process with vision for best results
        prompt = f"""
        Please extract the following structured data from this document: {data_type}.
        
        If extracting tables, format them as markdown tables.
        If extracting key-value pairs, format them as a JSON object.
        If extracting lists, format them as markdown lists.
        
        Focus specifically on structured information rather than narrative text.
        """
        
        result = self.process_document_with_vision(file_path, query=prompt)
        
        # Add data type to result
        result['data_type'] = data_type
        
        # Cache result (7 days TTL)
        self._save_to_cache(doc_id, cache_key, result, ttl=7 * 24 * 60 * 60)
        
        return result

    def analyze_and_tag_document(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a document and automatically generate tags and categories.

        This method uses Claude to analyze the document content and extract:
        1. Primary topics/themes
        2. Technical domains
        3. Document purpose (e.g., tutorial, reference, architecture)
        4. Relevant entity tags
        5. Suggested categories

        Args:
            file_path: Path to the document file

        Returns:
            Dict: Analysis results with suggested tags and categories
        """
        if not self.use_claude or not self.claude_client:
            logger.error("Claude API not available for content tagging")
            return {"error": "Claude API not available for content tagging"}

        # Generate document ID
        doc_id = self._generate_document_id(file_path)

        # Check cache first
        cache_key = "auto_tagging"
        cached_data = self._load_from_cache(doc_id, cache_key)
        if cached_data:
            logger.info(f"Using cached auto-tagging results for {file_path}")
            return cached_data

        # Process based on file type
        file_ext = os.path.splitext(file_path)[1].lower()

        try:
            document_text = ""
            document_metadata = {}

            if file_ext == '.pdf':
                # Process PDF
                document = self.extract_text_from_pdf(file_path)
                document_text = document['full_text'][:50000]  # Limit to first 50K chars
                document_metadata = document['metadata']
            elif file_ext in ['.md', '.txt']:
                # Process text/markdown file
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    document_text = f.read()[:50000]  # Limit to first 50K chars
                document_metadata = {
                    'title': os.path.basename(file_path),
                    'file_name': os.path.basename(file_path),
                    'file_size': os.path.getsize(file_path)
                }
            else:
                return {"error": f"Unsupported file type: {file_ext}"}

            # Create tagging prompt
            tagging_prompt = f"""
            <document>
            {document_text}
            </document>

            Please analyze the document above and generate comprehensive metadata for categorization and organization.
            Return ONLY a JSON object with the following fields:

            1. "primary_topics": Array of 3-7 main topics covered in the document
            2. "technical_domains": Array of technical domains (e.g., "frontend", "database", "security")
            3. "document_type": String indicating document type (e.g., "tutorial", "reference", "architecture", "guide")
            4. "document_purpose": String indicating primary purpose (e.g., "learning", "reference", "implementation")
            5. "key_entities": Array of important technologies, frameworks, or concepts mentioned
            6. "suggested_tags": Array of 5-10 recommended tags for this document
            7. "suggested_categories": Array of 2-3 recommended categories
            8. "suggested_components": Array of suggested system components this relates to
            9. "technical_level": String indicating complexity ("beginner", "intermediate", "advanced")
            10. "estimated_reading_time": Integer representing estimated reading time in minutes

            Be specific and focus on technical aspects. For tags, use lowercase with hyphens for multi-word tags.
            """

            # Call Claude API
            response = self.claude_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=2000,
                temperature=0,
                system="You are a document analysis assistant that specializes in technical categorization and tagging. Provide accurate, specific information based solely on the document contents.",
                messages=[
                    {"role": "user", "content": tagging_prompt}
                ]
            )

            # Process response
            response_text = response.content[0].text

            # Extract JSON
            import re
            json_match = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)

            structured_analysis = {}
            if json_match:
                json_text = json_match.group(1)
                structured_analysis = json.loads(json_text)
            else:
                # Try parsing the whole response as JSON
                try:
                    structured_analysis = json.loads(response_text)
                except:
                    # Use regex to extract fields if JSON parsing fails
                    structured_analysis = {
                        "primary_topics": self._extract_list_items(response_text, r'"?primary_topics"?:.*?\[(.*?)\]'),
                        "technical_domains": self._extract_list_items(response_text, r'"?technical_domains"?:.*?\[(.*?)\]'),
                        "document_type": self._extract_single_value(response_text, r'"?document_type"?:.*?"(.*?)"'),
                        "document_purpose": self._extract_single_value(response_text, r'"?document_purpose"?:.*?"(.*?)"'),
                        "key_entities": self._extract_list_items(response_text, r'"?key_entities"?:.*?\[(.*?)\]'),
                        "suggested_tags": self._extract_list_items(response_text, r'"?suggested_tags"?:.*?\[(.*?)\]'),
                        "suggested_categories": self._extract_list_items(response_text, r'"?suggested_categories"?:.*?\[(.*?)\]'),
                        "suggested_components": self._extract_list_items(response_text, r'"?suggested_components"?:.*?\[(.*?)\]'),
                        "technical_level": self._extract_single_value(response_text, r'"?technical_level"?:.*?"(.*?)"'),
                        "estimated_reading_time": self._extract_single_value(response_text, r'"?estimated_reading_time"?:.*?(\d+)')
                    }

            # Ensure all expected fields exist
            required_fields = [
                "primary_topics", "technical_domains", "document_type", "document_purpose",
                "key_entities", "suggested_tags", "suggested_categories", "suggested_components",
                "technical_level", "estimated_reading_time"
            ]

            for field in required_fields:
                if field not in structured_analysis:
                    if field in ["primary_topics", "technical_domains", "key_entities",
                                "suggested_tags", "suggested_categories", "suggested_components"]:
                        structured_analysis[field] = []
                    else:
                        structured_analysis[field] = ""

            # Create final result
            result = {
                'doc_id': doc_id,
                'file_path': file_path,
                'metadata': document_metadata,
                'analysis': structured_analysis,
                'model': "claude-3-opus-20240229"
            }

            # Cache analysis (30 days TTL)
            self._save_to_cache(doc_id, cache_key, result, ttl=30 * 24 * 60 * 60)

            return result

        except Exception as e:
            logger.error(f"Error analyzing and tagging document: {e}")
            return {"error": str(e)}

    def _extract_list_items(self, text: str, pattern: str) -> List[str]:
        """Helper method to extract list items from text using regex."""
        import re
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            return []

        items_text = match.group(1)
        items = []

        # Match quoted strings
        for match in re.finditer(r'"([^"]*)"', items_text):
            items.append(match.group(1).strip())

        # If no quoted strings found, try comma-separated values
        if not items and ',' in items_text:
            items = [item.strip().strip('"\'') for item in items_text.split(',')]

        return items

    def _extract_single_value(self, text: str, pattern: str) -> str:
        """Helper method to extract a single value from text using regex."""
        import re
        match = re.search(pattern, text, re.DOTALL)
        if not match:
            return ""

        return match.group(1).strip()

    def batch_process_documents(self, file_paths: List[str], auto_tag: bool = True) -> Dict[str, List[Dict[str, Any]]]:
        """
        Process multiple documents in batch.

        Args:
            file_paths: List of paths to PDF files
            auto_tag: Whether to perform automatic tag generation

        Returns:
            Dict: Summary of processing results
        """
        results = {
            'successful': [],
            'failed': []
        }

        for file_path in file_paths:
            try:
                logger.info(f"Processing {file_path}")
                document = self.extract_text_from_pdf(file_path)
                chunks = self.chunk_document(document)
                summary = self.process_with_claude(document)

                # Add automatic tagging if requested
                tags_info = {}
                if auto_tag and self.use_claude:
                    tag_analysis = self.analyze_and_tag_document(file_path)
                    if 'error' not in tag_analysis:
                        tags_info = {
                            'suggested_tags': tag_analysis['analysis']['suggested_tags'],
                            'suggested_categories': tag_analysis['analysis']['suggested_categories'],
                            'document_type': tag_analysis['analysis']['document_type'],
                            'technical_level': tag_analysis['analysis']['technical_level']
                        }

                results['successful'].append({
                    'file_path': file_path,
                    'doc_id': document['doc_id'],
                    'page_count': document['metadata']['page_count'],
                    'chunk_count': len(chunks),
                    'summary_available': 'error' not in summary,
                    'tags_info': tags_info
                })

            except Exception as e:
                logger.error(f"Failed to process {file_path}: {e}")
                results['failed'].append({
                    'file_path': file_path,
                    'error': str(e)
                })

        return results


# Example usage
if __name__ == "__main__":
    # Initialize processor
    processor = PDFProcessor(cache_dir="./knowledge_cache", use_claude=True)
    
    # Example PDF path
    example_pdf = "path/to/your/document.pdf"
    
    # Process if file exists
    if os.path.exists(example_pdf):
        print(f"Processing {example_pdf}")
        
        # Get document summary
        summary = processor.get_document_summary(example_pdf)
        print(f"Summary: {summary.get('response', '')[:200]}...")
        
        # Query document
        answer = processor.query_document(example_pdf, "What are the main topics covered in this document?")
        print(f"Answer: {answer.get('response', '')[:200]}...")
    else:
        print(f"Example file {example_pdf} not found. Please provide a valid PDF path.")