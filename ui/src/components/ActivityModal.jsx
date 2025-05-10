import React, { useState, useEffect } from 'react';

const ActivityModal = ({ isOpen, onClose, featureId, featureName }) => {
  const [activityItems, setActivityItems] = useState([]);

  // Load activity data when modal opens or feature changes
  useEffect(() => {
    if (isOpen && featureId) {
      // In a real app, this would fetch from an API
      // For now, we'll generate sample data based on the feature ID
      const sampleActivities = [
        {
          id: `${featureId}-1`,
          date: 'April 21, 2025 - 14:35',
          description: `Feature implementation completed with core functionality for ${featureName}.`,
          user: {
            initials: 'JD',
            name: 'John Doe'
          }
        },
        {
          id: `${featureId}-2`,
          date: 'April 18, 2025 - 10:22',
          description: 'Added parameter validation to ensure consistent configuration loading.',
          user: {
            initials: 'AS',
            name: 'Alice Smith'
          }
        },
        {
          id: `${featureId}-3`,
          date: 'April 15, 2025 - 09:15',
          description: `Created initial structure for ${featureName} feature.`,
          user: {
            initials: 'JD',
            name: 'John Doe'
          }
        }
      ];
      
      // Add a feature-specific activity
      if (featureId.includes('4602')) {
        sampleActivities.unshift({
          id: `${featureId}-0`,
          date: 'April 22, 2025 - 08:45',
          description: 'Optimized AI inference pipeline for improved performance.',
          user: {
            initials: 'MC',
            name: 'Maria Chen'
          }
        });
      } else if (featureId.includes('1103')) {
        sampleActivities.unshift({
          id: `${featureId}-0`,
          date: 'April 22, 2025 - 09:30',
          description: 'Added comprehensive tests for edge case handling.',
          user: {
            initials: 'RK',
            name: 'Robert Kim'
          }
        });
      }
      
      setActivityItems(sampleActivities);
    }
  }, [isOpen, featureId, featureName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-[90%] md:w-[600px] h-[80%] sm:h-[500px] bg-[#1a2233] rounded-lg shadow-xl border border-[rgba(255,255,255,0.1)] flex flex-col overflow-hidden">
        <div className="bg-[#0284c7] px-3 sm:px-5 py-2 sm:py-3 flex justify-between items-center">
          <div className="font-semibold text-base sm:text-lg text-white flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
            </svg>
            <span className="truncate max-w-[200px] sm:max-w-none">Activity History: {featureName}</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#1a2233]">
          {activityItems.map((item) => (
            <div key={item.id} className="border-b border-[rgba(255,255,255,0.1)] py-3 sm:py-4 last:border-0">
              <div className="text-xs text-[rgba(255,255,255,0.5)] mb-1 sm:mb-2 font-medium">{item.date}</div>
              <div className="text-white mb-2 sm:mb-3 text-xs sm:text-sm leading-relaxed">{item.description}</div>
              <div className="flex items-center text-xs sm:text-sm text-[rgba(255,255,255,0.6)]">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0284c7] flex items-center justify-center text-white text-xs font-medium mr-2 shadow-sm">
                  {item.user.initials}
                </div>
                {item.user.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;