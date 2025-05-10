import React, { useState, useEffect } from 'react';
import useComponentTracking from '../hooks/useComponentTracking.js';
import { createToast } from './ToastNotification.jsx';
import { useChangeTracker } from './ChangeTracker.jsx';
import axios from 'axios';

/**
 * Enhanced Feature Card that shows linked UI changes and knowledge graph relationships
 * This extends the basic FeatureCard component to display linked UI changes
 * and knowledge graph relationships
 */
const EnhancedFeatureCard = ({
  id,
  name,
  description,
  status,
  module,
  phase,
  lastUpdated,
  healthStatus,
  integrationReady,
  dependencies,
  featureType,
  onRun,
  onViewDetails,
  onAddEnhancement,
  onChat,
  onActivity,
  onHealthCheck
}) => {
  const [showLinkedChanges, setShowLinkedChanges] = useState(false);
  const [linkedChanges, setLinkedChanges] = useState([]);
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [knowledgeGraph, setKnowledgeGraph] = useState({ relationships: [], relatedNodes: [] });
  const [isLoadingKG, setIsLoadingKG] = useState(false);
  
  // Get the change tracker context
  const { changes } = useChangeTracker();
  
  // Determine feature type with more robust detection
  const determineFeatureType = () => {
    if (featureType) return featureType;
    
    // Check module name for UI indicators
    const uiIndicators = ['ui', 'frontend', 'react', 'component', 'visual', 'interface'];
    const moduleNameLower = (module || '').toLowerCase();
    
    for (const indicator of uiIndicators) {
      if (moduleNameLower.includes(indicator)) return 'frontend';
    }
    
    // If name contains UI indicators
    const nameLower = (name || '').toLowerCase();
    for (const indicator of uiIndicators) {
      if (nameLower.includes(indicator)) return 'frontend';
    }
    
    // Default to backend
    return 'backend';
  };
  
  const type = determineFeatureType();
  
  // Enhanced feature context for better tracking and integration
  const featureContext = {
    featureId: id,
    featureName: name,
    milestone: id?.split('-')[1] || '',
    phase: phase,
    module: module,
    type: type,
    tags: [
      type === 'frontend' ? 'ui-component' : 'backend-component', 
      module,
      status === 'in-progress' ? 'active-development' : '',
      integrationReady ? 'integration-ready' : '',
      healthStatus === 'critical' ? 'needs-attention' : ''
    ].filter(Boolean),
    relatedTo: type === 'frontend' 
      ? ['feature-manager', 'dashboard', 'ui-system'] 
      : ['api', 'core-system', 'backend-services']
  };
  
  // Use component tracking with feature context
  const tracking = useComponentTracking('EnhancedFeatureCard', { 
    featureContext,
    captureOnMount: true,
    enableRollback: true,
    dependencies: [status, description, type]
  });
  
  // Track status changes
  useEffect(() => {
    if (tracking.componentRef.current) {
      const prevStatus = tracking.componentRef.current.dataset.lastStatus;
      
      if (prevStatus && prevStatus !== status) {
        tracking.trackContent(
          prevStatus,
          status
        );
        
        if (status === 'completed' || status === 'integration-ready') {
          createToast.success(`${name} status changed to ${status}`, 4000);
        } else if (status === 'blocked') {
          createToast.warning(`${name} is now blocked`, 4000);
        }
      }
      
      tracking.componentRef.current.dataset.lastStatus = status;
    }
  }, [status, name]);
  
  // Load linked changes from localStorage
  useEffect(() => {
    try {
      const storedLinks = localStorage.getItem('devloop_feature_links') || '{}';
      const links = JSON.parse(storedLinks);

      // Find changes linked to this feature
      const featureLinkedChanges = changes.filter(change => {
        return links[change.id] === id;
      });

      setLinkedChanges(featureLinkedChanges);
    } catch (error) {
      console.error('Error loading feature links:', error);
    }
  }, [id, changes]);

  // Fetch knowledge graph data for this feature
  const fetchKnowledgeGraphData = async () => {
    if (!id) return;

    setIsLoadingKG(true);
    try {
      // Fetch relationships where this feature is a source
      const sourceRelResponse = await axios.get(`http://localhost:8080/api/graph/edges?source=${id}`);

      // Fetch relationships where this feature is a target
      const targetRelResponse = await axios.get(`http://localhost:8080/api/graph/edges?target=${id}`);

      // Combine all relationships
      const allRelationships = [...sourceRelResponse.data, ...targetRelResponse.data];

      // Get related node IDs from relationships
      const relatedNodeIds = new Set();
      allRelationships.forEach(rel => {
        if (rel.from !== id) relatedNodeIds.add(rel.from);
        if (rel.to !== id) relatedNodeIds.add(rel.to);
      });

      // Fetch details for each related node
      const relatedNodes = [];
      for (const nodeId of relatedNodeIds) {
        try {
          const nodeResponse = await axios.get(`http://localhost:8080/api/graph/node/${nodeId}`);
          relatedNodes.push(nodeResponse.data);
        } catch (error) {
          console.error(`Error fetching node ${nodeId}:`, error);
        }
      }

      setKnowledgeGraph({
        relationships: allRelationships,
        relatedNodes: relatedNodes
      });
    } catch (error) {
      console.error('Error fetching knowledge graph data:', error);
    } finally {
      setIsLoadingKG(false);
    }
  };

  // Load knowledge graph data when showing graph or when id changes
  useEffect(() => {
    if (showKnowledgeGraph && knowledgeGraph.relationships.length === 0) {
      fetchKnowledgeGraphData();
    }
  }, [showKnowledgeGraph, id]);
  
  const statusColors = {
    'completed': 'bg-green-500',
    'in-progress': 'bg-blue-500',
    'pending': 'bg-yellow-500',
    'blocked': 'bg-red-500',
    'integration-ready': 'bg-emerald-500'
  };
  
  const healthStatusColors = {
    'healthy': 'bg-green-400',
    'warning': 'bg-yellow-400',
    'critical': 'bg-red-400',
    'unknown': 'bg-gray-400'
  };
  
  // Use integration-ready status if provided, otherwise use regular status
  const displayStatus = integrationReady ? 'integration-ready' : status;
  const statusDisplay = integrationReady 
    ? 'Integration Ready' 
    : displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1).replace('-', ' ');
  
  const formattedDate = new Date(lastUpdated).toLocaleDateString();
  
  // Determine card style based on feature type
  const getCardStyles = () => {
    if (type === 'frontend') {
      return {
        borderColor: 'border-l-blue-600', 
        bgColor: 'bg-gradient-to-br from-[#1a2233] to-[#182135]',
        badgeBg: 'bg-blue-900/40',
        badgeText: 'text-blue-400',
        icon: '🖥️'
      };
    } else {
      return {
        borderColor: 'border-l-green-600',
        bgColor: 'bg-gradient-to-br from-[#1a2233] to-[#1f2b35]',
        badgeBg: 'bg-green-900/40',
        badgeText: 'text-green-400',
        icon: '⚙️'
      };
    }
  };
  
  const cardStyles = getCardStyles();
  
  // Format change type to be more readable
  const formatChangeType = (type) => {
    if (!type) return 'General';
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  // Render the knowledge graph section
  const renderKnowledgeGraph = () => {
    if (isLoadingKG) {
      return (
        <div className="flex justify-center items-center py-3">
          <div className="text-sm text-gray-400">Loading knowledge graph data...</div>
        </div>
      );
    }

    if (knowledgeGraph.relationships.length === 0 && !isLoadingKG) {
      return (
        <div className="text-center py-3">
          <div className="text-sm text-gray-400">No relationships found in knowledge graph</div>
          <button
            onClick={fetchKnowledgeGraphData}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            Refresh
          </button>
        </div>
      );
    }

    // Group relationships by type
    const groupedRelationships = {};
    knowledgeGraph.relationships.forEach(rel => {
      if (!groupedRelationships[rel.type]) {
        groupedRelationships[rel.type] = [];
      }
      groupedRelationships[rel.type].push(rel);
    });

    return (
      <div className="space-y-3">
        {Object.entries(groupedRelationships).map(([relType, relations]) => (
          <div key={relType} className="bg-[rgba(59,130,246,0.1)] rounded-md p-2">
            <h5 className="text-xs font-medium text-blue-400 mb-2">{relType.replace(/_/g, ' ')}</h5>
            <div className="space-y-2">
              {relations.map(rel => {
                // Determine if this node is the source or target
                const isSource = rel.from === id;
                const relatedNodeId = isSource ? rel.to : rel.from;
                const relatedNode = knowledgeGraph.relatedNodes.find(node => node.id === relatedNodeId);
                const nodeName = relatedNode?.name || relatedNodeId;
                const nodeType = relatedNode?.type || '';

                return (
                  <div
                    key={`${rel.from}-${rel.to}`}
                    className="flex items-center px-2 py-1 bg-gray-800 rounded-md"
                  >
                    {!isSource && (
                      <span className="text-xs text-gray-400 mr-1">←</span>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-white">{nodeName}</span>
                        <span className="text-xs text-gray-400 capitalize">{nodeType}</span>
                      </div>
                    </div>
                    {isSource && (
                      <span className="text-xs text-gray-400 ml-1">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div 
      ref={tracking.setRef}
      data-component-id={id}
      data-status={status}
      data-type={type}
      data-feature-id={id}
      data-feature-name={name}
      className={`relative w-full min-h-[20rem] flex flex-col ${cardStyles.bgColor} border-l-4 ${cardStyles.borderColor} rounded-lg shadow-md overflow-hidden border-t border-r border-b border-[rgba(255,255,255,0.08)] transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px]`}
    >
      <div className="p-4 sm:p-5 flex flex-col h-full">
        {/* ID and Name section */}
        <div className="mb-2 pr-16 sm:pr-20">
          <div className="flex items-center">
            <div className="font-mono text-xs text-[#888] opacity-70 truncate">{id}</div>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full flex items-center ${cardStyles.badgeBg} ${cardStyles.badgeText}`}>
              <span className="mr-1">{cardStyles.icon}</span>
              {type === 'frontend' ? 'Frontend' : 'Backend'}
            </span>
            
            {/* Health status indicator (if provided) */}
            {healthStatus && (
              <span className={`ml-2 w-2 h-2 rounded-full ${healthStatusColors[healthStatus] || 'bg-gray-400'}`}
                title={`Health: ${healthStatus}`}></span>
            )}

            {/* Knowledge Graph badge */}
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full flex items-center bg-blue-900/40 text-blue-400 cursor-pointer"
              onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
              title="Click to show/hide knowledge graph relationships"
            >
              <span className="mr-1">🔄</span>
              KG
            </span>

            {/* UI Changes badge */}
            {linkedChanges.length > 0 && (
              <span
                className="ml-2 text-xs px-2 py-0.5 rounded-full flex items-center bg-purple-900/40 text-purple-400 cursor-pointer"
                onClick={() => setShowLinkedChanges(!showLinkedChanges)}
                title="Click to show/hide UI changes"
              >
                <span className="mr-1">🎨</span>
                {linkedChanges.length} UI {linkedChanges.length === 1 ? 'Change' : 'Changes'}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-[19px] font-semibold text-white mb-2 sm:mb-3 leading-tight">{name}</h3>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`
            px-2 sm:px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm
            ${statusColors[status]}
          `}>
            {statusDisplay}
          </span>
        </div>
        
        {/* Description */}
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-[rgba(255,255,255,0.7)] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
        
        {/* Knowledge Graph Section */}
        {showKnowledgeGraph && (
          <div className="mb-4 p-3 bg-[rgba(59,130,246,0.1)] rounded-md border border-blue-900/30">
            <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
              <span className="mr-2">🔄</span>
              Knowledge Graph Relationships
            </h4>
            <div className="max-h-48 overflow-y-auto">
              {renderKnowledgeGraph()}
            </div>
            <div className="mt-2 text-right">
              <button
                onClick={fetchKnowledgeGraphData}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Refresh Relationships
              </button>
            </div>
          </div>
        )}

        {/* UI Changes Section (if any) */}
        {showLinkedChanges && linkedChanges.length > 0 && (
          <div className="mb-4 p-3 bg-[rgba(147,51,234,0.1)] rounded-md border border-purple-900/30">
            <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center">
              <span className="mr-2">🎨</span>
              UI Changes
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {linkedChanges.map(change => (
                <div key={change.id} className="bg-gray-900/50 p-2 rounded-md text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-400">{change.component}</span>
                    <span className="text-gray-500">{formatChangeType(change.details?.changeType || change.category)}</span>
                  </div>
                  <div className="text-gray-300 mt-1">
                    {change.displaySummary || change.description}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right">
              <a
                href="/change-center"
                className="text-xs text-purple-400 hover:text-purple-300"
                onClick={(e) => {
                  e.preventDefault();
                  // Navigate programmatically or show detailed view
                  window.location.href = `/change-center?feature=${id}`;
                }}
              >
                View All in Change Center →
              </a>
            </div>
          </div>
        )}
        
        {/* Metadata */}
        <div className={`grid grid-cols-1 xs:grid-cols-2 gap-1 sm:gap-2 mb-4 sm:mb-5 text-xs text-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.05)] rounded-md p-2 sm:p-3 ${type === 'frontend' ? 'border-r-2 border-r-blue-800/30' : 'border-r-2 border-r-green-800/30'}`}>
          <div className="mb-1">
            <span className="font-semibold text-[rgba(255,255,255,0.5)] mr-1">Module:</span> 
            <span className="truncate">{module}</span>
          </div>
          <div className="mb-1">
            <span className="font-semibold text-[rgba(255,255,255,0.5)] mr-1">Phase:</span> 
            <span className="truncate">{phase}</span>
          </div>
          <div className="mb-1">
            <span className="font-semibold text-[rgba(255,255,255,0.5)] mr-1">Updated:</span> {formattedDate}
          </div>
          {dependencies && dependencies.length > 0 && (
            <div className="mb-1">
              <span className="font-semibold text-[rgba(255,255,255,0.5)] mr-1">Dependencies:</span> 
              <span className="truncate">{dependencies.length}</span>
            </div>
          )}
        </div>
        
        {/* Action Buttons - Using flex grow to push to bottom */}
        <div className="mt-auto">
          {/* First row */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button 
              onClick={onRun}
              className={`py-1.5 text-white rounded-md text-center text-xs font-medium ${type === 'frontend' ? 'bg-[#3b82f6]' : 'bg-[#10b981]'}`}
            >
              Run
            </button>
            <button 
              onClick={onViewDetails}
              className="py-1.5 bg-[#1c2c44] text-[rgba(255,255,255,0.9)] rounded-md text-center text-xs font-medium"
            >
              Details
            </button>
            <button 
              onClick={onAddEnhancement}
              className={`py-1.5 text-white rounded-md text-center text-xs font-medium ${type === 'frontend' ? 'bg-[#7c3aed]' : 'bg-[#6366f1]'}`}
            >
              Enhance
            </button>
          </div>
          
          {/* Second row */}
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onChat}
              className="py-1.5 bg-[#ea580c] text-white rounded-md text-center text-xs font-medium"
            >
              Chat
            </button>
            <button 
              onClick={() => {
                tracking.captureState(
                  { action: 'view_activity', featureType: type },
                  `Viewed activity for ${name}`,
                  { eventType: 'user_action' }
                );
                onActivity(type);
              }}
              className="py-1.5 bg-[#14b8a6] text-white rounded-md text-center text-xs font-medium"
            >
              Activity
            </button>
          </div>
          
          {/* Knowledge Graph toggle button */}
          <button
            onClick={() => {
              setShowKnowledgeGraph(!showKnowledgeGraph);
              if (!showKnowledgeGraph && knowledgeGraph.relationships.length === 0) {
                fetchKnowledgeGraphData();
              }
            }}
            className="mt-2 w-full py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-md text-center text-xs font-medium"
          >
            {showKnowledgeGraph ? 'Hide Knowledge Graph' : 'Show Knowledge Graph'}
          </button>

          {/* UI Changes toggle button (only shows if there are linked changes) */}
          {linkedChanges.length > 0 && (
            <button
              onClick={() => setShowLinkedChanges(!showLinkedChanges)}
              className="mt-2 w-full py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-center text-xs font-medium"
            >
              {showLinkedChanges ? 'Hide UI Changes' : 'Show UI Changes'} ({linkedChanges.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedFeatureCard;