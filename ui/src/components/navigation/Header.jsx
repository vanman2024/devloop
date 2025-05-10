import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  
  const views = [
    { id: 'hybrid', path: '/', label: 'Hybrid View', icon: '⚡' },
    { id: 'pm', path: '/pm', label: 'PM View', icon: '📊' },
    { id: 'dev', path: '/dev', label: 'Dev View', icon: '💻' },
    { id: 'ai', path: '/ai-assistant', label: 'AI Assistant', icon: '🤖' }
  ];

  // Helper function to determine if a view is active
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex">
          {views.map((view) => (
            <Link
              key={view.id}
              to={view.path}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mr-2 ${isActive(view.path) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <span className="mr-2">{view.icon}</span>
              {view.label}
            </Link>
          ))}
        </div>
        
        <div className="flex items-center">
          <button className="text-gray-300 hover:text-white mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          
          <span className="flex items-center">
            <span className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">DL</span>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;