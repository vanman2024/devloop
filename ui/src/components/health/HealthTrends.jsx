import React, { useState, useEffect } from 'react';

const HealthTrends = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('10days');
  const [trendData, setTrendData] = useState({
    healthHistory: [
      { date: '2025-04-15', score: 68 },
      { date: '2025-04-16', score: 72 },
      { date: '2025-04-17', score: 75 },
      { date: '2025-04-18', score: 74 },
      { date: '2025-04-19', score: 78 },
      { date: '2025-04-20', score: 82 },
      { date: '2025-04-21', score: 79 },
      { date: '2025-04-22', score: 83 },
      { date: '2025-04-23', score: 81 },
      { date: '2025-04-24', score: 78 }
    ],
    driftIncidents: [
      { date: '2025-04-16', count: 3, severity: 'medium' },
      { date: '2025-04-18', count: 1, severity: 'low' },
      { date: '2025-04-21', count: 4, severity: 'high' },
      { date: '2025-04-24', count: 2, severity: 'medium' }
    ],
    orphanTrend: [
      { date: '2025-04-15', count: 32 },
      { date: '2025-04-17', count: 29 },
      { date: '2025-04-19', count: 26 },
      { date: '2025-04-21', count: 28 },
      { date: '2025-04-23', count: 26 }
    ],
    memoryFileSizes: [
      { date: '2025-04-15', size: 3.2 },
      { date: '2025-04-17', size: 3.4 },
      { date: '2025-04-19', size: 3.7 },
      { date: '2025-04-21', size: 3.8 },
      { date: '2025-04-23', size: 4.1 }
    ]
  });

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      // This would be an API call in a real application
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here we would update the data based on the selected time range
      // For demo purposes we'll just keep the same data
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, [timeRange]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Helper function to get color based on health score
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Helper function to get color based on severity
  const getSeverityColor = (severity) => {
    if (severity === 'low') return 'bg-yellow-500';
    if (severity === 'medium') return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Historical Drift & Health Trends</h3>
        <div className="flex items-center">
          <select 
            className="bg-gray-700 border-0 text-sm rounded-md px-2 py-1 mr-2"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7days">Last 7 days</option>
            <option value="10days">Last 10 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center"
            onClick={fetchTrendData}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Loading trend data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Health Score Chart */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Health Score Over Time
              </h4>
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="h-48 relative">
                  {/* Simple chart visualization */}
                  <div className="absolute inset-0 flex items-end">
                    {trendData.healthHistory.map((point, index) => (
                      <div 
                        key={index}
                        className="h-full flex-1 flex flex-col justify-end mx-0.5"
                        title={`${point.date}: ${point.score}`}
                      >
                        <div 
                          className={`rounded-t w-full ${getScoreColor(point.score)}`}
                          style={{ height: `${point.score}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart scale */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                    <span>100</span>
                    <span>75</span>
                    <span>50</span>
                    <span>25</span>
                    <span>0</span>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                  <div className="flex text-xs text-gray-500">
                    {trendData.healthHistory.map((point, index) => (
                      <div key={index} className="flex-1 text-center">
                        {index % 2 === 0 && formatDate(point.date)}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 flex justify-center gap-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span className="text-xs text-gray-400">Good (80+)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                    <span className="text-xs text-gray-400">Warning (70-79)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span className="text-xs text-gray-400">Critical (&lt;70)</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-400">
                <p>
                  <strong className="text-white">Analysis:</strong> Health score is 
                  {trendData.healthHistory[trendData.healthHistory.length - 1].score > 
                   trendData.healthHistory[0].score ? ' improving' : ' declining'} 
                  over time. Current score is rated as 
                  {trendData.healthHistory[trendData.healthHistory.length - 1].score >= 80 ? ' good' : 
                   trendData.healthHistory[trendData.healthHistory.length - 1].score >= 70 ? ' acceptable' : 
                   ' needs attention'}.
                </p>
              </div>
            </div>
            
            {/* Drift Incidents Chart */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="mr-2">🚨</span>
                Drift Incidents by Date
              </h4>
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="h-32 flex items-end justify-around">
                  {trendData.driftIncidents.map((incident, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className={`w-12 rounded-t ${getSeverityColor(incident.severity)}`} 
                        style={{ height: `${incident.count * 15}px` }}
                        title={`${incident.date}: ${incident.count} incidents (${incident.severity} severity)`}
                      ></div>
                      <div className="text-xs text-gray-500 mt-2">
                        {formatDate(incident.date)}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 flex justify-center gap-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                    <span className="text-xs text-gray-400">Low Severity</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
                    <span className="text-xs text-gray-400">Medium Severity</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span className="text-xs text-gray-400">High Severity</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-400">
                <p>
                  <strong className="text-white">What is drift?</strong> Drift happens when your system's 
                  actual state differs from its expected state, like when files are modified outside the normal process
                  or dependencies change unexpectedly.
                </p>
              </div>
            </div>
            
            {/* Orphan Features Chart */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="mr-2">👻</span>
                Orphaned Features Trend
              </h4>
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="h-32 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 50">
                    {/* Grid lines */}
                    <line x1="0" y1="0" x2="100" y2="0" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#4B5563" strokeWidth="0.5" />
                    
                    {/* Line chart */}
                    <polyline
                      points={trendData.orphanTrend.map((point, i) => {
                        const x = (i / (trendData.orphanTrend.length - 1)) * 100;
                        const max = Math.max(...trendData.orphanTrend.map(p => p.count));
                        const y = 50 - ((point.count / max) * 45);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />
                    
                    {/* Data points */}
                    {trendData.orphanTrend.map((point, i) => {
                      const x = (i / (trendData.orphanTrend.length - 1)) * 100;
                      const max = Math.max(...trendData.orphanTrend.map(p => p.count));
                      const y = 50 - ((point.count / max) * 45);
                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r="2"
                            fill="#F59E0B"
                          />
                          <text
                            x={x}
                            y={y - 5}
                            fontSize="8"
                            fill="#9CA3AF"
                            textAnchor="middle"
                          >
                            {point.count}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                  <div className="flex w-full text-xs text-gray-500">
                    {trendData.orphanTrend.map((point, index) => (
                      <div key={index} className="flex-1 text-center">
                        {formatDate(point.date)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-400">
                <p>
                  <strong className="text-white">Non-technical explanation:</strong> Orphaned features are 
                  components in your system that aren't properly connected to other parts. Think of them 
                  like puzzle pieces that were left out when assembling a puzzle.
                </p>
              </div>
            </div>
            
            {/* Memory File Size Chart */}
            <div className="bg-gray-900 p-4 rounded-lg">
              <h4 className="text-lg font-medium mb-4 flex items-center">
                <span className="mr-2">💾</span>
                Memory File Size Trend
              </h4>
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="h-32 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 50">
                    {/* Grid lines */}
                    <line x1="0" y1="0" x2="100" y2="0" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#4B5563" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#4B5563" strokeWidth="0.5" />
                    
                    {/* Area chart */}
                    <path
                      d={`
                        M 0,${50 - (trendData.memoryFileSizes[0].size / 5) * 50}
                        ${trendData.memoryFileSizes.map((point, i) => {
                          const x = (i / (trendData.memoryFileSizes.length - 1)) * 100;
                          const y = 50 - (point.size / 5) * 50;
                          return `L ${x},${y}`;
                        }).join(' ')}
                        L 100,50 L 0,50 Z
                      `}
                      fill="rgba(59, 130, 246, 0.2)"
                    />
                    
                    {/* Line chart */}
                    <polyline
                      points={trendData.memoryFileSizes.map((point, i) => {
                        const x = (i / (trendData.memoryFileSizes.length - 1)) * 100;
                        const y = 50 - (point.size / 5) * 50;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2"
                    />
                    
                    {/* Data points */}
                    {trendData.memoryFileSizes.map((point, i) => {
                      const x = (i / (trendData.memoryFileSizes.length - 1)) * 100;
                      const y = 50 - (point.size / 5) * 50;
                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r="2"
                            fill="#3B82F6"
                          />
                          <text
                            x={x}
                            y={y - 5}
                            fontSize="8"
                            fill="#9CA3AF"
                            textAnchor="middle"
                          >
                            {point.size} MB
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                  <div className="flex w-full text-xs text-gray-500">
                    {trendData.memoryFileSizes.map((point, index) => (
                      <div key={index} className="flex-1 text-center">
                        {formatDate(point.date)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-400">
                <p>
                  <strong className="text-white">What this means:</strong> This chart shows how the size of your 
                  system's memory files is changing over time. Increasing file sizes might indicate data accumulation 
                  that could eventually slow down the system.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthTrends;