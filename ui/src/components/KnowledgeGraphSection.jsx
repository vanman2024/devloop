import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Knowledge Graph Section Component
 * 
 * Displays knowledge graph relationships for a feature in the UI
 */
const KnowledgeGraphSection = ({ featureId, title = "Knowledge Graph" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [relationships, setRelationships] = useState([]);
  const [relatedNodes, setRelatedNodes] = useState([]);
  const [error, setError] = useState(null);
  
  // Constants
  const API_URL = 'http://localhost:8080/api/graph';
  
  // Fetch knowledge graph data for the feature
  const fetchKnowledgeGraphData = async () => {
    if (!featureId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch relationships where this feature is a source
      const sourceRelResponse = await axios.get(`${API_URL}/edges?source=${featureId}`);
      
      // Fetch relationships where this feature is a target
      const targetRelResponse = await axios.get(`${API_URL}/edges?target=${featureId}`);
      
      // Combine all relationships
      const allRelationships = [...sourceRelResponse.data, ...targetRelResponse.data];
      setRelationships(allRelationships);
      
      // Get related node IDs from relationships
      const relatedNodeIds = new Set();
      allRelationships.forEach(rel => {
        if (rel.from !== featureId) relatedNodeIds.add(rel.from);
        if (rel.to !== featureId) relatedNodeIds.add(rel.to);
      });
      
      // Fetch details for each related node
      const nodes = [];
      for (const nodeId of relatedNodeIds) {
        try {
          const nodeResponse = await axios.get(`${API_URL}/node/${nodeId}`);
          nodes.push(nodeResponse.data);
        } catch (nodeError) {
          console.error(`Error fetching node ${nodeId}:`, nodeError);
        }
      }
      
      setRelatedNodes(nodes);
    } catch (error) {
      console.error('Error fetching knowledge graph data:', error);
      setError('Failed to fetch knowledge graph data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data when component mounts or featureId changes
  useEffect(() => {
    fetchKnowledgeGraphData();
  }, [featureId]);
  
  // Group relationships by type
  const getGroupedRelationships = () => {
    const groupedRels = {};
    
    relationships.forEach(rel => {
      if (!groupedRels[rel.type]) {
        groupedRels[rel.type] = [];
      }
      groupedRels[rel.type].push(rel);
    });
    
    return groupedRels;
  };
  
  // Get node information by ID
  const getNodeInfo = (nodeId) => {
    const node = relatedNodes.find(n => n.id === nodeId);
    return {
      id: nodeId,
      name: node?.name || nodeId,
      type: node?.type || '',
      status: node?.status || '',
      description: node?.description || ''
    };
  };
  
  // Determine status color for a node
  const getStatusColor = (status) => {
    if (!status) return 'gray';
    
    switch (status) {
      case 'completed':
        return 'green';
      case 'in-progress':
      case 'in_progress':
        return 'blue';
      case 'blocked':
        return 'red';
      case 'pending':
      case 'not_started':
        return 'yellow';
      default:
        return 'gray';
    }
  };
  
  // Format relationship type for display
  const formatRelationType = (type) => {
    if (!type) return '';
    
    // Convert snake_case to Title Case With Spaces
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-4">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-pulse text-gray-400">Loading knowledge graph data...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-4">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <div className="bg-red-900/30 text-red-400 p-3 rounded-md">
          {error}
          <button 
            onClick={fetchKnowledgeGraphData}
            className="ml-3 text-sm underline hover:text-red-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (relationships.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-4">
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <div className="text-center py-6">
          <div className="text-gray-400 mb-3">No relationships found in the knowledge graph</div>
          <button 
            onClick={fetchKnowledgeGraphData}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }
  
  const groupedRelationships = getGroupedRelationships();
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button 
          onClick={fetchKnowledgeGraphData}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md"
        >
          Refresh
        </button>
      </div>
      
      <div className="mb-3 bg-gray-700/50 p-3 rounded-md">
        <div className="text-gray-300 text-sm mb-2">Summary</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-700 p-2 rounded-md">
            <div className="text-xl font-semibold text-white">{relationships.length}</div>
            <div className="text-xs text-gray-400">Relationships</div>
          </div>
          <div className="bg-gray-700 p-2 rounded-md">
            <div className="text-xl font-semibold text-white">{relatedNodes.length}</div>
            <div className="text-xs text-gray-400">Connected Nodes</div>
          </div>
          <div className="bg-gray-700 p-2 rounded-md">
            <div className="text-xl font-semibold text-white">{Object.keys(groupedRelationships).length}</div>
            <div className="text-xs text-gray-400">Relation Types</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {Object.entries(groupedRelationships).map(([relType, relations]) => (
          <div key={relType} className="bg-gray-700/30 rounded-md overflow-hidden">
            <div className="bg-blue-900/30 px-3 py-2">
              <h3 className="text-sm font-medium text-blue-400">{formatRelationType(relType)}</h3>
            </div>
            <div className="divide-y divide-gray-700">
              {relations.map(rel => {
                // Determine if this node is the source or target
                const isSource = rel.from === featureId;
                const relatedNodeId = isSource ? rel.to : rel.from;
                const nodeInfo = getNodeInfo(relatedNodeId);
                const statusColor = getStatusColor(nodeInfo.status);
                
                return (
                  <div key={`${rel.from}-${rel.to}`} className="p-3 hover:bg-gray-700/50">
                    <div className="flex items-center mb-1">
                      {!isSource && (
                        <div className="mr-2 text-gray-400 flex items-center">
                          <span className="text-xs">←</span>
                          <span className="text-[10px] ml-1">from</span>
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full bg-${statusColor}-500 mr-2`}></span>
                          <span className="text-white font-medium">{nodeInfo.name}</span>
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize">
                            {nodeInfo.type}
                          </span>
                        </div>
                        
                        {nodeInfo.description && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                            {nodeInfo.description}
                          </div>
                        )}
                      </div>
                      
                      {isSource && (
                        <div className="ml-2 text-gray-400 flex items-center">
                          <span className="text-[10px] mr-1">to</span>
                          <span className="text-xs">→</span>
                        </div>
                      )}
                    </div>
                    
                    {rel.properties && Object.keys(rel.properties).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700/50">
                        <div className="text-xs text-gray-500 mb-1">Properties:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(rel.properties)
                            .filter(([key]) => key !== 'created_at')
                            .map(([key, value]) => (
                              <span key={key} className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded-md text-gray-300">
                                {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeGraphSection;