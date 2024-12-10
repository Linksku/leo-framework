import HomeWrapInner from 'core/frame/home/HomeWrapInner';

export default React.memo(function LoadingHomeInnerRoute() {
  return (
    <HomeWrapInner>
      <Spinner
        verticalMargin={30}
      />
    </HomeWrapInner>
  );
});
