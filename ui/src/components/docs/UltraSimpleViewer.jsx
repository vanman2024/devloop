import React from 'react';

/**
 * Ultra Simple Document Viewer
 * 
 * Absolute bare minimum viewer that just shows the content as text
 */
const UltraSimpleViewer = ({ document }) => {
  if (!document) {
    return <div>No document selected</div>;
  }

  return (
    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: 'white', fontSize: '24px' }}>{document.title}</h1>
        <div style={{ color: '#aaa', fontSize: '14px' }}>{document.path}</div>
      </div>
      
      <pre style={{ 
        whiteSpace: 'pre-wrap', 
        fontFamily: 'monospace', 
        color: '#ddd',
        backgroundColor: '#1e293b',
        padding: '20px',
        borderRadius: '8px',
        overflow: 'auto'
      }}>
        {document.content || "No content available"}
      </pre>
      
      {/* Debug info */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
        <h3 style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>Debug Info:</h3>
        <div style={{ color: '#aaa', fontSize: '12px' }}>
          <p>Content type: {typeof document.content}</p>
          <p>Content length: {document.content ? document.content.length : 0}</p>
          <p>Has categories: {document.categories ? 'Yes' : 'No'}</p>
          <p>Has components: {document.components ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default UltraSimpleViewer;