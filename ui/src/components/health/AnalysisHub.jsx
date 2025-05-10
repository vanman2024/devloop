import React, { useState, useEffect } from 'react';

const AnalysisHub = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('10days');
  const [activeSection, setActiveSection] = useState('health');
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
    ],
    testPassRates: [
      { date: '2025-04-15', rate: 65 },
      { date: '2025-04-17', rate: 68 },
      { date: '2025-04-19', rate: 72 },
      { date: '2025-04-21', rate: 75 },
      { date: '2025-04-23', rate: 78 }
    ],
    riskData: {
      orphanRisk: 65,
      memoryBloat: 42,
      featureChurn: 58,
      dependencyFragility: 73,
      untestedFeatures: 38
    }
  });

  // Fetch trend data
  const fetchTrendData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // No changes to mock data for demo
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
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Analysis Hub</h3>
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
          <>
            {/* Section Tabs */}
            <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeSection === 'health' ? 'border-blue-500 text-blue-400' : 'border-transparent'
                }`}
                onClick={() => setActiveSection('health')}
              >
                Health Trends
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeSection === 'drift' ? 'border-blue-500 text-blue-400' : 'border-transparent'
                }`}
                onClick={() => setActiveSection('drift')}
              >
                Drift Analysis
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeSection === 'orphans' ? 'border-blue-500 text-blue-400' : 'border-transparent'
                }`}
                onClick={() => setActiveSection('orphans')}
              >
                Orphans & Memory
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeSection === 'tests' ? 'border-blue-500 text-blue-400' : 'border-transparent'
                }`}
                onClick={() => setActiveSection('tests')}
              >
                Test Metrics
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeSection === 'risk' ? 'border-blue-500 text-blue-400' : 'border-transparent'
                }`}
                onClick={() => setActiveSection('risk')}
              >
                Risk Radar
              </button>
            </div>
            
            {/* Health Trends Section */}
            {activeSection === 'health' && (
              <div>
                <div className="bg-gray-900 p-4 rounded-lg mb-4">
                  <h4 className="text-lg font-medium mb-4">Health Score Over Time</h4>
                  <div className="bg-gray-800 p-4 rounded-md">
                    <div className="h-60 relative">
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                        <span>100</span>
                        <span>80</span>
                        <span>60</span>
                        <span>40</span>
                        <span>20</span>
                        <span>0</span>
                      </div>
                      
                      {/* Simple chart visualization */}
                      <div className="absolute inset-0 pl-8 flex items-end">
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
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="mt-2 pl-8 flex justify-between">
                      <div className="flex w-full text-xs text-gray-500">
                        {trendData.healthHistory.map((point, index) => (
                          <div key={index} className="flex-1 text-center">
                            {index % 2 === 0 && formatDate(point.date)}
                          </div>
                        ))}
                      </div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-3">Health Score Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-gray-300 font-medium">Current Score:</span>{' '}
                        <span className={trendData.healthHistory[trendData.healthHistory.length - 1].score >= 80 ? 'text-green-400' : 
                                        trendData.healthHistory[trendData.healthHistory.length - 1].score >= 70 ? 'text-yellow-400' : 'text-red-400'}>
                          {trendData.healthHistory[trendData.healthHistory.length - 1].score}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-300 font-medium">30-day Average:</span>{' '}
                        <span className="text-blue-400">
                          {Math.round(trendData.healthHistory.reduce((sum, point) => sum + point.score, 0) / trendData.healthHistory.length)}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-300 font-medium">Trend:</span>{' '}
                        <span className="text-green-400">
                          {trendData.healthHistory[trendData.healthHistory.length - 1].score > trendData.healthHistory[0].score 
                            ? 'Improving' : 'Declining'}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-300 font-medium">Volatility:</span>{' '}
                        <span className="text-yellow-400">Medium</span> - Score varies by ±7 points
                      </p>
                      <p>
                        <span className="text-gray-300 font-medium">Best Score:</span>{' '}
                        {Math.max(...trendData.healthHistory.map(point => point.score))} (
                        {formatDate(trendData.healthHistory.find(point => 
                          point.score === Math.max(...trendData.healthHistory.map(p => p.score))
                        ).date)})
                      </p>
                      <p>
                        <span className="text-gray-300 font-medium">Worst Score:</span>{' '}
                        {Math.min(...trendData.healthHistory.map(point => point.score))} (
                        {formatDate(trendData.healthHistory.find(point => 
                          point.score === Math.min(...trendData.healthHistory.map(p => p.score))
                        ).date)})
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-3">Insights</h4>
                    <div className="space-y-3">
                      <div className="bg-gray-800 p-3 rounded-md">
                        <p className="text-green-400 font-medium">Positive Trend</p>
                        <p className="text-sm text-gray-300 mt-1">
                          System health has improved by 10 points since your monitoring began, indicating effective maintenance.
                        </p>
                      </div>
                      <div className="bg-gray-800 p-3 rounded-md">
                        <p className="text-yellow-400 font-medium">Cyclic Pattern</p>
                        <p className="text-sm text-gray-300 mt-1">
                          Health scores tend to decline mid-week and recover on weekends, suggesting a development cycle pattern.
                        </p>
                      </div>
                      <div className="bg-gray-800 p-3 rounded-md">
                        <p className="text-blue-400 font-medium">Correlation</p>
                        <p className="text-sm text-gray-300 mt-1">
                          Health decreases correlate with new feature deployments. Consider enhancing pre-deployment validation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Drift Analysis Section */}
            {activeSection === 'drift' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2 bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">Drift Incidents by Date</h4>
                    <div className="bg-gray-800 p-4 rounded-md h-52 flex items-end justify-around">
                      {trendData.driftIncidents.map((incident, index) => (
                        <div key={index} className="flex flex-col items-center">
                          <div 
                            className={`w-16 rounded-t ${getSeverityColor(incident.severity)}`} 
                            style={{ height: `${incident.count * 20}px` }}
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
                  
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-3">What is Drift?</h4>
                    <div className="text-sm text-gray-300 space-y-3">
                      <p>
                        <strong className="text-white">System drift</strong> happens when your system's 
                        actual state differs from its expected state.
                      </p>
                      <p>Examples of drift include:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-400">
                        <li>Files modified outside normal workflow</li>
                        <li>Dependency version mismatches</li>
                        <li>Configuration changes without updates</li>
                        <li>Orphaned files or components</li>
                        <li>Missing relationships between components</li>
                      </ul>
                      <p>
                        Regular drift detection helps maintain system integrity and prevents cascading failures.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-3">Recent Drift Incidents</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="py-2 px-3 text-left">Date</th>
                          <th className="py-2 px-3 text-left">Type</th>
                          <th className="py-2 px-3 text-left">Severity</th>
                          <th className="py-2 px-3 text-left">Affected</th>
                          <th className="py-2 px-3 text-left">Status</th>
                          <th className="py-2 px-3 text-left">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        <tr>
                          <td className="py-2 px-3">{formatDate('2025-04-24')}</td>
                          <td className="py-2 px-3">Feature Orphaning</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                              Medium
                            </span>
                          </td>
                          <td className="py-2 px-3">2 features</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                              Fixed
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View Details
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">{formatDate('2025-04-21')}</td>
                          <td className="py-2 px-3">Schema Change</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                              High
                            </span>
                          </td>
                          <td className="py-2 px-3">23 memory files</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                              Fixed
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View Details
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">{formatDate('2025-04-18')}</td>
                          <td className="py-2 px-3">Dependency Version</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                              Low
                            </span>
                          </td>
                          <td className="py-2 px-3">1 package</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                              Fixed
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View Details
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">{formatDate('2025-04-16')}</td>
                          <td className="py-2 px-3">Structure Change</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                              Medium
                            </span>
                          </td>
                          <td className="py-2 px-3">3 modules</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                              Fixed
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View Details
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Orphans & Memory Section */}
            {activeSection === 'orphans' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-4">Orphaned Features Trend</h4>
                  <div className="bg-gray-800 p-4 rounded-md">
                    <div className="h-48 relative">
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
                  
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-2">Analysis</h5>
                    <div className="text-sm text-gray-300 space-y-2">
                      <p>
                        Orphaned features have <span className="text-green-400">decreased by 19%</span> in the last 10 days.
                      </p>
                      <p>
                        Current count: <span className="text-yellow-400">{trendData.orphanTrend[trendData.orphanTrend.length - 1].count}</span> orphaned features.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-4">Memory File Size Trend</h4>
                  <div className="bg-gray-800 p-4 rounded-md">
                    <div className="h-48 relative">
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
                  
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-2">Analysis</h5>
                    <div className="text-sm text-gray-300 space-y-2">
                      <p>
                        Memory file size has <span className="text-red-400">increased by 28%</span> in the last 10 days.
                      </p>
                      <p>
                        Current average size: <span className="text-yellow-400">{trendData.memoryFileSizes[trendData.memoryFileSizes.length - 1].size} MB</span>.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Largest Memory Files</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="py-2 px-3 text-left">File</th>
                          <th className="py-2 px-3 text-left">Size</th>
                          <th className="py-2 px-3 text-left">Last Modified</th>
                          <th className="py-2 px-3 text-left">Growth Rate</th>
                          <th className="py-2 px-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        <tr>
                          <td className="py-2 px-3">module-user-management/memory.json</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">4.1 MB</span>
                          </td>
                          <td className="py-2 px-3">{formatDate('2025-04-23')}</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">+12%</span> per week
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                              Optimize
                            </button>
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">module-analytics/memory.json</td>
                          <td className="py-2 px-3">
                            <span className="text-yellow-400">3.8 MB</span>
                          </td>
                          <td className="py-2 px-3">{formatDate('2025-04-22')}</td>
                          <td className="py-2 px-3">
                            <span className="text-yellow-400">+8%</span> per week
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                              Optimize
                            </button>
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">module-data-sync/memory.json</td>
                          <td className="py-2 px-3">
                            <span className="text-yellow-400">3.7 MB</span>
                          </td>
                          <td className="py-2 px-3">{formatDate('2025-04-21')}</td>
                          <td className="py-2 px-3">
                            <span className="text-yellow-400">+5%</span> per week
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                              Optimize
                            </button>
                            <button className="text-xs bg-gray-800 hover:bg-gray-700 py-1 px-2 rounded">
                              View
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Test Metrics Section */}
            {activeSection === 'tests' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-4">Test Pass Rate Trend</h4>
                    <div className="bg-gray-800 p-4 rounded-md">
                      <div className="h-48 relative">
                        <svg className="w-full h-full" viewBox="0 0 100 50">
                          {/* Grid lines */}
                          <line x1="0" y1="0" x2="100" y2="0" stroke="#4B5563" strokeWidth="0.5" />
                          <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#4B5563" strokeWidth="0.5" />
                          <line x1="0" y1="25" x2="100" y2="25" stroke="#4B5563" strokeWidth="0.5" />
                          <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#4B5563" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="#4B5563" strokeWidth="0.5" />
                          
                          {/* Line chart */}
                          <polyline
                            points={trendData.testPassRates.map((point, i) => {
                              const x = (i / (trendData.testPassRates.length - 1)) * 100;
                              const y = 50 - (point.rate / 100) * 50;
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2"
                          />
                          
                          {/* Data points */}
                          {trendData.testPassRates.map((point, i) => {
                            const x = (i / (trendData.testPassRates.length - 1)) * 100;
                            const y = 50 - (point.rate / 100) * 50;
                            return (
                              <g key={i}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="2"
                                  fill="#10B981"
                                />
                                <text
                                  x={x}
                                  y={y - 5}
                                  fontSize="8"
                                  fill="#9CA3AF"
                                  textAnchor="middle"
                                >
                                  {point.rate}%
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                        <div className="flex w-full text-xs text-gray-500">
                          {trendData.testPassRates.map((point, index) => (
                            <div key={index} className="flex-1 text-center">
                              {formatDate(point.date)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-3">Test Coverage Analysis</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Features with Tests</span>
                          <span className="text-sm text-yellow-400">78%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-yellow-500" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Code Coverage</span>
                          <span className="text-sm text-yellow-400">65%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-yellow-500" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Modules with 100% Pass Rate</span>
                          <span className="text-sm text-red-400">42%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-red-500" style={{ width: '42%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Test Suite Execution Time</span>
                          <span className="text-sm text-green-400">5.2 minutes</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div className="h-2.5 rounded-full bg-green-500" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-900 p-4 rounded-lg">
                  <h4 className="text-lg font-medium mb-3">Failing Tests</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="py-2 px-3 text-left">Test</th>
                          <th className="py-2 px-3 text-left">Feature</th>
                          <th className="py-2 px-3 text-left">Failure Rate</th>
                          <th className="py-2 px-3 text-left">Last Passed</th>
                          <th className="py-2 px-3 text-left">Blocking</th>
                          <th className="py-2 px-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        <tr>
                          <td className="py-2 px-3">Authentication Tests</td>
                          <td className="py-2 px-3">feature-1023</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">25% (3/12 failing)</span>
                          </td>
                          <td className="py-2 px-3">5 days ago</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">3 dependencies</span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                              View Test
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">API Integration Tests</td>
                          <td className="py-2 px-3">feature-2045</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">25% (2/8 failing)</span>
                          </td>
                          <td className="py-2 px-3">2 days ago</td>
                          <td className="py-2 px-3">
                            <span className="text-yellow-400">1 dependency</span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                              View Test
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Payment System Tests</td>
                          <td className="py-2 px-3">module-payment</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">28% (5/18 failing)</span>
                          </td>
                          <td className="py-2 px-3">3 days ago</td>
                          <td className="py-2 px-3">
                            <span className="text-red-400">4 dependencies</span>
                          </td>
                          <td className="py-2 px-3">
                            <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded mr-2">
                              View Test
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Risk Radar Section */}
            {activeSection === 'risk' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-4">System Drift Risk Radar</h4>
                    {/* Radar Chart */}
                    <div className="flex justify-center py-6">
                      <div className="relative h-80 w-80">
                        {/* Radar Chart Rings */}
                        <div className="absolute inset-0 rounded-full border border-gray-700 opacity-20"></div>
                        <div className="absolute inset-5 rounded-full border border-gray-700 opacity-40"></div>
                        <div className="absolute inset-10 rounded-full border border-gray-700 opacity-60"></div>
                        <div className="absolute inset-20 rounded-full border border-gray-700 opacity-80"></div>
                        
                        {/* Chart Lines */}
                        <div className="absolute inset-0 flex justify-center">
                          <div className="h-full w-px bg-gray-700 opacity-40"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full h-px bg-gray-700 opacity-40"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
                          <div className="w-full h-px bg-gray-700 opacity-40"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'rotate(-45deg)' }}>
                          <div className="w-full h-px bg-gray-700 opacity-40"></div>
                        </div>
                        
                        {/* Data Points */}
                        <svg className="absolute inset-0" viewBox="0 0 100 100">
                          <polygon
                            points={`
                              50,${50 - (trendData.riskData.orphanRisk / 2)}
                              ${50 + (trendData.riskData.memoryBloat / 2) * Math.cos(Math.PI / 2.5)},${50 - (trendData.riskData.memoryBloat / 2) * Math.sin(Math.PI / 2.5)}
                              ${50 + (trendData.riskData.featureChurn / 2) * Math.cos(2 * Math.PI / 2.5)},${50 - (trendData.riskData.featureChurn / 2) * Math.sin(2 * Math.PI / 2.5)}
                              ${50 + (trendData.riskData.dependencyFragility / 2) * Math.cos(3 * Math.PI / 2.5)},${50 - (trendData.riskData.dependencyFragility / 2) * Math.sin(3 * Math.PI / 2.5)}
                              ${50 + (trendData.riskData.untestedFeatures / 2) * Math.cos(4 * Math.PI / 2.5)},${50 - (trendData.riskData.untestedFeatures / 2) * Math.sin(4 * Math.PI / 2.5)}
                            `}
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="#3b82f6"
                            strokeWidth="1"
                          />
                        </svg>
                        
                        {/* Labels */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-center">
                          <div className="text-blue-400 font-medium">Orphan Risk</div>
                          <div className="text-blue-500 font-bold">{trendData.riskData.orphanRisk}%</div>
                        </div>
                        <div className="absolute top-1/4 right-0 transform translate-x-2 text-center">
                          <div className="text-yellow-400 font-medium">Memory Bloat</div>
                          <div className="text-yellow-500 font-bold">{trendData.riskData.memoryBloat}%</div>
                        </div>
                        <div className="absolute bottom-1/4 right-0 transform translate-x-2 text-center">
                          <div className="text-green-400 font-medium">Feature Churn</div>
                          <div className="text-green-500 font-bold">{trendData.riskData.featureChurn}%</div>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                          <div className="text-red-400 font-medium">Dependency Fragility</div>
                          <div className="text-red-500 font-bold">{trendData.riskData.dependencyFragility}%</div>
                        </div>
                        <div className="absolute bottom-1/4 left-0 transform -translate-x-2 text-center">
                          <div className="text-purple-400 font-medium">Untested Features</div>
                          <div className="text-purple-500 font-bold">{trendData.riskData.untestedFeatures}%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <div className="inline-block px-4 py-2 bg-gray-800 rounded-md text-sm">
                        <span className="text-gray-400">Overall System Risk: </span>
                        <span className="font-bold text-yellow-500">
                          {Math.round(
                            (trendData.riskData.orphanRisk + trendData.riskData.memoryBloat + 
                             trendData.riskData.featureChurn + trendData.riskData.dependencyFragility + 
                             trendData.riskData.untestedFeatures) / 5
                          )}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-3">Risk Categories</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-sm">Orphan Risk</span>
                          </div>
                          <span className={`text-sm ${
                            trendData.riskData.orphanRisk >= 70 ? 'text-red-400' :
                            trendData.riskData.orphanRisk >= 40 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {trendData.riskData.orphanRisk}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-blue-500" 
                            style={{ width: `${trendData.riskData.orphanRisk}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                            <span className="text-sm">Memory Bloat</span>
                          </div>
                          <span className={`text-sm ${
                            trendData.riskData.memoryBloat >= 70 ? 'text-red-400' :
                            trendData.riskData.memoryBloat >= 40 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {trendData.riskData.memoryBloat}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-yellow-500" 
                            style={{ width: `${trendData.riskData.memoryBloat}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm">Feature Churn</span>
                          </div>
                          <span className={`text-sm ${
                            trendData.riskData.featureChurn >= 70 ? 'text-red-400' :
                            trendData.riskData.featureChurn >= 40 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {trendData.riskData.featureChurn}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-green-500" 
                            style={{ width: `${trendData.riskData.featureChurn}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-sm">Dependency Fragility</span>
                          </div>
                          <span className={`text-sm ${
                            trendData.riskData.dependencyFragility >= 70 ? 'text-red-400' :
                            trendData.riskData.dependencyFragility >= 40 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {trendData.riskData.dependencyFragility}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-red-500" 
                            style={{ width: `${trendData.riskData.dependencyFragility}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                            <span className="text-sm">Untested Features</span>
                          </div>
                          <span className={`text-sm ${
                            trendData.riskData.untestedFeatures >= 70 ? 'text-red-400' :
                            trendData.riskData.untestedFeatures >= 40 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {trendData.riskData.untestedFeatures}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full bg-purple-500" 
                            style={{ width: `${trendData.riskData.untestedFeatures}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-3 bg-gray-900 p-4 rounded-lg">
                    <h4 className="text-lg font-medium mb-3">Risk Explanations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium flex items-center">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                            Orphan Risk
                          </p>
                          <p className="text-gray-400 ml-5">
                            Features that exist but aren't properly tracked in the registry. 
                            Like puzzle pieces that were left out when assembling a puzzle.
                          </p>
                        </div>
                        <div>
                          <p className="font-medium flex items-center">
                            <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                            Memory Bloat
                          </p>
                          <p className="text-gray-400 ml-5">
                            Oversized memory files or inefficient storage patterns.
                            Like having an overstuffed file cabinet where it becomes hard to find things.
                          </p>
                        </div>
                        <div>
                          <p className="font-medium flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                            Feature Churn
                          </p>
                          <p className="text-gray-400 ml-5">
                            Rapid changes to features or frequent status changes.
                            High churn usually indicates unstable requirements or implementation issues.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium flex items-center">
                            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                            Dependency Fragility
                          </p>
                          <p className="text-gray-400 ml-5">
                            Complex dependency chains or outdated package dependencies.
                            Like a house of cards, when one piece fails, everything dependent on it can break.
                          </p>
                        </div>
                        <div>
                          <p className="font-medium flex items-center">
                            <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                            Untested Features
                          </p>
                          <p className="text-gray-400 ml-5">
                            Features without tests or with failing test suites.
                            Without proper testing, you can't be confident your system works as expected.
                          </p>
                        </div>
                        <div className="bg-blue-900/20 p-3 rounded-md border border-blue-900">
                          <p className="text-blue-400 font-medium">High Risk Areas Need Attention</p>
                          <p className="text-gray-300 text-sm mt-1">
                            Focus on red/yellow areas in the radar chart for maximum system stability improvement.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisHub;