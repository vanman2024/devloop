/**
 * Service for handling activity data fetching and management
 * Connects to the backend activity API
 */

// Base API URL
const API_BASE_URL = '/api';

/**
 * Fetch all activities from the backend
 * @returns {Promise<Array>} Array of activity objects
 */
export const fetchActivities = async () => {
  try {
    // In a real implementation, this would call the actual API
    const response = await fetch(`${API_BASE_URL}/activities`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching activities:', error);
    
    // For development/fallback, return mock data
    return getMockActivities();
  }
};

/**
 * Fetch a single activity by ID
 * @param {string} id Activity ID
 * @returns {Promise<Object>} Activity object
 */
export const fetchActivityById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/activities/${id}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching activity ${id}:`, error);
    
    // For development/fallback, find the activity in mock data
    const mockActivities = getMockActivities();
    return mockActivities.find(activity => activity.id === id) || null;
  }
};

/**
 * Post a new activity to the backend
 * @param {Object} activityData Activity data to create
 * @returns {Promise<Object>} Created activity object
 */
export const createActivity = async (activityData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

/**
 * Update an existing activity
 * @param {string} id Activity ID
 * @param {Object} activityData Updated activity data
 * @returns {Promise<Object>} Updated activity object
 */
export const updateActivity = async (id, activityData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityData),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating activity ${id}:`, error);
    throw error;
  }
};

/**
 * Delete an activity
 * @param {string} id Activity ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteActivity = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting activity ${id}:`, error);
    throw error;
  }
};

/**
 * Review an activity (approve or reject)
 * @param {string} id Activity ID
 * @param {string} reviewStatus The new review status ('approved', 'rejected')
 * @param {string} comment Optional review comment
 * @param {string} userRole The role of the user making the comment (default: 'developer')
 * @param {string} visibility Comment visibility setting (default: 'all')
 * @returns {Promise<Object>} Updated activity object
 */
export const reviewActivity = async (id, reviewStatus, comment = '', userRole = 'developer', visibility = 'all') => {
  try {
    // User roles reference
    const userRoles = [
      { id: 'developer', name: 'Developer', icon: '👨‍💻' },
      { id: 'manager', name: 'Manager', icon: '👨‍💼' },
      { id: 'reviewer', name: 'Reviewer', icon: '🔍' },
      { id: 'qa', name: 'QA', icon: '🧪' },
      { id: 'pm', name: 'Product Manager', icon: '📊' }
    ];
    
    // Get role information
    const roleInfo = userRoles.find(role => role.id === userRole) || userRoles[0];
    
    const reviewData = {
      reviewStatus,
      reviewComments: comment,
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'angeldev', // In a real app, this would be the current user
      userRole: roleInfo.id,
      userRoleName: roleInfo.name,
      userRoleIcon: roleInfo.icon,
      visibility: visibility,
      // For routing purposes - who should be notified
      notifyRoles: visibility === 'all' ? 
        ['developer', 'manager', 'reviewer', 'qa', 'pm'] : 
        visibility === 'team' ? 
          ['developer', 'manager', 'reviewer'] : 
          ['ai']
    };
    
    // In a real implementation this would use a dedicated review endpoint
    const response = await fetch(`${API_BASE_URL}/activities/${id}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // For development/mock purposes, manually update the activity in the mock data
    if (response.url.includes('/api/activities/')) {
      const mockActivities = getMockActivities();
      const activity = mockActivities.find(act => act.id === id);
      
      if (activity) {
        activity.reviewStatus = reviewStatus;
        activity.reviewComments = comment;
        activity.reviewedAt = reviewData.reviewedAt;
        activity.reviewedBy = reviewData.reviewedBy;
        activity.userRole = reviewData.userRole;
        activity.userRoleName = reviewData.userRoleName;
        activity.userRoleIcon = reviewData.userRoleIcon;
        activity.visibility = reviewData.visibility;
        activity.notifyRoles = reviewData.notifyRoles;
        activity.status = reviewStatus === 'approved' ? 'success' : 
                        reviewStatus === 'rejected' ? 'failed' : 
                        'pending_review';
        
        // Add comment to comments array if it exists
        if (comment && comment.trim()) {
          const newComment = {
            id: Date.now().toString(),
            text: comment,
            timestamp: new Date().toISOString(),
            user: 'angeldev',
            userRole: reviewData.userRole,
            userRoleName: reviewData.userRoleName,
            userRoleIcon: reviewData.userRoleIcon,
            visibility: reviewData.visibility,
            notifyRoles: reviewData.notifyRoles
          };
          
          if (!activity.comments) {
            activity.comments = [];
          }
          
          activity.comments.push(newComment);
          
          // If this is an AI-directed comment, simulate an AI response
          if (reviewData.visibility === 'ai') {
            setTimeout(() => {
              // Generate an AI response
              const aiResponses = [
                "I've analyzed this activity and found it aligns with our project goals. The implementation follows best practices.",
                "Thank you for your feedback. I'll incorporate these suggestions into future code generation.",
                "I've noted the concerns about this approach. Would you like me to generate an alternative implementation?",
                "This implementation has been updated based on your feedback. The changes address the performance issues you mentioned.",
                "I'm detecting a potential issue with the proposed approach. Would you like me to highlight specific concerns?",
                "I've logged this feedback and will adjust my understanding of your preferences for future tasks."
              ];
              
              const aiResponse = {
                id: `ai-response-${Date.now()}`,
                text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
                timestamp: new Date(Date.now() + 2000).toISOString(), // 2 seconds later
                user: 'Claude AI',
                userRole: 'ai',
                userRoleName: 'AI Assistant',
                userRoleIcon: '🤖',
                visibility: 'all',
                isAiResponse: true
              };
              
              if (activity.comments) {
                activity.comments.push(aiResponse);
              }
              
              // In a real implementation, we would emit an event or use websockets to notify the UI
              // For now, this simulated response won't show up until the next data refresh
            }, 2000);
          }
        }
        
        return {...activity};
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error reviewing activity ${id}:`, error);
    
    // For development/fallback, update the mock data
    try {
      const mockActivities = getMockActivities();
      const activity = mockActivities.find(act => act.id === id);
      
      if (activity) {
        // User roles reference
        const userRoles = [
          { id: 'developer', name: 'Developer', icon: '👨‍💻' },
          { id: 'manager', name: 'Manager', icon: '👨‍💼' },
          { id: 'reviewer', name: 'Reviewer', icon: '🔍' },
          { id: 'qa', name: 'QA', icon: '🧪' },
          { id: 'pm', name: 'Product Manager', icon: '📊' }
        ];
        
        // Get role information
        const roleInfo = userRoles.find(role => role.id === userRole) || userRoles[0];
        
        activity.reviewStatus = reviewStatus;
        activity.reviewComments = comment;
        activity.reviewedAt = new Date().toISOString();
        activity.reviewedBy = 'angeldev';
        activity.userRole = roleInfo.id;
        activity.userRoleName = roleInfo.name;
        activity.userRoleIcon = roleInfo.icon;
        activity.visibility = visibility;
        activity.notifyRoles = visibility === 'all' ? 
          ['developer', 'manager', 'reviewer', 'qa', 'pm'] : 
          visibility === 'team' ? 
            ['developer', 'manager', 'reviewer'] : 
            ['ai'];
        activity.status = reviewStatus === 'approved' ? 'success' : 
                        reviewStatus === 'rejected' ? 'failed' : 
                        'pending_review';
        
        // Add comment to comments array if it exists
        if (comment && comment.trim()) {
          const newComment = {
            id: Date.now().toString(),
            text: comment,
            timestamp: new Date().toISOString(),
            user: 'angeldev',
            userRole: roleInfo.id,
            userRoleName: roleInfo.name,
            userRoleIcon: roleInfo.icon,
            visibility: visibility,
            notifyRoles: activity.notifyRoles
          };
          
          if (!activity.comments) {
            activity.comments = [];
          }
          
          activity.comments.push(newComment);
        }
        
        return {...activity};
      }
    } catch (e) {
      console.error('Error updating mock data:', e);
    }
    
    throw error;
  }
};

/**
 * Generate mock activity data for development and testing
 * @returns {Array} Array of mock activity objects
 */
const getMockActivities = () => {
  const now = new Date();
  
  // Return just two activities with the working styling
  return [
    {
      id: 'act-001',
      timestamp: now.toISOString(),
      type: 'feature',
      title: 'AI Generated: Activity Graph Optimization',
      description: 'Optimized relationship graph visualization for better performance',
      user: 'claude-ai',
      status: 'pending_review',
      featureId: 'feature-7001-activity-center',
      milestoneId: 'milestone-ui-dashboard',
      details: 'Improved D3.js force-directed graph rendering and optimized data structures for better visualization performance.',
      actionable: true,
      actions: ['Review', 'View Feature'],
      reviewStatus: 'pending',
      reviewPriority: 'high'
    },
    {
      id: 'act-002',
      timestamp: new Date(now.getTime() - 15 * 60000).toISOString(), // 15 minutes ago
      type: 'code',
      title: 'AI Generated: WebSocket Implementation',
      description: 'Added real-time updates via WebSockets',
      user: 'claude-ai',
      status: 'pending_review',
      featureId: 'feature-7002-websocket',
      milestoneId: 'milestone-ui-dashboard',
      details: 'Implemented WebSocket connection with automatic reconnection and error handling.',
      actionable: true,
      actions: ['Review', 'Run Tests'],
      reviewStatus: 'pending',
      reviewPriority: 'medium'
    }
  ];
};

/**
 * Get activity statistics
 * @returns {Promise<Object>} Activity statistics
 */
export const getActivityStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/activities/stats`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    
    // Generate mock stats based on the mock activities
    const activities = getMockActivities();
    
    const typeCount = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});
    
    const statusCount = activities.reduce((acc, activity) => {
      if (activity.status) {
        acc[activity.status] = (acc[activity.status] || 0) + 1;
      }
      return acc;
    }, {});
    
    return {
      total: activities.length,
      byType: typeCount,
      byStatus: statusCount
    };
  }
};