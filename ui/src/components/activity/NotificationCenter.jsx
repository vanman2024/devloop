import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Badge, Button, Offcanvas } from 'react-bootstrap';
import { BellFill, X, Gear } from 'react-bootstrap-icons';
import { 
  registerNotificationHandler, 
  getNotificationSettings,
  updateNotificationSettings
} from '../../services/notificationService';

/**
 * Notification Center component
 * Displays real-time notifications and provides a notification history
 */
const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(getNotificationSettings());
  const [unreadCount, setUnreadCount] = useState(0);

  // Handle new notifications
  const handleNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Add the new notification to the beginning of the array
      const updated = [notification, ...prev];
      // Keep only the most recent 50 notifications
      return updated.slice(0, 50);
    });
    
    // Increment unread count if the panel is not open
    if (!showOffcanvas) {
      setUnreadCount(prev => prev + 1);
    }
  }, [showOffcanvas]);

  // Register notification handler on mount
  useEffect(() => {
    // Register our handler function
    const unregister = registerNotificationHandler(handleNotification);
    
    // Cleanup function to unregister when component unmounts
    return () => {
      unregister();
    };
  }, [handleNotification]);

  // Handle toggling the notification panel
  const toggleOffcanvas = () => {
    const newState = !showOffcanvas;
    setShowOffcanvas(newState);
    
    // Reset unread count when opening
    if (newState) {
      setUnreadCount(0);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Toggle a specific notification setting
  const toggleSetting = (key, value = null) => {
    const newSettings = { ...settings };
    
    if (typeof value === 'boolean') {
      newSettings[key] = value;
    } else {
      newSettings[key] = !newSettings[key];
    }
    
    setSettings(newSettings);
    updateNotificationSettings(newSettings);
  };

  // Toggle a specific activity type notification setting
  const toggleActivityTypeSetting = (type) => {
    const newSettings = { 
      ...settings,
      activityTypes: {
        ...settings.activityTypes,
        [type]: !settings.activityTypes[type]
      }
    };
    
    setSettings(newSettings);
    updateNotificationSettings(newSettings);
  };

  // Format notification timestamp as relative time
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Get variant for notification based on type/status
  const getNotificationVariant = (notification) => {
    if (notification.status === 'failed' || notification.type === 'error') {
      return 'danger';
    } else if (notification.status === 'in-progress' || notification.status === 'pending') {
      return 'warning';
    } else if (notification.type === 'feature') {
      return 'info';
    } else if (notification.type === 'deploy') {
      return 'success';
    } else if (notification.type === 'build') {
      return 'primary';
    } else if (notification.type === 'test') {
      return 'secondary';
    }
    
    return 'light';
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="notification-button position-relative">
        <Button 
          variant="outline-light" 
          className="rounded-circle p-2" 
          onClick={toggleOffcanvas}
          aria-label="Notifications"
        >
          <BellFill size={20} />
          {unreadCount > 0 && (
            <Badge 
              bg="danger" 
              className="position-absolute top-0 start-100 translate-middle rounded-pill"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification Offcanvas Panel */}
      <Offcanvas 
        show={showOffcanvas} 
        onHide={toggleOffcanvas} 
        placement="end"
        className="bg-dark text-light"
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className="d-flex justify-content-between align-items-center w-100">
            <span>Notifications</span>
            <div>
              <Button 
                variant="outline-light" 
                size="sm" 
                className="me-2"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Gear />
              </Button>
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={clearAllNotifications}
              >
                Clear All
              </Button>
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        
        <Offcanvas.Body>
          {/* Settings Panel */}
          {showSettings && (
            <div className="notification-settings mb-3 p-3 border border-secondary rounded">
              <h6 className="mb-3">Notification Settings</h6>
              
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="desktop-notifications"
                    checked={settings.desktop}
                    onChange={() => toggleSetting('desktop')}
                  />
                  <label className="form-check-label" htmlFor="desktop-notifications">
                    Desktop Notifications
                  </label>
                </div>
                
                <div className="form-check form-switch">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="sound-notifications"
                    checked={settings.sound}
                    onChange={() => toggleSetting('sound')}
                  />
                  <label className="form-check-label" htmlFor="sound-notifications">
                    Sound Notifications
                  </label>
                </div>
              </div>
              
              <h6 className="mb-2">Notification Types</h6>
              <div className="mb-3 d-flex flex-wrap gap-2">
                {Object.entries(settings.activityTypes).map(([type, enabled]) => (
                  <div key={type} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`type-${type}`}
                      checked={enabled}
                      onChange={() => toggleActivityTypeSetting(type)}
                    />
                    <label className="form-check-label" htmlFor={`type-${type}`}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Notification List */}
          {notifications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification, index) => (
                <Alert 
                  key={notification.id || index}
                  variant={getNotificationVariant(notification)}
                  className="mb-2"
                >
                  <div className="d-flex justify-content-between">
                    <strong>{notification.title}</strong>
                    <small>{formatNotificationTime(notification.timestamp)}</small>
                  </div>
                  <p className="mb-0">{notification.description}</p>
                </Alert>
              ))}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default NotificationCenter;