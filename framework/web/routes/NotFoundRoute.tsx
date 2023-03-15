import StackWrapInner from 'components/frame/stack/StackWrapInner';
import ErrorPage from 'components/ErrorPage';

export default React.memo(function NotFoundRoute() {
  return (
    <StackWrapInner title="Not Found">
      <ErrorPage
        title="Not Found"
        content="The requested URL was not found, please try going back or reloading the page."
        showReload={false}
      />
    </StackWrapInner>
  );
});
