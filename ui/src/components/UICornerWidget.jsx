import React, { useState, useEffect } from 'react';

/**
 * A standalone corner widget component that shows system health status
 * This component doesn't rely on Vite plugins and can be included directly in React
 */
const UICornerWidget = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [healthData, setHealthData] = useState({
    healthScore: 78,
    latestSnapshot: "snapshot_20250430_121534",
    storage: {
      storageUsageMB: 45.2,
      spaceRatio: 3.5
    }
  });

  // Function to toggle collapsed state
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // Function to determine health score color
  const getHealthScoreColor = (score) => {
    if (score >= 90) return '#10B981'; // green
    if (score >= 70) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  // Handler for take snapshot button
  const handleTakeSnapshot = () => {
    console.log('[UI Corner Widget] Taking snapshot requested');
    // Display a notification
    showNotification('Taking Snapshot', 'Creating snapshot of all components...');
    
    // In a real implementation, this would call an API endpoint
    setTimeout(() => {
      // Update the snapshot data with a new timestamp
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      const newSnapshotId = `snapshot_${timestamp}`;
      
      setHealthData(prev => ({
        ...prev,
        latestSnapshot: newSnapshotId
      }));
      
      showNotification('Snapshot Created', `Snapshot ${newSnapshotId} created successfully`);
    }, 1500);
  };

  // Handler for restore button
  const handleRestore = () => {
    const snapshotId = prompt('Enter snapshot ID to restore:', healthData.latestSnapshot);
    if (snapshotId) {
      console.log('[UI Corner Widget] Restore requested for snapshot:', snapshotId);
      showNotification('Restoring Snapshot', `Restoring to snapshot ${snapshotId}...`);
      
      // In a real implementation, this would call an API endpoint
      setTimeout(() => {
        showNotification('Restore Successful', `Snapshot ${snapshotId} restored successfully`);
      }, 1500);
    }
  };

  // Browser notification function
  const showNotification = (title, message, type = 'info') => {
    // Custom toast notification
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:60px;right:10px;background:' + 
      (type === 'error' ? '#EF4444' : '#10B981') + 
      ';color:white;padding:10px 20px;border-radius:4px;font-family:system-ui,sans-serif;' +
      'box-shadow:0 2px 5px rgba(0,0,0,0.3);z-index:10000;transition:opacity 0.5s;';
    toast.innerHTML = `<strong>${title}</strong><div>${message}</div>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
        color: 'white',
        borderRadius: '5px',
        padding: '10px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        opacity: collapsed ? 0.5 : 0.7,
        transition: 'opacity 0.3s',
        maxWidth: '300px',
      }}
      onMouseEnter={() => !collapsed && setCollapsed(false)}
      onMouseLeave={() => collapsed && setCollapsed(true)}
    >
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        UI Safeguard
        <div>
          <span 
            onClick={toggleCollapsed}
            style={{ cursor: 'pointer', fontSize: '14px' }}
          >
            {collapsed ? '+' : '-'}
          </span>
        </div>
      </h3>
      
      {!collapsed && (
        <div className="content">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Health Score:</span>
            <span style={{ color: getHealthScoreColor(healthData.healthScore) }}>
              {healthData.healthScore}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Latest:</span>
            <span>{healthData.latestSnapshot}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Storage:</span>
            <span>{healthData.storage.storageUsageMB.toFixed(1)} MB</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Space Ratio:</span>
            <span>{healthData.storage.spaceRatio.toFixed(1)}x</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={handleTakeSnapshot}
              style={{
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '3px',
                color: 'white',
                padding: '3px 8px',
                marginLeft: '5px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Take Snapshot
            </button>
            
            <button
              onClick={handleRestore}
              style={{
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '3px',
                color: 'white',
                padding: '3px 8px',
                marginLeft: '5px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Restore
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UICornerWidget;