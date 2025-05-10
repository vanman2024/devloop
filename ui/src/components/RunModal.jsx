import React, { useState } from 'react';

const RunModal = ({ isOpen, onClose, featureId, featureName }) => {
  const [selectedOption, setSelectedOption] = useState('standard');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Run options for different feature types
  const runOptions = [
    {
      id: 'standard',
      icon: '▶',
      title: 'Standard Run',
      description: 'Execute the feature with default parameters and configurations.'
    },
    {
      id: 'debug',
      icon: '🐞',
      title: 'Debug Mode',
      description: 'Run with additional logging and validation checks.'
    },
    {
      id: 'test',
      icon: '✓',
      title: 'Test Suite',
      description: 'Execute all tests associated with this feature.'
    }
  ];

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const executeRun = () => {
    setIsRunning(true);
    setShowLogs(true);
    setLogs([]);

    // Clear and add logs progressively
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Initial log
    addLogEntry(`<span class="text-gray-400">[${timestamp}]</span> <span class="text-blue-500">Starting ${selectedOption} run for ${featureName}...</span>`);
    
    // Different logs based on run type
    setTimeout(() => {
      if (selectedOption === 'standard') {
        standardRunLogs(timestamp);
      } else if (selectedOption === 'debug') {
        debugRunLogs(timestamp);
      } else if (selectedOption === 'test') {
        testRunLogs(timestamp);
      }
    }, 500);
  };

  const addLogEntry = (logHtml) => {
    setLogs(prevLogs => [...prevLogs, logHtml]);
  };

  const standardRunLogs = (timestamp) => {
    const logTimings = [
      { delay: 300, message: `<span class="text-gray-400">[${timestamp}]</span> Loading configuration...` },
      { delay: 800, message: `<span class="text-gray-400">[${timestamp}]</span> Initializing components...` },
      { delay: 1500, message: `<span class="text-gray-400">[${timestamp}]</span> Running feature operations...` },
      { delay: 2500, message: `<span class="text-gray-400">[${timestamp}]</span> <span class="text-green-500">Feature executed successfully.</span>` }
    ];
    
    processLogSequence(logTimings, 0);
  };

  const debugRunLogs = (timestamp) => {
    const logTimings = [
      { delay: 300, message: `<span class="text-gray-400">[${timestamp}]</span> Debug mode enabled.` },
      { delay: 800, message: `<span class="text-gray-400">[${timestamp}]</span> Loading configuration with verbose logging...` },
      { delay: 1200, message: `<span class="text-gray-400">[${timestamp}]</span> Config validation: PASSED` },
      { delay: 1500, message: `<span class="text-gray-400">[${timestamp}]</span> <span class="text-yellow-500">Warning: Deprecated parameter 'legacy_mode' found.</span>` },
      { delay: 2000, message: `<span class="text-gray-400">[${timestamp}]</span> Component initialization with additional checks...` },
      { delay: 2500, message: `<span class="text-gray-400">[${timestamp}]</span> Memory usage: 245MB` },
      { delay: 3000, message: `<span class="text-gray-400">[${timestamp}]</span> <span class="text-green-500">Feature executed successfully in debug mode.</span>` }
    ];
    
    processLogSequence(logTimings, 0);
  };

  const testRunLogs = (timestamp) => {
    const logTimings = [
      { delay: 300, message: `<span class="text-gray-400">[${timestamp}]</span> Loading test suite for ${featureName}...` },
      { delay: 800, message: `<span class="text-gray-400">[${timestamp}]</span> Found 5 test cases.` },
      { delay: 1200, message: `<span class="text-gray-400">[${timestamp}]</span> Running test_basic_initialization: <span class="text-green-500">PASSED</span>` },
      { delay: 1600, message: `<span class="text-gray-400">[${timestamp}]</span> Running test_invalid_config: <span class="text-green-500">PASSED</span>` },
      { delay: 2000, message: `<span class="text-gray-400">[${timestamp}]</span> Running test_missing_parameters: <span class="text-green-500">PASSED</span>` },
      { delay: 2400, message: `<span class="text-gray-400">[${timestamp}]</span> Running test_performance_benchmark: <span class="text-yellow-500">WARNING</span>` },
      { delay: 2500, message: `<span class="text-gray-400">[${timestamp}]</span> Performance threshold exceeded by 15ms, but within acceptable range.` },
      { delay: 2900, message: `<span class="text-gray-400">[${timestamp}]</span> Running test_edge_cases: <span class="text-green-500">PASSED</span>` },
      { delay: 3300, message: `<span class="text-gray-400">[${timestamp}]</span> <span class="text-green-500">All tests completed. 4 passed, 1 warning, 0 failed.</span>` }
    ];
    
    processLogSequence(logTimings, 0);
  };

  const processLogSequence = (logTimings, index) => {
    if (index >= logTimings.length) {
      setIsRunning(false);
      return;
    }
    
    const currentLog = logTimings[index];
    setTimeout(() => {
      addLogEntry(currentLog.message);
      processLogSequence(logTimings, index + 1);
    }, currentLog.delay);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-lg w-[600px] flex flex-col overflow-hidden border border-gray-700">
        <div className="bg-blue-700 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <div className="font-semibold text-xl text-white">Run Feature: {featureName}</div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <div className="space-y-2 mb-4">
            {runOptions.map(option => (
              <div 
                key={option.id}
                className={`flex items-start p-3 border rounded-md cursor-pointer transition ${
                  selectedOption === option.id
                    ? 'border-blue-500 bg-gray-700'
                    : 'border-gray-700 hover:bg-gray-700'
                }`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="w-6 h-6 bg-blue-700 rounded mr-3 flex items-center justify-center text-white">
                  {option.icon}
                </div>
                <div>
                  <div className="font-medium text-white">{option.title}</div>
                  <div className="text-sm text-gray-400">{option.description}</div>
                </div>
              </div>
            ))}
          </div>
          
          {showLogs && (
            <div className="bg-gray-900 p-4 rounded-md font-mono text-xs text-gray-300 max-h-52 overflow-y-auto mb-4">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className="mb-1 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: log }}
                />
              ))}
            </div>
          )}
          
          <button
            onClick={executeRun}
            disabled={isRunning}
            className={`w-full py-2 rounded-md font-medium text-white transition ${
              isRunning
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-600'
            }`}
          >
            {isRunning ? 'Running...' : 'Execute Run'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RunModal;