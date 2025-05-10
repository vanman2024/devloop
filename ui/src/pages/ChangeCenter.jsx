import React, { useState, useEffect } from 'react';
import { useChangeTracker } from '../components/ChangeTracker.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * Change Center - Enhanced UI for managing UI changes with feature linkage
 * Based on the Activity Modal design for consistent UX
 */
const ChangeCenter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the change tracker context
  const { 
    changes, 
    trackChange, 
    environment,
    getChangeStatus,
    getComponentHistory,
    clearChanges,
    copyChangelog
  } = useChangeTracker();

  // Get query params for feature filtering
  const queryParams = new URLSearchParams(location.search);
  const featureFromUrl = queryParams.get('feature');
  
  // Local state
  const [linkedFeatures, setLinkedFeatures] = useState({});
  const [featureRegistry, setFeatureRegistry] = useState([]);
  const [filter, setFilter] = useState(featureFromUrl ? featureFromUrl : 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showingHistoryFor, setShowingHistoryFor] = useState(null);
  const [selectedChange, setSelectedChange] = useState(null);
  const [showVisualDiff, setShowVisualDiff] = useState(false);
  
  // State for approvals/rejections
  const [approvedChanges, setApprovedChanges] = useState([]);
  const [rejectedChanges, setRejectedChanges] = useState([]);

  // Load mock data for feature registry and create sample changes if needed
  useEffect(() => {
    // Mock feature registry data
    const mockFeatures = [
      { id: 'feature-4001-dashboard', name: 'Dashboard UI', type: 'frontend' },
      { id: 'feature-4002-feature-cards', name: 'Feature Cards', type: 'frontend' },
      { id: 'feature-4003-health-monitor', name: 'Health Monitoring', type: 'frontend' },
      { id: 'feature-4004-user-preferences', name: 'User Preferences', type: 'frontend' },
      { id: 'feature-3001-api-integration', name: 'API Integration', type: 'backend' },
      { id: 'feature-3002-memory-module', name: 'Memory Module', type: 'backend' }
    ];
    
    setFeatureRegistry(mockFeatures);
    
    // Try to load linked features from localStorage
    try {
      const storedLinks = localStorage.getItem('devloop_feature_links');
      if (storedLinks) {
        setLinkedFeatures(JSON.parse(storedLinks));
      }
    } catch (error) {
      console.error('Error loading feature links:', error);
    }
    
    // Create some sample UI changes if none exist
    if (changes.length === 0 && trackChange) {
      // Sample style change for feature cards
      trackChange('FeatureCard', 'Updated border style for better distinction', {
        changeType: 'style',
        property: 'border-radius',
        oldValue: '4px',
        newValue: '8px',
        detail: 'Increased border radius for better visual appearance',
        featureId: 'feature-4002-feature-cards'
      });
      
      // Sample content change for dashboard
      trackChange('Dashboard', 'Updated dashboard header text for clarity', {
        changeType: 'content',
        oldContent: 'Project Overview',
        newContent: 'Devloop Dashboard',
        detail: 'Changed dashboard header for clarity',
        featureId: 'feature-4001-dashboard'
      });
      
      // Sample layout change for health monitoring
      trackChange('SystemHealth', 'Reorganized health metrics layout for better UX', {
        changeType: 'layout',
        oldLayout: 'grid-cols-2',
        newLayout: 'grid-cols-3',
        detail: 'Changed from 2-column to 3-column layout',
        featureId: 'feature-4003-health-monitor'
      });
      
      // Sample theme change for the overall UI
      trackChange('Header', 'Updated color theme for better contrast', {
        changeType: 'theme',
        theme: 'dark-blue',
        colorPalette: {
          primary: '#3b82f6',
          secondary: '#6366f1',
          background: '#0f172a',
          surface: '#1e293b'
        },
        detail: 'Switched to dark blue color theme'
      });
      
      // Sample change for user preferences
      trackChange('UserPreferences', 'Added theme toggle in user preferences', {
        changeType: 'feature',
        detail: 'Added ability to toggle between light and dark theme',
        featureId: 'feature-4004-user-preferences'
      });
      
      console.log('Created sample UI changes for demonstration');
    }
  }, [changes.length, trackChange]);
  
  // Save linked features when they change
  useEffect(() => {
    try {
      localStorage.setItem('devloop_feature_links', JSON.stringify(linkedFeatures));
    } catch (error) {
      console.error('Error saving feature links:', error);
    }
  }, [linkedFeatures]);
  
  // Link a change to a feature
  const linkChangeToFeature = (changeId, featureId) => {
    if (!featureId) {
      // Remove link if empty string is passed
      const newLinks = {...linkedFeatures};
      delete newLinks[changeId];
      setLinkedFeatures(newLinks);
    } else {
      setLinkedFeatures(prev => ({
        ...prev,
        [changeId]: featureId
      }));
    }
  };
  
  // Get feature by ID
  const getFeatureById = (featureId) => {
    return featureRegistry.find(feature => feature.id === featureId) || null;
  };
  
  // Extract all tags from changes
  const getAvailableTags = () => {
    const tags = new Set();
    
    changes.forEach(change => {
      // Add change type as a tag
      if (change.details?.changeType) {
        tags.add(change.details.changeType);
      }
      
      // Add category as a tag if available
      if (change.category) {
        tags.add(change.category);
      }
      
      // Add explicit tags if available
      if (change.tags && Array.isArray(change.tags)) {
        change.tags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags).sort();
  };
  
  // Get unique components from all changes
  const getUniqueComponents = () => {
    return [...new Set(changes.map(change => change.component))];
  };
  
  // Filter changes based on the selected options
  const getFilteredChanges = () => {
    return changes.filter(change => {
      // Filter by feature
      if (filter !== 'all') {
        if (filter === 'unlinked') {
          // Show changes not linked to any feature
          if (linkedFeatures[change.id] || change.featureId) return false;
        } else {
          // Show changes linked to specific feature
          const explicitFeatureId = change.featureId;
          const linkedFeatureId = linkedFeatures[change.id];
          
          if (explicitFeatureId !== filter && linkedFeatureId !== filter) return false;
        }
      }
      
      // Filter by type (frontend/backend)
      if (typeFilter !== 'all') {
        const changeType = getChangeType(change);
        if (changeType !== typeFilter) return false;
      }
      
      // Filter by tag/category
      if (tagFilter !== 'all') {
        const changeTypeTag = change.details?.changeType;
        const categoryTag = change.category;
        const hasTags = change.tags && Array.isArray(change.tags) && change.tags.includes(tagFilter);
        
        if (changeTypeTag !== tagFilter && categoryTag !== tagFilter && !hasTags) return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesComponent = change.component.toLowerCase().includes(query);
        const matchesDescription = change.description.toLowerCase().includes(query);
        const matchesSummary = (change.displaySummary || '').toLowerCase().includes(query);
        
        if (!matchesComponent && !matchesDescription && !matchesSummary) return false;
      }
      
      return true;
    });
  };
  
  // Determine if a change is frontend or backend
  const getChangeType = (change) => {
    // Explicit type takes precedence
    if (change.type) return change.type;
    
    // Determine from feature context
    if (change.featureId) {
      const feature = getFeatureById(change.featureId);
      if (feature) return feature.type;
    }
    
    // Determine from the change details
    const uiChangeTypes = ['style', 'layout', 'theme', 'visual', 'content'];
    if (change.details?.changeType && uiChangeTypes.includes(change.details.changeType)) {
      return 'frontend';
    }
    
    // Determine from component name
    const uiComponents = ['card', 'dashboard', 'ui', 'button', 'modal', 'component', 'header', 'footer', 'sidebar'];
    for (const keyword of uiComponents) {
      if (change.component.toLowerCase().includes(keyword)) {
        return 'frontend';
      }
    }
    
    // Default to backend if no other indicators
    return 'backend';
  };
  
  // Handle approval process
  const handleApprove = (changeId) => {
    setApprovedChanges(prev => [...prev, changeId]);
    setRejectedChanges(prev => prev.filter(id => id !== changeId));
  };
  
  // Handle rejection process
  const handleReject = (changeId) => {
    setRejectedChanges(prev => [...prev, changeId]);
    setApprovedChanges(prev => prev.filter(id => id !== changeId));
  };
  
  // Reset change status
  const resetStatus = (changeId) => {
    setApprovedChanges(prev => prev.filter(id => id !== changeId));
    setRejectedChanges(prev => prev.filter(id => id !== changeId));
  };
  
  // Get status of a change
  const getStatus = (changeId) => {
    if (approvedChanges.includes(changeId)) return 'approved';
    if (rejectedChanges.includes(changeId)) return 'rejected';
    return 'pending';
  };
  
  // View visual diff for a change
  const viewVisualDiff = (change) => {
    setSelectedChange(change);
    setShowVisualDiff(true);
  };
  
  // Format date in a consistent way
  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Get change details for visual representation
  const getChangeDetails = (change) => {
    if (!change.details) return null;
    
    const { changeType } = change.details;
    
    switch (changeType) {
      case 'style':
        return (
          <div className="mt-2 text-xs">
            <div className="text-gray-400">Style changed:</div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-400">{change.details.property}:</span>
              <span className="text-red-400">{change.details.oldValue}</span>
              <span className="text-gray-400 mx-1">→</span>
              <span className="text-green-400">{change.details.newValue}</span>
            </div>
          </div>
        );
        
      case 'content':
        return (
          <div className="mt-2 text-xs">
            <div className="text-gray-400">Content changed:</div>
            <div className="bg-gray-900 p-2 rounded mt-1">
              <div className="text-red-400 line-through">{change.details.oldContent}</div>
              <div className="text-green-400">{change.details.newContent}</div>
            </div>
          </div>
        );
        
      case 'layout':
        return (
          <div className="mt-2 text-xs">
            <div className="text-gray-400">Layout changed:</div>
            <div className="flex items-center mt-1">
              <span className="text-red-400">{change.details.oldLayout}</span>
              <span className="mx-1">→</span>
              <span className="text-green-400">{change.details.newLayout}</span>
            </div>
          </div>
        );
        
      case 'theme':
        return (
          <div className="mt-2 text-xs">
            <div className="text-gray-400">Theme changed to {change.details.theme}:</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(change.details.colorPalette || {}).map(([key, value]) => (
                <div key={key} className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-1" 
                    style={{ backgroundColor: value }}
                  ></div>
                  <span className="text-gray-300">{key}</span>
                </div>
              ))}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Render tags for filtering
  const renderTags = (change) => {
    // Collect all possible tags for this change
    const tags = [];
    
    // Add change type if available
    if (change.details?.changeType) {
      tags.push(change.details.changeType);
    }
    
    // Add category if available
    if (change.category) {
      tags.push(change.category);
    }
    
    // Add explicit tags if available
    if (change.tags && Array.isArray(change.tags)) {
      tags.push(...change.tags);
    }
    
    if (tags.length === 0) return null;
    
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
            onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
            title={tagFilter === tag ? "Click to clear filter" : `Filter by ${tag}`}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };
  
  // Check if a change has visual information
  const hasVisualChanges = (change) => {
    if (!change.details) return false;
    
    const visualChangeTypes = ['style', 'layout', 'theme', 'visual'];
    return visualChangeTypes.includes(change.details.changeType);
  };
  
  // Render visual diff modal
  const renderVisualDiffModal = () => {
    if (!showVisualDiff || !selectedChange) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl border border-gray-700">
          <div className="bg-gray-700 p-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">
              Visual Changes: {selectedChange.component}
            </h3>
            <button 
              onClick={() => setShowVisualDiff(false)}
              className="text-gray-300 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="p-6">
            <div className="text-white mb-4">
              {selectedChange.displaySummary || selectedChange.description}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Before image */}
              <div className="bg-gray-900 p-4 rounded">
                <div className="text-sm text-gray-400 mb-2">Before</div>
                <div className="bg-gray-700 aspect-video flex items-center justify-center">
                  <span className="text-gray-500">
                    [Visual snapshot would appear here]
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Previous version
                </div>
              </div>
              
              {/* After image */}
              <div className="bg-gray-900 p-4 rounded">
                <div className="text-sm text-gray-400 mb-2">After</div>
                <div className="bg-gray-700 aspect-video flex items-center justify-center">
                  <span className="text-gray-500">
                    [Visual snapshot would appear here]
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Current version
                </div>
              </div>
            </div>
            
            {/* Change details */}
            <div className="bg-gray-900 p-4 rounded">
              <h4 className="text-white font-medium mb-4">Change Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-gray-400">Change Type:</div>
                <div className="text-blue-400">
                  {selectedChange.details?.changeType || 'Visual Update'}
                </div>
                
                <div className="text-gray-400">Component:</div>
                <div className="text-blue-400">
                  {selectedChange.component}
                </div>
                
                <div className="text-gray-400">Changed On:</div>
                <div className="text-blue-400">
                  {formatDate(selectedChange.timestamp)}
                </div>
                
                {selectedChange.details?.changeType === 'style' && (
                  <>
                    <div className="text-gray-400">Property:</div>
                    <div className="text-blue-400">
                      {selectedChange.details.property}
                    </div>
                    
                    <div className="text-gray-400">Before:</div>
                    <div className="text-red-400">
                      {selectedChange.details.oldValue}
                    </div>
                    
                    <div className="text-gray-400">After:</div>
                    <div className="text-green-400">
                      {selectedChange.details.newValue}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 flex justify-end">
            <button 
              onClick={() => setShowVisualDiff(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render history modal
  const renderHistoryModal = () => {
    if (!showingHistoryFor) return null;
    
    // Get component history if available
    const history = getComponentHistory ? getComponentHistory(showingHistoryFor) : [];
    
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700">
          <div className="bg-gray-700 p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">
              Change History: {showingHistoryFor}
            </h3>
            <button 
              onClick={() => setShowingHistoryFor(null)}
              className="text-gray-300 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="p-4 overflow-auto flex-grow">
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No history found for this component.
              </div>
            ) : (
              <div className="border-l-2 border-gray-700 ml-3 pl-6 py-2 space-y-6">
                {history.map((item, index) => (
                  <div 
                    key={item.id || index}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-[-20px] top-0 h-4 w-4 rounded-full bg-blue-500 border-2 border-gray-800"></div>
                    
                    {/* Date/time */}
                    <div className="text-sm text-gray-400 mb-1">
                      {formatDate(item.timestamp)}
                    </div>
                    
                    {/* Description */}
                    <div className="text-white font-medium">
                      {item.displaySummary || item.description}
                    </div>
                    
                    {/* Version indicator */}
                    <div className="text-xs text-gray-500 mt-1">
                      {index === 0 ? 'Initial version' : `Revision ${index}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-gray-700 p-4 flex justify-end">
            <button 
              onClick={() => setShowingHistoryFor(null)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Get filtered changes
  const filteredChanges = getFilteredChanges();
  const availableTags = getAvailableTags();
  const uniqueComponents = getUniqueComponents();

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">UI Change Center</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => clearChanges && clearChanges()}
            className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-md px-4 py-2 flex items-center text-sm"
          >
            <span className="mr-2">🗑️</span> Clear All
          </button>
          
          <button 
            onClick={() => copyChangelog && copyChangelog()}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md px-4 py-2 flex items-center text-sm"
          >
            <span className="mr-2">📋</span> Copy Changelog
          </button>
          
          <button 
            className="bg-green-600 hover:bg-green-500 text-white font-medium rounded-md px-4 py-2 flex items-center text-sm"
            disabled={approvedChanges.length === 0}
          >
            <span className="mr-2">🚀</span> Push Changes
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="flex flex-wrap justify-between items-end gap-4">
          {/* Feature Filter */}
          <div className="w-full md:w-auto min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Filter by Feature
            </label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Changes</option>
              <option value="unlinked">Unlinked Changes</option>
              {featureRegistry.map(feature => (
                <option key={feature.id} value={feature.id}>
                  {feature.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Change Type
            </label>
            <div className="flex space-x-2">
              <button 
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-2 text-sm rounded-md ${
                  typeFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter('frontend')}
                className={`px-3 py-2 text-sm rounded-md flex items-center ${
                  typeFilter === 'frontend' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="mr-2">🖥️</span>
                Frontend
              </button>
              <button 
                onClick={() => setTypeFilter('backend')}
                className={`px-3 py-2 text-sm rounded-md flex items-center ${
                  typeFilter === 'backend' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="mr-2">⚙️</span>
                Backend
              </button>
            </div>
          </div>
          
          {/* Component Filter */}
          <div className="w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search in changes..."
                className="w-full min-w-[250px] bg-gray-700 border border-gray-600 rounded-md py-2 pl-10 pr-3 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tag filters */}
        {availableTags.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-300 mb-2">
              Categories:
            </div>
            <div className="flex flex-wrap gap-2">
              <span 
                className={`px-3 py-1 text-sm rounded-full cursor-pointer ${
                  tagFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setTagFilter('all')}
              >
                All
              </span>
              {availableTags.map(tag => (
                <span 
                  key={tag} 
                  className={`px-3 py-1 text-sm rounded-full cursor-pointer ${
                    tagFilter === tag 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setTagFilter(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Active filters - show when filters are applied */}
        {(filter !== 'all' || typeFilter !== 'all' || tagFilter !== 'all' || searchQuery) && (
          <div className="mt-4 flex items-center flex-wrap gap-2">
            <span className="text-sm text-gray-400">Active filters:</span>
            
            {filter !== 'all' && (
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                Feature: {filter === 'unlinked' ? 'Unlinked' : getFeatureById(filter)?.name || filter}
                <button 
                  onClick={() => setFilter('all')}
                  className="ml-2 text-blue-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            
            {typeFilter !== 'all' && (
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                Type: {typeFilter}
                <button 
                  onClick={() => setTypeFilter('all')}
                  className="ml-2 text-blue-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            
            {tagFilter !== 'all' && (
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                Category: {tagFilter}
                <button 
                  onClick={() => setTagFilter('all')}
                  className="ml-2 text-blue-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            
            {searchQuery && (
              <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center">
                Search: {searchQuery}
                <button 
                  onClick={() => setSearchQuery('')}
                  className="ml-2 text-blue-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            
            <button
              onClick={() => {
                setFilter('all');
                setTypeFilter('all');
                setTagFilter('all');
                setSearchQuery('');
              }}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-md"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
      
      {/* Changes List */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r from-[#1e40af] to-[#4f46e5] flex justify-between items-center`}>
          <div className="font-semibold text-lg text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            UI Changes
            {filter !== 'all' && filter !== 'unlinked' && (
              <span className="ml-2">
                - {getFeatureById(filter)?.name || filter}
              </span>
            )}
            <span className="ml-2 bg-white text-blue-600 rounded-full px-2 text-sm">
              {filteredChanges.length}
            </span>
          </div>
        </div>
        
        {/* Changes */}
        <div className="overflow-auto p-0">
          {filteredChanges.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No changes match the current filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredChanges.map((change) => {
                const linkedFeatureId = linkedFeatures[change.id] || change.featureId;
                const linkedFeature = linkedFeatureId ? getFeatureById(linkedFeatureId) : null;
                const status = getStatus(change.id);
                const changeType = getChangeType(change);
                
                return (
                  <div 
                    key={change.id} 
                    className={`p-5 hover:bg-gray-750 transition-colors ${
                      status === 'approved' ? 'bg-green-900/10' : 
                      status === 'rejected' ? 'bg-red-900/10' : 
                      'bg-gray-800'
                    }`}
                  >
                    {/* Top section with component name, feature link, timestamp, and buttons */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="text-blue-400 font-medium text-lg">
                            {change.component}
                          </div>
                          
                          {status === 'approved' && (
                            <span className="bg-green-500/20 text-green-400 text-xs py-1 px-2 rounded-full">
                              Approved
                            </span>
                          )}
                          
                          {status === 'rejected' && (
                            <span className="bg-red-500/20 text-red-400 text-xs py-1 px-2 rounded-full">
                              Declined
                            </span>
                          )}
                          
                          <span className={`text-xs px-2 py-1 rounded-full flex items-center ${
                            changeType === 'frontend' 
                              ? 'bg-blue-900/30 text-blue-400' 
                              : 'bg-green-900/30 text-green-400'
                          }`}>
                            <span className="mr-1">{changeType === 'frontend' ? '🖥️' : '⚙️'}</span>
                            {changeType === 'frontend' ? 'Frontend' : 'Backend'}
                          </span>
                          
                          {/* Feature link badge */}
                          {linkedFeature ? (
                            <Link 
                              to={`/change-center?feature=${linkedFeatureId}`}
                              className="bg-blue-500/20 text-blue-400 text-xs py-1 px-2 rounded-full flex items-center"
                            >
                              <span className="mr-1">🔗</span>
                              {linkedFeature.name}
                              {linkedFeatureId !== change.featureId && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    linkChangeToFeature(change.id, '');
                                  }}
                                  className="ml-1 text-blue-400 hover:text-white"
                                  title="Unlink from feature"
                                >
                                  ×
                                </button>
                              )}
                            </Link>
                          ) : (
                            <select
                              className="bg-gray-700 border border-gray-600 rounded-full text-xs py-1 px-2 text-white"
                              value=""
                              onChange={(e) => linkChangeToFeature(change.id, e.target.value)}
                            >
                              <option value="">Link to feature...</option>
                              {featureRegistry.map(feature => (
                                <option key={feature.id} value={feature.id}>
                                  {feature.name}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {/* History button - shown if component has history */}
                          {getComponentHistory && getComponentHistory(change.component).length > 1 && (
                            <button
                              onClick={() => setShowingHistoryFor(change.component)}
                              className="bg-blue-500/20 text-blue-400 text-xs py-1 px-2 rounded-full flex items-center"
                              title="View history"
                            >
                              <span className="mr-1">📜</span>
                              History
                            </button>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-400 mt-1">
                          {formatDate(change.timestamp)}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex space-x-2">
                        {/* Visual diff button - only shown for visual changes */}
                        {hasVisualChanges(change) && (
                          <button
                            onClick={() => viewVisualDiff(change)}
                            className="text-blue-400 hover:text-blue-300"
                            title="View visual diff"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        
                        {/* History button */}
                        <button
                          onClick={() => setShowingHistoryFor(change.component)}
                          className="text-blue-400 hover:text-blue-300"
                          title="View history"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="text-white my-3">
                      {change.displaySummary || change.description}
                    </div>
                    
                    {/* Tags */}
                    {renderTags(change)}
                    
                    {/* Change details (if available) */}
                    {getChangeDetails(change)}
                    
                    {/* Action buttons */}
                    <div className="mt-4 flex justify-end">
                      {status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleReject(change.id)}
                            className="px-3 py-1 bg-gray-700 hover:bg-red-700 text-white rounded-md flex items-center mr-2"
                          >
                            <span className="mr-1">👎</span> Decline
                          </button>
                          <button 
                            onClick={() => handleApprove(change.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
                          >
                            <span className="mr-1">👍</span> Approve
                          </button>
                        </>
                      )}
                      
                      {(status === 'approved' || status === 'rejected') && (
                        <button 
                          onClick={() => resetStatus(change.id)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
                        >
                          Reset Status
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-900 p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {filteredChanges.length} {filteredChanges.length === 1 ? 'change' : 'changes'} found
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={() => copyChangelog && copyChangelog()}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Export Changelog
            </button>
            
            <button 
              className="text-blue-400 hover:text-blue-300 text-sm"
              disabled={approvedChanges.length === 0}
            >
              Push Approved Changes ({approvedChanges.length})
            </button>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {renderHistoryModal()}
      {renderVisualDiffModal()}
    </div>
  );
};

export default ChangeCenter;