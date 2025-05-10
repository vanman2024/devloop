import React from 'react';
import logger from './debugLogger';

const log = logger('ErrorHandler');

/**
 * Custom error handler that wraps around components and provides 
 * a consistent way to handle and log errors throughout the application.
 */
class ErrorHandler extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorTraceId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Generate a unique trace ID for this error
    const errorTraceId = `err-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    
    // Log the error
    log.error(`Error in ${this.props.componentName || 'unknown component'} [TraceID: ${errorTraceId}]`, error, {
      componentStack: errorInfo?.componentStack,
      ...this.props.componentProps
    });
    
    this.setState({ errorInfo, errorTraceId });
    
    // Notify parent component if there's a callback
    if (this.props.onError && typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo, errorTraceId);
    }
  }

  handleReset = () => {
    log.info(`Attempting to recover ${this.props.componentName || 'unknown component'} from error`);
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorTraceId: null
    });
  }

  render() {
    const { fallback: FallbackComponent, children, componentName } = this.props;
    
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (FallbackComponent) {
        return (
          <FallbackComponent
            componentName={componentName}
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            errorTraceId={this.state.errorTraceId}
            resetError={this.handleReset}
          />
        );
      }
      
      // Default fallback UI
      return (
        <div className="p-4 m-4 bg-red-800 border border-red-500 text-white rounded shadow-lg">
          <h3 className="text-xl font-bold mb-2">
            {componentName ? `Error in ${componentName}` : 'Component Error'}
          </h3>
          <p className="mb-3">
            An error occurred while rendering this component. The error has been logged.
          </p>
          {this.state.errorTraceId && (
            <p className="text-sm mb-3">
              Error trace ID: <code className="bg-red-900 px-2 py-1 rounded">{this.state.errorTraceId}</code>
            </p>
          )}
          <details className="mb-4">
            <summary className="cursor-pointer font-medium">Show error details</summary>
            <div className="mt-2 p-3 bg-gray-900 rounded overflow-auto max-h-60">
              <p className="text-red-400 font-bold">{this.state.error?.toString()}</p>
              {this.state.errorInfo && (
                <pre className="text-gray-400 text-sm mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          </details>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorHandler;