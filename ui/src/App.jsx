import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import GlobalHeader from './components/navigation/GlobalHeader.jsx';
import { ChangeTrackerProvider } from './components/ChangeTracker.jsx';
import { RollbackManagerProvider } from './components/RollbackManager.jsx';
import UIToolsProvider from './components/UIToolsProvider.jsx';
import { ToastContainer } from './components/ToastNotification.jsx';
// Import bootstrap CSS to ensure components render properly
import 'bootstrap/dist/css/bootstrap.min.css';

// Debug console messages for loading issues
const debugLoading = (message) => {
  console.log(`🔍 DEBUG: ${message}`);
}

// Placeholder component for routes we haven't implemented yet
const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-400">This page is coming soon.</p>
  </div>
);

// Lazy load wrapper with logging
const lazyLoad = (importFn, name) => {
  debugLoading(`Lazy loading component: ${name}`);
  return lazy(() => {
    debugLoading(`Starting to load: ${name}`);
    return importFn().then(module => {
      debugLoading(`Successfully loaded: ${name}`);
      return module;
    }).catch(error => {
      console.error(`Error loading ${name}:`, error);
      throw error;
    });
  });
};

// Lazy load pages for better performance with debugging
const Dashboard = lazyLoad(() => import('./pages/Dashboard.jsx'), 'Dashboard');
const FeatureManager = lazyLoad(() => import('./pages/FeatureManager.jsx'), 'FeatureManager');
const IntegrationSync = lazyLoad(() => import('./pages/IntegrationSync.jsx'), 'IntegrationSync');
const SystemHealth = lazyLoad(() => import('./pages/SystemHealth.jsx'), 'SystemHealth');
const AIIntegration = lazyLoad(() => import('./pages/AIIntegration.jsx'), 'AIIntegration');
const VisualChangelog = lazyLoad(() => import('./components/VisualChangelog.jsx'), 'VisualChangelog');
const DocumentManager = lazyLoad(() => import('./pages/DocumentManager.jsx'), 'DocumentManager');
const ChangeCenter = lazyLoad(() => import('./pages/ChangeCenter.jsx'), 'ChangeCenter');
const ActivityCenter = lazyLoad(() => import('./pages/ActivityCenter.jsx'), 'ActivityCenter');
const Roadmap = lazyLoad(() => import('./pages/Roadmap.jsx'), 'Roadmap'); // Added Roadmap page

// Debug route changes
const RouteTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('==== ROUTE CHANGED ====');
    console.log('Route changed to:', location.pathname);
    console.log('Route state:', location.state);
    console.log('Route search:', location.search);
    console.log('Window location:', window.location.href);
    console.log('==== END ROUTE INFO ====');
  }, [location]);
  
  return null;
};

// AppContent component wrapped by providers
const AppContent = () => {
  const location = useLocation();
  
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <RouteTracker />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <GlobalHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-800 p-4 pb-16">
          
          <Suspense fallback={
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          }>
            <Routes>
              {/* Main routes */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Dashboard />} />
              <Route path="/features" element={<FeatureManager />} />
              <Route path="/integration" element={<IntegrationSync />} />
              <Route path="/integration-sync" element={<IntegrationSync />} /> {/* Added additional route */}
              <Route path="/system-health" element={<SystemHealth />} />
              <Route path="/ai-integration" element={<AIIntegration />} />
              <Route path="/activity-center" element={<ActivityCenter />} />
            
              {/* View routes from header */}
              <Route path="/pm" element={<PlaceholderPage title="PM View" />} />
              <Route path="/dev" element={<PlaceholderPage title="Developer View" />} />
              <Route path="/ai-assistant" element={<AIIntegration />} />
              <Route path="/change-center" element={<ChangeCenter />} />
              
              {/* Additional routes from sidebar */}
              <Route path="/easy-code" element={<PlaceholderPage title="Easy Code Access" />} />
              <Route path="/overview" element={<PlaceholderPage title="Project Overview" />} />
              <Route path="/docs" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <DocumentManager />
                </Suspense>
              } />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/test" element={<PlaceholderPage title="Test Console" />} />
              <Route path="/visual-changelog" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <VisualChangelog onClose={() => window.history.back()} />
                </Suspense>
              } />
              
              {/* Catch all for unmatched routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <ChangeTrackerProvider>
        <RollbackManagerProvider>
          <UIToolsProvider>
            <AppContent />
            <ToastContainer />
          </UIToolsProvider>
        </RollbackManagerProvider>
      </ChangeTrackerProvider>
    </Router>
  );
}

export default App;