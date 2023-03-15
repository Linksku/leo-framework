import StackWrapInner from 'components/frame/stack/StackWrapInner';

export default React.memo(function LoadingStackInnerRoute() {
  return (
    <StackWrapInner
      title=""
    >
      <Spinner
        verticalMargin={30}
      />
    </StackWrapInner>
  );
});
