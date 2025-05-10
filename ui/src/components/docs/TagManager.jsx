import React, { useState, useEffect } from 'react';

/**
 * TagManager Component
 * 
 * Allows users to add, edit, and remove tags on a document
 */
const TagManager = ({ document, onUpdate }) => {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [showTagEditor, setShowTagEditor] = useState(false);
  
  // Initialize tags when document changes
  useEffect(() => {
    if (document && document.tags) {
      setTags([...document.tags]);
    } else {
      setTags([]);
    }
  }, [document]);
  
  const handleAddTag = () => {
    if (newTag.trim() === '') return;
    
    // Don't add duplicate tags
    if (tags.includes(newTag.trim())) {
      alert('This tag already exists');
      return;
    }
    
    const updatedTags = [...tags, newTag.trim()];
    setTags(updatedTags);
    setNewTag('');
    
    // Call update callback
    if (onUpdate && typeof onUpdate === 'function') {
      onUpdate(document.id, { tags: updatedTags });
    }
  };
  
  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    // Call update callback
    if (onUpdate && typeof onUpdate === 'function') {
      onUpdate(document.id, { tags: updatedTags });
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTag();
    }
  };
  
  if (!document) {
    return null;
  }
  
  return (
    <div className="p-4 border-b border-gray-700 bg-gray-800/50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-white">Document Tags</h3>
        <button 
          className="text-blue-400 text-sm hover:text-blue-300" 
          onClick={() => setShowTagEditor(!showTagEditor)}
        >
          {showTagEditor ? 'Hide Editor' : 'Manage Tags'}
        </button>
      </div>
      
      {/* Tag display */}
      <div className="flex flex-wrap gap-1 mb-3">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span 
              key={tag} 
              className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs flex items-center"
            >
              {tag}
              {showTagEditor && (
                <button 
                  className="ml-2 text-gray-400 hover:text-red-400"
                  onClick={() => handleRemoveTag(tag)}
                >
                  ×
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-gray-500 text-xs">No tags</span>
        )}
      </div>
      
      {/* Tag editor */}
      {showTagEditor && (
        <div className="mt-2">
          <div className="flex">
            <input 
              type="text" 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a new tag..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-l text-white px-3 py-1 text-sm focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleAddTag}
              className="bg-blue-600 text-white px-3 py-1 rounded-r text-sm hover:bg-blue-700 transition"
              disabled={newTag.trim() === ''}
            >
              Add
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Press Enter to add a tag. Tags help with document categorization and search.
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;