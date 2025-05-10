import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MilestoneCreator from './MilestoneCreator';
import featureCreationService from '../services/featureCreationService';

/**
 * FeatureManager Component
 * 
 * Main feature management dashboard with milestone creation functionality
 * Integrates with the Knowledge Graph for feature management and organization
 */
const FeatureManager = () => {
  // State
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMilestoneCreator, setShowMilestoneCreator] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Filter states
  const [filterMilestone, setFilterMilestone] = useState('all');
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Available options for filtering
  const [milestones, setMilestones] = useState([]);
  const [phases, setPhases] = useState([]);
  const [modules, setModules] = useState([]);
  
  // Fetch features data from Knowledge Graph
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch features from Knowledge Graph
        const featuresData = await featureCreationService.fetchFeatures({
          milestone: filterMilestone !== 'all' ? filterMilestone : undefined,
          phase: filterPhase !== 'all' ? filterPhase : undefined,
          module: filterModule !== 'all' ? filterModule : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined
        });
        
        console.log("Received feature data:", featuresData);
        console.log("Data type:", typeof featuresData, "Length:", featuresData.length, "Is Array:", Array.isArray(featuresData));
        
        // Always use the data from the API, even if it's an empty array
        setFeatures(featuresData);
        
        if (featuresData.length > 0) {
          // Extract unique milestones, phases, and modules for filters
          const uniqueMilestones = [...new Set(featuresData.map(f => f.milestone))].filter(Boolean);
          const uniquePhases = [...new Set(featuresData.map(f => f.phase))].filter(Boolean);
          const uniqueModules = [...new Set(featuresData.map(f => f.module))].filter(Boolean);
          
          setMilestones(uniqueMilestones);
          setPhases(uniquePhases);
          setModules(uniqueModules);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load feature data from the Knowledge Graph API.');
        
        // Don't use sample data, just show an error
        setFeatures([]);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [filterMilestone, filterPhase, filterModule, filterStatus]);
  
  // Use sample data as fallback
  const useSampleData = () => {
    const sampleFeatures = [
      {
        id: 'feature-460100-model-initialization',
        name: 'Model Initialization',
        description: 'System for initializing AI models with proper configuration and parameter loading.',
        status: 'completed',
        module: 'module-core',
        phase: 'phase-01',
        milestone: 'milestone-ai-enhanced-development',
        lastUpdated: '2025-04-10T14:30:00Z'
      },
      {
        id: 'feature-460101-inference-engine',
        name: 'AI Inference Engine',
        description: 'Core inference processing system with optimized pipeline for model execution and result handling.',
        status: 'in-progress',
        module: 'module-core',
        phase: 'phase-01',
        milestone: 'milestone-ai-enhanced-development',
        lastUpdated: '2025-04-15T09:45:00Z'
      },
      {
        id: 'feature-460102-model-config-manager',
        name: 'Configuration Manager',
        description: 'Management system for AI model configurations with validation and versioning capabilities.',
        status: 'pending',
        module: 'module-core',
        phase: 'phase-01',
        milestone: 'milestone-ai-enhanced-development',
        lastUpdated: '2025-04-12T11:20:00Z'
      },
      {
        id: 'feature-460103-advanced-orchestration',
        name: 'Workflow Orchestration',
        description: 'Advanced orchestration layer for coordinating multiple model workflows and dependencies.',
        status: 'blocked',
        module: 'module-core',
        phase: 'phase-01',
        milestone: 'milestone-ai-enhanced-development',
        lastUpdated: '2025-04-18T16:40:00Z'
      },
      {
        id: 'feature-4001-dashboard-core',
        name: 'Dashboard Framework',
        description: 'Core dashboard framework with modular components and responsive layout.',
        status: 'completed',
        module: 'module-ui',
        phase: 'phase-01',
        milestone: 'milestone-ui-dashboard',
        lastUpdated: '2025-04-05T10:15:00Z'
      },
      {
        id: 'feature-4002-data-visualization',
        name: 'Data Visualization',
        description: 'Visualization components for displaying project metrics and progress data.',
        status: 'in-progress',
        module: 'module-ui',
        phase: 'phase-01',
        milestone: 'milestone-ui-dashboard',
        lastUpdated: '2025-04-17T08:30:00Z'
      }
    ];
    
    setFeatures(sampleFeatures);
    
    // Extract unique values for filters
    const uniqueMilestones = [...new Set(sampleFeatures.map(f => f.milestone))].filter(Boolean);
    const uniquePhases = [...new Set(sampleFeatures.map(f => f.phase))].filter(Boolean);
    const uniqueModules = [...new Set(sampleFeatures.map(f => f.module))].filter(Boolean);
    
    setMilestones(uniqueMilestones);
    setPhases(uniquePhases);
    setModules(uniqueModules);
  };
  
  // Filter features based on search term
  const searchFilteredFeatures = features.filter(feature => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      feature.id.toLowerCase().includes(term) ||
      feature.name.toLowerCase().includes(term) ||
      feature.description.toLowerCase().includes(term)
    );
  });
  
  // Compute stats
  const stats = {
    total: features.length,
    completed: features.filter(f => f.status === 'completed').length,
    inProgress: features.filter(f => f.status === 'in-progress' || f.status === 'in_progress').length,
    pending: features.filter(f => f.status === 'pending' || f.status === 'not_started').length,
    blocked: features.filter(f => f.status === 'blocked').length
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Update feature status
  const updateFeatureStatus = async (featureId, newStatus) => {
    try {
      setIsLoading(true);
      
      // Update feature in Knowledge Graph
      await featureCreationService.updateFeature(featureId, { status: newStatus });
      
      // Update local state
      setFeatures(prevFeatures => 
        prevFeatures.map(feature => 
          feature.id === featureId 
            ? { ...feature, status: newStatus, lastUpdated: new Date().toISOString() } 
            : feature
        )
      );
      
      setNotification({
        type: 'success',
        message: `Feature status updated successfully to ${newStatus}`,
        details: `Feature ID: ${featureId}`
      });
      
      setTimeout(() => setNotification(null), 5000); // Auto-dismiss after 5 seconds
    } catch (error) {
      console.error('Error updating feature status:', error);
      setNotification({
        type: 'error',
        message: 'Failed to update feature status',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle milestone creation
  const handleCreateMilestone = () => {
    setShowMilestoneCreator(true);
  };
  
  // Handle milestone creation result
  const handleMilestoneCreated = (result) => {
    setShowMilestoneCreator(false);
    setNotification({
      type: 'success',
      message: `Milestone ${result.milestone_id} created successfully!`,
      details: result.next_steps
    });
    
    // Refresh the data
    setTimeout(() => setNotification(null), 10000); // Auto-dismiss after 10 seconds
  };
  
  // Render feature card
  const renderFeatureCard = (feature) => {
    // Format status text for display
    const statusMap = {
      'completed': 'Completed',
      'in-progress': 'In Progress',
      'in_progress': 'In Progress',
      'pending': 'Pending',
      'not_started': 'Not Started',
      'blocked': 'Blocked'
    };
    
    const statusText = statusMap[feature.status] || 'Unknown';
    const statusClass = feature.status.replace('_', '-');
    
    return (
      <div key={feature.id} className={`feature-card status-${statusClass}`}>
        <div className="feature-card-content">
          <div className="feature-id">{feature.id}</div>
          <h3 className="feature-name">{feature.name}</h3>
          
          <div className={`status-badge ${statusClass}`}>{statusText}</div>
          
          <div className="feature-description">{feature.description}</div>
          
          <div className="feature-metadata">
            <div className="metadata-item">
              <span className="metadata-label">Module:</span>
              <span className="metadata-value">{feature.module}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Phase:</span>
              <span className="metadata-value">{feature.phase}</span>
            </div>
            <div className="metadata-item">
              <span className="metadata-label">Updated:</span>
              <span className="metadata-value">{formatDate(feature.lastUpdated)}</span>
            </div>
          </div>
          
          <div className="feature-actions">
            <button 
              className="action-button run"
              onClick={() => console.log('Run feature:', feature.id)}
            >
              Run
            </button>
            <button 
              className="action-button details"
              onClick={() => console.log('View details:', feature.id)}
            >
              Details
            </button>
            <button 
              className="action-button enhance"
              onClick={() => console.log('Add enhancement:', feature.id)}
            >
              Add Enhancement
            </button>
          </div>
          
          {/* Status Control Buttons */}
          <div className="feature-status-controls mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Update Status:</div>
            <div className="flex flex-wrap gap-1">
              <button 
                className={`status-btn completed ${feature.status === 'completed' ? 'active' : ''}`}
                onClick={() => updateFeatureStatus(feature.id, 'completed')}
                disabled={feature.status === 'completed'}
              >
                Completed
              </button>
              <button 
                className={`status-btn in-progress ${feature.status === 'in-progress' || feature.status === 'in_progress' ? 'active' : ''}`}
                onClick={() => updateFeatureStatus(feature.id, 'in-progress')}
                disabled={feature.status === 'in-progress' || feature.status === 'in_progress'}
              >
                In Progress
              </button>
              <button 
                className={`status-btn pending ${feature.status === 'pending' || feature.status === 'not_started' ? 'active' : ''}`}
                onClick={() => updateFeatureStatus(feature.id, 'pending')}
                disabled={feature.status === 'pending' || feature.status === 'not_started'}
              >
                Pending
              </button>
              <button 
                className={`status-btn blocked ${feature.status === 'blocked' ? 'active' : ''}`}
                onClick={() => updateFeatureStatus(feature.id, 'blocked')}
                disabled={feature.status === 'blocked'}
              >
                Blocked
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="feature-manager">
      <header className="header">
        <div className="container">
          <h1>Feature Manager</h1>
        </div>
      </header>
      
      <div className="container">
        {/* Notification */}
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <div className="notification-content">
              <div className="notification-message">{notification.message}</div>
              {notification.details && (
                <div className="notification-details">
                  <pre>{notification.details}</pre>
                </div>
              )}
            </div>
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              &times;
            </button>
          </div>
        )}
      
        {/* Management Controls */}
        <div className="management-controls">
          <button 
            className="control-button primary"
            onClick={handleCreateMilestone}
          >
            Create Milestone
          </button>
          <button className="control-button">Create Feature</button>
          <button className="control-button">Run Selected</button>
          <button className="control-button">Update Status</button>
          <button className="control-button">Refresh Data</button>
        </div>
        
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Features</div>
          </div>
          <div className="stat-item">
            <div className="stat-value completed">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-value in-progress">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-item">
            <div className="stat-value pending">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-item">
            <div className="stat-value blocked">{stats.blocked}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="filter-row">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search features by ID, name, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="filter-group">
              <label className="filter-label">Milestone:</label>
              <select 
                className="filter-select"
                value={filterMilestone}
                onChange={(e) => setFilterMilestone(e.target.value)}
              >
                <option value="all">All Milestones</option>
                {milestones.map(milestone => (
                  <option key={milestone} value={milestone}>{milestone}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Phase:</label>
              <select 
                className="filter-select"
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value)}
              >
                <option value="all">All Phases</option>
                {phases.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Module:</label>
              <select 
                className="filter-select"
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
              >
                <option value="all">All Modules</option>
                {modules.map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
            </div>
            
            <div className="status-filters">
              <label className="status-filter">
                <input 
                  type="checkbox" 
                  name="status-completed" 
                  checked={filterStatus === 'all' || filterStatus === 'completed'} 
                  onChange={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
                />
                <span className="status-indicator status-completed"></span>
                Completed
              </label>
              <label className="status-filter">
                <input 
                  type="checkbox" 
                  name="status-in-progress" 
                  checked={filterStatus === 'all' || filterStatus === 'in-progress'} 
                  onChange={() => setFilterStatus(filterStatus === 'in-progress' ? 'all' : 'in-progress')}
                />
                <span className="status-indicator status-in-progress"></span>
                In Progress
              </label>
              <label className="status-filter">
                <input 
                  type="checkbox" 
                  name="status-pending" 
                  checked={filterStatus === 'all' || filterStatus === 'pending'} 
                  onChange={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
                />
                <span className="status-indicator status-pending"></span>
                Pending
              </label>
              <label className="status-filter">
                <input 
                  type="checkbox" 
                  name="status-blocked" 
                  checked={filterStatus === 'all' || filterStatus === 'blocked'} 
                  onChange={() => setFilterStatus(filterStatus === 'blocked' ? 'all' : 'blocked')}
                />
                <span className="status-indicator status-blocked"></span>
                Blocked
              </label>
            </div>
          </div>
        </div>
        
        {/* Feature Cards Container */}
        <div className="features-container">
          {isLoading ? (
            <div className="loading">Loading features...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : searchFilteredFeatures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No features found</div>
              <div className="empty-state-description">Try adjusting your filters or create a new feature.</div>
              <button className="control-button">Create Feature</button>
            </div>
          ) : (
            searchFilteredFeatures.map(renderFeatureCard)
          )}
        </div>
        
        {/* Knowledge Graph Integration Info */}
        <div className="kg-info bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Knowledge Graph Integration</h3>
          <p className="text-gray-700 mb-3">
            This feature manager is integrated with the Knowledge Graph API to provide a single source of truth for all project features.
            Features created, updated, or organized here are automatically synchronized with the Knowledge Graph.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="kg-stat">
              <div className="text-sm font-medium text-gray-500">API Endpoint</div>
              <div className="text-sm font-mono bg-gray-200 rounded p-1">http://localhost:8080/api/graph</div>
            </div>
            <div className="kg-stat">
              <div className="text-sm font-medium text-gray-500">Features Synced</div>
              <div className="text-sm font-semibold">{features.length}</div>
            </div>
            <div className="kg-stat">
              <div className="text-sm font-medium text-gray-500">Last Sync</div>
              <div className="text-sm">{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
        
        {/* Milestone Creator Modal */}
        {showMilestoneCreator && (
          <MilestoneCreator 
            onClose={() => setShowMilestoneCreator(false)}
            onMilestoneCreated={handleMilestoneCreated}
          />
        )}
      </div>
      
      <style jsx>{`
        /* Base Styles */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          background-color: #1e293b;
          color: #ffffff;
          padding: 15px 0;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }
        
        /* Management Controls */
        .management-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .control-button {
          padding: 8px 15px;
          background-color: #1e293b;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .control-button:hover {
          background-color: #334155;
        }
        
        .control-button.primary {
          background-color: #3b82f6;
        }
        
        .control-button.primary:hover {
          background-color: #2563eb;
        }
        
        /* Stats Bar */
        .stats-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
          background-color: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .stat-item {
          flex: 1;
          min-width: 120px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .stat-value.completed {
          color: #10b981;
        }
        
        .stat-value.in-progress {
          color: #3b82f6;
        }
        
        .stat-value.pending {
          color: #f59e0b;
        }
        
        .stat-value.blocked {
          color: #ef4444;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
        }
        
        /* Filter Controls */
        .filter-controls {
          background-color: white;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .filter-row:last-child {
          margin-bottom: 0;
        }
        
        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .filter-label {
          font-size: 14px;
          font-weight: 500;
        }
        
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background-color: white;
          font-size: 14px;
        }
        
        /* Status Filters */
        .status-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .status-filter {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }
        
        .status-filter input {
          cursor: pointer;
        }
        
        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        .status-indicator.status-completed {
          background-color: #10b981;
        }
        
        .status-indicator.status-in-progress {
          background-color: #3b82f6;
        }
        
        .status-indicator.status-pending {
          background-color: #f59e0b;
        }
        
        .status-indicator.status-blocked {
          background-color: #ef4444;
        }
        
        /* Features Container */
        .features-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        /* Feature Card Styles */
        .feature-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          position: relative;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        
        .feature-card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
        
        /* Status Border */
        .feature-card.status-completed {
          border-left: 4px solid #10b981;
        }
        
        .feature-card.status-in-progress {
          border-left: 4px solid #3b82f6;
        }
        
        .feature-card.status-pending, .feature-card.status-not-started {
          border-left: 4px solid #f59e0b;
        }
        
        .feature-card.status-blocked {
          border-left: 4px solid #ef4444;
        }
        
        .feature-card-content {
          padding: 16px;
        }
        
        .feature-id {
          font-family: monospace;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        
        .feature-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          margin-top: 0;
        }
        
        .status-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }
        
        .status-badge.completed {
          background-color: #10b981;
        }
        
        .status-badge.in-progress {
          background-color: #3b82f6;
        }
        
        .status-badge.pending, .status-badge.not-started {
          background-color: #f59e0b;
        }
        
        .status-badge.blocked {
          background-color: #ef4444;
        }
        
        .feature-description {
          font-size: 14px;
          color: #4b5563;
          margin-bottom: 16px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .feature-metadata {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #6b7280;
        }
        
        .metadata-item {
          margin-bottom: 4px;
        }
        
        .metadata-label {
          font-weight: 600;
          margin-right: 4px;
        }
        
        .feature-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-button {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }
        
        .action-button.run {
          background-color: #e0f2fe;
          color: #0284c7;
        }
        
        .action-button.run:hover {
          background-color: #bae6fd;
        }
        
        .action-button.details {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .action-button.details:hover {
          background-color: #e5e7eb;
        }
        
        .action-button.enhance {
          background-color: #f0e7fe;
          color: #7c3aed;
        }
        
        .action-button.enhance:hover {
          background-color: #e9d5ff;
        }
        
        /* Feature Status Controls */
        .feature-status-controls {
          margin-top: 12px;
        }
        
        .status-btn {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          border: none;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        
        .status-btn:hover:not(:disabled) {
          opacity: 1;
        }
        
        .status-btn:disabled {
          cursor: default;
          opacity: 1;
        }
        
        .status-btn.active {
          font-weight: 600;
        }
        
        .status-btn.completed {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .status-btn.in-progress {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .status-btn.pending {
          background-color: #fef3c7;
          color: #9a3412;
        }
        
        .status-btn.blocked {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 40px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          grid-column: 1 / -1;
        }
        
        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #9ca3af;
        }
        
        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1f2937;
        }
        
        .empty-state-description {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 16px;
        }
        
        /* Loading & Error States */
        .loading, .error-message {
          grid-column: 1 / -1;
          padding: 20px;
          text-align: center;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .error-message {
          color: #b91c1c;
          background-color: #fee2e2;
        }
        
        /* Notification */
        .notification {
          position: relative;
          padding: 16px;
          margin-bottom: 20px;
          border-radius: 6px;
          animation: slideIn 0.3s ease-out;
          display: flex;
          align-items: flex-start;
        }
        
        .notification-content {
          flex: 1;
        }
        
        .notification-success {
          background-color: #ecfdf5;
          border: 1px solid #10b981;
          color: #047857;
        }
        
        .notification-error {
          background-color: #fee2e2;
          border: 1px solid #ef4444;
          color: #b91c1c;
        }
        
        .notification-message {
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        .notification-details {
          margin-top: 8px;
        }
        
        .notification-details pre {
          background-color: rgba(255, 255, 255, 0.5);
          padding: 10px;
          border-radius: 4px;
          font-size: 13px;
          overflow: auto;
          max-height: 200px;
        }
        
        .notification-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: currentColor;
          opacity: 0.7;
          padding: 0 8px;
        }
        
        .notification-close:hover {
          opacity: 1;
        }
        
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        /* KG Info */
        .kg-info {
          margin-top: 15px;
        }
        
        .kg-stat {
          display: inline-block;
          margin-right: 15px;
        }
        
        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .features-container {
            grid-template-columns: 1fr;
          }
          
          .filter-row {
            flex-direction: column;
            gap: 10px;
          }
          
          .search-input, .filter-select {
            width: 100%;
          }
          
          .stat-item {
            flex-basis: calc(50% - 10px);
          }
        }
      `}</style>
    </div>
  );
};

export default FeatureManager;