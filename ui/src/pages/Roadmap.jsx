import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Card, Row, Col, Badge, Button, ListGroup, ProgressBar } from 'react-bootstrap';
import FeatureDetailsModal from '../components/roadmap/FeatureDetailsModal';
import {
  fetchAllMilestonesWithStructure,
  formatMilestoneForUI,
  updateFeature,
  getFeatureDependenciesFor,
  processMilestoneFeatures
} from '../services/roadmap/RoadmapService';

const Roadmap = () => {
  const [activeTab, setActiveTab] = useState('milestones');
  const [expandedMilestones, setExpandedMilestones] = useState({});
  const [expandedPhases, setExpandedPhases] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Feature details modal state
  const [featureDetailsModal, setFeatureDetailsModal] = useState({
    isOpen: false,
    feature: null
  });
  
  // State to track manually updated feature statuses
  const [updatedFeatures, setUpdatedFeatures] = useState({});

  // State to track milestone task processing
  const [processingMilestones, setProcessingMilestones] = useState({});
  const [processResults, setProcessResults] = useState({});

  // Fetch data from Knowledge Graph on component mount
  useEffect(() => {
    const loadMilestones = async () => {
      try {
        setLoading(true);
        
        // Fetch all milestones with their complete structure
        const milestonesData = await fetchAllMilestonesWithStructure();
        
        // Format the milestones for UI display
        const formattedMilestones = milestonesData.map(milestone => 
          formatMilestoneForUI(milestone)
        );
        
        // Initialize expansion state
        const initialMilestoneExpansion = {};
        formattedMilestones.forEach(milestone => {
          initialMilestoneExpansion[milestone.id] = false;
        });
        setExpandedMilestones({
          ...initialMilestoneExpansion,
          // Expand the first milestone by default if available
          ...(formattedMilestones.length > 0 ? { [formattedMilestones[0].id]: true } : {})
        });
        
        // Initialize phase expansion state
        const initialPhaseExpansion = {};
        formattedMilestones.forEach(milestone => {
          milestone.children.forEach(phase => {
            initialPhaseExpansion[phase.id] = false;
          });
        });
        setExpandedPhases(initialPhaseExpansion);
        
        setMilestones(formattedMilestones);
        setLoading(false);
      } catch (err) {
        console.error('Error loading roadmap data:', err);
        setError('Failed to load roadmap data. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    loadMilestones();
  }, []);
  
  // Handle feature click to show details
  const handleFeatureClick = async (feature) => {
    try {
      // Check if this feature has an updated status
      const updatedFeature = updatedFeatures[feature.id] 
        ? { ...feature, status: updatedFeatures[feature.id] }
        : feature;
      
      // Fetch dependencies for this feature
      const dependencies = await getFeatureDependenciesFor(feature.id);
      
      setFeatureDetailsModal({
        isOpen: true,
        feature: {
          ...updatedFeature,
          description: updatedFeature.description || `Provides ${feature.name} functionality within the ${feature.type} system.`,
          module: feature.id.split('-')[0], // This is just a fallback if module info isn't available
          dependencies: dependencies
        }
      });
    } catch (err) {
      console.error('Error fetching feature details:', err);
      // Still show the modal but without dependencies
      setFeatureDetailsModal({
        isOpen: true,
        feature: {
          ...feature,
          description: feature.description || `Provides ${feature.name} functionality within the ${feature.type} system.`,
          module: feature.id.split('-')[0]
        }
      });
    }
  };
  
  // Handle feature status updates from the modal
  const handleFeatureStatusChange = async (featureId, newStatus) => {
    console.log(`Roadmap - Feature ${featureId} status updated to: ${newStatus}`);
    
    try {
      // Update the status in the Knowledge Graph
      await updateFeature(featureId, { status: newStatus });
      
      // Update the local tracking of feature statuses
      const updatedFeatureMap = {
        ...updatedFeatures,
        [featureId]: newStatus
      };
      
      setUpdatedFeatures(updatedFeatureMap);
      
      // Update the modal's feature if it's still open
      if (featureDetailsModal.isOpen && featureDetailsModal.feature && featureDetailsModal.feature.id === featureId) {
        setFeatureDetailsModal({
          ...featureDetailsModal,
          feature: {
            ...featureDetailsModal.feature,
            status: newStatus
          }
        });
      }
      
      // Force re-render by triggering a state change to update progress calculations
      setTimeout(() => {
        setUpdatedFeatures({...updatedFeatureMap});
      }, 100);
    } catch (err) {
      console.error('Error updating feature status:', err);
      // Still update the UI state even if the API call fails
      // This ensures the UI stays responsive even during API issues
      const updatedFeatureMap = {
        ...updatedFeatures,
        [featureId]: newStatus
      };
      setUpdatedFeatures(updatedFeatureMap);
    }
  };
  
  // Toggle milestone expansion
  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones({
      ...expandedMilestones,
      [milestoneId]: !expandedMilestones[milestoneId]
    });
  };
  
  // Toggle phase expansion
  const togglePhase = (phaseId) => {
    setExpandedPhases({
      ...expandedPhases,
      [phaseId]: !expandedPhases[phaseId]
    });
  };

  // Status badge mapping
  const getStatusBadge = (status) => {
    // Normalize status (convert underscores to dashes for consistent handling)
    const normalizedStatus = status?.replace('_', '-') || 'not-started';
    
    switch(normalizedStatus) {
      case 'completed':
        return <Badge bg="success">Completed</Badge>;
      case 'in-progress':
        return <Badge bg="primary">In Progress</Badge>;
      case 'blocked':
        return <Badge bg="warning">Blocked</Badge>;
      default:
        return <Badge bg="secondary">Not Started</Badge>;
    }
  };

  // Calculate progress percentages
  const calculateProgress = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return { completed: 0, inProgress: 0, notStarted: 100 };
    
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    let total = 0;
    
    // Helper function to recursively count items
    const countStatus = (node) => {
      if (node.type === 'feature' || node.type === 'agent') {
        total++;
        
        // Check if this feature has an updated status
        const effectiveStatus = updatedFeatures[node.id] || node.status;
        const normalizedStatus = effectiveStatus?.replace('_', '-') || 'not-started';
        
        if (normalizedStatus === 'completed') {
          completed++;
        } else if (normalizedStatus === 'in-progress' || normalizedStatus === 'in_progress') {
          inProgress++;
        } else {
          notStarted++;
        }
      }
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => countStatus(child));
      }
    };
    
    nodes.forEach(node => countStatus(node));
    
    // If no features found
    if (total === 0) return { completed: 0, inProgress: 0, notStarted: 100 };
    
    // Calculate percentages - ensure they add up to 100%
    const completedPct = Math.round((completed / total) * 100);
    const inProgressPct = Math.round((inProgress / total) * 100);
    // Calculate notStarted as remainder to ensure sum is 100
    const notStartedPct = 100 - completedPct - inProgressPct;
    
    return {
      completed: completedPct,
      inProgress: inProgressPct,
      notStarted: notStartedPct,
      // For more detailed info
      raw: {
        completed,
        inProgress, 
        notStarted,
        total
      }
    };
  };
  
  // Calculate progress for a phase
  const calculatePhaseProgress = (milestone, phaseId) => {
    if (!milestone || !milestone.children) return 0;
    
    // Find the phase
    const phase = milestone.children.find(p => p.id === phaseId);
    if (!phase || !phase.children) return 0;
    
    let features = [];
    
    // Collect all features in this phase's modules
    phase.children.forEach(module => {
      if (module.children) {
        features = features.concat(module.children.filter(f => f.type === 'feature' || f.type === 'agent'));
      }
    });
    
    if (features.length === 0) return 0;
    
    // Count completed and in-progress features with weights, checking for updated statuses
    const completed = features.filter(f => {
      const effectiveStatus = updatedFeatures[f.id] || f.status;
      return effectiveStatus === 'completed';
    }).length;
    
    const inProgress = features.filter(f => {
      const effectiveStatus = updatedFeatures[f.id] || f.status;
      return effectiveStatus === 'in_progress' || effectiveStatus === 'in-progress';
    }).length;
    
    // Give full credit for completed and half credit for in-progress
    const progressScore = completed + (inProgress * 0.5);
    
    return Math.round((progressScore / features.length) * 100);
  };
  
  // Calculate progress for a module
  const calculateModuleProgress = (module) => {
    if (!module || !module.children) return 0;
    
    const features = module.children.filter(f => f.type === 'feature' || f.type === 'agent');
    
    if (features.length === 0) return 0;
    
    // Count completed and in-progress features with weights, checking for updated statuses
    const completed = features.filter(f => {
      const effectiveStatus = updatedFeatures[f.id] || f.status;
      return effectiveStatus === 'completed';
    }).length;
    
    const inProgress = features.filter(f => {
      const effectiveStatus = updatedFeatures[f.id] || f.status;
      return effectiveStatus === 'in_progress' || effectiveStatus === 'in-progress';
    }).length;
    
    // Give full credit for completed and half credit for in-progress
    const progressScore = completed + (inProgress * 0.5);
    
    return Math.round((progressScore / features.length) * 100);
  };

  // Handle task generation for a milestone
  const handleGenerateTasks = async (milestoneId) => {
    if (processingMilestones[milestoneId]) return; // Prevent duplicate processing

    try {
      // Mark this milestone as processing
      setProcessingMilestones(prev => ({
        ...prev,
        [milestoneId]: true
      }));

      // Process the milestone features
      const result = await processMilestoneFeatures(milestoneId);

      // Store the result
      setProcessResults(prev => ({
        ...prev,
        [milestoneId]: result
      }));

      // Show success/failure message based on result
      if (result.success) {
        // Success notification could be added here
        console.log(`Successfully processed ${result.features_processed} features in milestone ${milestoneId}`);
      } else {
        // Error notification could be added here
        console.error(`Error processing features in milestone ${milestoneId}: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error generating tasks for milestone ${milestoneId}:`, error);
      setProcessResults(prev => ({
        ...prev,
        [milestoneId]: {
          success: false,
          message: error.message,
          milestone_id: milestoneId,
          features_processed: 0
        }
      }));
    } finally {
      // Mark this milestone as no longer processing
      setProcessingMilestones(prev => ({
        ...prev,
        [milestoneId]: false
      }));
    }
  };

  // Milestones Tab
  const renderMilestonesTab = () => {
    if (loading) {
      return (
        <div className="text-center p-5 text-white">
          <p>Loading roadmap data from Knowledge Graph...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center p-5 text-white">
          <p className="text-danger">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col">
        {milestones.map(milestone => (
          <Card className="mb-4 border-0" key={milestone.id}>
            <Card.Header 
              className="bg-gray-900 text-white d-flex justify-content-between align-items-center"
              onClick={() => toggleMilestone(milestone.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center">
                <span className="me-2 text-primary">⬧</span>
                <h2 className="h5 mb-0">Milestone: {milestone.name}</h2>
              </div>
              <div className="d-flex align-items-center">
                {getStatusBadge(milestone.status)}

                {/* AI Task Generation Button */}
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="ms-3"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent milestone expansion
                    handleGenerateTasks(milestone.id);
                  }}
                  disabled={processingMilestones[milestone.id]}
                >
                  {processingMilestones[milestone.id] ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Generating...
                    </>
                  ) : (
                    'Auto-Generate Tasks'
                  )}
                </Button>

                <Button variant="dark" size="sm" className="px-2 py-0 ms-3">
                  {expandedMilestones[milestone.id] ? '▼' : '►'}
                </Button>
              </div>
            </Card.Header>
            
            {expandedMilestones[milestone.id] && (
              <Card.Body className="bg-gray-800 text-white p-0">
                <div className="p-3">
                  {/* Task Generation Results */}
                  {processResults[milestone.id] && (
                    <Row className="mb-3">
                      <Col>
                        <Card className={`border-0 ${processResults[milestone.id].success ? 'bg-success bg-opacity-25' : 'bg-danger bg-opacity-25'} mb-3`}>
                          <Card.Body className="py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className={processResults[milestone.id].success ? 'text-success' : 'text-danger'}>
                                  {processResults[milestone.id].success ? 'Tasks Generated Successfully' : 'Task Generation Failed'}
                                </h6>
                                <p className="small mb-0">
                                  {processResults[milestone.id].success
                                    ? `Generated tasks for ${processResults[milestone.id].features_processed} features (${processResults[milestone.id].total_tasks} tasks total)`
                                    : processResults[milestone.id].message
                                  }
                                </p>
                              </div>
                              <Button
                                variant="link"
                                className="text-muted p-0"
                                onClick={() => {
                                  // Clear the results for this milestone
                                  setProcessResults(prev => {
                                    const newResults = {...prev};
                                    delete newResults[milestone.id];
                                    return newResults;
                                  });
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  )}

                  <Row className="mb-3">
                    <Col>
                      <h6 className="text-gray-400 mb-1">Overall Progress</h6>
                      {(() => {
                        const progress = calculateProgress(milestone.children);
                        return (
                          <>
                            <ProgressBar className="mb-2" style={{ height: '8px' }}>
                              <ProgressBar variant="success" now={progress.completed} key={1} />
                              <ProgressBar variant="primary" now={progress.inProgress} key={2} />
                              <ProgressBar variant="secondary" now={progress.notStarted} key={3} />
                            </ProgressBar>
                            <div className="d-flex justify-content-between small text-gray-400">
                              <span>Completed: {progress.completed}%</span>
                              <span>In Progress: {progress.inProgress}%</span>
                              <span>Not Started: {progress.notStarted}%</span>
                            </div>
                          </>
                        );
                      })()}
                    </Col>
                  </Row>
                  
                  <Row className="mb-4 mt-4">
                    {milestone.children.map((phase, index) => {
                      const phaseProgress = calculatePhaseProgress(milestone, phase.id);
                      const textColorClass = 
                        phaseProgress > 70 ? 'text-success' :
                        phaseProgress > 30 ? 'text-primary' :
                        phaseProgress > 0 ? 'text-warning' : 'text-gray-500';
                      
                      return (
                        <Col md={3} className="mb-3" key={phase.id}>
                          <Card className="text-center h-100 bg-gray-700 border-0">
                            <Card.Body>
                              <h3 className={`${textColorClass} h2 mb-1`}>{phaseProgress}%</h3>
                              <p className="text-gray-400 small">Phase {index + 1}: {phase.name}</p>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                    
                    {/* Add placeholder cards if less than 4 phases */}
                    {Array.from({ length: Math.max(0, 4 - milestone.children.length) }).map((_, i) => (
                      <Col md={3} className="mb-3" key={`placeholder-${i}`}>
                        <Card className="text-center h-100 bg-gray-700 border-0">
                          <Card.Body>
                            <h3 className="text-gray-500 h2 mb-1">0%</h3>
                            <p className="text-gray-400 small">Phase {milestone.children.length + i + 1}</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  
                  {/* Phases (dynamically generated) */}
                  {milestone.children.map((phase, index) => {
                    const phaseProgress = calculatePhaseProgress(milestone, phase.id);
                    const badgeVariant = 
                      phaseProgress > 70 ? 'success' :
                      phaseProgress > 30 ? 'primary' :
                      phaseProgress > 0 ? 'warning' : 'secondary';
                    
                    return (
                      <Card className="mb-4 bg-gray-700 border-0" key={phase.id}>
                        <Card.Header 
                          className="bg-gray-700 d-flex justify-content-between align-items-center"
                          onClick={() => togglePhase(phase.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex align-items-center">
                            <span className="me-2 text-primary">◆</span>
                            <h3 className="h6 mb-0">Phase {index + 1}: {phase.name}</h3>
                          </div>
                          <div className="d-flex align-items-center">
                            <Badge bg={badgeVariant} className="me-3">{phaseProgress}%</Badge>
                            <Button variant="dark" size="sm" className="px-2 py-0">
                              {expandedPhases[phase.id] ? '▼' : '►'}
                            </Button>
                          </div>
                        </Card.Header>
                    
                    {expandedPhases[phase.id] && (
                      <Card.Body className="pt-0 bg-gray-700">
                        <Row className="mt-3">
                          {phase.children && phase.children.map((module) => {
                            const moduleProgress = calculateModuleProgress(module);
                            const badgeVariant = 
                              moduleProgress > 70 ? 'success' :
                              moduleProgress > 30 ? 'primary' :
                              moduleProgress > 0 ? 'warning' : 'secondary';
                            
                            return (
                              <Col md={6} className="mb-3" key={module.id}>
                                <Card className="h-100 bg-gray-800 border-0">
                                  <Card.Header className="bg-gray-800 py-2 border-bottom border-gray-700">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <h4 className="text-primary h6 mb-0">Module: {module.name}</h4>
                                      <Badge bg={badgeVariant}>{moduleProgress}%</Badge>
                                    </div>
                                  </Card.Header>
                                  <ListGroup variant="flush" className="bg-gray-800">
                                    {module.children && module.children.map((feature) => (
                                      <ListGroup.Item 
                                        key={feature.id} 
                                        className="d-flex justify-content-between align-items-center bg-gray-800 text-white border-gray-700 cursor-pointer hover:bg-gray-700"
                                        onClick={() => handleFeatureClick(feature)}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div>
                                          <strong>{feature.type === 'agent' ? 'Agent' : 'Feature'} {feature.id.slice(-4)}:</strong> {feature.name}
                                        </div>
                                        {getStatusBadge(updatedFeatures[feature.id] || feature.status)}
                                      </ListGroup.Item>
                                    ))}
                                  </ListGroup>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </Card.Body>
                    )}
                  </Card>
                  );
                })}
                </div>
              </Card.Body>
            )}
          </Card>
        ))}

        {milestones.length === 0 && (
          <Card className="bg-gray-800 text-white border-0">
            <Card.Body className="text-center p-5">
              <p>No milestones found in the Knowledge Graph.</p>
              <Button variant="primary" disabled>Create Milestone</Button>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  };
  
  // Structure Tab
  const renderStructureTab = () => (
    <Card className="bg-gray-800 text-white border-0">
      <Card.Header className="bg-gray-900">
        <h3 className="h5 mb-0">Project Structure Visualization</h3>
      </Card.Header>
      <Card.Body>
        <div className="text-center p-5">
          <p className="text-gray-400">Interactive structure visualization coming soon</p>
          <div className="mt-3">
            <Button variant="primary" disabled>Launch Structure Builder</Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
  
  // Timeline Tab
  const renderTimelineTab = () => (
    <Card className="bg-gray-800 text-white border-0">
      <Card.Header className="bg-gray-900">
        <h3 className="h5 mb-0">Development Timeline</h3>
      </Card.Header>
      <Card.Body>
        <div className="text-center p-5">
          <p className="text-gray-400">Interactive timeline visualization coming soon</p>
          <div className="mt-3">
            <Button variant="primary" disabled>View Timeline</Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
  
  // Main component
  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-800 p-4 pb-16">
      <h1 className="text-2xl font-bold mb-4 text-white">Project Roadmap</h1>
      
      <Tabs
        activeKey={activeTab}
        onSelect={setActiveTab}
        className="mb-4 roadmap-tabs"
      >
        <Tab eventKey="milestones" title="Milestones">
          {renderMilestonesTab()}
        </Tab>
        <Tab eventKey="structure" title="Structure">
          {renderStructureTab()}
        </Tab>
        <Tab eventKey="timeline" title="Timeline">
          {renderTimelineTab()}
        </Tab>
      </Tabs>
      
      {/* Feature Details Modal Component */}
      <FeatureDetailsModal 
        isOpen={featureDetailsModal.isOpen}
        onClose={() => setFeatureDetailsModal({ ...featureDetailsModal, isOpen: false })}
        feature={featureDetailsModal.feature}
        onStatusChange={(featureId, newStatus) => handleFeatureStatusChange(featureId, newStatus)}
      />
    </div>
  );
};

export default Roadmap;