import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Row, Col, ListGroup, Badge, Accordion, Spinner, Alert } from 'react-bootstrap';
import { 
  initializeProject, 
  getProjectStructure, 
  listProjects,
  addComponent,
  updateComponent,
  moveComponent,
  subscribeToStructureUpdates
} from '../../services/projectStructureService';

// Component styles
const styles = {
  structureCard: {
    height: 'calc(100vh - 250px)',
    overflowY: 'auto'
  },
  treeContainer: {
    padding: '20px',
    overflowX: 'auto',
    overflowY: 'auto',
    minHeight: '400px',
    border: '1px solid #eee',
    borderRadius: '8px',
    marginTop: '15px'
  },
  nodeContent: {
    display: 'inline-block',
    padding: '10px',
    borderRadius: '8px',
    minWidth: '200px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
    cursor: 'pointer'
  },
  milestone: {
    backgroundColor: '#e3f2fd',
    border: '1px solid #90caf9'
  },
  phase: {
    backgroundColor: '#f3e5f5',
    border: '1px solid #ce93d8'
  },
  module: {
    backgroundColor: '#e8f5e9',
    border: '1px solid #a5d6a7'
  },
  feature: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ffcc80'
  },
  agent: {
    backgroundColor: '#ede7f6',
    border: '1px solid #b39ddb'
  },
  tool: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ffcc80',
    fontSize: '0.85rem'
  },
  guardrail: {
    backgroundColor: '#ffebee',
    border: '1px solid #ef9a9a',
    fontSize: '0.85rem'
  },
  handoff: {
    backgroundColor: '#e0f7fa',
    border: '1px solid #80deea',
    fontSize: '0.85rem'
  },
  statusBadge: {
    marginLeft: '8px'
  },
  detailPanel: {
    position: 'sticky',
    top: '10px'
  },
  agentContent: {
    padding: '10px',
    fontSize: '0.9rem'
  }
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
  return <Badge bg={statusInfo.variant} style={styles.statusBadge}>{statusInfo.text}</Badge>;
};

