import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-app text-white flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Oops! Something Went Wrong</h1>
            <p className="text-zinc-400 mb-4">
              We've encountered an unexpected error. Please try reloading the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-left text-xs text-red-300 max-h-40 overflow-y-auto">
                <strong>Error Details (Dev Only):</strong>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
            >
              Reload Page
            </button>
            <p className="text-xs text-zinc-500 mt-4">
              If this problem persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
