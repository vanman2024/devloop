/**
 * Service for managing real-time notifications
 * Handles notification storage, retrieval, and state
 */

// Store the registered notification handlers
const handlers = new Set();

// Store notification settings
let settings = {
  desktop: true,             // Desktop notifications (browser API)
  sound: true,               // Play sound on notification
  activityTypes: {           // Which activity types to show notifications for
    error: true,
    feature: true,
    build: true,
    test: true,
    deploy: true,
    update: true
  },
  notificationDuration: 5000 // How long notifications should stay visible (ms)
};

/**
 * Register a notification handler
 * @param {Function} handler Function to call with new notifications
 * @returns {Function} Function to unregister the handler
 */
export const registerNotificationHandler = (handler) => {
  handlers.add(handler);
  
  // Return a function to unregister this handler
  return () => {
    handlers.delete(handler);
  };
};

/**
 * Dispatch a notification to all registered handlers
 * @param {Object} notification Notification object
 */
export const dispatchNotification = (notification) => {
  // Skip notification if settings don't allow this type
  if (notification.type && !settings.activityTypes[notification.type]) {
    return;
  }
  
  // Add timestamp if not provided
  if (!notification.timestamp) {
    notification.timestamp = new Date().toISOString();
  }
  
  // Dispatch to all handlers
  handlers.forEach(handler => {
    handler(notification);
  });
  
  // Show desktop notification if enabled
  if (settings.desktop && 'Notification' in window) {
    showDesktopNotification(notification);
  }
  
  // Play sound if enabled
  if (settings.sound) {
    playNotificationSound();
  }
};

/**
 * Show a desktop notification using the Browser Notifications API
 * @param {Object} notification Notification object
 */
const showDesktopNotification = (notification) => {
  // Check if the browser supports notifications
  if (!('Notification' in window)) {
    return;
  }
  
  // Check if permission has been granted
  if (Notification.permission === 'granted') {
    createDesktopNotification(notification);
  }
  // Otherwise, request permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        createDesktopNotification(notification);
      }
    });
  }
};

/**
 * Create and display a desktop notification
 * @param {Object} notification Notification object
 */
const createDesktopNotification = (notification) => {
  // Create notification title based on notification type and content
  const title = notification.title || `New ${notification.type || 'activity'}`;
  
  // Create notification options
  const options = {
    body: notification.description || 'New notification received',
    icon: '/favicon.svg', // Default icon
    tag: notification.id || Date.now().toString(),
  };
  
  // Create and show the notification
  const desktopNotification = new Notification(title, options);
  
  // Auto-close after duration
  setTimeout(() => {
    desktopNotification.close();
  }, settings.notificationDuration);
  
  // Handle click
  desktopNotification.onclick = () => {
    window.focus();
    if (notification.onClick) {
      notification.onClick();
    }
  };
};

/**
 * Play a notification sound
 */
const playNotificationSound = () => {
  // Create an audio element and play the notification sound
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(err => {
      console.warn('Could not play notification sound', err);
    });
  } catch (err) {
    console.warn('Error playing notification sound', err);
  }
};

/**
 * Update notification settings
 * @param {Object} newSettings New settings to apply
 * @returns {Object} Updated settings
 */
export const updateNotificationSettings = (newSettings) => {
  settings = {
    ...settings,
    ...newSettings,
    activityTypes: {
      ...settings.activityTypes,
      ...(newSettings.activityTypes || {})
    }
  };
  
  // Save settings to localStorage for persistence
  try {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save notification settings', err);
  }
  
  return settings;
};

/**
 * Load notification settings from localStorage on init
 */
export const loadNotificationSettings = () => {
  try {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      settings = {
        ...settings,
        ...JSON.parse(savedSettings)
      };
    }
  } catch (err) {
    console.warn('Failed to load notification settings', err);
  }
  
  return settings;
};

/**
 * Get current notification settings
 * @returns {Object} Current settings
 */
export const getNotificationSettings = () => {
  return {...settings};
};

// Load settings on module initialization
loadNotificationSettings();