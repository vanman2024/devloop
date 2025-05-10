import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * TaskModal Component
 * 
 * Modal for creating and editing tasks
 */
const TaskModal = ({ isOpen, onClose, onSave, task = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'not-started',
    priority: 'medium',
    complexity: 'medium',
    estimatedHours: 1
  });
  
  const [errors, setErrors] = useState({});
  
  // Initialize form when editing a task
  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        description: task.description || '',
        status: task.status || 'not-started',
        priority: task.priority || 'medium',
        complexity: task.complexity || 'medium',
        estimatedHours: task.estimatedHours || 1
      });
    } else {
      // Reset form for new task
      setFormData({
        name: '',
        description: '',
        status: 'not-started',
        priority: 'medium',
        complexity: 'medium',
        estimatedHours: 1
      });
    }
    
    // Clear errors
    setErrors({});
  }, [task, isOpen]);
  
  if (!isOpen) return null;
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Convert estimatedHours to number
    if (name === 'estimatedHours') {
      processedValue = parseInt(value, 10) || 0;
    }
    
    setFormData({
      ...formData,
      [name]: processedValue
    });
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }
    
    if (formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Estimated hours cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
      <div className="relative p-6 bg-gray-800 w-full max-w-md m-auto rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            {task ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Task Name */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-1 text-sm font-medium">
              Task Name*
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full p-2 bg-gray-700 border ${errors.name ? 'border-red-500' : 'border-gray-600'} rounded text-white`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-1 text-sm font-medium">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            ></textarea>
          </div>
          
          {/* Status */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-1 text-sm font-medium">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
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
              value={formData.priority}
              onChange={handleChange}
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
              value={formData.complexity}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="high">Complex</option>
              <option value="medium">Moderate</option>
              <option value="low">Simple</option>
            </select>
          </div>
          
          {/* Estimated Hours */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-1 text-sm font-medium">
              Estimated Hours
            </label>
            <input
              type="number"
              name="estimatedHours"
              value={formData.estimatedHours}
              onChange={handleChange}
              min="0"
              className={`w-full p-2 bg-gray-700 border ${errors.estimatedHours ? 'border-red-500' : 'border-gray-600'} rounded text-white`}
            />
            {errors.estimatedHours && (
              <p className="text-red-500 text-xs mt-1">{errors.estimatedHours}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

TaskModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  task: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    status: PropTypes.string,
    priority: PropTypes.string,
    complexity: PropTypes.string,
    estimatedHours: PropTypes.number
  })
};

export default TaskModal;