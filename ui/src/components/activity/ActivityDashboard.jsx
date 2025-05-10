import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, ProgressBar, Alert, Badge, Dropdown, ButtonGroup, Button } from 'react-bootstrap';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import { 
  Calendar4, GraphUp, CheckCircleFill, XCircleFill, 
  ExclamationTriangleFill, Lightning, Clock, ArrowRepeat
} from 'react-bootstrap-icons';
import { getActivityStats } from '../../components/activity/activityService';

/**
 * ActivityDashboard component
 * Displays activity metrics, trends, and system health indicators
 */
const ActivityDashboard = ({ realTimeUpdates = false }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Fetch activity stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getActivityStats();
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching activity stats:', err);
      setError('Failed to load activity statistics');
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchStats();
  }, []);

  // Set up auto-refresh if real-time updates are enabled
  useEffect(() => {
    if (realTimeUpdates && refreshInterval) {
      const interval = setInterval(fetchStats, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [realTimeUpdates, refreshInterval]);

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Handle refresh interval change
  const handleRefreshIntervalChange = (seconds) => {
    setRefreshInterval(seconds);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    fetchStats();
  };

  // Get system health status based on stats
  const getSystemHealth = () => {
    if (!stats) return { status: 'unknown', score: 0 };
    
    // Calculate health score based on various factors
    let score = 100;
    let issues = [];
    
    // Check error rate
    const errorCount = stats.byType?.error || 0;
    const totalActivities = stats.total || 1;
    const errorRate = errorCount / totalActivities;
    
    if (errorRate > 0.2) {
      score -= 40;
      issues.push('High error rate');
    } else if (errorRate > 0.1) {
      score -= 20;
      issues.push('Moderate error rate');
    }
    
    // Check failed activities
    const failedCount = stats.byStatus?.failed || 0;
    const failureRate = failedCount / totalActivities;
    
    if (failureRate > 0.2) {
      score -= 30;
      issues.push('High failure rate');
    } else if (failureRate > 0.1) {
      score -= 15;
      issues.push('Moderate failure rate');
    }
    
    // Check pending activities
    const pendingCount = stats.byStatus?.pending || 0;
    if (pendingCount > 5) {
      score -= 10;
      issues.push('Many pending activities');
    }
    
    // System health status based on score
    let status;
    if (score >= 90) {
      status = 'excellent';
    } else if (score >= 75) {
      status = 'good';
    } else if (score >= 50) {
      status = 'fair';
    } else if (score >= 25) {
      status = 'poor';
    } else {
      status = 'critical';
    }
    
    return { status, score, issues };
  };

  // Helper to determine color for health status
  const getHealthColor = (status) => {
    switch (status) {
      case 'excellent': return '#2ecc71'; // Green
      case 'good': return '#27ae60';      // Dark Green
      case 'fair': return '#f39c12';      // Orange
      case 'poor': return '#e67e22';      // Dark Orange
      case 'critical': return '#e74c3c';  // Red
      default: return '#95a5a6';          // Gray
    }
  };

  // Prepare data for activity type chart
  const prepareTypeChartData = () => {
    if (!stats || !stats.byType) return [];
    
    return Object.entries(stats.byType).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count
    }));
  };

  // Prepare data for activity status chart
  const prepareStatusChartData = () => {
    if (!stats || !stats.byStatus) return [];
    
    return Object.entries(stats.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }));
  };

  // Prepare time-based activity data
  const prepareTimeChartData = () => {
    if (!stats || !stats.byTime) {
      // Generate mock time data if not available
      const mockData = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        mockData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: Math.floor(Math.random() * 10) + 1
        });
      }
      
      return mockData;
    }
    
    return stats.byTime;
  };

  // Prepare trending data
  const prepareTrendingData = () => {
    if (!stats || !stats.trends) {
      // Generate mock trend data if not available
      const mockData = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        mockData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          features: Math.floor(Math.random() * 5),
          builds: Math.floor(Math.random() * 7),
          tests: Math.floor(Math.random() * 6),
          errors: Math.floor(Math.random() * 3)
        });
      }
      
      return mockData;
    }
    
    return stats.trends;
  };

  // Colors for charts
  const COLORS = [
    '#3498db', // Blue
    '#2ecc71', // Green
    '#e74c3c', // Red
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#34495e', // Dark Blue
    '#e67e22', // Dark Orange
    '#95a5a6'  // Gray
  ];

  // Get status for health indicators
  const getStatusVariant = (status) => {
    switch (status) {
      case 'excellent':
      case 'good': return 'success';
      case 'fair': return 'warning';
      case 'poor': 
      case 'critical': return 'danger';
      default: return 'secondary';
    }
  };

  // Get system health
  const systemHealth = getSystemHealth();

  return (
    <div className="activity-dashboard mb-4">
      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Row className="mb-3">
        <Col className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Activity Dashboard</h4>
          <div className="d-flex gap-2">
            <ButtonGroup>
              <Button
                variant={timeRange === 'today' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => handleTimeRangeChange('today')}
              >
                Today
              </Button>
              <Button
                variant={timeRange === '7days' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => handleTimeRangeChange('7days')}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === '30days' ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => handleTimeRangeChange('30days')}
              >
                30 Days
              </Button>
            </ButtonGroup>
            
            <Dropdown>
              <Dropdown.Toggle variant="outline-light" size="sm" id="refresh-dropdown">
                {refreshInterval ? `Auto (${refreshInterval}s)` : 'Auto Refresh'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => handleRefreshIntervalChange(null)}>
                  Off
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleRefreshIntervalChange(15)}>
                  Every 15 seconds
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleRefreshIntervalChange(30)}>
                  Every 30 seconds
                </Dropdown.Item>
                <Dropdown.Item onClick={() => handleRefreshIntervalChange(60)}>
                  Every minute
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button variant="outline-light" size="sm" onClick={handleManualRefresh}>
              <ArrowRepeat />
            </Button>
          </div>
        </Col>
      </Row>
      
      {loading && !stats ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-2">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Summary Metrics */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="bg-gray-700 border-0 shadow mb-3" style={{ minHeight: '140px' }}>
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="text-muted mb-1">Total Activities</h6>
                      <h2 className="mb-0">{stats?.total || 0}</h2>
                    </div>
                    <div className="p-2 rounded-circle bg-primary bg-opacity-25">
                      <GraphUp size={24} className="text-primary" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="text-muted d-flex align-items-center">
                      <Calendar4 className="me-1" size={12} />
                      {timeRange === 'today' ? 'Today' : 
                       timeRange === '7days' ? 'Last 7 days' : 'Last 30 days'}
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="bg-gray-700 border-0 shadow mb-3" style={{ minHeight: '140px' }}>
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="text-muted mb-1">Successful</h6>
                      <h2 className="mb-0">{stats?.byStatus?.success || 0}</h2>
                    </div>
                    <div className="p-2 rounded-circle bg-success bg-opacity-25">
                      <CheckCircleFill size={24} className="text-success" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar 
                      variant="success" 
                      now={(stats?.byStatus?.success || 0) / (stats?.total || 1) * 100}
                      className="bg-dark"
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="bg-gray-700 border-0 shadow mb-3" style={{ minHeight: '140px' }}>
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="text-muted mb-1">Failed</h6>
                      <h2 className="mb-0">{stats?.byStatus?.failed || 0}</h2>
                    </div>
                    <div className="p-2 rounded-circle bg-danger bg-opacity-25">
                      <XCircleFill size={24} className="text-danger" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar 
                      variant="danger" 
                      now={(stats?.byStatus?.failed || 0) / (stats?.total || 1) * 100}
                      className="bg-dark"
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="bg-gray-700 border-0 shadow mb-3" style={{ minHeight: '140px' }}>
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="text-muted mb-1">Pending</h6>
                      <h2 className="mb-0">{stats?.byStatus?.pending || 0}</h2>
                    </div>
                    <div className="p-2 rounded-circle bg-warning bg-opacity-25">
                      <Clock size={24} className="text-warning" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar 
                      variant="warning" 
                      now={(stats?.byStatus?.pending || 0) / (stats?.total || 1) * 100}
                      className="bg-dark"
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* System Health */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="bg-gray-700 border-0 shadow h-100">
                <Card.Body>
                  <h5 className="mb-3">System Health</h5>
                  <div className="d-flex align-items-center mb-3">
                    <div 
                      className="health-indicator me-3" 
                      style={{ 
                        backgroundColor: getHealthColor(systemHealth.status),
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 'bold'
                      }}
                    >
                      {systemHealth.score}
                    </div>
                    <div>
                      <h6 className="mb-1">Overall Status</h6>
                      <Badge bg={getStatusVariant(systemHealth.status)} className="text-uppercase">
                        {systemHealth.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h6 className="mb-2">Health Metrics</h6>
                    <div className="d-flex mb-2 justify-content-between">
                      <div>Error Rate</div>
                      <Badge bg={((stats?.byType?.error || 0) / (stats?.total || 1) > 0.1) ? 'danger' : 'success'}>
                        {Math.round(((stats?.byType?.error || 0) / (stats?.total || 1)) * 100)}%
                      </Badge>
                    </div>
                    <div className="d-flex mb-2 justify-content-between">
                      <div>Success Rate</div>
                      <Badge bg={((stats?.byStatus?.success || 0) / (stats?.total || 1) < 0.7) ? 'warning' : 'success'}>
                        {Math.round(((stats?.byStatus?.success || 0) / (stats?.total || 1)) * 100)}%
                      </Badge>
                    </div>
                    <div className="d-flex mb-2 justify-content-between">
                      <div>Active Alerts</div>
                      <Badge bg={(systemHealth.issues?.length > 0) ? 'warning' : 'success'}>
                        {systemHealth.issues?.length || 0}
                      </Badge>
                    </div>
                  </div>
                  
                  {systemHealth.issues && systemHealth.issues.length > 0 && (
                    <div className="mt-3">
                      <h6 className="mb-2">Active Issues</h6>
                      <ul className="list-unstyled">
                        {systemHealth.issues.map((issue, index) => (
                          <li key={index} className="d-flex align-items-center mb-2">
                            <ExclamationTriangleFill className="text-warning me-2" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={8}>
              <Card className="bg-gray-700 border-0 shadow h-100">
                <Card.Body>
                  <h5 className="mb-3">Activity Trends</h5>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={prepareTrendingData()}
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="date" stroke="#aaa" />
                        <YAxis stroke="#aaa" />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          itemStyle={{ color: '#eee' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="features" 
                          stroke="#3498db" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="builds" 
                          stroke="#2ecc71" 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="tests" 
                          stroke="#9b59b6" 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="errors" 
                          stroke="#e74c3c" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Activity Type and Status Charts */}
          <Row>
            <Col md={4}>
              <Card className="bg-gray-700 border-0 shadow mb-3">
                <Card.Body>
                  <h5 className="mb-3">Activity Types</h5>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prepareTypeChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {prepareTypeChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          formatter={(value, name) => [`${value} activities`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="bg-gray-700 border-0 shadow mb-3">
                <Card.Body>
                  <h5 className="mb-3">Status Distribution</h5>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={prepareStatusChartData()}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis type="number" stroke="#aaa" />
                        <YAxis dataKey="name" type="category" stroke="#aaa" />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          formatter={(value) => [`${value} activities`]}
                        />
                        <Bar dataKey="value" barSize={20}>
                          {prepareStatusChartData().map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'Success' ? '#2ecc71' : 
                                    entry.name === 'Failed' ? '#e74c3c' : 
                                    entry.name === 'Pending' ? '#f39c12' : 
                                    entry.name === 'In-progress' ? '#3498db' : 
                                    COLORS[index % COLORS.length]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="bg-gray-700 border-0 shadow mb-3">
                <Card.Body>
                  <h5 className="mb-3">Activity Timeline</h5>
                  <div style={{ height: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={prepareTimeChartData()}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3498db" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="date" stroke="#aaa" />
                        <YAxis stroke="#aaa" />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#333', border: 'none' }}
                          formatter={(value) => [`${value} activities`]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#3498db" 
                          fillOpacity={1} 
                          fill="url(#colorCount)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ActivityDashboard;