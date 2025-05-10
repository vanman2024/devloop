/**
 * WebSocket-based service for real-time activity updates
 * Extends the basic activityService with real-time capabilities
 */

import useWebSocket from '../hooks/useWebSocket';
import { dispatchNotification } from './notificationService';

// Determine WebSocket URL based on environment
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Use the same host as the current page, with the ws/wss protocol
  return `${protocol}//${host}/ws/activities`;
};

/**
 * Custom hook that provides WebSocket-based activity functionality
 * @returns {Object} WebSocket activity methods and state
 */
export const useWebSocketActivities = () => {
  // Get the WebSocket URL
  const wsUrl = getWebSocketUrl();
  
  // Use the WebSocket hook
  const {
    isConnected,
    lastMessage,
    error,
    resetError,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts
  } = useWebSocket(wsUrl, {
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  });
  
  /**
   * Process incoming WebSocket message and determine if it's an activity update
   * If it is, dispatch a notification
   * @param {Object} message WebSocket message
   */
  const processActivityMessage = (message) => {
    if (!message) return;
    
    // Check if the message is an activity update
    if (message.type === 'activity_update') {
      // Dispatch notification for new activities
      if (message.data && message.data.action === 'created') {
        dispatchNotification({
          title: message.data.activity.title,
          description: message.data.activity.description,
          type: message.data.activity.type,
          id: message.data.activity.id,
          onClick: () => {
            // Navigate to the activity detail if applicable
            if (message.data.activity.id) {
              window.location.href = `/activity-center?activity=${message.data.activity.id}`;
            }
          }
        });
      }
      
      return message.data;
    }
    
    return null;
  };
  
  /**
   * Send an activity subscription message to the server
   * This tells the server which types of activities we want to receive
   * @param {Object} subscriptionOptions Subscription options
   */
  const subscribeToActivities = (subscriptionOptions = {}) => {
    const subscriptionMessage = {
      type: 'subscribe',
      channel: 'activities',
      options: {
        types: subscriptionOptions.types || ['all'],
        milestones: subscriptionOptions.milestones || [],
        features: subscriptionOptions.features || []
      }
    };
    
    sendMessage(subscriptionMessage);
  };
  
  /**
   * Create a new activity through the WebSocket connection
   * @param {Object} activityData Activity data to create
   */
  const createActivityViaWebSocket = (activityData) => {
    const message = {
      type: 'activity_create',
      data: activityData
    };
    
    return sendMessage(message);
  };
  
  /**
   * Update an activity through the WebSocket connection
   * @param {string} id Activity ID
   * @param {Object} activityData Updated activity data
   */
  const updateActivityViaWebSocket = (id, activityData) => {
    const message = {
      type: 'activity_update',
      id,
      data: activityData
    };
    
    return sendMessage(message);
  };
  
  return {
    isConnected,
    lastMessage,
    error,
    resetError,
    connect,
    disconnect,
    reconnectAttempts,
    processActivityMessage,
    subscribeToActivities,
    createActivity: createActivityViaWebSocket,
    updateActivity: updateActivityViaWebSocket
  };
};

export default useWebSocketActivities;