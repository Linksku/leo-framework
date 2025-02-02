import ErrorPage from 'core/frame/ErrorPage';

export default React.memo(function NotFoundRoute() {
  return (
    <ErrorPage
      title="Not Found"
      content="The requested URL was not found, please try going back or reloading the page."
    />
  );
});
