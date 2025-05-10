import React, { useState, useEffect } from 'react';
import { 
  Card, Container, Row, Col, Badge, Table, Alert, Button, 
  Spinner, Tabs, Tab, ProgressBar, Accordion
} from 'react-bootstrap';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FaCheck, FaExclamationTriangle, FaTimesCircle, FaCog, FaSync } from 'react-icons/fa';

const COLORS = ['#28a745', '#ffc107', '#dc3545', '#17a2b8'];

const MemoryValidationMonitor = ({ refreshInterval = 30000 }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedFile, setSelectedFile] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fixInProgress, setFixInProgress] = useState(false);

  // Fetch validation report data
  const fetchReport = async () => {
    try {
      setLoading(true);
      
      // In production, this would be an API call
      // For now, we're simulating the data
      const response = await fetch('/api/memory-validation/latest');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setReport(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching memory validation report:', error);
      // Fallback to simulated data for development
      setReport(getSimulatedReport());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-fix for a specific file
  const handleFixFile = async (filePath) => {
    setFixInProgress(true);
    try {
      // In production, this would call an API
      console.log(`Fixing file: ${filePath}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update the report to reflect the fix
      setReport(prev => {
        const updated = {...prev};
        if (updated.issues_by_file && updated.issues_by_file[filePath]) {
          updated.issues_by_file[filePath].fixed = true;
          updated.issues_by_file[filePath].critical_issues = 0;
          updated.issues_by_file[filePath].warning_issues = 0;
          updated.critical_issues -= updated.issues_by_file[filePath].critical_issues;
          updated.warning_issues -= updated.issues_by_file[filePath].warning_issues;
          updated.files_fixed += 1;
        }
        return updated;
      });
      
      // Show file details after fixing
      setSelectedFile(filePath);
    } catch (error) {
      console.error('Error fixing file:', error);
    } finally {
      setFixInProgress(false);
    }
  };

  // Simulate a report for development
  const getSimulatedReport = () => {
    return {
      timestamp: new Date().toISOString(),
      directory: "/mnt/c/Users/angel/Devloop",
      files_scanned: 35,
      files_with_issues: 7,
      critical_issues: 3,
      warning_issues: 12,
      files_fixed: 2,
      health_status: "warning",
      issues_by_file: {
        "/mnt/c/Users/angel/Devloop/features/feature-123/memory.json": {
          is_valid: false,
          critical_issues: 1,
          warning_issues: 3,
          fixed: false,
          issues: [
            {
              severity: "critical",
              message: "Missing required field: type",
              fix: "Add the type field to the memory file"
            },
            {
              severity: "warning",
              message: "Field status has invalid value: pending",
              fix: "Change status to one of the allowed values: not-started, in-progress, blocked, completed, failed"
            }
          ]
        },
        "/mnt/c/Users/angel/Devloop/features/feature-456/memory.json": {
          is_valid: false,
          critical_issues: 0,
          warning_issues: 2,
          fixed: false,
          issues: [
            {
              severity: "warning",
              message: "Field created_at is not a valid ISO datetime string",
              fix: "Format created_at as ISO datetime string (YYYY-MM-DDTHH:MM:SS.sssZ)"
            }
          ]
        }
      }
    };
  };

  // Run initial fetch and set up auto-refresh
  useEffect(() => {
    fetchReport();
    
    // Set up auto-refresh interval
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchReport();
      }, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Calculate summary pie chart data
  const getPieChartData = () => {
    if (!report) return [];
    
    return [
      { name: 'Healthy', value: report.files_scanned - report.files_with_issues },
      { name: 'Warning', value: report.files_with_issues - report.files_fixed - (report.critical_issues > 0 ? 1 : 0) },
      { name: 'Critical', value: report.critical_issues > 0 ? 1 : 0 },
      { name: 'Fixed', value: report.files_fixed }
    ];
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchReport();
  };

  // Handle file selection for viewing details
  const handleSelectFile = (filePath) => {
    setSelectedFile(filePath);
    setActiveTab('details');
  };

  // Get status badge variant based on health status
  const getBadgeVariant = (status) => {
    switch (status) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'healthy':
        return 'success';
      default:
        return 'info';
    }
  };

  // Get icon based on health status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical':
        return <FaTimesCircle size={24} />;
      case 'warning':
        return <FaExclamationTriangle size={24} />;
      case 'healthy':
        return <FaCheck size={24} />;
      default:
        return <FaCog size={24} />;
    }
  };

  // Display loading spinner while fetching data
  if (loading && !report) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading memory validation data...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Card className="shadow-sm mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 me-3">Memory Validation Monitor</h5>
            <Badge bg={getBadgeVariant(report?.health_status || 'info')} className="fs-6">
              {getStatusIcon(report?.health_status || 'info')}
              <span className="ms-2">{report?.health_status?.toUpperCase() || 'UNKNOWN'}</span>
            </Badge>
          </div>
          <div>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleRefresh} 
              className="me-2"
              disabled={loading}
            >
              <FaSync className={loading ? 'spin' : ''} /> Refresh
            </Button>
            <Button
              variant={autoRefresh ? "success" : "outline-secondary"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </Button>
          </div>
        </Card.Header>
        
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="dashboard" title="Dashboard">
              {/* Summary Stats */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card bg="primary" text="white" className="mb-2">
                    <Card.Body className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <Card.Title>Files Scanned</Card.Title>
                        <h3 className="mb-0">{report?.files_scanned || 0}</h3>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card bg="danger" text="white" className="mb-2">
                    <Card.Body className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <Card.Title>Critical Issues</Card.Title>
                        <h3 className="mb-0">{report?.critical_issues || 0}</h3>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card bg="warning" text="dark" className="mb-2">
                    <Card.Body className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <Card.Title>Warning Issues</Card.Title>
                        <h3 className="mb-0">{report?.warning_issues || 0}</h3>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card bg="success" text="white" className="mb-2">
                    <Card.Body className="py-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <Card.Title>Files Fixed</Card.Title>
                        <h3 className="mb-0">{report?.files_fixed || 0}</h3>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Visualization */}
              <Row className="mb-4">
                <Col md={8}>
                  <Card className="h-100">
                    <Card.Header>Issues Summary</Card.Header>
                    <Card.Body>
                      {report ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={[
                              {
                                name: 'Issues',
                                Critical: report.critical_issues,
                                Warning: report.warning_issues,
                                'Files with Issues': report.files_with_issues,
                                'Files Fixed': report.files_fixed
                              }
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Critical" stackId="a" fill="#dc3545" />
                            <Bar dataKey="Warning" stackId="a" fill="#ffc107" />
                            <Bar dataKey="Files with Issues" fill="#17a2b8" />
                            <Bar dataKey="Files Fixed" fill="#28a745" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-5">
                          <Spinner animation="border" />
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="h-100">
                    <Card.Header>File Health Distribution</Card.Header>
                    <Card.Body>
                      {report ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={getPieChartData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {getPieChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-5">
                          <Spinner animation="border" />
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Files with Issues Table */}
              <Card>
                <Card.Header>Files with Issues</Card.Header>
                <Card.Body>
                  {report && report.issues_by_file && Object.keys(report.issues_by_file).length > 0 ? (
                    <Table hover responsive className="mb-0">
                      <thead>
                        <tr>
                          <th>File Path</th>
                          <th>Status</th>
                          <th>Critical</th>
                          <th>Warning</th>
                          <th>Fixed</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(report.issues_by_file).map(([filePath, fileInfo]) => (
                          <tr key={filePath}>
                            <td>
                              <span 
                                className="text-primary" 
                                style={{cursor: 'pointer'}}
                                onClick={() => handleSelectFile(filePath)}
                              >
                                {filePath.split('/').slice(-2).join('/')}
                              </span>
                            </td>
                            <td>
                              <Badge bg={fileInfo.is_valid ? 'success' : fileInfo.critical_issues > 0 ? 'danger' : 'warning'}>
                                {fileInfo.is_valid ? 'Valid' : fileInfo.critical_issues > 0 ? 'Critical' : 'Warning'}
                              </Badge>
                            </td>
                            <td>{fileInfo.critical_issues}</td>
                            <td>{fileInfo.warning_issues}</td>
                            <td>{fileInfo.fixed ? 'Yes' : 'No'}</td>
                            <td>
                              <Button
                                variant="primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleSelectFile(filePath)}
                              >
                                Details
                              </Button>
                              {!fileInfo.fixed && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleFixFile(filePath)}
                                  disabled={fixInProgress}
                                >
                                  {fixInProgress ? (
                                    <>
                                      <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                      />
                                      <span className="visually-hidden">Fixing...</span>
                                    </>
                                  ) : (
                                    'Fix Issues'
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert variant="success">No issues found. All memory files are valid!</Alert>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            
            <Tab eventKey="details" title="File Details">
              {selectedFile && report?.issues_by_file?.[selectedFile] ? (
                <>
                  <Alert variant={report.issues_by_file[selectedFile].fixed ? 'success' : 'info'}>
                    {report.issues_by_file[selectedFile].fixed ? (
                      <><FaCheck className="me-2" /> This file has been fixed.</>
                    ) : (
                      <>Viewing details for file: <strong>{selectedFile}</strong></>
                    )}
                  </Alert>
                  
                  <Card className="mb-4">
                    <Card.Header>Issue Summary</Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <dl className="row mb-0">
                            <dt className="col-sm-4">Status</dt>
                            <dd className="col-sm-8">
                              <Badge bg={report.issues_by_file[selectedFile].is_valid ? 'success' : 'danger'}>
                                {report.issues_by_file[selectedFile].is_valid ? 'Valid' : 'Invalid'}
                              </Badge>
                            </dd>
                            
                            <dt className="col-sm-4">Critical Issues</dt>
                            <dd className="col-sm-8">{report.issues_by_file[selectedFile].critical_issues}</dd>
                            
                            <dt className="col-sm-4">Warning Issues</dt>
                            <dd className="col-sm-8">{report.issues_by_file[selectedFile].warning_issues}</dd>
                          </dl>
                        </Col>
                        <Col md={6}>
                          <dl className="row mb-0">
                            <dt className="col-sm-4">Fixed</dt>
                            <dd className="col-sm-8">{report.issues_by_file[selectedFile].fixed ? 'Yes' : 'No'}</dd>
                            
                            <dt className="col-sm-4">Path</dt>
                            <dd className="col-sm-8">{selectedFile}</dd>
                          </dl>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                  
                  <Card>
                    <Card.Header>Issues</Card.Header>
                    <Card.Body>
                      {report.issues_by_file[selectedFile].issues && 
                       report.issues_by_file[selectedFile].issues.length > 0 ? (
                        <Accordion defaultActiveKey="0">
                          {report.issues_by_file[selectedFile].issues.map((issue, idx) => (
                            <Accordion.Item key={idx} eventKey={idx.toString()}>
                              <Accordion.Header>
                                <Badge 
                                  bg={issue.severity === 'critical' ? 'danger' : 'warning'} 
                                  className="me-2"
                                >
                                  {issue.severity.toUpperCase()}
                                </Badge>
                                {issue.message}
                              </Accordion.Header>
                              <Accordion.Body>
                                <dl className="row mb-0">
                                  <dt className="col-sm-3">Issue</dt>
                                  <dd className="col-sm-9">{issue.message}</dd>
                                  
                                  <dt className="col-sm-3">Severity</dt>
                                  <dd className="col-sm-9">
                                    <Badge bg={issue.severity === 'critical' ? 'danger' : 'warning'}>
                                      {issue.severity.toUpperCase()}
                                    </Badge>
                                  </dd>
                                  
                                  <dt className="col-sm-3">Fix</dt>
                                  <dd className="col-sm-9">{issue.fix}</dd>
                                  
                                  {issue.allowed_values && (
                                    <>
                                      <dt className="col-sm-3">Allowed Values</dt>
                                      <dd className="col-sm-9">
                                        {issue.allowed_values.map(value => (
                                          <Badge key={value} bg="secondary" className="me-2">
                                            {value}
                                          </Badge>
                                        ))}
                                      </dd>
                                    </>
                                  )}
                                </dl>
                              </Accordion.Body>
                            </Accordion.Item>
                          ))}
                        </Accordion>
                      ) : (
                        <Alert variant="success">No issues to display.</Alert>
                      )}
                    </Card.Body>
                    <Card.Footer>
                      {!report.issues_by_file[selectedFile].fixed && (
                        <Button
                          variant="success"
                          onClick={() => handleFixFile(selectedFile)}
                          disabled={fixInProgress}
                        >
                          {fixInProgress ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                              />
                              <span className="ms-2">Fixing Issues...</span>
                            </>
                          ) : (
                            'Fix All Issues'
                          )}
                        </Button>
                      )}
                    </Card.Footer>
                  </Card>
                </>
              ) : (
                <Alert variant="info">
                  Select a file from the Dashboard tab to view its details.
                </Alert>
              )}
            </Tab>
            
            <Tab eventKey="settings" title="Settings">
              <Card>
                <Card.Header>Validation Settings</Card.Header>
                <Card.Body>
                  <Row className="mb-3">
                    <Col md={6}>
                      <h5>Refresh Settings</h5>
                      <div className="mb-3">
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="autoRefreshSwitch" 
                            checked={autoRefresh}
                            onChange={() => setAutoRefresh(!autoRefresh)}
                          />
                          <label className="form-check-label" htmlFor="autoRefreshSwitch">
                            Auto-refresh data
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Refresh interval (seconds)</label>
                        <select 
                          className="form-select"
                          value={refreshInterval / 1000}
                          onChange={(e) => refreshInterval = parseInt(e.target.value) * 1000}
                        >
                          <option value="10">10 seconds</option>
                          <option value="30">30 seconds</option>
                          <option value="60">1 minute</option>
                          <option value="300">5 minutes</option>
                        </select>
                      </div>
                    </Col>
                    <Col md={6}>
                      <h5>Validation Thresholds</h5>
                      <div className="mb-3">
                        <label className="form-label">Critical threshold</label>
                        <select className="form-select">
                          <option value="0">0 (Any critical issue fails validation)</option>
                          <option value="1">1 issue</option>
                          <option value="2">2 issues</option>
                          <option value="5">5 issues</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Warning threshold</label>
                        <select className="form-select">
                          <option value="0">0 (Any warning issue shows warning)</option>
                          <option value="5">5 issues</option>
                          <option value="10">10 issues</option>
                          <option value="25">25 issues</option>
                        </select>
                      </div>
                    </Col>
                  </Row>
                  
                  <h5>Auto-Fix Settings</h5>
                  <div className="mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="fixCriticalCheck" defaultChecked />
                      <label className="form-check-label" htmlFor="fixCriticalCheck">
                        Automatically fix critical issues
                      </label>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="fixWarningCheck" />
                      <label className="form-check-label" htmlFor="fixWarningCheck">
                        Automatically fix warning issues
                      </label>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="createBackupCheck" defaultChecked />
                      <label className="form-check-label" htmlFor="createBackupCheck">
                        Create backup before fixing
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button variant="primary">Save Settings</Button>
                  </div>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Card.Body>
        
        <Card.Footer className="text-muted d-flex justify-content-between">
          <span>Directory: {report?.directory || 'Unknown'}</span>
          <span>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</span>
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default MemoryValidationMonitor;