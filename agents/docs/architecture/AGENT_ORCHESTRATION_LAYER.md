# Agent Orchestration Layer

This document outlines the architecture for the Agent Orchestration Layer in the Agentic Documentation Management System, combining OpenAI's Manager Pattern with Google's Agent-to-Agent (A2A) communication principles.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                 DocumentationAgentHub                                │
└───────────┬──────────────┬──────────────┬───────────────────────────┘
            │              │              │                   
            ▼              ▼              ▼                   
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Ingestion     │  │ Analysis      │  │ Validation    │  │ Creation      │
│ Orchestrator  │  │ Orchestrator  │  │ Orchestrator  │  │ Orchestrator  │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │                  │
        ▼                  ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ PDF           │  │ Semantic      │  │ Technical     │  │ Template      │
│ Processor     │  │ Analyzer      │  │ Validator     │  │ Generator     │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Markdown      │  │ Tag           │  │ Completeness  │  │ Content       │
│ Processor     │  │ Generator     │  │ Validator     │  │ Generator     │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ HTML          │  │ Entity        │  │ Consistency   │  │ Editor        │
│ Processor     │  │ Extractor     │  │ Validator     │  │ Assistant     │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
```

## Design Principles

The Agent Orchestration Layer adheres to both Google A2A and OpenAI Agent architecture principles:

1. **Hierarchical Manager Pattern**: Following OpenAI's Manager Pattern with two levels of orchestration
2. **Independent Agent Specialization**: Each agent specializes in specific tasks
3. **Standardized Message-Based Communication**: Follows Google A2A's standardized messaging 
4. **Emergent Cooperation**: Complex tasks emerge from coordinated specialized agents
5. **Tool Extensibility**: Agents use tools to extend their capabilities
6. **Learning from Feedback**: System improves through feedback mechanisms

## Core Architecture Components

### 1. DocumentationAgentHub

The top-level orchestrator that coordinates domain-specific orchestrators:

```python
from agents import Agent, function_tool, Runner
import asyncio
import json

class DocumentationAgentHub:
    """
    Central coordination hub for all documentation agents, implementing
    both Google's A2A communication model and OpenAI's Manager pattern.
    """
    
    def __init__(self, config, event_bus, knowledge_graph):
        self.config = config
        self.event_bus = event_bus
        self.kg = knowledge_graph
        
        # Initialize domain orchestrators
        self.ingestion_orchestrator = IngestionOrchestrator(config, event_bus, knowledge_graph)
        self.analysis_orchestrator = AnalysisOrchestrator(config, event_bus, knowledge_graph)
        self.validation_orchestrator = ValidationOrchestrator(config, event_bus, knowledge_graph)
        self.creation_orchestrator = CreationOrchestrator(config, event_bus, knowledge_graph)
        
        # Set up orchestrator tools
        @function_tool
        async def process_document_ingestion(document_info: dict) -> dict:
            """
            Process a document ingestion request
            
            Args:
                document_info: Information about the document to ingest
                
            Returns:
                Ingestion results
            """
            return await self.ingestion_orchestrator.process_request(document_info)
        
        @function_tool
        async def analyze_document(document_id: str, analysis_types: list = None) -> dict:
            """
            Analyze a document for semantic understanding, tagging, and concept extraction
            
            Args:
                document_id: ID of the document to analyze
                analysis_types: Optional list of analysis types to perform
                
            Returns:
                Analysis results
            """
            return await self.analysis_orchestrator.process_request({
                "document_id": document_id,
                "analysis_types": analysis_types
            })
        
        @function_tool
        async def validate_document(document_id: str, validation_types: list = None) -> dict:
            """
            Validate a document for quality, completeness, and accuracy
            
            Args:
                document_id: ID of the document to validate
                validation_types: Optional list of validation types to perform
                
            Returns:
                Validation results
            """
            return await self.validation_orchestrator.process_request({
                "document_id": document_id,
                "validation_types": validation_types
            })
        
        @function_tool
        async def create_document(creation_info: dict) -> dict:
            """
            Create a new document based on provided information
            
            Args:
                creation_info: Information for document creation
                
            Returns:
                Document creation results
            """
            return await self.creation_orchestrator.process_request(creation_info)
        
        @function_tool
        async def find_similar_documents(document_id: str, threshold: float = 0.7) -> list:
            """
            Find documents similar to the specified document
            
            Args:
                document_id: ID of the document to compare
                threshold: Similarity threshold (0-1)
                
            Returns:
                List of similar documents with similarity scores
            """
            # Get document content and embedding
            document = await self.kg.get_document(document_id)
            if not document:
                return {"error": "Document not found"}
            
            # Use vector store to find similar documents
            return await self.kg.find_similar_documents(document_id, threshold)
        
        @function_tool
        async def get_document_connections(document_id: str) -> dict:
            """
            Get all connections for a document (features, roadmap items, other docs)
            
            Args:
                document_id: ID of the document
                
            Returns:
                Connected entities
            """
            connections = await self.kg.get_document_connections(document_id)
            return connections
        
        # Create the top-level orchestrator agent
        self.agent = Agent(
            name="DocumentationAgentHub",
            instructions="""
            You are the central orchestrator for the Documentation Management System. 
            Your job is to:
            
            1. Route requests to the appropriate domain orchestrators
            2. Coordinate complex workflows involving multiple orchestrators
            3. Maintain context across different processing stages
            4. Synthesize results from different agents
            5. Ensure all documentation processes follow proper workflows
            
            For each request, determine which specialized orchestrators need to be involved
            and coordinate their execution in the appropriate sequence.
            """,
            tools=[
                process_document_ingestion,
                analyze_document,
                validate_document, 
                create_document,
                find_similar_documents,
                get_document_connections
            ]
        )
    
    async def process_request(self, request):
        """Process a high-level documentation system request"""
        # Create initial message
        message = {
            "role": "user",
            "content": f"""
            Process this documentation system request:
            
            {json.dumps(request, indent=2)}
            
            Determine the appropriate orchestrators to involve and coordinate their execution.
            """
        }
        
        # Execute the request using the agent
        result = await Runner.run(
            self.agent,
            [message]
        )
        
        # Process the result
        for message in result.new_messages:
            if message.role == "assistant" and "process complete" in message.content.lower():
                # Extract result information
                return self._extract_result_from_message(message.content, request)
        
        # Default response if no clear completion message found
        return {
            "status": "completed",
            "request_type": request.get("type", "unknown"),
            "message": "Request processed by Documentation Agent Hub"
        }
    
    def _extract_result_from_message(self, message_content, original_request):
        """Extract structured result from agent message"""
        # Try to find JSON content
        import re
        import json
        
        json_match = re.search(r'```json\n(.*?)\n```', message_content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Fall back to simple extraction
        result = {
            "status": "completed",
            "request_type": original_request.get("type", "unknown")
        }
        
        # Extract document ID if present
        doc_id_match = re.search(r'document[_\s]id[:\s]+([a-zA-Z0-9-_]+)', message_content)
        if doc_id_match:
            result["document_id"] = doc_id_match.group(1)
        
        return result
    
    async def process_document_workflow(self, document_path, options=None):
        """
        Process a complete document workflow from ingestion through analysis and validation
        
        Args:
            document_path: Path to the document file
            options: Optional processing options
            
        Returns:
            Complete workflow results
        """
        options = options or {}
        workflow_id = f"workflow-{int(time.time())}"
        
        try:
            # Publish workflow started event
            await self.event_bus.publish("document.workflow.started", {
                "workflow_id": workflow_id,
                "document_path": document_path,
                "options": options,
                "timestamp": datetime.now().isoformat()
            })
            
            # Step 1: Ingest document
            ingestion_result = await self.process_request({
                "type": "ingestion",
                "document_path": document_path,
                "options": options
            })
            
            document_id = ingestion_result.get("document_id")
            if not document_id:
                raise ValueError("Document ingestion failed: No document ID returned")
            
            # Step 2: Analyze document
            analysis_result = await self.process_request({
                "type": "analysis",
                "document_id": document_id,
                "analysis_types": options.get("analysis_types", ["semantic", "tagging", "entity_extraction"])
            })
            
            # Step 3: Validate document
            validation_result = await self.process_request({
                "type": "validation",
                "document_id": document_id,
                "validation_types": options.get("validation_types", ["technical", "completeness", "consistency", "readability"])
            })
            
            # Combine results
            workflow_result = {
                "workflow_id": workflow_id,
                "document_id": document_id,
                "document_path": document_path,
                "ingestion_result": ingestion_result,
                "analysis_result": analysis_result,
                "validation_result": validation_result,
                "status": "completed",
                "quality_score": validation_result.get("quality_score"),
                "needs_revision": validation_result.get("needs_revision", False)
            }
            
            # Publish workflow completed event
            await self.event_bus.publish("document.workflow.completed", {
                "workflow_id": workflow_id,
                "document_id": document_id,
                "status": "completed",
                "quality_score": workflow_result.get("quality_score"),
                "needs_revision": workflow_result.get("needs_revision"),
                "timestamp": datetime.now().isoformat()
            })
            
            return workflow_result
            
        except Exception as e:
            # Publish workflow failed event
            await self.event_bus.publish("document.workflow.failed", {
                "workflow_id": workflow_id,
                "document_path": document_path,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            
            raise
```

### 2. Domain-Specific Orchestrators

Each domain has a dedicated orchestrator agent following OpenAI's Manager Pattern:

#### Ingestion Orchestrator

```python
class IngestionOrchestrator:
    """
    Orchestrates document ingestion by coordinating specialized format processors.
    """
    
    def __init__(self, config, event_bus, knowledge_graph):
        self.config = config
        self.event_bus = event_bus
        self.kg = knowledge_graph
        
        # Initialize specialized processors
        self.pdf_processor = PDFProcessorAgent(config, knowledge_graph)
        self.markdown_processor = MarkdownProcessorAgent(config, knowledge_graph)
        self.html_processor = HTMLProcessorAgent(config, knowledge_graph)
        
        # Set up processor tools
        @function_tool
        async def process_pdf(file_path: str, options: dict = None) -> dict:
            """
            Process a PDF document
            
            Args:
                file_path: Path to the PDF file
                options: Optional processing options
                
            Returns:
                Processing results
            """
            return await self.pdf_processor.process(file_path, options or {})
        
        @function_tool
        async def process_markdown(file_path: str, options: dict = None) -> dict:
            """
            Process a Markdown document
            
            Args:
                file_path: Path to the Markdown file
                options: Optional processing options
                
            Returns:
                Processing results
            """
            return await self.markdown_processor.process(file_path, options or {})
        
        @function_tool
        async def process_html(file_path: str, options: dict = None) -> dict:
            """
            Process an HTML document
            
            Args:
                file_path: Path to the HTML file
                options: Optional processing options
                
            Returns:
                Processing results
            """
            return await self.html_processor.process(file_path, options or {})
        
        @function_tool
        async def detect_document_format(file_path: str) -> str:
            """
            Detect the format of a document
            
            Args:
                file_path: Path to the document file
                
            Returns:
                Detected format (pdf, markdown, html, etc.)
            """
            import os
            import magic
            
            # Try to detect by file extension first
            _, ext = os.path.splitext(file_path)
            ext = ext.lower()
            
            if ext == '.pdf':
                return "pdf"
            elif ext in ['.md', '.markdown']:
                return "markdown"
            elif ext in ['.html', '.htm']:
                return "html"
            elif ext in ['.txt', '.text']:
                return "text"
            
            # If extension is not conclusive, use libmagic
            try:
                mime = magic.Magic(mime=True)
                mime_type = mime.from_file(file_path)
                
                if mime_type == 'application/pdf':
                    return "pdf"
                elif mime_type in ['text/markdown', 'text/plain']:
                    # Check content for markdown indicators
                    with open(file_path, 'r', errors='ignore') as f:
                        content = f.read(1000)  # Read first 1000 chars
                        if '#' in content and '##' in content:
                            return "markdown"
                        else:
                            return "text"
                elif mime_type in ['text/html']:
                    return "html"
            except Exception:
                pass
            
            # Default to text
            return "text"
        
        @function_tool
        async def store_document(document_data: dict) -> dict:
            """
            Store a processed document in the knowledge graph
            
            Args:
                document_data: Processed document data
                
            Returns:
                Storage result with document ID
            """
            document_id = await self.kg.store_document(document_data)
            
            # Publish document created event
            await self.event_bus.publish("document.created", {
                "document_id": document_id,
                "document_title": document_data.get("title", "Untitled"),
                "document_format": document_data.get("format"),
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "document_id": document_id,
                "status": "stored"
            }
        
        # Create the orchestrator agent
        self.agent = Agent(
            name="IngestionOrchestrator",
            instructions="""
            You are the document ingestion orchestrator. Your job is to:
            
            1. Determine the format of documents to be ingested
            2. Route documents to the appropriate specialized processor
            3. Store processed documents in the knowledge graph
            4. Ensure all document metadata is properly extracted
            
            For each document, detect its format and use the appropriate processor.
            Then store the processed document and return the result.
            """,
            tools=[
                process_pdf,
                process_markdown,
                process_html,
                detect_document_format,
                store_document
            ]
        )
    
    async def process_request(self, request):
        """Process a document ingestion request"""
        # Extract document path
        document_path = request.get("document_path")
        options = request.get("options", {})
        
        if not document_path:
            return {"error": "Document path is required"}
        
        # Create message for the agent
        message = {
            "role": "user",
            "content": f"""
            Process this document for ingestion:
            
            Document Path: {document_path}
            Options: {json.dumps(options, indent=2)}
            
            1. Detect the document format
            2. Process using the appropriate processor
            3. Store the processed document
            4. Return the result
            """
        }
        
        # Execute the request using the agent
        result = await Runner.run(
            self.agent,
            [message]
        )
        
        # Process the result
        for message in result.new_messages:
            if message.role == "assistant" and "document processed" in message.content.lower():
                # Extract document ID
                import re
                doc_id_match = re.search(r'document[_\s]id[:\s]+([a-zA-Z0-9-_]+)', message.content)
                
                if doc_id_match:
                    return {
                        "document_id": doc_id_match.group(1),
                        "status": "ingested",
                        "document_path": document_path
                    }
        
        return {
            "status": "failed",
            "error": "Failed to process document",
            "document_path": document_path
        }
```

#### Analysis Orchestrator

```python
class AnalysisOrchestrator:
    """
    Orchestrates document analysis by coordinating specialized analyzers.
    """
    
    def __init__(self, config, event_bus, knowledge_graph):
        self.config = config
        self.event_bus = event_bus
        self.kg = knowledge_graph
        
        # Initialize specialized analyzers
        self.semantic_analyzer = SemanticAnalyzerAgent(config, knowledge_graph)
        self.tag_generator = TagGeneratorAgent(config, knowledge_graph)
        self.entity_extractor = EntityExtractorAgent(config, knowledge_graph)
        
        # Set up analyzer tools
        @function_tool
        async def analyze_semantics(document_id: str) -> dict:
            """
            Analyze document semantics
            
            Args:
                document_id: ID of the document to analyze
                
            Returns:
                Semantic analysis results
            """
            return await self.semantic_analyzer.analyze(document_id)
        
        @function_tool
        async def generate_tags(document_id: str) -> dict:
            """
            Generate tags for a document
            
            Args:
                document_id: ID of the document
                
            Returns:
                Generated tags
            """
            return await self.tag_generator.generate_tags(document_id)
        
        @function_tool
        async def extract_entities(document_id: str) -> dict:
            """
            Extract entities from a document
            
            Args:
                document_id: ID of the document
                
            Returns:
                Extracted entities
            """
            return await self.entity_extractor.extract_entities(document_id)
        
        @function_tool
        async def store_analysis_results(document_id: str, results: dict) -> dict:
            """
            Store analysis results in the knowledge graph
            
            Args:
                document_id: ID of the document
                results: Analysis results to store
                
            Returns:
                Storage result
            """
            await self.kg.store_document_analysis(document_id, results)
            
            # Publish analysis completed event
            await self.event_bus.publish("document.analysis.completed", {
                "document_id": document_id,
                "analysis_types": list(results.keys()),
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "status": "stored",
                "document_id": document_id
            }
        
        # Create the orchestrator agent
        self.agent = Agent(
            name="AnalysisOrchestrator",
            instructions="""
            You are the document analysis orchestrator. Your job is to:
            
            1. Coordinate specialized analysis agents
            2. Ensure comprehensive analysis of documents
            3. Combine analysis results
            4. Store analysis results in the knowledge graph
            
            For each document, run the appropriate analysis based on the requested types.
            If no specific types are requested, run all analyses.
            """,
            tools=[
                analyze_semantics,
                generate_tags,
                extract_entities,
                store_analysis_results
            ]
        )
    
    async def process_request(self, request):
        """Process a document analysis request"""
        # Extract document ID and analysis types
        document_id = request.get("document_id")
        analysis_types = request.get("analysis_types")
        
        if not document_id:
            return {"error": "Document ID is required"}
        
        # Default to all analysis types if none specified
        if not analysis_types:
            analysis_types = ["semantic", "tagging", "entity_extraction"]
        
        # Create message for the agent
        message = {
            "role": "user",
            "content": f"""
            Analyze this document:
            
            Document ID: {document_id}
            Analysis Types: {', '.join(analysis_types)}
            
            Run the appropriate analyses and store the results.
            """
        }
        
        # Execute the request using the agent
        result = await Runner.run(
            self.agent,
            [message]
        )
        
        # Process the result
        for message in result.new_messages:
            if message.role == "assistant" and "analysis complete" in message.content.lower():
                return {
                    "document_id": document_id,
                    "status": "analyzed",
                    "analysis_types": analysis_types
                }
        
        return {
            "status": "failed",
            "error": "Failed to analyze document",
            "document_id": document_id
        }
```

### 3. Specialized Agents

Each specialized agent leverages OpenAI's Agent pattern with specific tools:

#### PDF Processor Agent

```python
class PDFProcessorAgent:
    """
    Specialized agent for processing PDF documents.
    """
    
    def __init__(self, config, knowledge_graph):
        self.config = config
        self.kg = knowledge_graph
        
        # Initialize tools
        @function_tool
        async def extract_text_from_pdf(file_path: str) -> dict:
            """
            Extract text content from a PDF file
            
            Args:
                file_path: Path to the PDF file
                
            Returns:
                Extracted text content
            """
            from pypdf import PdfReader
            
            try:
                reader = PdfReader(file_path)
                text = ""
                metadata = {
                    "page_count": len(reader.pages),
                    "title": reader.metadata.get('/Title', ''),
                    "author": reader.metadata.get('/Author', ''),
                    "creator": reader.metadata.get('/Creator', ''),
                    "producer": reader.metadata.get('/Producer', ''),
                    "subject": reader.metadata.get('/Subject', ''),
                    "creation_date": reader.metadata.get('/CreationDate', ''),
                }
                
                # Extract text from each page
                page_texts = []
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    page_texts.append({
                        "page_number": i + 1,
                        "content": page_text,
                        "word_count": len(page_text.split())
                    })
                    text += page_text + "\n\n--- Page Break ---\n\n"
                
                return {
                    "full_text": text,
                    "page_texts": page_texts,
                    "metadata": metadata
                }
            except Exception as e:
                return {
                    "error": str(e)
                }
        
        @function_tool
        async def extract_images_from_pdf(file_path: str, output_dir: str = None) -> dict:
            """
            Extract images from a PDF file
            
            Args:
                file_path: Path to the PDF file
                output_dir: Directory to save extracted images
                
            Returns:
                Information about extracted images
            """
            from pypdf import PdfReader
            import os
            import PIL.Image
            import io
            
            try:
                reader = PdfReader(file_path)
                
                # Create output directory if it doesn't exist
                if output_dir:
                    os.makedirs(output_dir, exist_ok=True)
                
                images = []
                for i, page in enumerate(reader.pages):
                    for j, image in enumerate(page.images):
                        image_data = image.data
                        image_ext = image.ext
                        
                        # Save image if output directory is provided
                        image_path = None
                        if output_dir:
                            image_path = os.path.join(output_dir, f"page_{i+1}_image_{j+1}.{image_ext}")
                            with open(image_path, "wb") as f:
                                f.write(image_data)
                        
                        # Get image dimensions
                        img = PIL.Image.open(io.BytesIO(image_data))
                        width, height = img.size
                        
                        images.append({
                            "page_number": i + 1,
                            "image_number": j + 1,
                            "format": image_ext,
                            "width": width,
                            "height": height,
                            "path": image_path
                        })
                
                return {
                    "total_images": len(images),
                    "images": images
                }
            except Exception as e:
                return {
                    "error": str(e)
                }
        
        @function_tool
        async def extract_tables_from_pdf(file_path: str) -> dict:
            """
            Extract tables from a PDF file
            
            Args:
                file_path: Path to the PDF file
                
            Returns:
                Extracted tables
            """
            try:
                import tabula
                
                # Extract tables using tabula
                tables = tabula.read_pdf(file_path, pages='all', multiple_tables=True)
                
                result = []
                for i, table in enumerate(tables):
                    # Convert table to dictionary
                    table_dict = table.to_dict(orient='records')
                    
                    result.append({
                        "table_number": i + 1,
                        "data": table_dict,
                        "rows": len(table_dict),
                        "columns": len(table.columns)
                    })
                
                return {
                    "total_tables": len(result),
                    "tables": result
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "tables": []
                }
        
        @function_tool
        async def convert_pdf_to_markdown(text_content: dict, images: dict, tables: dict) -> str:
            """
            Convert PDF content to Markdown format
            
            Args:
                text_content: Extracted text content
                images: Extracted images
                tables: Extracted tables
                
            Returns:
                Markdown representation of the PDF
            """
            import re
            
            try:
                markdown = ""
                
                # Add title from metadata if available
                if text_content["metadata"].get("title"):
                    markdown += f"# {text_content['metadata']['title']}\n\n"
                
                # Add metadata section
                markdown += "## Document Information\n\n"
                for key, value in text_content["metadata"].items():
                    if value:
                        markdown += f"- **{key.replace('_', ' ').title()}**: {value}\n"
                markdown += "\n"
                
                # Process each page
                current_images = {img["page_number"]: [] for img in images.get("images", [])}
                for img in images.get("images", []):
                    current_images[img["page_number"]].append(img)
                
                current_tables = {table.get("page_number", i+1): table for i, table in enumerate(tables.get("tables", []))}
                
                for page in text_content["page_texts"]:
                    page_num = page["page_number"]
                    content = page["content"]
                    
                    # Add page header
                    markdown += f"## Page {page_num}\n\n"
                    
                    # Add page images if available
                    if page_num in current_images and current_images[page_num]:
                        markdown += "### Images\n\n"
                        for img in current_images[page_num]:
                            if img.get("path"):
                                markdown += f"![Image {img['image_number']}]({img['path']})\n\n"
                            else:
                                markdown += f"*Image {img['image_number']} ({img['width']}x{img['height']})*\n\n"
                    
                    # Add page content
                    markdown += "### Content\n\n"
                    
                    # Try to detect headings and format them
                    lines = content.split("\n")
                    formatted_lines = []
                    
                    for line in lines:
                        # Skip empty lines
                        if not line.strip():
                            formatted_lines.append("")
                            continue
                        
                        # Detect and format headings (short lines with all words capitalized)
                        words = line.split()
                        if len(words) <= 7 and all(word[0].isupper() for word in words if word):
                            if len(words) <= 3:
                                formatted_lines.append(f"### {line}")
                            else:
                                formatted_lines.append(f"#### {line}")
                        else:
                            # Regular paragraph
                            formatted_lines.append(line)
                    
                    # Join lines and add to markdown
                    markdown += "\n".join(formatted_lines) + "\n\n"
                    
                    # Add page tables if available
                    if page_num in current_tables:
                        table = current_tables[page_num]
                        markdown += "### Tables\n\n"
                        
                        # Generate markdown table
                        if isinstance(table, dict) and "data" in table:
                            table_data = table["data"]
                            if table_data and len(table_data) > 0:
                                # Get headers from first row
                                headers = list(table_data[0].keys())
                                
                                # Create table header
                                markdown += "| " + " | ".join(headers) + " |\n"
                                markdown += "| " + " | ".join(["---"] * len(headers)) + " |\n"
                                
                                # Add rows
                                for row in table_data:
                                    row_values = [str(row.get(header, "")) for header in headers]
                                    markdown += "| " + " | ".join(row_values) + " |\n"
                                
                                markdown += "\n"
                
                return markdown
            except Exception as e:
                return f"Error converting to Markdown: {str(e)}"
        
        # Create the agent
        self.agent = Agent(
            name="PDFProcessorAgent",
            instructions="""
            You are a specialized PDF processing agent. Your job is to:
            
            1. Extract text content from PDF documents
            2. Extract images and tables when available
            3. Convert PDF content to Markdown format
            4. Maintain as much of the original structure as possible
            
            Process each PDF thoroughly to extract all relevant information.
            """,
            tools=[
                extract_text_from_pdf,
                extract_images_from_pdf,
                extract_tables_from_pdf,
                convert_pdf_to_markdown
            ]
        )
    
    async def process(self, file_path, options=None):
        """Process a PDF document"""
        options = options or {}
        
        # Create message for the agent
        message = {
            "role": "user",
            "content": f"""
            Process this PDF document:
            
            File Path: {file_path}
            
            Extract text, images, and tables from the PDF and convert it to Markdown format.
            """
        }
        
        # Execute the request using the agent
        result = await Runner.run(
            self.agent,
            [message]
        )
        
        # Extract results from agent response
        markdown_content = None
        metadata = {}
        
        for message in result.new_messages:
            if message.role == "assistant":
                content = message.content
                
                # Look for markdown content marker
                markdown_start = content.find("```markdown")
                markdown_end = content.find("```", markdown_start + 10) if markdown_start != -1 else -1
                
                if markdown_start != -1 and markdown_end != -1:
                    markdown_content = content[markdown_start + 10:markdown_end].strip()
                
                # Extract metadata if available
                import re
                metadata_match = re.search(r'Document Information:(.*?)(?:##|\Z)', content, re.DOTALL)
                if metadata_match:
                    metadata_text = metadata_match.group(1).strip()
                    for line in metadata_text.split('\n'):
                        if ':' in line:
                            key, value = line.split(':', 1)
                            key = key.strip().strip('*-').strip()
                            value = value.strip()
                            metadata[key.lower()] = value
        
        # Create document data
        document_data = {
            "title": metadata.get("title", os.path.basename(file_path)),
            "content": markdown_content,
            "original_format": "pdf",
            "format": "markdown",
            "metadata": metadata,
            "path": file_path
        }
        
        return document_data
```

### 4. Agent Orchestration Coordinator

The system also provides high-level coordination for complex workflows:

```python
class AgentOrchestrationCoordinator:
    """
    High-level coordinator for managing complex workflows and long-running processes.
    """
    
    def __init__(self, config, event_bus, knowledge_graph):
        self.config = config
        self.event_bus = event_bus
        self.kg = knowledge_graph
        self.documentation_hub = DocumentationAgentHub(config, event_bus, knowledge_graph)
        
        # Initialize active workflows
        self.active_workflows = {}
        
        # Set up event listeners
        self.event_bus.subscribe("document.workflow.started", self.handle_workflow_started)
        self.event_bus.subscribe("document.workflow.completed", self.handle_workflow_completed)
        self.event_bus.subscribe("document.workflow.failed", self.handle_workflow_failed)
    
    async def handle_workflow_started(self, event):
        """Handle workflow started event"""
        workflow_id = event["workflow_id"]
        
        # Store in active workflows
        self.active_workflows[workflow_id] = {
            "status": "active",
            "started_at": event["timestamp"],
            "document_path": event["document_path"],
            "options": event["options"]
        }
    
    async def handle_workflow_completed(self, event):
        """Handle workflow completed event"""
        workflow_id = event["workflow_id"]
        
        if workflow_id in self.active_workflows:
            self.active_workflows[workflow_id].update({
                "status": "completed",
                "completed_at": event["timestamp"],
                "document_id": event["document_id"],
                "quality_score": event.get("quality_score"),
                "needs_revision": event.get("needs_revision", False)
            })
    
    async def handle_workflow_failed(self, event):
        """Handle workflow failed event"""
        workflow_id = event["workflow_id"]
        
        if workflow_id in self.active_workflows:
            self.active_workflows[workflow_id].update({
                "status": "failed",
                "failed_at": event["timestamp"],
                "error": event["error"]
            })
    
    async def process_directory(self, directory_path, options=None):
        """Process all documents in a directory"""
        import os
        import glob
        
        options = options or {}
        
        # Find all files in the directory
        if "file_pattern" in options:
            file_pattern = os.path.join(directory_path, options["file_pattern"])
            files = glob.glob(file_pattern, recursive=True)
        else:
            # Default to common document formats
            files = []
            for pattern in ["*.pdf", "*.md", "*.markdown", "*.html", "*.txt"]:
                files.extend(glob.glob(os.path.join(directory_path, "**", pattern), recursive=True))
        
        # Start workflows for each file
        results = []
        for file_path in files:
            try:
                workflow = await self.documentation_hub.process_document_workflow(file_path, options)
                results.append({
                    "file_path": file_path,
                    "workflow_id": workflow["workflow_id"],
                    "document_id": workflow["document_id"],
                    "status": "completed",
                    "quality_score": workflow.get("quality_score")
                })
            except Exception as e:
                results.append({
                    "file_path": file_path,
                    "status": "failed",
                    "error": str(e)
                })
        
        # Compile report
        total = len(results)
        successful = sum(1 for r in results if r["status"] == "completed")
        failed = total - successful
        
        return {
            "directory": directory_path,
            "total_files": total,
            "successful": successful,
            "failed": failed,
            "results": results
        }
    
    async def generate_knowledge_graph_report(self, options=None):
        """Generate a report on the current knowledge graph state"""
        options = options or {}
        
        # Get document counts by type and format
        document_counts = await self.kg.get_document_counts()
        
        # Get connection statistics
        connection_stats = await self.kg.get_connection_statistics()
        
        # Get recent activities
        recent_activities = await self.kg.get_recent_activities(10)
        
        # Generate report
        report = {
            "generated_at": datetime.now().isoformat(),
            "document_counts": document_counts,
            "connection_stats": connection_stats,
            "recent_activities": recent_activities,
            "active_workflows": len(self.active_workflows),
            "workflow_statuses": {
                "active": sum(1 for w in self.active_workflows.values() if w["status"] == "active"),
                "completed": sum(1 for w in self.active_workflows.values() if w["status"] == "completed"),
                "failed": sum(1 for w in self.active_workflows.values() if w["status"] == "failed")
            }
        }
        
        return report
    
    async def schedule_recurring_tasks(self):
        """Schedule recurring tasks for maintenance and updates"""
        import asyncio
        
        # Schedule daily report generation
        async def daily_report():
            while True:
                # Generate report
                report = await self.generate_knowledge_graph_report()
                
                # Store report in knowledge graph
                report_id = await self.kg.store_system_report(report)
                
                # Publish report event
                await self.event_bus.publish("system.report.generated", {
                    "report_id": report_id,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Wait until next day
                await asyncio.sleep(24 * 60 * 60)  # 24 hours
        
        # Schedule document validation refresh
        async def validation_refresh():
            while True:
                # Get documents needing revalidation
                documents = await self.kg.get_documents_needing_revalidation()
                
                for doc in documents:
                    # Request validation
                    await self.documentation_hub.process_request({
                        "type": "validation",
                        "document_id": doc["id"]
                    })
                
                # Wait before next check
                await asyncio.sleep(4 * 60 * 60)  # 4 hours
        
        # Start tasks
        asyncio.create_task(daily_report())
        asyncio.create_task(validation_refresh())
```

### 5. Event Bus for Agent Communication

A Redis-based event bus enabling asynchronous communication between agents:

```python
class EventBus:
    """
    Redis-based event bus for asynchronous communication between agents,
    following Google A2A principles.
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.subscribers = {}
        self.pubsub = self.redis.pubsub(ignore_subscribe_messages=True)
        self.running = False
        
        # Start listening task
        self._start_listener()
    
    def _start_listener(self):
        """Start the listener task"""
        import asyncio
        self.running = True
        asyncio.create_task(self._listen_for_messages())
    
    async def _listen_for_messages(self):
        """Listen for messages on subscribed channels"""
        while self.running:
            message = await self.pubsub.get_message()
            if message:
                channel = message['channel'].decode('utf-8')
                data = json.loads(message['data'].decode('utf-8'))
                
                # Call subscribers for this channel
                if channel in self.subscribers:
                    for callback in self.subscribers[channel]:
                        try:
                            await callback(data)
                        except Exception as e:
                            print(f"Error in subscriber callback: {e}")
            
            # Yield to other tasks
            await asyncio.sleep(0.01)
    
    async def publish(self, event_type, data):
        """Publish an event to the bus"""
        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.now().isoformat()
        
        # Add event type
        data["event_type"] = event_type
        
        # Publish to Redis
        await self.redis.publish(event_type, json.dumps(data))
        
        # Store event in history
        await self._store_event_history(event_type, data)
        
        return True
    
    async def _store_event_history(self, event_type, data):
        """Store event in history"""
        # Store in Redis list with expiration
        event_key = f"event_history:{event_type}"
        await self.redis.lpush(event_key, json.dumps(data))
        await self.redis.ltrim(event_key, 0, 999)  # Keep last 1000 events
        await self.redis.expire(event_key, 7 * 24 * 60 * 60)  # 7 days TTL
    
    async def subscribe(self, event_type, callback):
        """Subscribe to an event type"""
        # Add to subscribers dict
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
            # Subscribe to Redis channel
            await self.pubsub.subscribe(event_type)
        
        self.subscribers[event_type].append(callback)
        
        # Return unsubscribe function
        async def unsubscribe():
            if event_type in self.subscribers and callback in self.subscribers[event_type]:
                self.subscribers[event_type].remove(callback)
                
                # If no more subscribers, unsubscribe from channel
                if not self.subscribers[event_type]:
                    await self.pubsub.unsubscribe(event_type)
                    del self.subscribers[event_type]
            
        return unsubscribe
    
    async def get_event_history(self, event_type, limit=100):
        """Get event history for a specific type"""
        event_key = f"event_history:{event_type}"
        events = await self.redis.lrange(event_key, 0, limit - 1)
        
        return [json.loads(event.decode('utf-8')) for event in events]
    
    async def close(self):
        """Close the event bus"""
        self.running = False
        await self.pubsub.close()
```

## Integration with Python SDK

The agent orchestration layer integrates with a Python SDK for programmatic access:

```python
class DocumentationAgentSDK:
    """
    Python SDK for interacting with the Documentation Agent system.
    """
    
    def __init__(self, config=None):
        """Initialize the SDK with optional configuration"""
        self.config = config or self._load_default_config()
        self.coordinator = None
        self.event_bus = None
        self.kg = None
    
    def _load_default_config(self):
        """Load default configuration"""
        import os
        import json
        
        config_path = os.environ.get(
            "DOCAGENT_CONFIG_PATH", 
            os.path.expanduser("~/.config/docagent/config.json")
        )
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        
        return {
            "redis": {
                "host": "localhost",
                "port": 6379,
                "db": 0
            },
            "knowledge_graph": {
                "type": "neo4j",
                "uri": "bolt://localhost:7687",
                "user": "neo4j",
                "password": "password"
            }
        }
    
    async def connect(self):
        """Connect to the agent system"""
        import aioredis
        
        # Connect to Redis
        redis = await aioredis.from_url(
            f"redis://{self.config['redis']['host']}:{self.config['redis']['port']}/{self.config['redis']['db']}"
        )
        
        # Initialize event bus
        self.event_bus = EventBus(redis)
        
        # Initialize knowledge graph
        if self.config['knowledge_graph']['type'] == 'neo4j':
            from neo4j import AsyncGraphDatabase
            
            # Create Neo4j driver
            driver = AsyncGraphDatabase.driver(
                self.config['knowledge_graph']['uri'],
                auth=(
                    self.config['knowledge_graph']['user'],
                    self.config['knowledge_graph']['password']
                )
            )
            
            # Initialize knowledge graph
            self.kg = KnowledgeGraph(driver)
        
        # Initialize coordinator
        self.coordinator = AgentOrchestrationCoordinator(self.config, self.event_bus, self.kg)
        
        return self
    
    async def process_document(self, file_path, options=None):
        """Process a single document"""
        if not self.coordinator:
            raise RuntimeError("SDK not connected. Call connect() first.")
        
        return await self.coordinator.documentation_hub.process_document_workflow(file_path, options)
    
    async def process_directory(self, directory_path, options=None):
        """Process all documents in a directory"""
        if not self.coordinator:
            raise RuntimeError("SDK not connected. Call connect() first.")
        
        return await self.coordinator.process_directory(directory_path, options)
    
    async def validate_document(self, document_id, validation_types=None):
        """Validate an existing document"""
        if not self.coordinator:
            raise RuntimeError("SDK not connected. Call connect() first.")
        
        return await self.coordinator.documentation_hub.process_request({
            "type": "validation",
            "document_id": document_id,
            "validation_types": validation_types
        })
    
    async def generate_knowledge_report(self):
        """Generate a report on the knowledge graph"""
        if not self.coordinator:
            raise RuntimeError("SDK not connected. Call connect() first.")
        
        return await self.coordinator.generate_knowledge_graph_report()
    
    async def search_documents(self, query, options=None):
        """Search for documents"""
        if not self.kg:
            raise RuntimeError("SDK not connected. Call connect() first.")
        
        return await self.kg.search_documents(query, options)
    
    async def get_document_connections(self, document_id):
        """Get connections for a document"""
        if not self.kg:
            raise RuntimeError("SDK not connected. Call connect() first.")
        
        return await self.kg.get_document_connections(document_id)
    
    async def close(self):
        """Close connections"""
        if self.event_bus:
            await self.event_bus.close()
        
        if self.kg:
            await self.kg.close()
```

## API Integration

The system exposes a RESTful API for integration:

```javascript
// server/documentation_agent_api.js
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up file upload handling
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Create a map to track processing jobs
const processingJobs = new Map();

// Initialize Python SDK wrapper
function callPythonSDK(command, args) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../sdk/cli.py'),
      command,
      ...args
    ]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ output: stdout });
        }
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });
  });
}

// API Routes

// Upload and process a document
router.post('/documents', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    // Create job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Store job info
    processingJobs.set(jobId, {
      status: 'processing',
      filePath,
      startedAt: new Date().toISOString()
    });
    
    // Return job ID immediately
    res.status(202).json({
      jobId,
      status: 'processing',
      message: 'Document processing started'
    });
    
    // Process document asynchronously
    callPythonSDK('process-document', [filePath, JSON.stringify(options)])
      .then(result => {
        processingJobs.set(jobId, {
          status: 'completed',
          filePath,
          startedAt: processingJobs.get(jobId).startedAt,
          completedAt: new Date().toISOString(),
          result
        });
      })
      .catch(error => {
        processingJobs.set(jobId, {
          status: 'failed',
          filePath,
          startedAt: processingJobs.get(jobId).startedAt,
          failedAt: new Date().toISOString(),
          error: error.message
        });
        console.error('Error processing document:', error);
      });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get processing job status
router.get('/jobs/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  
  if (!processingJobs.has(jobId)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const job = processingJobs.get(jobId);
  res.json(job);
});

// Validate document
router.post('/documents/:documentId/validate', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const validationTypes = req.body.validationTypes;
    
    const result = await callPythonSDK(
      'validate-document', 
      [documentId, JSON.stringify(validationTypes)]
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error validating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document connections
router.get('/documents/:documentId/connections', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    
    const result = await callPythonSDK('get-connections', [documentId]);
    
    res.json(result);
  } catch (error) {
    console.error('Error getting document connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search documents
router.get('/documents/search', async (req, res) => {
  try {
    const query = req.query.q;
    const options = req.query.options ? JSON.parse(req.query.options) : {};
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const result = await callPythonSDK(
      'search-documents', 
      [query, JSON.stringify(options)]
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get knowledge graph report
router.get('/reports/knowledge-graph', async (req, res) => {
  try {
    const result = await callPythonSDK('generate-report', []);
    
    res.json(result);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## CLI Integration

A command-line interface for the agent orchestration system:

```python
#!/usr/bin/env python3
# sdk/cli.py

import asyncio
import argparse
import json
import sys
from documentation_agent_sdk import DocumentationAgentSDK

async def main():
    parser = argparse.ArgumentParser(description='Documentation Agent CLI')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Process document command
    process_parser = subparsers.add_parser('process-document', help='Process a document')
    process_parser.add_argument('file_path', help='Path to the document file')
    process_parser.add_argument('options', nargs='?', default='{}', help='Options JSON string')
    
    # Process directory command
    dir_parser = subparsers.add_parser('process-directory', help='Process a directory of documents')
    dir_parser.add_argument('directory_path', help='Path to the directory')
    dir_parser.add_argument('options', nargs='?', default='{}', help='Options JSON string')
    
    # Validate document command
    validate_parser = subparsers.add_parser('validate-document', help='Validate a document')
    validate_parser.add_argument('document_id', help='Document ID')
    validate_parser.add_argument('validation_types', nargs='?', default='null', help='Validation types JSON array')
    
    # Get connections command
    connections_parser = subparsers.add_parser('get-connections', help='Get document connections')
    connections_parser.add_argument('document_id', help='Document ID')
    
    # Search documents command
    search_parser = subparsers.add_parser('search-documents', help='Search documents')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('options', nargs='?', default='{}', help='Options JSON string')
    
    # Generate report command
    report_parser = subparsers.add_parser('generate-report', help='Generate knowledge graph report')
    
    args = parser.parse_args()
    
    # Initialize SDK
    sdk = DocumentationAgentSDK()
    await sdk.connect()
    
    try:
        if args.command == 'process-document':
            options = json.loads(args.options)
            result = await sdk.process_document(args.file_path, options)
            print(json.dumps(result))
            
        elif args.command == 'process-directory':
            options = json.loads(args.options)
            result = await sdk.process_directory(args.directory_path, options)
            print(json.dumps(result))
            
        elif args.command == 'validate-document':
            validation_types = json.loads(args.validation_types) if args.validation_types != 'null' else None
            result = await sdk.validate_document(args.document_id, validation_types)
            print(json.dumps(result))
            
        elif args.command == 'get-connections':
            result = await sdk.get_document_connections(args.document_id)
            print(json.dumps(result))
            
        elif args.command == 'search-documents':
            options = json.loads(args.options)
            result = await sdk.search_documents(args.query, options)
            print(json.dumps(result))
            
        elif args.command == 'generate-report':
            result = await sdk.generate_knowledge_report()
            print(json.dumps(result))
            
        else:
            print('Unknown command:', args.command, file=sys.stderr)
            sys.exit(1)
    finally:
        await sdk.close()

if __name__ == '__main__':
    asyncio.run(main())
```

## Implementation Approach

To implement the agent orchestration layer, follow these steps:

1. **Set Up Infrastructure**:
   - Install and configure Redis for event bus
   - Set up Neo4j for knowledge graph
   - Install PostgreSQL for metadata storage
   - Configure Pinecone for vector search

2. **Core Components**:
   - Implement EventBus for agent communication
   - Create KnowledgeGraph connector
   - Build DocumentationAgentHub orchestrator

3. **Domain Orchestrators**:
   - Implement IngestionOrchestrator
   - Implement AnalysisOrchestrator
   - Implement ValidationOrchestrator
   - Implement CreationOrchestrator

4. **Specialized Agents**:
   - Create format-specific processors
   - Build analysis and validation agents
   - Implement creation and tagging agents

5. **SDK and API Layer**:
   - Build Python SDK for programmatic access
   - Create REST API endpoints
   - Develop CLI interface

6. **Testing and Integration**:
   - Test with various document formats
   - Validate end-to-end workflows
   - Integrate with existing system components

## Conclusion

The Agent Orchestration Layer provides a comprehensive system for coordinating specialized documentation agents, enabling complex document processing workflows. By combining OpenAI's Manager Pattern with Google's A2A architecture, it achieves both hierarchical organization and standardized communication between agents.

This architecture enables a truly intelligent documentation management system where:

1. Document processing is handled by specialized agents
2. Complex workflows emerge from agent coordination
3. The system learns and improves over time
4. New capabilities can be added through new agents and tools

The standardized communication protocols, well-defined agent responsibilities, and flexible orchestration patterns make this system scalable, extensible, and capable of handling diverse documentation needs.