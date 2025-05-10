import React, { useState, useEffect } from 'react';
import { useChangeTracker } from '../ChangeTracker.jsx';
import { createToast } from '../ToastNotification.jsx';
import { useRollbackManager } from '../RollbackManager.jsx';

const ActivityModal = ({ isOpen, onClose, featureId, featureName, featureType }) => {
  const [activityItems, setActivityItems] = useState([]);
  // Default filter to the feature type if specified, otherwise 'all'
  const [filter, setFilter] = useState(featureType || 'all');
  // Add tag filter for more specific filtering
  const [tagFilter, setTagFilter] = useState('all');
  // Add loading state for visual diffs
  const [loadingVisualDiff, setLoadingVisualDiff] = useState(false);
  // Add state for selected visual diff
  const [selectedVisualDiff, setSelectedVisualDiff] = useState(null);
  
  // Get change tracking and rollback contexts
  const { changes } = useChangeTracker();
  const { getComponentSnapshots, compareSnapshots } = useRollbackManager();

  // Load activity data when modal opens or feature changes
  useEffect(() => {
    if (isOpen && featureId) {
      // In a real app, this would fetch from an API
      // For now, we'll generate sample data based on the feature ID
      const sampleActivities = [
        {
          id: `${featureId}-1`,
          date: 'April 21, 2025 - 14:35',
          timestamp: new Date('2025-04-21T14:35:00').toISOString(),
          description: `Feature implementation completed with core functionality for ${featureName}.`,
          type: 'backend',
          tags: ['implementation', 'core-functionality'],
          relatedTo: ['api', 'data-model'],
          user: {
            initials: 'JD',
            name: 'John Doe'
          }
        },
        {
          id: `${featureId}-2`,
          date: 'April 18, 2025 - 10:22',
          timestamp: new Date('2025-04-18T10:22:00').toISOString(),
          description: 'Added parameter validation to ensure consistent configuration loading.',
          type: 'backend',
          tags: ['validation', 'configuration'],
          relatedTo: ['error-handling'],
          user: {
            initials: 'AS',
            name: 'Alice Smith'
          }
        },
        {
          id: `${featureId}-3`,
          date: 'April 15, 2025 - 09:15',
          timestamp: new Date('2025-04-15T09:15:00').toISOString(),
          description: `Created initial structure for ${featureName} feature.`,
          type: 'backend',
          tags: ['structure', 'setup'],
          relatedTo: [],
          user: {
            initials: 'JD',
            name: 'John Doe'
          }
        }
      ];
      
      // Add UI-specific activities with visual history
      const uiActivities = [
        {
          id: `${featureId}-ui-1`,
          date: 'April 22, 2025 - 16:45',
          timestamp: new Date('2025-04-22T16:45:00').toISOString(),
          description: 'Updated feature card design with improved visual contrast and accessibility.',
          type: 'frontend',
          tags: ['ui', 'design', 'accessibility'],
          relatedTo: ['feature-card'],
          hasVisualChanges: true,
          visualBefore: '/Designs/Components/feature-card-before.png',
          visualAfter: '/Designs/Components/feature-card.jsx',
          changeDetails: {
            type: 'style',
            property: 'background-color',
            before: '#1a2233',
            after: '#1e2a43'
          },
          user: {
            initials: 'RJ',
            name: 'Rachel Jones'
          }
        },
        {
          id: `${featureId}-ui-2`,
          date: 'April 21, 2025 - 11:30',
          timestamp: new Date('2025-04-21T11:30:00').toISOString(),
          description: 'Implemented responsive layout adjustments for feature cards on mobile devices.',
          type: 'frontend',
          tags: ['ui', 'responsive', 'mobile'],
          relatedTo: ['feature-card', 'mobile-view'],
          hasVisualChanges: true,
          user: {
            initials: 'TH',
            name: 'Tom Hayes'
          }
        }
      ];
      
      // Add feature-specific activities based on feature ID patterns
      if (featureId.includes('4602')) {
        sampleActivities.unshift({
          id: `${featureId}-0`,
          date: 'April 22, 2025 - 08:45',
          timestamp: new Date('2025-04-22T08:45:00').toISOString(),
          description: 'Optimized AI inference pipeline for improved performance.',
          type: 'backend',
          tags: ['optimization', 'performance', 'ai'],
          relatedTo: ['inference-engine'],
          user: {
            initials: 'MC',
            name: 'Maria Chen'
          }
        });
        
        // Add UI activity for this feature
        uiActivities.push({
          id: `${featureId}-ui-3`,
          date: 'April 23, 2025 - 09:15',
          timestamp: new Date('2025-04-23T09:15:00').toISOString(),
          description: 'Added visual progress indicator for AI inference process.',
          type: 'frontend',
          tags: ['ui', 'animation', 'progress'],
          relatedTo: ['ai-interface', 'inference-engine'],
          hasVisualChanges: true,
          user: {
            initials: 'RJ',
            name: 'Rachel Jones'
          }
        });
      } else if (featureId.includes('1103')) {
        sampleActivities.unshift({
          id: `${featureId}-0`,
          date: 'April 22, 2025 - 09:30',
          timestamp: new Date('2025-04-22T09:30:00').toISOString(),
          description: 'Added comprehensive tests for edge case handling.',
          type: 'backend',
          tags: ['testing', 'edge-cases'],
          relatedTo: ['test-suite'],
          user: {
            initials: 'RK',
            name: 'Robert Kim'
          }
        });
      }
      
      // Look for tracked changes that match this feature's context
      const trackedChanges = changes
        .filter(change => {
          // Match by feature ID if available
          if (change.featureId === featureId) return true;
          
          // Match by feature name if available
          if (change.featureName && featureName && 
              change.featureName.toLowerCase() === featureName.toLowerCase()) {
            return true;
          }
          
          // Match by component related to this feature (for older changes without feature context)
          if (change.component && (
              change.component.toLowerCase().includes(featureName?.toLowerCase() || '') ||
              change.component.toLowerCase().includes(featureId?.toLowerCase() || ''))) {
            return true;
          }
          
          // Include changes without explicit feature ID only if filtered count is low
          return changes.length < 5;
        })
        .map(change => ({
          id: `tracked-${change.id}`,
          date: new Date(change.timestamp).toLocaleString(),
          timestamp: change.timestamp,
          description: change.displaySummary || change.description,
          // Use the change's type if available, otherwise derive from context
          type: change.type || (
            change.details?.changeType === 'style' || 
            change.details?.changeType === 'layout' || 
            change.details?.changeType === 'theme'
          ) ? 'frontend' : 'backend',
          tags: [
            change.type || 'ui', 
            change.category || change.details?.changeType || 'change',
            ...(change.tags || [])
          ].filter(Boolean),
          relatedTo: [
            change.component,
            ...(change.relatedTo || [])
          ].filter(Boolean),
          hasVisualChanges: Boolean(
            change.details?.changeType === 'style' || 
            change.details?.changeType === 'layout' || 
            change.details?.changeType === 'theme' ||
            change.details?.changeType === 'visual_snapshot'
          ),
          visualDetails: change.details,
          featureContext: {
            featureId: change.featureId,
            featureName: change.featureName,
            milestone: change.milestone,
            phase: change.phase,
            module: change.module
          },
          user: {
            initials: 'DL', // DevLoop
            name: 'System'
          }
        }));
      
      // Extract all unique tags for filter
      const allTags = new Set();
      
      // Collect tags from both sample activities and tracked changes
      [...sampleActivities, ...uiActivities, ...trackedChanges].forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      // Combine all activities and sort by date (newest first)
      const allActivities = [...sampleActivities, ...uiActivities, ...trackedChanges]
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
      
      setActivityItems(allActivities);
    }
  }, [isOpen, featureId, featureName, changes]);

  // Create available tags for filtering
  const getAvailableTags = () => {
    const tags = new Set();
    
    activityItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags).sort();
  };
  
  // Apply multiple filters
  const getFilteredActivities = () => {
    return activityItems.filter(item => {
      // Filter by type
      if (filter !== 'all' && item.type !== filter) {
        return false;
      }
      
      // Filter by tag
      if (tagFilter !== 'all' && (!item.tags || !item.tags.includes(tagFilter))) {
        return false;
      }
      
      return true;
    });
  };
  
  const filteredActivities = getFilteredActivities();
  const availableTags = getAvailableTags();

  // View visual diff
  const viewVisualDiff = async (item) => {
    if (!item.hasVisualChanges) return;
    
    try {
      setLoadingVisualDiff(true);
      
      // In a real implementation, this would:
      // 1. Get the visual snapshots for this component
      // 2. Find the before/after snapshots based on the change timestamp
      // 3. Generate a visual diff between them
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSelectedVisualDiff({
        item,
        before: {
          timestamp: new Date(item.timestamp || item.date).toISOString(),
          component: item.relatedTo?.[0] || 'Unknown',
          // Mock image data (would be real in production)
          imageUrl: null 
        },
        after: {
          timestamp: new Date().toISOString(),
          component: item.relatedTo?.[0] || 'Unknown',
          // Mock image data (would be real in production)  
          imageUrl: null
        },
        diff: {
          changePercentage: Math.floor(Math.random() * 30) + 5, // 5-35%
          hotspots: [
            { x: 120, y: 80, radius: 20, intensity: 0.8 },
            { x: 240, y: 150, radius: 15, intensity: 0.6 }
          ]
        }
      });
      
      createToast.info(`Visual diff loaded for ${item.relatedTo?.[0] || 'component'}`, 3000);
    } catch (error) {
      console.error('Error loading visual diff:', error);
      createToast.error('Failed to load visual diff', 3000);
    } finally {
      setLoadingVisualDiff(false);
    }
  };
  
  // Close visual diff view
  const closeVisualDiff = () => {
    setSelectedVisualDiff(null);
  };

  if (!isOpen) return null;

  // Helper to render tags
  const renderTags = (tags) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map(tag => (
          <span 
            key={tag} 
            className={`px-2 py-0.5 text-xs rounded-full cursor-pointer ${
              tagFilter === tag 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => setTagFilter(tag === tagFilter ? 'all' : tag)}
            title={tagFilter === tag ? "Click to clear filter" : `Filter by ${tag}`}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  // Helper to render related items
  const renderRelatedItems = (relatedItems) => {
    if (!relatedItems || relatedItems.length === 0) return null;
    
    return (
      <div className="mt-2 text-xs text-gray-400">
        Related to: {relatedItems.join(', ')}
      </div>
    );
  };

  // Helper to render visual changes
  const renderVisualChanges = (item) => {
    if (!item.hasVisualChanges) return null;
    
    return (
      <div className="mt-3 p-2 bg-gray-800 rounded-md">
        <div className="flex items-center text-xs text-blue-400 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 1H8.828a2 2 0 00-1.414.586L6.293 2.707A1 1 0 015.586 3H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Visual Changes Available
        </div>
        <button 
          className="w-full text-center py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded flex items-center justify-center"
          onClick={() => viewVisualDiff(item)}
          disabled={loadingVisualDiff}
        >
          {loadingVisualDiff ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading...
            </>
          ) : (
            'View Visual Diff'
          )}
        </button>
        
        {item.visualDetails && item.visualDetails.changeType === 'style' && (
          <div className="mt-2 text-xs">
            <div className="text-gray-400">Style changed:</div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-400">{item.visualDetails.property}:</span>
              <span className="text-red-400">{item.visualDetails.oldValue || item.visualDetails.before}</span>
              <span className="text-gray-400">→</span>
              <span className="text-green-400">{item.visualDetails.newValue || item.visualDetails.after}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] sm:w-[90%] md:w-[700px] h-[80%] sm:h-[600px] bg-[#1a2233] rounded-lg shadow-xl border border-[rgba(255,255,255,0.1)] flex flex-col overflow-hidden">
        <div className={`px-3 sm:px-5 py-2 sm:py-3 flex justify-between items-center ${
          filter === 'frontend' 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
            : filter === 'backend'
              ? 'bg-gradient-to-r from-green-600 to-green-700'
              : 'bg-gradient-to-r from-[#0284c7] to-[#0369a1]'
        }`}>
          <div className="font-semibold text-base sm:text-lg text-white flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
            </svg>
            <span className="truncate max-w-[200px] sm:max-w-none">
              Activity History: {featureName}
              {filter !== 'all' && ` (${filter})`}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 text-2xl leading-none w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        {/* Filter Bar */}
        <div className="bg-[#142033] p-3 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center">
            <div className="text-xs text-gray-400 mr-3">Type:</div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded-md flex items-center ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('frontend')}
                className={`px-3 py-1 text-xs rounded-md flex items-center ${filter === 'frontend' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                <span className="mr-1">🖥️</span>
                Frontend
              </button>
              <button 
                onClick={() => setFilter('backend')}
                className={`px-3 py-1 text-xs rounded-md flex items-center ${filter === 'backend' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              >
                <span className="mr-1">⚙️</span>
                Backend
              </button>
            </div>
          </div>
          
          {/* Tag Filter */}
          {availableTags.length > 0 && tagFilter !== 'all' && (
            <div className="flex items-center">
              <div className="text-xs text-gray-400 mr-3">Tag:</div>
              <div className="flex items-center bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                {tagFilter}
                <button 
                  onClick={() => setTagFilter('all')}
                  className="ml-1 text-blue-400 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Visual Diff Viewer (if selected) */}
        {selectedVisualDiff && (
          <div className="absolute inset-0 z-10 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90%] overflow-auto shadow-xl border border-gray-700">
              <div className="bg-gray-700 p-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">
                  Visual Changes: {selectedVisualDiff.item.relatedTo?.[0] || 'Component'}
                </h3>
                <button 
                  onClick={closeVisualDiff}
                  className="text-gray-300 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-5">
                <div className="text-sm text-gray-300 mb-4">
                  {selectedVisualDiff.item.description}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Before image */}
                  <div className="bg-gray-900 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-2">Before</div>
                    <div className="bg-gray-700 aspect-video flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        [Visual snapshot placeholder]
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {selectedVisualDiff.before.timestamp}
                    </div>
                  </div>
                  
                  {/* After image */}
                  <div className="bg-gray-900 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-2">After</div>
                    <div className="bg-gray-700 aspect-video flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        [Visual snapshot placeholder]
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {selectedVisualDiff.after.timestamp}
                    </div>
                  </div>
                </div>
                
                {/* Change details */}
                <div className="bg-gray-900 p-4 rounded text-sm">
                  <h4 className="text-white font-medium mb-2">Change Details</h4>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="text-gray-400">Change Type:</div>
                    <div className="text-blue-400">
                      {selectedVisualDiff.item.visualDetails?.changeType || 'Visual Update'}
                    </div>
                    
                    <div className="text-gray-400">Change Percentage:</div>
                    <div className="text-blue-400">
                      {selectedVisualDiff.diff.changePercentage}%
                    </div>
                    
                    <div className="text-gray-400">Component:</div>
                    <div className="text-blue-400">
                      {selectedVisualDiff.after.component}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#1a2233]">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No activities found with the current filters.
            </div>
          ) : (
            filteredActivities.map((item) => (
              <div key={item.id} className="border-b border-[rgba(255,255,255,0.1)] py-3 sm:py-4 last:border-0">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <div className="text-xs text-[rgba(255,255,255,0.5)] font-medium">{item.date}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full flex items-center ${
                    item.type === 'frontend' 
                      ? 'bg-blue-900/50 text-blue-400' 
                      : 'bg-green-900/50 text-green-400'
                  }`}>
                    <span className="mr-1">{item.type === 'frontend' ? '🖥️' : '⚙️'}</span>
                    {item.type === 'frontend' ? 'Frontend' : 'Backend'}
                  </div>
                </div>
                
                <div className="text-white mb-2 sm:mb-2 text-xs sm:text-sm leading-relaxed">{item.description}</div>
                
                {/* Tags and related items */}
                {renderTags(item.tags)}
                {renderRelatedItems(item.relatedTo)}
                
                {/* Visual Changes */}
                {renderVisualChanges(item)}
                
                {/* User */}
                <div className="flex items-center text-xs sm:text-sm text-[rgba(255,255,255,0.6)] mt-2">
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${
                    item.type === 'frontend' ? 'bg-blue-600' : 'bg-green-600'
                  } flex items-center justify-center text-white text-xs font-medium mr-2 shadow-sm`}>
                    {item.user.initials}
                  </div>
                  {item.user.name}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-[#142033] p-3 border-t border-gray-800 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'} found
          </div>
          
          {/* Clear filters button - only show when filters are active */}
          {(filter !== 'all' || tagFilter !== 'all') && (
            <button
              onClick={() => {
                setFilter('all');
                setTagFilter('all');
              }}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-md"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;