import React, { useState, useEffect } from 'react';

const EnhancedDashboard = ({ lastRunTime, onRunAllChecks, onShowAllIncidents, onShowAllRecommendations }) => {
  const [loading, setLoading] = useState(false);
  const [previousScore, setPreviousScore] = useState(72);
  const [healthData, setHealthData] = useState({
    healthScore: 78,
    status: 'warning',
    categoryScores: {
      structure: 92,
      memory: 95,
      orphans: 68,
      dependencies: 75,
      permissions: 100,
      core: 96,
      tests: 82
    },
    criticalIssues: 3,
    warningIssues: 14,
    fixedIssues: 5,
    orphanedFeatures: 26,
    testPassRate: 78,
    memoryHealth: 95,
    trendsDirection: 'improving',
    recentIncidents: [
      { type: 'drift', time: '2 days ago', severity: 'medium' },
      { type: 'test failure', time: '1 day ago', severity: 'high' }
    ],
    topRecommendations: [
      { 
        id: 'rec-001', 
        category: 'fix', 
        title: 'Fix failing tests',
        description: 'Feature 1023 is failing tests and blocking 3 dependent modules',
        impact: 'critical'
      },
      { 
        id: 'rec-002', 
        category: 'archive', 
        title: 'Archive inactive features',
        description: 'Consider archiving 8 features that haven\'t been touched in 60+ days',
        impact: 'medium'
      }
    ]
  });

  // Fetch health data
  const fetchHealthData = async () => {
    setLoading(true);
    try {
      // Store previous data
      setPreviousScore(healthData.healthScore);
      
      // In a real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate some improvement in the health score for demo
      const improvementFactor = Math.random() * 5;
      setHealthData(prevData => {
        const newScore = Math.min(100, Math.floor(prevData.healthScore + improvementFactor));
        return {
          ...prevData,
          healthScore: newScore,
          status: newScore >= 90 ? 'healthy' : newScore >= 70 ? 'warning' : 'critical',
          criticalIssues: Math.max(0, prevData.criticalIssues - (Math.random() > 0.7 ? 1 : 0)),
          warningIssues: Math.max(0, prevData.warningIssues - (Math.random() > 0.5 ? 1 : 0)),
        };
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  // Helper functions for styling
  const getHealthScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthScoreBg = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCategoryColor = (score) => {
    if (score >= 90) return 'bg-green-500/20 text-green-400';
    if (score >= 70) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return '🔴';
      case 'medium':
        return '🟠';
      case 'low':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getRecommendationIcon = (category) => {
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
  
  // Simple component for health gauge
  const SimpleHealthGauge = ({ score, previousScore }) => {
    const scoreDiff = score - previousScore;
    const trendIcon = scoreDiff > 0 ? '↗' : scoreDiff < 0 ? '↘' : '→';
    const trendColor = scoreDiff > 0 ? 'text-green-500' : scoreDiff < 0 ? 'text-red-500' : 'text-yellow-500';
    
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-3 text-center">System Health</h3>
        <div className="flex flex-col items-center">
          <div className={`text-5xl font-bold ${getHealthScoreColor(score)}`}>
            {score}
          </div>
          <div className="w-48 bg-gray-700 rounded-full h-3 my-3">
            <div 
              className={`h-3 rounded-full ${getHealthScoreBg(score)}`} 
              style={{ width: `${score}%` }}
            ></div>
          </div>
          <div className="text-sm mb-2">
            Status: <span className={getHealthScoreColor(score)}>
              {score >= 90 ? 'Excellent' : score >= 70 ? 'Fair' : 'Critical'}
            </span>
          </div>
          <div className={`text-sm ${trendColor} flex items-center`}>
            <span className="mr-1">{trendIcon}</span>
            <span>{Math.abs(scoreDiff)}% {scoreDiff > 0 ? 'increase' : scoreDiff < 0 ? 'decrease' : 'no change'}</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Simple component for system health map
  const SimpleSystemMap = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-3">System Status</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-700/30">
            <div className="flex justify-between items-center">
              <span className="font-medium">Core System</span>
              <span className="bg-green-700/50 px-2 py-0.5 rounded-full text-xs">Healthy</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">CPU: 12% | Memory: 286MB</div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-700/30">
            <div className="flex justify-between items-center">
              <span className="font-medium">Memory API</span>
              <span className="bg-green-700/50 px-2 py-0.5 rounded-full text-xs">Healthy</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">Files: 412 | Size: 14.8MB</div>
          </div>
          <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-700/30">
            <div className="flex justify-between items-center">
              <span className="font-medium">API Services</span>
              <span className="bg-yellow-700/50 px-2 py-0.5 rounded-full text-xs">Warning</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">Errors: 2.1% | Latency: 239ms</div>
          </div>
          <div className="bg-red-900/30 rounded-lg p-3 border border-red-700/30">
            <div className="flex justify-between items-center">
              <span className="font-medium">Data Storage</span>
              <span className="bg-red-700/50 px-2 py-0.5 rounded-full text-xs">Critical</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">Disk: 89% | Writes: 47/min</div>
          </div>
        </div>
      </div>
    );
  };
  
  // Simple component for actionable insights
  const SimpleInsights = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-3">Priority Actions</h3>
        <div className="space-y-3">
          <div className="border-l-4 border-red-500 bg-gray-900 rounded-md p-3">
            <div className="flex justify-between items-start">
              <h4 className="font-medium flex items-center">
                <span className="mr-2 text-xl">🔧</span>
                Fix failing tests
              </h4>
              <span className="bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded-full">
                Critical
              </span>
            </div>
            <p className="text-sm mt-2 text-gray-300">Feature 1023 is failing tests and blocking 3 dependent modules</p>
            <div className="mt-3 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded">
                Fix Now
              </button>
            </div>
          </div>
          <div className="border-l-4 border-yellow-500 bg-gray-900 rounded-md p-3">
            <div className="flex justify-between items-start">
              <h4 className="font-medium flex items-center">
                <span className="mr-2 text-xl">🗄️</span>
                Archive inactive features
              </h4>
              <span className="bg-yellow-900/50 text-yellow-300 text-xs px-2 py-1 rounded-full">
                Medium
              </span>
            </div>
            <p className="text-sm mt-2 text-gray-300">Consider archiving 8 features that haven't been touched in 60+ days</p>
            <div className="mt-3 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded">
                Review
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Simple metrics component
  const SimpleMetrics = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-3">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-1">Critical Issues</div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-red-400">{healthData.criticalIssues}</div>
              <div className="text-sm font-medium text-green-400">↘ -2</div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-1">Warning Issues</div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-yellow-400">{healthData.warningIssues}</div>
              <div className="text-sm font-medium text-green-400">↘ -5</div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-1">Test Pass Rate</div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-blue-400">{healthData.testPassRate}%</div>
              <div className="text-sm font-medium text-green-400">↗ +7%</div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-sm text-gray-400 mb-1">Fixed Issues</div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-green-400">{healthData.fixedIssues}</div>
              <div className="text-sm font-medium text-green-400">↗ +3</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Simple trend visualization
  const SimpleTrend = () => {
    const mockData = [68, 72, 75, 78, 82];
    const maxValue = Math.max(...mockData);
    
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Health Trend</h3>
          <div className="flex rounded-md overflow-hidden border border-gray-700">
            <button className="py-1 px-3 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600">7d</button>
            <button className="py-1 px-3 text-xs bg-blue-600 text-white">30d</button>
            <button className="py-1 px-3 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600">90d</button>
          </div>
        </div>
        
        <div className="h-32 w-full flex items-end justify-between bg-gray-900 rounded p-2">
          {mockData.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-6 ${getHealthScoreBg(value)}`} 
                style={{ height: `${(value / 100) * 100}%` }}
              ></div>
              <div className="text-xs mt-1 text-gray-400">
                {index === 0 ? 'Week 1' : 
                 index === 1 ? 'Week 2' : 
                 index === 2 ? 'Week 3' : 
                 index === 3 ? 'Week 4' : 'Current'}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="text-green-400 text-sm">↗ Improved by 20.6% over this period</div>
          <div className="text-gray-400 text-sm">Current: 82</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-0">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Enhanced System Health Dashboard</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={() => {
            fetchHealthData();
            if (onRunAllChecks) onRunAllChecks();
          }}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Loading dashboard data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-4">
              <SimpleHealthGauge score={healthData.healthScore} previousScore={previousScore} />
              <SimpleSystemMap />
            </div>
            
            {/* Middle Column */}
            <div className="lg:col-span-1 space-y-4">
              <SimpleInsights />
              
              {/* Category Health */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-medium mb-3">Category Health</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(healthData.categoryScores).map(([category, score]) => (
                    <div 
                      key={category} 
                      className="bg-gray-900 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-sm capitalize">{category}</div>
                        <div className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColor(score)}`}>
                          {score}%
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${getHealthScoreBg(score)}`} 
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-1 space-y-4">
              <SimpleMetrics />
              
              {/* Recent Incidents */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-medium mb-3">Recent Incidents</h3>
                {healthData.recentIncidents.length > 0 ? (
                  <div className="space-y-3">
                    {healthData.recentIncidents.map((incident, index) => (
                      <div key={index} className="bg-gray-900 p-3 rounded-md">
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <span className="mr-2">{getSeverityIcon(incident.severity)}</span>
                            <div className="capitalize">{incident.type}</div>
                          </div>
                          <div className="text-xs text-gray-400">{incident.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-500/10 p-4 rounded-md text-center">
                    <p className="text-green-400">No recent incidents! 🎉</p>
                  </div>
                )}
                <div className="mt-3">
                  <button 
                    className="w-full bg-gray-900 hover:bg-gray-700 text-sm p-2 rounded"
                    onClick={() => onShowAllIncidents && onShowAllIncidents()}
                  >
                    View All Incidents
                  </button>
                </div>
              </div>
            </div>
            
            {/* Full Width Components */}
            <div className="lg:col-span-3 space-y-4">
              {/* Trend Analysis Chart */}
              <SimpleTrend />
              
              {/* Top Recommendations */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Top AI Recommendations</h3>
                  <button 
                    className="text-sm text-blue-400 hover:text-blue-300"
                    onClick={() => onShowAllRecommendations && onShowAllRecommendations()}
                  >
                    View All Recommendations
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {healthData.topRecommendations.map((rec) => (
                    <div 
                      key={rec.id} 
                      className={`bg-gray-900 p-3 rounded-md border-l-4 ${
                        rec.impact === 'critical' ? 'border-red-500' :
                        rec.impact === 'high' ? 'border-orange-500' :
                        rec.impact === 'medium' ? 'border-yellow-500' :
                        'border-blue-500'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="text-xl mr-3">{getRecommendationIcon(rec.category)}</span>
                        <div>
                          <h5 className="font-medium">{rec.title}</h5>
                          <p className="text-sm text-gray-400 mt-1">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm p-2 rounded">
                    Run Health Check
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white text-sm p-2 rounded">
                    Fix All Issues
                  </button>
                  <button className="bg-purple-600 hover:bg-purple-700 text-white text-sm p-2 rounded">
                    Optimize System
                  </button>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm p-2 rounded">
                    Generate Reports
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white text-sm p-2 rounded">
                    Backup System
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDashboard;