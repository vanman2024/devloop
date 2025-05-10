import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Alert, Spinner, ProgressBar, ListGroup, Badge, Tabs, Tab } from 'react-bootstrap';
import { 
  getProjectStructure, 
  getStructureRecommendations, 
  rebalanceStructure,
  subscribeToStructureUpdates
} from '../../services/projectStructureService';

// Health metrics visualization component
const HealthMetric = ({ title, value, max = 100, variant = 'info', description }) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  
  return (
    <Card className="mb-3">
      <Card.Body>
        <h6>{title}</h6>
        <ProgressBar 
          now={percentage} 
          variant={variant} 
          label={`${percentage}%`} 
          className="mb-2" 
        />
        <small className="text-muted">{description}</small>
      </Card.Body>
    </Card>
  );
};

// Status badge mapping
const getStatusBadge = (status) => {
  const statusMap = {
    'not_started': { variant: 'secondary', text: 'Not Started' },
    'in_progress': { variant: 'primary', text: 'In Progress' },
    'completed': { variant: 'success', text: 'Completed' },
    'blocked': { variant: 'danger', text: 'Blocked' },
    'deferred': { variant: 'warning', text: 'Deferred' }
  };
  
  const statusInfo = statusMap[status] || { variant: 'light', text: status };
  return <Badge bg={statusInfo.variant}>{statusInfo.text}</Badge>;
};

