import React from 'react';

// The app currently has no error boundary anywhere, so any uncaught render
// error unmounts the whole React tree and leaves a blank white page with no
// clue why. This catches that, shows a recoverable screen, and surfaces the
// real error so it can actually be diagnosed instead of guessed at.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught a render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight:      '100vh',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '16px',
          padding:        '24px',
          textAlign:      'center',
          fontFamily:     "'Inter', sans-serif",
          background:     '#faf9fc',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#A855F7' }}>
          error
        </span>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 360, margin: 0 }}>
          This page hit an unexpected error. Reloading usually fixes it — if it keeps
          happening, please let us know what you were doing right before this appeared.
        </p>
        <button
          onClick={() => window.location.assign('/')}
          style={{
            background:   '#A855F7',
            color:        '#fff',
            fontWeight:   700,
            fontSize:     14,
            padding:      '10px 24px',
            borderRadius: '9999px',
            border:       'none',
            cursor:       'pointer',
          }}
        >
          Reload Plumio
        </button>
        {import.meta.env.DEV && (
          <pre
            style={{
              marginTop:    16,
              maxWidth:     '90vw',
              overflow:     'auto',
              textAlign:    'left',
              fontSize:     12,
              color:        '#b91c1c',
              background:   '#fef2f2',
              padding:      12,
              borderRadius: 8,
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        )}
      </div>
    );
  }
}
