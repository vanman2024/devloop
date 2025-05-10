import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useChangeTracker } from './ChangeTracker.jsx';
// Using try/catch to handle potential missing services
let notificationService;
try {
  notificationService = require('../services/notificationService');
} catch (error) {
  console.warn('Notification service not available:', error);
  // Create mock service functions if the actual service is unavailable
  notificationService = {
    registerNotificationHandler: () => () => {},
    dispatchNotification: () => {}
  };
}

const Header = () => {
  const location = useLocation();
  const { changes, showChanges, setShowChanges } = useChangeTracker();
  
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);
  
  // Handle new notifications
  const handleNotification = useCallback((notification) => {
    console.log("Classic Header received notification:", notification);
    
    // Add notification to our state
    setNotifications(prev => {
      // Add to beginning of array (newest first)
      const updated = [notification, ...prev];
      // Keep only most recent 30 notifications
      return updated.slice(0, 30);
    });
    
    // Increment unread count if dropdown is closed
    if (!showNotifications) {
      setUnreadCount(prev => prev + 1);
    }
  }, [showNotifications]);
  
  // Register notification handler
  useEffect(() => {
    // Register with the notification service if available
    const unregister = notificationService.registerNotificationHandler(handleNotification);
    
    // Cleanup on unmount
    return () => {
      if (typeof unregister === 'function') {
        unregister();
      }
    };
  }, [handleNotification]);
  
  // Click outside handler to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle notifications dropdown
  const toggleNotifications = () => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    
    // Reset unread count when opening
    if (newState) {
      setUnreadCount(0);
    }
  };
  
  const views = [
    { id: 'hybrid', path: '/', label: 'Hybrid View', icon: '⚡' },
    { id: 'pm', path: '/pm', label: 'PM View', icon: '📊' },
    { id: 'dev', path: '/dev', label: 'Dev View', icon: '💻' },
    { id: 'ai', path: '/ai-assistant', label: 'AI Assistant', icon: '🤖' },
    { id: 'changes', path: '/change-center', label: 'Change Center', icon: '🎨' }
  ];

  // Helper function to determine if a view is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 p-4">
      {/* Simplified header with only search bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* User Profile */}
          <span className="flex items-center">
            <span className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">DL</span>
          </span>
        </div>
        
        <div className="relative w-full max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Search features, components, or changes..."
            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-3 pr-10 text-white"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center space-x-4" ref={notificationsRef}>
          {/* Notifications */}
          <div className="relative">
            <button 
              className="text-gray-300 hover:text-white relative" 
              onClick={toggleNotifications}
              title="Notifications"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              
              {/* Notification badge */}
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50">
                <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-white text-sm font-medium">Notifications</h3>
                  <button 
                    className="text-xs text-blue-400 hover:text-blue-300"
                    onClick={() => {
                      // Mark all as read
                      setNotifications(prevNotifications => 
                        prevNotifications.map(n => ({ ...n, read: true }))
                      );
                      setUnreadCount(0);
                    }}
                  >
                    Mark all as read
                  </button>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      <p>No notifications</p>
                      <button 
                        className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                        onClick={() => {
                          // Send a test notification
                          dispatchNotification({
                            type: 'info',
                            title: 'Test Notification',
                            description: 'This is a test notification from the classic header.',
                            timestamp: new Date().toISOString()
                          });
                        }}
                      >
                        Send test notification
                      </button>
                    </div>
                  ) : (
                    <div>
                      {notifications.map((notification, index) => (
                        <div 
                          key={notification.id || index}
                          className={`p-3 border-b border-gray-700 hover:bg-gray-700 ${notification.read ? 'opacity-70' : ''}`}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium text-white">
                              {notification.title}
                              {!notification.read && (
                                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">
                            {notification.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-2 border-t border-gray-700 text-center">
                  <Link 
                    to="/activity-center"
                    className="text-sm text-blue-400 hover:text-blue-300"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Utility buttons */}
          <Link 
            to="/header-demo"
            className="text-gray-300 hover:text-white ml-2"
            title="Header Demo"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;