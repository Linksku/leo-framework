import ErrorPage from 'components/ErrorPage';

type Props = {
  renderFallback?: (err: Error) => ReactElement,
};

type State = {
  err: Error | null,
};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<Props>, State> {
  // override
  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  override state: State = { err: null };

  override componentDidCatch(err: Error) {
    ErrorLogger.error(err, '', false);
  }

  override render() {
    const { children, renderFallback } = this.props;
    const { err } = this.state;

    if (err) {
      if (renderFallback) {
        return renderFallback(err);
      }
      return (
        <ErrorPage
          title="Error"
          content={err.message}
        />
      );
    }
    return children;
  }
}