// Main component
const ProjectStructureHealth = ({ projectId }) => {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [structure, setStructure] = useState(null);
  const [healthMetrics, setHealthMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [rebalancing, setRebalancing] = useState(false);
  
  // Load project structure and health metrics
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        
        // Get project structure
        const projectStructure = await getProjectStructure(projectId);
        setStructure(projectStructure);
        
        // Get health recommendations
        const healthRecommendations = await getStructureRecommendations(projectId);
        setRecommendations(healthRecommendations);
        
        // Calculate health metrics
        calculateHealthMetrics(projectStructure);
      } catch (err) {
        setError('Failed to load project health data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectData();
    
    // Subscribe to structure updates
    const unsubscribe = subscribeToStructureUpdates(
      projectId, 
      (updatedStructure) => {
        setStructure(updatedStructure);
        calculateHealthMetrics(updatedStructure);
      }
    );
    
    return () => unsubscribe();
  }, [projectId]);
  
  // Calculate health metrics from structure
  const calculateHealthMetrics = (structureData) => {
    if (!structureData) return;
    
    // Count components by type and status
    const counts = {
      total: 0,
      byType: {},
      byStatus: {},
      completed: 0,
      blocked: 0
    };
    
    // Dependencies metrics
    const dependencies = {
      total: 0,
      satisfied: 0,
      circular: 0
    };
    
    // Analyze structure recursively
    const analyzeNode = (node) => {
      if (!node) return;
      
      // Count by type
      counts.total++;
      counts.byType[node.type] = (counts.byType[node.type] || 0) + 1;
      
      // Count by status
      if (node.status) {
        counts.byStatus[node.status] = (counts.byStatus[node.status] || 0) + 1;
        
        if (node.status === 'completed') {
          counts.completed++;
        } else if (node.status === 'blocked') {
          counts.blocked++;
        }
      }
      
      // Check dependencies
      if (node.dependencies) {
        dependencies.total += node.dependencies.length;
        
        node.dependencies.forEach(dep => {
          if (dep.satisfied) {
            dependencies.satisfied++;
          }
          if (dep.circular) {
            dependencies.circular++;
          }
        });
      }
      
      // Process children recursively
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => analyzeNode(child));
      }
    };
    
    // Start analysis from root
    analyzeNode(structureData);
    
    // Calculate derived metrics
    const metrics = {
      // Completion
      completionRate: counts.total > 0 ? (counts.completed / counts.total) * 100 : 0,
      
      // Balance metrics
      typeDistribution: Object.values(counts.byType).reduce((prev, curr) => {
        return {
          min: Math.min(prev.min, curr),
          max: Math.max(prev.max, curr)
        };
      }, { min: Infinity, max: 0 }),
      
      // Dependency health
      dependencyHealth: dependencies.total > 0 
        ? (dependencies.satisfied / dependencies.total) * 100 
        : 100,
      
      // Circular dependency rate
      circularDependencyRate: dependencies.total > 0 
        ? (dependencies.circular / dependencies.total) * 100 
        : 0,
      
      // Blocked components
      blockedRate: counts.total > 0 ? (counts.blocked / counts.total) * 100 : 0,
      
      // Raw counts
      counts,
      dependencies
    };
    
    // Calculate balance score (higher is better)
    if (metrics.typeDistribution.max > 0 && metrics.typeDistribution.min < Infinity) {
      const balanceRatio = metrics.typeDistribution.min / metrics.typeDistribution.max;
      metrics.balanceScore = balanceRatio * 100;
    } else {
      metrics.balanceScore = 100; // Perfect balance if no components or all types have same count
    }
    
    setHealthMetrics(metrics);
  };
  
  // Handle rebalance request
  const handleRebalance = async () => {
    if (!projectId) return;
    
    try {
      setRebalancing(true);
      
      // Request rebalancing
      const rebalanced = await rebalanceStructure(projectId);
      
      // Update local state
      setStructure(rebalanced);
      calculateHealthMetrics(rebalanced);
      
      // Get updated recommendations
      const updatedRecommendations = await getStructureRecommendations(projectId);
      setRecommendations(updatedRecommendations);
    } catch (err) {
      setError('Failed to rebalance project: ' + err.message);
    } finally {
      setRebalancing(false);
    }
  };
  
  // Render overview tab
  const renderOverview = () => {
    if (!healthMetrics) return null;
    
    return (
      <div>
        <Row>
          <Col md={6}>
            <HealthMetric 
              title="Completion Rate" 
              value={healthMetrics.completionRate}
              variant={healthMetrics.completionRate > 75 ? 'success' : 'primary'}
              description={`${healthMetrics.counts.completed} of ${healthMetrics.counts.total} components completed`}
            />
          </Col>
          
          <Col md={6}>
            <HealthMetric 
              title="Structure Balance" 
              value={healthMetrics.balanceScore}
              variant={healthMetrics.balanceScore > 70 ? 'success' : 'warning'}
              description="Balance between different component types"
            />
          </Col>
        </Row>
        
        <Row>
          <Col md={6}>
            <HealthMetric 
              title="Dependency Health" 
              value={healthMetrics.dependencyHealth}
              variant={healthMetrics.dependencyHealth > 80 ? 'success' : 'warning'}
              description={`${healthMetrics.dependencies.satisfied} of ${healthMetrics.dependencies.total} dependencies satisfied`}
            />
          </Col>
          
          <Col md={6}>
            <HealthMetric 
              title="Blocked Components" 
              value={100 - healthMetrics.blockedRate}
              variant={healthMetrics.blockedRate < 10 ? 'success' : 'danger'}
              description={`${healthMetrics.counts.blocked || 0} components currently blocked`}
            />
          </Col>
        </Row>
        
        <div className="d-grid gap-2 mt-4">
          <Button 
            variant="primary" 
            onClick={handleRebalance}
            disabled={rebalancing}
          >
            {rebalancing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Rebalancing...
              </>
            ) : (
              'Request AI Rebalancing'
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  // Render recommendations tab
  const renderRecommendations = () => {
    if (!recommendations || recommendations.length === 0) {
      return (
        <Alert variant="info">
          No recommendations available at this time. The structure appears to be well-balanced.
        </Alert>
      );
    }
    
    return (
      <ListGroup>
        {recommendations.map((rec, index) => (
          <ListGroup.Item key={index}>
            <div className="d-flex align-items-start">
              <div className="me-3">
                <Badge 
                  bg={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'}
                >
                  {rec.priority}
                </Badge>
              </div>
              <div>
                <div className="fw-bold">{rec.title}</div>
                <p>{rec.description}</p>
                {rec.affectedComponents && (
                  <div className="small text-muted">
                    Affects: {rec.affectedComponents.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 text-end">
              <Button variant="outline-primary" size="sm">Apply</Button>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    );
  };
  
  // Render dependency analysis tab
  const renderDependencyAnalysis = () => {
    if (!structure) return null;
    
    // Helper to extract dependency information
    const extractDependencies = (node, dependencies = []) => {
      if (!node) return dependencies;
      
      // Add node dependencies
      if (node.dependencies && node.dependencies.length > 0) {
        node.dependencies.forEach(dep => {
          dependencies.push({
            from: node.name,
            to: dep.target,
            satisfied: dep.satisfied,
            circular: dep.circular
          });
        });
      }
      
      // Process children recursively
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => extractDependencies(child, dependencies));
      }
      
      return dependencies;
    };
    
    const dependencies = extractDependencies(structure);
    
    if (dependencies.length === 0) {
      return (
        <Alert variant="info">
          No dependencies defined in this project structure.
        </Alert>
      );
    }
    
    return (
      <Card>
        <Card.Header>Dependency Map</Card.Header>
        <Card.Body>
          <ListGroup>
            {dependencies.map((dep, index) => (
              <ListGroup.Item 
                key={index}
                variant={dep.circular ? 'danger' : dep.satisfied ? 'success' : 'warning'}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{dep.from}</strong> depends on <strong>{dep.to}</strong>
                  </div>
                  <div>
                    {dep.circular && <Badge bg="danger">Circular</Badge>}
                    {!dep.circular && (
                      dep.satisfied ? <Badge bg="success">Satisfied</Badge> : <Badge bg="warning">Unsatisfied</Badge>
                    )}
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card.Body>
      </Card>
    );
  };
  
  // Main content
  return (
    <div>
      {/* Error alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <Card>
        <Card.Header>
          <h5 className="mb-0">Project Structure Health</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" />
              <div className="mt-2">Loading health data...</div>
            </div>
          ) : !structure ? (
            <Alert variant="warning">
              No project structure data available.
            </Alert>
          ) : (
            <Tabs
              activeKey={selectedTab}
              onSelect={(k) => setSelectedTab(k)}
              className="mb-3"
            >
              <Tab eventKey="overview" title="Overview">
                {renderOverview()}
              </Tab>
              <Tab eventKey="recommendations" title="Recommendations">
                {renderRecommendations()}
              </Tab>
              <Tab eventKey="dependencies" title="Dependency Analysis">
                {renderDependencyAnalysis()}
              </Tab>
              <Tab eventKey="status" title="Status Breakdown">
                <Card>
                  <Card.Header>Component Status</Card.Header>
                  <Card.Body>
                    <Row>
                      {healthMetrics && Object.entries(healthMetrics.counts.byStatus || {}).map(([status, count]) => (
                        <Col md={4} key={status}>
                          <Card className="mb-3">
                            <Card.Body className="text-center">
                              <h1>{count}</h1>
                              <div>{getStatusBadge(status)}</div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Tab>
            </Tabs>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ProjectStructureHealth;