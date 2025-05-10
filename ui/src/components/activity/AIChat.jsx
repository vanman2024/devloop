import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { ChatLeftTextFill, SendFill, ArrowClockwise } from 'react-bootstrap-icons';
import websocketService from '../../services/websocketService';

/**
 * AIChat Component - Provides a chat interface for communicating with the AI system
 * Designed to be used in the ReviewCenter for AI-assisted activity reviews
 */
const AIChat = ({ activityId, onMessageSent }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messagesEndRef = useRef(null);
  
  // Load initial messages or connect to WebSocket on component mount
  useEffect(() => {
    // Initial "welcome" message
    setMessages([
      {
        id: 'system-welcome',
        text: 'Hello! I\'m the AI assistant for this project. How can I help with your review?',
        timestamp: new Date().toISOString(),
        user: 'Claude AI',
        userRole: 'ai',
        userRoleName: 'AI Assistant',
        userRoleIcon: '🤖',
        isAiResponse: true
      }
    ]);
    
    // Connect to WebSocket for real-time communication
    connectWebSocket();
    
    // Clean up WebSocket connection on unmount
    return () => {
      disconnectWebSocket();
    };
  }, [activityId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Connect to WebSocket and set up event listeners
  const connectWebSocket = async () => {
    try {
      // Set up WebSocket connection status listener
      websocketService.on('connection_status', handleConnectionStatus);
      
      // Set up message listener
      websocketService.on('ai_message', handleAiMessage);
      websocketService.on('ai_typing', handleAiTyping);
      
      // Connect to WebSocket server
      await websocketService.connect();
      
      // Register for activity-specific messages
      if (activityId) {
        websocketService.send('register_activity', { activityId });
      }
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };
  
  // Disconnect from WebSocket
  const disconnectWebSocket = () => {
    websocketService.off('connection_status', handleConnectionStatus);
    websocketService.off('ai_message', handleAiMessage);
    websocketService.off('ai_typing', handleAiTyping);
  };
  
  // Handle WebSocket connection status changes
  const handleConnectionStatus = (status) => {
    setConnectionStatus(status.status);
  };
  
  // Handle AI messages from WebSocket
  const handleAiMessage = (data) => {
    if (data.activityId === activityId || !data.activityId) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        text: data.text,
        timestamp: new Date().toISOString(),
        user: 'Claude AI',
        userRole: 'ai',
        userRoleName: 'AI Assistant',
        userRoleIcon: '🤖',
        isAiResponse: true
      }]);
      setIsTyping(false);
    }
  };
  
  // Handle AI typing indicator
  const handleAiTyping = (data) => {
    if (data.activityId === activityId || !data.activityId) {
      setIsTyping(data.isTyping);
    }
  };
  
  // Send a message to the AI
  const sendMessage = () => {
    if (!message.trim()) return;
    
    // Create a new message
    const newMessage = {
      id: `user-${Date.now()}`,
      text: message,
      timestamp: new Date().toISOString(),
      user: 'angeldev',
      userRole: 'developer',
      userRoleName: 'Developer',
      userRoleIcon: '👨‍💻'
    };
    
    // Add message to the list
    setMessages(prev => [...prev, newMessage]);
    
    // Send via WebSocket if connected
    if (connectionStatus === 'connected') {
      websocketService.send('user_message', {
        activityId,
        text: message,
        user: 'angeldev',
        userRole: 'developer'
      });
    } else {
      // Simulate AI response if not connected to WebSocket
      simulateAiResponse(message);
    }
    
    // Notify parent component
    if (onMessageSent) {
      onMessageSent(message);
    }
    
    // Clear the input field
    setMessage('');
  };
  
  // Simulate AI response for development/testing
  const simulateAiResponse = (userMessage) => {
    // Show typing indicator
    setIsTyping(true);
    
    // Random delay between 1-3 seconds
    const delay = 1000 + Math.random() * 2000;
    
    setTimeout(() => {
      // Generate an AI response based on user message
      let aiResponseText = '';
      
      if (userMessage.toLowerCase().includes('help')) {
        aiResponseText = "I can help you review this activity. What specific aspects would you like me to look at? I can analyze code quality, implementation approach, or suggest improvements.";
      } else if (userMessage.toLowerCase().includes('problem') || userMessage.toLowerCase().includes('issue')) {
        aiResponseText = "I'll analyze the potential issues. From what I can see, there might be some concerns with the implementation approach. Let me look deeper into this.";
      } else if (userMessage.toLowerCase().includes('improve') || userMessage.toLowerCase().includes('better')) {
        aiResponseText = "Here are some suggestions for improvement:\n1. Consider optimizing the data flow by using state management\n2. The component structure could be simplified\n3. Add more comprehensive error handling for edge cases";
      } else if (userMessage.toLowerCase().includes('test') || userMessage.toLowerCase().includes('testing')) {
        aiResponseText = "For testing this component, I recommend:\n- Unit tests for the core logic\n- Integration tests for the API interactions\n- E2E tests for the full workflow\n\nWould you like me to generate some test examples?";
      } else if (userMessage.toLowerCase().includes('review')) {
        aiResponseText = "I've reviewed this activity and it looks good overall. The implementation follows our coding standards and the approach is solid. There are a few minor optimizations that could be made, but nothing critical.";
      } else {
        // Default responses
        const defaultResponses = [
          "I've analyzed this activity and found it aligns with our project goals. The implementation follows best practices.",
          "Thank you for your message. I'll incorporate this feedback into my analysis. Is there anything specific you'd like me to address?",
          "Based on your input, I'll reevaluate the approach. Would you like me to suggest alternatives?",
          "I'm processing your feedback. This will help improve the quality of the implementation and future suggestions.",
          "I understand your concern. Let me look into this further and provide a more detailed analysis.",
          "Your feedback is valuable. I'll adjust my recommendations accordingly. Is there anything else you'd like me to consider?"
        ];
        aiResponseText = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      }
      
      // Add AI response to messages
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        text: aiResponseText,
        timestamp: new Date().toISOString(),
        user: 'Claude AI',
        userRole: 'ai',
        userRoleName: 'AI Assistant',
        userRoleIcon: '🤖',
        isAiResponse: true
      }]);
      
      // Hide typing indicator
      setIsTyping(false);
    }, delay);
  };
  
  // Handle message input change
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };
  
  // Handle Enter key in the textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Card className="ai-chat bg-gray-800 border-0 shadow h-100">
      <Card.Header className="bg-gray-700 d-flex align-items-center justify-content-between text-white">
        <div className="d-flex align-items-center">
          <ChatLeftTextFill className="me-2" />
          <span>AI Assistant</span>
        </div>
        <div>
          <Badge 
            bg={
              connectionStatus === 'connected' ? 'success' : 
              connectionStatus === 'connecting' ? 'warning' : 
              connectionStatus === 'reconnecting' ? 'info' : 'danger'
            }
            className="connection-status"
          >
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
          </Badge>
          {connectionStatus !== 'connected' && (
            <Button 
              variant="outline-light" 
              size="sm" 
              className="ms-2"
              onClick={connectWebSocket}
            >
              <ArrowClockwise />
            </Button>
          )}
        </div>
      </Card.Header>
      
      <Card.Body className="p-0 d-flex flex-column" style={{ height: '400px' }}>
        {/* Messages container */}
        <div className="messages-container bg-gray-700 flex-grow-1 overflow-auto p-3">
          <ListGroup variant="flush" className="bg-transparent">
            {messages.map(msg => (
              <ListGroup.Item 
                key={msg.id} 
                className={`border-0 px-2 py-2 mb-2 rounded ${
                  msg.isAiResponse ? 
                  'bg-gray-600 align-self-start' : 
                  'bg-primary align-self-end text-end'
                }`}
                style={{
                  maxWidth: '85%',
                  marginLeft: msg.isAiResponse ? '0' : 'auto',
                  marginRight: msg.isAiResponse ? 'auto' : '0',
                }}
              >
                <div className="d-flex align-items-center mb-1">
                  {msg.isAiResponse ? (
                    <>
                      <Badge bg="info" className="me-2">
                        <span>{msg.userRoleIcon}</span> {msg.userRoleName}
                      </Badge>
                      <small className="text-white opacity-75 ms-auto">{formatTime(msg.timestamp)}</small>
                    </>
                  ) : (
                    <>
                      <small className="text-white opacity-75 me-auto">{formatTime(msg.timestamp)}</small>
                      <Badge bg="primary" className="ms-2">
                        <span>{msg.userRoleIcon}</span> {msg.userRoleName}
                      </Badge>
                    </>
                  )}
                </div>
                <div className="message-text text-white">
                  {msg.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < msg.text.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </ListGroup.Item>
            ))}
            
            {isTyping && (
              <ListGroup.Item 
                className="border-0 px-2 py-2 mb-2 rounded bg-gray-600 align-self-start"
                style={{ maxWidth: '85%' }}
              >
                <div className="d-flex align-items-center">
                  <Badge bg="info" className="me-2">
                    <span>🤖</span> AI Assistant
                  </Badge>
                  <div className="typing-indicator ms-2">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </ListGroup.Item>
            )}
            
            <div ref={messagesEndRef} />
          </ListGroup>
        </div>
        
        {/* Message input */}
        <div className="message-input bg-gray-800 p-3 border-top border-gray-700">
          <Form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <div className="d-flex">
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Type a message to the AI assistant..."
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                className="bg-gray-600 text-white border-dark me-2"
                style={{ 
                  resize: 'none',
                  color: 'white', 
                  caretColor: 'white'
                }}
              />
              <Button 
                variant="info" 
                onClick={sendMessage}
                disabled={!message.trim()}
                className="align-self-end"
              >
                <SendFill />
              </Button>
            </div>
            <small className="text-muted mt-1 d-block">
              Press Enter to send. Shift+Enter for new line.
            </small>
          </Form>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AIChat;