import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import { fetchFeatureTasks, createFeatureTask, updateTask, deleteTask } from '../../services/taskService';
import {
  processFeatureWithAgent,
  getFeatureTasksWithAgent,
  updateTaskWithAgent,
  isTaskAgentAvailable
} from '../../services/taskAgentService';

/**
 * TasksTab Component
 *
 * Displays tasks for a specific feature in a tab
 * Integrates with the Task Agent for AI-powered task generation
 */
const TasksTab = ({ feature }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    completionPercentage: 0
  });
  const [agentAvailable, setAgentAvailable] = useState(false);
  const [agentThoughts, setAgentThoughts] = useState([]);
  const [showAgentThoughts, setShowAgentThoughts] = useState(false);

  // Debug log when the component renders
  console.log('TasksTab rendering with feature:', feature);

  // Check if Task Agent is available
  useEffect(() => {
    const checkAgentAvailability = async () => {
      const available = await isTaskAgentAvailable();
      setAgentAvailable(available);
    };

    checkAgentAvailability();
  }, []);

  // Fetch tasks for this feature
  useEffect(() => {
    const loadTasks = async () => {
      try {
        if (!feature || !feature.id) {
          console.warn('No feature ID provided to TasksTab, cannot load tasks');
          setTasks([]);
          setTaskStats({
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            completionPercentage: 0
          });
          setLoading(false);
          return;
        }

        setLoading(true);

        if (agentAvailable) {
          try {
            // Use Task Agent to get tasks and statistics
            const result = await getFeatureTasksWithAgent(feature.id);

            if (result.success) {
              setTasks(result.tasks);
              setTaskStats({
                total: result.completion_status.total_tasks,
                completed: result.completion_status.completed,
                inProgress: result.completion_status.in_progress,
                notStarted: result.completion_status.not_started,
                completionPercentage: result.completion_status.percent_complete
              });
              setAgentThoughts(result.agent_thoughts || []);
              setLoading(false);
              return;
            }
          } catch (agentError) {
            console.warn('Task Agent error, falling back to standard API:', agentError);
            // Fall through to standard approach
          }
        }

        // Standard approach (fallback from agent or if agent not available)
        let taskData = [];

        try {
          taskData = await fetchFeatureTasks(feature.id);
        } catch (fetchError) {
          console.warn(`Error fetching tasks for feature ${feature.id}, using empty array:`, fetchError);
          // Continue with empty task data rather than failing
          taskData = [];
        }

        // Calculate stats
        const total = taskData.length;
        const completed = taskData.filter(task => task.status === 'completed').length;
        const inProgress = taskData.filter(task => task.status === 'in-progress').length;
        const notStarted = taskData.filter(task => task.status === 'not-started').length;
        const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        setTasks(taskData);
        setTaskStats({
          total,
          completed,
          inProgress,
          notStarted,
          completionPercentage
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading tasks:', err);
        setError('Failed to load tasks. Please try again.');
        // Set empty data to avoid breaking UI
        setTasks([]);
        setTaskStats({
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          completionPercentage: 0
        });
        setLoading(false);
      }
    };

    // Always attempt to load tasks, even if feature.id is undefined
    // The function will handle the case where feature.id is missing
    loadTasks();
  }, [feature, agentAvailable]);

  // Handle adding a new task
  const handleAddTask = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  // Handle editing a task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  // Handle task status change
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      // Use Task Agent if available, with fallback to standard service
      if (agentAvailable) {
        try {
          const result = await updateTaskWithAgent(taskId, newStatus);

          if (!result.success) {
            throw new Error(result.message || 'Failed to update task status with agent');
          }
        } catch (agentError) {
          console.warn('Task Agent error when updating task status, falling back:', agentError);
          // Fall through to standard approach
          const updatedTask = { ...taskToUpdate, status: newStatus };
          await updateTask(taskId, updatedTask);
        }
      } else {
        // Standard approach
        const updatedTask = { ...taskToUpdate, status: newStatus };
        await updateTask(taskId, updatedTask);
      }

      // Update local state
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      // Recalculate stats
      const completed = tasks.filter(task =>
        task.id === taskId ? newStatus === 'completed' : task.status === 'completed'
      ).length;

      const inProgress = tasks.filter(task =>
        task.id === taskId ? newStatus === 'in-progress' : task.status === 'in-progress'
      ).length;

      const notStarted = tasks.filter(task =>
        task.id === taskId ? newStatus === 'not-started' : task.status === 'not-started'
      ).length;

      const completionPercentage = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

      setTaskStats({
        ...taskStats,
        completed,
        inProgress,
        notStarted,
        completionPercentage
      });

      // If we just completed the last task, refresh the agent thoughts
      if (newStatus === 'completed' && completed === tasks.length && agentAvailable) {
        try {
          const result = await getFeatureTasksWithAgent(feature.id);
          if (result.success) {
            setAgentThoughts(result.agent_thoughts || []);
          }
        } catch (error) {
          console.warn('Error refreshing agent thoughts after task completion:', error);
        }
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
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);
      
      // Recalculate stats
      const total = updatedTasks.length;
      const completed = updatedTasks.filter(task => task.status === 'completed').length;
      const inProgress = updatedTasks.filter(task => task.status === 'in-progress').length;
      const notStarted = updatedTasks.filter(task => task.status === 'not-started').length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      setTaskStats({
        total,
        completed,
        inProgress,
        notStarted,
        completionPercentage
      });
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

  // Handle modal save
  const handleSaveTask = async (taskData) => {
    try {
      let updatedTasks;
      
      if (editingTask) {
        // Update existing task
        await updateTask(editingTask.id, taskData);
        updatedTasks = tasks.map(task => 
          task.id === editingTask.id ? { ...task, ...taskData } : task
        );
      } else {
        // Create new task
        const newTask = await createFeatureTask(feature.id, taskData);
        updatedTasks = [...tasks, newTask];
      }
      
      setTasks(updatedTasks);
      setShowModal(false);
      
      // Recalculate stats
      const total = updatedTasks.length;
      const completed = updatedTasks.filter(task => task.status === 'completed').length;
      const inProgress = updatedTasks.filter(task => task.status === 'in-progress').length;
      const notStarted = updatedTasks.filter(task => task.status === 'not-started').length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      setTaskStats({
        total,
        completed,
        inProgress,
        notStarted,
        completionPercentage
      });
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Failed to save task. Please try again.');
    }
  };

  // Generate tasks with AI
  const handleGenerateTasks = async () => {
    if (!feature || !feature.id) {
      setError('Cannot generate tasks: No feature ID provided');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Use Task Agent to generate tasks
      const result = await processFeatureWithAgent(feature.id);

      if (result.success) {
        // Reload tasks to show the newly generated ones
        if (agentAvailable) {
          const updatedResult = await getFeatureTasksWithAgent(feature.id);

          if (updatedResult.success) {
            setTasks(updatedResult.tasks);
            setTaskStats({
              total: updatedResult.completion_status.total_tasks,
              completed: updatedResult.completion_status.completed,
              inProgress: updatedResult.completion_status.in_progress,
              notStarted: updatedResult.completion_status.not_started,
              completionPercentage: updatedResult.completion_status.percent_complete
            });
            setAgentThoughts(updatedResult.agent_thoughts || []);
          }
        } else {
          // Fallback to standard API
          const taskData = await fetchFeatureTasks(feature.id);

          // Calculate stats
          const total = taskData.length;
          const completed = taskData.filter(task => task.status === 'completed').length;
          const inProgress = taskData.filter(task => task.status === 'in-progress').length;
          const notStarted = taskData.filter(task => task.status === 'not-started').length;
          const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

          setTasks(taskData);
          setTaskStats({
            total,
            completed,
            inProgress,
            notStarted,
            completionPercentage
          });
        }
      } else {
        throw new Error(result.message || 'Failed to generate tasks');
      }
    } catch (err) {
      console.error('Error generating tasks:', err);
      setError('Failed to generate tasks. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs mr-2">
            ✓
          </div>
          <h3 className="text-lg font-semibold">
            Tasks {agentAvailable && <span className="text-xs text-green-500 ml-2">(AI-powered)</span>}
          </h3>
        </div>
        <div className="flex gap-2">
          {agentAvailable && agentThoughts.length > 0 && (
            <button
              onClick={() => setShowAgentThoughts(!showAgentThoughts)}
              className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded text-sm"
            >
              {showAgentThoughts ? 'Hide AI Thoughts' : 'Show AI Thoughts'}
            </button>
          )}

          {agentAvailable && (
            <button
              onClick={handleGenerateTasks}
              disabled={generating}
              className={`${
                generating ? 'bg-gray-600' : 'bg-blue-700 hover:bg-blue-800'
              } text-white px-3 py-1 rounded text-sm flex items-center`}
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-1"></div>
                  Generating...
                </>
              ) : (
                <>Generate Tasks with AI</>
              )}
            </button>
          )}

          <button
            onClick={handleAddTask}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Agent Thoughts Collapsible Panel */}
      {showAgentThoughts && agentThoughts.length > 0 && (
        <div className="bg-[#1a2233] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 mb-4">
          <h4 className="text-md font-semibold text-purple-400 mb-2">AI Agent Thoughts</h4>
          <ul className="text-sm space-y-2">
            {agentThoughts.map((thought, index) => (
              <li key={index} className="text-gray-300 italic border-l-2 border-purple-500 pl-3">
                "{thought}"
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress indicator */}
      <div className="bg-gray-900 p-4 rounded-md mb-4">
        <div className="flex justify-between mb-2">
          <div className="text-white text-sm font-medium">Task Completion</div>
          <div className="text-white text-sm">{taskStats.completionPercentage}%</div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${taskStats.completionPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-3">
          <div className="text-sm">
            <span className="text-gray-400">Completed: </span>
            <span className="text-white">{taskStats.completed}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">In Progress: </span>
            <span className="text-white">{taskStats.inProgress}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Not Started: </span>
            <span className="text-white">{taskStats.notStarted}</span>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900 text-white p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {agentAvailable
              ? "No tasks found. Click \"Generate Tasks with AI\" to automatically create tasks, or \"Add Task\" to create one manually."
              : "No tasks found. Click \"Add Task\" to create your first task."}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
      
      {/* Task edit/create modal */}
      <TaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </div>
  );
};

TasksTab.propTypes = {
  feature: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired
};

export default TasksTab;