import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error) {
    console.error('App crashed:', error);
  }

  override render() {
    if (this.state.error) {
      return <div role="alert">Something went wrong.</div>;
    }
    return this.props.children;
  }
}
