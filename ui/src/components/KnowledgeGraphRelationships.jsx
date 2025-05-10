import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * KnowledgeGraphRelationships Component
 * 
 * Displays relationships for a feature from the knowledge graph
 */
const KnowledgeGraphRelationships = ({ featureId, expanded = false }) => {
  const [loading, setLoading] = useState(false);
  const [relationships, setRelationships] = useState([]);
  const [relatedNodes, setRelatedNodes] = useState([]);
  const [error, setError] = useState(null);
  const [showRelationships, setShowRelationships] = useState(expanded);
  
  // API endpoint for the knowledge graph
  const API_URL = 'http://localhost:8080/api/graph';
  
  // Fetch relationships data for the feature
  useEffect(() => {
    if (!featureId || !showRelationships) return;
    
    const fetchRelationships = async () => {
      setLoading(true);
      try {
        // Fetch relationships where this feature is a source
        const sourceRelResponse = await axios.get(`${API_URL}/edges?source=${featureId}`);
        
        // Fetch relationships where this feature is a target
        const targetRelResponse = await axios.get(`${API_URL}/edges?target=${featureId}`);
        
        // Combine relationships
        const allRelationships = [...sourceRelResponse.data, ...targetRelResponse.data];
        setRelationships(allRelationships);
        
        // Get related node IDs
        const nodeIds = new Set();
        allRelationships.forEach(rel => {
          if (rel.from !== featureId) nodeIds.add(rel.from);
          if (rel.to !== featureId) nodeIds.add(rel.to);
        });
        
        // Fetch details for each related node
        const nodes = [];
        for (const nodeId of nodeIds) {
          try {
            const nodeResponse = await axios.get(`${API_URL}/node/${nodeId}`);
            nodes.push(nodeResponse.data);
          } catch (nodeError) {
            console.warn(`Failed to fetch node ${nodeId}:`, nodeError);
          }
        }
        
        setRelatedNodes(nodes);
        setError(null);
      } catch (err) {
        console.error("Error fetching relationships:", err);
        setError("Failed to load knowledge graph data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelationships();
  }, [featureId, showRelationships]);
  
  // Handle toggle for showing relationships
  const toggleRelationships = () => {
    setShowRelationships(!showRelationships);
  };
  
  // Get node info by ID
  const getNodeInfo = (nodeId) => {
    const node = relatedNodes.find(n => n.id === nodeId);
    return {
      name: node?.name || nodeId,
      type: node?.type || '',
      status: node?.status || ''
    };
  };
  
  // Group relationships by type
  const groupedRelationships = relationships.reduce((groups, rel) => {
    const type = rel.type || 'other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(rel);
    return groups;
  }, {});
  
  // Determine status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-green-500';
      case 'in-progress': 
      case 'in_progress': return 'text-blue-500';
      case 'blocked': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  return (
    <div className="knowledge-graph-section">
      <div 
        className="flex items-center justify-between cursor-pointer py-2 border-t border-gray-700/30"
        onClick={toggleRelationships}
      >
        <div className="flex items-center">
          <span className="text-xs font-medium text-blue-400 mr-2">🔄</span>
          <span className="text-xs font-medium text-blue-400">Knowledge Graph</span>
        </div>
        <div className="text-xs text-gray-400">
          {relationships.length > 0 ? `${relationships.length} relationships` : 'No data'}
          <span className="ml-1">{showRelationships ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {showRelationships && (
        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto bg-gray-900/30 p-2 rounded-md">
          {loading ? (
            <div className="text-center py-2">
              <div className="text-xs text-gray-400">Loading relationships...</div>
            </div>
          ) : error ? (
            <div className="text-center py-2">
              <div className="text-xs text-red-400">{error}</div>
            </div>
          ) : relationships.length === 0 ? (
            <div className="text-center py-2">
              <div className="text-xs text-gray-400">No relationships found</div>
            </div>
          ) : (
            Object.entries(groupedRelationships).map(([type, rels]) => (
              <div key={type} className="mb-2">
                <div className="text-xs font-medium text-blue-400 mb-1">
                  {type.replace(/_/g, ' ')}
                </div>
                <div className="space-y-1">
                  {rels.map(rel => {
                    const isSource = rel.from === featureId;
                    const relatedId = isSource ? rel.to : rel.from;
                    const nodeInfo = getNodeInfo(relatedId);
                    
                    return (
                      <div 
                        key={`${rel.from}-${rel.to}`} 
                        className="flex items-center text-xs bg-gray-800/50 p-1 rounded-md"
                      >
                        {!isSource && <span className="text-gray-400 mr-1">←</span>}
                        <span className={`${getStatusColor(nodeInfo.status)} flex-1 truncate`}>
                          {nodeInfo.name}
                        </span>
                        {nodeInfo.type && (
                          <span className="text-gray-500 text-[10px] ml-1 px-1 bg-gray-800 rounded">
                            {nodeInfo.type}
                          </span>
                        )}
                        {isSource && <span className="text-gray-400 ml-1">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphRelationships;