import React, { useState } from 'react';

const QuickActionModal = ({ action, onClose, onExecute }) => {
  const [loading, setLoading] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [options, setOptions] = useState({});
  
  // Define action configurations for different action types
  const actionConfigs = {
    runHealthCheck: {
      title: 'Run Health Check',
      description: 'Run a comprehensive system health check to identify issues and generate a detailed report.',
      icon: '🔍',
      confirmText: 'Run Check',
      color: 'blue',
      command: './system-core/scripts/maintenance/report-devloop-health.sh',
      options: [
        { id: 'categories', label: 'Categories', type: 'multiselect', 
          choices: ['structure', 'memory', 'orphans', 'dependencies', 'permissions', 'core'],
          default: ['structure', 'memory', 'orphans', 'dependencies', 'permissions', 'core'] },
        { id: 'fix', label: 'Auto-fix Issues', type: 'toggle', default: false },
        { id: 'reportFormat', label: 'Report Format', type: 'select', 
          choices: ['html', 'json', 'markdown'], default: 'html' }
      ]
    },
    fixAllIssues: {
      title: 'Fix All Issues',
      description: 'Attempt to automatically fix all detected issues in the system. This may take several minutes to complete.',
      icon: '🛠️',
      confirmText: 'Fix Issues',
      color: 'green',
      command: './system-core/scripts/maintenance/fix-all-issues.sh',
      options: [
        { id: 'categories', label: 'Categories', type: 'multiselect', 
          choices: ['structure', 'memory', 'orphans', 'dependencies', 'permissions', 'core'],
          default: ['structure', 'memory', 'orphans', 'dependencies', 'permissions', 'core'] },
        { id: 'backup', label: 'Create Backup', type: 'toggle', default: true },
        { id: 'dryRun', label: 'Dry Run', type: 'toggle', default: false }
      ]
    },
    optimizeSystem: {
      title: 'Optimize System',
      description: 'Optimize the system by cleaning up temporary files, optimizing memory files, and improving overall performance.',
      icon: '⚡',
      confirmText: 'Optimize System',
      color: 'purple',
      command: './system-core/scripts/maintenance/optimize-system.sh',
      options: [
        { id: 'cleanTemp', label: 'Clean Temporary Files', type: 'toggle', default: true },
        { id: 'optimizeMemory', label: 'Optimize Memory Files', type: 'toggle', default: true },
        { id: 'compressLogs', label: 'Compress Old Logs', type: 'toggle', default: true }
      ]
    },
    restartServices: {
      title: 'Restart Services',
      description: 'Restart core system services to apply changes or resolve issues with running services.',
      icon: '🔄',
      confirmText: 'Restart Services',
      color: 'yellow',
      command: './system-core/scripts/maintenance/restart-services.sh',
      options: [
        { id: 'services', label: 'Services', type: 'multiselect', 
          choices: ['ui', 'memory-api', 'ai-bridge', 'project-tracker'], 
          default: ['ui', 'memory-api', 'ai-bridge', 'project-tracker'] },
        { id: 'force', label: 'Force Restart', type: 'toggle', default: false }
      ]
    },
    backupSystem: {
      title: 'Backup System',
      description: 'Create a full system backup of critical files and configurations.',
      icon: '💾',
      confirmText: 'Create Backup',
      color: 'indigo',
      command: './system-core/scripts/maintenance/backup-system.sh',
      options: [
        { id: 'scope', label: 'Backup Scope', type: 'select', 
          choices: ['full', 'config', 'memory'], default: 'full' },
        { id: 'compress', label: 'Compress Backup', type: 'toggle', default: true },
        { id: 'includeHistory', label: 'Include History Files', type: 'toggle', default: false }
      ]
    },
    generateReports: {
      title: 'Generate Reports',
      description: 'Generate comprehensive system reports including progress, health, and analytics.',
      icon: '📊',
      confirmText: 'Generate Reports',
      color: 'orange',
      command: './system-core/scripts/devloop/generate-progress-reports.sh',
      options: [
        { id: 'reportTypes', label: 'Report Types', type: 'multiselect', 
          choices: ['progress', 'health', 'analytics', 'tests'], 
          default: ['progress', 'health'] },
        { id: 'format', label: 'Format', type: 'select', 
          choices: ['html', 'markdown', 'json'], default: 'html' }
      ]
    }
  };
  
  // Use the correct config based on the action type
  const config = actionConfigs[action] || {
    title: 'Unknown Action',
    description: 'This action is not configured properly.',
    icon: '❓',
    confirmText: 'Execute',
    color: 'gray',
    options: []
  };
  
  // Initialize options with defaults
  React.useEffect(() => {
    const defaultOptions = {};
    config.options.forEach(option => {
      defaultOptions[option.id] = option.default;
    });
    setOptions(defaultOptions);
  }, [action]);
  
  // Handle option changes
  const handleOptionChange = (id, value) => {
    setOptions(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  // Handle multiselect changes
  const handleMultiselectChange = (id, value) => {
    setOptions(prev => {
      const currentSelections = prev[id] || [];
      
      // If the value is already selected, remove it
      if (currentSelections.includes(value)) {
        return {
          ...prev,
          [id]: currentSelections.filter(item => item !== value)
        };
      } 
      // Otherwise add it
      else {
        return {
          ...prev,
          [id]: [...currentSelections, value]
        };
      }
    });
  };
  
  // Handle action execution
  const handleExecute = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, this would execute the command with the selected options
      console.log(`Executing: ${config.command} with options:`, options);
      
      // Simulate API request delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the onExecute callback with the action and options
      if (onExecute) {
        onExecute(action, options);
      }
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setLoading(false);
      onClose();
    }
  };
  
  // Get color classes based on the config
  const getColorClasses = () => {
    switch (config.color) {
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'green':
        return 'bg-green-600 hover:bg-green-700';
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'yellow':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'indigo':
        return 'bg-indigo-600 hover:bg-indigo-700';
      case 'orange':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'red':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Modal header */}
        <div className="border-b border-gray-700 px-6 py-4 flex items-center">
          <div className="text-2xl mr-3">{config.icon}</div>
          <h3 className="text-lg font-semibold">{config.title}</h3>
        </div>
        
        {/* Modal content */}
        <div className="p-6">
          <p className="text-gray-300 mb-4">{config.description}</p>
          
          {/* Render options based on advanced mode toggle */}
          {config.options.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Options</h4>
                {config.options.length > 3 && (
                  <button 
                    className="text-xs text-blue-400 hover:text-blue-300"
                    onClick={() => setAdvanced(!advanced)}
                  >
                    {advanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {config.options.slice(0, advanced ? undefined : 3).map((option) => (
                  <div key={option.id} className="mb-3">
                    <label className="block text-sm font-medium mb-2">{option.label}</label>
                    
                    {/* Render different input types */}
                    {option.type === 'toggle' && (
                      <div className="flex items-center">
                        <button
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                            options[option.id] ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                          onClick={() => handleOptionChange(option.id, !options[option.id])}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              options[option.id] ? 'translate-x-6' : 'translate-x-1'
                            }`} 
                          />
                        </button>
                        <span className="ml-2 text-sm text-gray-300">
                          {options[option.id] ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )}
                    
                    {option.type === 'select' && (
                      <select 
                        className="w-full bg-gray-700 border-gray-600 rounded-md text-sm py-2 px-3"
                        value={options[option.id] || option.default}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                      >
                        {option.choices.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice.charAt(0).toUpperCase() + choice.slice(1)}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {option.type === 'multiselect' && (
                      <div className="flex flex-wrap gap-2">
                        {option.choices.map((choice) => (
                          <button
                            key={choice}
                            className={`text-xs px-3 py-1 rounded-full ${
                              (options[option.id] || []).includes(choice) 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-700 text-gray-300'
                            }`}
                            onClick={() => handleMultiselectChange(option.id, choice)}
                          >
                            {choice.charAt(0).toUpperCase() + choice.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Command preview (disabled for now) */}
          {advanced && (
            <div className="mb-4 bg-black rounded-md p-3">
              <div className="text-xs text-gray-400 mb-1">Command Preview:</div>
              <code className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                {config.command} {Object.entries(options).map(([key, value]) => {
                  if (Array.isArray(value)) {
                    return `--${key}=${value.join(',')}`;
                  } else if (typeof value === 'boolean') {
                    return value ? `--${key}` : '';
                  } else {
                    return `--${key}=${value}`;
                  }
                }).filter(Boolean).join(' ')}
              </code>
            </div>
          )}
          
          {/* Warning for destructive actions */}
          {['fixAllIssues', 'restartServices'].includes(action) && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-md p-3 mb-4">
              <div className="flex items-start">
                <div className="text-red-400 mr-2">⚠️</div>
                <p className="text-sm text-red-300">
                  This action may affect running systems or modify files. Ensure you have backups before proceeding.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Modal footer */}
        <div className="border-t border-gray-700 px-6 py-4 flex justify-end space-x-3">
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`text-white py-2 px-4 rounded text-sm ${getColorClasses()}`}
            onClick={handleExecute}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              config.confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;