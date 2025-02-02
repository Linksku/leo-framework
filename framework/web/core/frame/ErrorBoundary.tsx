import styles from './ErrorBoundary.scss';

function getErrorMessage(err: Error) {
  if (!err.message) {
    return 'Unknown error.';
  }
  if (err.message.includes('Loading chunk ') || err.message.includes('Loading CSS chunk ')) {
    return 'Content failed to load.';
  }
  if (err instanceof ReferenceError
    || err instanceof SyntaxError
    || err instanceof TypeError) {
    return 'Unexpected error occurred.';
  }
  return err.message;
}

type Props = {
  loadingElem?: ReactNode,
  renderError?: (msg: string, err: Error) => ReactNode,
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
    ErrorLogger.error(err, undefined, !!err.debugCtx);
  }

  override render() {
    const {
      children,
      loadingElem,
      renderError,
    } = this.props;
    const { err } = this.state;

    if (err) {
      const msg = getErrorMessage(err);

      if (renderError) {
        return renderError(msg, err);
      }
      return (
        <p className={styles.errorMsg}>
          {msg}
        </p>
      );
    }
    return (
      <React.Suspense
        fallback={loadingElem ?? <Spinner verticalMargin={30} />}
      >
        {children}
      </React.Suspense>
    );
  }
}
