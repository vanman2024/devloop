import React, { useState, useEffect } from 'react';

const AllRecommendations = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [filters, setFilters] = useState({
    category: 'all',
    impact: 'all'
  });
  const [selectedRec, setSelectedRec] = useState(null);
  const [implementingRec, setImplementingRec] = useState(null);

  // Fetch recommendations data
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setRecommendations([
        {
          id: 'rec-001',
          category: 'archive',
          title: 'Archive Inactive Features',
          description: 'Consider archiving these 8 features that haven\'t been touched in 60+ days',
          confidence: 'high',
          impact: 'medium',
          implementation: 'easy',
          items: [
            { id: 'feature-1045', name: 'Legacy API Integration', lastUpdated: '63 days ago' },
            { id: 'feature-2033', name: 'Old Authentication Flow', lastUpdated: '78 days ago' },
            { id: 'feature-3021', name: 'Deprecated Data Export', lastUpdated: '92 days ago' },
            { id: 'feature-1087', name: 'User Profile Legacy', lastUpdated: '65 days ago' },
            { id: 'feature-2099', name: 'Old Settings Panel', lastUpdated: '85 days ago' },
            { id: 'feature-3045', name: 'Legacy Dashboard Widgets', lastUpdated: '110 days ago' },
            { id: 'feature-1056', name: 'Old Notification System', lastUpdated: '68 days ago' },
            { id: 'feature-4012', name: 'Legacy Theme Settings', lastUpdated: '72 days ago' }
          ],
          action: {
            type: 'script',
            command: './system-core/scripts/maintenance/archive-inactive-features.sh --days=60'
          },
          reasoning: 'These features have not been updated in over 60 days and are no longer referenced by any active components. Archiving them will reduce system complexity while preserving their content for future reference.',
          benefits: 'Reduces system complexity, decreases memory file sizes, and improves build times. Estimated 5% improvement in system health score.'
        },
        {
          id: 'rec-002',
          category: 'fix',
          title: 'Fix Failing Tests',
          description: 'Feature 1023 is failing tests and blocking 3 dependent modules',
          confidence: 'high',
          impact: 'critical',
          implementation: 'medium',
          items: [
            { id: 'feature-1023', name: 'Core Authentication', status: 'failing', deps: 3 }
          ],
          action: {
            type: 'navigate',
            path: '/features/feature-1023/tests'
          },
          reasoning: 'The core authentication feature has 3 failing tests that are blocking the deployment of 3 dependent modules. The tests are failing due to a recent API endpoint format change.',
          benefits: 'Unblocks 3 dependent modules, allows deployment to proceed, and improves overall system stability. Critical for system integrity.'
        },
        {
          id: 'rec-003',
          category: 'fix',
          title: 'Check Stalled Features',
          description: '5 features are still marked "building" after 14+ days — check for hang',
          confidence: 'medium',
          impact: 'medium',
          implementation: 'easy',
          items: [
            { id: 'feature-2056', name: 'Enhanced Data Visualization', status: 'building', days: 18 },
            { id: 'feature-3078', name: 'Profile Management System', status: 'building', days: 15 },
            { id: 'feature-4023', name: 'Third-party API Integration', status: 'building', days: 21 },
            { id: 'feature-2087', name: 'Search Enhancements', status: 'building', days: 14 },
            { id: 'feature-3092', name: 'Advanced Filtering', status: 'building', days: 22 }
          ],
          action: {
            type: 'script',
            command: 'python3 system-core/scripts/maintenance/check-stalled-features.py --threshold=14'
          },
          reasoning: 'These 5 features have been in the "building" state for an unusually long time, suggesting they may be stalled or abandoned. Each feature has remained in this state for 14+ days without progress.',
          benefits: 'Identifies abandoned work, highlights potential resource allocation issues, and improves accuracy of project tracking.'
        },
        {
          id: 'rec-004',
          category: 'optimize',
          title: 'Optimize Memory Usage',
          description: 'Memory files are growing large in 3 modules, consider optimizing',
          confidence: 'medium',
          impact: 'low',
          implementation: 'easy',
          items: [
            { id: 'module-user-management', name: 'User Management', size: '4.2MB' },
            { id: 'module-analytics', name: 'Analytics', size: '3.8MB' },
            { id: 'module-data-sync', name: 'Data Synchronization', size: '5.1MB' }
          ],
          action: {
            type: 'script',
            command: 'python3 system-core/scripts/maintenance/optimize-memory-files.py'
          },
          reasoning: 'Three memory files are significantly larger than the recommended 3MB threshold. This may lead to slower loading times and processing inefficiency.',
          benefits: 'Reduces memory consumption, improves load times, and enhances overall system performance.'
        },
        {
          id: 'rec-005',
          category: 'improve',
          title: 'Improve Test Coverage',
          description: '4 critical modules have test coverage below 60%',
          confidence: 'high',
          impact: 'medium',
          implementation: 'hard',
          items: [
            { id: 'module-auth', name: 'Authentication', coverage: '54%' },
            { id: 'module-payment', name: 'Payment Processing', coverage: '48%' },
            { id: 'module-security', name: 'Security Services', coverage: '52%' },
            { id: 'module-api', name: 'API Layer', coverage: '57%' }
          ],
          action: {
            type: 'navigate',
            path: '/testing/coverage'
          },
          reasoning: 'Four critical system modules have test coverage below the recommended 60% threshold. Low test coverage in these modules increases the risk of undetected bugs and regression issues.',
          benefits: 'Reduces risk of bugs, improves code quality, and enhances system stability and reliability.'
        },
        {
          id: 'rec-006',
          category: 'optimize',
          title: 'Consolidate Similar Features',
          description: 'Several features have similar functionality and could be consolidated',
          confidence: 'medium',
          impact: 'low',
          implementation: 'hard',
          items: [
            { 
              group: 'User Management', 
              features: ['feature-1023', 'feature-1045', 'feature-1089'],
              names: ['User Auth', 'User Roles', 'User Permissions']
            },
            { 
              group: 'Data Handling', 
              features: ['feature-2034', 'feature-2078'],
              names: ['Data Import', 'Data Export']
            }
          ],
          action: {
            type: 'script',
            command: 'python3 system-core/scripts/maintenance/analyze-feature-overlap.py --suggest-consolidation'
          },
          reasoning: 'Multiple features with overlapping functionality were identified. Consolidating these features would reduce redundancy and improve code maintainability.',
          benefits: 'Reduces code duplication, improves maintainability, and simplifies the overall system architecture.'
        },
        {
          id: 'rec-007',
          category: 'improve',
          title: 'Remove Deprecated Method Usage',
          description: '12 instances of deprecated methods found across 5 features',
          confidence: 'high',
          impact: 'medium',
          implementation: 'medium',
          items: [
            { id: 'feature-2045', name: 'Dashboard', instances: 4 },
            { id: 'feature-3056', name: 'API Gateway', instances: 3 },
            { id: 'feature-1078', name: 'Authentication Flow', instances: 2 },
            { id: 'feature-4012', name: 'Analytics', instances: 2 },
            { id: 'feature-2089', name: 'User Profiles', instances: 1 }
          ],
          action: {
            type: 'script',
            command: 'python3 system-core/scripts/maintenance/find-deprecated-methods.py --fix'
          },
          reasoning: '12 instances of deprecated method calls were found across 5 features. These methods are scheduled for removal in future updates and should be replaced with their modern equivalents.',
          benefits: 'Prevents future compatibility issues, improves code quality, and ensures smoother updates.'
        },
        {
          id: 'rec-008',
          category: 'archive',
          title: 'Archive Unused References',
          description: '6 external APIs are referenced but unused for over 90 days',
          confidence: 'medium',
          impact: 'low',
          implementation: 'easy',
          items: [
            { id: 'api-legacy-auth', name: 'Legacy Auth API', lastUsed: '112 days ago' },
            { id: 'api-old-payment', name: 'Old Payment Gateway', lastUsed: '95 days ago' },
            { id: 'api-v1-data', name: 'Data API v1', lastUsed: '120 days ago' },
            { id: 'api-legacy-search', name: 'Legacy Search Service', lastUsed: '104 days ago' },
            { id: 'api-reporting-v1', name: 'Reporting API v1', lastUsed: '98 days ago' },
            { id: 'api-metrics-old', name: 'Old Metrics Service', lastUsed: '91 days ago' }
          ],
          action: {
            type: 'script',
            command: 'python3 system-core/scripts/maintenance/clean-api-references.py --unused-days=90'
          },
          reasoning: 'Six external API references in the system haven\'t been used in over 90 days. These are likely obsolete and can be safely removed to reduce configuration complexity.',
          benefits: 'Simplifies API dependency management, reduces configuration complexity, and removes potential security vulnerabilities.'
        }
      ]);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Handle implementing a recommendation
  const handleImplement = async (rec) => {
    setImplementingRec(rec.id);
    
    try {
      // Simulate API call to implement recommendation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo, we'll just show a success message
      // In a real app, this would call the actual implementation API
      console.log(`Implementing recommendation: ${rec.title}`);
      
      // Success! Update the recommendation list
      // In a real app, we might re-fetch the recommendations or update the status
    } catch (error) {
      console.error('Error implementing recommendation:', error);
    } finally {
      setImplementingRec(null);
    }
  };

  // Filter recommendations based on current filters
  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.category !== 'all' && rec.category !== filters.category) return false;
    if (filters.impact !== 'all' && rec.impact !== filters.impact) return false;
    return true;
  });

  // Helper functions for rendering badges
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'fix':
        return '🔧';
      case 'archive':
        return '🗄️';
      case 'optimize':
        return '⚡';
      case 'improve':
        return '🔼';
      default:
        return '💡';
    }
  };

  const getImpactBadgeClass = (impact) => {
    switch (impact) {
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

  const getImplementationBadgeClass = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'hard':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'fix':
        return 'bg-red-500/20 text-red-400';
      case 'archive':
        return 'bg-purple-500/20 text-purple-400';
      case 'optimize':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'improve':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getConfidenceBadgeClass = (confidence) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-500/20 text-green-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'low':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">All AI Recommendations</h3>
        <button 
          className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
          onClick={onClose}
        >
          Back to Overview
        </button>
      </div>
      
      <div className="p-4">
        {/* Filters */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="all">All Categories</option>
                <option value="fix">Fix</option>
                <option value="archive">Archive</option>
                <option value="optimize">Optimize</option>
                <option value="improve">Improve</option>
              </select>
            </div>
            
            {/* Impact Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Impact</label>
              <select
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
                value={filters.impact}
                onChange={(e) => setFilters(prev => ({ ...prev, impact: e.target.value }))}
              >
                <option value="all">All Impacts</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            {/* Refresh Button */}
            <div className="flex items-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                onClick={fetchRecommendations}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Recommendations'}
              </button>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Analyzing system data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recommendations List */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {filteredRecommendations.length > 0 ? (
                  filteredRecommendations.map((rec) => (
                    <div 
                      key={rec.id}
                      className={`bg-gray-900 p-4 rounded-lg border-l-4 ${
                        rec.impact === 'critical' ? 'border-red-500' :
                        rec.impact === 'high' ? 'border-orange-500' :
                        rec.impact === 'medium' ? 'border-yellow-500' :
                        'border-blue-500'
                      } cursor-pointer hover:bg-gray-800/70 transition-colors ${
                        selectedRec?.id === rec.id ? 'ring-2 ring-blue-500/50' : ''
                      }`}
                      onClick={() => setSelectedRec(rec)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium flex items-center mb-2">
                            <span className="text-xl mr-2">{getCategoryIcon(rec.category)}</span>
                            {rec.title}
                          </h4>
                          <p className="text-sm text-gray-400 mb-3">{rec.description}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryBadgeClass(rec.category)}`}>
                              {rec.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getImpactBadgeClass(rec.impact)}`}>
                              {rec.impact} impact
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getImplementationBadgeClass(rec.implementation)}`}>
                              {rec.implementation} implementation
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getConfidenceBadgeClass(rec.confidence)}`}>
                              {rec.confidence} confidence
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button 
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRec(rec);
                            }}
                          >
                            Details
                          </button>
                          <button 
                            className="text-xs bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImplement(rec);
                            }}
                            disabled={implementingRec === rec.id}
                          >
                            {implementingRec === rec.id ? 'Implementing...' : 'Implement'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-900 p-6 rounded-lg text-center">
                    <p className="text-gray-400">No recommendations match the current filters</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recommendation Details */}
            <div className="lg:col-span-1">
              {selectedRec ? (
                <div className="bg-gray-900 rounded-lg p-4 sticky top-4">
                  <div className="mb-4">
                    <h4 className="text-lg font-medium flex items-center mb-2">
                      <span className="text-xl mr-2">{getCategoryIcon(selectedRec.category)}</span>
                      {selectedRec.title}
                    </h4>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getCategoryBadgeClass(selectedRec.category)}`}>
                        {selectedRec.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getImpactBadgeClass(selectedRec.impact)}`}>
                        {selectedRec.impact} impact
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getConfidenceBadgeClass(selectedRec.confidence)}`}>
                        {selectedRec.confidence} confidence
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm max-h-96 overflow-y-auto pr-1">
                    <div>
                      <div className="text-gray-400">Reasoning:</div>
                      <div className="mt-1 bg-gray-800 p-2 rounded">
                        {selectedRec.reasoning}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Benefits:</div>
                      <div className="mt-1 bg-gray-800 p-2 rounded">
                        {selectedRec.benefits}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-400">Affected Items:</div>
                      <div className="mt-1 bg-gray-800 p-2 rounded">
                        {selectedRec.category === 'optimize' && selectedRec.items[0].group ? (
                          <div className="space-y-2">
                            {selectedRec.items.map((item, idx) => (
                              <div key={idx}>
                                <div className="font-medium">{item.group}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.features.map((feat, fidx) => (
                                    <span key={fidx} className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                                      {feat} ({item.names[fidx]})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : selectedRec.items[0].size ? (
                          <ul className="space-y-1">
                            {selectedRec.items.map((item, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{item.id}</span>
                                <span className="text-gray-400 ml-2">{item.name}: {item.size}</span>
                              </li>
                            ))}
                          </ul>
                        ) : selectedRec.items[0].coverage ? (
                          <ul className="space-y-1">
                            {selectedRec.items.map((item, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{item.id}</span>
                                <span className="text-gray-400 ml-2">{item.name}: {item.coverage} coverage</span>
                              </li>
                            ))}
                          </ul>
                        ) : selectedRec.items[0].instances ? (
                          <ul className="space-y-1">
                            {selectedRec.items.map((item, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{item.id}</span>
                                <span className="text-gray-400 ml-2">{item.name}: {item.instances} instances</span>
                              </li>
                            ))}
                          </ul>
                        ) : selectedRec.items[0].lastUpdated || selectedRec.items[0].lastUsed ? (
                          <ul className="space-y-1">
                            {selectedRec.items.map((item, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{item.id}</span>
                                <span className="text-gray-400 ml-2">{item.name}: {item.lastUpdated || item.lastUsed}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="space-y-1">
                            {selectedRec.items.map((item, idx) => (
                              <li key={idx}>
                                <span className="font-medium">{item.id}</span>
                                <span className="text-gray-400 ml-2">{item.name}</span>
                                {item.status && (
                                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                                    item.status === 'failing' ? 'bg-red-500/20 text-red-400' : 
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                )}
                                {item.days && <span className="text-gray-400 ml-1">({item.days} days)</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    
                    {selectedRec.action && (
                      <div>
                        <div className="text-gray-400">Implementation:</div>
                        <div className="mt-1 bg-gray-800 p-2 rounded">
                          {selectedRec.action.type === 'script' ? (
                            <div className="font-mono text-xs overflow-x-auto">
                              {selectedRec.action.command}
                            </div>
                          ) : (
                            <div>
                              Navigate to: <span className="text-blue-400">{selectedRec.action.path}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      className="bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded text-sm flex-grow"
                      onClick={() => handleImplement(selectedRec)}
                      disabled={implementingRec === selectedRec.id}
                    >
                      {implementingRec === selectedRec.id ? 'Implementing...' : 'Implement Recommendation'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-4 text-center">
                  <p className="text-gray-400">Select a recommendation to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllRecommendations;