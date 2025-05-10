import React, { useState } from 'react';

/**
 * Integration Sync Card Component
 * 
 * Displays information about the Integration Sync feature and provides
 * controls for synchronization and validation operations.
 */
const IntegrationSyncCard = ({
  feature, // Feature object containing basic info
  onSync,  // Function to trigger sync operation
  onValidate, // Function to validate system consistency
  onFix    // Function to fix inconsistencies
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(feature?.lastSyncTime || null);
  const [validationStatus, setValidationStatus] = useState(feature?.validationStatus || 'unknown');
  const [syncResults, setSyncResults] = useState(null);
  
  // Status styling
  const statusColors = {
    'consistent': 'bg-green-500',
    'inconsistent': 'bg-red-500',
    'warning': 'bg-yellow-500',
    'unknown': 'bg-gray-500'
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  // Handle sync operation
  const handleSync = async () => {
    try {
      setIsLoading(true);
      const results = await onSync();
      setSyncResults(results);
      setLastSyncTime(new Date().toISOString());
      if (results.validation) {
        setValidationStatus(results.validation.is_consistent ? 'consistent' : 'inconsistent');
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle validation
  const handleValidate = async () => {
    try {
      setIsLoading(true);
      const results = await onValidate();
      setValidationStatus(results.is_consistent ? 'consistent' : 'inconsistent');
      setSyncResults({ validation: results });
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle fix operation
  const handleFix = async () => {
    try {
      setIsLoading(true);
      const results = await onFix();
      setValidationStatus('consistent');
      setSyncResults({ fixes: results });
    } catch (error) {
      console.error('Fix error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-gray-800 border-l-4 border-blue-500 rounded-lg shadow-md p-4">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{feature.name}</h3>
          <div className="text-xs text-gray-400 font-mono">{feature.id}</div>
        </div>
        <div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusColors[validationStatus]}`}>
            {validationStatus.charAt(0).toUpperCase() + validationStatus.slice(1)}
          </span>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-gray-300 mb-4">{feature.description}</p>
      
      {/* Sync Status */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <div className="text-gray-400">
          <span className="font-semibold">Last Sync:</span> {formatDate(lastSyncTime)}
        </div>
        <div className="text-gray-400">
          <span className="font-semibold">Status:</span> {feature.status}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={handleSync}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Syncing...' : 'Sync Components'}
        </button>
        <button 
          onClick={handleValidate}
          disabled={isLoading}
          className="px-3 py-1 bg-yellow-700 text-white rounded-md text-sm hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Validate
        </button>
        {validationStatus === 'inconsistent' && (
          <button 
            onClick={handleFix}
            disabled={isLoading}
            className="px-3 py-1 bg-red-700 text-white rounded-md text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fix Issues
          </button>
        )}
      </div>
      
      {/* Results Panel (conditionally rendered) */}
      {syncResults && (
        <div className="bg-gray-700 rounded-md p-3 mt-2 text-sm max-h-40 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
             style={{
               overflowY: 'auto',
               msOverflowStyle: 'scrollbar',
               scrollbarWidth: 'thin',
               scrollbarColor: '#4B5563 #1F2937'
             }}>
          <h4 className="font-semibold text-white mb-2">Last Operation Results:</h4>
          
          {/* Validation Results */}
          {syncResults.validation && (
            <div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${syncResults.validation.is_consistent ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-300">
                  System is {syncResults.validation.is_consistent ? 'consistent' : 'inconsistent'}
                </span>
              </div>
              
              {/* Show issues if there are any */}
              {syncResults.validation.issues && syncResults.validation.issues.length > 0 && (
                <div className="mt-2">
                  <div className="text-gray-300">Issues found:</div>
                  <ul className="list-disc list-inside ml-2 text-gray-400">
                    {syncResults.validation.issues.slice(0, 3).map((issue, idx) => (
                      <li key={idx} className="truncate">{issue.message}</li>
                    ))}
                    {syncResults.validation.issues.length > 3 && (
                      <li className="text-gray-500">
                        +{syncResults.validation.issues.length - 3} more issues
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Fix Results */}
          {syncResults.fixes && (
            <div>
              <div className="text-gray-300">
                Fixed {syncResults.fixes.fixed?.length || 0} issues
              </div>
              {syncResults.fixes.fixed && syncResults.fixes.fixed.length > 0 && (
                <ul className="list-disc list-inside ml-2 text-gray-400">
                  {syncResults.fixes.fixed.slice(0, 3).map((fix, idx) => (
                    <li key={idx} className="truncate">{fix.fix}</li>
                  ))}
                  {syncResults.fixes.fixed.length > 3 && (
                    <li className="text-gray-500">
                      +{syncResults.fixes.fixed.length - 3} more fixes
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          
          {/* Regular Sync Results */}
          {syncResults.updates && (
            <div>
              <div className="text-gray-300">
                Updated {Object.keys(syncResults.updates).length} components
              </div>
              <ul className="list-disc list-inside ml-2 text-gray-400">
                {Object.keys(syncResults.updates).slice(0, 3).map((key) => (
                  <li key={key} className="truncate">
                    {key}: {syncResults.updates[key].success ? 'Success' : 'Failed'}
                  </li>
                ))}
                {Object.keys(syncResults.updates).length > 3 && (
                  <li className="text-gray-500">
                    +{Object.keys(syncResults.updates).length - 3} more updates
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationSyncCard;