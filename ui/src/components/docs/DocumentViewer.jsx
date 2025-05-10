import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Document Viewer Component
 * 
 * Renders a Markdown document with metadata and actions.
 */
const DocumentViewer = ({ document }) => {
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
        {document.content ? (
          <div>
            <div className="mb-4">
              <button 
                onClick={() => {
                  const textarea = document.createElement('textarea');
                  textarea.value = document.content;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  alert('Document content copied to clipboard!');
                }}
                className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition"
              >
                Copy Content
              </button>
            </div>
            
            {typeof document.content === 'string' ? (
              <div>
                <ReactMarkdown 
                  className="prose prose-invert prose-sm max-w-none"
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom renderers for markdown elements
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-6 mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-5 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-white mt-4 mb-2" {...props} />,
                    h4: ({node, ...props}) => <h4 className="text-base font-semibold text-white mt-3 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-gray-300 mb-4 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 text-gray-300 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 text-gray-300 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="text-gray-300 mb-1" {...props} />,
                    a: ({node, href, ...props}) => (
                      <a 
                        href={href} 
                        className="text-blue-400 hover:text-blue-300 underline" 
                        target={href.startsWith('http') ? '_blank' : undefined}
                        {...props} 
                      />
                    ),
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-gray-600 pl-4 py-1 italic text-gray-400" {...props} />
                    ),
                    code: ({node, inline, className, children, ...props}) => {
                      return inline ? (
                        <code className="bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-gray-300" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-gray-800 p-3 rounded-md text-sm font-mono text-gray-300 overflow-x-auto">
                          <code className="language-javascript">{children}</code>
                        </pre>
                      );
                    },
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="min-w-full border-collapse text-sm text-gray-300" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => <thead className="bg-gray-800" {...props} />,
                    th: ({node, ...props}) => (
                      <th className="px-4 py-2 text-left font-semibold border border-gray-700" {...props} />
                    ),
                    td: ({node, ...props}) => <td className="px-4 py-2 border border-gray-700" {...props} />,
                    hr: ({node, ...props}) => <hr className="border-gray-700 my-4" {...props} />,
                    img: ({node, ...props}) => (
                      <img 
                        className="max-w-full h-auto rounded-md my-4" 
                        {...props} 
                        alt={props.alt || 'Document image'} 
                      />
                    )
                  }}
                >
                  {document.content}
                </ReactMarkdown>
                
                {/* Fallback plain text rendering in case ReactMarkdown fails */}
                <div className="mt-4 p-4 border border-gray-700 rounded hidden">
                  <h3 className="text-lg font-bold text-white mb-2">Raw Content (Fallback)</h3>
                  <pre className="whitespace-pre-wrap text-gray-300 text-sm font-mono overflow-auto">
                    {document.content}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-white">
                <h3 className="text-lg font-bold text-red-400 mb-4">Error: Document content is not in text format</h3>
                <pre className="bg-gray-800 p-3 rounded text-gray-300 overflow-auto">
                  {JSON.stringify(document.content, null, 2)}
                </pre>
              </div>
            )}
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

export default DocumentViewer;