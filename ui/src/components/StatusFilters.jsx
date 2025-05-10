import React from 'react';

/**
 * Reusable status filter component that can be used in different pages
 */
const StatusFilters = ({ filter, setFilter }) => {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {/* All */}
      <label className="inline-flex items-center">
        <input 
          type="checkbox" 
          checked={filter === 'all'} 
          onChange={() => setFilter('all')} 
          className="form-checkbox h-4 sm:h-5 w-4 sm:w-5 text-gray-500 rounded border-gray-400 focus:ring-0" 
        />
        <span className="ml-1 sm:ml-2 text-white text-xs sm:text-sm flex items-center">
          <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full inline-block mr-1 bg-gray-400"></span>
          All
        </span>
      </label>
      
      {/* Completed */}
      <label className="inline-flex items-center">
        <input 
          type="checkbox" 
          checked={filter === 'completed'} 
          onChange={() => setFilter('completed')} 
          className="form-checkbox h-4 sm:h-5 w-4 sm:w-5 text-green-500 rounded border-gray-400 focus:ring-0" 
        />
        <span className="ml-1 sm:ml-2 text-white text-xs sm:text-sm flex items-center">
          <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full inline-block mr-1 bg-green-500"></span>
          Completed
        </span>
      </label>
      
      {/* In Progress */}
      <label className="inline-flex items-center">
        <input 
          type="checkbox" 
          checked={filter === 'in-progress'} 
          onChange={() => setFilter('in-progress')} 
          className="form-checkbox h-4 sm:h-5 w-4 sm:w-5 text-blue-500 rounded border-gray-400 focus:ring-0" 
        />
        <span className="ml-1 sm:ml-2 text-white text-xs sm:text-sm flex items-center">
          <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full inline-block mr-1 bg-blue-500"></span>
          In Progress
        </span>
      </label>
      
      {/* Pending */}
      <label className="inline-flex items-center">
        <input 
          type="checkbox" 
          checked={filter === 'pending'} 
          onChange={() => setFilter('pending')} 
          className="form-checkbox h-4 sm:h-5 w-4 sm:w-5 text-yellow-500 rounded border-gray-400 focus:ring-0" 
        />
        <span className="ml-1 sm:ml-2 text-white text-xs sm:text-sm flex items-center">
          <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full inline-block mr-1 bg-yellow-500"></span>
          Pending
        </span>
      </label>
      
      {/* Blocked */}
      <label className="inline-flex items-center">
        <input 
          type="checkbox" 
          checked={filter === 'blocked'} 
          onChange={() => setFilter('blocked')} 
          className="form-checkbox h-4 sm:h-5 w-4 sm:w-5 text-red-500 rounded border-gray-400 focus:ring-0" 
        />
        <span className="ml-1 sm:ml-2 text-white text-xs sm:text-sm flex items-center">
          <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full inline-block mr-1 bg-red-500"></span>
          Blocked
        </span>
      </label>
    </div>
  );
};

export default StatusFilters;