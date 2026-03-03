import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Source Sans 3', system-ui, sans-serif", background: '#FEFDFB', padding: 32
        }}>
          <div style={{
            background: '#fff', border: '1px solid #F5E4CC', borderRadius: 20, padding: 40,
            maxWidth: 440, textAlign: 'center', boxShadow: '0 8px 40px rgba(28,25,23,.07)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#1C1917' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: '#78716C', marginBottom: 20, lineHeight: 1.5 }}>
              An unexpected error occurred. Please reload the page to continue.
            </p>
            <pre style={{
              textAlign: 'left', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              background: '#FDF9F3', borderRadius: 12, padding: 16, color: '#DC2626', overflow: 'auto',
              maxHeight: 120, marginBottom: 20, border: '1px solid #F5E4CC'
            }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 14,
                color: '#fff', background: 'linear-gradient(135deg,#B45309,#D97706)',
                border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(180,83,9,.2)'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
