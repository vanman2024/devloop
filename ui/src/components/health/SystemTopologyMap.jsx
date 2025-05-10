import React, { useRef, useEffect, useState } from 'react';

const SystemTopologyMap = ({ components }) => {
  const canvasRef = useRef(null);
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Demo components if not provided
  const systemComponents = components || [
    {
      id: 'core',
      name: 'Core System',
      status: 'healthy',
      connections: ['memory', 'ui', 'api'],
      x: 0.5,
      y: 0.25,
      size: 1.3,
      metrics: {
        cpu: '12%',
        memory: '286MB',
        uptime: '17d 4h'
      }
    },
    {
      id: 'memory',
      name: 'Memory Management',
      status: 'healthy',
      connections: ['api', 'data'],
      x: 0.25,
      y: 0.5,
      metrics: {
        files: '412',
        size: '14.8MB',
        queries: '174/min'
      }
    },
    {
      id: 'api',
      name: 'API Services',
      status: 'warning',
      connections: ['ui', 'auth', 'data'],
      x: 0.75,
      y: 0.5,
      metrics: {
        requests: '86/min',
        latency: '239ms',
        errors: '2.1%'
      }
    },
    {
      id: 'ui',
      name: 'UI System',
      status: 'healthy',
      connections: ['auth'],
      x: 0.85,
      y: 0.35,
      metrics: {
        users: '8',
        sessions: '14',
        render: '43ms'
      }
    },
    {
      id: 'auth',
      name: 'Authentication',
      status: 'healthy',
      connections: [],
      x: 0.82,
      y: 0.68,
      metrics: {
        tokens: '17',
        expiry: '23m avg',
        failures: '0'
      }
    },
    {
      id: 'data',
      name: 'Data Storage',
      status: 'critical',
      connections: [],
      x: 0.35,
      y: 0.75,
      metrics: {
        disk: '89%',
        writes: '47/min',
        reads: '126/min'
      }
    }
  ];

  // Map status to colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return { fill: 'rgba(16, 185, 129, 0.2)', stroke: 'rgb(16, 185, 129)' };
      case 'warning': return { fill: 'rgba(245, 158, 11, 0.2)', stroke: 'rgb(245, 158, 11)' };
      case 'critical': return { fill: 'rgba(239, 68, 68, 0.2)', stroke: 'rgb(239, 68, 68)' };
      default: return { fill: 'rgba(107, 114, 128, 0.2)', stroke: 'rgb(107, 114, 128)' };
    }
  };

  // Draw the components and connections
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const parentRect = canvas.parentElement.getBoundingClientRect();
    
    // Set canvas size to match container
    const width = parentRect.width;
    const height = Math.min(parentRect.width * 0.6, 300);
    
    canvas.width = width;
    canvas.height = height;
    setCanvasSize({ width, height });
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw connections between components
    ctx.lineWidth = 1;
    
    systemComponents.forEach(component => {
      component.connections.forEach(targetId => {
        const target = systemComponents.find(c => c.id === targetId);
        if (target) {
          const startX = component.x * width;
          const startY = component.y * height;
          const endX = target.x * width;
          const endY = target.y * height;
          
          // Draw connection line
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
          ctx.stroke();
          
          // Draw direction arrow
          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowLength = 7;
          const arrowWidth = 4;
          
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(
            midX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
            midY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
          );
          ctx.lineTo(
            midX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
            midY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
          );
          ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
          ctx.fill();
        }
      });
    });
    
    // Draw components
    systemComponents.forEach(component => {
      const x = component.x * width;
      const y = component.y * height;
      const radius = (component.size || 1) * 25;
      
      const colors = getStatusColor(component.status);
      
      // Draw component circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.stroke;
      ctx.stroke();
      
      // Add component name
      ctx.font = '10px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(component.name, x, y);
      
      // Store component bounds for hover detection
      component.bounds = {
        left: x - radius,
        right: x + radius,
        top: y - radius,
        bottom: y + radius
      };
    });
  }, [systemComponents]);
  
  // Handle mouse movement for hover effects
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find component under mouse
    const component = systemComponents.find(c => {
      const bounds = c.bounds;
      return bounds && 
        x >= bounds.left && 
        x <= bounds.right && 
        y >= bounds.top && 
        y <= bounds.bottom;
    });
    
    setHoveredComponent(component || null);
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-medium mb-4">System Topology</h3>
      
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          className="w-full cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredComponent(null)}
        />
        
        {hoveredComponent && (
          <div 
            className="absolute bg-gray-900 p-2 rounded shadow-lg border border-gray-700 z-10 text-sm"
            style={{ 
              left: Math.min(hoveredComponent.x * canvasSize.width + 10, canvasSize.width - 150),
              top: Math.min(hoveredComponent.y * canvasSize.height + 10, canvasSize.height - 100),
            }}
          >
            <div className="font-medium pb-1 mb-1 border-b border-gray-700">
              {hoveredComponent.name}
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                hoveredComponent.status === 'healthy' ? 'bg-green-900 text-green-300' :
                hoveredComponent.status === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {hoveredComponent.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(hoveredComponent.metrics || {}).map(([key, value]) => (
                <React.Fragment key={key}>
                  <div className="text-gray-400">{key}:</div>
                  <div>{value}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700 flex justify-center gap-6">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span className="text-xs">Healthy</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
          <span className="text-xs">Warning</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span className="text-xs">Critical</span>
        </div>
      </div>
    </div>
  );
};

export default SystemTopologyMap;