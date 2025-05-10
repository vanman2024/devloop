import React from 'react';
import { Form } from 'react-bootstrap';

const ActivityFilters = ({ filters, onFilterChange }) => {
  const handleTypeChange = (e) => {
    onFilterChange({ type: e.target.value });
  };

  const handleTimeframeChange = (e) => {
    onFilterChange({ timeframe: e.target.value });
  };

  const handleStatusChange = (e) => {
    onFilterChange({ status: e.target.value });
  };

  return (
    <div className="activity-filters">
      <h5 className="text-lg font-semibold mb-3">Filters</h5>
      
      <Form.Group className="mb-3">
        <Form.Label className="text-gray-300">Activity Type</Form.Label>
        <Form.Select 
          value={filters.type} 
          onChange={handleTypeChange}
          className="bg-gray-800 text-white border-gray-600"
        >
          <option value="all">All Types</option>
          <option value="feature">Feature</option>
          <option value="build">Build</option>
          <option value="test">Test</option>
          <option value="deploy">Deploy</option>
          <option value="error">Error</option>
          <option value="update">Update</option>
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label className="text-gray-300">Time Period</Form.Label>
        <Form.Select 
          value={filters.timeframe} 
          onChange={handleTimeframeChange}
          className="bg-gray-800 text-white border-gray-600"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label className="text-gray-300">Status</Form.Label>
        <Form.Select 
          value={filters.status} 
          onChange={handleStatusChange}
          className="bg-gray-800 text-white border-gray-600"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="in-progress">In Progress</option>
          <option value="pending">Pending</option>
        </Form.Select>
      </Form.Group>

      <hr className="my-4 border-gray-600" />

      <Form.Group className="mb-3">
        <Form.Label className="text-gray-300">Advanced Filters</Form.Label>
        <div className="mb-2">
          <Form.Check 
            type="checkbox" 
            id="user-initiated"
            label="User Initiated" 
            className="text-gray-300"
          />
        </div>
        <div className="mb-2">
          <Form.Check 
            type="checkbox" 
            id="system-generated"
            label="System Generated" 
            className="text-gray-300"
          />
        </div>
        <div className="mb-2">
          <Form.Check 
            type="checkbox" 
            id="requires-attention"
            label="Requires Attention" 
            className="text-gray-300"
          />
        </div>
      </Form.Group>
    </div>
  );
};

export default ActivityFilters;