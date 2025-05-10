import React, { useState } from 'react';

/**
 * UIToolbar component that provides access to various UI tools
 * in a consistent toolbar matching the design
 */
const UIToolbar = ({ 
  onOpenChangelog, 
  onOpenVisualDiff, 
  onCaptureSnapshot,
  componentNames = [] 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Handle selecting a component and triggering a snapshot
  const handleCaptureSnapshot = () => {
    if (onCaptureSnapshot) {
      onCaptureSnapshot();
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40">
      <div className="flex items-center h-14 px-4">
        <div className="mr-4 text-xs font-semibold uppercase text-gray-400">
          Tools
        </div>
        
        <div className="flex space-x-2">
          {/* Play Button (Video Capture) */}
          <button
            onClick={handleCaptureSnapshot}
            className="w-10 h-10 bg-gray-800 hover:bg-gray-700 text-white rounded flex items-center justify-center"
            title="Capture Visual Snapshot"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* UI Changelog */}
          <button
            onClick={() => onOpenChangelog && onOpenChangelog()}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center justify-center"
            title="View UI Changelog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 1H8.828a2 2 0 00-1.414.586L6.293 2.707A1 1 0 015.586 3H4zm7 9a1 1 0 100-2h-3a1 1 0 100 2h3zm2-6a1 1 0 010 2h-5a1 1 0 010-2h5zm0 4a1 1 0 010 2h-7a1 1 0 010-2h7z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Visual Diff */}
          <button
            onClick={() => onOpenVisualDiff && onOpenVisualDiff()}
            className="w-10 h-10 bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center justify-center"
            title="Visual Diff Comparison"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </button>
          
          {/* Component Versions */}
          <button
            onClick={() => onOpenVisualDiff && onOpenVisualDiff()}
            className="w-10 h-10 bg-green-600 hover:bg-green-500 text-white rounded flex items-center justify-center"
            title="Version History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UIToolbar;