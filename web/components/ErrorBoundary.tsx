import ErrorPage from 'components/ErrorPage';

type Props = {
  renderFallback?: (err: Error) => ReactElement,
};

type State = {
  err: Error | null,
};

export default class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  state: State = { err: null };

  componentDidCatch() {
    // console.error(arguments);
  }

  render() {
    const { children, renderFallback } = this.props;
    const { err } = this.state;

    if (err) {
      if (renderFallback) {
        return renderFallback(err);
      }
      return (
        <ErrorPage
          title="Error"
        />
      );
    }
    return children;
  }
}
