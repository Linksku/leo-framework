import ErrorPage from 'components/ErrorPage';

function getErrorMessage(err: Error) {
  if (!err.message) {
    return 'Unknown error.';
  }
  if (err.message.includes('Loading chunk ') || err.message.includes('Loading CSS chunk ')) {
    return 'Content failed to load.';
  }
  return err.message;
}

type Props = {
  renderFallback?: (msg: string, err: Error) => ReactElement,
  className?: string,
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
    ErrorLogger.error(err, undefined, false);
  }

  override render() {
    const { children, renderFallback, className } = this.props;
    const { err } = this.state;

    if (err) {
      const msg = getErrorMessage(err);

      if (renderFallback) {
        return renderFallback(msg, err);
      }
      return (
        <ErrorPage
          title="Error"
          content={msg}
          className={className}
        />
      );
    }
    return children;
  }
}
