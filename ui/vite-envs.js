// This file defines environment variables to help Vite resolve dependencies in WSL
export default {
  // Increase timeout for module resolution
  VITE_HMR_TIMEOUT: '60000',
  
  // Force polling for file changes (more reliable in WSL)
  CHOKIDAR_USEPOLLING: 'true',
  
  // Force WSL optimizations
  VITE_WSL_OPTIMIZATION: 'true',
  
  // API connection details
  VITE_API_SERVER_URL: 'http://localhost:8080'
}