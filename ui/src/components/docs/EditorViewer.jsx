import React, { useState, useEffect } from 'react';
import MarkdownEditor from '@uiw/react-markdown-editor';

/**
 * EditorViewer Component
 * 
 * Side-by-side markdown editor and preview component with save functionality
 */
const EditorViewer = ({ document, onSave }) => {
  const [markdown, setMarkdown] = useState('');
  const [editorHeight, setEditorHeight] = useState('600px');
  const [editMode, setEditMode] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  
  // Initialize editor content when document changes
  useEffect(() => {
    if (document && document.content) {
      setMarkdown(document.content);
    }
  }, [document]);
  
  // Adjust editor height based on window size
  useEffect(() => {
    const updateHeight = () => {
      // Take 80% of the viewport height
      const newHeight = Math.max(500, window.innerHeight * 0.7);
      setEditorHeight(`${newHeight}px`);
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
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
  
  const handleSave = () => {
    if (onSave && typeof onSave === 'function') {
      onSave(document.id, markdown);
    } else {
      alert('Save function not available in demo mode');
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Document header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-white">{document.title}</h1>
          <div className="text-sm text-gray-400 mt-1">{document.path}</div>
        </div>
        <div className="flex space-x-2">
          <button
            className="ml-2 text-gray-400 hover:text-white px-2 py-1 rounded"
            onClick={() => setShowMetadata(!showMetadata)}
          >
            {showMetadata ? 'Hide Info' : 'Show Info'}
          </button>
          <button 
            className={`px-2 py-1 rounded transition text-white ${editMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'View Mode' : 'Edit Mode'}
          </button>
          {editMode && (
            <button 
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
              onClick={handleSave}
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
      
      {/* Metadata panel */}
      {showMetadata && (
        <div className="border-b border-gray-700 bg-blue-900/10 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      
      {/* Markdown Editor */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: editorHeight }}>
        <MarkdownEditor
          value={markdown}
          onChange={(editor, data, value) => setMarkdown(value)}
          height={editorHeight}
          visible={true}
          theme="dark"
          readOnly={!editMode}
          preview={!editMode ? 'preview' : 'live'}
          toolbars={editMode ? [
            'header', 'bold', 'italic', 'strike', 'underline', 'quote', 
            'list', 'ordered-list', 'check', 'link', 'table', 'code', 'fullscreen',
          ] : []}
          enableScroll={true}
        />
      </div>
    </div>
  );
};

export default EditorViewer;