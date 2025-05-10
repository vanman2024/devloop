"""
Knowledge Base API

A simple interface for Claude and other AI systems to interact with the knowledge base.
This module provides functions for:
1. Adding and retrieving documents
2. Querying the knowledge base
3. Accessing cached results
4. Managing the document collection

The API is designed to be easily understood and used by AI systems like Claude.
"""

import os
import json
import hashlib
import time
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
import logging
import base64

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Local imports
try:
    from pdf_processor import PDFProcessor
except ImportError:
    logger.warning("PDF processor not found. Some functionality may be limited.")
    PDFProcessor = None

# Constants
KNOWLEDGE_BASE_DIR = os.environ.get("KNOWLEDGE_BASE_DIR", "/mnt/c/Users/angel/devloop/knowledge_base")
CACHE_DIR = os.environ.get("KNOWLEDGE_CACHE_DIR", os.path.join(KNOWLEDGE_BASE_DIR, "cache"))
DOCUMENTS_DIR = os.path.join(KNOWLEDGE_BASE_DIR, "documents")
METADATA_FILE = os.path.join(KNOWLEDGE_BASE_DIR, "metadata.json")


class SimpleCache:
    """
    A simple disk-based cache for knowledge base queries.
    """
    
    def __init__(self, cache_dir: str = CACHE_DIR):
        """Initialize cache with specified directory."""
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_cache_path(self, key: str) -> Path:
        """Get the file path for a cache key."""
        # Convert key to a safe filename using hash
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.json"
        
    def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache."""
        cache_path = self._get_cache_path(key)
        
        if not cache_path.exists():
            return None
            
        try:
            with open(cache_path, 'r') as f:
                data = json.load(f)
                
                # Check if expired
                if data.get('expiry', float('inf')) < time.time():
                    # Remove expired entry
                    cache_path.unlink(missing_ok=True)
                    return None
                    
                return data.get('value')
        except Exception as e:
            logger.error(f"Error reading cache: {e}")
            return None
            
    def set(self, key: str, value: Any, ttl: int = 0) -> None:
        """Set a value in the cache with optional time-to-live in seconds."""
        cache_path = self._get_cache_path(key)
        
        try:
            # Calculate expiry time
            expiry = time.time() + ttl if ttl > 0 else float('inf')
            
            # Write to cache file
            with open(cache_path, 'w') as f:
                json.dump({
                    'key': key,
                    'value': value,
                    'expiry': expiry,
                    'created': time.time()
                }, f)
        except Exception as e:
            logger.error(f"Error writing to cache: {e}")
            
    def delete(self, key: str) -> bool:
        """Delete a value from the cache."""
        cache_path = self._get_cache_path(key)
        
        if cache_path.exists():
            try:
                cache_path.unlink()
                return True
            except Exception as e:
                logger.error(f"Error deleting from cache: {e}")
                
        return False
        
    def clear(self) -> None:
        """Clear all cached values."""
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink(missing_ok=True)
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")


class KnowledgeAPI:
    """
    API for interacting with the knowledge base.
    """
    
    def __init__(self):
        """Initialize the knowledge base API."""
        # Create required directories
        Path(KNOWLEDGE_BASE_DIR).mkdir(parents=True, exist_ok=True)
        Path(DOCUMENTS_DIR).mkdir(parents=True, exist_ok=True)
        
        # Initialize cache
        self.cache = SimpleCache(CACHE_DIR)
        
        # Initialize PDF processor if available
        self.pdf_processor = PDFProcessor(cache_dir=CACHE_DIR) if PDFProcessor else None
        
        # Load document metadata
        self.metadata = self._load_metadata()
        
    def _load_metadata(self) -> Dict[str, Any]:
        """Load document metadata from file."""
        try:
            if os.path.exists(METADATA_FILE):
                with open(METADATA_FILE, 'r') as f:
                    return json.load(f)
            else:
                # Initialize empty metadata
                metadata = {'documents': {}}
                self._save_metadata(metadata)
                return metadata
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            return {'documents': {}}
            
    def _save_metadata(self, metadata: Dict[str, Any]) -> None:
        """Save document metadata to file."""
        try:
            with open(METADATA_FILE, 'w') as f:
                json.dump(metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
            
    def _generate_document_id(self, filename: str, content: Optional[bytes] = None) -> str:
        """Generate a unique document ID."""
        if content:
            # Generate from content hash
            return f"doc-{hashlib.sha256(content).hexdigest()[:16]}"
        else:
            # Generate from filename and timestamp
            return f"doc-{hashlib.sha256(f'{filename}:{time.time()}'.encode()).hexdigest()[:16]}"
            
    def add_document(self, file_path: str, tags: List[str] = None, overwrite: bool = False,
                    auto_tag: bool = True) -> Dict[str, Any]:
        """
        Add a document to the knowledge base.

        Args:
            file_path: Path to the document file
            tags: Optional list of tags for the document
            overwrite: Whether to overwrite an existing document
            auto_tag: Whether to automatically generate tags using AI

        Returns:
            Dict with document metadata
        """
        # Check if file exists
        if not os.path.exists(file_path):
            return {'error': f"File not found: {file_path}"}

        # Check file type
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext not in ['.pdf', '.txt', '.md']:
            return {'error': f"Unsupported file type: {file_ext}"}

        try:
            # Generate document ID
            with open(file_path, 'rb') as f:
                content = f.read()
                doc_id = self._generate_document_id(os.path.basename(file_path), content)

            # Check if document already exists
            if doc_id in self.metadata['documents'] and not overwrite:
                return {
                    'error': 'Document already exists',
                    'doc_id': doc_id,
                    'status': 'exists'
                }

            # Copy file to documents directory
            document_path = os.path.join(DOCUMENTS_DIR, f"{doc_id}{file_ext}")
            with open(document_path, 'wb') as f:
                f.write(content)

            # Initialize tags
            document_tags = tags or []
            ai_generated_tags = []
            document_categories = []

            # Process based on file type
            if file_ext == '.pdf' and self.pdf_processor:
                # Process PDF
                result = self.pdf_processor.extract_text_from_pdf(document_path)
                metadata = result.get('metadata', {})

                # Generate summary if possible
                summary = None
                try:
                    summary_result = self.pdf_processor.get_document_summary(document_path)
                    if 'error' not in summary_result:
                        summary = summary_result.get('response', '')[:500] + '...'
                except Exception as e:
                    logger.error(f"Error generating summary: {e}")

                # Auto-tag using AI if enabled
                if auto_tag and self.pdf_processor:
                    try:
                        logger.info(f"Auto-tagging document: {file_path}")
                        tag_analysis = self.pdf_processor.analyze_and_tag_document(document_path)

                        if 'error' not in tag_analysis and 'analysis' in tag_analysis:
                            # Extract AI-generated tags
                            ai_tags = tag_analysis['analysis'].get('suggested_tags', [])
                            ai_generated_tags = ai_tags

                            # Add AI-generated tags to user-provided tags
                            for tag in ai_tags:
                                if tag not in document_tags:
                                    document_tags.append(tag)

                            # Extract categories
                            document_categories = tag_analysis['analysis'].get('suggested_categories', [])

                            # Enhance metadata with additional analysis
                            metadata.update({
                                'document_type': tag_analysis['analysis'].get('document_type', ''),
                                'document_purpose': tag_analysis['analysis'].get('document_purpose', ''),
                                'technical_level': tag_analysis['analysis'].get('technical_level', ''),
                                'primary_topics': tag_analysis['analysis'].get('primary_topics', []),
                                'technical_domains': tag_analysis['analysis'].get('technical_domains', []),
                                'key_entities': tag_analysis['analysis'].get('key_entities', []),
                                'estimated_reading_time': tag_analysis['analysis'].get('estimated_reading_time', '')
                            })

                            logger.info(f"Successfully auto-tagged document with tags: {ai_generated_tags}")
                    except Exception as e:
                        logger.error(f"Error in auto-tagging: {e}")
            else:
                # Simple text processing
                with open(document_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text_content = f.read()

                metadata = {
                    'title': os.path.basename(file_path),
                    'file_size': len(content),
                    'page_count': 1,
                }

                # Simple summary for text files
                summary = text_content[:500] + '...' if len(text_content) > 500 else text_content

                # Auto-tag markdown and text files if enabled
                if auto_tag and self.pdf_processor:
                    try:
                        logger.info(f"Auto-tagging document: {file_path}")
                        tag_analysis = self.pdf_processor.analyze_and_tag_document(document_path)

                        if 'error' not in tag_analysis and 'analysis' in tag_analysis:
                            # Extract AI-generated tags
                            ai_tags = tag_analysis['analysis'].get('suggested_tags', [])
                            ai_generated_tags = ai_tags

                            # Add AI-generated tags to user-provided tags
                            for tag in ai_tags:
                                if tag not in document_tags:
                                    document_tags.append(tag)

                            # Extract categories
                            document_categories = tag_analysis['analysis'].get('suggested_categories', [])

                            # Enhance metadata with additional analysis
                            metadata.update({
                                'document_type': tag_analysis['analysis'].get('document_type', ''),
                                'document_purpose': tag_analysis['analysis'].get('document_purpose', ''),
                                'technical_level': tag_analysis['analysis'].get('technical_level', ''),
                                'primary_topics': tag_analysis['analysis'].get('primary_topics', []),
                                'technical_domains': tag_analysis['analysis'].get('technical_domains', []),
                                'key_entities': tag_analysis['analysis'].get('key_entities', []),
                                'estimated_reading_time': tag_analysis['analysis'].get('estimated_reading_time', '')
                            })

                            logger.info(f"Successfully auto-tagged document with tags: {ai_generated_tags}")
                    except Exception as e:
                        logger.error(f"Error in auto-tagging: {e}")

            # Update document metadata
            document_metadata = {
                'doc_id': doc_id,
                'filename': os.path.basename(file_path),
                'file_path': document_path,
                'file_type': file_ext[1:],
                'file_size': os.path.getsize(document_path),
                'added_at': time.time(),
                'tags': document_tags,
                'ai_generated_tags': ai_generated_tags,
                'categories': document_categories,
                'metadata': metadata,
                'summary': summary
            }

            # Save to metadata
            self.metadata['documents'][doc_id] = document_metadata
            self._save_metadata(self.metadata)

            return {
                'doc_id': doc_id,
                'status': 'added' if not overwrite else 'updated',
                'metadata': document_metadata
            }

        except Exception as e:
            logger.error(f"Error adding document: {e}")
            return {'error': str(e)}
            
    def get_document(self, doc_id: str) -> Dict[str, Any]:
        """
        Get document metadata and content.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Dict with document metadata and content
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        try:
            # Get document metadata
            document = self.metadata['documents'][doc_id]
            file_path = document['file_path']
            
            # Check if file exists
            if not os.path.exists(file_path):
                return {'error': f"Document file not found: {file_path}"}
                
            # Get content based on file type
            if document['file_type'] == 'pdf' and self.pdf_processor:
                # Get PDF content from processor
                result = self.pdf_processor.extract_text_from_pdf(file_path)
                content = result.get('full_text', '')
            else:
                # Read text content
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
            return {
                'doc_id': doc_id,
                'metadata': document,
                'content': content
            }
            
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            return {'error': str(e)}
            
    def delete_document(self, doc_id: str) -> Dict[str, Any]:
        """
        Delete a document from the knowledge base.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Dict with deletion status
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        try:
            # Get document metadata
            document = self.metadata['documents'][doc_id]
            file_path = document['file_path']
            
            # Delete file if it exists
            if os.path.exists(file_path):
                os.remove(file_path)
                
            # Remove from metadata
            del self.metadata['documents'][doc_id]
            self._save_metadata(self.metadata)
            
            # Clear related cache entries
            cache_key = f"doc:{doc_id}:"
            for cache_file in Path(CACHE_DIR).glob(f"{cache_key}*.json"):
                cache_file.unlink(missing_ok=True)
                
            return {
                'doc_id': doc_id,
                'status': 'deleted'
            }
            
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return {'error': str(e)}
            
    def list_documents(self, tags: List[str] = None) -> Dict[str, Any]:
        """
        List documents in the knowledge base.
        
        Args:
            tags: Optional list of tags to filter by
            
        Returns:
            Dict with list of documents
        """
        try:
            documents = []
            
            for doc_id, document in self.metadata['documents'].items():
                # Filter by tags if specified
                if tags and not any(tag in document['tags'] for tag in tags):
                    continue
                    
                # Include basic metadata
                documents.append({
                    'doc_id': doc_id,
                    'filename': document['filename'],
                    'file_type': document['file_type'],
                    'added_at': document['added_at'],
                    'tags': document['tags'],
                    'title': document.get('metadata', {}).get('title', document['filename']),
                    'summary': document.get('summary', '')
                })
                
            return {
                'documents': documents,
                'count': len(documents)
            }
            
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            return {'error': str(e)}
            
    def update_document_tags(self, doc_id: str, tags: List[str]) -> Dict[str, Any]:
        """
        Update tags for a document.
        
        Args:
            doc_id: Document ID
            tags: New list of tags
            
        Returns:
            Dict with update status
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        try:
            # Update tags
            self.metadata['documents'][doc_id]['tags'] = tags
            self._save_metadata(self.metadata)
            
            return {
                'doc_id': doc_id,
                'status': 'updated',
                'tags': tags
            }
            
        except Exception as e:
            logger.error(f"Error updating document tags: {e}")
            return {'error': str(e)}
            
    def query_document(self, doc_id: str, query: str) -> Dict[str, Any]:
        """
        Query a specific document.
        
        Args:
            doc_id: Document ID
            query: Question to ask about the document
            
        Returns:
            Dict with query response
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        # Check for cached response
        cache_key = f"query:{doc_id}:{hashlib.md5(query.encode()).hexdigest()}"
        cached = self.cache.get(cache_key)
        if cached:
            cached['source'] = 'cache'
            return cached
            
        try:
            # Get document metadata
            document = self.metadata['documents'][doc_id]
            file_path = document['file_path']
            
            if document['file_type'] == 'pdf' and self.pdf_processor:
                # Use PDF processor to query document
                result = self.pdf_processor.query_document(file_path, query)
                
                if 'error' in result:
                    return {'error': result['error']}
                    
                response = {
                    'doc_id': doc_id,
                    'query': query,
                    'answer': result.get('response', ''),
                    'source': 'pdf_processor'
                }
                
                # Cache response for 1 day
                self.cache.set(cache_key, response, ttl=86400)
                
                return response
            else:
                # Simple text search for non-PDF documents
                document_content = self.get_document(doc_id)
                
                if 'error' in document_content:
                    return {'error': document_content['error']}
                    
                content = document_content['content']
                
                # Very basic response - in a real system, use an LLM here
                # This is just a placeholder
                if query.lower() in content.lower():
                    start_idx = content.lower().find(query.lower())
                    context = content[max(0, start_idx - 100):min(len(content), start_idx + 100)]
                    answer = f"Found in document: '...{context}...'"
                else:
                    answer = "The answer couldn't be found in the document."
                    
                response = {
                    'doc_id': doc_id,
                    'query': query,
                    'answer': answer,
                    'source': 'simple_search'
                }
                
                # Cache response for 1 day
                self.cache.set(cache_key, response, ttl=86400)
                
                return response
                
        except Exception as e:
            logger.error(f"Error querying document: {e}")
            return {'error': str(e)}
            
    def search_documents(self, query: str, tags: List[str] = None, limit: int = 5) -> Dict[str, Any]:
        """
        Search across all documents.
        
        Args:
            query: Search query
            tags: Optional list of tags to filter by
            limit: Maximum number of results
            
        Returns:
            Dict with search results
        """
        # Check for cached response
        cache_key = f"search:{hashlib.md5((query + str(tags) + str(limit)).encode()).hexdigest()}"
        cached = self.cache.get(cache_key)
        if cached:
            cached['source'] = 'cache'
            return cached
            
        try:
            results = []
            
            # Simple keyword search across documents
            query_lower = query.lower()
            
            for doc_id, document in self.metadata['documents'].items():
                # Filter by tags if specified
                if tags and not any(tag in document['tags'] for tag in tags):
                    continue
                    
                # Get document content
                try:
                    content = self.get_document(doc_id)
                    
                    if 'error' in content:
                        continue
                        
                    text = content['content'].lower()
                    
                    # Check if query matches
                    if query_lower in text:
                        # Get context around match
                        start_idx = text.find(query_lower)
                        context = content['content'][max(0, start_idx - 50):min(len(content['content']), start_idx + 200)]
                        
                        results.append({
                            'doc_id': doc_id,
                            'filename': document['filename'],
                            'title': document.get('metadata', {}).get('title', document['filename']),
                            'snippet': f"...{context}...",
                            'tags': document['tags']
                        })
                        
                        # Limit results
                        if len(results) >= limit:
                            break
                            
                except Exception as e:
                    logger.error(f"Error searching document {doc_id}: {e}")
                    continue
                    
            response = {
                'query': query,
                'results': results,
                'count': len(results)
            }
            
            # Cache response for 1 hour
            self.cache.set(cache_key, response, ttl=3600)
            
            return response
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return {'error': str(e)}
            
    def get_document_summary(self, doc_id: str) -> Dict[str, Any]:
        """
        Get a comprehensive summary of a document.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Dict with document summary
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        # Check for cached summary
        cache_key = f"summary:{doc_id}"
        cached = self.cache.get(cache_key)
        if cached:
            cached['source'] = 'cache'
            return cached
            
        try:
            # Get document metadata
            document = self.metadata['documents'][doc_id]
            file_path = document['file_path']
            
            if document['file_type'] == 'pdf' and self.pdf_processor:
                # Use PDF processor to generate summary
                result = self.pdf_processor.get_document_summary(file_path)
                
                if 'error' in result:
                    return {'error': result['error']}
                    
                response = {
                    'doc_id': doc_id,
                    'summary': result.get('response', ''),
                    'source': 'pdf_processor'
                }
                
                # Update document metadata with summary
                summary = result.get('response', '')[:500] + '...'
                self.metadata['documents'][doc_id]['summary'] = summary
                self._save_metadata(self.metadata)
                
                # Cache response for 7 days
                self.cache.set(cache_key, response, ttl=7 * 86400)
                
                return response
            else:
                # For non-PDF documents, use the first 500 characters as summary
                document_content = self.get_document(doc_id)
                
                if 'error' in document_content:
                    return {'error': document_content['error']}
                    
                content = document_content['content']
                summary = content[:500] + '...' if len(content) > 500 else content
                
                response = {
                    'doc_id': doc_id,
                    'summary': summary,
                    'source': 'text_extract'
                }
                
                # Update document metadata with summary
                self.metadata['documents'][doc_id]['summary'] = summary
                self._save_metadata(self.metadata)
                
                # Cache response for 7 days
                self.cache.set(cache_key, response, ttl=7 * 86400)
                
                return response
                
        except Exception as e:
            logger.error(f"Error getting document summary: {e}")
            return {'error': str(e)}
            
    def extract_tables(self, doc_id: str) -> Dict[str, Any]:
        """
        Extract tables from a document.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Dict with tables in markdown format
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        # Check for cached tables
        cache_key = f"tables:{doc_id}"
        cached = self.cache.get(cache_key)
        if cached:
            cached['source'] = 'cache'
            return cached
            
        try:
            # Get document metadata
            document = self.metadata['documents'][doc_id]
            file_path = document['file_path']
            
            if document['file_type'] == 'pdf' and self.pdf_processor:
                # Use PDF processor to extract tables
                result = self.pdf_processor.extract_structured_data(file_path, data_type="tables")
                
                if 'error' in result:
                    return {'error': result['error']}
                    
                response = {
                    'doc_id': doc_id,
                    'tables': result.get('response', ''),
                    'source': 'pdf_processor'
                }
                
                # Cache response for 7 days
                self.cache.set(cache_key, response, ttl=7 * 86400)
                
                return response
            else:
                return {'error': "Table extraction only supported for PDF documents"}
                
        except Exception as e:
            logger.error(f"Error extracting tables: {e}")
            return {'error': str(e)}
            
    def extract_key_points(self, doc_id: str) -> Dict[str, Any]:
        """
        Extract key points from a document.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Dict with key points
        """
        # Check if document exists
        if doc_id not in self.metadata['documents']:
            return {'error': f"Document not found: {doc_id}"}
            
        # Check for cached key points
        cache_key = f"key_points:{doc_id}"
        cached = self.cache.get(cache_key)
        if cached:
            cached['source'] = 'cache'
            return cached
            
        try:
            # Get document metadata
            document = self.metadata['documents'][doc_id]
            file_path = document['file_path']
            
            if document['file_type'] == 'pdf' and self.pdf_processor:
                # Use PDF processor to extract key points
                query = "What are the key points, findings, or conclusions from this document? List them as bullet points."
                result = self.pdf_processor.query_document(file_path, query)
                
                if 'error' in result:
                    return {'error': result['error']}
                    
                response = {
                    'doc_id': doc_id,
                    'key_points': result.get('response', ''),
                    'source': 'pdf_processor'
                }
                
                # Cache response for 7 days
                self.cache.set(cache_key, response, ttl=7 * 86400)
                
                return response
            else:
                # For non-PDF documents, return a not supported message
                return {'error': "Key point extraction advanced features only supported for PDF documents"}
                
        except Exception as e:
            logger.error(f"Error extracting key points: {e}")
            return {'error': str(e)}
            
    def clear_cache(self) -> Dict[str, Any]:
        """
        Clear the cache.
        
        Returns:
            Dict with status
        """
        try:
            self.cache.clear()
            return {'status': 'success', 'message': 'Cache cleared'}
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return {'error': str(e)}
            
    def get_all_tags(self) -> Dict[str, Any]:
        """
        Get all tags used in the knowledge base.
        
        Returns:
            Dict with list of tags and their counts
        """
        try:
            tag_counts = {}
            
            for doc_id, document in self.metadata['documents'].items():
                for tag in document['tags']:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
                    
            tags = [{'tag': tag, 'count': count} for tag, count in tag_counts.items()]
            
            return {
                'tags': tags,
                'count': len(tags)
            }
            
        except Exception as e:
            logger.error(f"Error getting tags: {e}")
            return {'error': str(e)}


# Create singleton instance
knowledge_api = KnowledgeAPI()

# Example usage
if __name__ == "__main__":
    # List documents
    print("Documents in knowledge base:")
    print(json.dumps(knowledge_api.list_documents(), indent=2))
    
    # Add a document (if path exists)
    example_path = "/path/to/document.pdf"
    if os.path.exists(example_path):
        print("Adding document:")
        result = knowledge_api.add_document(example_path, tags=["example", "test"])
        print(json.dumps(result, indent=2))
        
        # Query document
        if 'doc_id' in result:
            doc_id = result['doc_id']
            print("Querying document:")
            query_result = knowledge_api.query_document(doc_id, "What is this document about?")
            print(json.dumps(query_result, indent=2))