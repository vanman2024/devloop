import React, { useState } from 'react';
import { Card, Badge, Button, Dropdown, Modal } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeed = ({ activities }) => {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Function to determine badge color based on activity type
  const getBadgeVariant = (type) => {
    switch (type) {
      case 'feature':
        return 'primary';
      case 'build':
        return 'success';
      case 'test':
        return 'info';
      case 'deploy':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Function to render activity icon based on type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'feature':
        return '📋';
      case 'build':
        return '🔨';
      case 'test':
        return '🧪';
      case 'deploy':
        return '🚀';
      case 'error':
        return '⚠️';
      case 'update':
        return '🔄';
      default:
        return '📝';
    }
  };

  // Function to handle action button clicks
  const handleAction = (activity, action) => {
    setSelectedActivity(activity);
    
    switch (action) {
      case 'View Details':
        setShowDetailsModal(true);
        break;
      case 'View Feature':
        setShowFeatureModal(true);
        break;
      case 'View Logs':
        setShowLogsModal(true);
        break;
      case 'Run Tests':
        setConfirmAction('run-tests');
        setShowConfirmModal(true);
        break;
      case 'Re-run Tests':
        setConfirmAction('rerun-tests');
        setShowConfirmModal(true);
        break;
      case 'Restart Service':
        setConfirmAction('restart-service');
        setShowConfirmModal(true);
        break;
      case 'Rollback':
        setConfirmAction('rollback');
        setShowConfirmModal(true);
        break;
      default:
        console.log(`Action not implemented: ${action}`);
    }
  };

  // Function to execute confirmed action
  const executeAction = () => {
    setShowConfirmModal(false);
    
    switch (confirmAction) {
      case 'run-tests':
      case 'rerun-tests':
        setRunningTest(true);
        // Simulate test run
        setTimeout(() => {
          setRunningTest(false);
        }, 3000);
        break;
      case 'restart-service':
        // Simulate service restart
        setTimeout(() => {
          // Show success notification or something
        }, 2000);
        break;
      case 'rollback':
        setIsRollingBack(true);
        // Simulate rollback
        setTimeout(() => {
          setIsRollingBack(false);
        }, 3000);
        break;
    }
  };

  // Function to handle deploy action
  const handleDeploy = (activity) => {
    setSelectedActivity(activity);
    setIsDeploying(true);
    
    // Simulate deployment
    setTimeout(() => {
      setIsDeploying(false);
    }, 3000);
  };

  // Function to render details modal
  const renderDetailsModal = () => {
    if (!selectedActivity) return null;
    
    return (
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered className="activity-details-modal">
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>{getActivityIcon(selectedActivity.type)}</span>
              <span>Activity Details</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowDetailsModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-4">
            <h4 className="d-flex align-items-center mb-3">
              <span className="me-2">{getActivityIcon(selectedActivity.type)}</span>
              {selectedActivity.title}
            </h4>
            
            <div className="card bg-gray-900 mb-3 border-0 shadow-sm">
              <div className="card-header bg-gray-800 text-white font-weight-bold">
                Description
              </div>
              <div className="card-body">
                <p className="text-light mb-0">{selectedActivity.description}</p>
              </div>
            </div>
            
            {selectedActivity.details && (
              <div className="card bg-gray-900 mb-3 border-0 shadow-sm">
                <div className="card-header bg-gray-800 text-white font-weight-bold">
                  Detailed Information
                </div>
                <div className="card-body">
                  <p className="text-light mb-0" style={{ whiteSpace: 'pre-line' }}>{selectedActivity.details}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="d-flex justify-content-between mb-4">
            <div>
              <Badge bg={getBadgeVariant(selectedActivity.type)} className="me-2" style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>
                {selectedActivity.type.toUpperCase()}
              </Badge>
              {selectedActivity.status && (
                <Badge 
                  bg={selectedActivity.status === 'success' ? 'success' : 
                     selectedActivity.status === 'failed' ? 'danger' : 
                     selectedActivity.status === 'in-progress' ? 'warning' : 'info'}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                >
                  {selectedActivity.status.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="text-gray-400">
              {new Date(selectedActivity.timestamp).toLocaleString()}
            </div>
          </div>
          
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3">Context</h5>
            <div className="row">
              {selectedActivity.user && (
                <div className="col-md-4 mb-3">
                  <strong className="d-block text-gray-400">User</strong>
                  <span>{selectedActivity.user}</span>
                </div>
              )}
              {selectedActivity.featureId && (
                <div className="col-md-4 mb-3">
                  <strong className="d-block text-gray-400">Feature</strong>
                  <span>{selectedActivity.featureId}</span>
                </div>
              )}
              {selectedActivity.milestoneId && (
                <div className="col-md-4 mb-3">
                  <strong className="d-block text-gray-400">Milestone</strong>
                  <span>{selectedActivity.milestoneId}</span>
                </div>
              )}
            </div>
          </div>
          
          {selectedActivity.details && (
            <div className="mb-4">
              <h5 className="border-bottom border-gray-700 pb-2 mb-3">Details</h5>
              <div className="bg-gray-900 p-3 rounded shadow-sm">
                <pre className="mb-0 text-light" style={{ maxHeight: '200px', overflow: 'auto' }}>{selectedActivity.details}</pre>
              </div>
            </div>
          )}
          
          {selectedActivity.type === 'deploy' && (
            <div className="mb-4">
              <h5 className="border-bottom border-gray-700 pb-2 mb-3">Deployment Information</h5>
              <div className="card bg-gray-900 border-0 shadow-sm">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <strong className="d-block text-gray-400">Environment</strong>
                      <span>Development</span>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong className="d-block text-gray-400">Deployed By</strong>
                      <span>{selectedActivity.user || 'System'}</span>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong className="d-block text-gray-400">Version</strong>
                      <span>1.0.{Math.floor(Math.random() * 100)}</span>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong className="d-block text-gray-400">Deployment URL</strong>
                      <a href="#" className="text-blue-400">https://dev.example.com/app</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {selectedActivity.type === 'test' && (
            <div className="mb-4">
              <h5 className="border-bottom border-gray-700 pb-2 mb-3">Test Results</h5>
              <div className="card bg-gray-900 border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-3">
                    <div>
                      <span className="text-success me-3 badge bg-success bg-opacity-25">✓ Passed: {selectedActivity.details?.includes('failed') ? '12' : '15'}</span>
                      <span className="text-danger me-3 badge bg-danger bg-opacity-25">✗ Failed: {selectedActivity.details?.includes('failed') ? '3' : '0'}</span>
                      <span className="text-warning badge bg-warning bg-opacity-25">⚠ Skipped: 2</span>
                    </div>
                    <div>
                      <span className="text-gray-400 badge bg-dark">Duration: 45s</span>
                    </div>
                  </div>
                  <div className="bg-dark p-3 rounded shadow-sm mt-3">
                    <pre className="mb-0 text-light" style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {selectedActivity.details}
                      {!selectedActivity.details?.includes('failed') ? '' : `\n\nFailed Tests:\n- MemoryApiConnection.testConnection (timeout)\n- FeatureRegistry.testIntegration (expected: true, actual: false)\n- ActivityLogger.testPerformance (too slow: 200ms > 150ms)`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {selectedActivity.type === 'error' && (
            <div className="mb-4">
              <h5 className="border-bottom border-gray-700 pb-2 mb-3 text-danger">Error Information</h5>
              <div className="card bg-gray-900 border-0 shadow-sm">
                <div className="card-body">
                  <div className="bg-danger bg-opacity-10 p-3 rounded border border-danger text-danger mb-3">
                    <strong>Error Type:</strong> Connection Timeout<br />
                    <strong>Service:</strong> Memory API<br />
                    <strong>Occurred:</strong> {new Date(selectedActivity.timestamp).toLocaleString()}
                  </div>
                  <div className="bg-dark p-3 rounded shadow-sm">
                    <pre className="mb-0 text-light" style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {selectedActivity.details}
                      {!selectedActivity.details?.includes('Service might be down') ? '' : `\n\nError Stack:\nError: Connection timeout after 30 seconds\n    at MemoryApiClient.connect (/system-core/memory/client.js:45:15)\n    at async FeatureManager.loadFeatures (/system-core/ui-system/react-app/src/services/featureService.js:23:5)`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          {selectedActivity.status === 'failed' && (
            <Button variant="outline-warning" className="me-auto shadow-sm" onClick={() => handleAction(selectedActivity, 'Rollback')}>
              <span>↩</span> Rollback
            </Button>
          )}
          {selectedActivity.type === 'test' && (
            <Button variant="outline-info" className="shadow-sm" disabled={runningTest} onClick={() => handleAction(selectedActivity, 'Re-run Tests')}>
              {runningTest ? 'Running Tests...' : '🔄 Re-run Tests'}
            </Button>
          )}
          {selectedActivity.type === 'deploy' && (
            <Button variant="outline-warning" className="shadow-sm" disabled={isRollingBack} onClick={() => handleAction(selectedActivity, 'Rollback')}>
              {isRollingBack ? 'Rolling Back...' : '↩ Rollback Deployment'}
            </Button>
          )}
          {selectedActivity.type === 'error' && (
            <Button variant="outline-danger" className="shadow-sm" onClick={() => handleAction(selectedActivity, 'Restart Service')}>
              🔄 Restart Service
            </Button>
          )}
          {selectedActivity.featureId && (
            <Button variant="outline-primary" className="shadow-sm" onClick={() => handleAction(selectedActivity, 'View Feature')}>
              📋 View Feature
            </Button>
          )}
          <Button variant="secondary" className="shadow-sm" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Function to render logs modal
  const renderLogsModal = () => {
    if (!selectedActivity) return null;
    
    return (
      <Modal show={showLogsModal} onHide={() => setShowLogsModal(false)} size="lg" centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>Activity Logs</Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowLogsModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-3">
            <span className="badge bg-secondary me-2">{selectedActivity.type}</span>
            <span className="text-gray-400">{selectedActivity.title}</span>
          </div>
          
          <div className="bg-gray-900 p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto' }}>
            <pre className="mb-0 text-light">
              {`[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Activity started: ${selectedActivity.title}\n`}
              {`[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: User: ${selectedActivity.user || 'system'}\n`}
              {`[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Type: ${selectedActivity.type}\n`}
              {selectedActivity.featureId ? `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Feature: ${selectedActivity.featureId}\n` : ''}
              {selectedActivity.milestoneId ? `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Milestone: ${selectedActivity.milestoneId}\n` : ''}
              {`[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Description: ${selectedActivity.description}\n`}
              {selectedActivity.type === 'test' ? 
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Starting test execution\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Running test suite: Integration Tests\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Test 1/15: MemoryApiConnection.testBasicConnection - PASSED\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Test 2/15: MemoryApiConnection.testAuthentication - PASSED\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Test 3/15: MemoryApiConnection.testConnection - FAILED\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Error: Connection timeout after 30 seconds\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Test 4/15: FeatureRegistry.testCreate - PASSED\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Test 5/15: FeatureRegistry.testRead - PASSED\n` : ''}
              {selectedActivity.type === 'deploy' ? 
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Starting deployment\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Building artifacts\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Build completed successfully\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Deploying to development environment\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Deployment successful\n` : ''}
              {selectedActivity.type === 'error' ? 
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Connection attempt failed\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Connection timeout after 30 seconds\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Service might be down\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Attempting retry (1/3)\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Retry failed - same error\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Attempting retry (2/3)\n` +
                `[${new Date(selectedActivity.timestamp).toLocaleString()}] ERROR: Retry failed - same error\n` : ''}
              {`[${new Date(selectedActivity.timestamp).toLocaleString()}] INFO: Activity completed with status: ${selectedActivity.status || 'unknown'}\n`}
            </pre>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Dropdown className="me-auto">
            <Dropdown.Toggle variant="outline-secondary" id="logs-export-dropdown">
              Export Logs
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="#">Export as TXT</Dropdown.Item>
              <Dropdown.Item href="#">Export as JSON</Dropdown.Item>
              <Dropdown.Item href="#">Send to Dashboard</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button variant="outline-primary" onClick={() => setShowDetailsModal(true)}>
            View Details
          </Button>
          <Button variant="secondary" onClick={() => setShowLogsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Function to render feature modal
  const renderFeatureModal = () => {
    if (!selectedActivity || !selectedActivity.featureId) return null;
    
    return (
      <Modal show={showFeatureModal} onHide={() => setShowFeatureModal(false)} size="lg" centered className="feature-details-modal">
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>📋</span>
              <span>Feature Details</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowFeatureModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h4 className="d-flex align-items-center">
                <span className="me-2" style={{ fontSize: '1.2rem' }}>🔍</span>
                {selectedActivity.featureId}
              </h4>
              <Badge 
                bg={selectedActivity.status === 'success' ? 'success' : 
                   selectedActivity.status === 'failed' ? 'danger' : 
                   selectedActivity.status === 'in-progress' ? 'warning' : 'info'}
                style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }}
              >
                {selectedActivity.status === 'success' ? 'ACTIVE' : 
                 selectedActivity.status === 'failed' ? 'FAILED' : 
                 selectedActivity.status === 'in-progress' ? 'IN PROGRESS' : 'PENDING'}
              </Badge>
            </div>
            
            {/* Compact feature info */}
            <div className="card bg-gray-900 mb-3 border-0 shadow-sm">
              <div className="card-header bg-gray-800 text-white font-weight-bold" 
                   style={{ background: 'linear-gradient(to right, #2c3e50, #3b506b)' }}>
                Feature Information
              </div>
              <div className="card-body">
                <p className="text-light mb-3">
                  <strong className="text-white-50 d-block mb-1">Description:</strong> 
                  <span className="bg-gray-700 p-2 rounded d-block" style={{ fontSize: '1rem' }}>
                    {selectedActivity.type === 'feature' 
                      ? selectedActivity.description 
                      : 'Feature details associated with this activity'}
                  </span>
                </p>
                
                {selectedActivity.details && (
                  <p className="text-light mb-3">
                    <strong className="text-white-50 d-block mb-1">Details:</strong>
                    <span className="bg-gray-700 p-2 rounded d-block" style={{ 
                      whiteSpace: 'pre-line', 
                      fontSize: '0.9rem',
                      maxHeight: '150px',
                      overflow: 'auto'
                    }}>
                      {selectedActivity.details}
                    </span>
                  </p>
                )}
                
                <div className="row mt-3">
                  {selectedActivity.user && (
                    <div className="col-md-6 mb-2">
                      <strong className="text-white-50 d-block">Created by:</strong> 
                      <span className="text-light">{selectedActivity.user}</span>
                    </div>
                  )}
                  {selectedActivity.timestamp && (
                    <div className="col-md-6 mb-2">
                      <strong className="text-white-50 d-block">Created on:</strong> 
                      <span className="text-light">{new Date(selectedActivity.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedActivity.reviewStatus && (
                    <div className="col-md-6 mb-2">
                      <strong className="text-white-50 d-block">Review Status:</strong> 
                      <span className="text-light">{selectedActivity.reviewStatus.toUpperCase()}</span>
                    </div>
                  )}
                  {selectedActivity.reviewPriority && (
                    <div className="col-md-6 mb-2">
                      <strong className="text-white-50 d-block">Priority:</strong> 
                      <span className="text-light">{selectedActivity.reviewPriority.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3">
              <span className="me-2">🔗</span>Feature Context
            </h5>
            <div className="card bg-gray-900 border-0 shadow-sm">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <strong className="d-block text-gray-400">Feature ID</strong>
                    <span>{selectedActivity.featureId}</span>
                  </div>
                  <div className="col-md-4 mb-3">
                    <strong className="d-block text-gray-400">Milestone</strong>
                    <span>{selectedActivity.milestoneId || 'N/A'}</span>
                  </div>
                  <div className="col-md-4 mb-3">
                    <strong className="d-block text-gray-400">Created By</strong>
                    <span>{selectedActivity.user || 'System'}</span>
                  </div>
                  <div className="col-md-4 mb-3">
                    <strong className="d-block text-gray-400">Last Updated</strong>
                    <span>{new Date(selectedActivity.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="col-md-4 mb-3">
                    <strong className="d-block text-gray-400">Status</strong>
                    <span>{selectedActivity.status || 'Unknown'}</span>
                  </div>
                  <div className="col-md-4 mb-3">
                    <strong className="d-block text-gray-400">Dependencies</strong>
                    <span>2 features</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3">
              <span className="me-2">📆</span>Recent Activities
            </h5>
            <div className="card bg-gray-900 border-0 shadow-sm">
              <div className="card-body p-0">
                <ul className="list-group list-group-flush bg-transparent">
                  <li className="list-group-item bg-transparent text-white border-gray-700 px-3 py-3 hover-highlight">
                    <div className="d-flex justify-content-between">
                      <div>
                        <strong>{selectedActivity.title}</strong>
                        <div className="text-gray-400 small">{selectedActivity.description}</div>
                      </div>
                      <small className="text-gray-400">{formatDistanceToNow(new Date(selectedActivity.timestamp), { addSuffix: true })}</small>
                    </div>
                  </li>
                  <li className="list-group-item bg-transparent text-white border-gray-700 px-3 py-3 hover-highlight">
                    <div className="d-flex justify-content-between">
                      <div>
                        <strong>Feature Updated</strong>
                        <div className="text-gray-400 small">Configuration parameters updated</div>
                      </div>
                      <small className="text-gray-400">2 days ago</small>
                    </div>
                  </li>
                  <li className="list-group-item bg-transparent text-white border-gray-700 px-3 py-3 hover-highlight">
                    <div className="d-flex justify-content-between">
                      <div>
                        <strong>Feature Created</strong>
                        <div className="text-gray-400 small">Initial feature creation</div>
                      </div>
                      <small className="text-gray-400">5 days ago</small>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {selectedActivity.type === 'test' && (
            <div className="mb-4">
              <h5 className="border-bottom border-gray-700 pb-2 mb-3">
                <span className="me-2">🧪</span>Test Coverage
              </h5>
              <div className="card bg-gray-900 border-0 shadow-sm">
                <div className="card-body">
                  <div className="progress mb-3" style={{ height: '25px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      role="progressbar" 
                      style={{ width: '70%' }} 
                      aria-valuenow="70" 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                      70% Coverage
                    </div>
                  </div>
                  <div className="d-flex justify-content-between text-sm text-gray-400">
                    <div>15 tests total</div>
                    <div>Last full test: {formatDistanceToNow(new Date(selectedActivity.timestamp), { addSuffix: true })}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button variant="outline-info" className="me-auto shadow-sm" disabled={runningTest} onClick={() => handleAction(selectedActivity, 'Run Tests')}>
            {runningTest ? 'Running Tests...' : '🧪 Run Tests'}
          </Button>
          <Button variant="outline-warning" className="shadow-sm" disabled={isDeploying} onClick={() => handleDeploy(selectedActivity)}>
            {isDeploying ? 'Deploying...' : '🚀 Deploy Feature'}
          </Button>
          <Button variant="outline-primary" className="shadow-sm" onClick={() => {
            setShowFeatureModal(false);
            setShowDetailsModal(true);
          }}>
            📋 View Activity Details
          </Button>
          <Button variant="secondary" className="shadow-sm" onClick={() => setShowFeatureModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Function to render confirmation modal
  const renderConfirmModal = () => {
    if (!confirmAction || !selectedActivity) return null;
    
    let title = 'Confirm Action';
    let message = 'Are you sure you want to proceed with this action?';
    
    switch (confirmAction) {
      case 'run-tests':
      case 'rerun-tests':
        title = 'Run Tests';
        message = `Are you sure you want to run tests for ${selectedActivity.featureId || 'this feature'}?`;
        break;
      case 'restart-service':
        title = 'Restart Service';
        message = 'Are you sure you want to restart the service? This may cause temporary interruption.';
        break;
      case 'rollback':
        title = 'Rollback Deployment';
        message = 'Are you sure you want to rollback this deployment? All changes will be reverted.';
        break;
    }
    
    return (
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>{title}</Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowConfirmModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p>{message}</p>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={confirmAction === 'rollback' ? 'warning' : 
                    confirmAction === 'restart-service' ? 'danger' : 'primary'} 
            onClick={executeAction}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // If no activities, display a message
  if (activities.length === 0) {
    return (
      <Card className="bg-gray-700 border-0 shadow">
        <Card.Body className="text-center py-5">
          <p className="text-gray-400">No activities found matching your criteria.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      {activities.map((activity) => {
        // Use a darker, more professional color instead of bright blue
        const bgColor = '#2c3e50'; // Dark slate blue/gray - more professional
        
        return (
          <div 
            key={activity.id}
            style={{
              backgroundColor: bgColor,
              color: 'white',
              borderRadius: '0.375rem', 
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
              marginBottom: '1rem',
              border: 'none'
            }}
          >
            <div style={{ padding: '1.25rem' }}>
        
            <div className="d-flex justify-content-between">
              <div className="d-flex">
                <div className="activity-icon me-3">
                  <span role="img" aria-label={activity.type}>
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div>
                  <Card.Title className="text-xl mb-1 link-primary" style={{cursor: 'pointer', color: 'white', fontWeight: 'bold'}} onClick={() => {
                    setSelectedActivity(activity);
                    setShowDetailsModal(true);
                  }}>
                    {activity.title}
                  </Card.Title>
                  <Card.Text style={{color: 'white', fontSize: '1rem', marginBottom: '0.75rem', opacity: 0.9}}>
                    <strong style={{fontWeight: 'bold'}}>Description:</strong> {activity.description}
                  </Card.Text>
                  {activity.details && (
                    <Card.Text style={{color: 'white', fontSize: '0.9rem', marginBottom: '0.75rem', opacity: 0.8}}>
                      <strong style={{fontWeight: 'bold'}}>Details:</strong> {activity.details.substring(0, 100)}{activity.details.length > 100 ? '...' : ''}
                    </Card.Text>
                  )}
                  <div className="d-flex align-items-center text-gray-400 text-sm">
                    {activity.user && (
                      <span className="me-3">
                        <i className="fas fa-user me-1"></i> {activity.user}
                      </span>
                    )}
                    {activity.featureId && (
                      <span className="me-3 link-info" style={{cursor: 'pointer'}} onClick={() => {
                        setSelectedActivity(activity);
                        setShowFeatureModal(true);
                      }}>
                        <i className="fas fa-code-branch me-1"></i> {activity.featureId}
                      </span>
                    )}
                    {activity.milestoneId && (
                      <span className="me-3">
                        <i className="fas fa-flag me-1"></i> {activity.milestoneId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="d-flex flex-column align-items-end">
                <Badge 
                  bg={getBadgeVariant(activity.type)} 
                  text="white" 
                  className="mb-2"
                >
                  {activity.type.toUpperCase()}
                </Badge>
                <small className="text-gray-400">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </small>
                {activity.status && (
                  <Badge 
                    bg={activity.status === 'success' ? 'success' : 
                        activity.status === 'failed' ? 'danger' : 
                        activity.status === 'in-progress' ? 'warning' : 'info'} 
                    text="white" 
                    className="mt-2"
                  >
                    {activity.status}
                  </Badge>
                )}
              </div>
            </div>
            {activity.details && (
              <div className="mt-3 p-2 bg-gray-800 rounded">
                <pre className="mb-0 text-sm text-gray-300 overflow-auto">{activity.details}</pre>
              </div>
            )}
            
            <div className="mt-3 text-end">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => {
                  setSelectedActivity(activity);
                  setShowDetailsModal(true);
                }}
              >
                View Details
              </Button>
              
              {activity.type === 'test' && (
                <Button 
                  variant="outline-info" 
                  size="sm" 
                  className="ms-2"
                  disabled={runningTest}
                  onClick={() => handleAction(activity, 'Re-run Tests')}
                >
                  {runningTest ? 'Running...' : 'Re-run Tests'}
                </Button>
              )}
              
              {activity.type === 'error' && (
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  className="ms-2"
                  onClick={() => handleAction(activity, 'Restart Service')}
                >
                  Restart Service
                </Button>
              )}
              
              {activity.type === 'deploy' && (
                <Button 
                  variant="outline-warning"
                  size="sm"
                  className="ms-2"
                  disabled={isRollingBack}
                  onClick={() => handleAction(activity, 'Rollback')}
                >
                  {isRollingBack ? 'Rolling Back...' : 'Rollback'}
                </Button>
              )}
              
              {activity.featureId && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="ms-2"
                  onClick={() => {
                    setSelectedActivity(activity);
                    setShowFeatureModal(true);
                  }}
                >
                  View Feature
                </Button>
              )}
              
              {(activity.type === 'test' || activity.type === 'error' || activity.type === 'deploy') && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="ms-2"
                  onClick={() => {
                    setSelectedActivity(activity);
                    setShowLogsModal(true);
                  }}
                >
                  View Logs
                </Button>
              )}
            </div>
            </div>
          </div>
        );
      })}
      
      {/* Render all modals */}
      {renderDetailsModal()}
      {renderLogsModal()}
      {renderFeatureModal()}
      {renderConfirmModal()}
    </>
  );
};

export default ActivityFeed;