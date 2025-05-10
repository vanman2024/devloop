import React, { useState, useEffect } from 'react';

const IssueTracker = () => {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    category: 'all',
    status: 'all',
    search: ''
  });
  const [fixInProgress, setFixInProgress] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState([]);

  // Fetch issues data
  const fetchIssues = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      setIssues([
        {
          id: 'issue-001',
          title: 'Missing required field: type',
          description: 'Memory file is missing the required type field',
          path: '/mnt/c/Users/angel/Devloop/features/feature-123/memory.json',
          severity: 'critical',
          category: 'memory',
          status: 'open',
          created: '2025-04-22T10:30:00Z',
          fix: 'Add the type field to the memory file',
          possibleFix: true
        },
        {
          id: 'issue-002',
          title: 'Field status has invalid value: pending',
          description: 'Status field contains an invalid value that is not in allowed list',
          path: '/mnt/c/Users/angel/Devloop/features/feature-123/memory.json',
          severity: 'warning',
          category: 'memory',
          status: 'open',
          created: '2025-04-22T10:30:00Z',
          fix: 'Change status to one of the allowed values: not-started, in-progress, blocked, completed, failed',
          possibleFix: true
        },
        {
          id: 'issue-003',
          title: 'Feature references non-existent module',
          description: 'Feature references module-api-integration which does not exist',
          path: '/mnt/c/Users/angel/Devloop/features/feature-1023/feature-1023.md',
          severity: 'critical',
          category: 'structure',
          status: 'open',
          created: '2025-04-23T14:15:00Z',
          fix: 'Update reference to use an existing module or create the missing module',
          possibleFix: true
        },
        {
          id: 'issue-004',
          title: 'Duplicate feature ID detected',
          description: 'Feature ID feature-2033 exists in multiple locations',
          path: 'Multiple locations',
          severity: 'critical',
          category: 'structure',
          status: 'open',
          created: '2025-04-23T16:20:00Z',
          fix: 'Rename one of the duplicates to use a unique ID',
          possibleFix: true
        },
        {
          id: 'issue-005',
          title: 'Orphaned feature detected',
          description: 'Feature exists but is not registered in the feature registry',
          path: '/mnt/c/Users/angel/Devloop/features/feature-1078/feature-1078.md',
          severity: 'warning',
          category: 'structure',
          status: 'open',
          created: '2025-04-24T09:10:00Z',
          fix: 'Register feature in the feature registry or remove the orphaned files',
          possibleFix: true
        },
        {
          id: 'issue-006',
          title: 'Outdated package dependency: react',
          description: 'Package react is using version 17.0.2 while latest is 18.2.0',
          path: '/mnt/c/Users/angel/Devloop/package.json',
          severity: 'warning',
          category: 'dependencies',
          status: 'open',
          created: '2025-04-24T11:45:00Z',
          fix: 'Update package to latest version using npm update react',
          possibleFix: true
        },
        {
          id: 'issue-007',
          title: 'Vulnerable package detected: node-fetch',
          description: 'Package node-fetch has known high severity vulnerability (CVE-2022-0235)',
          path: '/mnt/c/Users/angel/Devloop/package.json',
          severity: 'critical',
          category: 'dependencies',
          status: 'open',
          created: '2025-04-24T11:46:00Z',
          fix: 'Update package to patched version using npm update node-fetch',
          possibleFix: true
        },
        {
          id: 'issue-008',
          title: 'Feature missing test files',
          description: 'Feature is missing required test files in test directory',
          path: '/mnt/c/Users/angel/Devloop/features/feature-2045/feature-2045.md',
          severity: 'warning',
          category: 'tests',
          status: 'open',
          created: '2025-04-25T08:30:00Z',
          fix: 'Create test files for feature functionality',
          possibleFix: false
        },
        {
          id: 'issue-009',
          title: 'Test failed: Authentication Tests',
          description: 'Authentication test suite is failing 3 out of 12 tests',
          path: '/mnt/c/Users/angel/Devloop/features/feature-1023/test/',
          severity: 'critical',
          category: 'tests',
          status: 'open',
          created: '2025-04-25T10:15:00Z',
          fix: 'Fix failing authentication tests (see test logs for details)',
          possibleFix: false
        },
        {
          id: 'issue-010',
          title: 'Memory file exceeds size threshold',
          description: 'Memory file is 4.2MB, which exceeds the 3MB recommendation',
          path: '/mnt/c/Users/angel/Devloop/modules/module-user-management/memory.json',
          severity: 'warning',
          category: 'memory',
          status: 'fixed',
          created: '2025-04-20T15:30:00Z',
          fix: 'Optimize memory file by removing unused data',
          possibleFix: true
        }
      ]);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Handle fixing an issue
  const handleFixIssue = async (issueId) => {
    setFixInProgress(true);
    try {
      // In a real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update the issue status to fixed
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: 'fixed' } : issue
      ));
      
      // If this was the selected issue, update it too
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => ({ ...prev, status: 'fixed' }));
      }
    } catch (error) {
      console.error('Error fixing issue:', error);
    } finally {
      setFixInProgress(false);
    }
  };

  // Handle fixing multiple issues
  const handleFixSelected = async () => {
    setFixInProgress(true);
    try {
      // In a real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update all selected issues to fixed
      setIssues(prev => prev.map(issue => 
        selectedIssues.includes(issue.id) ? { ...issue, status: 'fixed' } : issue
      ));
      
      // Clear selection
      setSelectedIssues([]);
    } catch (error) {
      console.error('Error fixing issues:', error);
    } finally {
      setFixInProgress(false);
    }
  };

  // Toggle issue selection
  const toggleIssueSelection = (issueId) => {
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  // Handle selecting all issues
  const handleSelectAll = () => {
    if (selectedIssues.length === filteredIssues.length) {
      setSelectedIssues([]);
    } else {
      setSelectedIssues(filteredIssues.map(issue => issue.id));
    }
  };

  // Filter issues based on current filters
  const filteredIssues = issues.filter(issue => {
    if (filters.severity !== 'all' && issue.severity !== filters.severity) return false;
    if (filters.category !== 'all' && issue.category !== filters.category) return false;
    if (filters.status !== 'all' && issue.status !== filters.status) return false;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        issue.title.toLowerCase().includes(searchLower) ||
        issue.description.toLowerCase().includes(searchLower) ||
        issue.path.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to get severity badge color
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'info':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Helper function to get category badge color
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'memory':
        return 'bg-purple-500/20 text-purple-400';
      case 'structure':
        return 'bg-blue-500/20 text-blue-400';
      case 'dependencies':
        return 'bg-orange-500/20 text-orange-400';
      case 'tests':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Helper function to get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'fixed':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Issue Tracker</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={fetchIssues}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Issues'}
        </button>
      </div>
      
      <div className="p-4">
        {loading && issues.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Loading issues...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Filters and Issue List */}
            <div className="lg:col-span-2">
              {/* Filters */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="flex flex-wrap gap-2 md:gap-4">
                  {/* Search */}
                  <div className="flex-grow mb-2 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search issues..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                  
                  {/* Severity Filter */}
                  <div className="mb-2">
                    <select
                      className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                      value={filters.severity}
                      onChange={(e) => handleFilterChange('severity', e.target.value)}
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                  
                  {/* Category Filter */}
                  <div className="mb-2">
                    <select
                      className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="memory">Memory</option>
                      <option value="structure">Structure</option>
                      <option value="dependencies">Dependencies</option>
                      <option value="tests">Tests</option>
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="mb-2">
                    <select
                      className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                </div>
                
                {/* Batch Actions */}
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <span className="text-gray-400 text-sm">
                      Showing {filteredIssues.length} of {issues.length} issues
                    </span>
                  </div>
                  
                  {selectedIssues.length > 0 && (
                    <button
                      className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm flex items-center"
                      onClick={handleFixSelected}
                      disabled={fixInProgress}
                    >
                      {fixInProgress ? 'Fixing...' : `Fix Selected (${selectedIssues.length})`}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Issue List */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="py-2 px-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIssues.length === filteredIssues.length && filteredIssues.length > 0}
                            onChange={handleSelectAll}
                            className="rounded bg-gray-700 border-gray-600"
                          />
                        </th>
                        <th className="py-2 px-3 text-left">Issue</th>
                        <th className="py-2 px-3 text-left whitespace-nowrap">Severity</th>
                        <th className="py-2 px-3 text-left whitespace-nowrap">Category</th>
                        <th className="py-2 px-3 text-left whitespace-nowrap">Status</th>
                        <th className="py-2 px-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredIssues.length > 0 ? (
                        filteredIssues.map((issue) => (
                          <tr 
                            key={issue.id} 
                            className={`hover:bg-gray-800 cursor-pointer ${selectedIssue?.id === issue.id ? 'bg-gray-800' : ''}`}
                            onClick={() => setSelectedIssue(issue)}
                          >
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={selectedIssues.includes(issue.id)}
                                onChange={() => toggleIssueSelection(issue.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded bg-gray-700 border-gray-600"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-medium">{issue.title}</div>
                              <div className="text-xs text-gray-400 truncate max-w-[250px]">{issue.path}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getSeverityBadgeClass(issue.severity)}`}>
                                {issue.severity}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getCategoryBadgeClass(issue.category)}`}>
                                {issue.category}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(issue.status)}`}>
                                {issue.status}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {issue.status !== 'fixed' && issue.possibleFix && (
                                <button
                                  className="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFixIssue(issue.id);
                                  }}
                                  disabled={fixInProgress}
                                >
                                  {fixInProgress && selectedIssue?.id === issue.id ? 'Fixing...' : 'Fix'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-gray-400">
                            {issues.length > 0 
                              ? 'No issues match your filters' 
                              : 'No issues found. System is healthy!'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Issue Details */}
            <div className="lg:col-span-1">
              {selectedIssue ? (
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="mb-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-medium">{selectedIssue.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${getSeverityBadgeClass(selectedIssue.severity)}`}>
                        {selectedIssue.severity}
                      </span>
                    </div>
                    <div className="mt-2 mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getCategoryBadgeClass(selectedIssue.category)}`}>
                        {selectedIssue.category}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedIssue.status)}`}>
                        {selectedIssue.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-gray-400">Description:</div>
                      <div className="mt-1">{selectedIssue.description}</div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Path:</div>
                      <div className="mt-1 font-mono text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                        {selectedIssue.path}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Created:</div>
                      <div className="mt-1">
                        {new Date(selectedIssue.created).toLocaleString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Recommended Fix:</div>
                      <div className="mt-1 bg-gray-800 p-2 rounded">
                        {selectedIssue.fix}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    {selectedIssue.status !== 'fixed' && selectedIssue.possibleFix && (
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded text-sm flex-grow"
                        onClick={() => handleFixIssue(selectedIssue.id)}
                        disabled={fixInProgress}
                      >
                        {fixInProgress ? 'Fixing...' : 'Apply Fix'}
                      </button>
                    )}
                    
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm flex-grow"
                      onClick={() => window.alert(`Opening file: ${selectedIssue.path}`)}
                    >
                      Open File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <p className="text-gray-400">Select an issue to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueTracker;