import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  // Debug location path
  React.useEffect(() => {
    console.log(`Navigation active at: ${location.pathname}`);
  }, [location.pathname]);
  
  const navItems = [
    { path: '/', icon: '🏠', label: 'Dashboard Home', section: 'AI-NATIVE DEV STACK' },
    { path: '/pm', icon: '📊', label: 'PM View', section: 'Project Management' },
    { path: '/dev', icon: '👨‍💻', label: 'Developer View', section: 'Development' },
    { path: '/easy-code', icon: '📝', label: 'Easy Code Access', section: '' },
    { path: '/overview', icon: '📋', label: 'Project Overview', section: 'SYSTEM' },
    { path: '/docs', icon: '📄', label: 'Document Manager', section: 'Management' },
    { path: '/features', icon: '⚙️', label: 'Feature Manager', section: '' },
    { path: '/integration-sync', icon: '🔄', label: 'Integration Sync', section: '' },
    { path: '/system-health', icon: '🩺', label: 'System Health', section: '' },
    { path: '/roadmap', icon: '🗺️', label: 'Roadmap', section: '' },
    { path: '/test', icon: '✅', label: 'Test Console', section: 'Tools' },
  ];
  
  // Group nav items by section
  const groupedNavItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {});
  
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-blue-500">Devloop</h1>
      </div>
      
      <nav className="mt-4">
        {Object.entries(groupedNavItems).map(([section, items]) => (
          <div key={section || 'ungrouped'} className="mb-6">
            {section && (
              <h2 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section}
              </h2>
            )}
            <ul className="mt-2">
              {items.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium ${location.pathname === item.path ? 'bg-blue-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;