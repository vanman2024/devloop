import React, { useState, useEffect } from 'react';

const ChatModal = ({ isOpen, onClose, featureId, featureName }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Sample initial message from AI
  useEffect(() => {
    if (isOpen && featureId) {
      // Get existing chat history or initialize with AI welcome message
      const existingChat = localStorage.getItem(`chat_${featureId}`);
      if (existingChat) {
        setChatHistory(JSON.parse(existingChat));
      } else {
        const initialMessage = {
          type: 'ai',
          text: `How can I help with the ${featureName} feature?`
        };
        setChatHistory([initialMessage]);
        localStorage.setItem(`chat_${featureId}`, JSON.stringify([initialMessage]));
      }
    }
  }, [isOpen, featureId, featureName]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Add user message to chat
    const updatedHistory = [
      ...chatHistory,
      { type: 'user', text: message }
    ];
    setChatHistory(updatedHistory);
    localStorage.setItem(`chat_${featureId}`, JSON.stringify(updatedHistory));
    
    // Clear input
    setMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      let responseText = `I'll help you with ${featureId}. What specific information do you need?`;
      
      // Simple response patterns
      if (message.toLowerCase().includes('how') && message.toLowerCase().includes('work')) {
        responseText = `The ${featureName} implements core functionality according to the design specifications. It integrates with related modules and follows the project architecture.`;
      } else if (message.toLowerCase().includes('status')) {
        responseText = `The current status of ${featureName} is shown in the feature card. All progress updates are recorded in the activity history.`;
      } else if (message.toLowerCase().includes('test')) {
        responseText = `Testing for ${featureName} includes unit tests, integration tests, and end-to-end validation scenarios. You can run tests using the Run button.`;
      }
      
      const aiResponse = { type: 'ai', text: responseText };
      const finalHistory = [...updatedHistory, aiResponse];
      setChatHistory(finalHistory);
      localStorage.setItem(`chat_${featureId}`, JSON.stringify(finalHistory));
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-2 sm:right-10 bottom-2 sm:bottom-10 z-50">
      {/* Chat popup */}
      <div className="w-[95vw] sm:w-[380px] max-w-[380px] h-[80vh] sm:h-[420px] max-h-[420px] bg-[#1a2233] rounded-lg shadow-xl border border-[rgba(255,255,255,0.1)] flex flex-col overflow-hidden">
        <div className="bg-[#ea580c] px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <div className="font-semibold text-white text-sm sm:text-base flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-1.008c-.376.193-.75.393-1.083.603C4.166 16.897 3.5 17 3 17c.5 0 .833-1.534.833-1.834C2.167 13.917 2 12.833 2 11.667 2 7.8 5.582 5 10 5s8 2.8 8 5z" clipRule="evenodd"></path>
            </svg>
            <span className="truncate max-w-[200px]">Chat: {featureName}</span>
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
          {chatHistory.map((msg, index) => (
            <div 
              key={index} 
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg max-w-[85%] ${
                msg.type === 'user' 
                  ? 'bg-[#3b82f6] text-white text-xs sm:text-sm self-end shadow-sm' 
                  : 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.9)] text-xs sm:text-sm self-start shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        
        {/* Input area */}
        <div className="border-t border-[rgba(255,255,255,0.1)] p-2 sm:p-3 flex gap-2 bg-[#131b2e]">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-[#0f172a] border border-[rgba(255,255,255,0.1)] rounded-md px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;