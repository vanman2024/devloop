import React, { useState, useEffect } from 'react';

const SettingsPanel = () => {
  const [settings, setSettings] = useState({
    checkFrequency: 'weekly',
    alertThreshold: '0-75',
    reportFormat: 'html',
    notifications: true,
    autoFix: true,
    customChecks: false,
    categoriesEnabled: {
      structure: true,
      memory: true,
      orphans: true,
      dependencies: true,
      permissions: true,
      core: true,
      tests: true
    },
    retentionPeriod: '90days',
    healthScoreWeights: {
      structure: 20,
      memory: 15,
      orphans: 15,
      dependencies: 20,
      tests: 25,
      other: 5
    }
  });
  
  const [saveStatus, setSaveStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle settings changes
  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle category toggle
  const handleCategoryToggle = (category) => {
    setSettings(prev => ({
      ...prev,
      categoriesEnabled: {
        ...prev.categoriesEnabled,
        [category]: !prev.categoriesEnabled[category]
      }
    }));
  };

  // Handle weight change
  const handleWeightChange = (category, value) => {
    setSettings(prev => {
      const newWeights = {
        ...prev.healthScoreWeights,
        [category]: parseInt(value, 10)
      };
      
      return {
        ...prev,
        healthScoreWeights: newWeights
      };
    });
  };

  // Save settings
  const handleSave = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('success');
      setLoading(false);
      
      // Clear the status message after a delay
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }, 1000);
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings({
      checkFrequency: 'weekly',
      alertThreshold: '0-75',
      reportFormat: 'html',
      notifications: true,
      autoFix: true,
      customChecks: false,
      categoriesEnabled: {
        structure: true,
        memory: true,
        orphans: true,
        dependencies: true,
        permissions: true,
        core: true,
        tests: true
      },
      retentionPeriod: '90days',
      healthScoreWeights: {
        structure: 20,
        memory: 15,
        orphans: 15,
        dependencies: 20,
        tests: 25,
        other: 5
      }
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Health Check Settings</h3>
        {saveStatus === 'success' && (
          <div className="text-sm text-green-400">Settings saved successfully!</div>
        )}
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monitoring Settings */}
          <div>
            <h4 className="text-lg font-medium mb-4">Monitoring Settings</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Check Frequency</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm"
                  value={settings.checkFrequency}
                  onChange={(e) => handleChange('checkFrequency', e.target.value)}
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="manual">Manual Only</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  How often health checks should run automatically.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Alert Threshold</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm"
                  value={settings.alertThreshold}
                  onChange={(e) => handleChange('alertThreshold', e.target.value)}
                >
                  <option value="0-50">Critical Only (0-50)</option>
                  <option value="0-75">Warning & Critical (0-75)</option>
                  <option value="0-99">All Issues (0-99)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Health score threshold for sending alerts.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Report Format</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm"
                  value={settings.reportFormat}
                  onChange={(e) => handleChange('reportFormat', e.target.value)}
                >
                  <option value="text">Text Only</option>
                  <option value="html">HTML</option>
                  <option value="json">JSON</option>
                  <option value="all">All Formats</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Format for generated health check reports.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Data Retention Period</label>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm"
                  value={settings.retentionPeriod}
                  onChange={(e) => handleChange('retentionPeriod', e.target.value)}
                >
                  <option value="30days">30 Days</option>
                  <option value="90days">90 Days</option>
                  <option value="180days">180 Days</option>
                  <option value="365days">1 Year</option>
                  <option value="forever">Keep Forever</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  How long to keep historical health check data.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-2">Options</label>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="notifications" 
                    className="mr-2 rounded bg-gray-700 border-gray-600"
                    checked={settings.notifications}
                    onChange={() => handleChange('notifications', !settings.notifications)}
                  />
                  <label htmlFor="notifications" className="text-sm">Enable Notifications</label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="autoFix" 
                    className="mr-2 rounded bg-gray-700 border-gray-600"
                    checked={settings.autoFix}
                    onChange={() => handleChange('autoFix', !settings.autoFix)}
                  />
                  <label htmlFor="autoFix" className="text-sm">Auto-fix Minor Issues</label>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="customChecks" 
                    className="mr-2 rounded bg-gray-700 border-gray-600"
                    checked={settings.customChecks}
                    onChange={() => handleChange('customChecks', !settings.customChecks)}
                  />
                  <label htmlFor="customChecks" className="text-sm">Include Custom Checks</label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Validation Categories & Health Score Weights */}
          <div>
            <h4 className="text-lg font-medium mb-4">Health Check Categories</h4>
            
            <div className="space-y-4">
              <div className="bg-gray-900 p-3 rounded-md space-y-2">
                {Object.entries(settings.categoriesEnabled).map(([category, enabled]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        id={`category-${category}`} 
                        className="mr-2 rounded bg-gray-700 border-gray-600"
                        checked={enabled}
                        onChange={() => handleCategoryToggle(category)}
                      />
                      <label htmlFor={`category-${category}`} className="text-sm capitalize">{category}</label>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 mr-2">Weight:</span>
                      <select 
                        className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs"
                        value={settings.healthScoreWeights[category] || 0}
                        onChange={(e) => handleWeightChange(category, e.target.value)}
                      >
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40].map(val => (
                          <option key={val} value={val}>{val}%</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Current Health Score Formula</h4>
                <div className="bg-gray-900 p-3 rounded-md">
                  <p className="text-xs text-gray-400 font-mono">
                    Health Score = 
                    {Object.entries(settings.healthScoreWeights)
                      .filter(([_, weight]) => weight > 0)
                      .map(([category, weight], idx, arr) => 
                        `${idx > 0 ? ' + ' : ' '}(${category} score × ${weight}%)`
                      )
                      .join('')}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Custom Scripts</h4>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm font-mono h-24"
                  placeholder="# Add custom validation scripts here (Python)"
                  disabled={!settings.customChecks}
                >
                </textarea>
                <p className="text-xs text-gray-400 mt-1">
                  Custom validation scripts (requires "Include Custom Checks" option).
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Schedule Settings */}
        <div className="mt-6">
          <h4 className="text-lg font-medium mb-4">Scheduled Checks</h4>
          
          <div className="bg-gray-900 p-4 rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="py-2 px-3 text-left">Day</th>
                    <th className="py-2 px-3 text-left">Time</th>
                    <th className="py-2 px-3 text-left">Categories</th>
                    <th className="py-2 px-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr>
                    <td className="py-2 px-3">Monday</td>
                    <td className="py-2 px-3">09:00 AM</td>
                    <td className="py-2 px-3">All</td>
                    <td className="py-2 px-3">
                      <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                        Edit
                      </button>
                      <button className="text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded">
                        Remove
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Thursday</td>
                    <td className="py-2 px-3">02:00 PM</td>
                    <td className="py-2 px-3">Structure, Memory, Orphans</td>
                    <td className="py-2 px-3">
                      <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                        Edit
                      </button>
                      <button className="text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded">
                        Remove
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <button className="mt-3 bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-3 rounded">
              Add Scheduled Check
            </button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 flex justify-between">
          <button 
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
          
          <div>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded mr-3"
              onClick={() => window.alert('This would clear all historical health check data')}
            >
              Clear All History
            </button>
            
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;