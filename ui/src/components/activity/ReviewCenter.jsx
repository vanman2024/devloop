import React, { useState, useEffect } from 'react';
import { Card, Button, Tabs, Tab, Form, Badge, Row, Col, ListGroup, Alert, Nav } from 'react-bootstrap';
import { CheckCircleFill, XCircleFill, ChatLeftTextFill, Clock, Search, Robot } from 'react-bootstrap-icons';
import { fetchActivities, reviewActivity } from '../../components/activity/activityService';
import AIChat from './AIChat';

/**
 * ReviewCenter component for reviewing AI-generated activities
 * Allows approval/rejection workflow and commenting
 */
const ReviewCenter = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [comment, setComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('comments');

  // Fetch activities that need review
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const data = await fetchActivities();
        
        // Filter for AI-generated activities or those needing review
        const reviewableActivities = data.filter(activity => 
          activity.status === 'pending_review' || 
          activity.reviewStatus || 
          activity.user === 'claude-ai' || 
          activity.user === 'ai' ||
          activity.aiGenerated === true || 
          activity.needsReview === true
        );
        
        if (reviewableActivities.length > 0) {
          setActivities(reviewableActivities);
          
          // Select the first pending activity if any exists
          const pendingActivities = reviewableActivities.filter(
            a => (a.reviewStatus === 'pending' || !a.reviewStatus) && a.status !== 'approved'
          );
          
          if (pendingActivities.length > 0) {
            setSelectedActivity(pendingActivities[0]);
          }
        } else {
          setActivities([]);
          setError('No activities found that require review.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching review activities:', err);
        setError('Failed to load activity data for review.');
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  // Filter activities based on active tab and search query
  const getFilteredActivities = () => {
    if (!activities.length) return [];
    
    // First filter by tab
    let filtered = [...activities];
    
    if (activeTab === 'pending') {
      filtered = filtered.filter(activity => 
        activity.reviewStatus === 'pending' || !activity.reviewStatus
      );
    } else if (activeTab === 'approved') {
      filtered = filtered.filter(activity => activity.reviewStatus === 'approved');
    } else if (activeTab === 'rejected') {
      filtered = filtered.filter(activity => activity.reviewStatus === 'rejected');
    }
    
    // Then filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        (activity.title && activity.title.toLowerCase().includes(query)) || 
        (activity.description && activity.description.toLowerCase().includes(query)) ||
        (activity.user && activity.user.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  // Handle activity selection
  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
    setComment(''); // Reset comment when selecting a new activity
    setSuccessMessage(''); // Clear success message when selecting a new activity
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  // Handle approving an activity
  const handleApprove = async () => {
    if (!selectedActivity) return;
    
    try {
      setSubmitting(true);
      
      // Submit the approval with the review API
      const updatedActivity = await reviewActivity(
        selectedActivity.id, 
        'approved', 
        comment || 'Approved',
        currentRole,
        commentVisibility
      );
      
      // Update local state
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id === selectedActivity.id ? updatedActivity : activity
        )
      );
      
      setSelectedActivity(updatedActivity);
      setSuccessMessage('Activity has been approved successfully.');
      setSubmitting(false);
    } catch (err) {
      console.error('Error approving activity:', err);
      setError('Failed to approve activity. Please try again.');
      setSubmitting(false);
    }
  };

  // Handle rejecting an activity
  const handleReject = async () => {
    if (!selectedActivity) return;
    
    // Require a comment for rejection
    if (!comment.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Submit the rejection with the review API
      const updatedActivity = await reviewActivity(
        selectedActivity.id, 
        'rejected', 
        comment,
        currentRole,
        commentVisibility
      );
      
      // Update local state
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id === selectedActivity.id ? updatedActivity : activity
        )
      );
      
      setSelectedActivity(updatedActivity);
      setSuccessMessage('Activity has been rejected.');
      setSubmitting(false);
    } catch (err) {
      console.error('Error rejecting activity:', err);
      setError('Failed to reject activity. Please try again.');
      setSubmitting(false);
    }
  };

  // User roles for comments
  const userRoles = [
    { id: 'developer', name: 'Developer', icon: '👨‍💻' },
    { id: 'manager', name: 'Manager', icon: '👨‍💼' },
    { id: 'reviewer', name: 'Reviewer', icon: '🔍' },
    { id: 'qa', name: 'QA', icon: '🧪' },
    { id: 'pm', name: 'Product Manager', icon: '📊' }
  ];
  
  // Current role state (in a real app, this would come from authentication)
  const [currentRole, setCurrentRole] = useState(userRoles[0].id);
  const [commentVisibility, setCommentVisibility] = useState('all'); // 'all', 'team', 'ai'
  
  // Handle adding a comment to an activity
  const handleAddComment = async (customMessage, customVisibility) => {
    // Use provided message or input field value
    const messageText = customMessage || comment;
    
    // Use specified visibility or current dropdown selection
    const visibility = customVisibility || commentVisibility;
    
    if (!selectedActivity || !messageText.trim()) return;
    
    try {
      setSubmitting(true);
      
      // Get current user role information
      const roleInfo = userRoles.find(role => role.id === currentRole) || userRoles[0];
      
      // Add a new comment without changing review status
      const updatedActivity = await reviewActivity(
        selectedActivity.id,
        selectedActivity.reviewStatus || 'pending',
        messageText,
        currentRole,
        visibility
      );
      
      // In a real app, we would also route notifications based on notifyRoles
      
      // Update local state
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id === selectedActivity.id ? updatedActivity : activity
        )
      );
      
      setSelectedActivity(updatedActivity);
      
      // Only clear the form input if using the form (not for programmatic messages)
      if (!customMessage) {
        setComment(''); // Clear comment field
      }
      
      // Show success message for regular comments (not for AI chat messages)
      if (!customVisibility) {
        const visibilityText = visibility === 'all' ? 'Everyone' : 
                               visibility === 'team' ? 'Team Only' : 
                               'the AI';
        setSuccessMessage(`Comment added successfully as ${roleInfo.name} and visible to ${visibilityText}.`);
      }
      
      setSubmitting(false);
      
      // If sending a message to AI, switch to AI chat tab
      if (visibility === 'ai' && activeDetailTab !== 'ai-chat') {
        setActiveDetailTab('ai-chat');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment. Please try again.');
      setSubmitting(false);
    }
  };

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Generate status badge
  const getStatusBadge = (status) => {
    let variant = 'secondary';
    let text = status || 'Unknown';
    
    if (status === 'approved' || status === 'success') {
      variant = 'success';
    } else if (status === 'rejected' || status === 'failed') {
      variant = 'danger';
    } else if (status === 'pending' || status === 'in-progress') {
      variant = 'warning';
    }
    
    return <Badge bg={variant}>{text}</Badge>;
  };

  const filteredActivities = getFilteredActivities();

  return (
    <Card className="review-center bg-gray-800 border-0 shadow">
      <Card.Header className="bg-gray-700 text-white">
        <h4 className="mb-0">Review Center</h4>
        <p className="text-gray-300 mb-0 mt-1">
          Review and approve AI-generated activities
        </p>
      </Card.Header>
      
      <Card.Body className="p-0">
        <Row className="g-0">
          {/* Left side - Activity List */}
          <Col md={4} className="border-end border-secondary">
            <div className="p-3">
              <Form.Group className="mb-3">
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-4 bg-gray-700 text-white border-dark"
                    style={{ color: 'white', caretColor: 'white' }}
                  />
                  <Search className="position-absolute top-50 start-0 translate-middle-y ms-2 text-gray-400" />
                </div>
              </Form.Group>
              
              <Tabs
                id="review-tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="pending" title={
                  <span>
                    Pending <Badge bg="warning" className="ms-1">
                      {activities.filter(a => a.reviewStatus === 'pending' || !a.reviewStatus).length}
                    </Badge>
                  </span>
                } />
                <Tab eventKey="approved" title="Approved" />
                <Tab eventKey="rejected" title="Rejected" />
              </Tabs>
            </div>
            
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-5 text-white">
                <p>No activities found</p>
              </div>
            ) : (
              <ListGroup variant="flush" className="activity-list">
                {filteredActivities.map(activity => (
                  <ListGroup.Item 
                    key={activity.id}
                    action
                    active={selectedActivity && selectedActivity.id === activity.id}
                    onClick={() => handleSelectActivity(activity)}
                    className={`border-start-0 border-end-0 ${
                      selectedActivity && selectedActivity.id === activity.id
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-bold text-white">{activity.title}</div>
                        <small className="text-truncate d-block text-light" style={{ maxWidth: '200px' }}>
                          {activity.description}
                        </small>
                      </div>
                      <div className="ms-2">
                        {getStatusBadge(activity.reviewStatus || activity.status)}
                      </div>
                    </div>
                    <div className="d-flex align-items-center mt-2 text-white opacity-75">
                      <Clock size={14} className="me-1" />
                      <small>{formatTimestamp(activity.timestamp)}</small>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Col>
          
          {/* Right side - Activity Detail with tabbed view */}
          <Col md={8}>
            {!selectedActivity ? (
              <div className="text-center py-5 text-white">
                <p>Select an activity to review</p>
              </div>
            ) : (
              <div className="p-3">
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                
                {successMessage && (
                  <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
                    {successMessage}
                  </Alert>
                )}
                
                <div className="mb-3">
                  <h4>{selectedActivity.title}</h4>
                  <div className="d-flex align-items-center mb-2">
                    <Badge bg="info" className="me-2">AI-Generated</Badge>
                    {getStatusBadge(selectedActivity.reviewStatus || selectedActivity.status)}
                    <span className="ms-3 text-muted">
                      <Clock size={14} className="me-1" />
                      {formatTimestamp(selectedActivity.timestamp)}
                    </span>
                  </div>
                  <p>{selectedActivity.description}</p>
                </div>
                
                <Card className="bg-gray-700 mb-3">
                  <Card.Header className="bg-gray-600 text-white">Activity Details</Card.Header>
                  <Card.Body className="text-white">
                    <div className="mb-2">
                      <strong className="text-light">Type:</strong> <span className="text-light">{selectedActivity.type}</span>
                    </div>
                    {selectedActivity.user && (
                      <div className="mb-2">
                        <strong className="text-light">User:</strong> <span className="text-light">{selectedActivity.user}</span>
                      </div>
                    )}
                    {selectedActivity.featureId && (
                      <div className="mb-2">
                        <strong className="text-light">Feature:</strong> <span className="text-light">{selectedActivity.featureId}</span>
                      </div>
                    )}
                    {selectedActivity.milestoneId && (
                      <div className="mb-2">
                        <strong className="text-light">Milestone:</strong> <span className="text-light">{selectedActivity.milestoneId}</span>
                      </div>
                    )}
                    {selectedActivity.details && (
                      <div className="mb-2">
                        <strong className="text-light">Details:</strong> <span className="text-light">{selectedActivity.details}</span>
                      </div>
                    )}
                    {selectedActivity.reviewedAt && (
                      <div className="mb-2">
                        <strong className="text-light">Reviewed At:</strong> <span className="text-light">{formatTimestamp(selectedActivity.reviewedAt)}</span>
                      </div>
                    )}
                    {selectedActivity.reviewComment && (
                      <div className="mb-2">
                        <strong className="text-light">Review Comment:</strong> <span className="text-light">{selectedActivity.reviewComment}</span>
                      </div>
                    )}
                  </Card.Body>
                </Card>
                
                {/* Custom tab navigation - avoiding Bootstrap Nav component */}
                {/* Tabs matching the style from the screenshot */}
                <div style={{ 
                  marginBottom: '1rem', 
                  display: 'flex',
                  borderBottom: '1px solid #4b5563',
                }}>
                  <div 
                    onClick={() => setActiveDetailTab('comments')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveDetailTab('comments')}
                    style={{
                      backgroundColor: 'transparent',
                      color: activeDetailTab === 'comments' ? '#3B82F6' : '#a0aec0',
                      padding: '0.75rem 1.25rem',
                      borderBottom: activeDetailTab === 'comments' ? '2px solid #3B82F6' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: activeDetailTab === 'comments' ? 'bold' : 'normal'
                    }}
                  >
                    <ChatLeftTextFill style={{ marginRight: '0.5rem' }} />
                    Team Comments
                  </div>
                  <div 
                    onClick={() => setActiveDetailTab('ai-chat')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveDetailTab('ai-chat')}
                    style={{
                      backgroundColor: 'transparent',
                      color: activeDetailTab === 'ai-chat' ? '#3B82F6' : '#a0aec0',
                      padding: '0.75rem 1.25rem',
                      borderBottom: activeDetailTab === 'ai-chat' ? '2px solid #3B82F6' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: activeDetailTab === 'ai-chat' ? 'bold' : 'normal'
                    }}
                  >
                    <Robot style={{ marginRight: '0.5rem' }} />
                    AI Chat
                  </div>
                </div>
                
                {/* Comments tab */}
                {activeDetailTab === 'comments' && (
                  <Card className="bg-gray-700 mb-3">
                    <Card.Body className="text-white">
                      {!selectedActivity.comments || selectedActivity.comments.length === 0 || 
                       !selectedActivity.comments.filter(c => c.visibility !== 'ai').length ? (
                        <p className="text-light">No team comments yet</p>
                      ) : (
                        <ListGroup variant="flush" className="bg-transparent mb-3">
                          {selectedActivity.comments
                            .filter(c => c.visibility !== 'ai') // Filter out AI-only messages
                            .map(comment => (
                            <ListGroup.Item 
                              key={comment.id} 
                              className="bg-transparent text-white border-bottom border-secondary"
                            >
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  <strong className="text-light me-2">{comment.user}</strong>
                                  {comment.userRoleIcon && comment.userRoleName && (
                                    <Badge bg="info" className="d-flex align-items-center">
                                      <span className="me-1">{comment.userRoleIcon}</span>
                                      {comment.userRoleName}
                                    </Badge>
                                  )}
                                  {comment.visibility && comment.visibility !== 'all' && (
                                    <Badge bg={comment.visibility === 'ai' ? 'info' : 'secondary'} className="ms-2">
                                      {comment.visibility === 'team' ? 'Team Only' : '📨 Sent to AI'}
                                    </Badge>
                                  )}
                                </div>
                                <small className="text-light opacity-75">{formatTimestamp(comment.timestamp)}</small>
                              </div>
                              <p className="mb-0 mt-2 text-light">{comment.text}</p>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                      
                      <Form>
                        <Form.Group className="mb-3">
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Add a comment for the team..."
                            value={comment}
                            onChange={handleCommentChange}
                            className="bg-gray-600 text-white border-dark"
                            style={{
                              color: 'white', 
                              caretColor: 'white',
                            }}
                            onFocus={(e) => e.target.classList.add('focused-dark')}
                          />
                        </Form.Group>
                        
                        <div className="d-flex flex-wrap gap-3 mb-3">
                          {/* Role selector */}
                          <Form.Group>
                            <Form.Label className="text-light mb-1">Comment as</Form.Label>
                            <Form.Select 
                              value={currentRole}
                              onChange={(e) => setCurrentRole(e.target.value)}
                              className="bg-gray-600 text-white border-dark"
                              style={{ minWidth: '150px', color: 'white' }}
                            >
                              {userRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.icon} {role.name}
                                </option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                          
                          {/* Visibility selector for team comments */}
                          <Form.Group>
                            <Form.Label className="text-light mb-1">Visible to</Form.Label>
                            <Form.Select 
                              value={commentVisibility === 'ai' ? 'all' : commentVisibility}
                              onChange={(e) => setCommentVisibility(e.target.value)}
                              className="bg-gray-600 text-white border-dark"
                              style={{ minWidth: '150px', color: 'white' }}
                            >
                              <option value="all">Everyone</option>
                              <option value="team">Team Only</option>
                            </Form.Select>
                          </Form.Group>
                        </div>
                        
                        <div className="d-flex gap-2">
                          <Button 
                            variant="primary" 
                            onClick={handleAddComment}
                            disabled={!comment.trim() || submitting}
                          >
                            Add Comment
                          </Button>
                          <Button 
                            variant="success" 
                            onClick={handleApprove}
                            disabled={submitting || selectedActivity.reviewStatus === 'approved'}
                          >
                            <CheckCircleFill className="me-2" />
                            Approve
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={handleReject}
                            disabled={submitting || selectedActivity.reviewStatus === 'rejected'}
                          >
                            <XCircleFill className="me-2" />
                            Reject
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                )}
                
                {/* AI Chat tab */}
                {activeDetailTab === 'ai-chat' && (
                  <AIChat 
                    activityId={selectedActivity.id}
                    onMessageSent={(message) => {
                      // This creates a record in the activity comments but marked as AI-only
                      handleAddComment(message, 'ai');
                    }}
                  />
                )}
              </div>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default ReviewCenter;