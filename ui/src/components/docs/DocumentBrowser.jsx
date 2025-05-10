import React, { useState } from 'react';

/**
 * Document Browser Component
 * 
 * Displays a list of documents with filtering capabilities
 * by category and component.
 */
const DocumentBrowser = ({ 
  documents, 
  categories = [], 
  components = [],
  filter, 
  onFilterChange, 
  onDocumentSelect,
  searchResults,
  selectedDocument
}) => {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'filters'
  
  // Handle category filter change
  const handleCategoryChange = (e) => {
    onFilterChange({ ...filter, category: e.target.value });
  };
  
  // Handle component filter change
  const handleComponentChange = (e) => {
    onFilterChange({ ...filter, component: e.target.value });
  };
  
  // Get filtered documents based on current filter
  const getFilteredDocuments = () => {
    // If there are search results, use those instead
    if (searchResults) {
      return searchResults;
    }
    
    // Otherwise filter based on category and component
    return documents.filter(doc => {
      // Filter by category
      if (filter.category !== 'all' && !doc.categories.includes(filter.category)) {
        return false;
      }
      
      // Filter by component
      if (filter.component !== 'all' && !doc.components.includes(filter.component)) {
        return false;
      }
      
      return true;
    });
  };
  
  const filteredDocuments = getFilteredDocuments();
  
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 bg-gray-800">
        <button
          className={`px-4 py-2 text-sm ${activeTab === 'browse' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse
        </button>
        <button
          className={`px-4 py-2 text-sm ${activeTab === 'filters' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('filters')}
        >
          Filters
        </button>
      </div>
      
      {/* Filters */}
      {activeTab === 'filters' && (
        <div className="p-3 border-b border-gray-700 bg-gray-800/50">
          <div className="mb-3">
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-sm text-white"
              value={filter.category}
              onChange={handleCategoryChange}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Component</label>
            <select
              className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-sm text-white"
              value={filter.component}
              onChange={handleComponentChange}
            >
              <option value="all">All Components</option>
              {components.map(component => (
                <option key={component} value={component}>{component}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Document count */}
      <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/30 text-xs text-gray-400 flex justify-between items-center">
        <div>
          {searchResults 
            ? `${filteredDocuments.length} search results` 
            : `${filteredDocuments.length} documents`}
        </div>
        
        {/* Clear filters button */}
        {(filter.category !== 'all' || filter.component !== 'all') && (
          <button
            className="text-blue-400 hover:text-blue-300 text-xs"
            onClick={() => onFilterChange({ category: 'all', component: 'all' })}
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            No documents found
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredDocuments.map(doc => (
              <div 
                key={doc.id}
                className={`p-3 cursor-pointer transition hover:bg-gray-700/30 ${selectedDocument?.id === doc.id ? 'bg-blue-900/20 border-l-2 border-blue-500' : ''}`}
                onClick={() => onDocumentSelect(doc)}
              >
                <div className="font-medium text-white mb-1">{doc.title}</div>
                <div className="text-xs text-gray-400 mb-1 truncate">{doc.path}</div>
                
                {/* Document metadata */}
                <div className="flex flex-wrap mt-1 gap-1">
                  {/* Display up to 2 categories */}
                  {doc.categories.slice(0, 2).map(cat => (
                    <span 
                      key={cat}
                      className="px-1.5 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded"
                    >
                      {cat}
                    </span>
                  ))}
                  
                  {/* Indicator for additional categories */}
                  {doc.categories.length > 2 && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                      +{doc.categories.length - 2}
                    </span>
                  )}
                  
                  {/* Component badge (just the first one) */}
                  {doc.components && doc.components.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-900/50 text-green-300 rounded ml-auto">
                      {doc.components[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentBrowser;