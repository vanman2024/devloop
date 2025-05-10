import React, { useState, useEffect } from 'react';
import StructureValidation from './StructureValidation';
import DependenciesValidation from './DependenciesValidation';
import MemoryValidationMonitor from '../MemoryValidationMonitor';
import TestPassRate from './TestPassRate';

const SystemValidation = () => {
  const [activeTab, setActiveTab] = useState('structure');
  const [loading, setLoading] = useState(false);
  const [lastRunTime, setLastRunTime] = useState(null);
  
  // Run all validations
  const handleRunAllValidations = () => {
    setLoading(true);
    setLastRunTime(new Date());
    
    // In a real implementation, this would call APIs to run each validation
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">System Validation</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={handleRunAllValidations}
          disabled={loading}
        >
          {loading ? 'Running Validations...' : 'Run All Validations'}
        </button>
      </div>
      
      <div className="p-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'structure' ? 'border-blue-500 text-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveTab('structure')}
          >
            Structure Validation
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'memory' ? 'border-blue-500 text-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveTab('memory')}
          >
            Memory Validation
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'dependencies' ? 'border-blue-500 text-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveTab('dependencies')}
          >
            Dependencies Validation
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              activeTab === 'testing' ? 'border-blue-500 text-blue-400' : 'border-transparent'
            }`}
            onClick={() => setActiveTab('testing')}
          >
            Test Validation
          </button>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'structure' && <StructureValidation />}
        {activeTab === 'memory' && <MemoryValidationMonitor refreshInterval={30000} />}
        {activeTab === 'dependencies' && <DependenciesValidation />}
        {activeTab === 'testing' && <TestPassRate />}
        
        {lastRunTime && (
          <div className="mt-4 text-right text-sm text-gray-500">
            Last validation run: {lastRunTime.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemValidation;