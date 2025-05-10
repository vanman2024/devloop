import React, { useState, useEffect } from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import consolidated components
import OverviewDashboard from '../components/health/OverviewDashboard';
import EnhancedDashboard from '../components/health/EnhancedDashboard';
import IssueTracker from '../components/health/IssueTracker';
import AnalysisHub from '../components/health/AnalysisHub';
import AIRecommendations from '../components/health/AIRecommendations';
import SystemValidation from '../components/health/SystemValidation';
import SettingsPanel from '../components/health/SettingsPanel';
import AllIncidents from '../components/health/AllIncidents';
import AllRecommendations from '../components/health/AllRecommendations';

const SystemHealth = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRunTime, setLastRunTime] = useState(null);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  const handleRunAllChecks = () => {
    setLastRunTime(new Date());
    // In a real implementation, this would call an API to run all health checks
    console.log('Running all health checks...');
  };

  // Create a function that can be passed to the OverviewDashboard
  const showIncidentsView = () => {
    setShowAllIncidents(true);
  };
  
  const showRecommendationsView = () => {
    setShowAllRecommendations(true);
  };

  if (showAllIncidents) {
    return <AllIncidents onClose={() => {
      setShowAllIncidents(false);
    }} />;
  }
  
  if (showAllRecommendations) {
    return <AllRecommendations onClose={() => {
      setShowAllRecommendations(false);
    }} />;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Health Dashboard</h1>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
          onClick={handleRunAllChecks}
        >
          Run All Checks
        </button>
      </div>
      
      <div className="mb-4">
        <Tabs 
          activeKey={activeTab} 
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="overview" title="Overview">
            <OverviewDashboard 
              lastRunTime={lastRunTime} 
              onRunAllChecks={handleRunAllChecks}
              onShowAllIncidents={showIncidentsView}
              onShowAllRecommendations={showRecommendationsView}
            />
          </Tab>
          <Tab eventKey="issues" title="Issue Tracker">
            <IssueTracker />
          </Tab>
          <Tab eventKey="analysis" title="Analysis Hub">
            <AnalysisHub />
          </Tab>
          <Tab eventKey="recommendations" title="AI Recommendations">
            <AIRecommendations />
          </Tab>
          <Tab eventKey="validation" title="System Validation">
            <SystemValidation />
          </Tab>
          <Tab eventKey="settings" title="Settings">
            <SettingsPanel />
          </Tab>
        </Tabs>
      </div>
      
      {lastRunTime && (
        <div className="mt-4 text-right text-sm text-gray-500">
          Last check run: {lastRunTime.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SystemHealth;