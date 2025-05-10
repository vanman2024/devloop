import React, { useState, useEffect } from 'react';

// Icons (using emoji for simplicity)
const icons = {
  check: "✅",
  warning: "⚠️",
  error: "❌",
  info: "ℹ️",
  refresh: "🔄",
  dashboard: "📊",
  bug: "🐛",
  settings: "⚙️",
  history: "📜",
  lightbulb: "💡",
  run: "▶️"
};

const HealthMonitor = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState({
    healthScore: 78,
    status: 'warning',
    systemStats: {
      milestones: 6,
      features: 517,
      orphanedFeatures: 26,
      lastTest: '2025-04-15'
    },
    categoryScores: {
      structure: 92,
      memory: 95,
      orphans: 68,
      dependencies: 75,
      permissions: 100,
      core: 96
    },
    issues: [
      {
        title: 'Orphaned Features',
        description: '26 features not in registry',
        severity: 'warning',
        details: 'Features exist in filesystem but are not registered'
      },
      {
        title: 'Missing jq Dependency',
        description: 'Install jq or use Python alternatives',
        severity: 'warning',
        details: 'The jq utility is not installed. Some features limited.'
      },
      {
        title: 'Code Placeholders',
        description: '97 placeholders need to be filled',
        severity: 'warning',
        details: 'Placeholder values need to be replaced before deployment'
      },
      {
        title: 'No Implementation Files',
        description: 'Multiple features missing implementation',
        severity: 'info',
        details: 'Features are missing implementation files in output directories'
      }
    ],
    recommendations: [
      {
        title: 'Register Orphaned Features',
        description: 'Registration will improve system integrity and tracking',
        command: 'python3 system-core/scripts/maintenance/register-orphaned-features.py'
      },
      {
        title: 'Address Placeholder Issues',
        description: 'Fill in placeholder values before going to production',
        command: 'python3 system-core/scripts/maintenance/check-placeholders.py --focus=critical --report'
      },
      {
        title: 'Run Full System Backup',
        description: "It's been 15 days since your last backup",
        command: './system-core/scripts/maintenance/backup-system.sh --full'
      }
    ],
    lastUpdated: new Date().toLocaleString()
  });

  // Tab handling
  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  // Refresh health data
  const refreshHealthData = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, you would fetch data from your health check API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Update last updated timestamp
      setHealthData(prev => ({
        ...prev,
        lastUpdated: new Date().toLocaleString()
      }));
    } catch (error) {
      console.error('Error refreshing health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function for health score color
  const getHealthScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Tab content components
  const OverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Health Score Card */}
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-700 px-4 py-3">
          <h3 className="text-lg font-semibold">System Health Score</h3>
        </div>
        <div className="p-4 flex flex-col items-center">
          <div className={`text-5xl font-bold my-4 ${getHealthScoreColor(healthData.healthScore)}`}>
            {healthData.healthScore}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className={`h-full rounded-full ${
                healthData.healthScore >= 90 ? 'bg-green-500' : 
                healthData.healthScore >= 70 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${healthData.healthScore}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400">
            Last updated: {healthData.lastUpdated}
          </p>
        </div>
        <div className="bg-gray-900 px-4 py-3 border-t border-gray-700">
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center"
            onClick={refreshHealthData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : <>{icons.refresh} Refresh Health Check</>}
          </button>
        </div>
      </div>

      {/* Category Health Card */}
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-700 px-4 py-3">
          <h3 className="text-lg font-semibold">Category Health</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(healthData.categoryScores).map(([category, score]) => (
              <div key={category} className="bg-gray-900 p-2 rounded text-center">
                <div className={`text-xl font-bold ${getHealthScoreColor(score)}`}>
                  {score}
                </div>
                <div className="text-sm text-gray-400 capitalize">
                  {category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Stats Card */}
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-700 px-4 py-3">
          <h3 className="text-lg font-semibold">System Stats</h3>
        </div>
        <div className="divide-y divide-gray-700">
          <div className="px-4 py-3">
            <div className="font-medium">Milestones</div>
            <div className="text-sm text-gray-400">
              {healthData.systemStats.milestones} active milestones
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="font-medium">Features</div>
            <div className="text-sm text-gray-400">
              {healthData.systemStats.features} registered features
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="font-medium">Orphaned Features</div>
            <div className="text-sm text-yellow-500">
              {healthData.systemStats.orphanedFeatures} orphaned features detected
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="font-medium">Last Test Run</div>
            <div className="text-sm text-gray-400">
              {healthData.systemStats.lastTest}
            </div>
          </div>
        </div>
      </div>

      {/* Top Issues Card */}
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden col-span-1 md:col-span-3">
        <div className="border-b border-gray-700 px-4 py-3">
          <h3 className="text-lg font-semibold">Top Issues</h3>
        </div>
        <div className="divide-y divide-gray-700">
          {healthData.issues.slice(0, 3).map((issue, index) => (
            <div key={index} className="px-4 py-3 flex items-start justify-between">
              <div className="flex items-start">
                <span className="mr-2 mt-1">
                  {issue.severity === 'critical' ? icons.error : 
                   issue.severity === 'warning' ? icons.warning : 
                   icons.info}
                </span>
                <div>
                  <div className="font-medium">
                    {issue.title}
                  </div>
                  <div className="text-sm text-gray-400">
                    {issue.description}
                  </div>
                </div>
              </div>
              <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded">
                View Details
              </button>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 px-4 py-3 border-t border-gray-700">
          <button 
            className="text-blue-400 hover:text-blue-300 text-sm"
            onClick={() => setActiveTab(1)}
          >
            View All Issues
          </button>
        </div>
      </div>
    </div>
  );

  const IssuesTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3">
        <h3 className="text-lg font-semibold">Active Issues</h3>
      </div>
      <div className="divide-y divide-gray-700">
        {healthData.issues.map((issue, index) => (
          <div 
            key={index} 
            className={`px-4 py-4 flex items-start justify-between border-l-4 ${
              issue.severity === 'critical' ? 'border-red-500' :
              issue.severity === 'warning' ? 'border-yellow-500' :
              'border-blue-500'
            }`}
          >
            <div className="flex items-start">
              <span className="mr-2 mt-1">
                {issue.severity === 'critical' ? icons.error : 
                 issue.severity === 'warning' ? icons.warning : 
                 icons.info}
              </span>
              <div>
                <div className="font-medium">
                  {issue.title}
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  {issue.description}
                </div>
                <div className="text-xs text-gray-500">
                  {issue.details}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded">
                Fix
              </button>
              <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded">
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const RecommendationsTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3">
        <h3 className="text-lg font-semibold">AI Recommendations</h3>
      </div>
      <div className="p-4 space-y-4">
        {healthData.recommendations.map((rec, index) => (
          <div key={index} className="bg-gray-900 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center mb-2">
              <span className="mr-2">{icons.lightbulb}</span>
              <h4 className="text-lg font-medium">{rec.title}</h4>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              {rec.description}
            </p>
            <h5 className="text-xs font-medium text-gray-300 mb-2">Suggested Command:</h5>
            <div className="bg-gray-950 p-2 rounded mb-3 font-mono text-xs text-gray-300 overflow-x-auto">
              {rec.command}
            </div>
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded flex items-center"
            >
              <span className="mr-1">{icons.run}</span> Run Command
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const HistoryTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3">
        <h3 className="text-lg font-semibold">Health Check History</h3>
      </div>
      <div className="p-4 mb-4 bg-gray-900 rounded-lg text-center text-gray-400">
        Historical health data chart will appear here
      </div>
      <div className="divide-y divide-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium">April 20, 2025 - 19:59:03</div>
            <div className="text-sm text-gray-400">Health Score: 78 (Minor issues detected)</div>
          </div>
          <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded">
            View Report
          </button>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium">April 15, 2025 - 14:30:45</div>
            <div className="text-sm text-gray-400">Health Score: 65 (Critical issues detected)</div>
          </div>
          <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded">
            View Report
          </button>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium">April 10, 2025 - 09:15:22</div>
            <div className="text-sm text-gray-400">Health Score: 92 (System healthy)</div>
          </div>
          <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded">
            View Report
          </button>
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3">
        <h3 className="text-lg font-semibold">Health Check Settings</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Check Frequency</label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm">
              <option>Daily</option>
              <option selected>Weekly</option>
              <option>Monthly</option>
              <option>Manual Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Alert Threshold</label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm">
              <option>Critical Only (0-50)</option>
              <option selected>Warning & Critical (0-75)</option>
              <option>All Issues (0-99)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Report Format</label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm">
              <option>Text Only</option>
              <option selected>HTML</option>
              <option>JSON</option>
              <option>All Formats</option>
            </select>
          </div>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg space-y-2 mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" className="form-checkbox" defaultChecked />
            <span>Enable Notifications</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" className="form-checkbox" defaultChecked />
            <span>Auto-fix Minor Issues</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" className="form-checkbox" />
            <span>Include Custom Checks</span>
          </label>
        </div>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
          Save Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Health Monitor</h1>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center"
          onClick={refreshHealthData}
          disabled={loading}
        >
          <span className="mr-2">{icons.refresh}</span>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-gray-900 mb-6 rounded-md overflow-hidden">
        <div className="flex overflow-x-auto">
          <button 
            className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 ${activeTab === 0 ? 'border-blue-500 text-blue-500' : 'border-transparent hover:text-gray-300'}`}
            onClick={() => handleTabChange(0)}
          >
            <span className="mr-2">{icons.dashboard}</span> Overview
          </button>
          <button 
            className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 ${activeTab === 1 ? 'border-blue-500 text-blue-500' : 'border-transparent hover:text-gray-300'}`}
            onClick={() => handleTabChange(1)}
          >
            <span className="mr-2">{icons.bug}</span> Issues
          </button>
          <button 
            className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 ${activeTab === 2 ? 'border-blue-500 text-blue-500' : 'border-transparent hover:text-gray-300'}`}
            onClick={() => handleTabChange(2)}
          >
            <span className="mr-2">{icons.lightbulb}</span> Recommendations
          </button>
          <button 
            className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 ${activeTab === 3 ? 'border-blue-500 text-blue-500' : 'border-transparent hover:text-gray-300'}`}
            onClick={() => handleTabChange(3)}
          >
            <span className="mr-2">{icons.history}</span> History
          </button>
          <button 
            className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 ${activeTab === 4 ? 'border-blue-500 text-blue-500' : 'border-transparent hover:text-gray-300'}`}
            onClick={() => handleTabChange(4)}
          >
            <span className="mr-2">{icons.settings}</span> Settings
          </button>
        </div>
      </div>

      {activeTab === 0 && <OverviewTab />}
      {activeTab === 1 && <IssuesTab />}
      {activeTab === 2 && <RecommendationsTab />}
      {activeTab === 3 && <HistoryTab />}
      {activeTab === 4 && <SettingsTab />}
    </div>
  );
};

export default HealthMonitor;