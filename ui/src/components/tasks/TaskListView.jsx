import React, { useState, useEffect } from 'react';
import { 
  fetchAllTasks, 
  updateTask, 
  deleteTask, 
  getTaskFeature,
  createFeatureTask
} from '../../services/taskService';
import TaskModal from './TaskModal';
import TaskDetailPanel from './TaskDetailPanel';

/**
 * TaskListView Component
 * 
 * Displays a list of all tasks across features
 * Used in the Activity Center
 */
const TaskListView = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFeatures, setTaskFeatures] = useState({});
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    complexity: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Load all tasks
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const taskData = await fetchAllTasks();
        setTasks(taskData);
        
        // Load parent feature for each task
        const featureMap = {};
        for (const task of taskData) {
          try {
            const feature = await getTaskFeature(task.id);
            featureMap[task.id] = feature.properties.name;
          } catch (err) {
            console.error(`Error loading feature for task ${task.id}:`, err);
            featureMap[task.id] = 'Unknown Feature';
          }
        }
        
        setTaskFeatures(featureMap);
        setLoading(false);
      } catch (err) {
        console.error('Error loading tasks:', err);
        setError('Failed to load tasks. Please try again.');
        setLoading(false);
      }
    };
    
    loadTasks();
  }, []);
  
  // Handle task status change
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;
      
      const updatedTask = { ...taskToUpdate, status: newStatus };
      await updateTask(taskId, updatedTask);
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      // Also update selected task if it's the one being changed
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status. Please try again.');
    }
  };
  
  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(taskId);
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== taskId));
      
      // Close detail panel if the deleted task was selected
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };
  
  // Handle selecting a task to view details
  const handleSelectTask = (task) => {
    setSelectedTask(task);
  };
  
  // Handle creating a new task
  const handleCreateTask = () => {
    setEditingTask(null);
    setShowModal(true);
  };
  
  // Handle saving a new task
  const handleSaveNewTask = async (taskData) => {
    try {
      // For now, we'll create a task for the first feature we find
      // In a real implementation, you'd want to show a dropdown to select which feature
      const firstTask = tasks[0];
      let featureId;
      
      if (firstTask) {
        try {
          const feature = await getTaskFeature(firstTask.id);
          featureId = feature.id;
        } catch (err) {
          console.error('Error getting feature ID:', err);
          setError('Failed to create task: Could not determine feature ID');
          return;
        }
      } else {
        setError('Failed to create task: No features available');
        return;
      }
      
      // Create the task
      const newTask = await createFeatureTask(featureId, taskData);
      
      // Update local state
      setTasks([...tasks, newTask]);
      setTaskFeatures({
        ...taskFeatures,
        [newTask.id]: 'New Feature' // Placeholder until we fetch the real name
      });
      
      setShowModal(false);
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task. Please try again.');
    }
  };
  
  // Handle updating a task
  const handleUpdateTask = (updatedTask) => {
    // Update tasks list
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? { ...task, ...updatedTask } : task
    ));
    
    // Update selected task
    setSelectedTask({ ...selectedTask, ...updatedTask });
  };
  
  // Handle navigating to feature
  const handleNavigateToFeature = (feature) => {
    // In a real implementation, this would navigate to the feature detail page
    alert(`Navigating to feature: ${feature.properties?.name || 'Unknown Feature'}`);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  // Handle sort changes
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };
  
  // Apply filters and sorting
  const filteredAndSortedTasks = tasks
    // Apply filters
    .filter(task => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }
      
      // Complexity filter
      if (filters.complexity !== 'all' && task.complexity !== filters.complexity) {
        return false;
      }
      
      // Search term filter
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        const featureName = taskFeatures[task.id] || '';
        
        return (
          task.name.toLowerCase().includes(searchTermLower) ||
          task.id.toLowerCase().includes(searchTermLower) ||
          featureName.toLowerCase().includes(searchTermLower) ||
          (task.description && task.description.toLowerCase().includes(searchTermLower))
        );
      }
      
      return true;
    })
    // Apply sorting
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'priority':
          // Convert priority to numeric value for sorting
          const priorityValues = { high: 3, medium: 2, low: 1 };
          comparison = priorityValues[b.priority] - priorityValues[a.priority];
          break;
        case 'status':
          // Convert status to numeric value for sorting
          const statusValues = { 'completed': 3, 'in-progress': 2, 'not-started': 1 };
          comparison = statusValues[b.status] - statusValues[a.status];
          break;
        case 'complexity':
          // Convert complexity to numeric value for sorting
          const complexityValues = { high: 3, medium: 2, low: 1 };
          comparison = complexityValues[b.complexity] - complexityValues[a.complexity];
          break;
        case 'estimatedHours':
          comparison = b.estimatedHours - a.estimatedHours;
          break;
        default:
          comparison = 0;
      }
      
      // Reverse if ascending
      return sortDirection === 'asc' ? -comparison : comparison;
    });
  
  // Calculate task statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const notStartedTasks = tasks.filter(task => task.status === 'not-started').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Show loading state
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  // Determine if we need to adjust layout for the detail panel
  const hasDetailPanel = !!selectedTask;
  
  return (
    <div className={`p-4 transition-all duration-300 ${hasDetailPanel ? 'pr-96' : ''}`}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Issue Tracker</h2>
          <button 
            onClick={handleCreateTask}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Create Task
          </button>
        </div>
        
        {/* Task Statistics in a more compact form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 mb-6">
          <div className="bg-[#121c2e] rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{totalTasks}</div>
            <div className="text-sm text-gray-400">Total Tasks</div>
          </div>
          
          <div className="bg-[#121c2e] rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-4xl font-bold text-green-500 mb-1">{completedTasks}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          
          <div className="bg-[#121c2e] rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-4xl font-bold text-blue-500 mb-1">{inProgressTasks}</div>
            <div className="text-sm text-gray-400">In Progress</div>
          </div>
          
          <div className="bg-[#121c2e] rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-4xl font-bold text-yellow-500 mb-1">{notStartedTasks}</div>
            <div className="text-sm text-gray-400">Not Started</div>
          </div>
          
          <div className="bg-[#121c2e] rounded-lg p-4 text-center">
            <div className="text-3xl sm:text-4xl font-bold text-purple-500 mb-1">{completionPercentage}%</div>
            <div className="text-sm text-gray-400">Completion</div>
          </div>
        </div>
        
        {/* Filters and search bar matching Issue Tracker style */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-grow">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search issues..." 
                className="w-full p-2 pl-10 bg-[#121c2e] border border-[rgba(255,255,255,0.1)] rounded text-white text-sm"
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="p-2 bg-[#121c2e] border border-[rgba(255,255,255,0.1)] rounded text-white text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="p-2 bg-[#121c2e] border border-[rgba(255,255,255,0.1)] rounded text-white text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              name="complexity"
              value={filters.complexity}
              onChange={handleFilterChange}
              className="p-2 bg-[#121c2e] border border-[rgba(255,255,255,0.1)] rounded text-white text-sm"
            >
              <option value="all">All Complexities</option>
              <option value="high">Complex</option>
              <option value="medium">Moderate</option>
              <option value="low">Simple</option>
            </select>
            
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="p-2 bg-[#121c2e] border border-[rgba(255,255,255,0.1)] rounded text-white text-sm"
            >
              <option value="priority">Sort by Priority</option>
              <option value="status">Sort by Status</option>
              <option value="complexity">Sort by Complexity</option>
              <option value="estimatedHours">Sort by Est. Hours</option>
            </select>
            
            <button
              onClick={toggleSortDirection}
              className="p-2 bg-[#121c2e] border border-[rgba(255,255,255,0.1)] rounded text-white text-sm"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        
        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Refresh Tasks
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900 text-white p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Task list as table similar to Issue Tracker in screenshot */}
      <div className="text-sm text-gray-400 mb-4">
        Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
      </div>
      
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-[#1a2233] rounded-lg border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-xl font-medium text-gray-300">No tasks found</h3>
          <p className="mt-2">Try adjusting your filters or search criteria</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#0f172a] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-3 font-medium text-white whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    className="mr-2"
                    onChange={(e) => {
                      // Select all functionality would go here
                    }}
                  />
                  Task
                </th>
                <th className="p-3 font-medium text-white">Feature</th>
                <th className="p-3 font-medium text-white">Priority</th>
                <th className="p-3 font-medium text-white">Complexity</th>
                <th className="p-3 font-medium text-white">Status</th>
                <th className="p-3 font-medium text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTasks.map((task, index) => (
                <tr 
                  key={task.id} 
                  className={`border-t border-[#1a2233] text-sm hover:bg-[#1a2233] transition-colors cursor-pointer 
                    ${index % 2 === 0 ? 'bg-[#121c2e]' : 'bg-[#121c2e]'}
                    ${selectedTask?.id === task.id ? 'bg-[#1e293b] border-l-4 border-l-blue-500' : ''}
                  `}
                  onClick={() => handleSelectTask(task)}
                >
                  <td className="p-3">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="font-medium text-white">
                        {task.name}
                        <div className="text-xs text-gray-400 mt-1">
                          {task.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-white">
                    {taskFeatures[task.id] || 'Unknown Feature'}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      task.priority === 'high' ? 'bg-red-900 text-red-200' : 
                      task.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' : 
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      task.complexity === 'high' ? 'bg-purple-900 text-purple-200' : 
                      task.complexity === 'medium' ? 'bg-green-900 text-green-200' : 
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {task.complexity}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in-progress' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}></span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        task.status === 'completed' ? 'bg-green-900 text-green-200' :
                        task.status === 'in-progress' ? 'bg-blue-900 text-blue-200' :
                        'bg-yellow-900 text-yellow-200'
                      }`}>
                        {task.status === 'not-started' ? 'Not Started' :
                         task.status === 'in-progress' ? 'In Progress' :
                         'Completed'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, 
                            task.status === 'not-started' ? 'in-progress' :
                            task.status === 'in-progress' ? 'completed' :
                            'not-started');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                      >
                        {task.status === 'completed' ? 'Reset' : 'Advance'}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Task create modal */}
      <TaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveNewTask}
        task={editingTask}
      />
      
      {/* Task detail side panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onNavigateToFeature={handleNavigateToFeature}
        />
      )}
    </div>
  );
};

export default TaskListView;