// Main component
const ProjectStructureBuilder = ({ existingProjectId, onProjectSelected }) => {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [structure, setStructure] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newComponentForm, setNewComponentForm] = useState({
    name: '',
    type: 'milestone',
    description: ''
  });
  const [createProjectForm, setCreateProjectForm] = useState({
    projectName: '',
    description: '',
    templateType: 'standard'
  });
  
  // Load projects on initial mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectList = await listProjects();
        setProjects(projectList);
        
        // If existingProjectId is provided, select it
        if (existingProjectId) {
          const project = projectList.find(p => p.id === existingProjectId);
          if (project) {
            handleProjectSelect(project);
          }
        }
      } catch (err) {
        setError('Failed to load projects: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [existingProjectId]);
  
  // Subscribe to structure updates when a project is selected
  useEffect(() => {
    let unsubscribe = null;
    
    if (selectedProject?.id) {
      unsubscribe = subscribeToStructureUpdates(
        selectedProject.id, 
        (updatedStructure) => setStructure(updatedStructure)
      );
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedProject]);
  
  // Handle project selection
  const handleProjectSelect = async (project) => {
    try {
      setLoading(true);
      setSelectedProject(project);
      
      if (onProjectSelected) {
        onProjectSelected(project.id);
      }
      
      const projectStructure = await getProjectStructure(project.id);
      setStructure(projectStructure);
      setSelectedNode(null);
    } catch (err) {
      setError('Failed to load project structure: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Create new project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const newProject = await initializeProject(createProjectForm);
      
      setProjects([...projects, newProject]);
      setSelectedProject(newProject);
      setStructure(newProject.structure);
      
      if (onProjectSelected) {
        onProjectSelected(newProject.id);
      }
      
      // Reset form
      setCreateProjectForm({
        projectName: '',
        description: '',
        templateType: 'standard'
      });
    } catch (err) {
      setError('Failed to create project: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle node selection
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };
  
  // Add new component
  const handleAddComponent = async (e) => {
    e.preventDefault();
    
    if (!selectedProject?.id) return;
    
    const parentId = selectedNode?.id || null;
    
    try {
      setLoading(true);
      
      const componentData = {
        ...newComponentForm,
        parentId
      };
      
      const updatedStructure = await addComponent(selectedProject.id, componentData);
      setStructure(updatedStructure);
      
      // Reset form
      setNewComponentForm({
        name: '',
        type: selectedNode ? getNextComponentType(selectedNode.type) : 'milestone',
        description: ''
      });
    } catch (err) {
      setError('Failed to add component: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine next component type in hierarchy
  const getNextComponentType = (currentType) => {
    const typeHierarchy = ['milestone', 'phase', 'module', 'feature', 'agent', 'tool'];
    const currentIndex = typeHierarchy.indexOf(currentType);
    
    if (currentIndex === -1 || currentIndex >= typeHierarchy.length - 1) {
      return 'feature'; // Default to feature if type not found or is last in hierarchy
    }
    
    return typeHierarchy[currentIndex + 1];
  };
  
  // Helper to set background color based on component type
  const getNodeStyle = (type) => {
    return styles[type] || styles.feature;
  };
  
  // Render tree nodes recursively
  const renderTreeNodes = useCallback((node) => {
    if (!node) return null;
    
    const nodeStyle = {
      ...styles.nodeContent,
      ...getNodeStyle(node.type)
    };
    
    // For nodes with children
    if (node.children && node.children.length > 0) {
      return (
        <TreeNode 
          key={node.id} 
          label={
            <div 
              style={nodeStyle} 
              onClick={() => handleNodeSelect(node)}
              className={selectedNode?.id === node.id ? 'border-primary' : ''}
            >
              <div className="d-flex justify-content-between align-items-center">
                <strong>{node.name}</strong>
                {node.status && getStatusBadge(node.status)}
              </div>
              {node.description && <div className="text-muted small mt-1">{node.description.substring(0, 60)}...</div>}
            </div>
          }
        >
          {node.children.map(child => renderTreeNodes(child))}
        </TreeNode>
      );
    }
    
    // For leaf nodes
    return (
      <TreeNode 
        key={node.id} 
        label={
          <div 
            style={nodeStyle} 
            onClick={() => handleNodeSelect(node)}
            className={selectedNode?.id === node.id ? 'border-primary' : ''}
          >
            <div className="d-flex justify-content-between align-items-center">
              <strong>{node.name}</strong>
              {node.status && getStatusBadge(node.status)}
            </div>
            {node.description && <div className="text-muted small mt-1">{node.description.substring(0, 60)}...</div>}
          </div>
        }
      />
    );
  }, [selectedNode]);
  
  // Node detail panel
  const renderNodeDetails = () => {
    if (!selectedNode) return null;
    
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">Component Details</h5>
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <h5>{selectedNode.name}</h5>
            <div className="text-muted small">Type: {selectedNode.type}</div>
            {selectedNode.status && (
              <div className="mt-2">
                Status: {getStatusBadge(selectedNode.status)}
              </div>
            )}
          </div>
          
          {selectedNode.description && (
            <div className="mb-3">
              <h6>Description</h6>
              <p>{selectedNode.description}</p>
            </div>
          )}
          
          {selectedNode.type === 'agent' && selectedNode.metadata && (
            <Accordion className="mt-3">
              {selectedNode.metadata.tools && (
                <Accordion.Item eventKey="tools">
                  <Accordion.Header>Tools</Accordion.Header>
                  <Accordion.Body>
                    <ListGroup variant="flush">
                      {selectedNode.metadata.tools.map((tool, idx) => (
                        <ListGroup.Item key={idx}>
                          <div style={{...styles.nodeContent, ...styles.tool}}>
                            <strong>{tool.name}</strong>
                            {tool.description && <div className="small">{tool.description}</div>}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Accordion.Body>
                </Accordion.Item>
              )}
              
              {selectedNode.metadata.guardrails && (
                <Accordion.Item eventKey="guardrails">
                  <Accordion.Header>Guardrails</Accordion.Header>
                  <Accordion.Body>
                    <ListGroup variant="flush">
                      {selectedNode.metadata.guardrails.map((guardrail, idx) => (
                        <ListGroup.Item key={idx}>
                          <div style={{...styles.nodeContent, ...styles.guardrail}}>
                            <div className="small">{guardrail}</div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Accordion.Body>
                </Accordion.Item>
              )}
              
              {selectedNode.metadata.handoffs && (
                <Accordion.Item eventKey="handoffs">
                  <Accordion.Header>Handoffs</Accordion.Header>
                  <Accordion.Body>
                    <ListGroup variant="flush">
                      {selectedNode.metadata.handoffs.map((handoff, idx) => (
                        <ListGroup.Item key={idx}>
                          <div style={{...styles.nodeContent, ...styles.handoff}}>
                            <div className="small">{handoff}</div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Accordion.Body>
                </Accordion.Item>
              )}
            </Accordion>
          )}
          
          <div className="mt-4">
            <Button variant="outline-primary" size="sm" className="me-2">
              Edit Component
            </Button>
            <Button variant="outline-danger" size="sm">
              Delete Component
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  // Render form for adding new component
  const renderAddComponentForm = () => {
    const parentType = selectedNode?.type || null;
    const suggestedType = parentType ? getNextComponentType(parentType) : 'milestone';
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h5 className="mb-0">Add New Component</h5>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleAddComponent}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control 
                type="text" 
                value={newComponentForm.name}
                onChange={(e) => setNewComponentForm({...newComponentForm, name: e.target.value})}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select 
                value={newComponentForm.type}
                onChange={(e) => setNewComponentForm({...newComponentForm, type: e.target.value})}
              >
                <option value="milestone">Milestone</option>
                <option value="phase">Phase</option>
                <option value="module">Module</option>
                <option value="feature">Feature</option>
                <option value="agent">Agent</option>
                <option value="tool">Tool</option>
                <option value="guardrail">Guardrail</option>
                <option value="handoff">Handoff</option>
              </Form.Select>
              <Form.Text className="text-muted">
                {parentType ? `Adding to a ${parentType}. Suggested type: ${suggestedType}` : 'Select component type'}
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                value={newComponentForm.description}
                onChange={(e) => setNewComponentForm({...newComponentForm, description: e.target.value})}
              />
            </Form.Group>
            
            <div className="d-grid">
              <Button type="submit" variant="primary">
                Add Component
              </Button>
            </div>
          </Form>
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
      
      {/* Project selector or creator */}
      {!selectedProject ? (
        <Row>
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Select Existing Project</h5>
              </Card.Header>
              <Card.Body style={styles.structureCard}>
                {loading ? (
                  <div className="text-center p-4">
                    <Spinner animation="border" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center p-4">
                    <p>No projects available. Create a new one!</p>
                  </div>
                ) : (
                  <ListGroup>
                    {projects.map(project => (
                      <ListGroup.Item 
                        key={project.id}
                        action
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{project.name}</strong>
                            {project.description && (
                              <div className="text-muted small">{project.description}</div>
                            )}
                          </div>
                          <Badge bg="info">{project.templateType}</Badge>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Create New Project</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleCreateProject}>
                  <Form.Group className="mb-3">
                    <Form.Label>Project Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={createProjectForm.projectName}
                      onChange={(e) => setCreateProjectForm({...createProjectForm, projectName: e.target.value})}
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3}
                      value={createProjectForm.description}
                      onChange={(e) => setCreateProjectForm({...createProjectForm, description: e.target.value})}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Template Type</Form.Label>
                    <Form.Select 
                      value={createProjectForm.templateType}
                      onChange={(e) => setCreateProjectForm({...createProjectForm, templateType: e.target.value})}
                    >
                      <option value="standard">Standard Project</option>
                      <option value="sdk-first">SDK-First Interactive</option>
                      <option value="agent-ecosystem">Agent Ecosystem</option>
                      <option value="frontend-focused">Frontend Focused</option>
                      <option value="empty">Empty (Build from scratch)</option>
                    </Form.Select>
                  </Form.Group>
                  
                  <div className="d-grid">
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? <Spinner size="sm" animation="border" /> : 'Create Project'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row>
          {/* Project structure visualization */}
          <Col md={8}>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Project Structure: {selectedProject.name}</h5>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      setSelectedProject(null);
                      setStructure(null);
                      setSelectedNode(null);
                    }}
                  >
                    Back to Projects
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center p-4">
                    <Spinner animation="border" />
                  </div>
                ) : !structure ? (
                  <div className="text-center p-4">
                    <p>No structure available. Start adding components!</p>
                  </div>
                ) : (
                  <div style={styles.treeContainer}>
                    <Tree
                      lineWidth="2px"
                      lineColor="#dddddd"
                      lineBorderRadius="10px"
                      label={
                        <div style={{...styles.nodeContent, ...styles.milestone, fontWeight: 'bold'}}>
                          {selectedProject.name}
                        </div>
                      }
                    >
                      {structure.children && structure.children.map(child => 
                        renderTreeNodes(child)
                      )}
                    </Tree>
                  </div>
                )}
              </Card.Body>
            </Card>
            
            {/* If we have a structure, show the add component form */}
            {structure && renderAddComponentForm()}
          </Col>
          
          {/* Right sidebar with details */}
          <Col md={4}>
            <div style={styles.detailPanel}>
              {renderNodeDetails()}
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ProjectStructureBuilder;