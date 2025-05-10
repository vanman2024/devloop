import React, { useState } from 'react';

/**
 * Simple Document Viewer Component
 * 
 * A basic component that displays document content without using
 * React-Markdown, as a fallback option.
 */
const SimpleDocumentViewer = ({ document }) => {
  const [showMetadata, setShowMetadata] = useState(false);
  
  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">No document selected</p>
      </div>
    );
  }
  
  const formattedDate = document.lastModified 
    ? new Date(document.lastModified).toLocaleDateString() 
    : 'Unknown';
  
  return (
    <div className="h-full flex flex-col">
      {/* Document header */}
      <div className="p-4 border-b border-gray-700 flex flex-col">
        <div className="flex justify-between items-start">
          <h1 className="text-xl font-bold text-white">{document.title}</h1>
          <button
            className="ml-2 text-gray-400 hover:text-white"
            onClick={() => setShowMetadata(!showMetadata)}
          >
            {showMetadata ? 'Hide Info' : 'Show Info'}
          </button>
        </div>
        
        <div className="text-sm text-gray-400 mt-1">{document.path}</div>
        
        {document.description && (
          <div className="text-sm text-gray-300 mt-2">{document.description}</div>
        )}
      </div>
      
      {/* Metadata panel */}
      {showMetadata && (
        <div className="border-b border-gray-700 bg-blue-900/10 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Last Updated</div>
              <div className="text-sm text-white">{formattedDate}</div>
            </div>
            
            <div>
              <div className="text-xs text-gray-400 mb-1">Word Count</div>
              <div className="text-sm text-white">{document.wordCount || 'Unknown'}</div>
            </div>
            
            <div className="col-span-2">
              <div className="text-xs text-gray-400 mb-1">Categories</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {document.categories.map(category => (
                  <span 
                    key={category}
                    className="px-1.5 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="col-span-2">
              <div className="text-xs text-gray-400 mb-1">Components</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {document.components.map(component => (
                  <span 
                    key={component}
                    className="px-1.5 py-0.5 text-xs bg-green-900/50 text-green-300 rounded"
                  >
                    {component}
                  </span>
                ))}
              </div>
            </div>
            
            {document.tags && document.tags.length > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-gray-400 mb-1">Tags</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {document.tags.map(tag => (
                    <span 
                      key={tag}
                      className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Document content */}
      <div className="flex-1 overflow-y-auto p-4 markdown-content">
        <div className="mb-4">
          <button 
            onClick={() => {
              if (document.content) {
                const textarea = document.createElement('textarea');
                textarea.value = document.content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Document content copied to clipboard!');
              }
            }}
            className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition"
          >
            Copy Content
          </button>
        </div>
        
        {document.content ? (
          <div className="whitespace-pre-wrap text-gray-300 text-sm font-mono">
            {document.content}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-gray-500">No content available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDocumentViewer;