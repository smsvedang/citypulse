import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class Member4ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CityPulse Member4]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-800">
            {this.props.label ?? 'Panel'} crashed
          </p>
          <p className="mt-1 text-red-700">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-800 px-3 py-1.5 text-white"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
