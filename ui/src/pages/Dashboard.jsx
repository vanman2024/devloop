import React, { useEffect, useState, useRef } from 'react';
import { useChangeTracker } from '../components/ChangeTracker.jsx';
import { useRollbackManager } from '../components/RollbackManager.jsx';
import useComponentTracking from '../hooks/useComponentTracking.js';
import EnhancedHomeDashboard from '../components/home/EnhancedHomeDashboard.jsx';

const Dashboard = () => {
  // Add debugging to check component rendering
  console.log('Dashboard component rendering with path', window.location.pathname);
  
  return <EnhancedHomeDashboard />;
};

export default Dashboard;