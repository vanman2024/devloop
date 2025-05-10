"""
PDF Processor - Document processor for PDF files

This module implements the PDF document processor, which handles
parsing and extraction of text and metadata from PDF files.
"""

import io
import os
import logging
import tempfile
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, BinaryIO, Tuple

from ..models.document_model import Document, DocumentMetadata, DocumentType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFProcessor:
    """
    PDF document processor that handles extraction of text, metadata,
    and structure from PDF files.
    
    Uses third-party libraries to handle PDF parsing and maintains
    document structure as much as possible.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the PDF processor.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.extract_images = config.get("pdf", {}).get("extract_images", False)
        self.ocr_enabled = config.get("pdf", {}).get("ocr_enabled", False)
        self.ocr_threshold = config.get("pdf", {}).get("ocr_threshold", 0.2)
        self.output_dir = config.get("pdf", {}).get("output_dir", "pdf_extracted")
        
        logger.info("PDF processor initialized")
    
    async def process(self, document: Document) -> Document:
        """
        Process a PDF document to extract text, metadata, and structure.
        
        Args:
            document: Document with PDF content
            
        Returns:
            Processed document with extracted content
        """
        if document.metadata.document_type != DocumentType.PDF:
            logger.warning(f"Document is not a PDF: {document.metadata.document_type}")
            return document
        
        logger.info(f"Processing PDF document: {document.id}")
        
        # Process the document using various techniques
        try:
            # First try to extract text with PyPDF2 (async wrapper)
            document = await self._extract_with_pypdf(document)
            
            # If text extraction failed or yielded little text, try pdfminer.six
            if not document.content or len(document.content.strip()) < 100:
                document = await self._extract_with_pdfminer(document)
            
            # If text extraction still failed and OCR is enabled, try OCR
            if self.ocr_enabled and (not document.content or 
                                     len(document.content.strip()) < 100):
                document = await self._extract_with_ocr(document)
            
            # Extract metadata using PyPDF2
            document = await self._extract_metadata(document)
            
            # Extract images if configured
            if self.extract_images:
                document = await self._extract_images(document)
            
        except Exception as e:
            logger.error(f"Error processing PDF document: {e}")
            document.content = f"Error processing PDF document: {str(e)}"
        
        logger.info(f"PDF processing completed: {document.id}, {len(document.content)} chars extracted")
        return document
    
    async def _extract_with_pypdf(self, document: Document) -> Document:
        """
        Extract text from PDF using PyPDF2 library.
        
        Args:
            document: Document with PDF content
            
        Returns:
            Document with extracted text
        """
        logger.info(f"Extracting text with PyPDF2: {document.id}")
        
        # Import here to avoid dependencies for platforms that don't use it
        try:
            import PyPDF2
        except ImportError:
            logger.warning("PyPDF2 not available, skipping PyPDF2 extraction")
            return document
        
        try:
            # Create temp file for PyPDF2 to read from
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(document.raw_content)
                temp_path = temp_file.name
            
            # Run in executor to avoid blocking
            def _extract():
                text_content = []
                with open(temp_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    for page_num in range(len(reader.pages)):
                        page = reader.pages[page_num]
                        text_content.append(page.extract_text())
                return "\n\n".join(text_content)
            
            loop = asyncio.get_event_loop()
            document.content = await loop.run_in_executor(None, _extract)
            
            # Clean up temp file
            os.unlink(temp_path)
            
        except Exception as e:
            logger.error(f"Error in PyPDF2 extraction: {e}")
            document.content = ""  # Clear content for next extractor
        
        return document
    
    async def _extract_with_pdfminer(self, document: Document) -> Document:
        """
        Extract text from PDF using pdfminer.six library.
        
        Args:
            document: Document with PDF content
            
        Returns:
            Document with extracted text
        """
        logger.info(f"Extracting text with pdfminer.six: {document.id}")
        
        # Import here to avoid dependencies for platforms that don't use it
        try:
            from pdfminer.high_level import extract_text_to_fp
            from pdfminer.layout import LAParams
        except ImportError:
            logger.warning("pdfminer.six not available, skipping pdfminer extraction")
            return document
        
        try:
            # Create temp file for pdfminer to read from
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(document.raw_content)
                temp_path = temp_file.name
            
            # Use StringIO for output
            output = io.StringIO()
            
            # Run in executor to avoid blocking
            def _extract():
                with open(temp_path, 'rb') as file:
                    laparams = LAParams()
                    extract_text_to_fp(file, output, laparams=laparams)
                return output.getvalue()
            
            loop = asyncio.get_event_loop()
            document.content = await loop.run_in_executor(None, _extract)
            
            # Clean up
            os.unlink(temp_path)
            output.close()
            
        except Exception as e:
            logger.error(f"Error in pdfminer extraction: {e}")
        
        return document
    
    async def _extract_with_ocr(self, document: Document) -> Document:
        """
        Extract text from PDF using OCR (Tesseract via pytesseract).
        
        Args:
            document: Document with PDF content
            
        Returns:
            Document with extracted text
        """
        logger.info(f"Extracting text with OCR: {document.id}")
        
        # Import here to avoid dependencies for platforms that don't use it
        try:
            import pytesseract
            from pdf2image import convert_from_bytes
        except ImportError:
            logger.warning("pytesseract or pdf2image not available, skipping OCR")
            return document
        
        try:
            # Run in executor to avoid blocking
            def _extract():
                # Convert PDF to images
                images = convert_from_bytes(document.raw_content)
                
                # Extract text from each image
                extracted_text = []
                for i, image in enumerate(images):
                    text = pytesseract.image_to_string(image)
                    extracted_text.append(text)
                
                return "\n\n".join(extracted_text)
            
            loop = asyncio.get_event_loop()
            ocr_text = await loop.run_in_executor(None, _extract)
            
            # If we already have some content, only use OCR if it produced significantly more text
            if document.content:
                if len(ocr_text) > len(document.content) * 1.5:
                    document.content = ocr_text
                    document.metadata.custom_metadata["extraction_method"] = "ocr"
            else:
                document.content = ocr_text
                document.metadata.custom_metadata["extraction_method"] = "ocr"
            
        except Exception as e:
            logger.error(f"Error in OCR extraction: {e}")
        
        return document
    
    async def _extract_metadata(self, document: Document) -> Document:
        """
        Extract metadata from PDF.
        
        Args:
            document: Document with PDF content
            
        Returns:
            Document with extracted metadata
        """
        logger.info(f"Extracting metadata from PDF: {document.id}")
        
        try:
            import PyPDF2
        except ImportError:
            logger.warning("PyPDF2 not available, skipping metadata extraction")
            return document
        
        try:
            # Create temp file for PyPDF2 to read from
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(document.raw_content)
                temp_path = temp_file.name
            
            # Run in executor to avoid blocking
            def _extract_metadata():
                with open(temp_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    info = reader.metadata
                    
                    metadata = {}
                    if info:
                        for key in info:
                            metadata[key[1:]] = info[key]  # Remove the leading '/'
                    
                    # Add additional metadata
                    metadata["page_count"] = len(reader.pages)
                    
                    return metadata
            
            loop = asyncio.get_event_loop()
            pdf_metadata = await loop.run_in_executor(None, _extract_metadata)
            
            # Update document metadata
            if "Author" in pdf_metadata and pdf_metadata["Author"]:
                document.metadata.authors = [pdf_metadata["Author"]]
            
            if "Title" in pdf_metadata and pdf_metadata["Title"]:
                document.metadata.title = pdf_metadata["Title"]
            
            # Add all metadata to custom_metadata
            document.metadata.custom_metadata.update({
                "pdf_metadata": pdf_metadata
            })
            
            # Clean up temp file
            os.unlink(temp_path)
            
        except Exception as e:
            logger.error(f"Error extracting PDF metadata: {e}")
        
        return document
    
    async def _extract_images(self, document: Document) -> Document:
        """
        Extract images from PDF and save to disk.
        
        Args:
            document: Document with PDF content
            
        Returns:
            Document with reference to extracted images
        """
        logger.info(f"Extracting images from PDF: {document.id}")
        
        try:
            from pdfminer.high_level import extract_pages
            from pdfminer.layout import LTImage, LTFigure
        except ImportError:
            logger.warning("pdfminer.six not available, skipping image extraction")
            return document
        
        try:
            # Create output directory
            img_dir = os.path.join(self.output_dir, document.id)
            os.makedirs(img_dir, exist_ok=True)
            
            # Create temp file for pdfminer to read from
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(document.raw_content)
                temp_path = temp_file.name
            
            # Run in executor to avoid blocking
            def _extract_images():
                extracted_images = []
                
                with open(temp_path, 'rb') as file:
                    for i, page_layout in enumerate(extract_pages(file)):
                        for element in page_layout:
                            if isinstance(element, LTImage):
                                # Directly extractable image
                                img_path = os.path.join(img_dir, f"image_p{i+1}_{len(extracted_images)}.jpg")
                                with open(img_path, 'wb') as img_file:
                                    img_file.write(element.stream.get_rawdata())
                                extracted_images.append(img_path)
                            elif isinstance(element, LTFigure):
                                # Container for images, recursively search
                                for fig_element in element:
                                    if isinstance(fig_element, LTImage):
                                        img_path = os.path.join(img_dir, f"image_p{i+1}_{len(extracted_images)}.jpg")
                                        with open(img_path, 'wb') as img_file:
                                            img_file.write(fig_element.stream.get_rawdata())
                                        extracted_images.append(img_path)
                
                return extracted_images
            
            loop = asyncio.get_event_loop()
            extracted_images = await loop.run_in_executor(None, _extract_images)
            
            # Update document metadata
            document.metadata.custom_metadata["extracted_images"] = extracted_images
            document.metadata.custom_metadata["image_count"] = len(extracted_images)
            
            # Clean up temp file
            os.unlink(temp_path)
            
        except Exception as e:
            logger.error(f"Error extracting images from PDF: {e}")
        
        return document