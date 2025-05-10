import React, { useState, useEffect } from 'react';
import documentManagerService from '../services/documentManagerService';
import DocumentViewer from '../components/docs/DocumentViewer';
import SimpleDocumentViewer from '../components/docs/SimpleDocumentViewer';
import UltraSimpleViewer from '../components/docs/UltraSimpleViewer';
import EditorViewer from '../components/docs/EditorViewer';
import TagManager from '../components/docs/TagManager';
import CreateDocumentModal from '../components/docs/CreateDocumentModal';
import DocumentBrowser from '../components/docs/DocumentBrowser';
import DocumentStats from '../components/docs/DocumentStats';
import AIDocumentAssistant from '../components/docs/AIDocumentAssistant';
import StatusFilters from '../components/StatusFilters.jsx';

/**
 * Document Manager Page
 * 
 * Provides a comprehensive interface for browsing, searching,
 * and managing documentation across the project.
 */
const DocumentManager = () => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filter, setFilter] = useState({ 
    category: 'all',
    component: 'all'
  });
  const [error, setError] = useState(null);
  const [viewerType, setViewerType] = useState('editor'); // 'markdown', 'simple', 'ultra', or 'editor'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Load documents on mount
  useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await documentManagerService.getAllDocuments();
        setDocuments(data.documents);
        setCategories(data.categories);
        setComponents(data.components);
      } catch (err) {
        console.error('Failed to load documents:', err);
        setError('Failed to load documents. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    loadDocuments();
  }, []);
  
  // Handle document selection
  const handleDocumentSelect = async (document) => {
    try {
      setLoading(true);
      console.log("Selected document:", document);
      
      // Always load the full document to ensure we have the latest content
      console.log("Loading full document content...");
      const fullDocument = await documentManagerService.getDocument(document.id);
      console.log("Loaded full document:", fullDocument);
      
      // Ensure document always has content
      if (!fullDocument.content) {
        fullDocument.content = `# ${fullDocument.title}\n\n${fullDocument.description || 'No description available.'}\n\nThis document has no content.`;
      }
      
      // Ensure content is a string
      if (typeof fullDocument.content !== 'string') {
        fullDocument.content = JSON.stringify(fullDocument.content, null, 2);
      }
      
      setSelectedDocument(fullDocument);
      
      // Set default viewer type to 'ultra' for maximum compatibility
      setViewerType('ultra');
      
    } catch (err) {
      console.error('Failed to load document:', err);
      setError('Failed to load document. Please try again later.');
      
      // Create a fallback document if loading fails
      if (document) {
        const fallbackDoc = { 
          ...document,
          content: `# ${document.title}\n\nError loading document content.\n\nPlease try again later.` 
        };
        setSelectedDocument(fallbackDoc);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search
  const handleSearch = async (query) => {
    if (!query) {
      setSearchResults(null);
      return;
    }
    
    try {
      setLoading(true);
      const results = await documentManagerService.searchDocuments(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearchResults(null); // Clear search when filter changes
  };
  
  // Handle document save
  const handleDocumentSave = async (id, content) => {
    try {
      setLoading(true);
      await documentManagerService.saveToFileSystem(id, content);
      
      // Refresh the document
      const updatedDocument = await documentManagerService.getDocument(id);
      setSelectedDocument(updatedDocument);
      
      // Show success message
      console.log("Document saved successfully");
    } catch (err) {
      console.error("Failed to save document:", err);
      setError("Failed to save document. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle document tag update
  const handleTagUpdate = async (id, updates) => {
    try {
      await documentManagerService.updateDocument(id, updates);
      
      // Refresh the document
      const updatedDocument = await documentManagerService.getDocument(id);
      setSelectedDocument(updatedDocument);
    } catch (err) {
      console.error("Failed to update document tags:", err);
      setError("Failed to update document tags. Please try again later.");
    }
  };
  
  // Handle document creation
  const handleCreateDocument = async (document) => {
    try {
      setLoading(true);
      const newDocument = await documentManagerService.createDocument(document);
      
      // Refresh documents list
      const data = await documentManagerService.getAllDocuments();
      setDocuments(data.documents);
      setCategories(data.categories);
      setComponents(data.components);
      
      // Select the new document
      handleDocumentSelect(newDocument);
      
      // Show success message
      console.log("Document created successfully:", newDocument.title);
    } catch (err) {
      console.error("Failed to create document:", err);
      setError("Failed to create document. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex px-6 py-4 items-center justify-between border-b border-gray-700">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white mr-4">Document Manager</h1>
          <p className="text-gray-400 text-sm">Browse, search, and manage documentation across the system</p>
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <span className="mr-2">+</span>
          New Document
        </button>
      </div>
      
      {error && (
        <div className="m-4 p-3 bg-red-900/40 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden p-4 space-x-4">
        {/* Left Sidebar */}
        <div className="w-1/4 h-full flex flex-col">
          <div className="bg-[#1e293b] rounded-lg shadow-md overflow-hidden flex flex-col h-full">
            <div className="p-3 border-b border-gray-700">
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" 
                  placeholder="Search documentation..."
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <button 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => handleSearch('')}
                >
                  {searchResults ? 'Clear' : '🔍'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <DocumentBrowser 
                documents={documents}
                categories={categories}
                components={components}
                filter={filter}
                onFilterChange={handleFilterChange}
                onDocumentSelect={handleDocumentSelect}
                searchResults={searchResults}
                selectedDocument={selectedDocument}
              />
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="w-2/4 h-full flex flex-col">
          <div className="bg-[#1e293b] rounded-lg shadow-md overflow-hidden flex flex-col h-full">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Document Viewer</h2>
              {selectedDocument && (
                <div className="flex space-x-2">
                  <button 
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                    onClick={() => {
                      if (selectedDocument.content) {
                        const blob = new Blob([selectedDocument.content], { type: 'text/markdown' });
                        const href = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = href;
                        link.download = selectedDocument.title + '.md';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(href);
                      }
                    }}
                  >
                    Download
                  </button>
                  <div className="flex space-x-1">
                    <button 
                      className={`px-2 py-1 text-white text-xs rounded transition ${viewerType === 'editor' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                      onClick={() => setViewerType('editor')}
                    >
                      Editor
                    </button>
                    <button 
                      className={`px-2 py-1 text-white text-xs rounded transition ${viewerType === 'markdown' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                      onClick={() => setViewerType('markdown')}
                    >
                      Markdown
                    </button>
                    <button 
                      className={`px-2 py-1 text-white text-xs rounded transition ${viewerType === 'simple' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                      onClick={() => setViewerType('simple')}
                    >
                      Simple
                    </button>
                    <button 
                      className={`px-2 py-1 text-white text-xs rounded transition ${viewerType === 'ultra' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                      onClick={() => setViewerType('ultra')}
                    >
                      Basic
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : selectedDocument ? (
                <>
                  {/* Tag Manager */}
                  <TagManager document={selectedDocument} onUpdate={handleTagUpdate} />
                  
                  {/* Document Viewer/Editor */}
                  {viewerType === 'editor' ? (
                    <EditorViewer document={selectedDocument} onSave={handleDocumentSave} />
                  ) : viewerType === 'ultra' ? (
                    <UltraSimpleViewer document={selectedDocument} />
                  ) : viewerType === 'simple' ? (
                    <SimpleDocumentViewer document={selectedDocument} />
                  ) : (
                    <DocumentViewer document={selectedDocument} />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                  </svg>
                  <p>Select a document to view its contents</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-1/4 h-full flex flex-col">
          <div className="bg-[#1e293b] rounded-lg shadow-md overflow-hidden flex flex-col h-full">
            <div className="p-3 border-b border-gray-700">
              <h2 className="font-semibold text-white">
                {selectedDocument ? 'AI Document Assistant' : 'Documentation Stats'}
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto">
              {selectedDocument ? (
                <AIDocumentAssistant document={selectedDocument} />
              ) : (
                <DocumentStats documents={documents} />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Document Modal */}
      <CreateDocumentModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateDocument}
        categories={categories}
        components={components}
      />
    </div>
  );
};

export default DocumentManager;