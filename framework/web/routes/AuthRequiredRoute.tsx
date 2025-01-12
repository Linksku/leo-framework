import HomeWrapInner from 'core/frame/home/HomeWrapInner';
import StackWrapInner from 'core/frame/stack/StackWrapInner';
import ErrorPage from 'core/frame/ErrorPage';

export default React.memo(function AuthRequiredRoute() {
  const { isHome } = useRouteStore();

  const error = (
    <ErrorPage
      title="You must be logged in to view this page."
      btns={[
        <Button
          key="login"
          href="/login"
          label="Log in"
          fullWidth
        />,
        <Button
          key="home"
          href="/"
          label="Go to home"
          outline
          fullWidth
        />,
      ]}
      showReload={false}
    />
  );
  return isHome
    ? (
      <HomeWrapInner>
        {error}
      </HomeWrapInner>
    )
    : (
      <StackWrapInner title="Can't View Page">
        {error}
      </StackWrapInner>
    );
});
