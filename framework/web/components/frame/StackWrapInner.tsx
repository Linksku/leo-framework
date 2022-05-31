import ChevronLeftSvg from 'fontawesome5/svgs/solid/chevron-left.svg';

import PullToReload from 'components/frame/PullToReload';
import TitleBar from 'components/frame/TitleBar';
import LoadingRoute from 'routes/LoadingRoute';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapInnerStyles.scss';

type TitleBarProps = Parameters<typeof TitleBar>[0];

type TopBarProps = ObjRequiredKeys<TitleBarProps, 'title'>;

const StackWrapInnerTopBar = React.memo(
  function StackWrapInnerTopBar({ title, ...props }: TopBarProps) {
    const { backStack } = useStacksNavStore();
    return (
      <div className={styles.topBarWrap}>
        <PullToReload>
          <TitleBar
            title={title}
            onLeftBtnClick={useCallback((e: React.MouseEvent) => {
              e.stopPropagation();
              backStack();
            }, [backStack])}
            LeftSvg={ChevronLeftSvg}
            {...props}
          />
        </PullToReload>
      </div>
    );
  },
);

type Props = {
  className?: string,
  bodyClassName?: string,
  bottomBar?: ReactElement,
} & TopBarProps;

export default function StackWrapInner({
  children,
  className,
  bodyClassName,
  bottomBar,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <div className={cn(styles.container, className)}>
      <StackWrapInnerTopBar {...props} />

      <div className={cn(styles.body, bodyClassName)}>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingRoute />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>

      {bottomBar
        ? (
          <div className={styles.bottomBarWrap}>
            <div className={styles.bottomBarInner}>
              {bottomBar}
            </div>
          </div>
        )
        : null}
    </div>
  );
}
