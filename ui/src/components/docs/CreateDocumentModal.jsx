import React, { useState, useEffect } from 'react';
import documentManagerService from '../../services/documentManagerService';
import DocumentChatAssistant from './DocumentChatAssistant';

/**
 * CreateDocumentModal Component
 * 
 * Modal for creating new documentation with AI-powered metadata suggestions
 * and automatic organization.
 */
const CreateDocumentModal = ({ isOpen, onClose, onSubmit, categories, components }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [path, setPath] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customComponent, setCustomComponent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [showAiHelp, setShowAiHelp] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(true);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState('waiting'); // waiting, analyzing, completed
  const [showChatAssistant, setShowChatAssistant] = useState(false);
  
  // Use AI to analyze and suggest metadata when title/description changes
  useEffect(() => {
    const debouncedAnalyze = setTimeout(async () => {
      if (title && (title.length > 3 || description.length > 10)) {
        await analyzeDocument();
      }
    }, 1000);
    
    return () => clearTimeout(debouncedAnalyze);
  }, [title, description, content]);
  
  // Automatically apply AI suggestions when they arrive
  useEffect(() => {
    if (suggestions && aiAssisted) {
      applyAiSuggestions();
    }
  }, [suggestions, aiAssisted]);
  
  // Analyze document and suggest metadata
  const analyzeDocument = async () => {
    if (!title) return;
    
    try {
      setAnalyzing(true);
      setAiAnalysisStatus('analyzing');
      const initialContent = `# ${title}\n\n${description || 'No description provided.'}\n\n## Overview\n\nAdd content here...\n`;
      const results = await documentManagerService.analyzeDocumentContent(title, description, initialContent);
      setSuggestions(results);
      setAiAnalysisStatus('completed');
      
      // If path is empty or AI assisted is enabled, set it to the suggested path
      if (!path || aiAssisted) {
        setPath(results.suggestedPath);
      }
      
      // If AI assisted is enabled or no category is selected, set the suggested categories
      if (aiAssisted || !selectedCategory) {
        if (results.suggestedCategories.length > 0) {
          const category = results.suggestedCategories[0];
          if (categories.includes(category)) {
            setSelectedCategory(category);
          } else {
            setSelectedCategory('custom');
            setCustomCategory(category);
          }
        }
      }
      
      // If AI assisted is enabled or no component is selected, set the suggested components
      if (aiAssisted || !selectedComponent) {
        if (results.suggestedComponents.length > 0) {
          const component = results.suggestedComponents[0];
          if (components.includes(component)) {
            setSelectedComponent(component);
          } else {
            setSelectedComponent('custom');
            setCustomComponent(component);
          }
        }
      }
      
      // If AI assisted is enabled or no tags are added, set the suggested tags
      if ((aiAssisted || tags.length === 0) && results.suggestedTags.length > 0) {
        setTags(results.suggestedTags);
      }
      
      setShowAiHelp(true);
    } catch (err) {
      console.error('Error analyzing document:', err);
      setAiAnalysisStatus('waiting');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Apply all AI suggestions at once
  const applyAiSuggestions = () => {
    if (!suggestions) return;
    
    // Apply path suggestion
    setPath(suggestions.suggestedPath);
    
    // Apply category suggestion
    if (suggestions.suggestedCategories.length > 0) {
      const category = suggestions.suggestedCategories[0];
      if (categories.includes(category)) {
        setSelectedCategory(category);
      } else {
        setSelectedCategory('custom');
        setCustomCategory(category);
      }
    }
    
    // Apply component suggestion
    if (suggestions.suggestedComponents.length > 0) {
      const component = suggestions.suggestedComponents[0];
      if (components.includes(component)) {
        setSelectedComponent(component);
      } else {
        setSelectedComponent('custom');
        setCustomComponent(component);
      }
    }
    
    // Apply tag suggestions
    if (suggestions.suggestedTags.length > 0) {
      setTags(suggestions.suggestedTags);
    }
  };
  
  const reset = () => {
    setTitle('');
    setDescription('');
    setContent('');
    setPath('');
    setSelectedCategory('');
    setSelectedComponent('');
    setCustomCategory('');
    setCustomComponent('');
    setTags([]);
    setTagInput('');
    setSuggestions(null);
    setShowAiHelp(false);
    setAiAnalysisStatus('waiting');
    // Keep AI assistance setting between sessions
  };
  
  const handleClose = () => {
    reset();
    onClose();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get final category and component
    const finalCategory = selectedCategory === 'custom' ? customCategory : selectedCategory;
    const finalComponent = selectedComponent === 'custom' ? customComponent : selectedComponent;
    
    // Create initial content if not provided
    const documentContent = content || `# ${title}\n\n${description || ''}\n\n## Overview\n\nAdd content here...\n`;
    
    // Final AI review - ensure we have the best path, metadata and content
    let finalPath = path;
    let finalCategories = finalCategory ? [finalCategory] : [];
    let finalComponents = finalComponent ? [finalComponent] : [];
    let finalTags = [...tags];
    let finalContent = documentContent;
    
    // Always perform AI analysis when auto-assignment is on or missing required fields
    if (aiAssisted || !finalPath || finalCategories.length === 0 || finalComponents.length === 0) {
      try {
        // Final analysis to generate all metadata
        setAnalyzing(true);
        const finalAnalysis = await documentManagerService.analyzeDocumentContent(title, description, documentContent);
        
        // If current path is empty or was auto-suggested, use the latest path suggestion
        if (!finalPath || path === suggestions?.suggestedPath || aiAssisted) {
          finalPath = finalAnalysis.suggestedPath;
        }
        
        // For categories, use AI suggestion if empty or add important missing ones
        if (finalCategories.length === 0) {
          // If no categories, use all AI suggestions
          finalCategories = finalAnalysis.suggestedCategories;
        } else if (aiAssisted) {
          // If we have categories and AI is on, add important missing ones
          finalAnalysis.suggestedCategories.forEach(suggestedCat => {
            // Only add high-confidence, distinctive categories not already included
            if (!finalCategories.includes(suggestedCat) && 
                suggestedCat !== 'Documentation' && 
                suggestedCat !== 'General') {
              finalCategories.push(suggestedCat);
            }
          });
        }
        
        // For components, use AI suggestion if empty or add important ones
        if (finalComponents.length === 0) {
          // If no components, use all AI suggestions
          finalComponents = finalAnalysis.suggestedComponents;
        } else if (aiAssisted) {
          // If we have components and AI is on, add important missing ones
          finalAnalysis.suggestedComponents.forEach(suggestedComp => {
            if (!finalComponents.includes(suggestedComp) && 
                suggestedComp !== 'General') {
              finalComponents.push(suggestedComp);
            }
          });
        }
        
        // For tags, always combine existing with new suggestions
        finalAnalysis.suggestedTags.forEach(suggestedTag => {
          if (!finalTags.includes(suggestedTag)) {
            finalTags.push(suggestedTag);
          }
        });
        
        // Ensure we always have at least one category and component
        if (finalCategories.length === 0) {
          finalCategories = ['Documentation'];
        }
        
        if (finalComponents.length === 0) {
          finalComponents = ['General'];
        }
        
        // Limit tags to a reasonable number
        finalTags = finalTags.slice(0, 8);
        
        // Generate comprehensive document content with system context awareness
        // Determine document type and purpose from categories
        let docType = 'general';
        let docPurpose = 'general';
        
        // Map categories to document types
        if (finalCategories.includes('Architecture')) docType = 'architecture';
        else if (finalCategories.includes('Workflow') || finalCategories.includes('Process')) docType = 'workflow';
        else if (finalCategories.includes('API')) docType = 'api';
        else if (finalCategories.includes('Guide')) docType = 'guide';
        else if (finalCategories.includes('Template')) docType = 'template';
        else if (finalCategories.includes('Reference')) docType = 'reference';
        
        // Map categories to document purpose
        if (finalCategories.includes('Learning')) docPurpose = 'learning';
        else if (finalCategories.includes('Implementation')) docPurpose = 'implementation';
        else if (finalCategories.includes('Troubleshooting')) docPurpose = 'troubleshooting';
        else if (finalCategories.includes('Planning')) docPurpose = 'planning';
        else if (finalCategories.includes('Best Practices')) docPurpose = 'best-practices';
        
        // Only replace the content if it's the default/empty content or AI assistance is on
        if (aiAssisted || content === '') {
          // Generate comprehensive document content
          finalContent = await documentManagerService.generateDocumentContent(
            title, 
            description, 
            docType, 
            docPurpose, 
            finalComponents
          );
        }
        
        setAnalyzing(false);
      } catch (err) {
        console.error('Error during final document analysis:', err);
        setAnalyzing(false);
        // Continue with existing values if analysis fails
        
        // Ensure minimum values are set even if analysis fails
        if (!finalPath) finalPath = '/docs/untitled.md';
        if (finalCategories.length === 0) finalCategories = ['Documentation'];
        if (finalComponents.length === 0) finalComponents = ['General'];
      }
    }
    
    // Create document object
    const document = {
      title,
      description,
      path: finalPath,
      categories: finalCategories,
      components: finalComponents,
      tags: finalTags,
      content: finalContent
    };
    
    onSubmit(document);
    reset();
    onClose();
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() === '') return;
    if (tags.includes(tagInput.trim())) return;
    
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };
  
  const handleRemoveTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  // Handle chat assistant content generation
  const handleChatContentGenerate = (generatedContent) => {
    setContent(prev => {
      if (!prev) return generatedContent;
      return prev + '\n\n' + generatedContent;
    });
  };
  
  // Handle chat assistant metadata suggestions
  const handleChatMetadataSuggest = (metadata) => {
    if (metadata.categories && metadata.categories.length > 0) {
      const category = metadata.categories[0];
      if (categories.includes(category)) {
        setSelectedCategory(category);
      } else {
        setSelectedCategory('custom');
        setCustomCategory(category);
      }
    }
    
    if (metadata.components && metadata.components.length > 0) {
      const component = metadata.components[0];
      if (components.includes(component)) {
        setSelectedComponent(component);
      } else {
        setSelectedComponent('custom');
        setCustomComponent(component);
      }
    }
    
    if (metadata.tags && metadata.tags.length > 0) {
      setTags(prev => {
        const newTags = [...prev];
        metadata.tags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
        return newTags;
      });
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className={`flex ${showChatAssistant ? 'w-[1100px] max-w-[90vw]' : 'w-full max-w-2xl'} h-[700px] max-h-[90vh]`}>
        {/* Main document form */}
        <div className="bg-gray-800 rounded-l-lg shadow-xl w-full overflow-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Create New Document</h2>
            
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setShowChatAssistant(!showChatAssistant)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
              >
                {showChatAssistant ? 'Hide Assistant' : 'Show Assistant'}
              </button>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-400 mr-2">AI Auto-Assignment</span>
                <div 
                  className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-colors duration-300 ${aiAssisted ? 'bg-blue-600' : 'bg-gray-600'}`}
                  onClick={() => setAiAssisted(!aiAssisted)}
                >
                  <div 
                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${aiAssisted ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {aiAnalysisStatus === 'analyzing' && (
            <div className="mt-2 text-sm text-blue-400 flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI is analyzing your document and determining optimal organization...
            </div>
          )}
          
          {aiAnalysisStatus === 'completed' && aiAssisted && (
            <div className="mt-2 text-sm text-green-400 flex items-center">
              <svg className="h-4 w-4 mr-1 text-green-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              AI has automatically organized your document based on content analysis
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Document title"
                required
              />
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Brief description of this document"
                rows="2"
              />
            </div>
            
            {/* Simplified view when AI Auto-Assignment is on */}
            {aiAssisted && (
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800">
                <div className="flex items-center text-blue-300 mb-3">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-medium">AI Auto-Assignment Active</h3>
                </div>
                
                <p className="text-sm text-gray-300 mb-2">
                  AI will automatically:
                </p>
                
                <ul className="text-sm text-gray-400 space-y-1 list-disc pl-5 mb-3">
                  <li>Determine optimal file path based on content type</li>
                  <li>Assign categories based on document purpose and technical level</li>
                  <li>Identify system components based on relevance analysis</li>
                  <li>Extract appropriate tags from key concepts</li>
                  <li><span className="text-green-400 font-medium">Generate comprehensive content</span> with system context awareness</li>
                </ul>
                
                {analyzing ? (
                  <div className="text-sm text-blue-400 flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI is analyzing your document...
                  </div>
                ) : suggestions ? (
                  <div className="text-sm text-green-400 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    Document analyzed - AI ready to organize
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    Enter a title and description to activate AI analysis
                  </div>
                )}
                
                {suggestions && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Preview of AI decisions:</div>
                    <div className="mt-1 space-y-1">
                      <div className="text-xs">
                        <span className="text-gray-500">Path:</span> 
                        <span className="text-blue-300 ml-1">{suggestions.suggestedPath}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Categories:</span> 
                        <span className="text-blue-300 ml-1">{suggestions.suggestedCategories.join(', ')}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Components:</span> 
                        <span className="text-blue-300 ml-1">{suggestions.suggestedComponents.join(', ')}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500">Tags:</span> 
                        <span className="text-blue-300 ml-1">{suggestions.suggestedTags.join(', ')}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 italic">
                      You can edit these fields after document creation
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Standard fields when AI Auto-Assignment is off */}
            {!aiAssisted && (
              <>
                {/* Path */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="path" className="block text-sm font-medium text-gray-300 mb-1">
                      File Path <span className="text-red-500">*</span>
                    </label>
                    {analyzing ? (
                      <span className="text-xs text-blue-400 animate-pulse">AI analyzing...</span>
                    ) : suggestions?.suggestedPath ? (
                      <span className="text-xs text-green-400">AI suggestion available</span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="path"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="/path/to/document.md"
                      required
                    />
                    {suggestions?.suggestedPath && path !== suggestions.suggestedPath && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 text-xs px-2 py-1 bg-blue-900/50 rounded"
                        onClick={() => setPath(suggestions.suggestedPath)}
                      >
                        Use AI suggestion
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {suggestions?.suggestedPath && path === suggestions.suggestedPath ? (
                      <span className="text-green-400 flex items-center">
                        <svg className="h-3 w-3 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                        Using AI-suggested path based on document analysis
                      </span>
                    ) : (
                      "Specify the full file path where the document should be created"
                    )}
                  </div>
                </div>
                
                {/* Category */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    {analyzing ? (
                      <span className="text-xs text-blue-400 animate-pulse">AI analyzing...</span>
                    ) : suggestions?.suggestedCategories?.length > 0 ? (
                      <span className="text-xs text-green-400">AI suggestions available</span>
                    ) : null}
                  </div>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    <option value="custom">Add custom category...</option>
                  </select>
                  
                  {selectedCategory === 'custom' && (
                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Enter custom category"
                        required
                      />
                    </div>
                  )}
                  
                  {suggestions?.suggestedCategories?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400">AI suggested categories:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestions.suggestedCategories.map(cat => (
                          <button 
                            key={cat} 
                            type="button"
                            className="px-2 py-1 bg-blue-900/40 text-blue-300 text-xs rounded hover:bg-blue-900/60 transition"
                            onClick={() => {
                              if (categories.includes(cat)) {
                                setSelectedCategory(cat);
                              } else {
                                setSelectedCategory('custom');
                                setCustomCategory(cat);
                              }
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Component */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="component" className="block text-sm font-medium text-gray-300 mb-1">
                      Component <span className="text-red-500">*</span>
                    </label>
                    {analyzing ? (
                      <span className="text-xs text-blue-400 animate-pulse">AI analyzing...</span>
                    ) : suggestions?.suggestedComponents?.length > 0 ? (
                      <span className="text-xs text-green-400">AI suggestions available</span>
                    ) : null}
                  </div>
                  <select
                    id="component"
                    value={selectedComponent}
                    onChange={(e) => setSelectedComponent(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select a component</option>
                    {components.map(component => (
                      <option key={component} value={component}>{component}</option>
                    ))}
                    <option value="custom">Add custom component...</option>
                  </select>
                  
                  {selectedComponent === 'custom' && (
                    <div className="relative mt-2">
                      <input
                        type="text"
                        value={customComponent}
                        onChange={(e) => setCustomComponent(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Enter custom component"
                        required
                      />
                    </div>
                  )}
                  
                  {suggestions?.suggestedComponents?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400">AI suggested components:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestions.suggestedComponents.map(comp => (
                          <button 
                            key={comp} 
                            type="button"
                            className="px-2 py-1 bg-green-900/40 text-green-300 text-xs rounded hover:bg-green-900/60 transition"
                            onClick={() => {
                              if (components.includes(comp)) {
                                setSelectedComponent(comp);
                              } else {
                                setSelectedComponent('custom');
                                setCustomComponent(comp);
                              }
                            }}
                          >
                            {comp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Tags */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tags
                </label>
                {analyzing ? (
                  <span className="text-xs text-blue-400 animate-pulse">AI analyzing...</span>
                ) : suggestions?.suggestedTags?.length > 0 ? (
                  <span className="text-xs text-green-400">AI suggestions available</span>
                ) : null}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-l px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Add tags..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-blue-600 text-white px-3 py-2 rounded-r hover:bg-blue-700 transition"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span 
                    key={tag} 
                    className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs flex items-center"
                  >
                    {tag}
                    <button 
                      type="button"
                      className="ml-2 text-gray-400 hover:text-red-400"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              {suggestions?.suggestedTags?.length > 0 && tags.length === 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-400">AI suggested tags:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {suggestions.suggestedTags.map(tag => (
                      <button 
                        key={tag} 
                        type="button"
                        className="px-2 py-1 bg-gray-700/80 text-gray-300 text-xs rounded hover:bg-gray-700 transition"
                        onClick={() => setTags(prev => [...prev, tag])}
                      >
                        {tag}
                      </button>
                    ))}
                    <button 
                      type="button"
                      className="px-2 py-1 bg-blue-600/80 text-white text-xs rounded hover:bg-blue-600 transition"
                      onClick={() => setTags(suggestions.suggestedTags)}
                    >
                      Use all
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-700 text-gray-300 rounded hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            
            {suggestions && !aiAssisted && (
              <button
                type="button"
                onClick={applyAiSuggestions}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a1 1 0 01-1.414 1.414l-2.343-2.343a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Apply AI Suggestions
              </button>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={!title || 
                (!aiAssisted && (!path || !selectedCategory || (selectedCategory === 'custom' && !customCategory) || !selectedComponent || (selectedComponent === 'custom' && !customComponent)))}
            >
              Create Document
            </button>
          </div>
        </form>
      </div>
      
      {/* AI Chat Assistant Panel - style matching the milestone modal */}
      {showChatAssistant && (
        <div className="bg-[#1e293b] border-l border-gray-700 w-[400px] flex flex-col rounded-r-lg shadow-xl overflow-hidden">
          <DocumentChatAssistant
            isOpen={true}
            onClose={() => setShowChatAssistant(false)}
            documentTitle={title}
            documentType={
              selectedCategory === 'Architecture' ? 'architecture' :
              selectedCategory === 'Guide' ? 'guide' :
              selectedCategory === 'Reference' ? 'reference' : 'documentation'
            }
            documentPurpose={
              selectedCategory === 'Implementation' ? 'implementation' :
              selectedCategory === 'Learning' ? 'learning' :
              selectedCategory === 'Best Practices' ? 'best-practices' : 'general'
            }
            onContentGenerate={handleChatContentGenerate}
            onSuggestMetadata={handleChatMetadataSuggest}
            aiEnabled={aiAssisted}
          />
        </div>
      )}
      </div>
    </div>
  );
};

export default CreateDocumentModal;