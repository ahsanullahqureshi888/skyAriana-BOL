import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import GlassCard from './GlassCard';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Route render failed', error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
    if (typeof this.props.onRetry === 'function') this.props.onRetry();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <GlassCard className="max-w-lg space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-sky-950">{this.props.title || 'Page could not load'}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-sky-600">
              {this.props.message || 'Something interrupted this screen. Your data is safe. Please try again.'}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-sky-500/10 hover:bg-sky-700 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={15} />
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.href = '/';
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white/80 px-5 text-sm font-black text-sky-900 shadow-sm hover:bg-sky-50 active:scale-[0.98] transition-all"
            >
              Back to Home
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }
}
