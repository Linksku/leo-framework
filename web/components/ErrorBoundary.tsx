import ErrorPage from 'components/ErrorPage';

import styles from './ErrorBoundaryStyles.scss';

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
    // console.error(err, info);
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
          content={(
            <>
              {'Please try '}
              <span
                onClick={e => {
                  e.preventDefault();
                  window.location.reload(true);
                }}
                role="button"
                tabIndex={-1}
                className={styles.refresh}
              >
                refreshing
              </span>
              {' the page or restarting the app.'}
            </>
          )}
        />
      );
    }
    return children;
  }
}
