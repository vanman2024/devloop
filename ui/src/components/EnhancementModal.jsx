import React, { useState } from 'react';

const EnhancementModal = ({ isOpen, onClose, featureId, featureName }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    priority: 'medium',
    createBranch: true,
    generateTests: false,
    updateDocs: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate enhancement creation
    console.log(`Creating enhancement for ${featureId}:`, formData);
    
    // In a real app, this would call an API
    alert(`Enhancement "${formData.title}" created for ${featureName}
Type: ${formData.type}
Priority: ${formData.priority}`);
    
    // Reset form and close modal
    setFormData({
      title: '',
      description: '',
      type: 'feature',
      priority: 'medium',
      createBranch: true,
      generateTests: false,
      updateDocs: false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-lg w-[700px] border border-gray-700 flex flex-col overflow-hidden">
        <div className="bg-purple-800 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <div className="font-semibold text-xl text-white">Add Enhancement: {featureName}</div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Enhancement Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter a descriptive title"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                placeholder="Describe the enhancement and why it's needed"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-24 resize-y"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="feature">New Functionality</option>
                  <option value="performance">Performance Improvement</option>
                  <option value="ux">User Experience</option>
                  <option value="security">Security Enhancement</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-md space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="createBranch"
                  checked={formData.createBranch}
                  onChange={handleInputChange}
                  className="form-checkbox rounded text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm text-gray-300">Create feature branch</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="generateTests"
                  checked={formData.generateTests}
                  onChange={handleInputChange}
                  className="form-checkbox rounded text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm text-gray-300">Generate test cases</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="updateDocs"
                  checked={formData.updateDocs}
                  onChange={handleInputChange}
                  className="form-checkbox rounded text-purple-600 focus:ring-purple-600"
                />
                <span className="text-sm text-gray-300">Update documentation</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 transition"
              >
                Create Enhancement
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnhancementModal;