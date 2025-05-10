import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
// Import notification service
import { 
  registerNotificationHandler, 
  dispatchNotification,
  getNotificationSettings,
  updateNotificationSettings
} from '../../services/notificationService';
// Import from regular heroicons - these come from @heroicons/react v2.1.1
import { 
  BellIcon, 
  MagnifyingGlassIcon, 
  UserCircleIcon, 
  Cog6ToothIcon, 
  KeyIcon, 
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

/**
 * Modal Component
 * Reusable modal component with customizable content
 */
const Modal = ({ show, onClose, title, children, size = 'md', footerContent }) => {
  if (!show) return null;
  
  // Handle click on the backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Determine width based on size prop
  const getModalWidth = () => {
    switch (size) {
      case 'sm': return 'max-w-md';
      case 'lg': return 'max-w-4xl';
      case 'xl': return 'max-w-6xl';
      case 'md':
      default: return 'max-w-2xl';
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-[2000] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-gray-800 rounded-lg shadow-xl w-full ${getModalWidth()} transition-all transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-xl font-medium text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {children}
        </div>
        
        {footerContent && (
          <div className="px-4 py-3 border-t border-gray-700 flex justify-end space-x-3">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * GlobalHeader Component
 * 
 * A full-width horizontal header with three main sections:
 * - Left: Logo/app name
 * - Center: Search bar
 * - Right: Notifications and profile controls
 */
const GlobalHeader = () => {
  // Authentication state - hardcoded for demonstration
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  
  // Modal states for profile actions
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(getNotificationSettings());
  const [unreadCount, setUnreadCount] = useState(0);
  
  const profileMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);
  
  // Handle new notifications coming from the notification service
  const handleNotification = useCallback((notification) => {
    console.log("GlobalHeader received notification:", notification);
    
    setNotifications(prev => {
      // Format the notification to match expected structure
      const formattedNotification = {
        id: notification.id || Date.now(),
        type: notification.type || 'info',
        title: notification.title || 'Notification',
        message: notification.description || '',
        details: notification.metadata?.details || notification.description || '',
        icon: getIconForType(notification.type),
        iconColor: getColorForType(notification.type),
        time: notification.timestamp || new Date().toISOString(),
        read: false,
        expanded: false
      };
      
      // Add the new notification to the beginning of the array
      const updated = [formattedNotification, ...prev];
      // Keep only the most recent 50 notifications
      return updated.slice(0, 50);
    });
    
    // Increment unread count if notification panel is not open
    if (!showNotificationsMenu) {
      setUnreadCount(prev => prev + 1);
    }
  }, [showNotificationsMenu]);
  
  // Register with the notification service
  useEffect(() => {
    // Register our handler with the notification service
    const unregister = registerNotificationHandler(handleNotification);
    
    // Initialize with some example notifications if empty
    if (notifications.length === 0) {
      const initialNotifications = [
        {
          id: 1,
          type: 'ai',
          title: 'New AI suggestion',
          message: 'Optimization for your dashboard code',
          details: 'The AI analysis identified potential performance improvements in your dashboard rendering code. Consider implementing React.memo() for components that don\'t frequently update and using virtualization for long lists.',
          icon: 'AI',
          iconColor: 'bg-blue-500',
          time: new Date().toISOString(),
          read: false,
          expanded: false
        },
        {
          id: 2,
          type: 'success',
          title: 'Build successful',
          message: 'feature-7001-dark-theme completed',
          details: 'Build #1289 completed successfully. All tests passed. The feature-7001-dark-theme has been deployed to the staging environment and is ready for testing.',
          icon: '✓',
          iconColor: 'bg-green-500',
          time: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 min ago
          read: false,
          expanded: false
        },
        {
          id: 3,
          type: 'error',
          title: 'Test failed',
          message: '3 tests failed in integration suite',
          details: 'The following tests failed: UserAuthTest.testInvalidCredentials, FeatureCardTest.testEmptyState, DashboardTest.testFilterByDate. Check the CI logs for more details.',
          icon: '!',
          iconColor: 'bg-red-500',
          time: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          read: false,
          expanded: false
        },
        {
          id: 4,
          type: 'warning',
          title: 'Deployment pending',
          message: 'Waiting for approval to deploy',
          details: 'The deployment to production is pending approval from Ryan Angel. The changes include UI improvements and backend optimizations for the feature manager.',
          icon: '⚠',
          iconColor: 'bg-yellow-500',
          time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          read: true,
          expanded: false
        }
      ];
      
      setNotifications(initialNotifications);
      setUnreadCount(initialNotifications.filter(n => !n.read).length);
    }
    
    // Clean up when component unmounts
    return () => {
      unregister();
    };
  }, [handleNotification]);
  
  // Helper to get icon based on notification type
  const getIconForType = (type) => {
    switch (type) {
      case 'ai': return 'AI';
      case 'success': 
      case 'deploy': return '✓';
      case 'error': return '!';
      case 'warning': return '⚠';
      case 'feature': return '📋';
      case 'build': return '🔨';
      case 'update': return '↑';
      default: return 'i';
    }
  };
  
  // Helper to get color based on notification type
  const getColorForType = (type) => {
    switch (type) {
      case 'ai': return 'bg-blue-500';
      case 'success':
      case 'deploy': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'feature': return 'bg-indigo-500';
      case 'build': return 'bg-purple-500';
      case 'update': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Count unread notifications
  // Set unread count based on notifications
  useEffect(() => {
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, [notifications]);
  
  // Mock user data
  const mockUser = {
    name: "Ryan Angel",
    email: "ryan@devloop.app",
    role: "Admin",
    status: "online" // online, away, offline
  };

  // Close profile and notifications menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Skip if the click is on the toggle buttons themselves
      const isProfileButton = event.target.closest('button') === profileMenuRef.current?.querySelector('button');
      const isNotificationButton = event.target.closest('button') === notificationsMenuRef.current?.querySelector('button');
      
      // Handle profile menu
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target) && !isProfileButton) {
        console.log("Click outside profile menu detected, closing menu");
        setShowProfileMenu(false);
      }
      
      // Handle notifications menu
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target) && !isNotificationButton) {
        console.log("Click outside notifications menu detected, closing menu");
        setShowNotificationsMenu(false);
      }
    };

    // Add both mousedown and touchstart for better mobile support
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    
    console.log("Added click outside event listeners");
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      console.log("Removed click outside event listeners");
    };
  }, [showProfileMenu, showNotificationsMenu]);

  // Handle sign in/out
  const handleSignIn = () => {
    console.log("Sign in clicked");
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    console.log("Sign out clicked");
    setIsAuthenticated(false);
    setShowProfileMenu(false);
  };

  // Toggle profile menu
  const toggleProfileMenu = (e) => {
    // Prevent event bubbling
    e.stopPropagation();
    
    console.log("Toggle profile menu", !showProfileMenu);
    setShowProfileMenu(prevState => !prevState);
    
    // Close notifications menu if it's open
    if (showNotificationsMenu) {
      setShowNotificationsMenu(false);
    }
    
    // Force focus on the menu for accessibility
    setTimeout(() => {
      if (!showProfileMenu) {
        // If we're opening the menu, focus on it after a small delay to allow rendering
        const menu = profileMenuRef.current?.querySelector('button, a');
        if (menu) {
          console.log("Focusing on menu item");
          menu.focus();
        }
      }
    }, 50);
  };
  
  // Toggle notifications menu
  const toggleNotificationsMenu = (e) => {
    // Prevent event bubbling
    e.stopPropagation();
    
    console.log("Toggle notifications menu", !showNotificationsMenu);
    setShowNotificationsMenu(prevState => !prevState);
    
    // Close profile menu if it's open
    if (showProfileMenu) {
      setShowProfileMenu(false);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = (e) => {
    if (e) {
      e.stopPropagation();
    }
    
    console.log("Marking all notifications as read");
    
    // Update all notifications to be marked as read
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    
    setNotifications(updatedNotifications);
    setUnreadCount(0);
  };
  

  // Toggle notification expansion
  const toggleNotificationExpansion = (id) => (e) => {
    e.stopPropagation();
    
    console.log(`Toggling expansion for notification ${id}`);
    
    // Update the expanded state for this notification
    const updatedNotifications = notifications.map(notification => 
      notification.id === id 
        ? { ...notification, expanded: !notification.expanded } 
        : notification
    );
    
    setNotifications(updatedNotifications);
  };
  
  // Send a test notification - useful for debugging
  const sendTestNotification = () => {
    dispatchNotification({
      type: 'feature',
      title: 'Test Notification',
      description: 'This is a test notification from the Global Header.',
      metadata: {
        details: 'This notification was sent manually to test the notification system integration.',
        source: 'GlobalHeader',
        timestamp: new Date().toISOString()
      }
    });
  };
  
  // Mark a single notification as read
  const markAsRead = (id) => (e) => {
    e.stopPropagation();
    
    // Find the notification
    const notification = notifications.find(n => n.id === id);
    
    console.log(`Marking notification ${id} as read`);
    
    // Update the specific notification to be marked as read
    const updatedNotifications = notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    
    setNotifications(updatedNotifications);
  };
  
  // Handle profile menu item clicks
  const handleViewProfile = () => {
    console.log("View Profile clicked");
    setShowProfileModal(true);
    setShowProfileMenu(false); // Close the menu
  };
  
  const handleAccountSettings = () => {
    console.log("Account Settings clicked");
    setShowSettingsModal(true);
    setShowProfileMenu(false); // Close the menu
  };
  
  const handleChangePassword = () => {
    console.log("Change Password clicked");
    setShowPasswordModal(true);
    setShowProfileMenu(false); // Close the menu
  };
  
  const handleUserManagement = () => {
    console.log("User Management clicked");
    setShowUserManagementModal(true);
    setShowProfileMenu(false); // Close the menu
  };
  
  // Close all modals
  const closeAllModals = () => {
    setShowProfileModal(false);
    setShowSettingsModal(false);
    setShowPasswordModal(false);
    setShowUserManagementModal(false);
  };

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Render status indicator dot
  const renderStatusDot = (status) => {
    const statusColors = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      offline: 'bg-gray-400',
    };

    return (
      <span className={`absolute bottom-0 right-0 h-3 w-3 ${statusColors[status]} rounded-full border-2 border-gray-800 status-dot`}></span>
    );
  };

  return (
    <>
      {/* Add CSS to fix potential conflicts with other components */}
      <style>
        {`
          /* Fix z-index issues in GlobalHeader */
          .global-header {
            z-index: 50 !important;
          }
          
          /* Fix modal z-index to ensure it appears on top */
          .global-header-modal {
            z-index: 2000 !important;
          }
          
          /* Override any conflicting dropdown styles */
          .global-header .dropdown-menu {
            z-index: 1001 !important;
            background-color: #1E293B !important;
            border: 1px solid #2D3B4E !important;
          }
          
          /* Fix notification panel positioning */
          .global-header .notifications-panel {
            position: absolute !important;
            right: 0 !important;
            margin-top: 0.5rem !important;
          }
          
          /* Fix profile menu positioning */
          .global-header .profile-menu {
            position: absolute !important;
            right: 0 !important;
            margin-top: 0.5rem !important;
          }
        `}
      </style>
      
      {/* Modals */}
      <Modal 
        show={showProfileModal} 
        onClose={closeAllModals} 
        title="Profile"
        size="md"
        footerContent={
          <button 
            onClick={closeAllModals}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        }
      >
        <div className="text-gray-200">
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl">
              {getInitials(mockUser.name)}
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-medium text-white">{mockUser.name}</h3>
              <p className="text-gray-400">{mockUser.email}</p>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-200">
                  {mockUser.role}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">Account Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Username</p>
                  <p className="text-white">rangeldev</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Joined</p>
                  <p className="text-white">January 15, 2024</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Last Login</p>
                  <p className="text-white">Today, 2:45 PM</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <p className="text-white flex items-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                    Active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      
      <Modal 
        show={showSettingsModal} 
        onClose={closeAllModals} 
        title="Account Settings"
        size="md"
        footerContent={
          <div>
            <button 
              onClick={closeAllModals}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors mr-2"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                console.log("Settings saved");
                closeAllModals();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        }
      >
        <div className="text-gray-200 space-y-6">
          <div>
            <h4 className="text-white font-medium mb-3">Display Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Dark Mode</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={true} className="sr-only peer" onChange={() => {}} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span>Compact View</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={false} className="sr-only peer" onChange={() => {}} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-3">Notification Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Email Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={true} className="sr-only peer" onChange={() => {}} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span>System Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={true} className="sr-only peer" onChange={() => {}} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      
      <Modal 
        show={showPasswordModal} 
        onClose={closeAllModals} 
        title="Change Password"
        size="sm"
        footerContent={
          <div>
            <button 
              onClick={closeAllModals}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors mr-2"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                console.log("Password changed");
                closeAllModals();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Change Password
            </button>
          </div>
        }
      >
        <div className="text-gray-200 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
            <div className="relative">
              <input 
                type="password" 
                id="currentPassword" 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300">
                <EyeSlashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
            <div className="relative">
              <input 
                type="password" 
                id="newPassword" 
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300">
                <EyeIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Password must be at least 8 characters and include a number and symbol.
            </div>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
        </div>
      </Modal>
      
      <Modal 
        show={showUserManagementModal} 
        onClose={closeAllModals} 
        title="User Management"
        size="lg"
        footerContent={
          <button 
            onClick={closeAllModals}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        }
      >
        <div className="text-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="ml-3">
              <button className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                Add User
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {[
                  { id: 1, name: 'Ryan Angel', email: 'ryan@devloop.app', role: 'Admin', status: 'Active' },
                  { id: 2, name: 'Jane Smith', email: 'jane@devloop.app', role: 'Developer', status: 'Active' },
                  { id: 3, name: 'Mike Johnson', email: 'mike@devloop.app', role: 'Viewer', status: 'Inactive' }
                ].map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'Admin' ? 'bg-purple-900 text-purple-200' : 
                        user.role === 'Developer' ? 'bg-blue-900 text-blue-200' : 
                        'bg-gray-900 text-gray-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.status === 'Active' ? 'bg-green-900 text-green-200' : 'bg-gray-900 text-gray-200'
                      }`}>
                        <span className={`h-2 w-2 rounded-full mr-1.5 ${
                          user.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'
                        }`}></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-400 hover:text-blue-300 mr-2">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-400 hover:text-red-300">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    
      <header className="w-full bg-gray-900 shadow-md px-6 py-3 fixed top-0 left-0 z-50 global-header">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between">
          {/* Left section: Logo/app name */}
          <div className="flex-shrink-0">
            <span className="text-xl font-semibold text-white transition-colors duration-200 hover:text-indigo-400">Devloop</span>
          </div>

          {/* Center section: Search bar */}
          <div className="flex-grow max-w-3xl mx-10">
            <div className="relative search-bar">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-800 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                placeholder="Search features, components, or changes..."
                aria-label="Search"
              />
            </div>
          </div>

          {/* Right section: Notifications and profile */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notificationsMenuRef}>
                  <button 
                    onClick={toggleNotificationsMenu}
                    className="p-1 relative text-gray-300 hover:text-white focus:outline-none transition-colors duration-200" 
                    aria-label="Notifications"
                    aria-expanded={showNotificationsMenu}
                    aria-haspopup="true"
                  >
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 justify-center items-center text-xs text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      </span>
                    )}
                  </button>
                  
                  {/* Notifications dropdown menu */}
                  <div 
                    className={`origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-[1001] transition-all duration-200 ease-in-out ${
                      showNotificationsMenu 
                        ? 'opacity-100 scale-100 pointer-events-auto' 
                        : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    aria-hidden={!showNotificationsMenu}
                  >
                    <div className="px-4 py-3 border-b border-gray-700">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-white">
                          Notifications {unreadCount > 0 && (
                            <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </h3>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead(e);
                          }}
                          className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                          disabled={unreadCount === 0}
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-400">
                          <p>No notifications</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              sendTestNotification();
                            }}
                            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                          >
                            Send test notification
                          </button>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div 
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-150 ${
                              notification.read ? 'opacity-70' : ''
                            }`}
                          >
                            <div 
                              className="flex items-start cursor-pointer"
                              onClick={toggleNotificationExpansion(notification.id)}
                            >
                              <div className={`flex-shrink-0 rounded-full ${notification.iconColor} h-8 w-8 flex items-center justify-center text-white`}>
                                {notification.icon}
                              </div>
                              <div className="ml-3 w-full">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                                    {notification.title}
                                    {!notification.read && (
                                      <span className="inline-block ml-2 w-2 h-2 rounded-full bg-blue-500"></span>
                                    )}
                                  </p>
                                  <svg 
                                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${notification.expanded ? 'transform rotate-180' : ''}`} 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                  >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <p className="text-xs text-gray-400">{notification.message}</p>
                                <div className="mt-1 flex justify-between text-xs">
                                  <span className="text-gray-400">{notification.time}</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!notification.read) {
                                        markAsRead(notification.id)(e);
                                      } else {
                                        toggleNotificationExpansion(notification.id)(e);
                                      }
                                    }}
                                    className="text-blue-400 hover:text-blue-300 focus:outline-none"
                                  >
                                    {!notification.read ? 'Mark as read' : (notification.expanded ? 'Collapse' : 'View')}
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Expanded notification details */}
                            {notification.expanded && (
                              <div className="mt-3 pl-11 border-t border-gray-700 pt-3 text-sm text-gray-300">
                                <p>{notification.details}</p>
                                <div className="mt-2 flex justify-between items-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    notification.type === 'ai' ? 'bg-blue-900 text-blue-200' :
                                    notification.type === 'success' ? 'bg-green-900 text-green-200' :
                                    notification.type === 'error' ? 'bg-red-900 text-red-200' :
                                    'bg-yellow-900 text-yellow-200'
                                  }`}>
                                    {notification.type.toUpperCase()}
                                  </span>
                                  <div className="space-x-2">
                                    {!notification.read && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id)(e);
                                        }}
                                        className="text-xs text-blue-400 hover:text-blue-300 focus:outline-none"
                                      >
                                        Mark as read
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Close expansion
                                        toggleNotificationExpansion(notification.id)(e);
                                      }}
                                      className="text-xs text-gray-400 hover:text-gray-300 focus:outline-none"
                                    >
                                      Collapse
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 bg-gray-900 text-center flex justify-center space-x-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Expanding all notifications");
                          
                          // Expand all notifications
                          const updatedNotifications = notifications.map(notification => ({
                            ...notification,
                            expanded: true
                          }));
                          
                          setNotifications(updatedNotifications);
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                      >
                        Expand all
                      </button>
                      <span className="text-gray-500">|</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Collapsing all notifications");
                          
                          // Collapse all notifications
                          const updatedNotifications = notifications.map(notification => ({
                            ...notification,
                            expanded: false
                          }));
                          
                          setNotifications(updatedNotifications);
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                      >
                        Collapse all
                      </button>
                    </div>
                  </div>
                </div>

                {/* Profile dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={toggleProfileMenu}
                    className="flex items-center focus:outline-none transition-transform duration-200 hover:scale-105"
                    aria-expanded={showProfileMenu}
                    aria-haspopup="true"
                    aria-label="User profile menu"
                  >
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white transition-colors duration-200 hover:bg-indigo-500">
                        {getInitials(mockUser.name)}
                      </div>
                      {renderStatusDot(mockUser.status)}
                    </div>
                  </button>

                  {/* Profile dropdown menu - Always in DOM but visibility controlled by CSS */}
                  <div 
                    className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-700 profile-menu transition-all duration-200 ease-in-out z-[1001] ${
                      showProfileMenu 
                        ? 'opacity-100 scale-100 pointer-events-auto' 
                        : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                    aria-hidden={!showProfileMenu}
                  >
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{mockUser.name}</p>
                      <p className="text-sm text-gray-400 truncate">{mockUser.email}</p>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-200">
                          {mockUser.role}
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
                      >
                        <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                        View Profile
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccountSettings();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
                      >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Account Settings
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangePassword();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
                      >
                        <KeyIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Change Password
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserManagement();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
                      >
                        <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        User Management
                      </button>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSignOut();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-150"
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500 transition-colors duration-200"
                aria-label="Sign In"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default GlobalHeader;