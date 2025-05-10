# Document Processing Pipeline

## Overview

This document outlines the document processing pipeline for the Agentic Documentation Management System. The pipeline is designed to handle multiple document formats (Markdown, PDF, HTML, Word, and more), extract structured information, and prepare documents for analysis, storage, and retrieval.

```
┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐    ┌────────────────────┐
│   Document       │    │   Format         │    │  Content          │    │  Semantic          │
│   Ingestion      │───▶│   Conversion     │───▶│  Extraction       │───▶│  Analysis          │
└──────────────────┘    └──────────────────┘    └───────────────────┘    └────────────────────┘
                                                                                    │
                                                                                    ▼
┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐    ┌────────────────────┐
│   Storage &      │◀───│   Relationship   │◀───│  Chunking &       │◀───│  Entity & Concept  │
│   Indexing       │    │   Mapping        │    │  Embedding        │    │  Extraction        │
└──────────────────┘    └──────────────────┘    └───────────────────┘    └────────────────────┘
```

## 1. Document Ingestion

The document ingestion stage handles the initial receipt of documents from various sources.

### Supported Input Methods:

1. **API Upload**
   - REST API endpoint for programmatic uploads
   - Multipart form uploads for binary documents
   - JSON payloads for text-based documents

2. **Filesystem Watcher**
   - Monitors designated directories for new files
   - Supports configurable patterns and recursive watching
   - Tracks file modifications for incremental updates

3. **URL Fetching**
   - Retrieves documents from web URLs
   - Handles authentication for protected resources
   - Supports scheduled fetching with configurable intervals

4. **Email Processing**
   - Dedicated email address for document submissions
   - Extracts documents from attachments
   - Processes email body as document content

### Format Detection and Validation:

```javascript
class DocumentIngestionService {
  async ingestDocument(source, options = {}) {
    let documentData;
    
    // Handle different source types
    if (source.type === 'file') {
      documentData = await this.processFile(source.path);
    } else if (source.type === 'url') {
      documentData = await this.processUrl(source.url);
    } else if (source.type === 'email') {
      documentData = await this.processEmail(source.emailData);
    } else if (source.type === 'text') {
      documentData = this.processText(source.content, source.metadata);
    }
    
    // Detect format if not specified
    if (!documentData.format) {
      documentData.format = this.detectFormat(documentData);
    }
    
    // Validate document
    const validationResult = await this.validateDocument(documentData);
    if (!validationResult.valid) {
      throw new Error(`Document validation failed: ${validationResult.errors.join(', ')}`);
    }
    
    return documentData;
  }
  
  detectFormat(documentData) {
    // Format detection logic based on content, extension, or MIME type
    const content = documentData.content;
    const mimeType = documentData.mimeType;
    const fileName = documentData.fileName;
    
    if (mimeType === 'application/pdf') {
      return 'pdf';
    } else if (mimeType === 'text/html' || content.trim().startsWith('<!DOCTYPE html>')) {
      return 'html';
    } else if (mimeType === 'text/markdown' || fileName?.endsWith('.md')) {
      return 'markdown';
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'docx';
    } else if (mimeType === 'text/plain') {
      return 'text';
    } else {
      // Additional format detection logic
      return 'unknown';
    }
  }
  
  async validateDocument(documentData) {
    // Basic validation
    if (!documentData.content && !documentData.binaryContent) {
      return { valid: false, errors: ['Document has no content'] };
    }
    
    // Format-specific validation
    const validator = this.getFormatValidator(documentData.format);
    if (validator) {
      return await validator.validate(documentData);
    }
    
    return { valid: true };
  }
}
```

## 2. Format Conversion

The format conversion stage normalizes documents into a consistent format for processing.

### Format Conversion Matrix:

| Source Format | Preferred Target | Alternative Target | Notes |
|---------------|------------------|-------------------|-------|
| PDF           | Markdown + Images | Plain Text       | Preserves layout where possible |
| HTML          | Markdown         | Plain Text        | Maintains essential formatting |
| DOCX          | Markdown         | Plain Text        | Converts styles to markdown |
| Plain Text    | Markdown         | (Same)            | Minimal processing needed |
| Markdown      | (Same)           | (Same)            | Native format |
| RST           | Markdown         | Plain Text        | Converts RST syntax |
| Jupyter Notebook | Markdown + Code | Markdown        | Preserves code cells |
| CSV/Excel     | Markdown Tables  | JSON              | Structural conversion |

### Document Converter Implementation:

```javascript
class DocumentConverter {
  constructor() {
    this.converters = {
      'pdf': new PdfConverter(),
      'html': new HtmlConverter(),
      'docx': new DocxConverter(),
      'rst': new RstConverter(),
      'ipynb': new JupyterConverter(),
      'csv': new CsvConverter(),
      'xlsx': new ExcelConverter()
    };
  }
  
  async convert(documentData, targetFormat = 'markdown') {
    const sourceFormat = documentData.format;
    
    // If already in target format, no conversion needed
    if (sourceFormat === targetFormat) {
      return documentData;
    }
    
    // Get appropriate converter
    const converter = this.converters[sourceFormat];
    if (!converter) {
      throw new Error(`No converter available for format: ${sourceFormat}`);
    }
    
    // Perform conversion
    const conversionResult = await converter.convertTo(
      documentData,
      targetFormat,
      documentData.conversionOptions || {}
    );
    
    // Update document data with converted content
    return {
      ...documentData,
      content: conversionResult.content,
      assets: conversionResult.assets || [],
      format: targetFormat,
      originalFormat: sourceFormat,
      conversionMetadata: conversionResult.metadata || {}
    };
  }
}
```

### Format-Specific Converters:

#### PDF Converter

```javascript
class PdfConverter {
  async convertTo(documentData, targetFormat, options) {
    if (targetFormat !== 'markdown' && targetFormat !== 'text') {
      throw new Error(`Unsupported target format for PDF conversion: ${targetFormat}`);
    }
    
    const pdfContent = documentData.binaryContent;
    const extractedText = await this.extractTextFromPdf(pdfContent);
    const extractedImages = options.extractImages ? await this.extractImagesFromPdf(pdfContent) : [];
    
    if (targetFormat === 'text') {
      return {
        content: extractedText,
        metadata: {
          pageCount: await this.getPageCount(pdfContent),
          hasImages: extractedImages.length > 0,
          textQuality: await this.assessTextQuality(extractedText)
        }
      };
    } else { // markdown
      const markdownContent = await this.convertTextToMarkdown(
        extractedText,
        extractedImages,
        options
      );
      
      return {
        content: markdownContent,
        assets: extractedImages.map(img => ({
          id: img.id,
          type: 'image',
          mimeType: img.mimeType,
          content: img.data,
          reference: img.reference
        })),
        metadata: {
          pageCount: await this.getPageCount(pdfContent),
          imageCount: extractedImages.length,
          textQuality: await this.assessTextQuality(extractedText)
        }
      };
    }
  }
  
  async extractTextFromPdf(pdfContent) {
    // Implementation using pdf.js or similar library
    // Returns text content with layout information where possible
  }
  
  async extractImagesFromPdf(pdfContent) {
    // Implementation to extract embedded images
    // Returns array of image objects with data and positioning info
  }
  
  async convertTextToMarkdown(extractedText, extractedImages, options) {
    // Converts extracted PDF text to markdown format
    // Includes image references where appropriate
    // Preserves headings, lists, and other structural elements
  }
}
```

