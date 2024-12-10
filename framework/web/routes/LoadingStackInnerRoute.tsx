import StackWrapInnerTopBar from 'core/frame/stack/StackWrapInnerTopBar';

// eslint-disable-next-line css-modules/no-unused-class
import styles from '../core/frame/stack/StackWrapInner.scss';

export default React.memo(function LoadingStackInnerRoute({ title, placeholder }: {
  title?: string,
  placeholder?: ReactNode,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.topBarWrap}>
        <StackWrapInnerTopBar
          title={title}
          disableReload
        />
      </div>
      {placeholder ?? (
        <Spinner
          verticalMargin={30}
        />
      )}
    </div>
  );
});
