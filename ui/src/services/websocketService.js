/**
 * WebSocketService for handling real-time communication
 * Manages connections, reconnection, and event handling
 */

class WebSocketService {
  constructor() {
    this.socket = null;
    this.url = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.status = 'disconnected'; // disconnected, connecting, connected, error
  }

  /**
   * Initialize WebSocket connection with event handling
   * @param {string} url - The WebSocket server URL
   * @returns {Promise} - Resolves when connection is established, rejects on error
   */
  connect(url = 'ws://localhost:8080') {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve(this.socket);
        return;
      }

      this.url = url;
      this.isConnecting = true;
      this.status = 'connecting';

      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnecting = false;
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.emit('connection_status', { status: 'connected' });
          resolve(this.socket);
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.status = 'disconnected';
          this.socket = null;

          this.emit('connection_status', { 
            status: 'disconnected',
            code: event.code,
            reason: event.reason
          });

          // Attempt to reconnect if not closing intentionally
          if (event.code !== 1000) {
            this.reconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.status = 'error';
          this.emit('connection_status', { status: 'error', error });
          
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(error);
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type && typeof data.type === 'string') {
              this.emit(data.type, data.payload);
            } else {
              this.emit('message', data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.emit('message', event.data);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.status = 'error';
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the WebSocket server with exponential backoff
   */
  reconnect() {
    if (this.reconnectTimeout || this.isConnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      this.emit('connection_status', { 
        status: 'max_attempts_reached',
        attempts: this.reconnectAttempts
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('connection_status', { 
      status: 'reconnecting',
      attempt: this.reconnectAttempts,
      delay: delay
    });
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.url).catch(() => {
        // Error is already handled in the connect method
      });
    }, delay);
  }

  /**
   * Send a message to the WebSocket server
   * @param {string} type - Message type
   * @param {any} payload - Message payload
   * @returns {boolean} - Success status
   */
  send(type, payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message: WebSocket is not connected');
      return false;
    }

    try {
      const message = JSON.stringify({
        type: type,
        payload: payload
      });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Close the WebSocket connection
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   */
  disconnect(code = 1000, reason = 'Client disconnected') {
    if (this.socket) {
      this.socket.close(code, reason);
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.status = 'disconnected';
    this.reconnectAttempts = 0;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback to remove
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket ${event} event handler:`, error);
        }
      });
    }
  }

  /**
   * Get current connection status
   * @returns {string} - Connection status
   */
  getStatus() {
    return this.status;
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;