#### HTML Converter

```javascript
class HtmlConverter {
  async convertTo(documentData, targetFormat, options) {
    if (targetFormat !== 'markdown' && targetFormat !== 'text') {
      throw new Error(`Unsupported target format for HTML conversion: ${targetFormat}`);
    }
    
    const htmlContent = documentData.content;
    
    // Extract and download images if referenced externally
    const processedHtml = await this.processExternalReferences(
      htmlContent,
      options.baseUrl,
      options.downloadExternalResources
    );
    
    // Parse HTML DOM
    const dom = this.parseHtml(processedHtml);
    
    // Extract metadata from HTML
    const metadata = this.extractMetadata(dom);
    
    if (targetFormat === 'text') {
      // Strip HTML tags and return plain text
      return {
        content: this.htmlToText(dom),
        metadata
      };
    } else { // markdown
      // Convert HTML to Markdown
      const { markdownContent, assets } = await this.htmlToMarkdown(dom, options);
      
      return {
        content: markdownContent,
        assets,
        metadata
      };
    }
  }
  
  async processExternalReferences(htmlContent, baseUrl, downloadExternal) {
    // Handle external references (images, CSS, etc.)
    // Download resources if downloadExternal is true
  }
  
  parseHtml(htmlContent) {
    // Parse HTML into DOM structure for processing
    // Uses libraries like JSDOM or cheerio
  }
  
  extractMetadata(dom) {
    // Extract metadata from HTML head, meta tags, etc.
    return {
      title: this.getTitle(dom),
      description: this.getMetaDescription(dom),
      author: this.getMetaAuthor(dom),
      keywords: this.getMetaKeywords(dom),
      language: this.getLanguage(dom)
    };
  }
  
  async htmlToMarkdown(dom, options) {
    // Convert HTML DOM to Markdown
    // Handle tables, lists, headings, links, images
    // Return markdown content and any extracted assets
  }
}
```

## 3. Content Extraction

The content extraction stage identifies and extracts key structural elements from the normalized documents.

### Structural Element Extraction:

1. **Document Structure**
   - Headers and hierarchical structure
   - Sections and subsections
   - Tables of contents
   - Navigation elements

2. **Content Blocks**
   - Paragraphs
   - Lists (bulleted, numbered)
   - Tables
   - Code blocks
   - Blockquotes
   - Admonitions (notes, warnings)

3. **Media Elements**
   - Images with captions
   - Diagrams
   - Videos
   - Audio references

4. **Reference Elements**
   - Citations
   - Footnotes
   - External links
   - Internal references

### Structure Extraction Service:

```javascript
class StructureExtractionService {
  async extractStructure(documentData) {
    const format = documentData.format;
    const content = documentData.content;
    
    // Get appropriate structure extractor for the format
    const extractor = this.getExtractor(format);
    if (!extractor) {
      throw new Error(`No structure extractor available for format: ${format}`);
    }
    
    // Extract document structure
    const structure = await extractor.extract(content);
    
    // Enhance document data with structural information
    return {
      ...documentData,
      structure,
      tableOfContents: this.generateTableOfContents(structure),
      extractedElements: this.flattenExtractedElements(structure)
    };
  }
  
  getExtractor(format) {
    // Return the appropriate extractor for the document format
    const extractors = {
      'markdown': new MarkdownStructureExtractor(),
      'html': new HtmlStructureExtractor(),
      'text': new TextStructureExtractor()
    };
    
    return extractors[format];
  }
  
  generateTableOfContents(structure) {
    // Generate table of contents from extracted headings
    return structure.headings.map(heading => ({
      id: heading.id,
      text: heading.text,
      level: heading.level,
      position: heading.position
    }));
  }
  
  flattenExtractedElements(structure) {
    // Flatten hierarchical structure into a list of elements with positions
    // Useful for search and reference
    return [
      ...structure.headings,
      ...structure.codeBlocks,
      ...structure.tables,
      ...structure.lists,
      ...structure.images,
      ...structure.blockquotes
    ].sort((a, b) => a.position - b.position);
  }
}
```

### Markdown Structure Extractor (Example Implementation):

```javascript
class MarkdownStructureExtractor {
  async extract(content) {
    // Parse markdown content
    const parsedContent = this.parseMarkdown(content);
    
    // Extract structural elements
    return {
      headings: this.extractHeadings(parsedContent),
      codeBlocks: this.extractCodeBlocks(parsedContent),
      tables: this.extractTables(parsedContent),
      lists: this.extractLists(parsedContent),
      images: this.extractImages(parsedContent),
      links: this.extractLinks(parsedContent),
      blockquotes: this.extractBlockquotes(parsedContent),
      paragraphs: this.extractParagraphs(parsedContent)
    };
  }
  
  parseMarkdown(content) {
    // Use a markdown parser like marked, remark, or unified
    // Return an AST (Abstract Syntax Tree) representation
  }
  
  extractHeadings(parsedContent) {
    // Extract headings from parsed content
    return parsedContent.filter(node => node.type === 'heading')
      .map(heading => ({
        id: this.generateHeadingId(heading.text),
        text: heading.text,
        level: heading.depth,
        position: heading.position.start.offset,
        lineNumber: heading.position.start.line
      }));
  }
  
  extractCodeBlocks(parsedContent) {
    // Extract code blocks with language info
    return parsedContent.filter(node => node.type === 'code')
      .map(codeBlock => ({
        id: `code-${codeBlock.position.start.line}`,
        language: codeBlock.lang || 'text',
        content: codeBlock.value,
        position: codeBlock.position.start.offset,
        lineNumber: codeBlock.position.start.line
      }));
  }
  
  // Additional extraction methods for tables, lists, images, etc.
}
```

## 4. Semantic Analysis

The semantic analysis stage uses LLMs and NLP techniques to understand the document's content, purpose, and context.

### LLM-Based Semantic Analysis:

1. **Document Classification**
   - Document type (tutorial, reference, API doc, etc.)
   - Technical level (beginner, intermediate, advanced)
   - Target audience

2. **Content Analysis**
   - Main topics and themes
   - Key arguments and points
   - Clarity and completeness assessment
   - Technical accuracy estimation

