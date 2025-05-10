import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const EnhancedHomeDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Modal states for Quick Actions
  const [showHealthCheckModal, setShowHealthCheckModal] = useState(false);
  const [showFixIssuesModal, setShowFixIssuesModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    activeFeatures: 12,
    completedFeatures: 8,
    milestones: 4,
    completionRate: 67,
    pendingEnhancements: 7,
    pendingIssues: 3,
    healthScore: 78,
    recentActivity: [
      { time: 'Today, 10:45 AM', content: 'Feature "Model Initialization" marked as completed', type: 'success' },
      { time: 'Yesterday, 3:30 PM', content: 'Enhancement "Improved Error Handling" added to Feature "Mini Loop Tests"', type: 'info' },
      { time: 'Yesterday, 11:15 AM', content: 'Status of Feature "Workflow Orchestration" changed to Pending', type: 'warning' }
    ],
    upcomingTasks: [
      { title: 'Complete Configuration Manager', due: 'Due in 2 days', priority: 'high' },
      { title: 'Review Inference Engine Tests', due: 'Due tomorrow', priority: 'critical' },
      { title: 'Update Documentation for Status Normalization', due: 'Due in 3 days', priority: 'normal' }
    ],
    systemHealth: {
      structure: 92,
      memory: 95,
      orphans: 68,
      dependencies: 75,
      permissions: 100,
      core: 96,
      tests: 82
    }
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // No changes for demo
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper functions for styling
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-yellow-500 text-white';
      case 'normal':
        return 'bg-gray-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getActivityBorder = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'error':
        return 'border-red-500';
      case 'info':
      default:
        return 'border-blue-500';
    }
  };

  const getHealthColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-2" id="home-dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button 
          onClick={fetchDashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : 'Refresh Dashboard'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-400">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-1">Active Features</div>
              <div className="text-4xl font-bold">{dashboardData.activeFeatures}</div>
              <div className="mt-2 text-xs text-green-400">+3 this month</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-1">Completion Rate</div>
              <div className="text-4xl font-bold text-blue-400">{dashboardData.completionRate}%</div>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-blue-600" 
                  style={{ width: `${dashboardData.completionRate}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-1">System Health</div>
              <div className="text-4xl font-bold text-green-400">{dashboardData.healthScore}</div>
              <div className="flex items-center mt-2 text-xs">
                <span className="text-green-400 mr-1">↗</span>
                <span>Improving</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-1">Pending Issues</div>
              <div className="text-4xl font-bold text-yellow-400">{dashboardData.pendingIssues}</div>
              <div className="mt-2 text-xs text-blue-400">View all issues</div>
            </div>
          </div>
          
          {/* System Status and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* System Health & Status */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h2 className="text-lg font-medium mb-4">System Status</h2>
              
              {/* Health Categories */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {Object.entries(dashboardData.systemHealth).map(([category, score]) => (
                  <div 
                    key={category} 
                    className="bg-gray-900 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => navigate('/system-health', { state: { activeTab: category } })}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm capitalize">{category}</div>
                      <div className="px-2 py-1 rounded-full text-xs text-white" style={{
                        backgroundColor: score >= 90 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'
                      }}>
                        {score}%
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${getHealthColor(score)}`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-sm"
                    onClick={() => setShowHealthCheckModal(true)}
                  >
                    Run Health Check
                  </button>
                  <button 
                    className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-2 rounded text-sm"
                    onClick={() => setShowFixIssuesModal(true)}
                  >
                    Fix Issues
                  </button>
                  <button 
                    className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-2 rounded text-sm"
                    onClick={() => setShowReportsModal(true)}
                  >
                    View Reports
                  </button>
                  <button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2 rounded text-sm"
                    onClick={() => setShowSettingsModal(true)}
                  >
                    System Settings
                  </button>
                </div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className={`border-l-4 ${getActivityBorder(activity.type)} pl-3 py-1`}>
                    <div className="text-xs text-gray-400">{activity.time}</div>
                    <div className="text-sm mt-1">{activity.content}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link to="/activity-center" className="text-blue-400 hover:text-blue-300 text-sm">
                  View All Activity
                </Link>
              </div>
            </div>
          </div>
          
          {/* Tasks and Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Tasks */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h2 className="text-lg font-medium mb-4">Upcoming Tasks</h2>
              <div className="space-y-3">
                {dashboardData.upcomingTasks.map((task, index) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-3 hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-gray-400 mt-1">{task.due}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadge(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between">
                <Link to="/activity-center" className="text-blue-400 hover:text-blue-300 text-sm">
                  View All Tasks
                </Link>
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
                  onClick={() => setShowAddTaskModal(true)}
                >
                  Add Task
                </button>
              </div>
            </div>
            
            {/* Features Status */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h2 className="text-lg font-medium mb-4">Feature Progress</h2>
              <div className="flex items-center justify-center space-x-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{dashboardData.completedFeatures}</div>
                  <div className="text-xs text-gray-400 mt-1">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {dashboardData.activeFeatures - dashboardData.completedFeatures}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{dashboardData.pendingEnhancements}</div>
                  <div className="text-xs text-gray-400 mt-1">Enhancements</div>
                </div>
              </div>
              
              <div className="relative pt-1">
                <div className="text-sm text-gray-400 mb-1">Overall Completion</div>
                <div className="flex mb-2 items-center justify-between">
                  <div className="text-xs text-green-400 font-semibold">
                    {dashboardData.completionRate}% Complete
                  </div>
                  <div className="text-xs text-gray-400">
                    {dashboardData.completedFeatures}/{dashboardData.activeFeatures} Features
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                  <div style={{ width: `${dashboardData.completionRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                  onClick={() => navigate('/features')}
                >
                  Manage Features
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Modals */}
          {showHealthCheckModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Run Health Check</h2>
                  <button onClick={() => setShowHealthCheckModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">Run a comprehensive health check on your system to identify and report potential issues.</p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input type="checkbox" id="check-structure" className="mr-2" defaultChecked />
                      <label htmlFor="check-structure">Project Structure (92%)</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="check-memory" className="mr-2" defaultChecked />
                      <label htmlFor="check-memory">Memory System (95%)</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="check-orphans" className="mr-2" defaultChecked />
                      <label htmlFor="check-orphans">Orphaned Resources (68%)</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="check-dependencies" className="mr-2" defaultChecked />
                      <label htmlFor="check-dependencies">Dependencies (75%)</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="check-core" className="mr-2" defaultChecked />
                      <label htmlFor="check-core">Core Services (96%)</label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowHealthCheckModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowHealthCheckModal(false);
                      // Here you would normally run the health check
                      console.log('Running health check...');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    Run Health Check
                  </button>
                </div>
              </div>
            </div>
          )}

          {showFixIssuesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Fix Issues</h2>
                  <button onClick={() => setShowFixIssuesModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">The following issues have been detected in your system. Select the ones you want to fix:</p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input type="checkbox" id="fix-orphans" className="mr-2" defaultChecked />
                      <label htmlFor="fix-orphans" className="text-yellow-400">3 Orphaned Resources Detected</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="fix-dependencies" className="mr-2" defaultChecked />
                      <label htmlFor="fix-dependencies" className="text-yellow-400">2 Dependency Issues Found</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="fix-tests" className="mr-2" defaultChecked />
                      <label htmlFor="fix-tests" className="text-red-400">1 Failed Test Repair</label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowFixIssuesModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowFixIssuesModal(false);
                      // Here you would normally fix the issues
                      console.log('Fixing selected issues...');
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                  >
                    Fix Selected Issues
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReportsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-xl w-full mx-4 shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">View Reports</h2>
                  <button onClick={() => setShowReportsModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">Select a report to view:</p>
                  <div className="space-y-3">
                    <div className="bg-gray-700 p-3 rounded hover:bg-gray-600 cursor-pointer transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">System Health Report</div>
                        <span className="text-xs text-gray-400">Generated today</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Comprehensive overview of system health metrics</div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded hover:bg-gray-600 cursor-pointer transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Feature Progress Report</div>
                        <span className="text-xs text-gray-400">Generated yesterday</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Detailed breakdown of feature completion status</div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded hover:bg-gray-600 cursor-pointer transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Performance Analysis</div>
                        <span className="text-xs text-gray-400">Generated 3 days ago</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Performance metrics and optimization recommendations</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <button 
                    onClick={() => setShowReportsModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      setShowReportsModal(false);
                      navigate('/activity-center', { state: { view: 'reports' } });
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
                  >
                    View All Reports
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">System Settings</h2>
                  <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">Manage core system settings:</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Auto Health Checks</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Notification Level</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                        <option>All</option>
                        <option>Critical Only</option>
                        <option>Warnings & Critical</option>
                        <option>None</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="auto-fix" className="mr-2" />
                      <label htmlFor="auto-fix">Auto-fix non-critical issues</label>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" id="detailed-logs" className="mr-2" defaultChecked />
                      <label htmlFor="detailed-logs">Keep detailed logs</label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowSettingsModal(false);
                      // Here you would normally save the settings
                      console.log('Saving settings...');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAddTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Add Task</h2>
                  <button onClick={() => setShowAddTaskModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Task Title</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        placeholder="Enter task title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                      <textarea 
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                        rows={3}
                        placeholder="Enter task description"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                        <option>Normal</option>
                        <option>High</option>
                        <option>Critical</option>
                        <option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Related Feature</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                        <option>Select a feature</option>
                        <option>Model Initialization</option>
                        <option>Error Handling</option>
                        <option>Workflow Orchestration</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowAddTaskModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddTaskModal(false);
                      // Here you would normally add the task
                      console.log('Adding new task...');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedHomeDashboard;