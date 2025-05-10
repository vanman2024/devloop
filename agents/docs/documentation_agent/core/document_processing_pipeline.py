"""
Document Processing Pipeline - Core pipeline for document processing

This module implements the document processing pipeline, which handles the
ingestion, parsing, chunking, and embedding of documents from various formats.
"""

import os
import uuid
import logging
import asyncio
import mimetypes
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple, BinaryIO
from pathlib import Path

# Import document models
from ..models.document_model import Document, DocumentMetadata, Chunk
from ..models.document_model import DocumentType, DocumentStatus

# Import processors (will be implemented separately)
from ..processors.pdf_processor import PDFProcessor
from ..processors.markdown_processor import MarkdownProcessor
from ..processors.html_processor import HTMLProcessor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentProcessingPipeline:
    """
    Document Processing Pipeline that handles document ingestion,
    parsing, chunking, and embedding.
    
    The pipeline is designed to be modular and extensible, supporting
    various document formats and processing steps.
    """
    
    def __init__(self, config: Dict[str, Any], llm_connector=None, vector_store=None):
        """
        Initialize the document processing pipeline.
        
        Args:
            config: Configuration dictionary
            llm_connector: Connector for LLM services (embedding generation)
            vector_store: Vector store for document storage
        """
        self.config = config
        self.llm_connector = llm_connector
        self.vector_store = vector_store
        
        # Initialize document processors
        self.processors = {
            DocumentType.PDF: PDFProcessor(config),
            DocumentType.MARKDOWN: MarkdownProcessor(config),
            DocumentType.HTML: HTMLProcessor(config)
        }
        
        # Default chunking configuration
        self.default_chunk_size = config.get("chunking", {}).get("default_chunk_size", 1000)
        self.default_chunk_overlap = config.get("chunking", {}).get("default_chunk_overlap", 200)
        
        logger.info("Document processing pipeline initialized")
    
    def detect_document_type(self, file_path: str) -> DocumentType:
        """
        Detect document type from file extension or content.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            DocumentType enum value
        """
        ext = os.path.splitext(file_path)[1].lower()
        mime_type, _ = mimetypes.guess_type(file_path)
        
        # Map extensions to document types
        ext_mapping = {
            '.md': DocumentType.MARKDOWN,
            '.markdown': DocumentType.MARKDOWN,
            '.pdf': DocumentType.PDF,
            '.html': DocumentType.HTML,
            '.htm': DocumentType.HTML,
            '.txt': DocumentType.TEXT,
            '.ipynb': DocumentType.JUPYTER,
            '.docx': DocumentType.WORD,
            '.doc': DocumentType.WORD
        }
        
        # Map MIME types to document types
        mime_mapping = {
            'text/markdown': DocumentType.MARKDOWN,
            'application/pdf': DocumentType.PDF,
            'text/html': DocumentType.HTML,
            'text/plain': DocumentType.TEXT,
            'application/x-ipynb+json': DocumentType.JUPYTER,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': DocumentType.WORD,
            'application/msword': DocumentType.WORD
        }
        
        # Check extension first
        if ext in ext_mapping:
            return ext_mapping[ext]
        
        # Check MIME type next
        if mime_type in mime_mapping:
            return mime_mapping[mime_type]
        
        # Default to unknown
        return DocumentType.UNKNOWN
    
    async def ingest_document(self, document_path: str, options: Dict[str, Any] = None) -> Document:
        """
        Ingest a document and process it through the pipeline.
        
        Args:
            document_path: Path to the document file
            options: Processing options and metadata
            
        Returns:
            Processed document with metadata and chunks
        """
        options = options or {}
        logger.info(f"Ingesting document: {document_path}")
        
        # 1. Detect document type
        doc_type = options.get("document_type")
        if not doc_type:
            doc_type = self.detect_document_type(document_path)
            
        # 2. Read document content
        with open(document_path, 'rb') as f:
            raw_content = f.read()
        
        # 3. Get file metadata
        file_stat = os.stat(document_path)
        file_size = file_stat.st_size
        last_modified = datetime.fromtimestamp(file_stat.st_mtime)
        
        # 4. Create document metadata
        doc_title = options.get("title", os.path.basename(document_path))
        metadata = DocumentMetadata(
            title=doc_title,
            description=options.get("description", ""),
            authors=options.get("authors", []),
            created_at=datetime.fromtimestamp(file_stat.st_ctime),
            updated_at=last_modified,
            document_type=doc_type,
            status=DocumentStatus.DRAFT,
            version=options.get("version", "1.0.0"),
            source_path=document_path,
            custom_metadata={
                "file_size": file_size,
                "original_filename": os.path.basename(document_path),
                "import_timestamp": datetime.now().isoformat(),
                **options.get("custom_metadata", {})
            }
        )
        
        # 5. Create document instance
        document = Document(
            id=options.get("id", str(uuid.uuid4())),
            metadata=metadata,
            raw_content=raw_content
        )
        
        # 6. Process document with appropriate processor
        if doc_type in self.processors:
            processor = self.processors[doc_type]
            document = await processor.process(document)
        else:
            # For unsupported document types, try to extract text
            if doc_type == DocumentType.TEXT:
                try:
                    document.content = raw_content.decode('utf-8')
                except UnicodeDecodeError:
                    document.content = raw_content.decode('latin-1')
            else:
                logger.warning(f"Unsupported document type: {doc_type}")
                document.content = f"Unsupported document type: {doc_type}"
        
        # 7. Chunk document
        if options.get("skip_chunking", False) is False:
            chunk_size = options.get("chunk_size", self.default_chunk_size)
            chunk_overlap = options.get("chunk_overlap", self.default_chunk_overlap)
            document = await self._chunk_document(document, chunk_size, chunk_overlap)
        
        # 8. Generate embeddings
        if options.get("skip_embedding", False) is False and self.llm_connector:
            document = await self._generate_embeddings(document)
        
        # 9. Store in vector database if available
        if options.get("skip_vector_store", False) is False and self.vector_store:
            vector_id = await self.vector_store.add_document(
                document.id, 
                document.content, 
                document.embedding, 
                {
                    "title": document.metadata.title,
                    "document_type": document.metadata.document_type.value,
                    "source_path": document.metadata.source_path
                }
            )
            document.vector_id = vector_id
        
        logger.info(f"Document ingested successfully: {document.id}")
        return document
    
    async def _chunk_document(self, 
                            document: Document, 
                            chunk_size: int = 1000, 
                            chunk_overlap: int = 200) -> Document:
        """
        Split document content into chunks for processing.
        
        Args:
            document: Document to chunk
            chunk_size: Size of each chunk in characters
            chunk_overlap: Overlap between chunks in characters
            
        Returns:
            Document with added chunks
        """
        logger.info(f"Chunking document: {document.id}, size: {chunk_size}, overlap: {chunk_overlap}")
        content = document.content
        
        # For empty content, return without chunking
        if not content:
            logger.warning(f"Document has no content to chunk: {document.id}")
            return document
        
        # Basic chunking by character count with overlap
        start = 0
        chunks = []
        
        while start < len(content):
            end = min(start + chunk_size, len(content))
            
            # If we're not at the end, try to break at a paragraph or sentence
            if end < len(content):
                # Try to find paragraph break
                paragraph_break = content.rfind('\n\n', start, end)
                if paragraph_break != -1 and paragraph_break > start + chunk_size // 2:
                    end = paragraph_break + 2
                else:
                    # Try to find sentence break (period followed by space)
                    sentence_break = content.rfind('. ', start, end)
                    if sentence_break != -1 and sentence_break > start + chunk_size // 2:
                        end = sentence_break + 2
            
            # Create chunk
            chunk_content = content[start:end]
            chunk = Chunk(
                content=chunk_content,
                start_char=start,
                end_char=end,
                metadata={
                    "document_id": document.id,
                    "chunk_index": len(chunks)
                }
            )
            chunks.append(chunk)
            
            # Move start position for next chunk (with overlap)
            start = end - chunk_overlap
            if start <= 0 or start >= len(content):
                break
        
        document.chunks = chunks
        logger.info(f"Document chunked into {len(chunks)} chunks")
        return document
    
    async def _generate_embeddings(self, document: Document) -> Document:
        """
        Generate embeddings for document and its chunks.
        
        Args:
            document: Document to generate embeddings for
            
        Returns:
            Document with added embeddings
        """
        if not self.llm_connector:
            logger.warning("No LLM connector available for generating embeddings")
            return document
        
        logger.info(f"Generating embeddings for document: {document.id}")
        
        # Generate embedding for the full document
        try:
            # Use title and description for the document embedding
            content_for_embedding = f"{document.metadata.title}\n{document.metadata.description}\n{document.content[:1000]}"
            document.embedding = await self.llm_connector.create_embedding(content_for_embedding)
        except Exception as e:
            logger.error(f"Error generating document embedding: {e}")
            document.embedding = []
        
        # Generate embeddings for chunks
        for chunk in document.chunks:
            try:
                chunk.embedding = await self.llm_connector.create_embedding(chunk.content)
            except Exception as e:
                logger.error(f"Error generating chunk embedding: {e}")
                chunk.embedding = []
        
        return document
    
    async def extract_metadata(self, document: Document) -> Document:
        """
        Extract and enhance document metadata.
        
        Args:
            document: Document to extract metadata from
            
        Returns:
            Document with enhanced metadata
        """
        logger.info(f"Extracting metadata for document: {document.id}")
        
        # Calculate word count
        words = document.content.split()
        document.metadata.word_count = len(words)
        
        # Calculate reading time (average reading speed: 200 words per minute)
        document.metadata.reading_time_minutes = document.metadata.word_count / 200
        
        # If we have an LLM connector, try to enhance metadata
        if self.llm_connector:
            try:
                # Generate tags if none provided
                if not document.metadata.tags and len(document.content) > 0:
                    content_preview = document.content[:2000]
                    prompt = f"""
                    Generate 3-7 relevant tags for the following document:
                    
                    Title: {document.metadata.title}
                    
                    Content preview:
                    {content_preview}
                    
                    Return only the tags as a comma-separated list.
                    """
                    response = await self.llm_connector.generate_text(prompt)
                    if response:
                        tags = [tag.strip().lower() for tag in response.split(',')]
                        document.metadata.tags = tags
                
                # Generate description if none provided
                if not document.metadata.description and len(document.content) > 0:
                    content_preview = document.content[:3000]
                    prompt = f"""
                    Generate a concise description (1-2 sentences) for the following document:
                    
                    Title: {document.metadata.title}
                    
                    Content preview:
                    {content_preview}
                    
                    Return only the description.
                    """
                    response = await self.llm_connector.generate_text(prompt)
                    if response:
                        document.metadata.description = response.strip()
                        
            except Exception as e:
                logger.error(f"Error enhancing metadata with LLM: {e}")
        
        return document
    
    def is_supported_document_type(self, document_type: DocumentType) -> bool:
        """Check if a document type is supported by the pipeline"""
        return document_type in self.processors