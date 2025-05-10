import React, { useState, useEffect } from 'react';

const TestPassRate = () => {
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState({
    featurePassRate: 78,
    modulePassRate: 65,
    failingTests: [
      { id: 'feature-1023', name: 'Authentication', failedTests: 3, totalTests: 12, reason: 'Input validation error' },
      { id: 'feature-2045', name: 'API Integration', failedTests: 2, totalTests: 8, reason: 'Timeout errors' },
      { id: 'module-payment', name: 'Payment System', failedTests: 5, totalTests: 18, reason: 'Security validation failed' },
      { id: 'feature-3078', name: 'User Profiles', failedTests: 1, totalTests: 6, reason: 'Database connection issue' },
      { id: 'module-dashboard', name: 'Dashboard', failedTests: 3, totalTests: 15, reason: 'Wrong data format' }
    ]
  });

  const fetchTestData = async () => {
    setLoading(true);
    try {
      // This would be an API call in a real application
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // No changes to the mock data for demo purposes
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestData();
  }, []);

  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Test Pass Rate Metrics</h3>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
          onClick={fetchTestData}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Refresh Test Data'}
        </button>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Loading test data...</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Feature Pass Rate */}
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-lg font-medium mb-3 flex items-center">
                  <span className="mr-2">🧩</span>
                  Feature Test Pass Rate
                </h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Pass Rate:</span>
                  <span className={`text-xl font-bold ${getColorClass(testData.featurePassRate)}`}>
                    {testData.featurePassRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                  <div 
                    className={`h-2.5 rounded-full ${getProgressBarColor(testData.featurePassRate)}`} 
                    style={{ width: `${testData.featurePassRate}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  {testData.featurePassRate >= 90 
                    ? 'Great! Most features are passing their tests.' 
                    : testData.featurePassRate >= 75 
                    ? 'Acceptable, but there are some failing tests to fix.' 
                    : 'Critical: Many features have failing tests.'
                  }
                </p>
              </div>
              
              {/* Module Pass Rate */}
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="text-lg font-medium mb-3 flex items-center">
                  <span className="mr-2">📦</span>
                  Modules with 100% Passing Features
                </h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Success Rate:</span>
                  <span className={`text-xl font-bold ${getColorClass(testData.modulePassRate)}`}>
                    {testData.modulePassRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                  <div 
                    className={`h-2.5 rounded-full ${getProgressBarColor(testData.modulePassRate)}`} 
                    style={{ width: `${testData.modulePassRate}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-3">
                  {testData.modulePassRate >= 90 
                    ? 'Excellent! Most modules have all features passing.' 
                    : testData.modulePassRate >= 75 
                    ? 'Some modules have features with failing tests.' 
                    : 'Many modules have features with failing tests.'
                  }
                </p>
              </div>
            </div>
            
            {/* Failing Tests List */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="mr-2">❌</span>
                Failing Tests
              </h4>
              
              {testData.failingTests.length === 0 ? (
                <div className="bg-green-500/10 text-green-400 p-4 rounded-md text-center">
                  <p className="font-medium">All tests are passing! 🎉</p>
                  <p className="text-sm mt-1">Great job maintaining test quality.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testData.failingTests.map((item, index) => (
                    <div key={index} className="bg-gray-800 p-4 rounded-md border-l-4 border-red-500">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                        <div>
                          <div className="font-medium flex items-center">
                            <span>{item.id}</span>
                            <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-md text-xs text-gray-300">
                              {item.name}
                            </span>
                          </div>
                          <div className="text-sm text-red-400 mt-1">
                            Issue: {item.reason}
                          </div>
                        </div>
                        <div>
                          <span className="text-red-400 text-sm font-medium">
                            {item.failedTests} / {item.totalTests} tests failing
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Pass rate</span>
                          <span>{Math.round(((item.totalTests - item.failedTests) / item.totalTests) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-green-500" 
                            style={{ width: `${((item.totalTests - item.failedTests) / item.totalTests) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          View Tests
                        </button>
                        <button className="px-2 py-1 bg-gray-700 text-white text-xs rounded">
                          Fix Issues
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Explanation Box */}
            <div className="mt-6 bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-3 flex items-center">
                <span className="mr-2">💡</span>
                About Test Quality
              </h4>
              <div className="text-sm text-gray-400">
                <p className="mb-2">
                  <strong className="text-white">What do these metrics mean?</strong>
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-gray-300">Feature Test Pass Rate</strong> shows how many 
                    individual features are passing all their tests. Higher is better.
                  </li>
                  <li>
                    <strong className="text-gray-300">Modules with 100% Passing Features</strong> shows 
                    how many modules have all their features passing tests completely. This is a stricter metric.
                  </li>
                  <li>
                    <strong className="text-gray-300">Failing Tests</strong> highlights specific issues
                    that need attention. Each failing test can potentially block dependent features.
                  </li>
                </ul>
                <p className="mt-3">
                  Aim for at least 85% pass rates to ensure system stability and reliability.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TestPassRate;