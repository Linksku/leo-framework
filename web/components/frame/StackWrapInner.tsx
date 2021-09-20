import ChevronLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-left.svg';

import PullToReload from 'components/frame/PullToReload';
import TitleBar from 'components/frame/TitleBar';
import LoadingRoute from 'routes/LoadingRoute';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapInnerStyles.scss';

type InnerProps = {
  title: string,
} & Parameters<typeof TitleBar>[0];

const StackWrapInnerHeader = React.memo(
  function StackWrapInnerHeader({ title, ...props }: InnerProps) {
    const { backStack } = useStacksNavStore();
    return (
      <PullToReload>
        <TitleBar
          title={title}
          onLeftBtnClick={useCallback(e => {
            e.stopPropagation();
            backStack();
          }, [backStack])}
          LeftSvg={ChevronLeftSvg}
          {...props}
        />
      </PullToReload>
    );
  },
);

type Props = {
  className?: string,
  bodyClassName?: string,
} & InnerProps;

export default function StackWrapInner({
  children,
  className,
  bodyClassName,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.topBarWrap}>
        <StackWrapInnerHeader {...props} />
      </div>

      <div className={cn(styles.body, bodyClassName)}>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingRoute />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