3. **Intent Analysis**
   - Document purpose (inform, instruct, explain, etc.)
   - Action items and requirements
   - Decision points

### Semantic Analysis Service:

```javascript
class SemanticAnalysisService {
  constructor(llmService) {
    this.llm = llmService;
  }
  
  async analyzeDocument(documentData) {
    // Prepare content for analysis (may need to truncate for API limits)
    const content = this.prepareContentForAnalysis(documentData);
    
    // Perform parallel analyses
    const [
      classification,
      contentAnalysis,
      intentAnalysis
    ] = await Promise.all([
      this.classifyDocument(content, documentData.structure),
      this.analyzeContent(content, documentData.structure),
      this.analyzeIntent(content, documentData.structure)
    ]);
    
    // Combine results
    return {
      ...documentData,
      semanticAnalysis: {
        classification,
        contentAnalysis,
        intentAnalysis,
        analyzedAt: new Date().toISOString()
      }
    };
  }
  
  prepareContentForAnalysis(documentData) {
    // Prepare content for LLM processing
    // This may involve truncation, summarization, or focusing on key sections
    const maxTokens = 4000; // Adjust based on model limits
    
    if (this.estimateTokenCount(documentData.content) <= maxTokens) {
      return documentData.content;
    }
    
    // For longer documents, extract key sections and summarize
    return this.extractRepresentativeContent(documentData, maxTokens);
  }
  
  async classifyDocument(content, structure) {
    // Use LLM to classify the document
    const classificationPrompt = `
    Analyze this document and classify it according to the following dimensions:
    
    1. Document Type (e.g., tutorial, reference manual, API documentation, conceptual guide, etc.)
    2. Technical Level (beginner, intermediate, advanced)
    3. Target Audience (e.g., developers, architects, managers, etc.)
    4. Domain (e.g., web development, data science, etc.)
    
    Document content:
    ${content.substring(0, 2000)}...
    
    ${structure?.tableOfContents ? `Table of contents: ${JSON.stringify(structure.tableOfContents)}` : ''}
    
    Respond with a JSON object containing these classifications.
    `;
    
    const response = await this.llm.complete(classificationPrompt);
    return this.parseJsonResponse(response);
  }
  
  async analyzeContent(content, structure) {
    // Analyze document content for topics, clarity, completeness
    const contentAnalysisPrompt = `
    Analyze this document's content and provide:
    
    1. Main topics and themes (list the top 5)
    2. Key points and arguments
    3. Clarity assessment (scale 1-10 with explanation)
    4. Completeness assessment (scale 1-10 with explanation)
    5. Technical accuracy estimation (scale 1-10 with reasoning)
    
    Document content:
    ${content.substring(0, 3000)}...
    
    Respond with a JSON object containing these analyses.
    `;
    
    const response = await this.llm.complete(contentAnalysisPrompt);
    return this.parseJsonResponse(response);
  }
  
  async analyzeIntent(content, structure) {
    // Analyze document intent and purpose
    const intentAnalysisPrompt = `
    Analyze this document's intent and purpose:
    
    1. Primary purpose (inform, instruct, explain, persuade, etc.)
    2. Action items or requirements mentioned
    3. Decision points presented
    4. Questions answered by this document
    
    Document content:
    ${content.substring(0, 2000)}...
    
    Respond with a JSON object containing these analyses.
    `;
    
    const response = await this.llm.complete(intentAnalysisPrompt);
    return this.parseJsonResponse(response);
  }
  
  parseJsonResponse(response) {
    try {
      return JSON.parse(response);
    } catch (e) {
      // Fallback parsing for when the LLM doesn't return valid JSON
      console.warn("LLM didn't return valid JSON, attempting to extract...");
      return this.extractJsonFromText(response);
    }
  }
}
```

## 5. Entity and Concept Extraction

This stage extracts named entities, key concepts, and terminology from the document.

### Extraction Components:

1. **Named Entity Recognition**
   - People and organizations
   - Technologies and products
   - Locations and dates
   - Domain-specific entities

2. **Concept Extraction**
   - Key technical concepts
   - Terminology definitions
   - Important algorithms or approaches
   - Design patterns or principles

3. **Relationship Identification**
   - Concept hierarchies
   - Dependencies between components
   - Sequential workflows or processes
   - Causal relationships

### Entity and Concept Service:

