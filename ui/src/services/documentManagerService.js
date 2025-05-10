/**
 * Document Manager Service
 * 
 * Provides functionality for discovering, indexing, categorizing
 * and managing documentation across the project.
 */

// Mock implementation for frontend development
// This would connect to an API backend in production

class DocumentManagerService {
  constructor() {
    this.documentRegistry = [];
    this.categories = new Set();
    this.components = new Set();
    this.initialized = false;
    
    // Paths to search for documentation
    this.indexPaths = [
      '/Key_Build_Docs',
      '/Planning',
      '/system-core/templates',
      '/system-core/docs',
      '/milestones'
    ];
  }
  
  /**
   * Initialize the document manager and discover docs
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.discoverDocuments();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize document manager:', error);
      throw error;
    }
  }
  
  /**
   * Discover all documentation files in the project
   */
  async discoverDocuments() {
    // In a real implementation, this would make an API call to scan directories
    // For now, we'll simulate with mock data
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Simulated documents from Key_Build_Docs
      const keyBuildDocs = [
        {
          id: 'doc-1001',
          title: 'Architecture Overview',
          path: '/Key_Build_Docs/ARCHITECTURE.md',
          description: 'High-level system architecture diagrams and component relationships',
          lastModified: '2025-03-15T10:30:00Z',
          categories: ['Architecture', 'Core Documentation'],
          components: ['Core System'],
          wordCount: 2450,
          tags: ['architecture', 'design']
        },
        {
          id: 'doc-1002',
          title: 'Design Principles',
          path: '/Key_Build_Docs/DESIGN_PRINCIPLES.md',
          description: 'Core principles guiding Devloop development',
          lastModified: '2025-03-10T14:20:00Z',
          categories: ['Design', 'Core Documentation'],
          components: ['Core System'],
          wordCount: 1850,
          tags: ['design', 'principles']
        },
        {
          id: 'doc-1003',
          title: 'Devloop Workflow',
          path: '/Key_Build_Docs/DEVLOOP_WORKFLOW.md',
          description: 'Complete workflow procedures for all Devloop operations',
          lastModified: '2025-04-05T09:15:00Z',
          categories: ['Workflow', 'Process', 'Core Documentation'],
          components: ['Core System'],
          wordCount: 3200,
          tags: ['workflow', 'process']
        },
        {
          id: 'doc-1004',
          title: 'AI Orchestration Guide',
          path: '/Key_Build_Docs/AI_ORCHESTRATION_GUIDE.md',
          description: 'Comprehensive guide to the AI Service Orchestration System',
          lastModified: '2025-04-10T16:45:00Z',
          categories: ['AI', 'Integration', 'Core Documentation'],
          components: ['AI Integration'],
          wordCount: 2800,
          tags: ['ai', 'integration']
        }
      ];
      
      // Simulated documents from Planning
      const planningDocs = [
        {
          id: 'doc-2001',
          title: 'UI Roadmap',
          path: '/Planning/ui-roadmap.md',
          description: 'Roadmap for UI development and enhancements',
          lastModified: '2025-04-18T11:30:00Z',
          categories: ['Planning', 'Roadmap'],
          components: ['UI Dashboard'],
          wordCount: 1650,
          tags: ['ui', 'roadmap', 'planning']
        },
        {
          id: 'doc-2002',
          title: 'Script Consolidation Implementation Plan',
          path: '/Planning/script-consolidation-implementation-plan.md',
          description: 'Plan for consolidating and standardizing scripts',
          lastModified: '2025-03-25T13:40:00Z',
          categories: ['Planning', 'Implementation'],
          components: ['Core System'],
          wordCount: 1200,
          tags: ['scripts', 'implementation']
        }
      ];
      
      // Simulated documents from Templates
      const templateDocs = [
        {
          id: 'doc-3001',
          title: 'Feature Packet Template',
          path: '/system-core/templates/feature/feature-packet-template.md',
          description: 'Template for creating feature packets',
          lastModified: '2025-02-12T10:25:00Z',
          categories: ['Template', 'Feature'],
          components: ['Core System'],
          wordCount: 850,
          tags: ['template', 'feature']
        },
        {
          id: 'doc-3002',
          title: 'Phase Bundle Template',
          path: '/system-core/templates/phase/phase-bundle-template.md',
          description: 'Template for phase bundles',
          lastModified: '2025-02-12T10:30:00Z',
          categories: ['Template', 'Phase'],
          components: ['Core System'],
          wordCount: 920,
          tags: ['template', 'phase']
        }
      ];
      
      // Simulated documents from Milestones
      const milestoneDocs = [
        {
          id: 'doc-4001',
          title: 'UI Dashboard Phase Status',
          path: '/milestones/milestone-ui-dashboard/phase-01/phase-status.md',
          description: 'Status report for UI Dashboard Phase 1',
          lastModified: '2025-04-20T14:15:00Z',
          categories: ['Status', 'Phase'],
          components: ['UI Dashboard'],
          wordCount: 750,
          tags: ['status', 'phase', 'ui']
        },
        {
          id: 'doc-4002',
          title: 'Core Foundation Module',
          path: '/milestones/milestone-core-foundation/phase-01/module-core/module-core.md',
          description: 'Core foundation module documentation',
          lastModified: '2025-03-05T16:20:00Z',
          categories: ['Module', 'Core'],
          components: ['Core System'],
          wordCount: 1350,
          tags: ['module', 'core']
        }
      ];
      
      // Combine all documents
      this.documentRegistry = [
        ...keyBuildDocs,
        ...planningDocs,
        ...templateDocs,
        ...milestoneDocs
      ];
      
      // Extract categories and components
      this.documentRegistry.forEach(doc => {
        doc.categories.forEach(cat => this.categories.add(cat));
        doc.components.forEach(comp => this.components.add(comp));
      });
      
      return {
        totalDocuments: this.documentRegistry.length,
        categories: Array.from(this.categories),
        components: Array.from(this.components)
      };
    } catch (error) {
      console.error('Error discovering documents:', error);
      throw error;
    }
  }
  
  /**
   * Get all documents
   */
  async getAllDocuments() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return {
      documents: this.documentRegistry,
      categories: Array.from(this.categories),
      components: Array.from(this.components),
      total: this.documentRegistry.length
    };
  }
  
  /**
   * Get a specific document by ID
   */
  async getDocument(id) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log("Getting document with ID:", id);
    
    const document = this.documentRegistry.find(doc => doc.id === id);
    
    if (!document) {
      console.error(`Document with ID ${id} not found`);
      throw new Error(`Document with ID ${id} not found`);
    }
    
    console.log("Found document:", document.title);
    
    // Make a copy to avoid modifying the registry directly
    const docCopy = {...document};
    
    // For the mock implementation, generate some content if it doesn't exist
    try {
      if (!docCopy.content) {
        console.log("Generating content for document:", docCopy.id);
        docCopy.content = await this.generateMockContent(docCopy);
        console.log("Generated content - Type:", typeof docCopy.content, "Length:", docCopy.content.length);
      } else {
        console.log("Document already has content - Type:", typeof docCopy.content, "Length:", docCopy.content.length);
      }
      
      // Ensure content is always a string
      if (typeof docCopy.content !== 'string') {
        console.log("Converting non-string content to string");
        docCopy.content = JSON.stringify(docCopy.content, null, 2);
      }
    } catch (err) {
      console.error("Error generating/processing document content:", err);
      docCopy.content = `# ${docCopy.title || 'Document'}\n\n${docCopy.description || 'No description available.'}\n\nThis document content could not be loaded.`;
    }
    
    // Ensure other required properties exist
    if (!docCopy.categories || !Array.isArray(docCopy.categories)) {
      docCopy.categories = ['Uncategorized'];
    }
    
    if (!docCopy.components || !Array.isArray(docCopy.components)) {
      docCopy.components = ['General'];
    }
    
    if (!docCopy.tags || !Array.isArray(docCopy.tags)) {
      docCopy.tags = [];
    }
    
    console.log("Returning document with content length:", docCopy.content.length);
    return docCopy;
  }
  
  /**
   * Search documents by query
   */
  async searchDocuments(query) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!query) {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase();
    
    return this.documentRegistry.filter(doc => {
      // Search in title
      if (doc.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Search in description
      if (doc.description && doc.description.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Search in path
      if (doc.path.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Search in categories
      if (doc.categories.some(cat => cat.toLowerCase().includes(normalizedQuery))) {
        return true;
      }
      
      // Search in tags
      if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))) {
        return true;
      }
      
      return false;
    });
  }
  
  /**
   * Filter documents by category
   */
  async filterByCategory(category) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (category === 'all') {
      return this.documentRegistry;
    }
    
    return this.documentRegistry.filter(doc => 
      doc.categories.includes(category)
    );
  }
  
  /**
   * Filter documents by component
   */
  async filterByComponent(component) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (component === 'all') {
      return this.documentRegistry;
    }
    
    return this.documentRegistry.filter(doc => 
      doc.components.includes(component)
    );
  }
  
  /**
   * Analyze document to suggest metadata
   */
  async analyzeDocumentContent(title, description, content) {
    console.log("Analyzing document content to suggest metadata");
    
    try {
      // In a real implementation, this would use a more sophisticated AI model
      // For now, we'll use enhanced pattern matching with context awareness
      
      const combinedText = `${title} ${description} ${content || ''}`.toLowerCase();
      
      // Deep content analysis for content type and purpose
      const contentType = this.determineContentType(combinedText);
      const contentPurpose = this.determineContentPurpose(combinedText);
      const technicalLevel = this.determineTechnicalLevel(combinedText);
      const relevantSystems = this.findRelevantSystems(combinedText);
      
      console.log("AI analysis results:", { contentType, contentPurpose, technicalLevel, relevantSystems });
      
      // Determine best path based on comprehensive analysis
      const suggestedPath = this.generateOptimalPath(contentType, contentPurpose, title);
      
      // Generate appropriate categories based on content analysis
      const suggestedCategories = this.generateCategories(contentType, contentPurpose, technicalLevel);
      
      // Determine most relevant components
      const suggestedComponents = this.generateComponents(relevantSystems, contentPurpose);
      
      // Generate relevant tags based on content analysis
      const suggestedTags = this.generateTags(combinedText, contentType, contentPurpose, relevantSystems);
      
      return {
        suggestedPath,
        suggestedCategories,
        suggestedComponents,
        suggestedTags
      };
    } catch (err) {
      console.error("Error analyzing document content:", err);
      return {
        suggestedPath: '/docs/untitled.md',
        suggestedCategories: ['Documentation'],
        suggestedComponents: ['General'],
        suggestedTags: []
      };
    }
  }

  /**
   * Determine the type of content
   */
  determineContentType(text) {
    // Analyze content to determine what type of document it is
    if (text.includes('architecture') || text.includes('structure') || text.includes('system design') || 
        text.includes('component relationship') || text.includes('high-level design')) {
      return 'architecture';
    } else if (text.includes('guide') || text.includes('how to') || text.includes('step') || 
               text.includes('instruction') || text.includes('tutorial')) {
      return 'guide';
    } else if (text.includes('api') || text.includes('interface') || text.includes('endpoint') || 
               text.includes('integration') || text.includes('protocol')) {
      return 'api';
    } else if (text.includes('workflow') || text.includes('process') || text.includes('procedure') || 
               text.includes('lifecycle') || text.includes('methodology')) {
      return 'workflow';
    } else if (text.includes('reference') || text.includes('definition') || text.includes('glossary') || 
               text.includes('list of') || text.includes('overview')) {
      return 'reference';
    } else if (text.includes('concepts') || text.includes('principles') || text.includes('philosophy') || 
               text.includes('approach') || text.includes('strategy')) {
      return 'concept';
    } else if (text.includes('template') || text.includes('boilerplate') || text.includes('example') || 
               text.includes('skeleton') || text.includes('starter')) {
      return 'template';
    } else {
      return 'general';
    }
  }

  /**
   * Determine the purpose of the content
   */
  determineContentPurpose(text) {
    if (text.includes('learn') || text.includes('understand') || text.includes('introduction') || 
        text.includes('getting started') || text.includes('basics')) {
      return 'learning';
    } else if (text.includes('implement') || text.includes('develop') || text.includes('create') || 
               text.includes('build') || text.includes('code')) {
      return 'implementation';
    } else if (text.includes('reference') || text.includes('lookup') || text.includes('find') || 
               text.includes('search') || text.includes('locate')) {
      return 'reference';
    } else if (text.includes('troubleshoot') || text.includes('debug') || text.includes('fix') || 
               text.includes('solve') || text.includes('issue')) {
      return 'troubleshooting';
    } else if (text.includes('best practice') || text.includes('recommendation') || 
               text.includes('guideline') || text.includes('standard')) {
      return 'best-practices';
    } else if (text.includes('plan') || text.includes('future') || text.includes('roadmap') || 
               text.includes('next') || text.includes('upcoming')) {
      return 'planning';
    } else {
      return 'general';
    }
  }

  /**
   * Determine technical level of the content
   */
  determineTechnicalLevel(text) {
    // Count technical terms
    const technicalTerms = [
      'algorithm', 'api', 'architecture', 'asynchronous', 'authentication', 'authorization',
      'backend', 'cache', 'class', 'component', 'configuration', 'container', 'database',
      'dependency', 'deployment', 'encryption', 'endpoint', 'framework', 'function',
      'implementation', 'inheritance', 'instance', 'interface', 'json', 'library',
      'middleware', 'module', 'object', 'parameter', 'pattern', 'protocol', 'query',
      'recursion', 'repository', 'request', 'response', 'runtime', 'schema', 'server',
      'service', 'session', 'socket', 'state', 'synchronous', 'token', 'transaction',
      'validation', 'variable', 'webhook', 'workflow', 'xml'
    ];
    
    let technicalTermCount = 0;
    technicalTerms.forEach(term => {
      const regex = new RegExp('\\b' + term + '\\b', 'gi');
      const matches = text.match(regex);
      if (matches) technicalTermCount += matches.length;
    });

    // Determine level based on term count
    if (technicalTermCount > 10) {
      return 'advanced';
    } else if (technicalTermCount > 5) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Find relevant systems mentioned in the content
   */
  findRelevantSystems(text) {
    const systems = [];
    
    // Core system components
    if (text.includes('core') || text.includes('system core') || 
        text.includes('foundation') || text.includes('base system')) {
      systems.push('Core System');
    }
    
    // UI Dashboard
    if (text.includes('ui') || text.includes('user interface') || 
        text.includes('dashboard') || text.includes('display') || 
        text.includes('frontend') || text.includes('visual')) {
      systems.push('UI Dashboard');
    }
    
    // Feature Management
    if (text.includes('feature') || text.includes('milestone') || 
        text.includes('phase') || text.includes('module') || 
        text.includes('task') || text.includes('story')) {
      systems.push('Feature Management');
    }
    
    // AI Integration
    if (text.includes('ai') || text.includes('artificial intelligence') || 
        text.includes('claude') || text.includes('ml') || 
        text.includes('machine learning') || text.includes('model')) {
      systems.push('AI Integration');
    }
    
    // Testing
    if (text.includes('test') || text.includes('validation') || 
        text.includes('verification') || text.includes('assert') || 
        text.includes('check') || text.includes('quality')) {
      systems.push('Testing');
    }
    
    // Project Tracking
    if (text.includes('tracking') || text.includes('progress') || 
        text.includes('status') || text.includes('metric') || 
        text.includes('report') || text.includes('dashboard')) {
      systems.push('Project Tracking');
    }
    
    // Documentation
    if (text.includes('document') || text.includes('doc') || 
        text.includes('guide') || text.includes('manual') || 
        text.includes('help') || text.includes('instruction')) {
      systems.push('Documentation');
    }
    
    if (systems.length === 0) {
      systems.push('General');
    }
    
    return systems;
  }

  /**
   * Generate optimal file path based on content analysis
   */
  generateOptimalPath(contentType, contentPurpose, title) {
    // Sanitize title for filename
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Remove consecutive hyphens
      .substring(0, 50);             // Limit length
    
    // Determine base directory based on content type
    let baseDir = '';
    if (contentType === 'architecture') {
      baseDir = '/Key_Build_Docs';
    } else if (contentType === 'workflow' || contentType === 'process') {
      baseDir = '/Key_Build_Docs';
    } else if (contentType === 'api' || contentType === 'interface') {
      baseDir = '/system-core/docs';
    } else if (contentType === 'guide' || contentType === 'tutorial') {
      baseDir = '/Key_Build_Docs/Claude_AI';
    } else if (contentType === 'template') {
      baseDir = '/system-core/templates';
    } else if (contentType === 'concept' && contentPurpose === 'planning') {
      baseDir = '/Planning';
    } else {
      baseDir = '/docs';
    }
    
    // Create filename with appropriate prefix based on content type
    let filename = '';
    if (contentType === 'architecture') {
      filename = 'ARCHITECTURE_' + sanitizedTitle + '.md';
    } else if (contentType === 'workflow') {
      filename = 'WORKFLOW_' + sanitizedTitle + '.md';
    } else if (contentType === 'api') {
      filename = 'API_' + sanitizedTitle + '.md';
    } else if (contentType === 'guide') {
      filename = sanitizedTitle + '-guide.md';
    } else if (contentType === 'reference') {
      filename = 'REFERENCE_' + sanitizedTitle + '.md';
    } else if (contentType === 'template') {
      filename = sanitizedTitle + '-template.md';
    } else if (contentType === 'concept') {
      filename = sanitizedTitle + '.md';
    } else {
      filename = sanitizedTitle + '.md';
    }
    
    // For uppercase conventions in Key_Build_Docs
    if (baseDir === '/Key_Build_Docs') {
      filename = filename.toUpperCase();
    }
    
    return `${baseDir}/${filename}`;
  }

  /**
   * Generate appropriate categories based on content analysis
   */
  generateCategories(contentType, contentPurpose, technicalLevel) {
    const categories = [];
    
    // Primary category based on content type
    if (contentType === 'architecture') categories.push('Architecture');
    else if (contentType === 'guide') categories.push('Guide');
    else if (contentType === 'api') categories.push('API');
    else if (contentType === 'workflow') categories.push('Workflow');
    else if (contentType === 'reference') categories.push('Reference');
    else if (contentType === 'concept') categories.push('Concept');
    else if (contentType === 'template') categories.push('Template');
    else categories.push('Documentation');
    
    // Secondary category based on purpose
    if (contentPurpose === 'learning') categories.push('Learning');
    else if (contentPurpose === 'implementation') categories.push('Implementation');
    else if (contentPurpose === 'reference') categories.push('Reference');
    else if (contentPurpose === 'troubleshooting') categories.push('Troubleshooting');
    else if (contentPurpose === 'best-practices') categories.push('Best Practices');
    else if (contentPurpose === 'planning') categories.push('Planning');
    
    // Add technical level if not beginner
    if (technicalLevel === 'advanced') categories.push('Advanced');
    else if (technicalLevel === 'intermediate') categories.push('Intermediate');
    
    // Add Core Documentation category for key documents
    if (contentType === 'architecture' || 
        (contentType === 'workflow' && contentPurpose === 'reference') ||
        (contentType === 'reference' && technicalLevel === 'advanced')) {
      categories.push('Core Documentation');
    }
    
    return categories;
  }

  /**
   * Generate appropriate components based on relevant systems
   */
  generateComponents(relevantSystems, contentPurpose) {
    // Start with the most relevant systems (first 2)
    const components = relevantSystems.slice(0, 2);
    
    // Add additional components based on purpose
    if (contentPurpose === 'implementation' && !components.includes('Core System')) {
      components.push('Core System');
    }
    
    if (contentPurpose === 'learning' && !components.includes('Documentation')) {
      components.push('Documentation');
    }
    
    if (contentPurpose === 'troubleshooting' && !components.includes('Testing')) {
      components.push('Testing');
    }
    
    if (contentPurpose === 'planning' && !components.includes('Project Tracking')) {
      components.push('Project Tracking');
    }
    
    return components;
  }

  /**
   * Generate relevant tags based on content
   */
  generateTags(text, contentType, contentPurpose, relevantSystems) {
    const tags = [];
    
    // Add tags based on content type and purpose
    tags.push(contentType);
    tags.push(contentPurpose);
    
    // Add system-related tags
    relevantSystems.forEach(system => {
      const systemTag = system.toLowerCase().replace(/\s+/g, '-');
      if (!tags.includes(systemTag)) {
        tags.push(systemTag);
      }
    });
    
    // Extract potential key terms
    const potentialTags = [
      'architecture', 'design', 'workflow', 'process', 'api', 
      'tutorial', 'guide', 'reference', 'system', 'core',
      'feature', 'ui', 'dashboard', 'testing', 'ai', 'integration',
      'development', 'production', 'deployment', 'setup', 'configuration',
      'security', 'performance', 'optimization', 'analysis', 'monitoring',
      'milestone', 'phase', 'module', 'component', 'roadmap'
    ];
    
    potentialTags.forEach(tag => {
      if (text.includes(tag) && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
    
    // Limit to a reasonable number of tags
    return tags.slice(0, 8);
  }
  
  /**
   * Create a new document in the file system
   */
  async createDocument(document) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log("Creating new document:", document);
    
    try {
      // Create a unique ID for the document
      const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Add creation timestamp
      const now = new Date().toISOString();
      
      // Create the full document object
      const newDocument = {
        ...document,
        id,
        lastModified: now,
        createdAt: now,
        wordCount: document.content ? document.content.split(/\s+/).length : 0
      };
      
      // In a real implementation, this would write to the filesystem
      // For now, just add to our registry
      this.documentRegistry.push(newDocument);
      
      // Add any new categories or components to our sets
      newDocument.categories.forEach(cat => this.categories.add(cat));
      newDocument.components.forEach(comp => this.components.add(comp));
      
      console.log("Document created successfully:", newDocument.id);
      return newDocument;
    } catch (err) {
      console.error("Error creating document:", err);
      throw err;
    }
  }
  
  /**
   * Update an existing document
   */
  async updateDocument(id, updates) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log("Updating document:", id, updates);
    
    try {
      // Find the document
      const documentIndex = this.documentRegistry.findIndex(doc => doc.id === id);
      
      if (documentIndex === -1) {
        throw new Error(`Document with ID ${id} not found`);
      }
      
      // Create an updated document copy
      const updatedDocument = {
        ...this.documentRegistry[documentIndex],
        ...updates,
        lastModified: new Date().toISOString()
      };
      
      // If content was updated, recalculate word count
      if (updates.content) {
        updatedDocument.wordCount = updates.content.split(/\s+/).length;
      }
      
      // Update the registry
      this.documentRegistry[documentIndex] = updatedDocument;
      
      // Add any new categories or components to our sets
      if (updates.categories) {
        updates.categories.forEach(cat => this.categories.add(cat));
      }
      
      if (updates.components) {
        updates.components.forEach(comp => this.components.add(comp));
      }
      
      console.log("Document updated successfully:", id);
      return updatedDocument;
    } catch (err) {
      console.error("Error updating document:", err);
      throw err;
    }
  }
  
  /**
   * Delete a document
   */
  async deleteDocument(id) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log("Deleting document:", id);
    
    try {
      // Find the document
      const documentIndex = this.documentRegistry.findIndex(doc => doc.id === id);
      
      if (documentIndex === -1) {
        throw new Error(`Document with ID ${id} not found`);
      }
      
      // Remove from registry
      this.documentRegistry.splice(documentIndex, 1);
      
      // In a real implementation, we would delete the file
      // For now, just return success
      console.log("Document deleted successfully:", id);
      return { success: true, id };
    } catch (err) {
      console.error("Error deleting document:", err);
      throw err;
    }
  }
  
  /**
   * Save document content to the file system
   */
  async saveToFileSystem(id, content) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log("Saving document to file system:", id);
    
    try {
      // Find the document
      const document = this.documentRegistry.find(doc => doc.id === id);
      
      if (!document) {
        throw new Error(`Document with ID ${id} not found`);
      }
      
      // Update the document content
      await this.updateDocument(id, { content });
      
      // In a real implementation, we would write to the filesystem
      // For now, just return success
      console.log("Document saved to file system:", document.path);
      return { success: true, path: document.path };
    } catch (err) {
      console.error("Error saving document to file system:", err);
      throw err;
    }
  }
  
  /**
   * Generate document statistics
   */
  async getDocumentStats() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Calculate stats
    const totalDocuments = this.documentRegistry.length;
    
    // Documents by category
    const categoryStats = {};
    this.categories.forEach(category => {
      categoryStats[category] = this.documentRegistry.filter(doc => 
        doc.categories.includes(category)
      ).length;
    });
    
    // Documents by component
    const componentStats = {};
    this.components.forEach(component => {
      componentStats[component] = this.documentRegistry.filter(doc => 
        doc.components.includes(component)
      ).length;
    });
    
    // Documents by age
    const now = new Date();
    const last7Days = this.documentRegistry.filter(doc => {
      const modifiedDate = new Date(doc.lastModified);
      return (now - modifiedDate) / (1000 * 60 * 60 * 24) <= 7;
    }).length;
    
    const last30Days = this.documentRegistry.filter(doc => {
      const modifiedDate = new Date(doc.lastModified);
      return (now - modifiedDate) / (1000 * 60 * 60 * 24) <= 30;
    }).length;
    
    const last90Days = this.documentRegistry.filter(doc => {
      const modifiedDate = new Date(doc.lastModified);
      return (now - modifiedDate) / (1000 * 60 * 60 * 24) <= 90;
    }).length;
    
    return {
      totalDocuments,
      categoryStats,
      componentStats,
      ageStats: {
        last7Days,
        last30Days,
        last90Days,
        older: totalDocuments - last90Days
      },
      averageWordCount: this.documentRegistry.reduce((acc, doc) => acc + (doc.wordCount || 0), 0) / totalDocuments
    };
  }
  
  /**
   * AI Document analysis (mock implementation)
   */
  async analyzeDocumentQuality(documentId) {
    const document = await this.getDocument(documentId);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock analysis results
    return {
      analysis: {
        qualityScore: Math.floor(Math.random() * 4) + 7, // 7-10 score
        insights: [
          'Good overall structure with clear sections',
          'Examples help illustrate key concepts',
          'Some sections could use more detailed explanations',
          'Consider adding more cross-references to related documentation',
          'Technical terms are well-defined and consistent'
        ],
        completeness: {
          score: Math.floor(Math.random() * 3) + 7, // 7-9 score
          findings: [
            'All major topics are covered',
            'Some edge cases could be better documented',
            'Error handling section is comprehensive'
          ]
        },
        clarity: {
          score: Math.floor(Math.random() * 3) + 7, // 7-9 score
          findings: [
            'Instructions are clear and actionable',
            'Some sentences are too long and could be simplified',
            'Good use of formatting to highlight key points'
          ]
        }
      }
    };
  }
  
  /**
   * AI improvement suggestions (mock implementation)
   */
  async suggestImprovements(documentId) {
    const document = await this.getDocument(documentId);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock improvement suggestions
    return {
      improvements: [
        'Add a troubleshooting section to address common issues',
        'Include more code examples demonstrating key concepts',
        'Add a table of contents for easier navigation',
        'Consider adding diagrams to clarify the architecture',
        'Expand the configuration options section with more details',
        'Add cross-references to related documentation',
        'Include a quick start guide for new users'
      ]
    };
  }
  
  /**
   * AI generate missing section (mock implementation)
   */
  async generateMissingSection(documentId, sectionName) {
    const document = await this.getDocument(documentId);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock content based on section name
    let content = '';
    
    if (sectionName.toLowerCase().includes('install')) {
      content = `## Installation

### Prerequisites
- Node.js v14 or higher
- npm v7 or higher
- Git

### Installation Steps
1. Clone the repository:
\`\`\`bash
git clone https://github.com/example/devloop.git
cd devloop
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure the environment:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

### Verification
To verify the installation was successful, navigate to http://localhost:3000 in your browser.
You should see the Devloop dashboard.`;
    } else if (sectionName.toLowerCase().includes('troubleshoot')) {
      content = `## Troubleshooting

### Common Issues

#### Application Fails to Start
If the application fails to start, check the following:
- Ensure all dependencies are installed: \`npm install\`
- Verify environment variables are set correctly
- Check for port conflicts (default port is 3000)

#### Database Connection Issues
If you're experiencing database connection problems:
- Verify database credentials in your .env file
- Ensure the database server is running
- Check network connectivity to the database server

#### UI Rendering Problems
If UI components don't render properly:
- Clear browser cache and reload
- Check browser console for errors
- Verify CSS compatibility with your browser version

### Getting Help
If you continue to experience issues:
1. Check the GitHub Issues for similar problems
2. Join our Discord channel for community support
3. Contact the development team via email`;
    } else if (sectionName.toLowerCase().includes('api')) {
      content = `## API Reference

### Authentication
All API requests require authentication using a JWT token.

#### Obtaining a Token
\`\`\`
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
\`\`\`

### Endpoints

#### Get All Features
\`\`\`
GET /api/features
Authorization: Bearer <token>
\`\`\`

#### Create New Feature
\`\`\`
POST /api/features
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Feature Name",
  "description": "Feature description",
  "status": "pending",
  "module": "module-name",
  "phase": "phase-01"
}
\`\`\`

#### Update Feature
\`\`\`
PUT /api/features/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in-progress"
}
\`\`\`

### Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error`;
    } else {
      content = `## ${sectionName}

This section provides information about ${sectionName.toLowerCase()}.

### Overview
The ${sectionName} component is responsible for handling key functionality within the system.

### Usage
Here's how to use the ${sectionName} functionality:

\`\`\`javascript
// Example code
import { ${sectionName.replace(/\s/g, '')} } from './components';

const result = ${sectionName.replace(/\s/g, '')}({
  parameter1: 'value1',
  parameter2: 'value2'
});
\`\`\`

### Configuration
The ${sectionName} can be configured with the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option1 | string | "default" | Description of option1 |
| option2 | number | 42 | Description of option2 |
| option3 | boolean | false | Description of option3 |

### Best Practices
When working with ${sectionName}, consider these best practices:
1. Always validate inputs before processing
2. Handle errors gracefully
3. Cache results when possible for better performance`;
    }
    
    return {
      sectionName,
      generatedContent: content
    };
  }
  
  /**
   * Process a chat message and generate an AI response for document assistance
   */
  async processChatMessage(message, documentContext) {
    console.log("Processing chat message:", message, documentContext);
    
    try {
      console.log("Attempting to call document chat endpoint...");
      // Create a prompt for the AI based on the message and document context
      const prompt = `You are assisting a user with document creation. The user is working on a document with the following details:
      
Title: ${documentContext.title || 'Untitled Document'}
Type: ${documentContext.type || 'general'}
Purpose: ${documentContext.purpose || 'general'}

The user has asked: "${message}"

Provide a helpful response, focusing specifically on document creation and organization. 
If appropriate, suggest content or structure for the document based on its type and purpose.
Keep your response concise and actionable.`;
      
      // Try to use the real backend if available
      try {
        // First try the document server
        console.log("Trying to call document server API...");
        const response = await fetch('http://localhost:3002/api/documents/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            documentContext
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Chat API response:", data);
        
        if (data.success && data.response) {
          return data.response;
        }
        throw new Error("No valid response from API");
      } catch (apiError) {
        console.error("Error calling chat API:", apiError);
        
        // Fall back to using document generation API for chat-like functionality
        console.log("Falling back to document generation API...");
        
        // Call the backend API with our prompt
        try {
          const response = await fetch('http://localhost:3002/api/documents/generate-mock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: "Chat Response",
              description: message,
              type: documentContext.type || "general",
              purpose: "chat-assistance",
              prompt: prompt
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
          }
          
          const data = await response.json();
          if (data.success && data.content) {
            // Extract just the helpful part from the generated document
            return data.content.replace(/^#.*?\n\n/, '').trim();
          }
          throw new Error("No valid content from generation API");
        } catch (genError) {
          console.error("Error with fallback generation:", genError);
          throw genError;
        }
      }
    } catch (error) {
      console.error("Chat processing error:", error);
      
      // Generate a simulated response based on common document assistance patterns
      return this.generateSimulatedChatResponse(message, documentContext);
    }
  }
  
  /**
   * Generate a simulated chat response when API is unavailable
   */
  generateSimulatedChatResponse(message, documentContext) {
    console.log("Generating simulated chat response for:", message);
    
    // Convert message to lowercase for easier pattern matching
    const msg = message.toLowerCase();
    
    // First message - ask proactive questions about the document
    if (documentContext.isFirstMessage || msg.includes('help') || msg.includes('start')) {
      return `I'm here to help you create your ${documentContext.title || 'document'}. Let me ask a few questions to get started:

1. What's the main purpose of this document? (e.g., tutorial, reference, architecture overview)
2. Who is the target audience? (e.g., developers, system architects, end users)
3. Are there specific code examples or components you want to include?

Once I understand more about what you need, I can help generate appropriate content and structure.`;
    }
    
    // Questions about the document purpose
    if (msg.includes('purpose') || msg.includes('goal') || msg.includes('why')) {
      return `Understanding the purpose of your document is essential. Based on your title "${documentContext.title || 'document'}", this appears to be a ${documentContext.type || 'technical'} document focused on ${documentContext.purpose || 'documentation'}.

What specific goals would you like this document to achieve?

- Is it explaining how to use a specific feature?
- Is it providing architectural context?
- Is it a troubleshooting guide?
- Is it documenting an API or interface?

This will help me generate more relevant content and structure suggestions.`;
    }
    
    // Structure-related questions - make more interactive
    if (msg.includes('structure') || msg.includes('outline') || msg.includes('organize')) {
      return `For a ${documentContext.type || 'general'} document focusing on ${documentContext.purpose || 'general purpose'}, here's an interactive approach to structuring it:

1. **Title & Introduction** - Brief purpose statement
2. **Overview** - High-level explanation (2-3 paragraphs)
3. **Architecture/Components** - System design details with diagrams
4. **Implementation** - Code examples and patterns
5. **API/Interface** - Interaction details
6. **Usage Examples** - Real-world scenarios
7. **Integration** - Connection points with other systems
8. **References** - Related documentation

Which of these sections would be most important for your document? I can help expand any section with specific content from the DevLoop codebase.`;
    }
    
    // Content generation requests - make more interactive with specific examples
    else if (msg.includes('generate') || msg.includes('create content') || msg.includes('write')) {
      if (msg.includes('overview')) {
        return `I'd be happy to generate an overview section for "${documentContext.title || 'your document'}". Let me ask a few questions first:

1. Should this overview focus more on system architecture or implementation details?
2. Do you want to include information about how it integrates with other DevLoop components?
3. Would you like code snippets in the overview or keep it high-level?

Here's a draft to start with:

## Overview

This document provides a comprehensive guide to the ${documentContext.title || 'system'}, covering its architecture, implementation details, and usage patterns. It addresses key considerations for developers working with the document management system and provides examples of common implementation scenarios.

I can tailor this further based on your answers. Would you like me to add this to your document?`;
      }
      else if (msg.includes('complete') || msg.includes('full')) {
        return `I can help generate a complete document for "${documentContext.title || 'your document'}". To create the most relevant content, I need to know:

1. What's the primary goal of this document?
2. Which related components from the DevLoop system should be referenced?
3. Do you want more focus on code examples or architectural concepts?

Here's my suggested structure:

1. **Introduction** - Purpose and context
2. **System Architecture** - Key components and their relationships
3. **Implementation Details** - How the system is built
4. **API Reference** - Important functions and parameters
5. **Integration** - How it connects with other DevLoop components
6. **Usage Examples** - Real-world implementation samples
7. **Best Practices** - Guidelines for effective use

Which of these sections would you like me to expand first? Or should I generate the entire document at once?`;
      }
      else if (msg.includes('code') || msg.includes('example')) {
        return `I can generate code examples related to document management in the DevLoop system. To provide the most relevant examples, I need to know:

1. Do you need examples for creating, reading, or managing documents?
2. Are you looking for React component examples or backend service implementations?
3. Should examples include error handling and edge cases?

Here's a starting point based on the document manager service pattern:

\`\`\`javascript
// Example: Using the Document Manager Service
import documentManagerService from '../../services/documentManagerService';

async function createNewGuide() {
  try {
    // Generate document content using AI
    const content = await documentManagerService.generateDocumentContent(
      'Developer Guide',
      'A comprehensive guide for DevLoop developers',
      'guide',
      'learning',
      ['Core System', 'Documentation']
    );
    
    // Save the generated document
    const result = await documentManagerService.createDocument({
      title: 'Developer Guide',
      path: '/docs/developer-guide.md',
      content,
      categories: ['Guide', 'Learning'],
      components: ['Core System', 'Documentation'],
      tags: ['guide', 'development', 'devloop']
    });
    
    return result;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}
\`\`\`

Would you like me to generate more specific examples for your use case?`;
      }
      else {
        return `I'd love to help generate content for "${documentContext.title || 'your document'}". To provide the most useful content, could you tell me:

1. Which specific section are you working on right now?
2. What level of technical detail is appropriate?
3. Are there particular DevLoop components or features that should be highlighted?

I can generate various content types:

- Overview sections with system context
- Architecture descriptions with component relationships
- API documentation with parameter details
- Code examples with implementation patterns
- Integration guides with other system components
- Best practices based on DevLoop standards

Which of these would be most helpful for your document?`;
      }
    }
    
    // Metadata-related questions - make more interactive and ask for feedback
    else if (msg.includes('metadata') || msg.includes('category') || msg.includes('tag') || msg.includes('component')) {
      return `Based on analyzing "${documentContext.title || 'your document'}", I recommend these metadata settings:

**Categories:**
- ${documentContext.type === 'architecture' ? 'Architecture' : documentContext.type === 'guide' ? 'Guide' : 'Documentation'}
- ${documentContext.purpose === 'implementation' ? 'Implementation' : documentContext.purpose === 'learning' ? 'Learning' : 'Reference'}

**Components:**
- Document Manager
- AI Integration

**Tags:**
- ${documentContext.type || 'documentation'}
- ${documentContext.purpose || 'reference'}
- devloop
- system

Are these categories and components accurate for your document? Would you like to add or remove any? I can also suggest additional tags based on document content if you'd like.`;
    }
    
    // Best practices questions - make more interactive with DevLoop-specific info
    else if (msg.includes('best practice') || msg.includes('guideline') || msg.includes('standard')) {
      return `DevLoop has established documentation best practices specifically for ${documentContext.type || 'technical'} documents:

1. **Consistent Structure** - Follow the standard pattern used in ARCHITECTURE.md and DESIGN_PRINCIPLES.md
2. **Cross-referencing** - Link to related docs using \`[Document Name](./path/to/doc.md)\` format
3. **Version Information** - Include version details for APIs and interfaces
4. **Practical Examples** - Always include tested code examples from the actual codebase
5. **Visual Representations** - Use diagrams for complex architectures (ASCII or Markdown-compatible)
6. **Complete Coverage** - Address all aspects of the component's lifecycle and usage
7. **System Context** - Reference how the component connects to the overall DevLoop ecosystem

Which of these practices would you like me to explain in more detail for your specific document? I can also provide examples of how these are applied in existing documentation.`;
    }
    
    // Document types - explain different document types with DevLoop context
    else if (msg.includes('type') || msg.includes('kind of') || msg.includes('what document')) {
      return `In the DevLoop system, there are several document types with specific purposes:

1. **Architecture Documents** - Explain system design, component relationships, and data flows
   Example: ARCHITECTURE.md, AI_ORCHESTRATION_GUIDE.md
   
2. **User Guides** - Provide step-by-step instructions for users
   Example: UI_DEVELOPMENT_WORKFLOW.md, DEVLOOP_WORKFLOW.md
   
3. **API References** - Document interfaces, parameters, and return values
   Example: CLI-REFERENCE.md, AI service endpoints
   
4. **Design Principles** - Explain the reasoning behind design decisions
   Example: DESIGN_PRINCIPLES.md
   
5. **Implementation Guides** - Provide technical details for developers
   Example: Feature implementation documents, PACKET_CHECKLIST.md

Based on your title "${documentContext.title || 'document'}", this appears to be a ${documentContext.type || 'general'} document. Is that correct? Would you like me to help tailor it to a specific document type?`;
    }
    
    // React to mentions of specific DevLoop components
    else if (msg.includes('feature management') || msg.includes('ui dashboard') || msg.includes('core system') || msg.includes('ai integration')) {
      const component = 
        msg.includes('feature management') ? 'Feature Management' :
        msg.includes('ui dashboard') ? 'UI Dashboard' :
        msg.includes('core system') ? 'Core System' : 'AI Integration';
      
      return `I notice you're interested in the ${component} component of DevLoop. This is a key part of the system!

For the ${component} component, your document should address:

1. **Purpose and Responsibilities** - What this component does within DevLoop
2. **Key Files and Modules** - The essential code that implements this functionality
3. **Interfaces** - How other components interact with it
4. **Configuration Options** - How to customize its behavior
5. **Usage Patterns** - Common implementation patterns and examples

Would you like me to generate documentation specifically about ${component} integration with your document topic? I can include relevant code examples and architecture details.`;
    }
    
    // If we detect a direct question about implementation
    else if (msg.includes('how to') || msg.includes('how do i') || msg.includes('?')) {
      return `That's a great question about ${documentContext.title || 'this topic'}. To answer specifically:

The implementation approach depends on which part of the DevLoop system you're working with. For documents related to ${documentContext.type || 'this type'}, the typical pattern involves:

1. Creating the document structure based on the standard template
2. Implementing the core functionality (with appropriate error handling)
3. Integrating with related components 
4. Adding comprehensive tests
5. Documenting the API and usage patterns

Could you tell me more specifically what aspect you're trying to implement? I can provide concrete examples and code snippets from the DevLoop codebase.`;
    }
    
    // Default response for other questions - make more conversational and ask follow-ups
    else {
      return `I'm here to help with your "${documentContext.title || 'document'}" creation. To provide the most relevant assistance, I'd like to understand more about what you need:

1. Are you at the beginning, middle, or final stages of creating this document?
2. What specific challenges are you facing right now?
3. Would you prefer help with content generation, structure organization, or metadata?

I can help with many aspects of DevLoop documentation:
- Generate document content for any section
- Suggest optimal document structure based on type and purpose
- Recommend appropriate metadata for better categorization
- Provide DevLoop-specific best practices
- Generate code examples and implementation patterns
- Connect your document with related system components

What would be most helpful for you right now?`;
    }
  }

  /**
   * Generate AI-powered document content based on document metadata and system context
   */
  async generateDocumentContent(title, description, type, purpose, components = []) {
    console.log("Generating AI document content:", { title, description, type, purpose, components });
    
    try {
      // First, gather system context relevant to this document type and components
      const systemContext = await this.gatherSystemContext(type, components);
      
      // Create a comprehensive prompt for the AI
      const prompt = this.createDocumentGenerationPrompt(
        title,
        description,
        type,
        purpose,
        components,
        systemContext
      );
      
      console.log("Using real AI integration for document generation");
      try {
        // Make the actual API call to generate content
        const content = await this.callAIBackend(prompt);
        console.log("AI content generation successful");
        return content;
      } catch (aiError) {
        console.error("AI document generation failed:", aiError);
        console.warn("Falling back to template-based generation");
        
        // Generate a detailed content outline based on the document type
        const contentOutline = this.generateContentOutline(type, purpose);
        
        // Use our smart template system as a fallback
        return this.generateContentFromTemplate(
          title, 
          description, 
          type, 
          purpose, 
          contentOutline, 
          systemContext
        );
      }
    } catch (err) {
      console.error("Error generating document content:", err);
      // Fallback to a simple template if all else fails
      return this.generateBasicContent(title, description);
    }
  }
  
  /**
   * Create a comprehensive prompt for AI-powered document generation
   */
  createDocumentGenerationPrompt(title, description, type, purpose, components, systemContext) {
    // Create a detailed prompt that guides the AI in generating the document
    
    // Start with general instructions
    let prompt = `Generate a comprehensive documentation file for the DevLoop system with the following details:
    
Title: ${title}
Description: ${description || 'None provided'}
Document Type: ${type}
Document Purpose: ${purpose}
Related Components: ${components.join(', ') || 'None specified'}

CONTEXT ABOUT THE SYSTEM:
------------------------
Project Name: ${systemContext.projectName}
Project Description: ${systemContext.description}

Core Components: ${systemContext.coreComponents.join(', ')}

Main Folders: ${systemContext.mainFolders.join(', ')}

Main Commands: ${systemContext.mainCommands.join(', ')}
`;
    
    // Add type-specific instructions
    prompt += `\nSPECIFIC DOCUMENT TYPE GUIDELINES:
--------------------------------\n`;
    
    if (type === 'architecture') {
      prompt += `This is an ARCHITECTURE document. It should:
- Describe the system components and their relationships
- Explain data flows between components
- Include ASCII diagrams where helpful
- Cover integration points with other systems
- Address security considerations
`;
      
      // Add architecture-specific context if available
      if (systemContext.architectureComponents) {
        prompt += `\nArchitecture Components:\n${systemContext.architectureComponents.map(c => `- ${c}`).join('\n')}`;
      }
      
      if (systemContext.systemInteractions) {
        prompt += `\nSystem Interactions:\n${systemContext.systemInteractions.map(i => `- ${i}`).join('\n')}`;
      }
      
      if (systemContext.dataFlows) {
        prompt += `\nData Flows:\n${systemContext.dataFlows.map(f => `- ${f}`).join('\n')}`;
      }
    } else if (type === 'workflow') {
      prompt += `This is a WORKFLOW document. It should:
- Describe the process steps sequentially
- Explain inputs and outputs of each step
- Include command examples where applicable
- Address error handling and recovery
- Cover best practices for the workflow
`;
      
      // Add workflow-specific context if available
      if (systemContext.workflowProcesses) {
        prompt += `\nWorkflow Processes:\n${systemContext.workflowProcesses.map(p => `- ${p}`).join('\n')}`;
      }
      
      if (systemContext.lifecycleStages) {
        prompt += `\nLifecycle Stages:\n${systemContext.lifecycleStages.map(s => `- ${s}`).join('\n')}`;
      }
    } else if (type === 'guide' || type === 'tutorial') {
      prompt += `This is a ${type.toUpperCase()} document. It should:
- Provide clear step-by-step instructions
- Include Prerequisites section
- Use concrete examples and code snippets
- Address common issues and troubleshooting
- Cover advanced usage scenarios
`;
      
      // Add guide-specific context if available
      if (systemContext.commonTasks) {
        prompt += `\nCommon Tasks:\n${systemContext.commonTasks.map(t => `- ${t.name}: ${t.steps.join(' → ')}`).join('\n')}`;
      }
      
      if (systemContext.exampleCommands) {
        prompt += `\nExample Commands:\n${systemContext.exampleCommands.map(c => `- \`${c}\``).join('\n')}`;
      }
    } else if (type === 'api') {
      prompt += `This is an API document. It should:
- Describe authentication mechanisms
- Document all endpoints with request/response formats
- Include examples for each endpoint
- Cover error codes and handling
- Address rate limiting and performance considerations
`;
      
      // Add API-specific context if available
      if (systemContext.apiEndpoints) {
        prompt += `\nAPI Endpoints:\n${systemContext.apiEndpoints.map(e => `- ${e.path} (${e.methods.join(', ')}): ${e.purpose}`).join('\n')}`;
      }
      
      if (systemContext.authentication) {
        prompt += `\nAuthentication: ${systemContext.authentication.method}, Token lifetime: ${systemContext.authentication.tokenLifetime}`;
      }
    }
    
    // Add purpose-specific instructions
    prompt += `\nSPECIFIC PURPOSE GUIDELINES:
-----------------------------\n`;
    
    if (purpose === 'learning') {
      prompt += `This document is for LEARNING purposes. It should:
- Focus on explaining concepts clearly
- Build understanding progressively
- Include plenty of examples
- Reference related learning resources
- Suggest next steps for further learning
`;
    } else if (purpose === 'implementation') {
      prompt += `This document is for IMPLEMENTATION purposes. It should:
- Focus on practical application
- Include detailed implementation steps
- Cover testing and validation approaches
- Address common implementation pitfalls
- Include deployment considerations
`;
    } else if (purpose === 'troubleshooting') {
      prompt += `This document is for TROUBLESHOOTING purposes. It should:
- Categorize common problems
- Provide diagnostic approaches
- Include clear resolution steps
- Cover recovery procedures
- Address prevention strategies
`;
    }
    
    // Add component-specific context if available
    if (components.length > 0) {
      prompt += `\nCOMPONENT-SPECIFIC INFORMATION:
--------------------------------\n`;
      
      components.forEach(component => {
        const compKey = component.toLowerCase().replace(/\s+/g, '_');
        
        if (compKey === 'core_system' && systemContext.coreSystem) {
          prompt += `\nCore System:
- Description: ${systemContext.coreSystem.description}
- Key Files: ${systemContext.coreSystem.keyFiles.join(', ')}
- Interfaces: ${systemContext.coreSystem.interfaces.join(', ')}
`;
        } else if (compKey === 'ui_dashboard' && systemContext.uiDashboard) {
          prompt += `\nUI Dashboard:
- Description: ${systemContext.uiDashboard.description}
- Technologies: ${systemContext.uiDashboard.technologies.join(', ')}
- Key Files: ${systemContext.uiDashboard.keyFiles.join(', ')}
`;
        } else if (compKey === 'feature_management' && systemContext.featureManagement) {
          prompt += `\nFeature Management:
- Description: ${systemContext.featureManagement.description}
- Key Files: ${systemContext.featureManagement.keyFiles.join(', ')}
- Command Patterns: ${systemContext.featureManagement.commandPatterns.join(', ')}
`;
        } else if (compKey === 'ai_integration' && systemContext.aiIntegration) {
          prompt += `\nAI Integration:
- Description: ${systemContext.aiIntegration.description}
- Key Files: ${systemContext.aiIntegration.keyFiles.join(', ')}
- Capabilities: ${systemContext.aiIntegration.capabilities.join(', ')}
`;
        }
      });
    }
    
    // Add output format instructions
    prompt += `\nOUTPUT FORMAT:
--------------
Return a complete Markdown document with the following sections:
1. Title (use the provided title)
2. Description/Introduction
3. Purpose
4. Overview
5. Additional sections appropriate for this document type and purpose

Use proper Markdown formatting including:
- Headers (# for title, ## for sections, ### for subsections)
- Lists (- or 1. depending on whether ordered or unordered)
- Code blocks (\`\`\` for multi-line, \` for inline)
- Tables where appropriate (using | format)

The content should be comprehensive, accurate, and specifically tailored to the DevLoop system context provided.`;
    
    return prompt;
  }
  
  /**
   * Make an API call to the AI backend
   */
  async callAIBackend(prompt) {
    console.log("Calling AI backend for document generation...");
    
    // Extract key parameters from the prompt to send to backend
    // Since we don't need to send the entire prompt
    const title = prompt.match(/Title: (.*?)(?:\n|$)/)?.[1] || 'Untitled Document';
    const description = prompt.match(/Description: (.*?)(?:\n|$)/)?.[1] || '';
    const docType = prompt.match(/Document Type: (.*?)(?:\n|$)/)?.[1] || 'general';
    const docPurpose = prompt.match(/Document Purpose: (.*?)(?:\n|$)/)?.[1] || 'general';
    const componentsMatch = prompt.match(/Related Components: (.*?)(?:\n|$)/)?.[1] || '';
    const components = componentsMatch === 'None specified' ? [] : componentsMatch.split(', ');
    
    try {
      // Get the system context
      const systemContext = await this.gatherSystemContext(docType, components);
      
      // Call the backend API - trying both ports for flexibility
      console.log("Making API request to generate document content");
      let response;
      
      try {
        // First try the simple server on port 3002
        console.log("Trying port 3002...");
        response = await fetch('http://localhost:3002/api/documents/generate-mock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            type: docType,
            purpose: docPurpose,
            components,
            systemContext
          }),
        });
        
        console.log("Port 3002 response status:", response.status);
      } catch (err) {
        console.log("Failed to connect to port 3002:", err.message);
        
        // Try the main server on port 3001 as a fallback
        console.log("Trying port 3001...");
        response = await fetch('http://localhost:3001/api/documents/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            type: docType,
            purpose: docPurpose,
            components,
            systemContext
          }),
        });
        
        console.log("Port 3001 response status:", response.status);
      }
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API response received:", data);
      
      // If generation was successful, return the content
      if (data.success && data.content) {
        console.log("Successfully generated document with AI");
        return data.content;
      }
      
      // If generation failed but we got fallback content
      if (data.content) {
        console.log("Using fallback content from backend");
        return data.content;
      }
      
      throw new Error("No content returned from backend");
    } catch (error) {
      console.error("Error calling AI backend:", error);
      
      // Fallback if API call fails
      console.log("Using mock document generation as fallback");
      try {
        return this.generateContentFromTemplate(
          title,
          description,
          docType,
          docPurpose,
          this.generateContentOutline(docType, docPurpose),
          {}
        );
      } catch (templateError) {
        console.error("Template fallback also failed:", templateError);
        
        // Last resort fallback - return a basic error template
        return `# ${title}\n\n${description || ''}\n\n## AI Generation Error\n\nUnfortunately, there was an error generating the document content using AI:\n${error.message}\n\nPlease try again later or contact the system administrator if the problem persists.`;
      }
    }
  }
  
  /**
   * Gather relevant system context for document generation
   */
  async gatherSystemContext(type, components = []) {
    console.log("Gathering system context for:", type, components);
    
    // In a real implementation, this would query the system for relevant context
    // based on the document type and components mentioned
    
    // For mockup purposes, we'll return pre-defined context for common document types
    
    // Basic system overview that applies to all documents
    const baseContext = {
      projectName: "DevLoop",
      description: "Development workflow automation system with AI integration",
      coreComponents: [
        "Core System", "UI Dashboard", "Feature Management", 
        "AI Integration", "Testing", "Documentation"
      ],
      mainFolders: [
        "/system-core", "/milestones", "/Key_Build_Docs", 
        "/Planning", "/scripts", "/docs"
      ],
      mainCommands: [
        "./system-core/scripts/devloop/run-feature.sh", 
        "./system-core/project-tracker/update-dashboard-data.sh",
        "./system-core/scripts/devloop/generate-progress-reports.sh",
        "./activate-ai-systems.sh"
      ]
    };
    
    // Specific context based on document type
    let typeSpecificContext = {};
    
    if (type === 'architecture') {
      typeSpecificContext = {
        architectureComponents: [
          "Core System (Foundation layer for all operations)",
          "Feature Management (Handles feature lifecycle management)",
          "UI Dashboard (Web interface for monitoring and control)",
          "AI Integration (Connects with Claude API and other LLMs)",
          "Testing Framework (Multi-layer testing system)"
        ],
        systemInteractions: [
          "Core System → Feature Management: Feature registration and execution",
          "Feature Management → UI Dashboard: Status visualization",
          "AI Integration → Core System: Command processing and enhancement",
          "Testing Framework → All Components: Validation and verification"
        ],
        dataFlows: [
          "User Command → Natural Language Processing → Command Execution",
          "Feature Registration → System Registry → Dashboard Updates",
          "Test Execution → Health Metrics → Status Reports"
        ]
      };
    } else if (type === 'workflow') {
      typeSpecificContext = {
        workflowProcesses: [
          "Feature Creation (scaffold_packet.py)",
          "Feature Execution (run-feature.sh)",
          "Milestone Management (initialize-milestone.py)",
          "Testing (run-tests.sh)",
          "Reporting (generate-progress-reports.sh)"
        ],
        lifecycleStages: [
          "Initialization", "Scaffold", "Implementation", 
          "Testing", "Integration", "Validation"
        ],
        commandsAndTools: [
          { name: "Natural Language Command", path: "natural_language_command.py", purpose: "Process user instructions" },
          { name: "Feature Scaffold", path: "scaffold_packet.py", purpose: "Create feature templates" },
          { name: "Run Feature", path: "run-feature.sh", purpose: "Execute feature implementation" },
          { name: "Progress Report", path: "generate-progress-reports.sh", purpose: "Create status reports" }
        ]
      };
    } else if (type === 'api') {
      typeSpecificContext = {
        apiEndpoints: [
          { path: "/api/v1/features", methods: ["GET", "POST", "PUT"], purpose: "Feature management" },
          { path: "/api/v1/milestones", methods: ["GET", "POST"], purpose: "Milestone tracking" },
          { path: "/api/v1/components", methods: ["GET", "DELETE"], purpose: "Component management" }
        ],
        authentication: {
          method: "JWT Token",
          tokenLifetime: "24 hours",
          refreshEndpoint: "/api/v1/auth/refresh"
        },
        commonResponses: {
          success: { status: 200, format: { result: "data object", metadata: "pagination info" } },
          error: { status: 400, format: { error: "Error message", code: "Error code", details: "Array of details" } }
        }
      };
    } else if (type === 'guide' || type === 'tutorial') {
      typeSpecificContext = {
        commonTasks: [
          { name: "Creating a Feature", steps: ["Define purpose", "Select milestone/phase", "Run scaffold script"] },
          { name: "Running Tests", steps: ["Execute test script", "Validate results", "Generate report"] },
          { name: "Updating Dashboard", steps: ["Run update script", "Verify display", "Check health metrics"] }
        ],
        exampleCommands: [
          "python3 system-core/scripts/devloop/natural_language_command.py 'create a feature for dashboard data filtering'",
          "./system-core/scripts/devloop/run-feature.sh /path/to/feature",
          "./system-core/project-tracker/update-dashboard-data.sh",
          "./activate-ai-systems.sh"
        ],
        troubleshooting: [
          "Missing dependencies: Run npm install",
          "Feature not found: Check file path",
          "Test failures: Check logs in /logs directory"
        ]
      };
    }
    
    // Component-specific context
    const componentContext = {};
    
    // Add context for each component mentioned in the document
    components.forEach(component => {
      // Convert component name to key for lookup
      const compKey = component.toLowerCase().replace(/\s+/g, '_');
      
      // Add component-specific context
      if (compKey === 'core_system') {
        componentContext.coreSystem = {
          description: "Foundation layer providing core services and orchestration",
          keyFiles: [
            "/system-core/scripts/devloop/devloop_api.py",
            "/system-core/scripts/utils/context_manager.py",
            "/system-core/templates/feature/feature-packet-template.md"
          ],
          interfaces: ["Command API", "Feature Registry", "Memory Management"]
        };
      } else if (compKey === 'ui_dashboard') {
        componentContext.uiDashboard = {
          description: "Web interface for system monitoring and management",
          keyFiles: [
            "/system-core/ui-system/react-app/src/components/Dashboard.jsx",
            "/system-core/ui-system/react-app/src/services/featureService.js",
            "/system-core/ui-system/react-app/src/pages/FeatureManager.jsx"
          ],
          technologies: ["React", "TailwindCSS", "Vite", "Service Layer Pattern"]
        };
      } else if (compKey === 'feature_management') {
        componentContext.featureManagement = {
          description: "System for tracking and managing features through lifecycle",
          keyFiles: [
            "/system-core/scripts/devloop/scaffold_packet.py",
            "/system-core/scripts/devloop/run-feature.sh",
            "/system-core/memory/feature-registry.json"
          ],
          commandPatterns: [
            "create feature <name> in <milestone> <phase> <module>",
            "run feature <path>",
            "update feature status <path> <status>"
          ]
        };
      } else if (compKey === 'ai_integration') {
        componentContext.aiIntegration = {
          description: "AI service orchestration and integration with Claude and other LLMs",
          keyFiles: [
            "/system-core/scripts/utils/claude_api_client.py",
            "/system-core/scripts/devloop/ai-roadmap-synchronizer.py",
            "/system-core/scripts/utils/ai_service.py"
          ],
          capabilities: [
            "Natural language command processing",
            "Document content generation",
            "Feature analysis and enhancement",
            "System health monitoring"
          ]
        };
      }
    });
    
    // Combine all context sources
    return {
      ...baseContext,
      ...typeSpecificContext,
      ...componentContext
    };
  }
  
  /**
   * Generate a content outline based on document type and purpose
   */
  generateContentOutline(type, purpose) {
    // Generate appropriate sections based on document type and purpose
    let sections = [];
    
    // Common sections for all document types
    const commonSections = ["Introduction", "Purpose", "Overview"];
    
    // Type-specific sections
    if (type === 'architecture') {
      sections = [
        ...commonSections,
        "System Components",
        "Component Relationships",
        "Data Flow",
        "Integration Points",
        "Security Considerations"
      ];
    } else if (type === 'workflow') {
      sections = [
        ...commonSections,
        "Workflow Stages",
        "Process Flow",
        "Commands and Tools",
        "Error Handling",
        "Best Practices"
      ];
    } else if (type === 'guide' || type === 'tutorial') {
      sections = [
        ...commonSections,
        "Prerequisites",
        "Step-by-Step Instructions",
        "Examples",
        "Common Issues",
        "Advanced Usage",
        "Related Resources"
      ];
    } else if (type === 'api') {
      sections = [
        ...commonSections,
        "Authentication",
        "Endpoints",
        "Request/Response Format",
        "Error Codes",
        "Rate Limiting",
        "Examples"
      ];
    } else if (type === 'reference') {
      sections = [
        ...commonSections,
        "Core Concepts",
        "Configuration Options",
        "Command Reference",
        "File Formats",
        "Glossary"
      ];
    } else {
      // Default sections for any other document type
      sections = [
        ...commonSections,
        "Key Features",
        "Usage",
        "Configuration",
        "Examples",
        "Troubleshooting"
      ];
    }
    
    // Adjust sections based on purpose
    if (purpose === 'learning') {
      sections = [...sections, "Learning Resources", "Next Steps"];
    } else if (purpose === 'implementation') {
      sections = [...sections, "Implementation Details", "Testing Approach", "Deployment Considerations"];
    } else if (purpose === 'troubleshooting') {
      sections = [...sections, "Common Issues", "Diagnostics", "Recovery Procedures"];
    }
    
    return sections;
  }
  
  /**
   * Generate document content from template using metadata and context
   */
  generateContentFromTemplate(title, description, type, purpose, sections, context) {
    // Start with the title and description
    let content = `# ${title}\n\n`;
    
    // Add description if available
    if (description) {
      content += `${description}\n\n`;
    }
    
    // Generate content for each section
    sections.forEach(section => {
      // Add section heading
      content += `## ${section}\n\n`;
      
      // Generate content based on section and context
      switch (section) {
        case "Introduction":
          content += this.generateIntroductionSection(title, type, purpose, context);
          break;
        case "Purpose":
          content += this.generatePurposeSection(title, type, purpose);
          break;
        case "Overview":
          content += this.generateOverviewSection(type, context);
          break;
        case "System Components":
          content += this.generateComponentsSection(context);
          break;
        case "Component Relationships":
          content += this.generateRelationshipsSection(context);
          break;
        case "Workflow Stages":
          content += this.generateWorkflowStagesSection(context);
          break;
        case "Prerequisites":
          content += this.generatePrerequisitesSection(type, context);
          break;
        case "Step-by-Step Instructions":
          content += this.generateStepByStepSection(type, purpose, context);
          break;
        case "Authentication":
          content += this.generateAuthenticationSection(context);
          break;
        case "Endpoints":
          content += this.generateEndpointsSection(context);
          break;
        default:
          // Generate generic section content
          content += `This section provides information about ${section.toLowerCase()} for ${title}.\n\n`;
          
          // Add placeholder paragraphs
          content += `${section} is an important aspect of the system that requires careful consideration.\n\n`;
          content += `When working with ${section.toLowerCase()}, remember to follow best practices and system conventions.\n\n`;
      }
    });
    
    return content;
  }
  
  /**
   * Generate basic content when advanced generation fails
   */
  generateBasicContent(title, description) {
    return `# ${title}\n\n${description || 'No description provided.'}\n\n## Overview\n\nThis document provides information about ${title}.\n\n## Purpose\n\nThe purpose of this document is to provide information and guidance related to ${title}.\n\n## Key Points\n\n- Point 1\n- Point 2\n- Point 3\n\n## Related Information\n\n- Additional resources\n- Related documents\n- Further reading\n`;
  }
  
  /**
   * Generate introduction section
   */
  generateIntroductionSection(title, type, purpose, context) {
    let content = '';
    
    if (type === 'architecture') {
      content = `This document provides a comprehensive overview of the ${context.projectName} architecture. It outlines the core components, their relationships, and the overall system design principles.\n\n`;
    } else if (type === 'workflow') {
      content = `This document describes the workflow process for ${title} within the ${context.projectName} system. It covers the key stages, tools, and best practices for efficient implementation.\n\n`;
    } else if (type === 'guide' || type === 'tutorial') {
      content = `This guide provides step-by-step instructions for working with ${title} in the ${context.projectName} system. It is intended for developers who need to understand and implement these processes.\n\n`;
    } else if (type === 'api') {
      content = `This document outlines the API specifications for ${title}. It includes endpoint definitions, request/response formats, authentication requirements, and usage examples.\n\n`;
    } else {
      content = `This document provides information about ${title} within the ${context.projectName} system. It covers key concepts, implementation details, and best practices.\n\n`;
    }
    
    // Add purpose-specific content
    if (purpose === 'learning') {
      content += `The content is structured to facilitate learning and understanding of the core concepts and implementation details.\n\n`;
    } else if (purpose === 'implementation') {
      content += `The content focuses on implementation details and practical guidance for developers working with these components.\n\n`;
    } else if (purpose === 'troubleshooting') {
      content += `The content emphasizes diagnostic procedures and solutions for common issues encountered in the system.\n\n`;
    }
    
    return content;
  }
  
  /**
   * Generate purpose section
   */
  generatePurposeSection(title, type, purpose) {
    let content = '';
    
    if (type === 'architecture') {
      content = `The purpose of this architecture document is to provide a clear understanding of the system structure, component interactions, and design decisions. It serves as a reference for developers, system administrators, and other stakeholders.\n\n`;
    } else if (type === 'workflow') {
      content = `This workflow document aims to standardize the processes related to ${title}, ensuring consistency and efficiency across the development lifecycle. It provides a structured approach to common tasks and operations.\n\n`;
    } else if (type === 'guide' || type === 'tutorial') {
      content = `This guide is designed to help developers quickly understand and implement ${title} functionality. It provides practical, step-by-step instructions with examples to facilitate rapid adoption and proper usage.\n\n`;
    } else if (type === 'api') {
      content = `This API documentation serves as the authoritative reference for integrating with the ${title} interfaces. It enables developers to build reliable connections to the system with a clear understanding of the available endpoints and their behavior.\n\n`;
    } else {
      content = `The purpose of this document is to provide comprehensive information about ${title}, its functionality, and best practices for its use within the system.\n\n`;
    }
    
    // Add some general value statements
    content += `Key benefits of this documentation include:\n\n`;
    content += `- Clear understanding of system components and their relationships\n`;
    content += `- Standardized approaches to common tasks\n`;
    content += `- Troubleshooting guidance for resolving issues\n`;
    content += `- Best practices for optimal system usage\n\n`;
    
    return content;
  }
  
  /**
   * Generate overview section
   */
  generateOverviewSection(type, context) {
    let content = '';
    
    // Add system overview based on type
    if (type === 'architecture') {
      content = `The ${context.projectName} system consists of the following core components:\n\n`;
      
      // Add components from context if available
      if (context.architectureComponents) {
        context.architectureComponents.forEach(component => {
          content += `- ${component}\n`;
        });
      } else {
        // Default components if not available in context
        context.coreComponents.forEach(component => {
          content += `- ${component}\n`;
        });
      }
      
      content += `\nThese components work together to provide a comprehensive development workflow automation system with AI integration capabilities.\n\n`;
    } else if (type === 'workflow') {
      content = `The workflow process involves several key stages:\n\n`;
      
      // Add workflow stages from context if available
      if (context.lifecycleStages) {
        context.lifecycleStages.forEach((stage, index) => {
          content += `${index + 1}. **${stage}**: `;
          
          // Add brief descriptions for common stages
          if (stage === 'Initialization') {
            content += 'Setting up the initial environment and configuration\n';
          } else if (stage === 'Scaffold') {
            content += 'Creating the basic structure and templates\n';
          } else if (stage === 'Implementation') {
            content += 'Developing the core functionality\n';
          } else if (stage === 'Testing') {
            content += 'Validating functionality through automated tests\n';
          } else if (stage === 'Integration') {
            content += 'Combining components into the larger system\n';
          } else if (stage === 'Validation') {
            content += 'Final verification of system integrity\n';
          } else {
            content += 'Processing stage-specific operations\n';
          }
        });
      } else {
        // Default stages if not available in context
        content += `1. **Initialization**: Setting up the environment\n`;
        content += `2. **Development**: Implementing functionality\n`;
        content += `3. **Testing**: Validating implementation\n`;
        content += `4. **Integration**: Combining with the system\n`;
        content += `5. **Deployment**: Releasing to production\n`;
      }
      
      content += `\nEach stage has specific tools and processes to ensure consistency and quality.\n\n`;
    } else if (type === 'guide' || type === 'tutorial') {
      content = `This guide covers the following key areas:\n\n`;
      
      // Add common task areas for guides
      if (context.commonTasks) {
        context.commonTasks.forEach(task => {
          content += `- ${task.name}\n`;
        });
      } else {
        content += `- Basic setup and configuration\n`;
        content += `- Core functionality and usage\n`;
        content += `- Advanced features and customization\n`;
        content += `- Troubleshooting and maintenance\n`;
      }
      
      content += `\nThe guide includes practical examples and step-by-step instructions for each area.\n\n`;
    } else {
      content = `${context.projectName} provides a comprehensive development workflow automation system with the following key features:\n\n`;
      content += `- Feature packet scaffolding and management\n`;
      content += `- Milestone and phase tracking\n`;
      content += `- Integrated testing and validation\n`;
      content += `- AI-powered assistance and enhancement\n`;
      content += `- Progress reporting and visualization\n\n`;
      
      content += `This document focuses on specific aspects related to its topic within this broader system context.\n\n`;
    }
    
    return content;
  }
  
  /**
   * Generate components section for architecture documents
   */
  generateComponentsSection(context) {
    let content = 'The system consists of the following major components:\n\n';
    
    // Add components with descriptions
    if (context.architectureComponents) {
      context.architectureComponents.forEach(component => {
        // Extract component name from possibly longer description
        const compName = component.split('(')[0].trim();
        
        content += `### ${compName}\n\n`;
        
        // If component has description in parentheses, use it
        if (component.includes('(')) {
          const desc = component.match(/\((.*)\)/)[1];
          content += `${desc}\n\n`;
        } else {
          // Otherwise provide generic description
          content += `This component is responsible for ${compName.toLowerCase()} functionality within the system.\n\n`;
        }
        
        // Add specific details if available in context
        const compKey = compName.toLowerCase().replace(/\s+/g, '_');
        
        if (compKey === 'core_system' && context.coreSystem) {
          content += `Key files:\n`;
          context.coreSystem.keyFiles.forEach(file => {
            content += `- \`${file}\`\n`;
          });
          content += `\nInterfaces: ${context.coreSystem.interfaces.join(', ')}\n\n`;
        } else if (compKey === 'ui_dashboard' && context.uiDashboard) {
          content += `Technologies: ${context.uiDashboard.technologies.join(', ')}\n\n`;
          content += `Key files:\n`;
          context.uiDashboard.keyFiles.forEach(file => {
            content += `- \`${file}\`\n`;
          });
          content += `\n`;
        } else if (compKey === 'feature_management' && context.featureManagement) {
          content += `Command patterns:\n`;
          context.featureManagement.commandPatterns.forEach(pattern => {
            content += `- \`${pattern}\`\n`;
          });
          content += `\n`;
        }
      });
    } else {
      // Default components if not in context
      ['Core System', 'Feature Management', 'UI Dashboard', 'AI Integration', 'Testing'].forEach(comp => {
        content += `### ${comp}\n\n`;
        content += `This component is responsible for ${comp.toLowerCase()} functionality within the system.\n\n`;
      });
    }
    
    return content;
  }
  
  /**
   * Generate relationships section for architecture documents
   */
  generateRelationshipsSection(context) {
    let content = 'The system components interact with each other in the following ways:\n\n';
    
    // Add relationships if available in context
    if (context.systemInteractions) {
      context.systemInteractions.forEach(interaction => {
        content += `- ${interaction}\n`;
      });
      content += `\n`;
    } else {
      // Default relationships
      content += `- Core System → Feature Management: Feature registration and execution\n`;
      content += `- Feature Management → UI Dashboard: Status visualization\n`;
      content += `- AI Integration → Core System: Command processing and enhancement\n`;
      content += `- Testing Framework → All Components: Validation and verification\n\n`;
    }
    
    // Add diagram placeholder
    content += `\`\`\`\n`;
    content += `┌─────────────────┐     ┌─────────────────┐\n`;
    content += `│                 │     │                 │\n`;
    content += `│   Core System   │◄────│  Feature Manager│\n`;
    content += `│                 │     │                 │\n`;
    content += `└────────┬────────┘     └────────┬────────┘\n`;
    content += `         │                       │\n`;
    content += `         │                       │\n`;
    content += `         ▼                       ▼\n`;
    content += `┌─────────────────┐     ┌─────────────────┐\n`;
    content += `│                 │     │                 │\n`;
    content += `│   UI Dashboard  │     │  Testing System │\n`;
    content += `│                 │     │                 │\n`;
    content += `└─────────────────┘     └─────────────────┘\n`;
    content += `\`\`\`\n\n`;
    
    // Add data flow information if available
    if (context.dataFlows) {
      content += `### Data Flows\n\n`;
      context.dataFlows.forEach(flow => {
        content += `- ${flow}\n`;
      });
      content += `\n`;
    }
    
    return content;
  }
  
  /**
   * Generate workflow stages section
   */
  generateWorkflowStagesSection(context) {
    let content = 'The workflow process consists of the following stages:\n\n';
    
    // Add workflow processes if available
    if (context.workflowProcesses) {
      context.workflowProcesses.forEach(process => {
        const parts = process.split(' (');
        const name = parts[0];
        const script = parts.length > 1 ? parts[1].replace(')', '') : null;
        
        content += `### ${name}\n\n`;
        
        if (script) {
          content += `Implemented in: \`${script}\`\n\n`;
        }
        
        // Add generic description based on process name
        if (name.includes('Creation')) {
          content += `This stage involves creating the initial structure and templates for new components.\n\n`;
        } else if (name.includes('Execution')) {
          content += `This stage handles the execution of component functionality within the system.\n\n`;
        } else if (name.includes('Management')) {
          content += `This stage oversees the organization and coordination of system components.\n\n`;
        } else if (name.includes('Testing')) {
          content += `This stage validates functionality through automated test procedures.\n\n`;
        } else if (name.includes('Reporting')) {
          content += `This stage generates reports and metrics about system status and progress.\n\n`;
        } else {
          content += `This stage performs specific operations related to ${name.toLowerCase()}.\n\n`;
        }
      });
    } else if (context.lifecycleStages) {
      // Use lifecycle stages if workflow processes not available
      context.lifecycleStages.forEach(stage => {
        content += `### ${stage}\n\n`;
        
        // Add generic description based on stage name
        if (stage === 'Initialization') {
          content += `This stage sets up the initial environment and configuration for development.\n\n`;
        } else if (stage === 'Scaffold') {
          content += `This stage creates the basic structure and templates for new components.\n\n`;
        } else if (stage === 'Implementation') {
          content += `This stage involves developing the core functionality according to specifications.\n\n`;
        } else if (stage === 'Testing') {
          content += `This stage validates functionality through automated and manual testing.\n\n`;
        } else if (stage === 'Integration') {
          content += `This stage combines individual components into the larger system.\n\n`;
        } else if (stage === 'Validation') {
          content += `This stage performs final verification of system integrity and functionality.\n\n`;
        } else {
          content += `This stage performs specific operations related to ${stage.toLowerCase()}.\n\n`;
        }
      });
    } else {
      // Default stages if not in context
      ['Initialization', 'Development', 'Testing', 'Integration', 'Deployment'].forEach(stage => {
        content += `### ${stage}\n\n`;
        content += `This stage handles ${stage.toLowerCase()} operations within the workflow.\n\n`;
      });
    }
    
    return content;
  }
  
  /**
   * Generate prerequisites section for guides
   */
  generatePrerequisitesSection(type, context) {
    let content = 'Before proceeding, ensure you have the following prerequisites:\n\n';
    
    // Common prerequisites for DevLoop system
    content += `- Access to the DevLoop system\n`;
    content += `- Appropriate permissions for the operations described\n`;
    content += `- Basic understanding of DevLoop concepts and terminology\n`;
    
    // Add specific prerequisites based on document type
    if (type === 'api') {
      content += `- API access credentials\n`;
      content += `- Understanding of RESTful API concepts\n`;
      content += `- Familiarity with JSON request/response formats\n`;
    } else if (type === 'guide' || type === 'tutorial') {
      content += `- Command-line interface access\n`;
      content += `- Development environment set up (Node.js, Python, etc.)\n`;
      content += `- Required dependencies installed\n`;
    }
    
    content += `\nFor specific environment setup instructions, refer to the project's installation documentation.\n\n`;
    
    return content;
  }
  
  /**
   * Generate step-by-step instructions for guides
   */
  generateStepByStepSection(type, purpose, context) {
    let content = '';
    
    // Use common tasks if available in context
    if (context.commonTasks && context.commonTasks.length > 0) {
      // Take the first task as an example
      const task = context.commonTasks[0];
      
      content += `### ${task.name}\n\n`;
      content += `Follow these steps to ${task.name.toLowerCase()}:\n\n`;
      
      // Generate steps from the task
      task.steps.forEach((step, index) => {
        content += `${index + 1}. ${step}\n`;
        
        // Add substeps or examples for common steps
        if (step.includes('Define')) {
          content += `   - Clearly articulate the purpose and requirements\n`;
          content += `   - Document any dependencies or assumptions\n`;
        } else if (step.includes('Select')) {
          content += `   - Review available options in the system\n`;
          content += `   - Choose the most appropriate option for your needs\n`;
        } else if (step.includes('Run')) {
          content += `   - Execute the command with appropriate parameters\n`;
          content += `   - Verify successful execution\n`;
        } else if (step.includes('Validate')) {
          content += `   - Check for expected outputs\n`;
          content += `   - Verify system state after operation\n`;
        }
      });
      
      content += `\n`;
      
      // Add example command if available
      if (context.exampleCommands && context.exampleCommands.length > 0) {
        content += `Example command:\n\n\`\`\`bash\n${context.exampleCommands[0]}\n\`\`\`\n\n`;
      }
      
      // Add additional tasks as headings for further content
      if (context.commonTasks.length > 1) {
        content += `### Additional Tasks\n\n`;
        content += `The system also supports the following tasks:\n\n`;
        
        for (let i = 1; i < context.commonTasks.length; i++) {
          content += `- ${context.commonTasks[i].name}\n`;
        }
        content += `\nRefer to the specific documentation for each task for detailed instructions.\n\n`;
      }
    } else {
      // Generic step-by-step instructions if no tasks in context
      content += `### Basic Procedure\n\n`;
      content += `Follow these steps to complete the operation:\n\n`;
      content += `1. Prepare your environment\n`;
      content += `   - Ensure all prerequisites are met\n`;
      content += `   - Set up any required configurations\n`;
      content += `2. Execute the main command\n`;
      content += `   - Use the appropriate parameters for your needs\n`;
      content += `   - Verify command execution\n`;
      content += `3. Validate the results\n`;
      content += `   - Check for expected outputs\n`;
      content += `   - Verify system state after operation\n`;
      content += `4. Address any issues\n`;
      content += `   - Check logs for error messages\n`;
      content += `   - Refer to troubleshooting section if needed\n\n`;
      
      content += `For specific examples and advanced usage, refer to the examples section below.\n\n`;
    }
    
    return content;
  }
  
  /**
   * Generate authentication section for API docs
   */
  generateAuthenticationSection(context) {
    let content = '';
    
    if (context.authentication) {
      content += `The API uses ${context.authentication.method} for authentication.\n\n`;
      
      content += `Token lifetime: ${context.authentication.tokenLifetime}\n`;
      content += `Refresh endpoint: \`${context.authentication.refreshEndpoint}\`\n\n`;
    } else {
      content += `The API uses JWT token-based authentication. To authenticate your requests:\n\n`;
      content += `1. Obtain a token by calling the authentication endpoint\n`;
      content += `2. Include the token in the Authorization header of subsequent requests\n`;
      content += `3. Refresh the token before expiration to maintain session\n\n`;
    }
    
    content += `### Authentication Endpoint\n\n`;
    content += `\`\`\`\n`;
    content += `POST /api/v1/auth/login\n`;
    content += `Content-Type: application/json\n\n`;
    content += `{\n`;
    content += `  "username": "your_username",\n`;
    content += `  "password": "your_password"\n`;
    content += `}\n`;
    content += `\`\`\`\n\n`;
    
    content += `### Success Response\n\n`;
    content += `\`\`\`json\n`;
    content += `{\n`;
    content += `  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n`;
    content += `  "expiresAt": "2025-05-24T12:34:56Z"\n`;
    content += `}\n`;
    content += `\`\`\`\n\n`;
    
    content += `### Using the Token\n\n`;
    content += `Include the token in the Authorization header of your requests:\n\n`;
    content += `\`\`\`\n`;
    content += `GET /api/v1/features\n`;
    content += `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n`;
    content += `\`\`\`\n\n`;
    
    return content;
  }
  
  /**
   * Generate endpoints section for API docs
   */
  generateEndpointsSection(context) {
    let content = 'The API provides the following endpoints:\n\n';
    
    if (context.apiEndpoints) {
      // Use endpoints from context
      context.apiEndpoints.forEach(endpoint => {
        content += `### ${endpoint.path}\n\n`;
        content += `**Methods:** ${endpoint.methods.join(', ')}\n\n`;
        content += `**Purpose:** ${endpoint.purpose}\n\n`;
        
        // Generate example request/response for each method
        endpoint.methods.forEach(method => {
          content += `#### ${method} ${endpoint.path}\n\n`;
          
          if (method === 'GET') {
            content += `Request:\n\`\`\`\nGET ${endpoint.path}\nAuthorization: Bearer <token>\n\`\`\`\n\n`;
            content += `Response:\n\`\`\`json\n{\n  "data": [...],\n  "metadata": {\n    "totalCount": 42,\n    "page": 1,\n    "pageSize": 10\n  }\n}\n\`\`\`\n\n`;
          } else if (method === 'POST') {
            content += `Request:\n\`\`\`\nPOST ${endpoint.path}\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "name": "Example",\n  "description": "Description here"\n}\n\`\`\`\n\n`;
            content += `Response:\n\`\`\`json\n{\n  "id": "123",\n  "name": "Example",\n  "description": "Description here",\n  "createdAt": "2025-05-24T12:34:56Z"\n}\n\`\`\`\n\n`;
          } else if (method === 'PUT') {
            const idPath = endpoint.path.endsWith('/') ? `${endpoint.path}:id` : `${endpoint.path}/:id`;
            content += `Request:\n\`\`\`\nPUT ${idPath}\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "name": "Updated Example",\n  "status": "active"\n}\n\`\`\`\n\n`;
            content += `Response:\n\`\`\`json\n{\n  "id": "123",\n  "name": "Updated Example",\n  "description": "Description here",\n  "status": "active",\n  "updatedAt": "2025-05-24T13:45:56Z"\n}\n\`\`\`\n\n`;
          } else if (method === 'DELETE') {
            const idPath = endpoint.path.endsWith('/') ? `${endpoint.path}:id` : `${endpoint.path}/:id`;
            content += `Request:\n\`\`\`\nDELETE ${idPath}\nAuthorization: Bearer <token>\n\`\`\`\n\n`;
            content += `Response:\n\`\`\`json\n{\n  "success": true,\n  "message": "Resource deleted successfully"\n}\n\`\`\`\n\n`;
          }
        });
      });
    } else {
      // Default endpoints if not in context
      const endpoints = [
        { path: '/api/v1/features', methods: ['GET', 'POST'], purpose: 'Manage features' },
        { path: '/api/v1/features/:id', methods: ['GET', 'PUT', 'DELETE'], purpose: 'Operate on specific features' },
        { path: '/api/v1/status', methods: ['GET'], purpose: 'System status information' }
      ];
      
      endpoints.forEach(endpoint => {
        content += `### ${endpoint.path}\n\n`;
        content += `**Methods:** ${endpoint.methods.join(', ')}\n\n`;
        content += `**Purpose:** ${endpoint.purpose}\n\n`;
        
        // Add a basic example
        if (endpoint.methods.includes('GET')) {
          content += `Example:\n\`\`\`\nGET ${endpoint.path}\nAuthorization: Bearer <token>\n\`\`\`\n\n`;
        }
      });
    }
    
    // Add a note about common patterns
    content += `### Common Response Patterns\n\n`;
    
    if (context.commonResponses) {
      // Use common responses from context
      const { success, error } = context.commonResponses;
      
      content += `**Success Response (${success.status}):**\n\`\`\`json\n{\n  "result": {...},\n  "metadata": {...}\n}\n\`\`\`\n\n`;
      content += `**Error Response (${error.status}):**\n\`\`\`json\n{\n  "error": "Error message",\n  "code": "ERROR_CODE",\n  "details": [...]\n}\n\`\`\`\n\n`;
    } else {
      // Default common responses
      content += `**Success Response (200):**\n\`\`\`json\n{\n  "data": {...},\n  "metadata": {\n    "pagination": {...}\n  }\n}\n\`\`\`\n\n`;
      content += `**Error Response (400):**\n\`\`\`json\n{\n  "error": "Error message",\n  "code": "ERROR_CODE",\n  "details": [...]\n}\n\`\`\`\n\n`;
    }
    
    return content;
  }
  
  /**
   * Generate mock content for a document
   */
  async generateMockContent(document) {
    // Generate mock content based on document type
    let content = `# ${document.title || 'Untitled Document'}\n\n`;
    
    content += document.description ? `${document.description}\n\n` : '';
    
    if (document.categories.includes('Architecture')) {
      content += `## System Architecture

The Devloop system is organized into several key components:

### Core System
- Handles core functionality and orchestration
- Manages system state and configuration
- Provides foundational services for all components

### UI Dashboard
- Provides visualization of system state
- Offers interactive controls for system management
- Integrates with the core system via APIs

### Feature Manager
- Tracks feature development and status
- Manages feature dependencies
- Coordinates feature deployment and integration

## Component Relationships

\`\`\`
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   Core System   │◄────│  Feature Manager│
│                 │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   UI Dashboard  │     │  Testing System │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
\`\`\`

## Data Flow

1. Feature definitions flow from Feature Manager to Core System
2. Core System processes and orchestrates components
3. UI Dashboard visualizes state and provides controls
4. Testing System validates system integrity and performance`;
    } else if (document.categories.includes('Workflow')) {
      content += `## Workflow Overview

The Devloop workflow consists of several phases:

1. **Initialization** - Set up the development environment
2. **Feature Creation** - Define and initialize new features
3. **Implementation** - Develop the feature functionality
4. **Testing** - Validate feature behavior
5. **Integration** - Merge with existing system components
6. **Deployment** - Release to production environment

## Initialization

To initialize the Devloop environment:

\`\`\`bash
./system-core/scripts/devloop/initialize-milestone.sh <milestone-name>
\`\`\`

This will:
- Create the milestone directory structure
- Initialize configuration files
- Set up testing environment
- Register the milestone in the system

## Feature Creation

Features can be created using the following command:

\`\`\`bash
./system-core/scripts/devloop/scaffold_packet.py -t feature -i feature-XXXX-name \\
  -n "Feature Name" -d "Feature Description" \\
  --module module-name --phase phase-XX --milestone milestone-name
\`\`\`

## Implementation

When implementing a feature, follow these steps:

1. Update the feature packet with implementation details
2. Develop the required code components
3. Document the implementation approach
4. Update the feature status

## Testing

Execute feature tests with:

\`\`\`bash
./system-core/scripts/devloop/run-tests.sh <feature-path>
\`\`\`

## Integration

To integrate a completed feature:

\`\`\`bash
./system-core/scripts/devloop/run-feature.sh <feature-path>
\`\`\`

## Deployment

Finalize deployment with:

\`\`\`bash
./system-core/scripts/devloop/generate-progress-reports.sh
\`\`\``;
    } else if (document.categories.includes('Template')) {
      content += `## Template Usage

This template should be used when creating new ${document.title.toLowerCase().includes('feature') ? 'features' : 'components'}.

### Structure

\`\`\`
# [Component Name]

## Overview

[Brief description of the component and its purpose]

## Implementation Details

[Technical implementation details]

## Configuration

[Configuration options and settings]

## Dependencies

[List of dependencies]

## Testing

[Testing approach and requirements]

## Usage Examples

[Examples of how to use the component]
\`\`\`

### Placeholders

- \`[Component Name]\` - Replace with the name of your component
- \`[Brief description...]\` - Provide a concise description
- \`[Technical implementation...]\` - Detail the implementation approach
- \`[Configuration options...]\` - List all configuration options
- \`[List of dependencies]\` - Enumerate all dependencies
- \`[Testing approach...]\` - Describe how to test the component
- \`[Examples...]\` - Provide usage examples

### Best Practices

1. Be concise but comprehensive
2. Include code examples where appropriate
3. Document all configuration options
4. Provide clear testing instructions
5. Include troubleshooting guidance`;
    } else {
      content += `## Overview

${document.description || 'No description available.'}

## Purpose

This document provides information about ${document.title}.

## Related Components

${document.components.join(', ')}

## Tags

${document.tags ? document.tags.join(', ') : 'No tags'}

## Last Updated

${new Date(document.lastModified).toLocaleDateString()}`;
    }
    
    return content;
  }
}

const documentManagerService = new DocumentManagerService();
export default documentManagerService;