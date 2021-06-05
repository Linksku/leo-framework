import StackWrapInner from 'components/frame/StackWrapInner';
import ErrorPage from 'components/ErrorPage';

function NotFoundRoute() {
  return (
    <StackWrapInner title="Not Found">
      <ErrorPage
        title="Not Found"
        content="The requested URL was not found, try going back or reloading the page."
      />
    </StackWrapInner>
  );
}

export default React.memo(NotFoundRoute);
