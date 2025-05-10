import React, { useMemo } from 'react';
import { Row, Col, ProgressBar } from 'react-bootstrap';

const ActivityStats = ({ activities }) => {
  // Calculate activity stats
  const stats = useMemo(() => {
    const result = {
      totalCount: activities.length,
      byType: {},
      byStatus: {},
      recentActivity: {
        today: 0,
        thisWeek: 0,
      }
    };

    // Initialize counters
    const activityTypes = ['feature', 'build', 'test', 'deploy', 'error', 'update'];
    activityTypes.forEach(type => {
      result.byType[type] = 0;
    });

    const statuses = ['success', 'failed', 'in-progress', 'pending'];
    statuses.forEach(status => {
      result.byStatus[status] = 0;
    });

    // Calculate time benchmarks
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Count activities
    activities.forEach(activity => {
      // Count by type
      if (activity.type && result.byType[activity.type] !== undefined) {
        result.byType[activity.type]++;
      }

      // Count by status
      if (activity.status && result.byStatus[activity.status] !== undefined) {
        result.byStatus[activity.status]++;
      }

      // Count by time period
      const activityDate = new Date(activity.timestamp);
      if (activityDate >= startOfToday) {
        result.recentActivity.today++;
      }
      if (activityDate >= startOfWeek) {
        result.recentActivity.thisWeek++;
      }
    });

    return result;
  }, [activities]);

  // Calculate percentages for each type (for the chart)
  const typePercentages = useMemo(() => {
    const result = {};
    if (stats.totalCount > 0) {
      Object.keys(stats.byType).forEach(type => {
        result[type] = (stats.byType[type] / stats.totalCount) * 100;
      });
    }
    return result;
  }, [stats]);

  return (
    <div className="activity-stats">
      <h5 className="text-lg font-semibold mb-3">Activity Summary</h5>
      
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-gray-300">Total Activities</span>
          <span className="font-semibold">{stats.totalCount}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-gray-300">Today</span>
          <span className="font-semibold">{stats.recentActivity.today}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-gray-300">This Week</span>
          <span className="font-semibold">{stats.recentActivity.thisWeek}</span>
        </div>
      </div>

      <h6 className="text-md font-semibold mb-2">By Type</h6>
      <div className="mb-4">
        <Row className="activity-distribution mb-2">
          {Object.keys(stats.byType).map(type => (
            <Col xs={4} key={type} className="px-1 mb-2">
              <div 
                className={`activity-type-indicator ${type}`}
                style={{
                  height: '8px',
                  background: type === 'feature' ? '#0d6efd' :
                             type === 'build' ? '#198754' :
                             type === 'test' ? '#0dcaf0' :
                             type === 'deploy' ? '#ffc107' :
                             type === 'error' ? '#dc3545' : '#6c757d',
                  borderRadius: '4px'
                }}
              />
              <div className="d-flex justify-content-between mt-1">
                <small className="text-gray-400">{type}</small>
                <small className="text-gray-300">{stats.byType[type]}</small>
              </div>
            </Col>
          ))}
        </Row>
        <ProgressBar className="mb-3">
          {Object.keys(typePercentages).map(type => (
            <ProgressBar 
              key={type}
              variant={
                type === 'feature' ? 'primary' :
                type === 'build' ? 'success' :
                type === 'test' ? 'info' :
                type === 'deploy' ? 'warning' :
                type === 'error' ? 'danger' : 'secondary'
              }
              now={typePercentages[type]}
              style={{ transition: 'width 0.5s ease' }}
            />
          ))}
        </ProgressBar>
      </div>

      <h6 className="text-md font-semibold mb-2">By Status</h6>
      <div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-success">Success</span>
          <span className="font-semibold">{stats.byStatus.success || 0}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-danger">Failed</span>
          <span className="font-semibold">{stats.byStatus.failed || 0}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-warning">In Progress</span>
          <span className="font-semibold">{stats.byStatus['in-progress'] || 0}</span>
        </div>
        <div className="d-flex justify-content-between mb-1">
          <span className="text-info">Pending</span>
          <span className="font-semibold">{stats.byStatus.pending || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityStats;