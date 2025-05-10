import React, { useState } from 'react';

const SystemMetricsPanel = ({ metrics }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Default metrics if not provided
  const defaultMetrics = {
    categories: [
      {
        name: 'Core',
        metrics: [
          { id: 'critical_issues', name: 'Critical Issues', value: 1, change: -2, improved: true },
          { id: 'warnings', name: 'Warnings', value: 14, change: -5, improved: true },
          { id: 'test_pass', name: 'Test Pass Rate', value: '85%', change: '+7%', improved: true },
        ]
      },
      {
        name: 'Structure',
        metrics: [
          { id: 'orphans', name: 'Orphaned Features', value: 24, change: -3, improved: true },
          { id: 'registry', name: 'Registry Integrity', value: '96%', change: '+2%', improved: true },
        ]
      },
      {
        name: 'Performance',
        metrics: [
          { id: 'memory', name: 'Memory File Size', value: '14.8MB', change: '-2.3MB', improved: true },
          { id: 'response', name: 'Avg Response Time', value: '243ms', change: '+18ms', improved: false },
        ]
      }
    ],
    topMetrics: [
      { id: 'health_score', name: 'Health Score', value: 82, change: '+4', improved: true },
      { id: 'critical_issues', name: 'Critical Issues', value: 1, change: '-2', improved: true },
      { id: 'test_pass', name: 'Test Pass Rate', value: '85%', change: '+7%', improved: true },
      { id: 'total_components', name: 'System Components', value: 456, change: '+12', improved: true },
    ],
    lastUpdated: new Date().toISOString()
  };
  
  const systemMetrics = metrics || defaultMetrics;
  const { topMetrics, categories, lastUpdated } = systemMetrics;
  
  // Helper functions
  const getChangeClass = (improved) => {
    return improved ? 'text-green-400' : 'text-red-400';
  };
  
  const getChangeIcon = (improved) => {
    return improved ? '↗' : '↘';
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">System Metrics</h3>
        
        <button 
          className="text-sm text-blue-400 hover:text-blue-300"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show Less' : 'Show All Metrics'}
        </button>
      </div>
      
      {/* Top metrics section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {topMetrics.map(metric => (
          <div key={metric.id} className="bg-gray-900 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-1">{metric.name}</div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && (
                <div className={`text-sm font-medium ${getChangeClass(metric.improved)}`}>
                  {getChangeIcon(metric.improved)} {metric.change}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Expanded metrics section */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.name}>
                <h4 className="text-md font-medium mb-3">{category.name} Metrics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {category.metrics.map(metric => (
                    <div key={metric.id} className="bg-gray-900 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-1">{metric.name}</div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-bold">{metric.value}</div>
                        {metric.change && (
                          <div className={`text-sm font-medium ${getChangeClass(metric.improved)}`}>
                            {getChangeIcon(metric.improved)} {metric.change}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-400">
        <div>Last updated: {formatDate(lastUpdated)}</div>
        <button className="text-blue-400 hover:text-blue-300">Refresh</button>
      </div>
    </div>
  );
};

export default SystemMetricsPanel;