import React, { useState, useEffect } from 'react';
import CategoryDetail from './CategoryDetail';
import QuickActionModal from './QuickActionModal';
import DynamicHealthGauge from './DynamicHealthGauge';
import ActionableInsights from './ActionableInsights';
import SystemTopologyMap from './SystemTopologyMap';
import TrendAnalysisChart from './TrendAnalysisChart';
import SystemMetricsPanel from './SystemMetricsPanel';

const OverviewDashboard = ({ lastRunTime, onRunAllChecks, onShowAllIncidents, onShowAllRecommendations }) => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [previousHealthData, setPreviousHealthData] = useState(null);
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
    trendsDirection: 'improving', // improving, declining, stable
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
      // Store previous data for trend analysis
      setPreviousHealthData(healthData);
      
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
    
    // Set initial previous health data
    setPreviousHealthData({
      healthScore: 72,
      criticalIssues: 5,
      warningIssues: 18,
      orphanedFeatures: 32,
      testPassRate: 68,
    });
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

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">System Health Overview</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={() => {
            fetchHealthData();
            if (onRunAllChecks) onRunAllChecks();
          }}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh All Data'}
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
              {/* Dynamic Health Gauge */}
              <DynamicHealthGauge 
                score={healthData.healthScore} 
                previousScore={previousHealthData?.healthScore || 72}
                lastUpdated={lastRunTime}
              />
              
              {/* System Topology Map */}
              <SystemTopologyMap />
            </div>
            
            {/* Middle Column */}
            <div className="lg:col-span-1 space-y-4">
              {/* Action Insights */}
              <ActionableInsights />
              
              {/* Category Health */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-medium mb-3">Category Health</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(healthData.categoryScores).map(([category, score]) => (
                    <div 
                      key={category} 
                      className="bg-gray-900 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => setSelectedCategory(category)}
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
              {/* System Metrics Panel */}
              <SystemMetricsPanel />
              
              {/* Recent Incidents */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-medium mb-3">Recent Incidents</h4>
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
              <TrendAnalysisChart />
              
              {/* Top Recommendations */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-medium">Top AI Recommendations</h4>
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
                <h4 className="text-lg font-medium mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm p-2 rounded flex items-center justify-center"
                    onClick={() => setActiveAction('runHealthCheck')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run Health Check
                  </button>
                  <button 
                    className="bg-green-600 hover:bg-green-700 text-white text-sm p-2 rounded flex items-center justify-center"
                    onClick={() => setActiveAction('fixAllIssues')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Fix All Issues
                  </button>
                  <button 
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm p-2 rounded flex items-center justify-center"
                    onClick={() => setActiveAction('optimizeSystem')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Optimize System
                  </button>
                  <button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm p-2 rounded flex items-center justify-center"
                    onClick={() => setActiveAction('generateReports')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Reports
                  </button>
                  <button 
                    className="bg-red-600 hover:bg-red-700 text-white text-sm p-2 rounded flex items-center justify-center"
                    onClick={() => setActiveAction('backupSystem')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Backup System
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Render CategoryDetail when a category is selected */}
      {selectedCategory && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <CategoryDetail 
              category={selectedCategory} 
              score={healthData.categoryScores[selectedCategory]} 
              onClose={() => setSelectedCategory(null)} 
            />
          </div>
        </div>
      )}
      
      {/* Render QuickActionModal when an action is selected */}
      {activeAction && (
        <QuickActionModal 
          action={activeAction} 
          onClose={() => setActiveAction(null)}
          onExecute={(action, options) => {
            console.log(`Executing ${action} with options:`, options);
            // Here you would call your backend API to perform the action
            
            // For demo purposes, we'll just show a success message
            alert(`${action} executed successfully with the selected options!`);
          }}
        />
      )}
    </div>
  );
};

export default OverviewDashboard;