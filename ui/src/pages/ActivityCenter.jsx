import React, { useState, useEffect, useCallback } from 'react';
import { Card, Container, Row, Col, Spinner, Alert, Badge, Button, Tabs, Tab } from 'react-bootstrap';
import { FiRefreshCw, FiList, FiClipboard, FiBarChart2, FiUsers, FiShare2, FiCheckSquare } from 'react-icons/fi';
import ActivityFeed from '../components/activity/ActivityFeed';
import ActivityFilters from '../components/activity/ActivityFilters';
import ActivityStats from '../components/activity/ActivityStats';
import ActivitySearch from '../components/activity/ActivitySearch';
import NotificationCenter from '../components/activity/NotificationCenter';
import ActivityDashboard from '../components/activity/ActivityDashboard';
import ReviewCenter from '../components/activity/ReviewCenter';
import RelationshipGraph from '../components/activity/RelationshipGraph';
import TaskListView from '../components/tasks/TaskListView';
import { fetchActivities } from '../components/activity/activityService';
import { useWebSocketActivities } from '../services/websocketActivityService';
import { loadNotificationSettings } from '../services/notificationService';

const ActivityCenter = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    timeframe: '7days',
    status: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [newActivitiesCount, setNewActivitiesCount] = useState(0);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');

  // Initialize WebSocket for real-time activity updates
  const {
    isConnected,
    lastMessage,
    error: wsError,
    resetError,
    processActivityMessage,
    subscribeToActivities
  } = useWebSocketActivities();

  // Fetch activities from the backend
  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchActivities();
      setActivities(data);
      setFilteredActivities(data);
      setNewActivitiesCount(0);
      setShouldRefresh(false);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity data. Please try again later.');
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadActivities();
    
    // Load notification settings
    loadNotificationSettings();
    
    // Check URL parameters for specific tabs or activities
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['feed', 'dashboard', 'review', 'relationships'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [loadActivities]);

  // Process WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const activityUpdate = processActivityMessage(lastMessage);
      
      if (activityUpdate) {
        if (activityUpdate.action === 'created') {
          // A new activity was created
          setNewActivitiesCount(prev => prev + 1);
          setShouldRefresh(true);
        } else if (activityUpdate.action === 'updated' && activityUpdate.activity) {
          // An existing activity was updated
          setActivities(prev => 
            prev.map(activity => 
              activity.id === activityUpdate.activity.id ? activityUpdate.activity : activity
            )
          );
        } else if (activityUpdate.action === 'deleted' && activityUpdate.activityId) {
          // An activity was deleted
          setActivities(prev => 
            prev.filter(activity => activity.id !== activityUpdate.activityId)
          );
        }
      }
    }
  }, [lastMessage, processActivityMessage]);

  // Subscribe to activity updates when connection is established
  useEffect(() => {
    if (isConnected) {
      // Subscribe to all activity types
      subscribeToActivities({
        types: ['all']
      });
      
      // Clear any WebSocket errors
      if (wsError) {
        resetError();
      }
    }
  }, [isConnected, subscribeToActivities, wsError, resetError]);

  // Apply filters and search when they change
  useEffect(() => {
    if (!activities.length) return;

    let result = [...activities];

    // Apply type filter
    if (filters.type !== 'all') {
      result = result.filter(activity => activity.type === filters.type);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(activity => activity.status === filters.status);
    }

    // Apply timeframe filter
    const now = new Date();
    let cutoffDate;
    
    switch (filters.timeframe) {
      case 'today':
        cutoffDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case '7days':
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '30days':
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
      default:
        cutoffDate = new Date(0); // Beginning of time
    }

    result = result.filter(activity => new Date(activity.timestamp) >= cutoffDate);

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(activity => 
        activity.title.toLowerCase().includes(query) || 
        activity.description.toLowerCase().includes(query) ||
        (activity.user && activity.user.toLowerCase().includes(query))
      );
    }

    setFilteredActivities(result);
  }, [activities, filters, searchQuery]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleRefresh = () => {
    loadActivities();
  };
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without reloading the page
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  // Render content based on active tab
  const renderTabContent = () => {
    // Common alert for new activities
    const newActivitiesAlert = shouldRefresh && (
      <Alert variant="info" className="mb-3 d-flex justify-content-between align-items-center">
        <span>New activities are available</span>
        <Button 
          variant="outline-info" 
          size="sm" 
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Alert>
    );
    
    // Show loading spinner while data is being fetched
    if (loading && !activities.length && activeTab !== 'tasks') {
      return (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'tasks':
        return <TaskListView />;
        
      case 'dashboard':
        return <ActivityDashboard realTimeUpdates={isConnected} />;
        
      case 'review':
        return <ReviewCenter />;
        
      case 'relationships':
        return <RelationshipGraph activities={activities} height={600} />;
        
      case 'feed':
      default:
        return (
          <Row>
            <Col md={3}>
              <Card className="bg-gray-700 border-0 shadow mb-4">
                <Card.Body>
                  <ActivityFilters 
                    filters={filters} 
                    onFilterChange={handleFilterChange} 
                  />
                </Card.Body>
              </Card>
              <Card className="bg-gray-700 border-0 shadow">
                <Card.Body>
                  <ActivityStats 
                    activities={filteredActivities} 
                    realTimeUpdates={isConnected}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col md={9}>
              {newActivitiesAlert}
              
              {loading ? (
                <div className="d-flex justify-content-center my-5">
                  <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                <ActivityFeed 
                  activities={filteredActivities} 
                  realTimeUpdates={isConnected}
                />
              )}
            </Col>
          </Row>
        );
    }
  };

  return (
    <Container fluid className="activity-center pb-4">
      <Row className="mb-4">
        <Col>
          <h1 className="text-2xl font-bold mb-4">Activity Center</h1>
          <p className="text-gray-300 mb-4">
            Track all system activities, user actions, and process updates in one place
          </p>
        </Col>
      </Row>

      {(error || wsError) && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">
              {error || `WebSocket error: ${wsError}`}
            </Alert>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col md={activeTab === 'feed' ? 9 : 7}>
          {activeTab === 'feed' && <ActivitySearch onSearch={handleSearch} />}
        </Col>
        <Col md={activeTab === 'feed' ? 3 : 5} className="d-flex justify-content-end align-items-center">
          {/* WebSocket connection status indicator */}
          <div className="me-3">
            <Badge bg={isConnected ? 'success' : 'danger'} className="p-2">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          {/* Refresh button */}
          <Button 
            variant="outline-light" 
            className="me-2"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} />
            {newActivitiesCount > 0 && (
              <Badge bg="danger" className="ms-1">
                {newActivitiesCount}
              </Badge>
            )}
          </Button>
          
          {/* Notification Center */}
          <NotificationCenter />
        </Col>
      </Row>

      <Tabs
        id="activity-center-tabs"
        activeKey={activeTab}
        onSelect={handleTabChange}
        className="mb-4 nav-tabs-custom"
      >
        <Tab 
          eventKey="feed" 
          title={
            <span>
              <FiList className="me-2" />
              Activity Feed
            </span>
          }
        />
        <Tab 
          eventKey="tasks" 
          title={
            <span>
              <FiCheckSquare className="me-2" />
              Tasks
            </span>
          }
        />
        <Tab 
          eventKey="dashboard" 
          title={
            <span>
              <FiBarChart2 className="me-2" />
              Dashboard
            </span>
          }
        />
        <Tab 
          eventKey="review" 
          title={
            <span>
              <FiClipboard className="me-2" />
              Review Center
            </span>
          }
        />
        <Tab 
          eventKey="relationships" 
          title={
            <span>
              <FiShare2 className="me-2" />
              Relationship Graph
            </span>
          }
        />
      </Tabs>

      {renderTabContent()}
      
      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .nav-tabs-custom .nav-link {
          color: #adb5bd;
          padding: 0.75rem 1rem;
        }
        .nav-tabs-custom .nav-link.active {
          color: #ffffff;
          background-color: #2c3e50;
          border-bottom: 3px solid #3498db;
        }
      `}</style>
    </Container>
  );
};

export default ActivityCenter;