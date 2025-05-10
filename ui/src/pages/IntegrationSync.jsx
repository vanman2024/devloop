import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button, Badge } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';

// Regular integration card
const IntegrationSyncCard = ({ 
  id,
  title, 
  description, 
  status, 
  lastSync, 
  syncType,
  messageCount,
  systemName,
  onViewLogs,
  onSyncNow,
  onViewSettings
}) => {
  const statusColors = {
    'synced': 'success',
    'pending': 'warning',
    'error': 'danger',
    'manual': 'secondary'
  };
  
  const statusBorderColors = {
    'synced': 'border-green-500',
    'pending': 'border-yellow-500',
    'error': 'border-red-500',
    'manual': 'border-gray-500'
  };
  
  const statusEmojis = {
    'synced': '✅',
    'pending': '⏱️',
    'error': '❌',
    'manual': '🔧'
  };
  
  const statusLabels = {
    'synced': 'Synced',
    'pending': 'Pending',
    'error': 'Error',
    'manual': 'Manual Mode'
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  const timeSince = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg p-4 shadow-md transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg ${statusBorderColors[status]} border-l-4`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <Badge 
          bg={statusColors[status]} 
          className="px-2 py-1 text-sm"
          style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          <span className="me-1">{statusEmojis[status]}</span>
          {statusLabels[status]}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-300 mb-3">{description}</p>
      
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
        <div className="bg-gray-900 p-2 rounded">
          <span className="font-medium text-gray-300">System: </span>
          <span className="text-blue-400">{systemName}</span>
        </div>
        <div className="bg-gray-900 p-2 rounded">
          <span className="font-medium text-gray-300">Type: </span>
          <span className="text-blue-400">{syncType}</span>
        </div>
        <div className="bg-gray-900 p-2 rounded">
          <span className="font-medium text-gray-300">Last Sync: </span>
          <span className="text-blue-400" title={formatDate(lastSync)}>
            {timeSince(lastSync)}
          </span>
        </div>
        <div className="bg-gray-900 p-2 rounded">
          <span className="font-medium text-gray-300">Messages: </span>
          <span className="text-blue-400">{messageCount}</span>
        </div>
      </div>
      
      <div className="flex space-x-2 pt-2 border-t border-gray-700">
        <Button 
          variant="outline-primary" 
          size="sm"
          className="shadow-sm"
          onClick={() => onSyncNow(id)}
        >
          <span className="me-1">🔄</span> Sync Now
        </Button>
        <Button 
          variant="outline-secondary" 
          size="sm"
          className="shadow-sm"
          onClick={() => onViewLogs(id)}
        >
          <span className="me-1">📋</span> View Logs
        </Button>
        <Button 
          variant="outline-secondary" 
          size="sm"
          className="shadow-sm"
          onClick={() => onViewSettings(id)}
        >
          <span className="me-1">⚙️</span> Settings
        </Button>
      </div>
    </div>
  );
};

// AI integration card
const AIIntegrationCard = ({ 
  id,
  title, 
  description, 
  status,
  lastSync,
  modelVersions,
  usageStats,
  error,
  connectedModels,
  activeWorkflows,
  onViewLogs,
  onSyncNow,
  onViewSettings
}) => {
  const statusColors = {
    'synced': 'success',
    'pending': 'warning',
    'error': 'danger',
    'manual': 'secondary'
  };
  
  const statusBorderColors = {
    'synced': 'border-purple-500',
    'pending': 'border-yellow-500',
    'error': 'border-red-500',
    'manual': 'border-gray-500'
  };
  
  const statusEmojis = {
    'synced': '✅',
    'pending': '⏱️',
    'error': '❌',
    'manual': '🔧'
  };
  
  const statusLabels = {
    'synced': 'Connected',
    'pending': 'Pending',
    'error': 'Error',
    'manual': 'Manual Mode'
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  const timeSince = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Get connection status text and icon
  const getConnectionStatus = () => {
    if (status === 'synced') return { text: 'Connected', icon: '✅' };
    if (status === 'error') return { text: 'Not Configured', icon: '🔴' };
    if (status === 'pending') return { text: 'Connecting...', icon: '⏱️' };
    return { text: 'Manual Setup Required', icon: '🔧' };
  };
  
  const connectionStatus = getConnectionStatus();
  
  return (
    <div className={`bg-gray-800 rounded-lg p-4 shadow-md transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg ${statusBorderColors[status]} border-l-4`}
         style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)' }}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🤖</span>
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <Badge 
          bg={statusColors[status]} 
          className="px-2 py-1 text-sm"
          style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          <span className="me-1">{statusEmojis[status]}</span>
          {statusLabels[status]}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-300 mb-3">{description}</p>
      
      <div className="mb-3">
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-2 text-red-300 text-xs mb-3">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 mb-2">
          {lastSync && (
            <div className="text-xs text-gray-400">
              <span className="font-medium text-gray-300">Last Connected: </span>
              <span className="text-blue-400" title={formatDate(lastSync)}>
                {timeSince(lastSync)}
              </span>
            </div>
          )}
          
          <div className="text-xs text-gray-400">
            <span className="font-medium text-gray-300">Connection Status: </span>
            <span className="text-blue-400">
              <span className="mr-1">{connectionStatus.icon}</span>
              {connectionStatus.text}
            </span>
          </div>
        </div>
        
        {modelVersions && modelVersions.length > 0 && (
          <div className="text-xs text-gray-400 mb-2">
            <span className="font-medium text-gray-300">Models: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {modelVersions.map((model, index) => (
                <span key={index} className="bg-gray-700 rounded px-2 py-1 text-blue-300">
                  {model}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {usageStats && (
          <div className="bg-gray-900 p-2 rounded mt-2">
            <div className="text-xs font-medium text-purple-300 mb-1">Usage Statistics</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Tokens: </span>
                <span className="text-green-400">{(usageStats.tokensThisMonth / 1000000).toFixed(2)}M</span>
              </div>
              <div>
                <span className="text-gray-400">Cost: </span>
                <span className="text-green-400">{usageStats.costThisMonth}</span>
              </div>
              <div>
                <span className="text-gray-400">Active: </span>
                <span className="text-green-400">{usageStats.activePrompts} prompts</span>
              </div>
            </div>
          </div>
        )}
        
        {connectedModels && (
          <div className="bg-gray-900 p-2 rounded mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Connected Models: </span>
                <span className="text-purple-400">{connectedModels}</span>
              </div>
              <div>
                <span className="text-gray-400">Active Workflows: </span>
                <span className="text-purple-400">{activeWorkflows}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2 pt-2 border-t border-gray-700">
        <Button 
          variant="outline-primary" 
          size="sm"
          className="shadow-sm"
          onClick={() => onSyncNow(id)}
        >
          <span className="me-1">🔄</span> Connect
        </Button>
        <Button 
          variant="outline-secondary" 
          size="sm"
          className="shadow-sm"
          onClick={() => onViewLogs(id)}
        >
          <span className="me-1">📊</span> View Usage
        </Button>
        <Button 
          variant="outline-secondary" 
          size="sm"
          className="shadow-sm"
          onClick={() => onViewSettings(id)}
        >
          <span className="me-1">⚙️</span> Settings
        </Button>
      </div>
    </div>
  );
};

const IntegrationSync = () => {
  // State for modals
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Add debugging to check component rendering
  console.log('IntegrationSync component rendering with path', window.location.pathname);

  // Mock data for integration sync components
  const integrations = [
    {
      id: 'github-issues',
      title: 'GitHub Issues Sync',
      description: 'Synchronizes Devloop features with GitHub issues for tracking and collaboration',
      status: 'synced',
      lastSync: '2025-04-21T14:30:00Z',
      syncType: 'Bidirectional',
      messageCount: 24,
      systemName: 'GitHub',
      category: 'development',
      logs: [
        { timestamp: '2025-04-21T14:30:00Z', type: 'info', message: 'Synchronization started' },
        { timestamp: '2025-04-21T14:30:05Z', type: 'info', message: 'Connected to GitHub API' },
        { timestamp: '2025-04-21T14:31:00Z', type: 'info', message: 'Fetched 24 issues' },
        { timestamp: '2025-04-21T14:32:10Z', type: 'success', message: 'Synchronized 24 issues successfully' }
      ]
    },
    {
      id: 'jira-tasks',
      title: 'Jira Tasks Integration',
      description: 'Maps Devloop features to Jira tasks for project management and reporting',
      status: 'pending',
      lastSync: '2025-04-20T09:15:00Z',
      syncType: 'One-way (Push)',
      messageCount: 12,
      systemName: 'Jira',
      category: 'development',
      logs: [
        { timestamp: '2025-04-20T09:15:00Z', type: 'info', message: 'Synchronization started' },
        { timestamp: '2025-04-20T09:15:10Z', type: 'info', message: 'Connected to Jira API' },
        { timestamp: '2025-04-20T09:16:00Z', type: 'warning', message: 'Rate limiting detected, slowing down requests' },
        { timestamp: '2025-04-20T09:19:30Z', type: 'info', message: 'Synchronization paused - waiting for rate limit reset' }
      ]
    },
    {
      id: 'slack-notifications',
      title: 'Slack Channel Notifications',
      description: 'Sends notifications about feature status changes to designated Slack channels',
      status: 'error',
      lastSync: '2025-04-19T11:45:00Z',
      syncType: 'One-way (Push)',
      messageCount: 8,
      systemName: 'Slack',
      category: 'communication',
      logs: [
        { timestamp: '2025-04-19T11:45:00Z', type: 'info', message: 'Synchronization started' },
        { timestamp: '2025-04-19T11:45:05Z', type: 'error', message: 'Failed to connect to Slack API' },
        { timestamp: '2025-04-19T11:45:10Z', type: 'error', message: 'Authentication error: Invalid token' },
        { timestamp: '2025-04-19T11:45:15Z', type: 'error', message: 'Synchronization failed after 3 retry attempts' }
      ]
    },
    {
      id: 'api-gateway',
      title: 'External API Integration',
      description: 'Exposes Devloop features through a REST API for external consumption',
      status: 'synced',
      lastSync: '2025-04-21T10:30:00Z',
      syncType: 'Bidirectional',
      messageCount: 36,
      systemName: 'API Gateway',
      category: 'development',
      logs: [
        { timestamp: '2025-04-21T10:30:00Z', type: 'info', message: 'Synchronization started' },
        { timestamp: '2025-04-21T10:30:15Z', type: 'info', message: 'Creating API endpoints' },
        { timestamp: '2025-04-21T10:31:20Z', type: 'info', message: 'Updated 36 endpoints' },
        { timestamp: '2025-04-21T10:32:00Z', type: 'success', message: 'API gateway deployment successful' }
      ]
    },
    {
      id: 'figma-designs',
      title: 'Figma Design Linkage',
      description: 'Links Devloop features to associated Figma designs for reference',
      status: 'manual',
      lastSync: '2025-04-18T15:20:00Z',
      syncType: 'Manual',
      messageCount: 5,
      systemName: 'Figma',
      category: 'design',
      logs: [
        { timestamp: '2025-04-18T15:20:00Z', type: 'info', message: 'Manual synchronization started' },
        { timestamp: '2025-04-18T15:21:00Z', type: 'info', message: 'Linking design assets to features' },
        { timestamp: '2025-04-18T15:22:30Z', type: 'info', message: 'Updated 5 feature-design links' },
        { timestamp: '2025-04-18T15:23:00Z', type: 'success', message: 'Manual synchronization completed' }
      ]
    },
    {
      id: 'model-registry',
      title: 'AI Model Registry',
      description: 'Synchronizes Devloop features with AI model versions and configurations',
      status: 'synced',
      lastSync: '2025-04-21T13:10:00Z',
      syncType: 'Bidirectional',
      messageCount: 42,
      systemName: 'Model Registry',
      category: 'ai',
      logs: [
        { timestamp: '2025-04-21T13:10:00Z', type: 'info', message: 'Synchronization started' },
        { timestamp: '2025-04-21T13:10:30Z', type: 'info', message: 'Analyzing model dependencies' },
        { timestamp: '2025-04-21T13:11:45Z', type: 'info', message: 'Synchronized 42 model configurations' },
        { timestamp: '2025-04-21T13:12:20Z', type: 'success', message: 'Model registry updated successfully' }
      ]
    }
  ];
  
  // AI system integrations
  const aiIntegrations = [
    {
      id: 'claude-api',
      title: 'Claude API Integration',
      description: 'Connect to Claude API for advanced natural language processing capabilities',
      status: 'synced',
      lastSync: '2025-04-21T16:45:00Z',
      apiKey: '••••••••••••••••ABCD',
      modelVersions: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      usageStats: {
        tokensThisMonth: 15420000,
        costThisMonth: '$52.36',
        activePrompts: 8
      },
      category: 'ai'
    },
    {
      id: 'openai-api',
      title: 'OpenAI Integration',
      description: 'Connect to OpenAI API for GPT models and DALL-E image generation',
      status: 'synced',
      lastSync: '2025-04-21T12:30:00Z',
      apiKey: '••••••••••••••••EFGH',
      modelVersions: ['gpt-4o', 'gpt-4-turbo', 'dall-e-3'],
      usageStats: {
        tokensThisMonth: 8760000,
        costThisMonth: '$37.22',
        activePrompts: 5
      },
      category: 'ai'
    },
    {
      id: 'ai-workflow',
      title: 'AI Workflow Orchestration',
      description: 'Manage complex AI workflows with fallback patterns and model switching',
      status: 'pending',
      lastSync: '2025-04-20T14:20:00Z',
      connectedModels: 4,
      activeWorkflows: 3,
      category: 'ai'
    },
    {
      id: 'vertexai',
      title: 'Google Vertex AI',
      description: 'Connect to Google Vertex AI for Gemini models and specialized ML services',
      status: 'error',
      lastSync: '2025-04-19T09:15:00Z',
      apiKey: 'Not configured',
      error: 'Authentication failed - invalid service account key',
      category: 'ai'
    },
    {
      id: 'huggingface',
      title: 'Hugging Face Hub',
      description: 'Access thousands of open-source models from the Hugging Face Hub',
      status: 'manual',
      lastSync: '2025-04-18T10:30:00Z',
      accessToken: '••••••••••••••••IJKL',
      activeModels: 0,
      category: 'ai'
    }
  ];
  
  // Handle View Logs action
  const handleViewLogs = (id) => {
    // Check in both regular and AI integrations
    let integration = integrations.find(i => i.id === id);
    if (!integration) {
      integration = aiIntegrations.find(i => i.id === id);
    }
    
    setSelectedIntegration(integration);
    setShowLogsModal(true);
  };
  
  // Handle Sync Now action
  const handleSyncNow = (id) => {
    // Check in both regular and AI integrations
    let integration = integrations.find(i => i.id === id);
    if (!integration) {
      integration = aiIntegrations.find(i => i.id === id);
    }
    
    setSelectedIntegration(integration);
    setShowConfirmModal(true);
  };
  
  // Handle View Settings action
  const handleViewSettings = (id) => {
    // Check in both regular and AI integrations
    let integration = integrations.find(i => i.id === id);
    if (!integration) {
      integration = aiIntegrations.find(i => i.id === id);
    }
    
    setSelectedIntegration(integration);
    setShowSettingsModal(true);
  };
  
  // Execute sync action
  const executeSyncAction = () => {
    setShowConfirmModal(false);
    setIsSyncing(true);
    
    // Simulate sync
    setTimeout(() => {
      setIsSyncing(false);
      // You would normally update the integration status here
    }, 3000);
  };
  
  // Handler for AI Connect button
  const handleAIConnect = (id) => {
    // Find the AI integration
    const integration = aiIntegrations.find(i => i.id === id);
    setSelectedIntegration(integration);
    setShowConnectModal(true);
  };
  
  // Handler for View Usage button
  const handleViewUsage = (id) => {
    // Find the AI integration
    const integration = aiIntegrations.find(i => i.id === id);
    setSelectedIntegration(integration);
    setShowUsageModal(true);
  };
  
  // Handler for AI Settings button
  const handleAISettings = (id) => {
    // Find the AI integration
    const integration = aiIntegrations.find(i => i.id === id);
    setSelectedIntegration(integration);
    setShowSettingsModal(true);
  };
  
  // Execute connect action
  const executeConnectAction = () => {
    setShowConnectModal(false);
    setIsConnecting(true);
    
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false);
      // Update the integration status - for demo, let's create a mock success message
      console.log(`Connected to ${selectedIntegration.title} successfully`);
      
      // Show a success message (would normally be a toast notification)
      alert(`Successfully connected to ${selectedIntegration.title}!`);
    }, 2000);
  };
  
  // Render logs modal
  const renderLogsModal = () => {
    if (!selectedIntegration) return null;
    
    // Define log type styling
    const getLogTypeStyle = (type) => {
      switch (type) {
        case 'error':
          return 'text-danger';
        case 'warning':
          return 'text-warning';
        case 'success':
          return 'text-success';
        default:
          return 'text-info';
      }
    };
    
    // Generate additional log entries to ensure we have scrolling content
    const generateMoreLogs = () => {
      const baseTime = new Date(selectedIntegration.lastSync).getTime();
      const additionalLogs = [];
      
      for (let i = 1; i <= 30; i++) {
        const timeOffset = 180000 + (i * 60000); // Start 3 minutes back and go further
        const timestamp = new Date(baseTime - timeOffset);
        let type = 'info';
        let message = '';
        
        // Create varied log types and messages
        if (i % 10 === 0) {
          type = 'warning';
          message = `Rate limit approaching (${90-i}% capacity remaining)`;
        } else if (i % 15 === 0) {
          type = 'error';
          message = `Connection timeout, retrying (attempt ${Math.ceil(i/15)})`;
        } else if (i % 7 === 0) {
          type = 'success';
          message = `Successfully processed batch #${Math.ceil(i/7)}`;
        } else {
          message = `Processing ${(i * 3)} records from ${selectedIntegration.systemName || 'external system'}`;
        }
        
        additionalLogs.push({
          timestamp: timestamp.toISOString(),
          type,
          message
        });
      }
      
      return additionalLogs;
    };
    
    // Combine real logs with generated ones to demonstrate scrolling
    const allLogs = [
      ...(selectedIntegration.logs || []),
      { 
        timestamp: selectedIntegration.lastSync,
        type: 'success',
        message: 'Synchronization completed'
      },
      { 
        timestamp: new Date(new Date(selectedIntegration.lastSync).getTime() - 60000).toISOString(),
        type: 'info',
        message: 'Processing data...'
      },
      { 
        timestamp: new Date(new Date(selectedIntegration.lastSync).getTime() - 120000).toISOString(),
        type: 'info',
        message: `Connecting to ${selectedIntegration.systemName || 'external'} API`
      },
      { 
        timestamp: new Date(new Date(selectedIntegration.lastSync).getTime() - 180000).toISOString(),
        type: 'info',
        message: 'Synchronization started'
      },
      ...generateMoreLogs()
    ];
    
    // Sort logs by timestamp (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return (
      <Modal show={showLogsModal} onHide={() => setShowLogsModal(false)} size="lg" centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>📋</span>
              <span>{selectedIntegration.title} - Logs</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowLogsModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <div>
              <Badge 
                bg={selectedIntegration.status === 'synced' ? 'success' : 
                   selectedIntegration.status === 'pending' ? 'warning' : 
                   selectedIntegration.status === 'error' ? 'danger' : 'secondary'}
                className="me-2"
                style={{ padding: '0.5rem 0.75rem' }}
              >
                {selectedIntegration.status.toUpperCase()}
              </Badge>
              <span className="text-gray-400">Last sync: {new Date(selectedIntegration.lastSync).toLocaleString()}</span>
            </div>
            <div>
              <Button 
                variant="outline-primary" 
                size="sm" 
                disabled={isSyncing}
                onClick={() => handleSyncNow(selectedIntegration.id)}
              >
                {isSyncing ? 'Syncing...' : '🔄 Sync Now'}
              </Button>
            </div>
          </div>
          
          <div className="bg-gray-900 p-3 rounded mt-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900" 
               style={{ 
                 maxHeight: '400px', 
                 overflowY: 'auto',
                 msOverflowStyle: 'scrollbar',
                 scrollbarWidth: 'thin',
                 scrollbarColor: '#4B5563 #1F2937'
               }}>
            {allLogs.map((log, index) => (
              <div key={index} className="mb-2">
                <span className="text-gray-400">[{new Date(log.timestamp).toLocaleString()}] </span>
                <span className={getLogTypeStyle(log.type)}>{log.message}</span>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button variant="outline-secondary" onClick={() => setShowSettingsModal(true)}>
            ⚙️ Settings
          </Button>
          <Button variant="secondary" onClick={() => setShowLogsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Render settings modal
  const renderSettingsModal = () => {
    if (!selectedIntegration) return null;
    
    return (
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} size="lg" centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>⚙️</span>
              <span>{selectedIntegration.title} - Settings</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowSettingsModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3">General Settings</h5>
            <div className="mb-3">
              <label className="form-label text-gray-400">Integration Name</label>
              <input 
                type="text" 
                className="form-control bg-gray-700 text-white border-gray-600" 
                defaultValue={selectedIntegration.title} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-gray-400">System</label>
              <input 
                type="text" 
                className="form-control bg-gray-700 text-white border-gray-600" 
                defaultValue={selectedIntegration.systemName} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-gray-400">Description</label>
              <textarea 
                className="form-control bg-gray-700 text-white border-gray-600" 
                rows="3"
                defaultValue={selectedIntegration.description}
              ></textarea>
            </div>
          </div>
          
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3">Sync Settings</h5>
            <div className="mb-3">
              <label className="form-label text-gray-400">Sync Type</label>
              <select className="form-select bg-gray-700 text-white border-gray-600">
                <option value="bidirectional" selected={selectedIntegration.syncType === 'Bidirectional'}>Bidirectional</option>
                <option value="push" selected={selectedIntegration.syncType === 'One-way (Push)'}>One-way (Push)</option>
                <option value="pull" selected={selectedIntegration.syncType === 'One-way (Pull)'}>One-way (Pull)</option>
                <option value="manual" selected={selectedIntegration.syncType === 'Manual'}>Manual</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label text-gray-400">Sync Frequency</label>
              <select className="form-select bg-gray-700 text-white border-gray-600">
                <option value="5min">Every 5 minutes</option>
                <option value="15min">Every 15 minutes</option>
                <option value="30min">Every 30 minutes</option>
                <option value="1hour" selected>Every hour</option>
                <option value="6hours">Every 6 hours</option>
                <option value="daily">Daily</option>
                <option value="manual">Manual only</option>
              </select>
            </div>
            <div className="form-check mb-3">
              <input 
                className="form-check-input bg-gray-700 border-gray-600" 
                type="checkbox" 
                id="autosync" 
                defaultChecked={selectedIntegration.status !== 'manual'} 
              />
              <label className="form-check-label" htmlFor="autosync">
                Enable automatic synchronization
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3">Authentication</h5>
            <div className="mb-3">
              <label className="form-label text-gray-400">API Key</label>
              <div className="input-group">
                <input 
                  type="password" 
                  className="form-control bg-gray-700 text-white border-gray-600" 
                  value="••••••••••••••••••••••" 
                  readOnly
                />
                <Button variant="outline-secondary">Reveal</Button>
                <Button variant="outline-primary">Reset</Button>
              </div>
              <small className="text-gray-400">Last updated: April 15, 2025</small>
            </div>
            <div className="mb-3">
              <label className="form-label text-gray-400">Webhook URL</label>
              <input 
                type="text" 
                className="form-control bg-gray-700 text-white border-gray-600" 
                defaultValue={`https://api.devloop.example.com/webhook/${selectedIntegration.id}`} 
              />
            </div>
          </div>
          
          <div className="mb-4">
            <h5 className="border-bottom border-gray-700 pb-2 mb-3 text-danger">Danger Zone</h5>
            <div className="d-flex justify-content-between align-items-center p-3 bg-danger bg-opacity-10 border border-danger rounded">
              <div>
                <h6 className="text-danger mb-0">Reset Integration</h6>
                <p className="text-gray-400 mb-0">This will delete all sync history and reset configuration.</p>
              </div>
              <Button variant="outline-danger">Reset</Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button variant="outline-secondary" onClick={() => setShowSettingsModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowSettingsModal(false)}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Render confirm sync modal
  const renderConfirmModal = () => {
    if (!selectedIntegration) return null;
    
    return (
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>Confirm Synchronization</Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowConfirmModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p>Are you sure you want to synchronize <strong>{selectedIntegration.title}</strong> with {selectedIntegration.systemName || 'external system'}?</p>
          {selectedIntegration.status === 'error' && (
            <div className="bg-yellow-600 bg-opacity-20 border border-yellow-600 text-yellow-100 p-3 rounded mb-3">
              <strong>Warning:</strong> This integration is currently in an error state. You may need to check the credentials or settings before synchronizing.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button 
            variant="secondary" 
            onClick={() => setShowConfirmModal(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={executeSyncAction}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Render add integration modal
  const renderAddIntegrationModal = () => {
    const integrationTypes = [
      { id: 'github', name: 'GitHub', description: 'Connect to GitHub repositories for issue tracking', icon: '🐙' },
      { id: 'jira', name: 'Jira', description: 'Connect to Jira for project and issue management', icon: '🔄' },
      { id: 'slack', name: 'Slack', description: 'Send notifications to Slack channels', icon: '💬' },
      { id: 'api', name: 'REST API', description: 'Connect to any REST API endpoint', icon: '🌐' },
      { id: 'gitlab', name: 'GitLab', description: 'Connect to GitLab repositories and issues', icon: '🦊' },
      { id: 'figma', name: 'Figma', description: 'Link designs from Figma to features', icon: '🎨' },
      { id: 'notion', name: 'Notion', description: 'Connect to Notion workspaces', icon: '📝' },
      { id: 'custom', name: 'Custom Integration', description: 'Create a custom integration with any system', icon: '⚙️' }
    ];
    
    return (
      <Modal 
        show={showAddIntegrationModal} 
        onHide={() => setShowAddIntegrationModal(false)} 
        size="lg" 
        centered
      >
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>➕</span>
              <span>Add New Integration</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowAddIntegrationModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-4">Select an integration type to connect to your external systems:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {integrationTypes.map((type) => (
              <div 
                key={type.id}
                className="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg cursor-pointer transition-all duration-200 border border-gray-600 hover:border-blue-500"
                onClick={() => {
                  // Would normally open the specific integration setup flow
                  console.log(`Selected integration type: ${type.name}`);
                  setShowAddIntegrationModal(false);
                }}
              >
                <div className="flex items-start">
                  <div className="text-3xl mr-3">{type.icon}</div>
                  <div>
                    <h3 className="font-bold text-white">{type.name}</h3>
                    <p className="text-sm text-gray-300">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 text-blue-200">
            <h4 className="text-blue-300 font-bold flex items-center mb-2">
              <span className="mr-2">💡</span> Integration Benefits
            </h4>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>Synchronize feature status across multiple platforms</li>
              <li>Automate notifications when statuses change</li>
              <li>Maintain consistency between systems</li>
              <li>Reduce manual update work</li>
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button variant="secondary" onClick={() => setShowAddIntegrationModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Render usage statistics modal
  const renderUsageModal = () => {
    if (!selectedIntegration) return null;
    
    const hasUsageStats = selectedIntegration.usageStats;
    
    // Generate simulated usage data if none exists
    const usageData = hasUsageStats ? selectedIntegration.usageStats : {
      tokensThisMonth: Math.floor(Math.random() * 10000000) + 1000000,
      costThisMonth: `$${(Math.random() * 100).toFixed(2)}`,
      activePrompts: Math.floor(Math.random() * 10) + 1
    };
    
    // Monthly usage history (simulated)
    const monthlyData = [
      { month: 'January', tokens: 5230000, cost: '$24.58' },
      { month: 'February', tokens: 6890000, cost: '$32.42' },
      { month: 'March', tokens: 8120000, cost: '$38.16' },
      { month: 'April', tokens: hasUsageStats ? usageData.tokensThisMonth : 7650000, cost: hasUsageStats ? usageData.costThisMonth : '$35.96' }
    ];
    
    // Calculate total cost
    const totalCost = monthlyData.reduce((sum, month) => {
      const cost = parseFloat(month.cost.replace('$', ''));
      return sum + cost;
    }, 0).toFixed(2);
    
    // Calculate total tokens
    const totalTokens = (monthlyData.reduce((sum, month) => sum + month.tokens, 0) / 1000000).toFixed(2);
    
    // Simulated active prompts
    const activePrompts = [
      { id: 'prompt-1', name: 'Feature Description Generator', lastUsed: '2 hours ago', tokens: 1240 },
      { id: 'prompt-2', name: 'Code Documentation Helper', lastUsed: '1 day ago', tokens: 3560 },
      { id: 'prompt-3', name: 'Status Update Generator', lastUsed: '3 days ago', tokens: 890 },
      { id: 'prompt-4', name: 'Bug Analysis Tool', lastUsed: '1 week ago', tokens: 2150 }
    ];
    
    return (
      <Modal show={showUsageModal} onHide={() => setShowUsageModal(false)} size="lg" centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>📊</span>
              <span>{selectedIntegration.title} - Usage Statistics</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowUsageModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          {/* Current month usage summary */}
          <div className="bg-gray-900 p-4 rounded-lg mb-4 border border-gray-700">
            <h4 className="text-xl font-bold mb-3 text-purple-300">Current Month Usage</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-gray-400 text-sm mb-1">Tokens Used</div>
                <div className="text-2xl font-bold text-green-400">
                  {(usageData.tokensThisMonth / 1000000).toFixed(2)}M
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-gray-400 text-sm mb-1">Estimated Cost</div>
                <div className="text-2xl font-bold text-green-400">
                  {usageData.costThisMonth}
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg text-center">
                <div className="text-gray-400 text-sm mb-1">Active Prompts</div>
                <div className="text-2xl font-bold text-blue-400">
                  {usageData.activePrompts}
                </div>
              </div>
            </div>
          </div>
          
          {/* Usage History */}
          <div className="bg-gray-900 p-4 rounded-lg mb-4 border border-gray-700">
            <h4 className="text-lg font-bold mb-3 text-purple-300">Monthly Usage History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3">Month</th>
                    <th className="text-right py-2 px-3">Tokens</th>
                    <th className="text-right py-2 px-3">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="py-2 px-3">{month.month}</td>
                      <td className="text-right py-2 px-3">{(month.tokens / 1000000).toFixed(2)}M</td>
                      <td className="text-right py-2 px-3">{month.cost}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className="py-2 px-3">Total (YTD)</td>
                    <td className="text-right py-2 px-3">{totalTokens}M</td>
                    <td className="text-right py-2 px-3">${totalCost}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Active Prompts */}
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h4 className="text-lg font-bold mb-3 text-purple-300">Active Prompts</h4>
            <div className="space-y-2">
              {activePrompts.map((prompt) => (
                <div key={prompt.id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium">{prompt.name}</div>
                    <div className="text-xs text-gray-400">Last used: {prompt.lastUsed}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-400">{prompt.tokens.toLocaleString()} tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button variant="outline-secondary" onClick={() => setShowUsageModal(false)}>
            Close
          </Button>
          <Button variant="outline-primary">
            Export Report
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Render connect modal
  const renderConnectModal = () => {
    if (!selectedIntegration) return null;
    
    return (
      <Modal show={showConnectModal} onHide={() => setShowConnectModal(false)} centered>
        <Modal.Header className="bg-dark text-white border-gray-700">
          <Modal.Title>
            <div className="d-flex align-items-center">
              <span className="me-2" style={{ fontSize: '1.5rem' }}>🔌</span>
              <span>Connect to {selectedIntegration.title}</span>
            </div>
          </Modal.Title>
          <Button variant="close" className="bg-dark text-white" onClick={() => setShowConnectModal(false)} />
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <p className="mb-4">Enter your API key to connect to {selectedIntegration.title}.</p>
          
          <div className="bg-gray-900 p-4 rounded-lg mb-4 border border-gray-700">
            <div className="mb-3">
              <label className="block text-sm text-gray-400 mb-1">API Key</label>
              <input 
                type="password" 
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                placeholder="Enter your API key"
                defaultValue={selectedIntegration.apiKey === 'Not configured' ? '' : selectedIntegration.apiKey}
              />
            </div>
            
            {selectedIntegration.id === 'claude-api' && (
              <div className="mb-3">
                <label className="block text-sm text-gray-400 mb-1">Claude API Version</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white">
                  <option>Claude 3 Opus</option>
                  <option>Claude 3 Sonnet</option>
                  <option>Claude 3 Haiku</option>
                  <option>Claude 2</option>
                </select>
              </div>
            )}
            
            {selectedIntegration.id === 'openai-api' && (
              <div className="mb-3">
                <label className="block text-sm text-gray-400 mb-1">Default Model</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white">
                  <option>GPT-4o</option>
                  <option>GPT-4 Turbo</option>
                  <option>GPT-3.5 Turbo</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center mb-1">
              <input type="checkbox" id="remember" className="mr-2" />
              <label htmlFor="remember" className="text-sm text-gray-300">Save key to secure credentials store</label>
            </div>
          </div>
          
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-3 border border-blue-700 text-blue-300 text-sm">
            <p className="flex items-start mb-2">
              <span className="mr-2 mt-1">ℹ️</span>
              <span>Your API key is stored securely and used only for authentication with the service.</span>
            </p>
            <p className="ml-6 text-xs">Learn more about <a href="#" className="text-blue-400 hover:underline">API key security</a></p>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white border-gray-700">
          <Button 
            variant="secondary" 
            onClick={() => setShowConnectModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="primary"
            disabled={isConnecting}
            onClick={executeConnectAction}
          >
            {isConnecting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Connecting...
              </>
            ) : 'Connect'}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Calculate status counts
  const statusCounts = integrations.reduce((counts, integration) => {
    counts[integration.status] = (counts[integration.status] || 0) + 1;
    return counts;
  }, {});

  return (
    <div className="integration-sync-container" id="integration-sync-page">
      {/* Header with distinctive gradient background - UNIQUE to Integration page */}
      <div className="p-4 mb-6 rounded-lg shadow-md" 
           style={{ 
             background: 'linear-gradient(135deg, #2c3e50 0%, #4a69bd 100%)',
             borderLeft: '8px solid #e74c3c',
             boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
           }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <span className="me-2">🔌</span>
              Integration Hub
            </h1>
            <p className="text-blue-200 mb-0">Manage your external system connections</p>
          </div>
          <div className="space-x-2">
            <Button 
              variant="outline-light"
              className="border-2 shadow-md"
              disabled={isSyncing}
              style={{ transition: 'all 0.3s' }}
            >
              <span className="me-1">🔄</span> Sync All Systems
            </Button>
            <Button 
              variant="outline-light"
              className="border-2 shadow-md"
              style={{ transition: 'all 0.3s' }}
              onClick={() => setShowAddIntegrationModal(true)}
            >
              <span className="me-1">➕</span> New Connection
            </Button>
          </div>
        </div>
      </div>
      
      {/* Status summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-lg p-4 shadow-md text-white border-l-4 border-green-300">
          <div className="flex items-center mb-2">
            <span className="text-2xl me-2">✅</span>
            <span className="text-3xl font-bold">{statusCounts.synced || 0}</span>
          </div>
          <div className="text-green-100">Synced Systems</div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-700 to-yellow-600 rounded-lg p-4 shadow-md text-white border-l-4 border-yellow-300">
          <div className="flex items-center mb-2">
            <span className="text-2xl me-2">⏱️</span>
            <span className="text-3xl font-bold">{statusCounts.pending || 0}</span>
          </div>
          <div className="text-yellow-100">Pending Syncs</div>
        </div>
        
        <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-lg p-4 shadow-md text-white border-l-4 border-red-300">
          <div className="flex items-center mb-2">
            <span className="text-2xl me-2">❌</span>
            <span className="text-3xl font-bold">{statusCounts.error || 0}</span>
          </div>
          <div className="text-red-100">System Errors</div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-lg p-4 shadow-md text-white border-l-4 border-blue-300">
          <div className="flex items-center">
            <span className="text-xl me-2">🕒</span>
            <div>
              <div className="text-blue-100 text-sm">Last system-wide sync:</div>
              <div className="text-white font-semibold">April 21, 14:30</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Integration cards */}
      <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        <span className="me-2">🧠</span>AI Systems
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {aiIntegrations.map(integration => (
          <AIIntegrationCard
            key={integration.id}
            id={integration.id}
            title={integration.title}
            description={integration.description}
            status={integration.status}
            lastSync={integration.lastSync}
            modelVersions={integration.modelVersions}
            usageStats={integration.usageStats}
            apiKey={integration.apiKey}
            error={integration.error}
            connectedModels={integration.connectedModels}
            activeWorkflows={integration.activeWorkflows}
            onViewLogs={() => handleViewUsage(integration.id)}
            onSyncNow={() => handleAIConnect(integration.id)}
            onViewSettings={() => handleAISettings(integration.id)}
          />
        ))}
      </div>
      
      {/* Integration cards */}
      <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        <span className="me-2">🔌</span>Connected Systems
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {integrations.filter(i => i.category !== 'ai').map(integration => (
          <IntegrationSyncCard
            key={integration.id}
            id={integration.id}
            title={integration.title}
            description={integration.description}
            status={integration.status}
            lastSync={integration.lastSync}
            syncType={integration.syncType}
            messageCount={integration.messageCount}
            systemName={integration.systemName}
            onViewLogs={() => handleViewLogs(integration.id)}
            onSyncNow={() => handleSyncNow(integration.id)}
            onViewSettings={() => handleViewSettings(integration.id)}
          />
        ))}
      </div>
      
      {/* Activity timeline with distinctive styling */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-6 shadow-md border-l-4 border-blue-500">
        <h2 className="text-xl font-bold mb-4 text-white flex items-center">
          <span className="me-3 bg-blue-500 p-2 rounded-full">📊</span>
          Sync Activity Timeline
        </h2>
        
        <div className="relative pl-8 space-y-6 before:absolute before:left-4 before:h-full before:w-0.5 before:bg-gray-700">
          <div className="relative transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer">
            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-green-500 border-4 border-gray-900 z-10"></div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="text-sm text-green-300 font-medium">Today, 14:30</div>
              <div className="text-white">Synchronized GitHub Issues: 5 updated, 2 created, 0 deleted</div>
            </div>
          </div>
          
          <div className="relative transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer">
            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-blue-500 border-4 border-gray-900 z-10"></div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="text-sm text-blue-300 font-medium">Today, 13:10</div>
              <div className="text-white">Synchronized AI Model Registry: 3 models linked to features</div>
            </div>
          </div>
          
          <div className="relative transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer">
            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-yellow-500 border-4 border-gray-900 z-10"></div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="text-sm text-yellow-300 font-medium">Today, 10:30</div>
              <div className="text-white">External API Integration: 12 API requests processed</div>
            </div>
          </div>
          
          <div className="relative transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer">
            <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-red-500 border-4 border-gray-900 z-10"></div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="text-sm text-red-300 font-medium">Yesterday, 11:45</div>
              <div className="text-white">Error: Slack API authentication failed, check credentials</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Render modals */}
      {renderLogsModal()}
      {renderSettingsModal()}
      {renderConfirmModal()}
      {renderAddIntegrationModal()}
      {renderUsageModal()}
      {renderConnectModal()}
    </div>
  );
};

export default IntegrationSync;