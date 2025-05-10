import React from 'react';
import PropTypes from 'prop-types';

/**
 * TaskCard Component
 * 
 * Displays a single task with its details and actions
 */
const TaskCard = ({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  compact = false,
  showFeature = false,
  featureName = ''
}) => {
  // Priority and status colors
  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500'
  };
  
  const statusColors = {
    'completed': 'bg-green-500',
    'in-progress': 'bg-blue-500',
    'not-started': 'bg-gray-500'
  };
  
  const complexityLabels = {
    high: 'Complex',
    medium: 'Moderate',
    low: 'Simple'
  };
  
  // Format estimated hours
  const formatHours = (hours) => {
    if (hours === 1) return '1 hour';
    return `${hours} hours`;
  };

  // Handle status change
  const handleStatusChange = (e) => {
    onStatusChange(task.id, e.target.value);
  };
  
  // Render compact view (for lists)
  if (compact) {
    return (
      <div className="bg-gray-800 rounded-md p-3 mb-2 border-l-4 border-gray-700 hover:border-l-blue-500 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full ${statusColors[task.status]} mr-2`}></span>
              <h4 className="text-sm font-medium text-white">{task.name}</h4>
            </div>
            {showFeature && featureName && (
              <div className="text-xs text-gray-400 mt-1">
                Feature: {featureName}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]} text-white`}>
              {task.priority}
            </span>
            <select 
              value={task.status} 
              onChange={handleStatusChange}
              className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5"
            >
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
    );
  }
  
  // Render full card
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 mb-4">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{task.name}</h3>
            {showFeature && featureName && (
              <div className="text-sm text-gray-400 mb-2">
                Feature: {featureName}
              </div>
            )}
            <p className="text-gray-300 text-sm mb-3">{task.description}</p>
          </div>
          <div className="flex space-x-2">
            <span className={`text-xs px-3 py-1 rounded-full ${priorityColors[task.priority]} text-white`}>
              {task.priority}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full ${statusColors[task.status]} text-white`}>
              {task.status.replace('-', ' ')}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-3 mb-4">
          <div className="bg-gray-700 rounded-md p-2">
            <div className="text-xs text-gray-400">Complexity</div>
            <div className="text-sm text-white">{complexityLabels[task.complexity]}</div>
          </div>
          <div className="bg-gray-700 rounded-md p-2">
            <div className="text-xs text-gray-400">Estimated Time</div>
            <div className="text-sm text-white">{formatHours(task.estimatedHours)}</div>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <select 
            value={task.status} 
            onChange={handleStatusChange}
            className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 text-sm"
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => onEdit(task)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Edit
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

TaskCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    complexity: PropTypes.string.isRequired,
    estimatedHours: PropTypes.number
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  compact: PropTypes.bool,
  showFeature: PropTypes.bool,
  featureName: PropTypes.string
};

export default TaskCard;