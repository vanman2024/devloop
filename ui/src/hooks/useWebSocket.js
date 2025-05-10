import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for WebSocket connections with reconnection capabilities
 * @param {string} url - WebSocket server URL
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Whether to connect automatically on hook mount
 * @param {number} options.reconnectInterval - Milliseconds to wait before reconnecting (default: 5000)
 * @param {number} options.maxReconnectAttempts - Maximum number of reconnection attempts (default: 10)
 * @returns {Object} WebSocket connection state and control methods
 */
const useWebSocket = (url, options = {}) => {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Use refs for values that shouldn't trigger re-renders
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Clear any existing socket and reconnect timer
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    try {
      // Create new WebSocket connection
      const socket = new WebSocket(url);
      socketRef.current = socket;

      // Connection opened
      socket.addEventListener('open', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
      });

      // Listen for messages
      socket.addEventListener('message', (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setLastMessage(parsedData);
        } catch (err) {
          // Handle non-JSON messages
          setLastMessage(event.data);
        }
      });

      // Connection closed
      socket.addEventListener('close', (event) => {
        console.log(`WebSocket disconnected with code: ${event.code}`, event.reason);
        setIsConnected(false);
        
        // Only attempt to reconnect if it's not a normal closure
        if (event.code !== 1000) {
          attemptReconnect();
        }
      });

      // Connection error
      socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
        setIsConnected(false);
      });
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(`Failed to connect: ${err.message}`);
      attemptReconnect();
    }
  }, [url]);

  // Attempt to reconnect
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts < maxReconnectAttempts) {
      console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
      
      reconnectTimerRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, reconnectInterval);
    } else {
      setError(`Maximum reconnection attempts reached (${maxReconnectAttempts})`);
    }
  }, [connect, maxReconnectAttempts, reconnectAttempts, reconnectInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close(1000, 'Normal closure');
      socketRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((data) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(message);
      return true;
    } catch (err) {
      setError(`Send error: ${err.message}`);
      return false;
    }
  }, []);

  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup function
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    resetError,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts
  };
};

export default useWebSocket;