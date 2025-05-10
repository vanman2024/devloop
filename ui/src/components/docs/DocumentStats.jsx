import React, { useState, useEffect } from 'react';
import documentManagerService from '../../services/documentManagerService';

/**
 * DocumentStats component
 * 
 * Displays statistics and metrics about the documentation in the system.
 */
const DocumentStats = ({ documents = [] }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const documentStats = await documentManagerService.getDocumentStats();
        setStats(documentStats);
      } catch (err) {
        console.error('Failed to load document stats:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    }
    
    if (documents.length > 0) {
      fetchStats();
    }
  }, [documents]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 text-red-400">
        <p>{error}</p>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="p-6 text-gray-500">
        <p>No statistics available</p>
      </div>
    );
  }
  
  // Calculate top categories and components
  const topCategories = Object.entries(stats.categoryStats || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
    
  const topComponents = Object.entries(stats.componentStats || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return (
    <div className="p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0f172a] p-4 rounded-lg">
            <p className="text-2xl font-bold text-white">{stats.totalDocuments}</p>
            <p className="text-sm text-gray-400">Total Documents</p>
          </div>
          <div className="bg-[#0f172a] p-4 rounded-lg">
            <p className="text-2xl font-bold text-white">{Math.round(stats.averageWordCount || 0)}</p>
            <p className="text-sm text-gray-400">Avg Word Count</p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Document Age</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-24 text-sm text-gray-400">Last 7 days:</div>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${(stats.ageStats.last7Days / stats.totalDocuments) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm text-white">{stats.ageStats.last7Days}</div>
          </div>
          <div className="flex items-center">
            <div className="w-24 text-sm text-gray-400">Last 30 days:</div>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${(stats.ageStats.last30Days / stats.totalDocuments) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm text-white">{stats.ageStats.last30Days}</div>
          </div>
          <div className="flex items-center">
            <div className="w-24 text-sm text-gray-400">Last 90 days:</div>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full" 
                style={{ width: `${(stats.ageStats.last90Days / stats.totalDocuments) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm text-white">{stats.ageStats.last90Days}</div>
          </div>
          <div className="flex items-center">
            <div className="w-24 text-sm text-gray-400">Older:</div>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gray-500 h-2 rounded-full" 
                style={{ width: `${(stats.ageStats.older / stats.totalDocuments) * 100}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm text-white">{stats.ageStats.older}</div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Top Categories</h3>
        <div className="space-y-2">
          {topCategories.map(([category, count]) => (
            <div key={category} className="flex items-center">
              <div className="w-1/2 text-sm text-gray-200 truncate">{category}:</div>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full" 
                  style={{ width: `${(count / stats.totalDocuments) * 100}%` }}
                ></div>
              </div>
              <div className="ml-2 text-sm text-white">{count}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Top Components</h3>
        <div className="space-y-2">
          {topComponents.map(([component, count]) => (
            <div key={component} className="flex items-center">
              <div className="w-1/2 text-sm text-gray-200 truncate">{component}:</div>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${(count / stats.totalDocuments) * 100}%` }}
                ></div>
              </div>
              <div className="ml-2 text-sm text-white">{count}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center mt-8">
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition">
          Generate Documentation Report
        </button>
      </div>
    </div>
  );
};

export default DocumentStats;