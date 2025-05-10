import React, { useState, useEffect } from 'react';
import FeatureCard from '../components/FeatureCard.jsx';
import ChatModal from '../components/modals/ChatModal.jsx';
import ActivityModal from '../components/modals/ActivityModal.jsx';
import RunModal from '../components/modals/RunModal.jsx';
import DetailsModal from '../components/modals/DetailsModal.jsx';
import EnhancementModal from '../components/modals/EnhancementModal.jsx';
import MilestoneCreator from '../components/MilestoneCreator.jsx';
import FeatureCreator from '../components/FeatureCreator.jsx';
import ChatBasedFeatureCreator from '../components/ChatBasedFeatureCreator.jsx';
import StatusFilters from '../components/StatusFilters.jsx';
import { getChangeTracker } from '../components/ChangeTracker.jsx';
import featureCreationService from '../services/featureCreationService.js';

const FeatureManager = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMilestone, setCurrentMilestone] = useState('all');
  
  // Modal states
  const [chatModal, setChatModal] = useState({ isOpen: false, featureId: null, featureName: '' });
  const [activityModal, setActivityModal] = useState({ isOpen: false, featureId: null, featureName: '' });
  const [runModal, setRunModal] = useState({ isOpen: false, featureId: null, featureName: '' });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, feature: null });
  const [enhancementModal, setEnhancementModal] = useState({ isOpen: false, featureId: null, featureName: '' });
  const [showMilestoneCreator, setShowMilestoneCreator] = useState(false);
  const [showFeatureCreator, setShowFeatureCreator] = useState(false);
  const [showChatBasedCreator, setShowChatBasedCreator] = useState(false);
  const [useChatBasedCreator, setUseChatBasedCreator] = useState(true); // Default to chat-based UI
  
  // Track changes to this component
  useEffect(() => {
    const tracker = getChangeTracker();
    tracker.trackChange('FeatureManager', 'Redesigned feature statistics cards with larger numbers and consistent grid layout based on design specs');
    tracker.trackChange('FeatureManager', 'Added chat-based feature creation interface for more conversational user experience');
  }, []);
  
  // Load features from API
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setLoading(true);

        // Use the feature creation service to fetch features
        const fetchedFeatures = await featureCreationService.fetchFeatures();

        if (Array.isArray(fetchedFeatures) && fetchedFeatures.length > 0) {
          console.log("Fetched features from API:", fetchedFeatures);
          setFeatures(fetchedFeatures);
        } else {
          console.log("No features found or invalid response:", fetchedFeatures);
          // If API returns no features, initialize with empty array
          setFeatures([]);
        }
      } catch (error) {
        console.error("Error fetching features:", error);
        // If API fails, initialize with empty array
        setFeatures([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);
  
  // Action handlers
  const handleRunFeature = (featureId) => {
    console.log('Running feature:', featureId);
    // Find the feature to get its name
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      setRunModal({
        isOpen: true,
        featureId,
        featureName: feature.name
      });
    }
  };
  
  const handleViewDetails = (featureId, initialTab = 'implementation') => {
    console.log('Viewing details for feature:', featureId);
    // Find the feature to get all its details
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      setDetailsModal({
        isOpen: true,
        feature,
        initialTab
      });
    }
  };
  
  const handleViewTasks = (featureId) => {
    // Just use the details modal with the tasks tab active
    handleViewDetails(featureId, 'tasks');
  };
  
  const handleAddEnhancement = (featureId) => {
    console.log('Adding enhancement for feature:', featureId);
    // Find the feature to get its name
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      setEnhancementModal({
        isOpen: true,
        featureId,
        featureName: feature.name
      });
    }
  };
  
  const handleChat = (featureId) => {
    console.log('Opening chat for feature:', featureId);
    // Find the feature to get its name
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      setChatModal({
        isOpen: true,
        featureId,
        featureName: feature.name
      });
    }
  };
  
  const handleActivity = (featureId) => {
    console.log('Viewing activity for feature:', featureId);
    // Find the feature to get its name
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      setActivityModal({
        isOpen: true,
        featureId,
        featureName: feature.name
      });
    }
  };
  
  // Filter and search logic
  const filteredFeatures = features.filter(feature => {
    // Status filter
    if (filter !== 'all' && feature.status !== filter) return false;
    
    // Milestone filter
    if (currentMilestone !== 'all' && feature.milestone !== currentMilestone) return false;
    
    // Search filter
    if (searchTerm && !(
      feature.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchTerm.toLowerCase())
    )) return false;
    
    return true;
  });
  
  // Get unique milestones for filter dropdown
  const milestones = ['all', ...new Set(features.map(f => f.milestone))];
  
  // Calculate status counts
  const statusCounts = features.reduce((counts, feature) => {
    counts[feature.status] = (counts[feature.status] || 0) + 1;
    return counts;
  }, {});

  return (
    <div className="bg-[#0f172a] text-white p-6 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Feature Manager</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => useChatBasedCreator ? setShowChatBasedCreator(true) : setShowFeatureCreator(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors font-medium text-sm sm:text-base"
            >
              Create Feature
            </button>
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="w-full sm:w-auto px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors font-medium text-sm sm:text-base flex items-center"
                onClick={() => setUseChatBasedCreator(!useChatBasedCreator)}
              >
                <span className="mr-1">{useChatBasedCreator ? 'Chat UI' : 'Form UI'}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowMilestoneCreator(true)}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors font-medium text-sm sm:text-base"
          >
            Create Milestone
          </button>
        </div>
      </div>
      
      {/* Stats Summary - Styled to match screenshot exactly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
        <div className="bg-[#121c2e] rounded-lg p-4 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{features.length}</div>
          <div className="text-sm text-gray-400">Total Features</div>
        </div>
        
        <div className="bg-[#121c2e] rounded-lg p-4 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-green-500 mb-1">{statusCounts['completed'] || 0}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        
        <div className="bg-[#121c2e] rounded-lg p-4 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-blue-500 mb-1">{statusCounts['in-progress'] || 0}</div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        
        <div className="bg-[#121c2e] rounded-lg p-4 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-yellow-500 mb-1">{statusCounts['pending'] || 0}</div>
          <div className="text-sm text-gray-400">Pending</div>
        </div>
        
        <div className="bg-[#121c2e] rounded-lg p-4 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-red-500 mb-1">{statusCounts['blocked'] || 0}</div>
          <div className="text-sm text-gray-400">Blocked</div>
        </div>
      </div>
      
      {/* Status Filters Row - Now inside page content */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-[#121c2e] rounded-lg p-3 mb-6">
        <div>
          <StatusFilters filter={filter} setFilter={setFilter} />
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {/* Milestone Filter */}
          <select 
            className="bg-[#0f172a] border border-[rgba(255,255,255,0.1)] text-white text-sm rounded focus:ring-blue-500 focus:border-blue-500 py-2 px-4"
            value={currentMilestone}
            onChange={(e) => setCurrentMilestone(e.target.value)}
          >
            {milestones.map(milestone => (
              <option key={milestone} value={milestone}>
                {milestone === 'all' ? 'All Milestones' : milestone}
              </option>
            ))}
          </select>
          
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              className="bg-[#0f172a] border border-[rgba(255,255,255,0.1)] text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 w-48 sm:w-64 pl-10 p-2"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Results count */}
      <div className="mb-4 text-[rgba(255,255,255,0.6)] text-sm">
        {loading ? 'Loading...' : `Showing ${filteredFeatures.length} of ${features.length} features`}
      </div>

      {/* Features grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="bg-[#1a2233] rounded-lg p-8 text-center border border-[rgba(255,255,255,0.08)]">
          <h3 className="text-xl font-medium text-gray-300">No features found</h3>
          <p className="mt-2 text-[rgba(255,255,255,0.6)]">Try adjusting your filters or search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {filteredFeatures.map(feature => (
            <div className="flex h-full" key={feature.id}>
              <FeatureCard
                id={feature.id}
                name={feature.name}
                description={feature.description}
                status={feature.status}
                module={feature.module}
                phase={feature.phase}
                lastUpdated={feature.lastUpdated}
                onRun={() => handleRunFeature(feature.id)}
                onViewDetails={() => handleViewDetails(feature.id)}
                onAddEnhancement={() => handleAddEnhancement(feature.id)}
                onChat={() => handleChat(feature.id)}
                onActivity={() => handleActivity(feature.id)}
                onTasksClick={() => handleViewTasks(feature.id)}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* All Modals */}
      <ChatModal 
        isOpen={chatModal.isOpen}
        onClose={() => setChatModal({ ...chatModal, isOpen: false })}
        featureId={chatModal.featureId}
        featureName={chatModal.featureName}
      />
      
      <ActivityModal
        isOpen={activityModal.isOpen}
        onClose={() => setActivityModal({ ...activityModal, isOpen: false })}
        featureId={activityModal.featureId}
        featureName={activityModal.featureName}
      />

      <RunModal
        isOpen={runModal.isOpen}
        onClose={() => setRunModal({ ...runModal, isOpen: false })}
        featureId={runModal.featureId}
        featureName={runModal.featureName}
      />
      
      <DetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ ...detailsModal, isOpen: false })}
        feature={detailsModal.feature}
        initialTab={detailsModal.initialTab}
      />
      
      <EnhancementModal
        isOpen={enhancementModal.isOpen}
        onClose={() => setEnhancementModal({ ...enhancementModal, isOpen: false })}
        featureId={enhancementModal.featureId}
        featureName={enhancementModal.featureName}
      />
      
      {/* MilestoneCreator Modal */}
      {showMilestoneCreator && (
        <MilestoneCreator
          onClose={() => setShowMilestoneCreator(false)}
          onSuccess={() => {
            setShowMilestoneCreator(false);

            // Fetch updated features from API
            const refreshFeatures = async () => {
              try {
                setLoading(true);
                const fetchedFeatures = await featureCreationService.fetchFeatures();
                if (Array.isArray(fetchedFeatures)) {
                  setFeatures(fetchedFeatures);
                }
              } catch (error) {
                console.error("Error refreshing features:", error);
              } finally {
                setLoading(false);
              }
            };

            refreshFeatures();
          }}
        />
      )}

      {/* FeatureCreator Modal */}
      {showFeatureCreator && (
        <FeatureCreator
          isOpen={showFeatureCreator}
          onClose={() => setShowFeatureCreator(false)}
          onSuccess={(result) => {
            console.log('FORM CREATOR SUCCESS: Feature created successfully:', result);
            setShowFeatureCreator(false);

            // If we have a result, immediately add it to the features list
            if (result && result.feature) {
              // Create a proper feature object from the result
              const newFeature = {
                id: result.feature.id,
                name: result.feature.name,
                description: result.feature.description || "Feature created via form",
                status: 'pending',
                module: result.feature.suggestedModule || result.feature.module || 'feature-improvements',
                phase: result.feature.suggestedPhase || result.feature.phase || 'phase-02',
                milestone: result.feature.suggestedMilestone || result.feature.milestone || 'milestone-ui-dashboard',
                lastUpdated: new Date().toISOString()
              };

              console.log('Adding new feature to list:', newFeature);

              // Add the new feature to the list immediately
              setFeatures(prev => {
                // Only add if it doesn't already exist
                if (!prev.some(f => f.id === newFeature.id)) {
                  return [...prev, newFeature];
                }
                return prev;
              });
            }

            // Then also try to refresh from API
            const refreshFeatures = async () => {
              try {
                setLoading(true);
                const fetchedFeatures = await featureCreationService.fetchFeatures();
                console.log('API fetchFeatures response:', fetchedFeatures);

                if (Array.isArray(fetchedFeatures) && fetchedFeatures.length > 0) {
                  setFeatures(fetchedFeatures);
                } else {
                  console.warn('API returned empty or invalid features array');
                }
              } catch (error) {
                console.error("Error refreshing features:", error);
              } finally {
                setLoading(false);
              }
            };

            refreshFeatures();
          }}
        />
      )}

      {/* ChatBasedFeatureCreator Modal */}
      {showChatBasedCreator && (
        <ChatBasedFeatureCreator
          isOpen={showChatBasedCreator}
          onClose={() => setShowChatBasedCreator(false)}
          onSuccess={(result, dontCloseModal = false) => {
            console.log('CHAT CREATOR SUCCESS: Feature created successfully:', result);

            // Only close the modal if explicitly instructed to do so
            if (!dontCloseModal) {
              setShowChatBasedCreator(false);
            }

            // If we have a result, immediately add it to the features list
            if (result && result.feature) {
              // Create a proper feature object from the result
              const newFeature = {
                id: result.feature.id,
                name: result.feature.name,
                description: result.feature.description || "Feature created via chat interface",
                status: 'pending',
                module: result.feature.suggestedModule || result.feature.module || 'feature-improvements',
                phase: result.feature.suggestedPhase || result.feature.phase || 'phase-02',
                milestone: result.feature.suggestedMilestone || result.feature.milestone || 'milestone-ui-dashboard',
                lastUpdated: new Date().toISOString(),
                // Add a flag to highlight newly created features
                isNew: true
              };

              console.log('Adding new feature to list:', newFeature);

              // Add the new feature to the list immediately with animation
              setFeatures(prev => {
                // Only add if it doesn't already exist
                if (!prev.some(f => f.id === newFeature.id)) {
                  // Add to beginning of the list for better visibility
                  return [newFeature, ...prev];
                }
                // If it exists, update it and mark as new
                return prev.map(f =>
                  f.id === newFeature.id ? {...newFeature, isNew: true} : f
                );
              });

              // Remove the isNew flag after 5 seconds to stop the animation/highlighting
              setTimeout(() => {
                setFeatures(prev =>
                  prev.map(f =>
                    f.id === newFeature.id ? {...f, isNew: false} : f
                  )
                );
              }, 5000);
            }

            // Then also try to refresh from API
            const refreshFeatures = async () => {
              try {
                setLoading(true);
                const fetchedFeatures = await featureCreationService.fetchFeatures();
                console.log('API fetchFeatures response:', fetchedFeatures);

                if (Array.isArray(fetchedFeatures) && fetchedFeatures.length > 0) {
                  // Preserve the isNew flag when updating from the API
                  setFeatures(prev => {
                    const newFeatures = fetchedFeatures.map(newF => {
                      const existing = prev.find(oldF => oldF.id === newF.id);
                      if (existing && existing.isNew) {
                        return {...newF, isNew: true};
                      }
                      return newF;
                    });
                    return newFeatures;
                  });
                } else {
                  console.warn('API returned empty or invalid features array');
                }
              } catch (error) {
                console.error("Error refreshing features:", error);
              } finally {
                setLoading(false);
              }
            };

            refreshFeatures();
          }}
        />
      )}

    </div>
  );
};

export default FeatureManager;