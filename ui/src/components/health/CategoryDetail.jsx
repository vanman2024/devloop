import React, { useState, useEffect } from 'react';

const CategoryDetail = ({ category, score, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [categoryData, setCategoryData] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  
  // Define mock data for different categories
  const mockCategoryData = {
    structure: {
      name: 'Structure Health',
      score: 92,
      description: 'Structure health measures the architectural integrity of your system, including proper relationships between milestones, phases, modules, and features.',
      metrics: [
        { name: 'Feature Registry Accuracy', score: 95, description: 'How accurately features are registered in the system' },
        { name: 'Orphaned Features', score: 87, description: 'Features not properly connected to the system hierarchy' },
        { name: 'Relationship Integrity', score: 94, description: 'Proper parent-child relationships between components' },
        { name: 'ID Uniqueness', score: 100, description: 'Uniqueness of IDs across all components' },
        { name: 'Structure Compliance', score: 91, description: 'Adherence to defined structural patterns' }
      ],
      issues: [
        { 
          id: 'issue-001', 
          title: 'Broken Links Between Components', 
          severity: 'medium',
          count: 2,
          description: 'Found 2 instances where features reference non-existent modules',
          affectedItems: ['feature-1023', 'feature-1045'],
          fixCommand: 'python3 system-core/scripts/maintenance/fix-broken-links.py'
        },
        { 
          id: 'issue-002', 
          title: 'Orphaned Features', 
          severity: 'low',
          count: 26,
          description: '26 features exist in the filesystem but are not registered',
          affectedItems: ['feature-1078', 'feature-2055', '24 more...'],
          fixCommand: 'python3 system-core/scripts/maintenance/register-orphaned-features.py'
        }
      ],
      history: [
        { date: '2025-04-15', score: 88 },
        { date: '2025-04-17', score: 90 },
        { date: '2025-04-19', score: 91 },
        { date: '2025-04-21', score: 92 },
        { date: '2025-04-23', score: 92 }
      ]
    },
    memory: {
      name: 'Memory Health',
      score: 95,
      description: 'Memory health measures the integrity and efficiency of memory files across the system, including schema compliance, size optimization, and data quality.',
      metrics: [
        { name: 'Schema Compliance', score: 98, description: 'Adherence to defined memory schemas' },
        { name: 'File Size Optimization', score: 92, description: 'Efficiency of memory file storage' },
        { name: 'Data Integrity', score: 97, description: 'Consistency and validity of stored data' },
        { name: 'Reference Integrity', score: 94, description: 'Integrity of cross-references between memory files' },
        { name: 'Update Frequency', score: 96, description: 'How frequently memory files are kept up to date' }
      ],
      issues: [
        { 
          id: 'issue-003', 
          title: 'Memory File Size Exceeds Threshold', 
          severity: 'low',
          count: 3,
          description: '3 memory files are larger than the 3MB recommended size',
          affectedItems: ['module-user-management/memory.json', 'module-analytics/memory.json', 'module-data-sync/memory.json'],
          fixCommand: 'python3 system-core/scripts/maintenance/optimize-memory-files.py'
        }
      ],
      history: [
        { date: '2025-04-15', score: 94 },
        { date: '2025-04-17', score: 94 },
        { date: '2025-04-19', score: 95 },
        { date: '2025-04-21', score: 95 },
        { date: '2025-04-23', score: 95 }
      ]
    },
    orphans: {
      name: 'Orphan Health',
      score: 68,
      description: 'Orphan health measures how well components are connected to the main system structure, identifying isolated or disconnected elements.',
      metrics: [
        { name: 'Feature Registration', score: 65, description: 'Features properly registered in memory files' },
        { name: 'Module Linking', score: 78, description: 'Modules correctly linked to phases' },
        { name: 'Milestone Integrity', score: 95, description: 'Milestones properly structured in the system' },
        { name: 'Reference Completeness', score: 72, description: 'Components having complete references' },
        { name: 'Orphan Reduction', score: 60, description: 'Progress in reducing orphaned elements' }
      ],
      issues: [
        { 
          id: 'issue-004', 
          title: 'Orphaned Features', 
          severity: 'medium',
          count: 26,
          description: '26 features exist in filesystem but are not registered',
          affectedItems: ['feature-1078', 'feature-2055', '24 more...'],
          fixCommand: 'python3 system-core/scripts/maintenance/register-orphaned-features.py'
        },
        { 
          id: 'issue-005', 
          title: 'Modules Without Phases', 
          severity: 'medium',
          count: 3,
          description: '3 modules are not properly assigned to phases',
          affectedItems: ['module-reports', 'module-external-api', 'module-legacy-users'],
          fixCommand: 'python3 system-core/scripts/maintenance/assign-modules-to-phases.py'
        }
      ],
      history: [
        { date: '2025-04-15', score: 62 },
        { date: '2025-04-17', score: 64 },
        { date: '2025-04-19', score: 65 },
        { date: '2025-04-21', score: 67 },
        { date: '2025-04-23', score: 68 }
      ]
    },
    dependencies: {
      name: 'Dependency Health',
      score: 75,
      description: 'Dependency health measures the state of package and feature dependencies, identifying outdated, vulnerable, or problematic dependencies.',
      metrics: [
        { name: 'Package Freshness', score: 68, description: 'How up-to-date package dependencies are' },
        { name: 'Security Status', score: 82, description: 'Freedom from known security vulnerabilities' },
        { name: 'Circular Dependencies', score: 95, description: 'Absence of circular dependency chains' },
        { name: 'Feature Dependencies', score: 78, description: 'Clean and clear feature dependency relationships' },
        { name: 'Dependency Drift', score: 74, description: 'Consistency of dependencies across the system' }
      ],
      issues: [
        { 
          id: 'issue-006', 
          title: 'Outdated Package Dependencies', 
          severity: 'medium',
          count: 3,
          description: '3 packages are significantly behind their latest versions',
          affectedItems: ['react (17.0.2 → 18.2.0)', 'tailwindcss (2.2.19 → 3.3.2)', '@babel/core (7.16.0 → 7.21.4)'],
          fixCommand: 'npm update react tailwindcss @babel/core'
        },
        { 
          id: 'issue-007', 
          title: 'Security Vulnerabilities', 
          severity: 'high',
          count: 2,
          description: '2 packages have known security vulnerabilities',
          affectedItems: ['node-fetch (CVE-2022-0235)', 'postcss (CVE-2023-44270)'],
          fixCommand: 'npm audit fix'
        },
        { 
          id: 'issue-008', 
          title: 'Feature Dependency Blocking', 
          severity: 'high',
          count: 1,
          description: 'A failing feature is blocking multiple dependent features',
          affectedItems: ['feature-1023 (blocking 3 dependencies)'],
          fixCommand: 'python3 system-core/scripts/maintenance/fix-failing-tests.py --feature=1023'
        }
      ],
      history: [
        { date: '2025-04-15', score: 70 },
        { date: '2025-04-17', score: 72 },
        { date: '2025-04-19', score: 73 },
        { date: '2025-04-21', score: 73 },
        { date: '2025-04-23', score: 75 }
      ]
    },
    permissions: {
      name: 'Permissions Health',
      score: 100,
      description: 'Permissions health measures file system permissions, access controls, and security-related configuration across the system.',
      metrics: [
        { name: 'Script Executability', score: 100, description: 'Proper executable permissions on script files' },
        { name: 'File Access Control', score: 100, description: 'Appropriate access restrictions on sensitive files' },
        { name: 'Ownership Structure', score: 100, description: 'Correct ownership of files and directories' },
        { name: 'Permission Consistency', score: 100, description: 'Consistency of permissions across similar files' },
        { name: 'Security Configuration', score: 100, description: 'Security-related configuration settings' }
      ],
      issues: [],
      history: [
        { date: '2025-04-15', score: 92 },
        { date: '2025-04-17', score: 95 },
        { date: '2025-04-19', score: 100 },
        { date: '2025-04-21', score: 100 },
        { date: '2025-04-23', score: 100 }
      ]
    },
    core: {
      name: 'Core Health',
      score: 96,
      description: 'Core health measures the integrity and performance of core system functions, scripts, and essential components.',
      metrics: [
        { name: 'Core Script Integrity', score: 98, description: 'Functionality of critical system scripts' },
        { name: 'System Performance', score: 93, description: 'Performance metrics for core operations' },
        { name: 'Error Handling', score: 95, description: 'How well the system handles and reports errors' },
        { name: 'Resource Efficiency', score: 97, description: 'Efficient use of system resources' },
        { name: 'API Stability', score: 95, description: 'Stability of core API interfaces' }
      ],
      issues: [
        { 
          id: 'issue-009', 
          title: 'Slow Script Performance', 
          severity: 'low',
          count: 1,
          description: 'One core script is running slower than expected benchmarks',
          affectedItems: ['system-core/scripts/maintenance/optimize-memory-files.py'],
          fixCommand: 'python3 system-core/scripts/maintenance/profile-script.py --script=optimize-memory-files.py'
        }
      ],
      history: [
        { date: '2025-04-15', score: 94 },
        { date: '2025-04-17', score: 95 },
        { date: '2025-04-19', score: 95 },
        { date: '2025-04-21', score: 96 },
        { date: '2025-04-23', score: 96 }
      ]
    },
    tests: {
      name: 'Test Health',
      score: 82,
      description: 'Test health measures the coverage, quality, and passing status of tests throughout the system.',
      metrics: [
        { name: 'Test Coverage', score: 78, description: 'Percentage of code covered by tests' },
        { name: 'Test Pass Rate', score: 85, description: 'Percentage of tests that pass successfully' },
        { name: 'Critical Coverage', score: 72, description: 'Test coverage of critical system components' },
        { name: 'Test Quality', score: 88, description: 'Quality and effectiveness of test cases' },
        { name: 'Test Maintenance', score: 90, description: 'How well tests are maintained and updated' }
      ],
      issues: [
        { 
          id: 'issue-010', 
          title: 'Low Test Coverage', 
          severity: 'medium',
          count: 4,
          description: '4 critical modules have test coverage below 60%',
          affectedItems: ['module-auth (54%)', 'module-payment (48%)', 'module-security (52%)', 'module-api (57%)'],
          fixCommand: 'python3 system-core/scripts/maintenance/generate-test-templates.py --min-coverage=60'
        },
        { 
          id: 'issue-011', 
          title: 'Failing Tests', 
          severity: 'high',
          count: 3,
          description: '3 features have failing tests that need attention',
          affectedItems: ['feature-1023', 'feature-2045', 'module-payment'],
          fixCommand: 'python3 system-core/scripts/maintenance/run-test-fixes.py'
        }
      ],
      history: [
        { date: '2025-04-15', score: 76 },
        { date: '2025-04-17', score: 78 },
        { date: '2025-04-19', score: 80 },
        { date: '2025-04-21', score: 81 },
        { date: '2025-04-23', score: 82 }
      ]
    }
  };

  // Fetch category data
  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use mock data based on requested category
      if (mockCategoryData[category]) {
        setCategoryData(mockCategoryData[category]);
      } else {
        console.error(`No data available for category: ${category}`);
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [category]);

  // Helper function to get score color class
  const getScoreColorClass = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Helper function to get score background color class
  const getScoreBgClass = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Helper function to get severity badge class
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400';
      case 'high':
        return 'bg-orange-500/20 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">{categoryData?.name || 'Category Health'} Details</h3>
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
          onClick={onClose}
        >
          Back to Overview
        </button>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Loading category data...</p>
          </div>
        ) : categoryData ? (
          <div className="space-y-6">
            {/* Category Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Health Score Card */}
              <div className="bg-gray-900 rounded-lg p-4 flex flex-col items-center">
                <h4 className="text-lg font-medium mb-3">Health Score</h4>
                <div className={`text-5xl font-bold mb-3 ${getScoreColorClass(categoryData.score)}`}>
                  {categoryData.score}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                  <div 
                    className={`h-2.5 rounded-full ${getScoreBgClass(categoryData.score)}`} 
                    style={{ width: `${categoryData.score}%` }}
                  ></div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                  {categoryData.score >= 90 ? 'Excellent' : 
                   categoryData.score >= 80 ? 'Good' :
                   categoryData.score >= 70 ? 'Fair' :
                   categoryData.score >= 60 ? 'Needs Improvement' :
                   'Critical'}
                </div>
              </div>
              
              {/* Category Description */}
              <div className="md:col-span-2 bg-gray-900 rounded-lg p-4">
                <h4 className="text-lg font-medium mb-3">About {categoryData.name}</h4>
                <p className="text-gray-300">{categoryData.description}</p>
                
                {/* Issues Summary */}
                <div className="mt-4">
                  {categoryData.issues.length > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-red-400 font-medium">{categoryData.issues.length} {categoryData.issues.length === 1 ? 'issue' : 'issues'}</span> detected
                      </div>
                      <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded">
                        Fix All Issues
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-green-400">No issues detected! 🎉</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Category Metrics */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-medium mb-4">Key Metrics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryData.metrics.map((metric, index) => (
                  <div key={index} className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{metric.name}</div>
                      <div className={`${getScoreColorClass(metric.score)}`}>{metric.score}%</div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                      <div 
                        className={`h-1.5 rounded-full ${getScoreBgClass(metric.score)}`} 
                        style={{ width: `${metric.score}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400">{metric.description}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Issues */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="text-lg font-medium mb-4">Issues ({categoryData.issues.length})</h4>
              
              {categoryData.issues.length > 0 ? (
                <div className="space-y-4">
                  {categoryData.issues.map((issue, index) => (
                    <div 
                      key={index} 
                      className={`bg-gray-800 p-3 rounded-lg border-l-4 ${
                        issue.severity === 'critical' ? 'border-red-500' :
                        issue.severity === 'high' ? 'border-orange-500' :
                        issue.severity === 'medium' ? 'border-yellow-500' :
                        'border-blue-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{issue.title}</div>
                          <div className="text-sm text-gray-400 mt-1">{issue.description}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityBadgeClass(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-xs text-gray-400 mb-1">Affected Items:</div>
                        <div className="flex flex-wrap gap-1">
                          {issue.affectedItems.map((item, idx) => (
                            <span key={idx} className="bg-gray-700 px-2 py-0.5 rounded text-xs">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {issue.fixCommand && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-400 mb-1">Fix Command:</div>
                          <div className="bg-gray-900 p-2 rounded font-mono text-xs">
                            {issue.fixCommand}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 flex gap-2">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs">
                          View Details
                        </button>
                        <button className="bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs">
                          Fix Issue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-500/10 text-green-400 p-4 rounded-md text-center">
                  <p className="font-medium">No issues detected! 🎉</p>
                  <p className="text-sm mt-1">This category is in excellent health.</p>
                </div>
              )}
            </div>
            
            {/* Historical Trend */}
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium">Historical Trend</h4>
                <select 
                  className="bg-gray-800 border-0 text-sm rounded-md px-2 py-1"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                </select>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="h-48 relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                    <span>100</span>
                    <span>75</span>
                    <span>50</span>
                    <span>25</span>
                    <span>0</span>
                  </div>
                  
                  {/* Chart visualization */}
                  <div className="absolute inset-0 pl-8 flex items-end">
                    {categoryData.history.map((point, index) => (
                      <div 
                        key={index}
                        className="h-full flex-1 flex flex-col justify-end mx-0.5"
                        title={`${point.date}: ${point.score}`}
                      >
                        <div 
                          className={`rounded-t w-full ${getScoreBgClass(point.score)}`}
                          style={{ height: `${point.score}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* X-axis labels */}
                <div className="mt-2 pl-8 flex justify-between">
                  <div className="flex w-full text-xs text-gray-500">
                    {categoryData.history.map((point, index) => (
                      <div key={index} className="flex-1 text-center">
                        {formatDate(point.date)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-400">
                <p>
                  <strong>Trend Analysis:</strong> {categoryData.name} score has 
                  {categoryData.history[categoryData.history.length - 1].score > categoryData.history[0].score ? 
                    ' improved' : 
                    categoryData.history[categoryData.history.length - 1].score < categoryData.history[0].score ?
                    ' declined' : 
                    ' remained stable'} 
                  over the period, with a 
                  {Math.abs(categoryData.history[categoryData.history.length - 1].score - categoryData.history[0].score)}% 
                  {categoryData.history[categoryData.history.length - 1].score >= categoryData.history[0].score ? 
                    ' increase' : ' decrease'}.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 p-6 rounded-lg text-center">
            <p className="text-gray-400">No data available for this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDetail;