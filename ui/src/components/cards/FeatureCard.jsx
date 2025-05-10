import React from 'react';

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
  onRun,           
  onViewDetails,   
  onAddEnhancement,
  onChat,          // Prop for chat action
  onActivity,      // Prop for activity action
  onHealthCheck    // New prop for health check action
}) => {
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
  
  return (
    <div className="relative w-full h-full flex flex-col bg-[#1a2233] rounded-lg shadow-md overflow-hidden border border-[rgba(255,255,255,0.08)] transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px]">
      <div className="p-4 sm:p-5">
        {/* ID and Name section */}
        <div className="mb-2 pr-16 sm:pr-20">
          <div className="font-mono text-xs text-[#888] opacity-70 truncate">{id}</div>
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
        
        {/* Metadata */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-1 sm:gap-2 mb-4 sm:mb-5 text-xs text-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.05)] rounded-md p-2 sm:p-3">
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
        </div>
        
        {/* Action Buttons - Mobile Design (2 rows) */}
        <div className="flex flex-wrap gap-1 mt-auto">
          <div className="flex gap-1 w-full">
            <button 
              onClick={onRun}
              className="flex-1 px-2 sm:px-3 py-2 bg-[#3b82f6] text-white rounded-md text-xs sm:text-sm"
            >
              Run
            </button>
            <button 
              onClick={onViewDetails}
              className="flex-1 px-2 sm:px-3 py-2 bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.9)] rounded-md text-xs sm:text-sm"
            >
              Details
            </button>
            <button 
              onClick={onAddEnhancement}
              className="flex-1 px-2 sm:px-3 py-2 bg-[#7c3aed] text-white rounded-md text-xs sm:text-sm"
            >
              Add
            </button>
          </div>
          <div className="flex gap-1 w-full">
            <button 
              onClick={onChat}
              className="flex-1 px-2 sm:px-3 py-2 bg-[#ea580c] text-white rounded-md text-xs sm:text-sm"
            >
              Chat
            </button>
            <button 
              onClick={onActivity}
              className="flex-1 px-2 sm:px-3 py-2 bg-[#0ea5e9] text-white rounded-md text-xs sm:text-sm"
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