```javascript
class EntityConceptExtractor {
  constructor(llmService, knowledgeGraph) {
    this.llm = llmService;
    this.knowledgeGraph = knowledgeGraph;
  }
  
  async extractEntitiesAndConcepts(documentData) {
    // Extract content sections for processing
    const sections = this.extractProcessableSections(documentData);
    
    // Process each section to extract entities and concepts
    const results = await Promise.all(
      sections.map(section => this.processSection(section, documentData))
    );
    
    // Combine and deduplicate results
    const combinedResults = this.combineResults(results);
    
    // Enhance with knowledge graph information
    const enhancedResults = await this.enhanceWithKnowledgeGraph(combinedResults);
    
    // Add results to document data
    return {
      ...documentData,
      entities: enhancedResults.entities,
      concepts: enhancedResults.concepts,
      relationships: enhancedResults.relationships
    };
  }
  
  extractProcessableSections(documentData) {
    // Extract document sections for processing
    // May use structure information to divide the document
    const sections = [];
    
    if (documentData.structure?.headings) {
      // Use headings to define sections
      const headings = documentData.structure.headings;
      for (let i = 0; i < headings.length; i++) {
        const currentHeading = headings[i];
        const nextHeading = headings[i + 1];
        
        const sectionStart = currentHeading.position;
        const sectionEnd = nextHeading ? nextHeading.position : documentData.content.length;
        
        sections.push({
          title: currentHeading.text,
          content: documentData.content.substring(sectionStart, sectionEnd),
          position: currentHeading.position
        });
      }
    } else {
      // Divide document into chunks of approximately equal size
      const chunkSize = 2000;
      for (let i = 0; i < documentData.content.length; i += chunkSize) {
        sections.push({
          title: `Section ${i / chunkSize + 1}`,
          content: documentData.content.substring(i, i + chunkSize),
          position: i
        });
      }
    }
    
    return sections;
  }
  
  async processSection(section, documentData) {
    // Process a section to extract entities and concepts
    const prompt = `
    Analyze this document section and extract:
    
    1. Named Entities: People, organizations, technologies, products, locations, dates
    2. Technical Concepts: Key technical concepts, terminology, algorithms, design patterns
    3. Relationships: Dependencies, hierarchies, sequences, or causal relationships between concepts
    
    Document title: ${documentData.title || 'Untitled Document'}
    Section title: ${section.title}
    
    Section content:
    ${section.content}
    
    Format the response as JSON with these keys:
    - entities: array of named entities with type and mentions
    - concepts: array of technical concepts with descriptions
    - relationships: array of relationships between entities/concepts
    `;
    
    const response = await this.llm.complete(prompt);
    const parsed = this.parseJsonResponse(response);
    
    // Add section context to the results
    return {
      section: section.title,
      position: section.position,
      ...parsed
    };
  }
  
  combineResults(results) {
    // Combine results from multiple sections
    const entities = {};
    const concepts = {};
    const relationships = [];
    
    results.forEach(result => {
      // Process entities with deduplication
      result.entities?.forEach(entity => {
        const key = `${entity.name.toLowerCase()}_${entity.type}`;
        if (!entities[key]) {
          entities[key] = {
            ...entity,
            occurrences: [{
              section: result.section,
              position: result.position
            }]
          };
        } else {
          entities[key].occurrences.push({
            section: result.section,
            position: result.position
          });
          // Merge mentions if available
          if (entity.mentions && entities[key].mentions) {
            entities[key].mentions = [...entities[key].mentions, ...entity.mentions];
          }
        }
      });
      
      // Process concepts with deduplication
      result.concepts?.forEach(concept => {
        const key = concept.name.toLowerCase();
        if (!concepts[key]) {
          concepts[key] = {
            ...concept,
            occurrences: [{
              section: result.section,
              position: result.position
            }]
          };
        } else {
          concepts[key].occurrences.push({
            section: result.section,
            position: result.position
          });
          // Use the longer description
          if (concept.description && 
              (!concepts[key].description || 
               concept.description.length > concepts[key].description.length)) {
            concepts[key].description = concept.description;
          }
        }
      });
      
      // Add relationships
      if (result.relationships) {
        relationships.push(...result.relationships.map(rel => ({
          ...rel,
          section: result.section,
          position: result.position
        })));
      }
    });
    
    return {
      entities: Object.values(entities),
      concepts: Object.values(concepts),
      relationships
    };
  }
  
  async enhanceWithKnowledgeGraph(results) {
    // Enhance extracted information with knowledge graph data
    
    // Map entity and concept names to knowledge graph IDs
    const enhancedEntities = await Promise.all(results.entities.map(async entity => {
      const kgEntity = await this.knowledgeGraph.findEntity(entity.name, entity.type);
      
      return {
        ...entity,
        knowledgeGraph: kgEntity ? {
          id: kgEntity.id,
          confidence: this.calculateConfidence(entity.name, kgEntity.name),
          properties: kgEntity.properties
        } : null
      };
    }));
    
    const enhancedConcepts = await Promise.all(results.concepts.map(async concept => {
      const kgConcept = await this.knowledgeGraph.findConcept(concept.name);
      
      return {
        ...concept,
        knowledgeGraph: kgConcept ? {
          id: kgConcept.id,
          confidence: this.calculateConfidence(concept.name, kgConcept.name),
          properties: kgConcept.properties
        } : null
      };
    }));
    
    // Enhance relationships with knowledge graph information
    const enhancedRelationships = await Promise.all(results.relationships.map(async rel => {
      const kgRelationship = await this.knowledgeGraph.findRelationship(
        rel.source, rel.target, rel.type
      );
      
      return {
        ...rel,
        knowledgeGraph: kgRelationship ? {
          id: kgRelationship.id,
          confidence: 0.8, // Could be more sophisticated
          properties: kgRelationship.properties
        } : null
      };
    }));
    
    return {
      entities: enhancedEntities,
      concepts: enhancedConcepts,
      relationships: enhancedRelationships
    };
  }
  
  calculateConfidence(extracted, knowledgeGraph) {
    // Calculate confidence score for a match between extracted item and KG item
    if (extracted.toLowerCase() === knowledgeGraph.toLowerCase()) {
      return 1.0;
    }
    
    // Implement fuzzy matching for similarity score
    return 0.7; // Simplified for the example
  }
}
```

## 6. Chunking and Embedding

This stage divides documents into semantic chunks and generates vector embeddings for each chunk.

### Chunking Strategies:

1. **Fixed-Size Chunking**
   - Chunk by character or token count
   - Overlap between chunks to preserve context
   - Simple but may break semantic units

2. **Semantic Chunking**
   - Chunk by semantic boundaries (paragraphs, sections)
   - Preserve logical structure and meaning
   - Variable chunk sizes

3. **Hybrid Approaches**
   - Start with semantic boundaries
   - Split large semantic sections further
   - Merge small sections together

### Embedding Generation:

1. **Models**
   - OpenAI text-embedding-ada-002
   - OpenAI text-embedding-3-small/large
   - Custom domain-adapted embeddings

2. **Embedding Configuration**
   - Dimension: 1536 (OpenAI embeddings)
   - Context window: Model-dependent
   - Normalization: L2 normalization

### Implementation:

```javascript
class DocumentChunker {
  constructor(embeddingService) {
    this.embeddingService = embeddingService;
  }
  
  async chunkAndEmbed(documentData) {
    // Extract chunks from the document
    const chunks = this.createChunks(documentData);
    
    // Generate embeddings for each chunk
    const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
    
    // Update document data
    return {
      ...documentData,
      chunks: chunksWithEmbeddings
    };
  }
  
  createChunks(documentData) {
    // Choose chunking strategy based on document type and size
    if (documentData.structure?.headings && documentData.structure.headings.length > 0) {
      return this.createSemanticChunks(documentData);
    } else {
      return this.createFixedSizeChunks(documentData);
    }
  }
  
  createSemanticChunks(documentData) {
    const chunks = [];
    const content = documentData.content;
    const headings = documentData.structure.headings;
    
    // Create chunks based on headings and their hierarchy
    for (let i = 0; i < headings.length; i++) {
      const currentHeading = headings[i];
      let nextHeadingPos;
      
      // Find next heading at same or higher level
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].level <= currentHeading.level) {
          nextHeadingPos = headings[j].position;
          break;
        }
      }
      
      // If no next heading found, go to end of document
      if (!nextHeadingPos) {
        nextHeadingPos = content.length;
      }
      
      // Extract chunk content
      const chunkContent = content.substring(currentHeading.position, nextHeadingPos);
      
      // Check if chunk is too large
      if (this.estimateTokenCount(chunkContent) > 1000) {
        // Split large chunks further
        const subChunks = this.splitLargeChunk(chunkContent, currentHeading);
        chunks.push(...subChunks);
      } else {
        chunks.push({
          id: `chunk-${chunks.length + 1}`,
          title: currentHeading.text,
          content: chunkContent,
          metadata: {
            headingId: currentHeading.id,
            headingLevel: currentHeading.level,
            position: currentHeading.position,
            documentId: documentData.id,
            documentTitle: documentData.title
          }
        });
      }
    }
    
    return chunks;
  }
  
  createFixedSizeChunks(documentData) {
    const chunks = [];
    const content = documentData.content;
    const chunkSize = 1000; // Target ~1000 tokens per chunk
    const overlap = 200;    // 200 token overlap between chunks
    
    // Estimate characters per token (roughly 4 chars per token)
    const charsPerToken = 4;
    const targetChunkChars = chunkSize * charsPerToken;
    const overlapChars = overlap * charsPerToken;
    
    // Split into chunks with overlap
    for (let i = 0; i < content.length; i += targetChunkChars - overlapChars) {
      const chunkEnd = Math.min(i + targetChunkChars, content.length);
      const chunkContent = content.substring(i, chunkEnd);
      
      // Try to find better boundary near the target position
      const adjustedContent = this.adjustChunkBoundaries(chunkContent);
      
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        title: `${documentData.title || 'Document'} (part ${chunks.length + 1})`,
        content: adjustedContent,
        metadata: {
          position: i,
          documentId: documentData.id,
          documentTitle: documentData.title,
          isFixedSizeChunk: true
        }
      });
      
      // If we've reached the end of the document, break
      if (chunkEnd === content.length) break;
    }
    
    return chunks;
  }
  
  adjustChunkBoundaries(chunkContent) {
    // Find sentence or paragraph boundaries near the chunk ends
    // to create more natural chunks
    
    // Simple implementation - find last period followed by space or newline
    const lastPeriodMatch = chunkContent.match(/\.\s[A-Z]/g);
    if (lastPeriodMatch && lastPeriodMatch.length > 0) {
      const lastIndex = chunkContent.lastIndexOf(lastPeriodMatch[lastPeriodMatch.length - 1]);
      if (lastIndex > chunkContent.length * 0.7) { // At least 70% of the chunk
        return chunkContent.substring(0, lastIndex + 1);
      }
    }
    
    return chunkContent;
  }
  
  splitLargeChunk(chunkContent, heading) {
    // Split a large chunk into smaller sub-chunks
    const subChunks = [];
    const paragraphs = chunkContent.split('\n\n');
    
    let currentSubChunk = '';
    let subChunkIndex = 1;
    
    for (const paragraph of paragraphs) {
      const currentSize = this.estimateTokenCount(currentSubChunk);
      const paragraphSize = this.estimateTokenCount(paragraph);
      
      if (currentSize + paragraphSize > 800) { // Target size
        if (currentSubChunk.length > 0) {
          subChunks.push({
            id: `chunk-${heading.id}-${subChunkIndex}`,
            title: `${heading.text} (part ${subChunkIndex})`,
            content: currentSubChunk,
            metadata: {
              headingId: heading.id,
              headingLevel: heading.level,
              position: heading.position,
              subChunkIndex
            }
          });
          
          subChunkIndex++;
          currentSubChunk = paragraph;
        } else {
          // If a single paragraph is too large, we need to split it further
          const splitParagraphs = this.splitParagraph(paragraph);
          for (const split of splitParagraphs) {
            subChunks.push({
              id: `chunk-${heading.id}-${subChunkIndex}`,
              title: `${heading.text} (part ${subChunkIndex})`,
              content: split,
              metadata: {
                headingId: heading.id,
                headingLevel: heading.level,
                position: heading.position,
                subChunkIndex
              }
            });
            
            subChunkIndex++;
          }
        }
      } else {
        currentSubChunk += (currentSubChunk.length > 0 ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add the last sub-chunk if it has content
    if (currentSubChunk.length > 0) {
      subChunks.push({
        id: `chunk-${heading.id}-${subChunkIndex}`,
        title: `${heading.text} (part ${subChunkIndex})`,
        content: currentSubChunk,
        metadata: {
          headingId: heading.id,
          headingLevel: heading.level,
          position: heading.position,
          subChunkIndex
        }
      });
    }
    
    return subChunks;
  }
  
  estimateTokenCount(text) {
    // Rough estimation of token count (4 chars per token)
    return Math.ceil(text.length / 4);
  }
  
  async generateEmbeddings(chunks) {
    // Group chunks into batches for efficient embedding generation
    const batchSize = 20; // Depends on API limits
    const batches = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }
    
    // Process batches
    const chunksWithEmbeddings = [];
    
    for (const batch of batches) {
      const textsToEmbed = batch.map(chunk => chunk.content);
      const embeddings = await this.embeddingService.createEmbeddings(textsToEmbed);
      
      // Add embeddings to chunks
      for (let i = 0; i < batch.length; i++) {
        chunksWithEmbeddings.push({
          ...batch[i],
          embedding: embeddings[i],
          embeddingModel: this.embeddingService.modelName,
          embeddingDimension: embeddings[i].length
        });
      }
    }
    
    return chunksWithEmbeddings;
  }
}
```

## 7. Relationship Mapping

This stage establishes relationships between the document and other entities in the knowledge graph.

### Relationship Types:

1. **Document-Document Relationships**
   - References
   - Extensions/supplements
   - Contradictions
   - Updates/replacements

2. **Document-Feature Relationships**
   - Documents
   - Explains
   - Specifies requirements for
   - Provides test cases for

3. **Document-Roadmap Relationships**
   - Supports milestone
   - Details phase
   - Explains rationale for

### Relationship Mapper:

```javascript
class RelationshipMapper {
  constructor(knowledgeGraph, vectorStore, llmService) {
    this.knowledgeGraph = knowledgeGraph;
    this.vectorStore = vectorStore;
    this.llm = llmService;
  }
  
  async mapRelationships(documentData) {
    // Find related documents
    const relatedDocs = await this.findRelatedDocuments(documentData);
    
    // Find related features
    const relatedFeatures = await this.findRelatedFeatures(documentData);
    
    // Find related roadmap items
    const relatedRoadmapItems = await this.findRelatedRoadmapItems(documentData);
    
    // Map explicit references mentioned in the document
    const explicitReferences = await this.extractExplicitReferences(documentData);
    
    // Use LLM to characterize relationships
    const characterizedRelationships = await this.characterizeRelationships(
      documentData,
      relatedDocs,
      relatedFeatures,
      relatedRoadmapItems,
      explicitReferences
    );
    
    // Store relationships in knowledge graph
    await this.storeRelationships(documentData.id, characterizedRelationships);
    
    // Return updated document data
    return {
      ...documentData,
      relationships: characterizedRelationships
    };
  }
  
  async findRelatedDocuments(documentData) {
    // Use vector similarity to find related documents
    const documentEmbedding = documentData.chunks[0].embedding; // Use first chunk for document-level similarity
    
    const results = await this.vectorStore.findSimilar(
      documentEmbedding,
      {
        collection: 'documents',
        limit: 10,
        minScore: 0.7
      }
    );
    
    return results.map(result => ({
      id: result.id,
      title: result.metadata.title,
      similarity: result.score,
      type: 'document'
    }));
  }
  
  async findRelatedFeatures(documentData) {
    // Find features related to the document concepts
    const concepts = documentData.concepts?.map(c => c.name) || [];
    if (concepts.length === 0) return [];
    
    const relatedFeatures = await this.knowledgeGraph.findFeaturesByConcepts(concepts);
    
    return relatedFeatures.map(feature => ({
      id: feature.id,
      name: feature.name,
      relevance: feature.relevance,
      type: 'feature'
    }));
  }
  
  async findRelatedRoadmapItems(documentData) {
    // Find roadmap items related to the document
    const entities = documentData.entities?.map(e => e.name) || [];
    const concepts = documentData.concepts?.map(c => c.name) || [];
    
    const searchTerms = [...entities, ...concepts];
    if (searchTerms.length === 0) return [];
    
    const roadmapItems = await this.knowledgeGraph.findRoadmapItemsByTerms(searchTerms);
    
    return roadmapItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type, // milestone, phase, etc.
      relevance: item.relevance
    }));
  }
  
  async extractExplicitReferences(documentData) {
    // Extract explicit references mentioned in the document
    const content = documentData.content;
    
    // Find feature references (e.g., "Feature #123")
    const featureMatches = content.match(/Feature\s+#(\d+)/gi) || [];
    const featureReferences = await Promise.all(
      featureMatches.map(async match => {
        const id = match.match(/\d+/)[0];
        const feature = await this.knowledgeGraph.getFeature(id);
        return feature ? {
          id: feature.id,
          name: feature.name,
          type: 'feature',
          referenceType: 'explicit',
          mentionedAs: match
        } : null;
      })
    );
    
    // Find document references (e.g., "See documentation on XYZ")
    const documentReferences = [];
    const docReferencePatterns = [
      /see\s+(?:the\s+)?document(?:ation)?\s+(?:on\s+)?"([^"]+)"/gi,
      /refer\s+to\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Guide|Reference|Manual|Documentation))/g
    ];
    
    for (const pattern of docReferencePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const docTitle = match[1];
        const doc = await this.knowledgeGraph.findDocumentByTitle(docTitle);
        if (doc) {
          documentReferences.push({
            id: doc.id,
            title: doc.title,
            type: 'document',
            referenceType: 'explicit',
            mentionedAs: match[0]
          });
        }
      }
    }
    
    return [
      ...featureReferences.filter(ref => ref !== null),
      ...documentReferences
    ];
  }
  
  async characterizeRelationships(
    documentData,
    relatedDocs,
    relatedFeatures,
    relatedRoadmapItems,
    explicitReferences
  ) {
    // Combine all potential relationships
    const potentialRelationships = [
      ...relatedDocs.map(doc => ({ ...doc, category: 'document' })),
      ...relatedFeatures.map(feature => ({ ...feature, category: 'feature' })),
      ...relatedRoadmapItems.map(item => ({ ...item, category: 'roadmap' })),
      ...explicitReferences.map(ref => ({ ...ref, category: ref.type }))
    ];
    
    // Characterize each relationship
    const characterizedRelationships = [];
    
    for (const relationship of potentialRelationships) {
      const characterization = await this.characterizeRelationship(
        documentData,
        relationship
      );
      
      if (characterization.confidence >= 0.6) {
        characterizedRelationships.push({
          id: relationship.id,
          name: relationship.name || relationship.title,
          type: relationship.type,
          category: relationship.category,
          relationship: characterization.relationship,
          description: characterization.description,
          confidence: characterization.confidence,
          bidirectional: characterization.bidirectional
        });
      }
    }
    
    return characterizedRelationships;
  }
  
  async characterizeRelationship(documentData, relatedItem) {
    // Define relationship characterization based on item category
    if (relatedItem.category === 'document') {
      return this.characterizeDocumentRelationship(documentData, relatedItem);
    } else if (relatedItem.category === 'feature') {
      return this.characterizeFeatureRelationship(documentData, relatedItem);
    } else if (relatedItem.category === 'roadmap') {
      return this.characterizeRoadmapRelationship(documentData, relatedItem);
    }
    
    // Default characterization
    return {
      relationship: 'related_to',
      description: `Related to ${relatedItem.name || relatedItem.title}`,
      confidence: 0.6,
      bidirectional: true
    };
  }
  
  async characterizeDocumentRelationship(documentData, relatedDoc) {
    // Use LLM to characterize the relationship between two documents
    const prompt = `
    Analyze the relationship between these two documents:
    
    Document 1: "${documentData.title}"
    Summary: ${documentData.semanticAnalysis.contentAnalysis.summary || 'No summary available'}
    
    Document 2: "${relatedDoc.title}"
    
    What is the most likely relationship between these documents?
    Choose the single most appropriate relationship type:
    - references: Document 1 refers to Document 2
    - extends: Document 1 adds to or builds upon Document 2
    - updates: Document 1 provides newer information than Document 2
    - contradicts: Document 1 disagrees with Document 2
    - similar_to: Document 1 covers similar topics to Document 2
    
    For the chosen relationship, provide:
    1. A confidence score (0.0 to 1.0)
    2. A short description of the relationship
    3. Whether the relationship is bidirectional (true/false)
    
    Format your response as JSON:
    {
      "relationship": "relationship_type",
      "confidence": 0.0 to 1.0,
      "description": "description of relationship",
      "bidirectional": true/false
    }
    `;
    
    const response = await this.llm.complete(prompt);
    return this.parseJsonResponse(response);
  }
  
  async characterizeFeatureRelationship(documentData, relatedFeature) {
    // Similar implementation for feature relationships
    const prompt = `
    Analyze the relationship between this document and feature:
    
    Document: "${documentData.title}"
    Summary: ${documentData.semanticAnalysis.contentAnalysis.summary || 'No summary available'}
    
    Feature: "${relatedFeature.name}"
    
    What is the most likely relationship between this document and feature?
    Choose the single most appropriate relationship type:
    - documents: Document provides documentation for Feature
    - explains: Document explains concepts related to Feature
    - specifies_requirements: Document details requirements for Feature
    - test_cases: Document provides test cases for Feature
    - implements: Document describes implementation of Feature
    
    For the chosen relationship, provide:
    1. A confidence score (0.0 to 1.0)
    2. A short description of the relationship
    3. Whether the relationship is bidirectional (true/false)
    
    Format your response as JSON.
    `;
    
    const response = await this.llm.complete(prompt);
    return this.parseJsonResponse(response);
  }
  
  async storeRelationships(documentId, relationships) {
    // Store relationships in the knowledge graph
    for (const rel of relationships) {
      if (rel.category === 'document') {
        await this.knowledgeGraph.createRelationship(
          'document', documentId,
          'document', rel.id,
          rel.relationship, {
            description: rel.description,
            confidence: rel.confidence,
            created_at: new Date().toISOString()
          }
        );
        
        // If bidirectional, create the inverse relationship
        if (rel.bidirectional) {
          const inverseRelationship = this.getInverseRelationship(rel.relationship);
          await this.knowledgeGraph.createRelationship(
            'document', rel.id,
            'document', documentId,
            inverseRelationship, {
              description: `Inverse of: ${rel.description}`,
              confidence: rel.confidence,
              created_at: new Date().toISOString()
            }
          );
        }
      } else if (rel.category === 'feature') {
        await this.knowledgeGraph.createRelationship(
          'document', documentId,
          'feature', rel.id,
          rel.relationship, {
            description: rel.description,
            confidence: rel.confidence,
            created_at: new Date().toISOString()
          }
        );
        
        // Create inverse relationship if bidirectional
        if (rel.bidirectional) {
          const inverseRelationship = this.getInverseRelationship(rel.relationship);
          await this.knowledgeGraph.createRelationship(
            'feature', rel.id,
            'document', documentId,
            inverseRelationship, {
              description: `Inverse of: ${rel.description}`,
              confidence: rel.confidence,
              created_at: new Date().toISOString()
            }
          );
        }
      } else if (rel.category === 'roadmap') {
        await this.knowledgeGraph.createRelationship(
          'document', documentId,
          'roadmap_item', rel.id,
          rel.relationship, {
            description: rel.description,
            confidence: rel.confidence,
            created_at: new Date().toISOString()
          }
        );
        
        // Create inverse relationship if bidirectional
        if (rel.bidirectional) {
          const inverseRelationship = this.getInverseRelationship(rel.relationship);
          await this.knowledgeGraph.createRelationship(
            'roadmap_item', rel.id,
            'document', documentId,
            inverseRelationship, {
              description: `Inverse of: ${rel.description}`,
              confidence: rel.confidence,
              created_at: new Date().toISOString()
            }
          );
        }
      }
    }
  }
  
  getInverseRelationship(relationship) {
    // Define inverse relationships
    const inverseMap = {
      'references': 'referenced_by',
      'extends': 'extended_by',
      'updates': 'updated_by',
      'contradicts': 'contradicted_by',
      'similar_to': 'similar_to',
      'documents': 'documented_by',
      'explains': 'explained_by',
      'specifies_requirements': 'requirements_specified_by',
      'test_cases': 'tested_by',
      'implements': 'implemented_by'
    };
    
    return inverseMap[relationship] || 'related_to';
  }
}
```

## 8. Storage and Indexing

The final stage stores processed documents and their metadata in the appropriate databases.

### Storage Components:

1. **PostgreSQL Document Metadata Store**
   - Document metadata (title, description, author, etc.)
   - Access control information
   - Processing state and history

2. **MongoDB Document Content Store**
   - Full document content
   - Structured content elements
   - Processing results and analysis

3. **Neo4j Knowledge Graph**
   - Document-to-entity relationships
   - Concept hierarchy
   - Relationship metadata

4. **Pinecone Vector Database**
   - Chunk embeddings for semantic search
   - Metadata for filtering

### Storage Service:

```javascript
class StorageService {
  constructor(pgRepository, mongoRepository, neoRepository, vectorRepository) {
    this.pgRepository = pgRepository;
    this.mongoRepository = mongoRepository;
    this.neoRepository = neoRepository;
    this.vectorRepository = vectorRepository;
  }
  
  async storeProcessedDocument(documentData) {
    try {
      // Begin transaction in PostgreSQL
      await this.pgRepository.beginTransaction();
      
      // 1. Store document metadata in PostgreSQL
      const documentId = await this.storeMetadata(documentData);
      
      // 2. Store document content in MongoDB
      await this.storeContent(documentId, documentData);
      
      // 3. Store relationships in Neo4j
      await this.storeGraphRelationships(documentId, documentData);
      
      // 4. Store vector embeddings in Pinecone
      await this.storeVectorEmbeddings(documentId, documentData);
      
      // Commit PostgreSQL transaction
      await this.pgRepository.commitTransaction();
      
      return {
        success: true,
        documentId,
        status: 'stored'
      };
    } catch (error) {
      // Rollback PostgreSQL transaction if anything fails
      await this.pgRepository.rollbackTransaction();
      
      throw error;
    }
  }
  
  async storeMetadata(documentData) {
    // Extract metadata for storage
    const metadata = {
      title: documentData.title,
      description: documentData.description || '',
      format: documentData.format,
      status: 'active',
      version: documentData.version || '1.0',
      created_by: documentData.userId || 'system',
      quality_score: documentData.semanticAnalysis?.contentAnalysis?.clarity || 0.0,
      word_count: this.countWords(documentData.content),
      reading_time: this.estimateReadingTime(documentData.content)
    };
    
    // Store metadata in PostgreSQL
    const documentId = await this.pgRepository.insertDocumentMetadata(metadata);
    
    // Store document tags
    if (documentData.concepts && documentData.concepts.length > 0) {
      const tags = documentData.concepts
        .filter(concept => concept.important)
        .map(concept => ({
          name: concept.name,
          type: 'concept'
        }));
      
      await this.pgRepository.insertDocumentTags(documentId, tags);
    }
    
    return documentId;
  }
  
  async storeContent(documentId, documentData) {
    // Store full content
    await this.mongoRepository.insertDocumentContent({
      document_id: documentId,
      title: documentData.title,
      content: documentData.content,
      format: documentData.format,
      version: documentData.version || '1.0',
      created_at: new Date(),
      checksum: this.generateChecksum(documentData.content)
    });
    
    // Store document chunks
    if (documentData.chunks && documentData.chunks.length > 0) {
      await this.mongoRepository.insertDocumentChunks(
        documentId,
        documentData.chunks.map(chunk => ({
          ...chunk,
          document_id: documentId
        }))
      );
    }
    
    // Store document analysis
    if (documentData.semanticAnalysis) {
      await this.mongoRepository.insertDocumentAnalysis(
        documentId,
        {
          type: 'semantic_analysis',
          results: documentData.semanticAnalysis,
          created_at: new Date()
        }
      );
    }
    
    // Store entities and concepts
    if (documentData.entities || documentData.concepts) {
      await this.mongoRepository.insertDocumentEntitiesConcepts(
        documentId,
        {
          entities: documentData.entities || [],
          concepts: documentData.concepts || [],
          created_at: new Date()
        }
      );
    }
  }
  
  async storeGraphRelationships(documentId, documentData) {
    // Create document node in knowledge graph
    await this.neoRepository.createDocumentNode(
      documentId,
      {
        title: documentData.title,
        description: documentData.description || '',
        format: documentData.format,
        created_at: new Date().toISOString()
      }
    );
    
    // Create relationships to concepts
    if (documentData.concepts) {
      for (const concept of documentData.concepts) {
        // Create concept node if it doesn't exist
        const conceptId = await this.neoRepository.getOrCreateConceptNode(
          concept.name,
          {
            name: concept.name,
            description: concept.description || '',
            created_at: new Date().toISOString()
          }
        );
        
        // Create relationship
        await this.neoRepository.createRelationship(
          'document', documentId,
          'concept', conceptId,
          'CONTAINS_CONCEPT', {
            confidence: concept.knowledgeGraph?.confidence || 0.8,
            created_at: new Date().toISOString()
          }
        );
      }
    }
    
    // Create relationships to entities
    if (documentData.entities) {
      for (const entity of documentData.entities) {
        // Create entity node if it doesn't exist
        const entityId = await this.neoRepository.getOrCreateEntityNode(
          entity.name,
          entity.type,
          {
            name: entity.name,
            type: entity.type,
            created_at: new Date().toISOString()
          }
        );
        
        // Create relationship
        await this.neoRepository.createRelationship(
          'document', documentId,
          'entity', entityId,
          'MENTIONS_ENTITY', {
            confidence: entity.knowledgeGraph?.confidence || 0.8,
            created_at: new Date().toISOString()
          }
        );
      }
    }
    
    // Create document-to-document relationships
    if (documentData.relationships) {
      for (const rel of documentData.relationships) {
        if (rel.category === 'document') {
          await this.neoRepository.createRelationship(
            'document', documentId,
            'document', rel.id,
            rel.relationship.toUpperCase(), {
              description: rel.description,
              confidence: rel.confidence,
              created_at: new Date().toISOString()
            }
          );
        } else if (rel.category === 'feature') {
          await this.neoRepository.createRelationship(
            'document', documentId,
            'feature', rel.id,
            rel.relationship.toUpperCase(), {
              description: rel.description,
              confidence: rel.confidence,
              created_at: new Date().toISOString()
            }
          );
        } else if (rel.category === 'roadmap') {
          await this.neoRepository.createRelationship(
            'document', documentId,
            'roadmap_item', rel.id,
            rel.relationship.toUpperCase(), {
              description: rel.description,
              confidence: rel.confidence,
              created_at: new Date().toISOString()
            }
          );
        }
      }
    }
  }
  
  async storeVectorEmbeddings(documentId, documentData) {
    // Store chunk embeddings
    if (documentData.chunks && documentData.chunks.length > 0) {
      const vectors = documentData.chunks.map(chunk => ({
        id: `${documentId}-${chunk.id}`,
        values: chunk.embedding,
        metadata: {
          document_id: documentId,
          chunk_id: chunk.id,
          title: documentData.title,
          chunk_title: chunk.title,
          content_preview: chunk.content.substring(0, 100) + '...',
          format: documentData.format,
          created_at: new Date().toISOString()
        }
      }));
      
      await this.vectorRepository.upsertVectors(
        'documents',
        vectors
      );
    }
  }
  
  countWords(text) {
    return text.split(/\s+/).length;
  }
  
  estimateReadingTime(text) {
    // Average reading speed: 200 words per minute
    const words = this.countWords(text);
    return words / 200;
  }
  
  generateChecksum(content) {
    // Generate SHA-256 checksum of content
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

## Pipeline Orchestration

The document processing pipeline is orchestrated by a controller that manages the flow between stages:

```javascript
class DocumentPipelineController {
  constructor(services, eventBus) {
    this.services = services;
    this.eventBus = eventBus;
    
    // Register pipeline stages
    this.stages = [
      { name: 'ingestion', service: services.ingestionService },
      { name: 'conversion', service: services.converterService },
      { name: 'extraction', service: services.extractionService },
      { name: 'semanticAnalysis', service: services.semanticAnalysisService },
      { name: 'entityConcept', service: services.entityConceptService },
      { name: 'chunking', service: services.chunkingService },
      { name: 'relationships', service: services.relationshipService },
      { name: 'storage', service: services.storageService }
    ];
  }
  
