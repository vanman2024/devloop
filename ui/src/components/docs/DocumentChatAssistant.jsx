import React, { useState, useEffect, useRef } from 'react';
import documentManagerService from '../../services/documentManagerService';

/**
 * Document Chat Assistant
 * 
 * Provides an AI-powered chat interface specifically for document creation
 * and content enhancement within the Document Manager.
 * 
 * This component helps users create better documentation by providing:
 * 1. Content suggestions based on document type
 * 2. Interactive Q&A for refining document details
 * 3. Automatic content generation for sections
 * 4. Integration with the document creation flow
 */
// Helper function to detect what topic the user is focusing on
const detectTopicFocus = (message, currentFocus) => {
  const msg = message.toLowerCase();
  
  // Document planning
  if (msg.includes('comprehensive') || msg.includes('targeted') || 
      msg.includes('focus on') || msg.includes('purpose')) {
    return 'document-planning';
  }
  
  // Content generation focus
  if (msg.includes('generate') || msg.includes('write') || msg.includes('create content')) {
    if (msg.includes('overview')) return 'overview';
    if (msg.includes('architecture')) return 'architecture';
    if (msg.includes('api')) return 'api';
    if (msg.includes('example') || msg.includes('code')) return 'examples';
    if (msg.includes('full') || msg.includes('complete')) return 'full-document';
    return 'content-generation';
  }
  
  // Structure focus
  if (msg.includes('structure') || msg.includes('organize') || msg.includes('outline')) {
    return 'structure';
  }
  
  // Metadata focus
  if (msg.includes('metadata') || msg.includes('category') || msg.includes('tag')) {
    return 'metadata';
  }
  
  // Best practices focus
  if (msg.includes('best practice') || msg.includes('guideline') || msg.includes('standard')) {
    return 'best-practices';
  }
  
  // DevLoop components focus
  if (msg.includes('feature management') || msg.includes('ui dashboard') || 
      msg.includes('core system') || msg.includes('ai integration')) {
    return 'devloop-components';
  }
  
  // Implementation questions
  if (msg.includes('how to') || msg.includes('how do i') || msg.includes('?')) {
    return 'implementation';
  }
  
  // If we can't detect a new focus, keep the current one
  return currentFocus || 'general';
};

const DocumentChatAssistant = ({ 
  isOpen, 
  onClose, 
  documentTitle,
  documentType,
  documentPurpose,
  onContentGenerate,
  onSuggestMetadata,
  aiEnabled = true 
}) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [conversationState, setConversationState] = useState({
    isFirstMessage: true,
    documentInfo: {},
    topicFocus: null,
    questionsAsked: 0,
    hasGeneratedContent: false
  });
  const chatEndRef = useRef(null);

  // Handle clearing the chat history
  const handleClearChat = () => {
    // Reset the chat history but keep the initial greeting
    initializeChat();
    
    // Reset conversation state
    setConversationState({
      isFirstMessage: true,
      documentInfo: {},
      topicFocus: null,
      questionsAsked: 0,
      hasGeneratedContent: false
    });
  };
  
  // Initialize chat with welcome message
  const initializeChat = () => {
    const docContext = documentTitle ? 
      `"${documentTitle}" (${documentType || 'general'} document)` : 
      'your new document';
    
    const initialMessage = {
      type: 'ai',
      text: `I'm your AI assistant for creating ${docContext}. I can help with document structure, content generation, and best practices.

I have context about the Devloop system and existing documentation, so I can help ensure your document aligns with project standards and integrates well with existing documentation.

How can I help you with this document today?`
    };
    
    setChatHistory([initialMessage]);
  };
  
  // Create unique session ID for this document chat session
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = `doc_chat_${Date.now()}`;
      setSessionId(newSessionId);
      
      // Initialize chat
      initializeChat();
    }
  }, [isOpen, documentTitle, documentType, documentPurpose]);
  
  // Listen for custom events to add messages from external buttons
  useEffect(() => {
    const handleCustomMessage = (event) => {
      if (event.detail && event.detail.message) {
        setMessage(event.detail.message);
        setTimeout(() => {
          handleSendMessage(event.detail.message);
        }, 100);
      }
    };
    
    document.addEventListener('document-chat-message', handleCustomMessage);
    
    return () => {
      document.removeEventListener('document-chat-message', handleCustomMessage);
    };
  }, [chatHistory]);
  
  // Add a helper function to proactively ask questions after user responses
  const addProactiveFollowup = (message) => {
    // Only add followups sometimes to avoid being too chatty
    if (conversationState.questionsAsked <= 2 || Math.random() > 0.5) {
      const msgLower = message.toLowerCase();
      
      if (conversationState.topicFocus === 'document-planning') {
        setTimeout(() => {
          const followupMessage = {
            type: 'ai',
            text: `Based on your goals, would you like me to suggest a document structure that would work well for this purpose? I can also generate specific sections if you'd prefer.`
          };
          setChatHistory(prev => [...prev, followupMessage]);
        }, 1000);
      }
      else if (conversationState.topicFocus === 'structure' && !msgLower.includes('generate')) {
        setTimeout(() => {
          const followupMessage = {
            type: 'ai',
            text: `Would you like me to generate any of these sections for you now? I can create content that follows DevLoop best practices.`
          };
          setChatHistory(prev => [...prev, followupMessage]);
        }, 1000);
      }
      else if (conversationState.hasGeneratedContent && conversationState.questionsAsked > 3) {
        setTimeout(() => {
          const followupMessage = {
            type: 'ai',
            text: `Is there anything else you'd like to adjust about the document we're creating? I'm here to help with any aspect of the documentation process.`
          };
          setChatHistory(prev => [...prev, followupMessage]);
        }, 1000);
      }
    }
  };

  // Scroll to bottom when chat history changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSendMessage = async (customMessage) => {
    const textToSend = customMessage || message;
    if (!textToSend.trim() || !aiEnabled) return;

    // Add user message to chat
    const userMessage = { type: 'user', text: textToSend };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    
    // Clear input
    setMessage('');
    
    // Show AI thinking indicator
    setIsTyping(true);
    
    // Process the message and get AI response
    try {
      // Call the document manager service to process the chat message
      // Update conversation state - no longer first message once user has sent a message
      setConversationState(prev => ({
        ...prev,
        isFirstMessage: false,
        questionsAsked: prev.questionsAsked + 1,
        documentInfo: {
          ...prev.documentInfo,
          title: documentTitle,
          type: documentType,
          purpose: documentPurpose
        },
        // Try to detect topic focus from the message
        topicFocus: detectTopicFocus(textToSend, prev.topicFocus)
      }));
      
      // Create a document context object with conversation state
      const documentContext = {
        title: documentTitle,
        type: documentType,
        purpose: documentPurpose,
        isFirstMessage: conversationState.isFirstMessage,
        questionsAsked: conversationState.questionsAsked,
        topicFocus: conversationState.topicFocus,
        hasGeneratedContent: conversationState.hasGeneratedContent
      };
      
      // Process the message using our AI service
      const responseText = await documentManagerService.processChatMessage(textToSend, documentContext);
      
      // Add the AI response to the chat history
      const aiResponse = { type: 'ai', text: responseText };
      setChatHistory(prev => [...prev, aiResponse]);
      
      // Add proactive followup questions based on the conversation state
      addProactiveFollowup(textToSend);
      
      // Add action buttons for generating content or applying metadata if applicable
      if (responseText.includes('Would you like me to add this to your document') || 
          responseText.includes('draft') || 
          responseText.includes('Would you like me to include this')) {
        // Extract content section (assume it's between ## and the Would you like line)
        const contentMatch = responseText.match(/## .+\n\n([\s\S]+?)(?=\n\nWould you)/);
        const sectionContent = contentMatch ? 
          `## ${responseText.match(/## (.+)/)[1]}\n\n${contentMatch[1]}` : 
          responseText.replace(/Would you like .+$/, '').trim();
        
        // Create content insertion action
        setTimeout(() => {
          const actionMessage = {
            type: 'action',
            text: 'Add this content to your document?',
            actions: [
              {
                label: 'Add to Document',
                handler: () => {
                  if (onContentGenerate) {
                    onContentGenerate(sectionContent);
                    
                    // Update conversation state to track content generation
                    setConversationState(prev => ({
                      ...prev,
                      hasGeneratedContent: true
                    }));
                    
                    // Add confirmation message
                    setChatHistory(prev => [...prev, { 
                      type: 'system', 
                      text: 'Content added to document' 
                    }]);
                    
                    // Add a follow-up question after generating content
                    setTimeout(() => {
                      const followupMessage = {
                        type: 'ai',
                        text: `What other sections would you like me to help with? I can generate more content or provide guidance on structure, metadata, or best practices.`
                      };
                      setChatHistory(prev => [...prev, followupMessage]);
                    }, 1000);
                  }
                }
              }
            ]
          };
          setChatHistory(prev => [...prev, actionMessage]);
        }, 500);
      } 
      // Check for metadata suggestions
      else if (responseText.includes('metadata settings') || 
               (responseText.includes('Categories') && responseText.includes('Components') && responseText.includes('Tags'))) {
        
        // Extract categories, components, and tags
        const categoryMatch = responseText.match(/Categories[:\n]+\s*-\s*([^\n]+)(?:\s*-\s*([^\n]+))?/i);
        const componentMatch = responseText.match(/Components[:\n]+\s*-\s*([^\n]+)(?:\s*-\s*([^\n]+))?/i);
        const tagsMatch = responseText.match(/Tags[:\n]+\s*-\s*([^\n]+)(?:\s*-\s*([^\n]+))?(?:\s*-\s*([^\n]+))?(?:\s*-\s*([^\n]+))?/i);
        
        // Create metadata suggestion action
        setTimeout(() => {
          const actionMessage = {
            type: 'action',
            text: 'Update document metadata with these suggestions?',
            actions: [
              {
                label: 'Apply Suggested Metadata',
                handler: () => {
                  if (onSuggestMetadata) {
                    const categories = [];
                    const components = [];
                    const tags = [];
                    
                    if (categoryMatch) {
                      if (categoryMatch[1]) categories.push(categoryMatch[1].trim());
                      if (categoryMatch[2]) categories.push(categoryMatch[2].trim());
                    }
                    
                    if (componentMatch) {
                      if (componentMatch[1]) components.push(componentMatch[1].trim());
                      if (componentMatch[2]) components.push(componentMatch[2].trim());
                    }
                    
                    if (tagsMatch) {
                      if (tagsMatch[1]) tags.push(tagsMatch[1].trim());
                      if (tagsMatch[2]) tags.push(tagsMatch[2].trim());
                      if (tagsMatch[3]) tags.push(tagsMatch[3].trim());
                      if (tagsMatch[4]) tags.push(tagsMatch[4].trim());
                    }
                    
                    onSuggestMetadata({
                      categories: categories.length > 0 ? categories : [documentType === 'architecture' ? 'Architecture' : 'Documentation'],
                      components: components.length > 0 ? components : ['Document Manager'],
                      tags: tags.length > 0 ? tags : [documentType || 'documentation']
                    });
                    
                    // Add confirmation message
                    setChatHistory(prev => [...prev, { 
                      type: 'system', 
                      text: 'Metadata suggestions applied to document' 
                    }]);
                  }
                }
              }
            ]
          };
          setChatHistory(prev => [...prev, actionMessage]);
        }, 500);
      }
      // Check for complete document generation
      else if (responseText.includes('complete document') || responseText.includes('full document')) {
        setTimeout(() => {
          const actionMessage = {
            type: 'action',
            text: 'Generate complete document with all sections?',
            actions: [
              {
                label: 'Generate Complete Document',
                handler: async () => {
                  if (onContentGenerate) {
                    setIsTyping(true);
                    
                    // First add a message about what we're doing
                    setChatHistory(prev => [...prev, { 
                      type: 'system', 
                      text: 'Generating a comprehensive document for you using DevLoop standards...' 
                    }]);
                    
                    // Use the document generator to create a full document
                    try {
                      const fullContent = await documentManagerService.generateDocumentContent(
                        documentTitle || 'Document',
                        'Comprehensive documentation',
                        documentType || 'general',
                        documentPurpose || 'reference',
                        []
                      );
                      
                      onContentGenerate(fullContent);
                      
                      // Update conversation state
                      setConversationState(prev => ({
                        ...prev,
                        hasGeneratedContent: true,
                        topicFocus: 'document-review'
                      }));
                      
                      // Add confirmation message
                      setChatHistory(prev => [...prev, { 
                        type: 'system', 
                        text: 'Complete document generated and added to your editor!' 
                      }]);
                      
                      // Add a follow-up message asking for feedback
                      setTimeout(() => {
                        const followupMessage = {
                          type: 'ai',
                          text: `I've generated a complete document for "${documentTitle || 'your topic'}". 

Would you like me to:
1. Explain any specific section in more detail?
2. Suggest additional content that could improve it?
3. Provide best practices for maintaining this type of document?
4. Help with something else?`
                        };
                        setChatHistory(prev => [...prev, followupMessage]);
                      }, 1000);
                      
                    } catch (error) {
                      console.error('Error generating full document:', error);
                      setChatHistory(prev => [...prev, { 
                        type: 'system', 
                        text: 'Error generating document. Please try again.' 
                      }]);
                    } finally {
                      setIsTyping(false);
                    }
                  }
                }
              }
            ]
          };
          setChatHistory(prev => [...prev, actionMessage]);
        }, 500);
      }
    } catch (error) {
      // Handle errors
      console.error('Error processing message:', error);
      setChatHistory(prev => [...prev, { 
        type: 'system', 
        text: 'Sorry, there was an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Chat container with the clean milestone assistant style */}
      <div className="w-full h-full bg-[#1e293b] flex flex-col">
        {/* Header - matches the milestone assistant header */}
        <div className="bg-[#1e293b] px-4 py-3 border-b border-gray-700">
          <h3 className="text-white text-lg font-medium">
            AI Document Assistant
          </h3>
          <p className="text-gray-400 text-sm">
            Ask questions about document creation and organization
          </p>
        </div>
        
        {/* Chat messages - scrollable, matches milestone design */}
        <div className="flex-1 p-4 flex flex-col gap-4 bg-[#1e293b] overflow-y-auto">
          {chatHistory.map((msg, index) => (
            <div key={index} className="flex flex-col">
              {msg.type === 'user' && (
                <div className="p-3 rounded-lg bg-[#3b82f6] text-white text-sm self-end max-w-[90%]">
                  {msg.text}
                </div>
              )}
              
              {msg.type === 'ai' && (
                <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.08)] text-white text-sm self-start max-w-[90%]">
                  {msg.text}
                </div>
              )}
              
              {msg.type === 'system' && (
                <div className="p-2 rounded-lg bg-[rgba(6,78,59,0.5)] text-[#6ee7b7] text-sm italic mx-auto">
                  {msg.text}
                </div>
              )}
              
              {msg.type === 'action' && (
                <div className="self-start flex flex-col gap-2 w-full mt-1">
                  <div className="flex gap-2 flex-wrap">
                    {msg.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={action.handler}
                        className="px-3 py-1 bg-[#0369a1] hover:bg-[#0284c7] text-white text-sm rounded transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* AI typing indicator */}
          {isTyping && (
            <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.08)] text-white text-sm self-start flex items-center max-w-[90%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Quick actions - simple buttons like in the milestone screenshot */}
        <div className="p-2 flex flex-wrap gap-2 justify-start border-t border-gray-700">
          <button
            onClick={() => handleSendMessage("Best practices")}
            className="px-3 py-1 bg-[#1a2233] text-blue-400 hover:bg-[#162233] text-sm rounded transition-colors"
          >
            Best practices
          </button>
          <button
            onClick={() => handleSendMessage("Example structure")}
            className="px-3 py-1 bg-[#1a2233] text-blue-400 hover:bg-[#162233] text-sm rounded transition-colors"
          >
            Example structure
          </button>
          <button
            onClick={handleClearChat}
            className="px-3 py-1 bg-[#1a2233] text-gray-400 hover:bg-[#162233] text-sm rounded ml-auto transition-colors"
          >
            Clear chat
          </button>
        </div>
        
        {/* Input area - clean, simple like milestone */}
        <div className="p-3 flex gap-2 border-t border-gray-700">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about document creation..."
            className="flex-1 bg-[#141e33] border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            autoFocus
            disabled={!aiEnabled}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!message.trim() || !aiEnabled}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentChatAssistant;