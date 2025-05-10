import React, { Component } from 'react';
import logger from './debugLogger';

const log = logger('ErrorBoundary');

/**
 * Error Boundary component that catches errors in its child components
 * and displays a fallback UI instead of crashing the entire application.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our logger system
    log.error('Component error caught', error, { 
      component: this.props.componentName || 'unknown',
      errorInfo
    });
    
    this.setState({ errorInfo });
    
    // Optional: Send error to an analytics service
    if (this.props.reportError && typeof this.props.reportError === 'function') {
      this.props.reportError(error, errorInfo);
    }
  }

  tryReset = () => {
    log.info('Attempting to reset error boundary', { 
      component: this.props.componentName || 'unknown' 
    });
    
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.tryReset}
        />;
      }
      
      // Default fallback UI
      return (
        <div className="error-boundary p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <details className="whitespace-pre-wrap">
            <summary className="cursor-pointer">View technical details</summary>
            <p className="mt-2 text-sm font-mono">
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </p>
          </details>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={this.tryReset}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;