  async processDocument(source, options = {}) {
    // Initialize document data
    let documentData = {
      source,
      processingId: this.generateProcessingId(),
      processingStarted: new Date().toISOString(),
      pipelineStatus: {},
      options
    };
    
    // Emit document processing started event
    this.eventBus.emit('document.processing.started', {
      processingId: documentData.processingId,
      source
    });
    
    // Run each pipeline stage
    try {
      for (const stage of this.stages) {
        console.log(`Starting stage: ${stage.name}`);
        
        // Record stage start time
        const stageStartTime = Date.now();
        
        // Process the current stage
        documentData = await stage.service.process(documentData, options);
        
        // Record stage completion
        const stageDuration = Date.now() - stageStartTime;
        documentData.pipelineStatus[stage.name] = {
          status: 'completed',
          duration: stageDuration,
          timestamp: new Date().toISOString()
        };
        
        // Emit stage completion event
        this.eventBus.emit(`document.processing.${stage.name}.completed`, {
          processingId: documentData.processingId,
          documentId: documentData.id,
          duration: stageDuration
        });
        
        console.log(`Completed stage: ${stage.name} in ${stageDuration}ms`);
      }
      
      // Record overall completion
      documentData.processingCompleted = new Date().toISOString();
      documentData.processingDuration = 
        new Date(documentData.processingCompleted) - 
        new Date(documentData.processingStarted);
      
      // Emit document processing completed event
      this.eventBus.emit('document.processing.completed', {
        processingId: documentData.processingId,
        documentId: documentData.id,
        duration: documentData.processingDuration
      });
      
      return {
        success: true,
        documentId: documentData.id,
        documentTitle: documentData.title,
        processingDuration: documentData.processingDuration
      };
      
    } catch (error) {
      console.error(`Error in pipeline stage: ${error.message}`);
      
      // Record failure
      documentData.pipelineStatus.error = {
        stage: error.stage || 'unknown',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Emit document processing failed event
      this.eventBus.emit('document.processing.failed', {
        processingId: documentData.processingId,
        error: {
          stage: error.stage || 'unknown',
          message: error.message
        }
      });
      
      throw error;
    }
  }
  
  generateProcessingId() {
    return `proc-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}
```

## Conclusion

The document processing pipeline is a sophisticated system with multiple stages designed to handle various document formats, extract meaningful information, and integrate documents into the knowledge graph. Key benefits of this design include:

1. **Multi-Format Support**: Seamless handling of various document formats with appropriate conversion
2. **Intelligent Analysis**: NLP and LLM-powered understanding of document content and purpose
3. **Knowledge Integration**: Automatic relationship mapping to entities, concepts, features, and roadmap items
4. **Vector Search Capabilities**: Semantic search through chunking and embedding
5. **Extensibility**: Pipeline architecture allows easy addition of new processing stages or formats

This processing pipeline serves as the foundation for the Agent-Based Documentation Management System, enabling the dynamic organization, analysis, and connection of documentation across the Devloop ecosystem.