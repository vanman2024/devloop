import React, { useState, useEffect } from 'react';

const AIRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories] = useState({
    optimize: true,
    archive: true,
    fix: true,
    improve: true
  });
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock data fetch - would be replaced with actual API call
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Mock response data
      setRecommendations([
        {
          id: 'rec-001',
          category: 'archive',
          title: 'Archive Inactive Features',
          description: 'Consider archiving these 8 features that haven\'t been touched in 60+ days',
          confidence: 'high',
          impact: 'medium',
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
          }
        },
        {
          id: 'rec-002',
          category: 'fix',
          title: 'Fix Failing Tests',
          description: 'Feature 1023 is failing tests and blocking 3 dependent modules',
          confidence: 'high',
          impact: 'critical',
          items: [
            { id: 'feature-1023', name: 'Core Authentication', status: 'failing', deps: 3 }
          ],
          action: {
            type: 'navigate',
            path: '/features/feature-1023/tests'
          }
        },
        {
          id: 'rec-003',
          category: 'fix',
          title: 'Check Stalled Features',
          description: '5 features are still marked "building" after 14+ days — check for hang',
          confidence: 'medium',
          impact: 'medium',
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
          }
        },
        {
          id: 'rec-004',
          category: 'optimize',
          title: 'Optimize Memory Usage',
          description: 'Memory files are growing large in 3 modules, consider optimizing',
          confidence: 'medium',
          impact: 'low',
          items: [
            { id: 'module-user-management', name: 'User Management', size: '4.2MB' },
            { id: 'module-analytics', name: 'Analytics', size: '3.8MB' },
            { id: 'module-data-sync', name: 'Data Synchronization', size: '5.1MB' }
          ],
          action: {
            type: 'script',
            command: 'python3 system-core/scripts/maintenance/optimize-memory-files.py'
          }
        },
        {
          id: 'rec-005',
          category: 'improve',
          title: 'Improve Test Coverage',
          description: '4 critical modules have test coverage below 60%',
          confidence: 'high',
          impact: 'medium',
          items: [
            { id: 'module-auth', name: 'Authentication', coverage: '54%' },
            { id: 'module-payment', name: 'Payment Processing', coverage: '48%' },
            { id: 'module-security', name: 'Security Services', coverage: '52%' },
            { id: 'module-api', name: 'API Layer', coverage: '57%' }
          ],
          action: {
            type: 'navigate',
            path: '/testing/coverage'
          }
        },
        {
          id: 'rec-006',
          category: 'optimize',
          title: 'Consolidate Similar Features',
          description: 'Several features have similar functionality and could be consolidated',
          confidence: 'medium',
          impact: 'low',
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
          }
        },
        {
          id: 'rec-007',
          category: 'improve',
          title: 'Remove Deprecated Method Usage',
          description: '12 instances of deprecated methods found across 5 features',
          confidence: 'high',
          impact: 'medium',
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
          }
        },
        {
          id: 'rec-008',
          category: 'archive',
          title: 'Archive Unused References',
          description: '6 external APIs are referenced but unused for over 90 days',
          confidence: 'medium',
          impact: 'low',
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
          }
        }
      ]);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleCategoryToggle = (category) => {
    setCategories({
      ...categories,
      [category]: !categories[category]
    });
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedCategory !== 'all' && rec.category !== selectedCategory) return false;
    return categories[rec.category];
  });

  const categoryIcons = {
    archive: '🗄️',
    fix: '🔧',
    optimize: '⚡',
    improve: '🔼'
  };

  const categoryColors = {
    archive: 'purple',
    fix: 'red',
    optimize: 'yellow',
    improve: 'blue'
  };

  const impactColors = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'blue'
  };

  const renderCategoryLabel = (category) => {
    const colors = {
      archive: 'bg-purple-500/20 text-purple-400',
      fix: 'bg-red-500/20 text-red-400',
      optimize: 'bg-yellow-500/20 text-yellow-400',
      improve: 'bg-blue-500/20 text-blue-400'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${colors[category]}`}>
        <span className="mr-1">{categoryIcons[category]}</span>
        <span className="capitalize">{category}</span>
      </span>
    );
  };

  const renderImpactLabel = (impact) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400',
      high: 'bg-orange-500/20 text-orange-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-blue-500/20 text-blue-400'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${colors[impact]}`}>
        <span className="capitalize">{impact}</span>
      </span>
    );
  };

  const renderRecommendationCard = (recommendation) => {
    return (
      <div 
        key={recommendation.id} 
        className={`bg-gray-900 rounded-lg overflow-hidden border-l-4 ${
          recommendation.impact === 'critical' ? 'border-red-500' :
          recommendation.impact === 'high' ? 'border-orange-500' :
          recommendation.impact === 'medium' ? 'border-yellow-500' :
          'border-blue-500'
        } mb-4`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium flex items-center">
              <span className="mr-2">{categoryIcons[recommendation.category]}</span>
              {recommendation.title}
            </h3>
            {renderImpactLabel(recommendation.impact)}
          </div>
          
          <p className="text-gray-400 mb-4">
            {recommendation.description}
          </p>
          
          {/* Item list */}
          <div className="bg-gray-800 rounded-md p-3 mb-4 max-h-60 overflow-y-auto">
            {recommendation.category === 'archive' && recommendation.items[0].lastUpdated && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.id}</span>
                      <span className="text-gray-400 ml-2 text-sm">{item.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">Last updated: {item.lastUpdated}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {recommendation.category === 'fix' && recommendation.items[0].status && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.id}</span>
                      <span className="text-gray-400 ml-2 text-sm">{item.name}</span>
                    </div>
                    <div>
                      <span className="text-red-400 text-sm mr-2">{item.status}</span>
                      {item.deps && (
                        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                          Blocking {item.deps} dependencies
                        </span>
                      )}
                      {item.days && (
                        <span className="text-yellow-400 text-sm">
                          For {item.days} days
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {recommendation.category === 'optimize' && recommendation.items[0].size && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.id}</span>
                      <span className="text-gray-400 ml-2 text-sm">{item.name}</span>
                    </div>
                    <span className="text-yellow-400 text-sm">{item.size}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {recommendation.category === 'improve' && recommendation.items[0].coverage && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.id}</span>
                      <span className="text-gray-400 ml-2 text-sm">{item.name}</span>
                    </div>
                    <span className="text-red-400 text-sm">Coverage: {item.coverage}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {recommendation.category === 'optimize' && recommendation.items[0].group && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2">
                    <div className="font-medium mb-1">{item.group}</div>
                    <div className="flex flex-wrap gap-2">
                      {item.features.map((feat, fidx) => (
                        <span key={fidx} className="bg-gray-700 px-2 py-1 rounded-md text-xs">
                          {feat} ({item.names[fidx]})
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {recommendation.category === 'improve' && recommendation.items[0].instances && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.id}</span>
                      <span className="text-gray-400 ml-2 text-sm">{item.name}</span>
                    </div>
                    <span className="text-yellow-400 text-sm">{item.instances} deprecated method{item.instances !== 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {recommendation.category === 'archive' && recommendation.items[0].lastUsed && (
              <ul className="divide-y divide-gray-700">
                {recommendation.items.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.id}</span>
                      <span className="text-gray-400 ml-2 text-sm">{item.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">Last used: {item.lastUsed}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-sm text-gray-400 mr-2">Confidence:</span>
              <span className={`text-sm ${
                recommendation.confidence === 'high' ? 'text-green-400' :
                recommendation.confidence === 'medium' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {recommendation.confidence.toUpperCase()}
              </span>
            </div>
            
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm">
              {recommendation.action.type === 'script' ? 'Run Fix' : 'View Details'}
            </button>
          </div>
        </div>
        
        {recommendation.action.type === 'script' && (
          <div className="bg-gray-950 px-4 py-3 border-t border-gray-800">
            <div className="text-xs font-mono text-gray-400">
              {recommendation.action.command}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">AI-Guided Recommendations</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={fetchRecommendations}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>
      
      <div className="p-4">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap justify-between items-center">
          <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
            <button 
              className={`px-3 py-1 rounded-md text-sm ${
                selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700'
              }`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            <button 
              className={`px-3 py-1 rounded-md text-sm flex items-center ${
                selectedCategory === 'fix' ? 'bg-red-500/30 text-red-400' : 'bg-gray-700'
              }`}
              onClick={() => setSelectedCategory('fix')}
            >
              <span className="mr-1">🔧</span> Fix
            </button>
            <button 
              className={`px-3 py-1 rounded-md text-sm flex items-center ${
                selectedCategory === 'optimize' ? 'bg-yellow-500/30 text-yellow-400' : 'bg-gray-700'
              }`}
              onClick={() => setSelectedCategory('optimize')}
            >
              <span className="mr-1">⚡</span> Optimize
            </button>
            <button 
              className={`px-3 py-1 rounded-md text-sm flex items-center ${
                selectedCategory === 'archive' ? 'bg-purple-500/30 text-purple-400' : 'bg-gray-700'
              }`}
              onClick={() => setSelectedCategory('archive')}
            >
              <span className="mr-1">🗄️</span> Archive
            </button>
            <button 
              className={`px-3 py-1 rounded-md text-sm flex items-center ${
                selectedCategory === 'improve' ? 'bg-blue-500/30 text-blue-400' : 'bg-gray-700'
              }`}
              onClick={() => setSelectedCategory('improve')}
            >
              <span className="mr-1">🔼</span> Improve
            </button>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-gray-400 mr-2">Impact:</span>
            <select className="bg-gray-700 text-sm rounded-md px-2 py-1 border-0">
              <option>All</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">AI analyzing system patterns...</p>
            <p className="text-sm text-gray-500">This may take a moment</p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="bg-gray-900 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-medium mb-2">No Recommendations Found</h3>
            <p className="text-gray-400">
              No {selectedCategory !== 'all' ? selectedCategory : ''} recommendations match your current filters.
            </p>
          </div>
        ) : (
          <div>
            {filteredRecommendations.map(renderRecommendationCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;