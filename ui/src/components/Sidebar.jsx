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
    { path: '/docs', icon: '📚', label: 'Document Manager', section: 'Documentation' },
    { path: '/features', icon: '⚙️', label: 'Feature Manager', section: 'Management' },
    { path: '/integration', icon: '🔄', label: 'Integration Sync', section: 'Management' },
    { path: '/system-health', icon: '🩺', label: 'System Health', section: 'Management' },
    { path: '/activity-center', icon: '📈', label: 'Activity Center', section: 'Management' },
    { path: '/roadmap', icon: '🗺️', label: 'Roadmap', section: 'Management' },
    { path: '/test', icon: '✅', label: 'Test Console', section: 'Tools' },
    { path: '/visual-changelog', icon: '📋', label: 'Visual Changelog', section: 'Tools' },
    { path: '/header-demo', icon: '🎨', label: 'Header Demo', section: 'Design' },
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
                    className={`flex items-center px-4 py-3 text-sm font-medium cursor-pointer ${location.pathname === item.path ? 'bg-blue-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                    onClick={() => {
                      // Enhanced logging for debugging
                      console.log(`Clicked on ${item.label}, navigating to ${item.path}`);
                      console.log(`Current pathname: ${location.pathname}`);
                    }}
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