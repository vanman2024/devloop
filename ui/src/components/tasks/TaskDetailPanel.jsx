import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getTaskFeature, updateTask, deleteTask } from '../../services/taskService';

/**
 * TaskDetailPanel Component
 * 
 * Displays detailed information about a task in a side panel
 * with relationship navigation to parent feature and milestone
 */
const TaskDetailPanel = ({ task, onClose, onUpdate, onDelete, onNavigateToFeature }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featureDetails, setFeatureDetails] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState({ ...task });
  
  // Fetch parent feature details
  useEffect(() => {
    const fetchFeature = async () => {
      if (!task) return;
      
      try {
        setLoading(true);
        const feature = await getTaskFeature(task.id);
        setFeatureDetails(feature);
        setLoading(false);
      } catch (err) {
        console.error(`Error loading feature for task ${task.id}:`, err);
        setError('Failed to load feature details.');
        setLoading(false);
      }
    };
    
    fetchFeature();
  }, [task]);
  
  if (!task) return null;
  
  // Handle input changes in edit mode
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Convert estimatedHours to number
    if (name === 'estimatedHours') {
      processedValue = parseInt(value, 10) || 0;
    }
    
    setEditedTask({
      ...editedTask,
      [name]: processedValue
    });
  };
  
  // Save task changes
  const handleSave = async () => {
    try {
      await updateTask(task.id, editedTask);
      onUpdate(editedTask);
      setEditMode(false);
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
    }
  };
  
  // Handle task deletion
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(task.id);
      onDelete(task.id);
      onClose();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };
  
  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };
  
  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'not-started':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Priority color mapping
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Complexity color mapping
  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'high':
        return 'bg-purple-500 text-purple-100';
      case 'medium':
        return 'bg-green-500 text-green-100';
      case 'low':
        return 'bg-blue-500 text-blue-100';
      default:
        return 'bg-gray-500 text-gray-100';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-800 shadow-lg z-50 overflow-y-auto border-l border-gray-700 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white truncate mr-6">{task.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 w-8 h-8 rounded-full flex items-center justify-center text-xl"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div className="flex items-center mt-2 text-sm">
          <span className="text-gray-400">Task ID:</span>
          <span className="text-gray-300 ml-2 font-mono">{task.id}</span>
        </div>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900 text-white p-3 m-4 rounded-md">
          {error}
        </div>
      )}
      
      {/* Content */}
      {!loading && (
        <div className="p-4">
          {/* Breadcrumb navigation */}
          {featureDetails && (
            <div className="bg-gray-900 rounded-md p-3 mb-4">
              <div className="text-sm text-gray-400 mb-1">Path</div>
              <div className="flex items-center flex-wrap gap-1 text-sm">
                <span className="text-gray-400">
                  {featureDetails.properties?.milestone || 'Milestone'}
                </span>
                <span className="text-gray-600">›</span>
                <span className="text-gray-400">
                  {featureDetails.properties?.phase || 'Phase'}
                </span>
                <span className="text-gray-600">›</span>
                <span className="text-gray-400">
                  {featureDetails.properties?.module || 'Module'}
                </span>
                <span className="text-gray-600">›</span>
                <button
                  onClick={() => onNavigateToFeature(featureDetails)}
                  className="text-blue-400 hover:underline"
                >
                  {featureDetails.properties?.name || 'Feature'}
                </button>
                <span className="text-gray-600">›</span>
                <span className="text-white font-medium">{task.name}</span>
              </div>
            </div>
          )}
          
          {/* Task details */}
          {!editMode ? (
            /* View mode */
            <>
              {/* Status, priority, complexity indicators */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-900 p-3 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Status</div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(task.status)} mr-2`}></span>
                    <span className="text-sm text-white capitalize">
                      {task.status === 'not-started' ? 'Not Started' : task.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-900 p-3 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Priority</div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} mr-2`}></span>
                    <span className="text-sm text-white capitalize">{task.priority}</span>
                  </div>
                </div>
                
                <div className="bg-gray-900 p-3 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Complexity</div>
                  <div className="flex items-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${getComplexityColor(task.complexity)}`}>
                      {task.complexity}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div className="bg-gray-900 p-3 rounded-md mb-4">
                <div className="text-xs text-gray-400 mb-1">Description</div>
                <div className="text-sm text-white">
                  {task.description || <span className="text-gray-500 italic">No description provided</span>}
                </div>
              </div>
              
              {/* Time estimates and dates */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-900 p-3 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Estimated Time</div>
                  <div className="text-sm text-white">
                    {task.estimatedHours} {task.estimatedHours === 1 ? 'hour' : 'hours'}
                  </div>
                </div>
                
                <div className="bg-gray-900 p-3 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Created</div>
                  <div className="text-sm text-white">{formatDate(task.createdAt)}</div>
                </div>
              </div>
              
              {/* Feature preview */}
              {featureDetails && (
                <div className="bg-gray-900 p-3 rounded-md mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-gray-400">Parent Feature</div>
                    <button 
                      onClick={() => onNavigateToFeature(featureDetails)}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      View Feature →
                    </button>
                  </div>
                  <div className="text-sm text-white font-medium mb-1">
                    {featureDetails.properties?.name || 'Unknown Feature'}
                  </div>
                  <div className="text-xs text-gray-300 line-clamp-2">
                    {featureDetails.properties?.description || 'No description available.'}
                  </div>
                </div>
              )}
              
              {/* Related tasks placeholder */}
              <div className="bg-gray-900 p-3 rounded-md mb-4">
                <div className="text-xs text-gray-400 mb-1">Related Tasks</div>
                <div className="text-sm text-gray-500 italic">
                  Related tasks will appear here.
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
              
              {/* Extra close button at the bottom */}
              <div className="mt-8 text-center">
                <button
                  onClick={onClose}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm w-full"
                >
                  Close Panel
                </button>
              </div>
            </>
          ) : (
            /* Edit mode */
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              {/* Name */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-1 text-sm font-medium">
                  Task Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={editedTask.name}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  required
                />
              </div>
              
              {/* Status */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-1 text-sm font-medium">
                  Status
                </label>
                <select
                  name="status"
                  value={editedTask.status}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              {/* Priority */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-1 text-sm font-medium">
                  Priority
                </label>
                <select
                  name="priority"
                  value={editedTask.priority}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              {/* Complexity */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-1 text-sm font-medium">
                  Complexity
                </label>
                <select
                  name="complexity"
                  value={editedTask.complexity}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="high">Complex</option>
                  <option value="medium">Moderate</option>
                  <option value="low">Simple</option>
                </select>
              </div>
              
              {/* Description */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-1 text-sm font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editedTask.description || ''}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                ></textarea>
              </div>
              
              {/* Estimated Hours */}
              <div className="mb-6">
                <label className="block text-gray-300 mb-1 text-sm font-medium">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  name="estimatedHours"
                  value={editedTask.estimatedHours}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
              
              {/* Extra close button at the bottom */}
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full text-sm w-full"
                >
                  Close Panel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

TaskDetailPanel.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    complexity: PropTypes.string.isRequired,
    estimatedHours: PropTypes.number,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onNavigateToFeature: PropTypes.func.isRequired
};

export default TaskDetailPanel;