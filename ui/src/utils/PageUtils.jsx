import React from 'react';

/**
 * Creates a basic page layout with a title and content.
 * 
 * @param {string} title - The page title
 * @param {React.ReactNode} children - The page content
 * @returns {React.ReactNode} - The page component
 */
export const createPage = (title, children) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      
      {children}
    </div>
  );
};

/**
 * Creates a loading state for async page data.
 * 
 * @returns {React.ReactNode} - The loading spinner component
 */
export const PageLoading = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

/**
 * Creates an error state for failed page data loading.
 * 
 * @param {string} message - The error message
 * @param {Function} retryFn - Function to retry loading the data
 * @returns {React.ReactNode} - The error component
 */
export const PageError = ({ message = "Failed to load data", retryFn }) => (
  <div className="bg-gray-800 rounded-lg p-8 text-center">
    <h3 className="text-xl font-medium text-gray-300 mb-2">{message}</h3>
    {retryFn && (
      <button 
        onClick={retryFn}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
      >
        Try Again
      </button>
    )}
  </div>
);