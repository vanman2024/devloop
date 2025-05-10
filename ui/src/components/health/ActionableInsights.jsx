import React from 'react';

const ActionableInsights = ({ insights }) => {
  // Fallback data if no insights provided
  const defaultInsights = [
    {
      id: 'priority-001',
      title: 'Fix failing authentication tests',
      description: 'Feature 1023 has 3 failing tests and is blocking 3 dependent modules',
      impact: 'critical',
      effort: 'medium',
      command: 'python3 system-core/scripts/maintenance/fix-failing-tests.py --feature=1023',
      estimatedTimeToFix: '15 min',
      affectedComponents: ['Authentication', 'API Gateway', 'User Profiles']
    },
    {
      id: 'priority-002',
      title: 'Optimize database memory files',
      description: 'Memory files exceed recommended size, affecting query performance',
      impact: 'high',
      effort: 'low',
      command: 'python3 system-core/scripts/maintenance/optimize-memory-files.py',
      estimatedTimeToFix: '5 min',
      affectedComponents: ['Data Storage', 'Memory Management']
    }
  ];
  
  const priorityInsights = insights || defaultInsights;
  
  // Helper functions
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'critical': return 'bg-red-900/30 border-red-500 text-red-400';
      case 'high': return 'bg-orange-900/30 border-orange-500 text-orange-400';
      case 'medium': return 'bg-yellow-900/30 border-yellow-500 text-yellow-400';
      case 'low': return 'bg-blue-900/30 border-blue-500 text-blue-400';
      default: return 'bg-gray-900/30 border-gray-500 text-gray-400';
    }
  };
  
  const getEffortBadge = (effort) => {
    switch (effort) {
      case 'low': return { color: 'bg-green-900/50 text-green-300', text: 'Quick Fix' };
      case 'medium': return { color: 'bg-yellow-900/50 text-yellow-300', text: 'Medium Effort' };
      case 'high': return { color: 'bg-red-900/50 text-red-300', text: 'Major Effort' };
      default: return { color: 'bg-gray-900/50 text-gray-300', text: 'Unknown Effort' };
    }
  };
  
  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'critical': return '🔥';
      case 'high': return '⚠️';
      case 'medium': return '⚙️';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-medium mb-4">Priority Actions</h3>
      
      <div className="space-y-4">
        {priorityInsights.map((insight, index) => (
          <div 
            key={insight.id}
            className={`border-l-4 rounded-md overflow-hidden ${getImpactColor(insight.impact)}`}
          >
            <div className="p-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium flex items-center">
                  <span className="mr-2 text-xl">{getImpactIcon(insight.impact)}</span>
                  {insight.title}
                </h4>
                <span className={`${getEffortBadge(insight.effort).color} text-xs px-2 py-1 rounded-full`}>
                  {getEffortBadge(insight.effort).text}
                </span>
              </div>
              
              <p className="text-sm mt-2 text-gray-300">{insight.description}</p>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.affectedComponents.map((component, idx) => (
                  <span key={idx} className="bg-gray-700 text-xs px-2 py-1 rounded">
                    {component}
                  </span>
                ))}
              </div>
              
              {insight.command && (
                <div className="mt-3 bg-gray-900 p-2 rounded text-xs font-mono overflow-x-auto">
                  {insight.command}
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Estimated time: {insight.estimatedTimeToFix}
                </div>
                
                <div className="flex gap-2">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded">
                    View Details
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-3 rounded">
                    Run Fix
                  </button>
                </div>
              </div>
            </div>
            
            {index === 0 && (
              <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 py-2 px-4 flex justify-between items-center">
                <div className="text-sm font-medium text-indigo-300 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Top Priority Action
                </div>
                <div className="text-xs text-purple-300">5 dependent tasks blocked</div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between">
        <button className="text-sm text-blue-400 hover:text-blue-300">
          View All Actions
        </button>
        <div className="text-xs text-gray-400">
          Showing top {priorityInsights.length} of 8 recommended actions
        </div>
      </div>
    </div>
  );
};

export default ActionableInsights;