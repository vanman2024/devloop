import React, { useEffect, useState } from 'react';
import useComponentTracking from '../hooks/useComponentTracking.js';
import { createToast } from './ToastNotification.jsx';
import { getFeatureTaskStats } from '../services/taskService.js';
import KnowledgeGraphRelationships from './KnowledgeGraphRelationships.jsx';

const FeatureCard = ({
  id,
  name,
  description,
  status,
  module,
  phase,
  lastUpdated,
  healthStatus,     // New prop for health check status
  integrationReady, // New prop to indicate ready for integration
  dependencies,     // New prop for feature dependencies
  featureType,      // 'frontend' or 'backend' to indicate feature type
  isNew,            // New prop to indicate a newly created feature - highlight animation
  onRun,
  onViewDetails,
  onAddEnhancement,
  onChat,          // Prop for chat action
  onActivity,      // Prop for activity action
  onHealthCheck,   // New prop for health check action
  onTasksClick     // Prop for tasks action
}) => {
  // Task statistics state
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    completionPercentage: 0
  });
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Knowledge Graph section state
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  
  // Load task statistics for this feature
  useEffect(() => {
    const loadTaskStats = async () => {
      if (!id) return;
      
      try {
        setLoadingTasks(true);
        const stats = await getFeatureTaskStats(id);
        setTaskStats(stats);
      } catch (error) {
        console.error(`Error loading task stats for ${id}:`, error);
      } finally {
        setLoadingTasks(false);
      }
    };
    
    loadTaskStats();
  }, [id]);
  // Determine feature type with more robust detection
  // Check explicit prop first, then module name, then fallback to backend
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
    milestone: id?.split('-')[1] || '', // Extract milestone from ID if available
    phase: phase,
    module: module,
    type: type,
    tags: [
      type === 'frontend' ? 'ui-component' : 'backend-component', 
      module,
      // Additional tags based on feature characteristics
      status === 'in-progress' ? 'active-development' : '',
      integrationReady ? 'integration-ready' : '',
      healthStatus === 'critical' ? 'needs-attention' : ''
    ].filter(Boolean), // Remove empty strings
    relatedTo: type === 'frontend' 
      ? ['feature-manager', 'dashboard', 'ui-system'] 
      : ['api', 'core-system', 'backend-services']
  };
  
  // Use component tracking with feature context
  const tracking = useComponentTracking('FeatureCard', { 
    featureContext,
    captureOnMount: true,
    enableRollback: true,
    dependencies: [status, description, type] // Track changes when these props change
  });
  
  // Track status changes
  useEffect(() => {
    // Only track if status changes after mount
    if (tracking.componentRef.current) {
      const prevStatus = tracking.componentRef.current.dataset.lastStatus;
      
      if (prevStatus && prevStatus !== status) {
        tracking.trackContent(
          prevStatus,
          status
        );
        
        // Show toast notification for important status changes
        if (status === 'completed' || status === 'integration-ready') {
          createToast.success(`${name} status changed to ${status}`, 4000);
        } else if (status === 'blocked') {
          createToast.warning(`${name} is now blocked`, 4000);
        }
      }
      
      // Update the data attribute for future change tracking
      tracking.componentRef.current.dataset.lastStatus = status;
    }
  }, [status, name]);
  
  const statusColors = {
    'completed': 'bg-green-500',
    'in-progress': 'bg-blue-500',
    'pending': 'bg-yellow-500',
    'blocked': 'bg-red-500',
    'integration-ready': 'bg-emerald-500' // New status for integration ready
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
  
  return (
    <div
      ref={tracking.setRef}
      data-component-id={id}
      data-status={status}
      data-type={type}
      data-feature-id={id}
      data-feature-name={name}
      className={`relative w-full min-h-[20rem] flex flex-col ${cardStyles.bgColor} border-l-4 ${cardStyles.borderColor} rounded-lg shadow-md overflow-hidden border-t border-r border-b border-[rgba(255,255,255,0.08)] transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px] ${isNew ? 'ring-2 ring-[#3b82f6] animate-pulse' : ''}`}
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

            {/* Knowledge Graph indicator */}
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full flex items-center bg-blue-900/40 text-blue-400 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowKnowledgeGraph(!showKnowledgeGraph);
              }}
              title="View Knowledge Graph data"
            >
              <span className="mr-1">🔄</span>
              KG
            </span>
          </div>
          <h3 className="text-base sm:text-[19px] font-semibold text-white mb-2 sm:mb-3 leading-tight">{name}</h3>
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <span className={`
            px-2 sm:px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm
            ${statusColors[status]}
          `}>
            {statusDisplay}
          </span>

          {/* New Feature Badge */}
          {isNew && (
            <span className="px-2 py-1 rounded-full text-xs font-bold text-white bg-blue-600 shadow-md animate-bounce">
              New!
            </span>
          )}
        </div>
        
        {/* Description */}
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-[rgba(255,255,255,0.7)] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
        
        {/* Task Indicator (if there are tasks) */}
        {taskStats.total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <div className="text-xs text-gray-400">Tasks: {taskStats.completed}/{taskStats.total} completed</div>
              <div className="text-xs text-white">{taskStats.completionPercentage}%</div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ width: `${taskStats.completionPercentage}%` }}
              ></div>
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
          {taskStats.total > 0 && (
            <div className="mb-1">
              <span className="font-semibold text-[rgba(255,255,255,0.5)] mr-1">Tasks:</span>
              <span className="truncate">
                <span className="text-green-500">{taskStats.completed}</span> /
                <span className="text-blue-500">{taskStats.inProgress}</span> /
                <span className="text-gray-400">{taskStats.notStarted}</span>
              </span>
            </div>
          )}
          <div className="cursor-pointer text-right mt-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowKnowledgeGraph(!showKnowledgeGraph);
              }}
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >
              {showKnowledgeGraph ? 'Hide KG Data' : 'Show KG Data'}
            </button>
          </div>
        </div>

        {/* Knowledge Graph Relationships */}
        {showKnowledgeGraph && (
          <div className="mt-2">
            <KnowledgeGraphRelationships featureId={id} expanded={true} />
          </div>
        )}
        
        {/* Action Buttons - Using flex grow to push to bottom */}
        <div className="mt-auto">
          {/* First row: main actions */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={onViewDetails}
              className="py-1.5 bg-[#1c2c44] text-[rgba(255,255,255,0.9)] rounded-md text-center text-xs font-medium"
            >
              Details
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowKnowledgeGraph(!showKnowledgeGraph);
              }}
              className="py-1.5 bg-[#3b82f6] text-white rounded-md text-center text-xs font-medium"
            >
              {showKnowledgeGraph ? 'Hide Graph' : 'Show Graph'}
            </button>
            <button
              onClick={onAddEnhancement}
              className={`py-1.5 text-white rounded-md text-center text-xs font-medium ${type === 'frontend' ? 'bg-[#7c3aed]' : 'bg-[#6366f1]'}`}
            >
              Enhance
            </button>
          </div>

          {/* Second row: additional actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                tracking.captureState(
                  { action: 'view_tasks', featureType: type },
                  `Viewed tasks for ${name}`,
                  { eventType: 'user_action' }
                );
                if (onTasksClick) onTasksClick(id);
                else {
                  onViewDetails();
                }
              }}
              className={`py-1.5 bg-[#4f46e5] text-white rounded-md text-center text-xs font-medium ${taskStats.total > 0 ? 'relative' : ''}`}
            >
              Tasks
              {taskStats.total > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-blue-600 rounded-full">
                  {taskStats.total}
                </span>
              )}
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
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;