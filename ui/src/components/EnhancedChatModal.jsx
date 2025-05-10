import React, { useState, useEffect, useRef } from 'react';
import agentOrchestrationService from '../services/agentOrchestrationService';

/**
 * Enhanced Chat Modal
 * 
 * This component provides an AI chat interface that routes messages through the
 * agent orchestration service. It automatically determines the appropriate agent
 * for each query, maintains conversation context, and provides rich display for
 * agent responses.
 */
const EnhancedChatModal = ({ 
  isOpen, 
  onClose, 
  featureId = null, 
  featureName = null,
  initialContext = {},
  initialPrompt = null
}) => {
  // Chat state
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [orchestrationAvailable, setOrchestrationAvailable] = useState(true);
  const [providers, setProviders] = useState({});
  const [isInitializing, setIsInitializing] = useState(true);
  
  // References
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);
  
  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen]);
  
  // Focus input field when modal opens
  useEffect(() => {
    if (isOpen && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [isOpen]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);
  
  // Send initial prompt if provided
  useEffect(() => {
    if (initialPrompt && conversationId && !isInitializing) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, conversationId, isInitializing]);
  
  // Initialize the chat session
  const initializeChat = async () => {
    setIsInitializing(true);
    
    try {
      // Check if orchestration service is available
      const isAvailable = await agentOrchestrationService.isOrchestrationServiceAvailable();
      setOrchestrationAvailable(isAvailable);
      
      // Check provider availability
      if (isAvailable) {
        const providerStatus = await agentOrchestrationService.checkProviderAvailability();
        setProviders(providerStatus);
      }
      
      // Prepare context
      const context = {
        ...initialContext,
        featureId,
        featureName,
        sessionStartTime: new Date().toISOString()
      };
      
      // Initialize conversation
      const conversationData = await agentOrchestrationService.initializeConversation(
        null, // Let the service generate an ID
        context
      );
      
      setConversationId(conversationData.conversation_id);
      
      // Add welcome message
      const welcomeMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: getWelcomeMessage(featureName),
        timestamp: new Date().toISOString(),
        agent: agentOrchestrationService.AGENT_TYPES.CHAT
      };
      
      setChatHistory([welcomeMessage]);
      setCurrentAgent(agentOrchestrationService.AGENT_TYPES.CHAT);
    } catch (error) {
      console.error('Error initializing chat:', error);
      
      // Fall back to local chat
      setOrchestrationAvailable(false);
      setConversationId(`local_conversation_${Date.now()}`);
      
      // Add fallback welcome message
      const fallbackMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Welcome! I\'m operating in local mode right now. I\'ll try to help as best I can, but my capabilities are limited without the orchestration service.',
        timestamp: new Date().toISOString(),
        agent: agentOrchestrationService.AGENT_TYPES.CHAT,
        offline: true
      };
      
      setChatHistory([fallbackMessage]);
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Get appropriate welcome message
  const getWelcomeMessage = (featureName) => {
    if (featureName) {
      return `Hello! I'm your AI assistant and I'm here to help with the ${featureName} feature. What would you like to know or do?`;
    } else {
      return `Hello! I'm your AI assistant. I can help you with feature creation, task management, and understanding project relationships. What would you like help with today?`;
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || message;
    if (!messageToSend.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);
    
    try {
      // Process the message through orchestration service
      if (orchestrationAvailable && conversationId) {
        const result = await agentOrchestrationService.processMessage(
          conversationId,
          messageToSend
        );
        
        // Update current agent if it changed
        if (result.agent && result.agent !== currentAgent) {
          setCurrentAgent(result.agent);
        }
        
        // Add assistant response to chat
        const assistantMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: result.message,
          timestamp: new Date().toISOString(),
          agent: result.agent,
          nextActions: result.nextActions || [],
          offline: result.offline
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        // Fallback to local processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple fallback logic
        const fallbackResponse = generateFallbackResponse(messageToSend);
        
        // Add assistant response to chat
        const assistantMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: fallbackResponse.content,
          timestamp: new Date().toISOString(),
          agent: fallbackResponse.agent,
          offline: true
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again later.',
        timestamp: new Date().toISOString(),
        agent: currentAgent,
        error: true
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };
  
  // Generate a fallback response when the orchestration service is unavailable
  const generateFallbackResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    let content = 'I apologize, but I am currently operating in offline mode and cannot process your request through our agent network. Please try again later when the service is available.';
    let agent = agentOrchestrationService.AGENT_TYPES.CHAT;
    
    // Simple fallback logic for common patterns
    if (lowerMessage.includes('create feature') || lowerMessage.includes('new feature')) {
      content = 'I would help you create a new feature, but I am currently operating in offline mode. Please try again when the service is available.';
      agent = agentOrchestrationService.AGENT_TYPES.FEATURE_CREATION;
    } else if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
      content = 'I would help you with task management, but I am currently operating in offline mode. Please try again when the service is available.';
      agent = agentOrchestrationService.AGENT_TYPES.TASK;
    } else if (lowerMessage.includes('relationship') || lowerMessage.includes('connection')) {
      content = 'I would help you analyze relationships, but I am currently operating in offline mode. Please try again when the service is available.';
      agent = agentOrchestrationService.AGENT_TYPES.RELATIONSHIP;
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      content = 'Hello! I\'m operating in offline mode right now, but I\'ll try to help as best I can. My capabilities are limited without the orchestration service though.';
      agent = agentOrchestrationService.AGENT_TYPES.CHAT;
    } else if (lowerMessage.includes('help')) {
      content = 'I can normally help with feature creation, task management, and relationship analysis, but I\'m currently in offline mode with limited capabilities. Please try again when the service is available.';
      agent = agentOrchestrationService.AGENT_TYPES.CHAT;
    }
    
    return { content, agent };
  };
  
  // Handle message input keypress
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Execute a next action from the agent's response
  const handleNextAction = async (action) => {
    // Transform the action into a message and send it
    const actionMessage = `Perform action: ${action.type}${action.params ? ` with parameters ${JSON.stringify(action.params)}` : ''}`;
    await handleSendMessage(actionMessage);
  };
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Get agent label from agent type
  const getAgentLabel = (agentType) => {
    switch (agentType) {
      case agentOrchestrationService.AGENT_TYPES.FEATURE_CREATION:
        return 'Feature Creation';
      case agentOrchestrationService.AGENT_TYPES.TASK:
        return 'Task Agent';
      case agentOrchestrationService.AGENT_TYPES.RELATIONSHIP:
        return 'Relationship Agent';
      case agentOrchestrationService.AGENT_TYPES.KNOWLEDGE_GRAPH:
        return 'Knowledge Graph';
      case agentOrchestrationService.AGENT_TYPES.ORCHESTRATOR:
        return 'Orchestrator';
      case agentOrchestrationService.AGENT_TYPES.CHAT:
      default:
        return 'AI Assistant';
    }
  };
  
  // Get agent color from agent type
  const getAgentColor = (agentType) => {
    switch (agentType) {
      case agentOrchestrationService.AGENT_TYPES.FEATURE_CREATION:
        return 'bg-purple-600';
      case agentOrchestrationService.AGENT_TYPES.TASK:
        return 'bg-blue-600';
      case agentOrchestrationService.AGENT_TYPES.RELATIONSHIP:
        return 'bg-green-600';
      case agentOrchestrationService.AGENT_TYPES.KNOWLEDGE_GRAPH:
        return 'bg-yellow-600';
      case agentOrchestrationService.AGENT_TYPES.ORCHESTRATOR:
        return 'bg-red-600';
      case agentOrchestrationService.AGENT_TYPES.CHAT:
      default:
        return 'bg-gray-600';
    }
  };
  
  // Render provider status indicator
  const renderProviderStatus = () => {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-1 ${orchestrationAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Orchestration</span>
        </div>
        
        {Object.entries(providers).map(([provider, available]) => (
          <div key={provider} className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-1 ${available ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{provider}</span>
          </div>
        ))}
      </div>
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed right-2 sm:right-10 bottom-2 sm:bottom-10 z-50">
      {/* Chat popup */}
      <div className="w-[95vw] sm:w-[480px] max-w-[480px] h-[80vh] sm:h-[520px] max-h-[520px] bg-[#1a2233] rounded-lg shadow-xl border border-[rgba(255,255,255,0.1)] flex flex-col overflow-hidden">
        <div className="bg-[#ea580c] px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <div className="font-semibold text-white text-sm sm:text-base flex flex-col">
            <div className="flex items-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-1.008c-.376.193-.75.393-1.083.603C4.166 16.897 3.5 17 3 17c.5 0 .833-1.534.833-1.834C2.167 13.917 2 12.833 2 11.667 2 7.8 5.582 5 10 5s8 2.8 8 5z" clipRule="evenodd"></path>
              </svg>
              <span className="truncate max-w-[200px]">
                {featureName ? `Chat: ${featureName}` : 'AI Assistant Chat'}
              </span>
            </div>
            {renderProviderStatus()}
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto py-3 sm:py-4 px-3 sm:px-4 flex flex-col gap-2 sm:gap-3 bg-[#1a2233]">
          {chatHistory.map((msg) => (
            <div 
              key={msg.id} 
              className={`${
                msg.role === 'user' 
                  ? 'self-end' 
                  : 'self-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center mb-1">
                  <div className={`text-xs px-2 py-0.5 rounded-full text-white ${getAgentColor(msg.agent)}`}>
                    {getAgentLabel(msg.agent)}
                  </div>
                  {msg.offline && (
                    <div className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-200">
                      Offline
                    </div>
                  )}
                </div>
              )}
              
              <div 
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-[#3b82f6] text-white text-xs sm:text-sm' 
                    : msg.error
                      ? 'bg-[#7f1d1d] text-[rgba(255,255,255,0.9)] text-xs sm:text-sm'
                      : 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.9)] text-xs sm:text-sm'
                }`}
              >
                {/* Render message content with markdown */}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                
                {/* Render action buttons if available */}
                {msg.nextActions && msg.nextActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.nextActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleNextAction(action)}
                        className="text-xs bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] px-2 py-1 rounded transition-colors"
                      >
                        {action.type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="self-start">
              <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg max-w-[85%] bg-[rgba(255,255,255,0.08)]">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={chatEndRef} />
        </div>
        
        {/* Input area */}
        <div className="border-t border-[rgba(255,255,255,0.1)] p-2 sm:p-3 flex gap-2 bg-[#131b2e]">
          <textarea
            ref={messageInputRef}
            rows="2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-[#0f172a] border border-[rgba(255,255,255,0.1)] rounded-md px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#ea580c] resize-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isTyping || !message.trim()}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center disabled:opacity-50 disabled:hover:bg-[#ea580c]"
          >
            {isTyping ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
            ) : (
              <span>Send</span>
            )}
          </button>
        </div>
        
        {/* Agent indicator */}
        {currentAgent && (
          <div className="border-t border-[rgba(255,255,255,0.1)] p-1 sm:p-2 bg-[#131b2e] flex items-center justify-between">
            <div className="text-xs text-gray-400 flex items-center">
              <span>Current Agent:</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-white ${getAgentColor(currentAgent)}`}>
                {getAgentLabel(currentAgent)}
              </span>
            </div>
            
            <div className="text-xs text-gray-400">
              {conversationId && `ID: ${conversationId.substring(0, 8)}...`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChatModal;