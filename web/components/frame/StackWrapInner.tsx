import ChevronLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-left.svg';

import PullToRefresh from 'components/frame/PullToRefresh';
import TitleBar from 'components/frame/TitleBar';

import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapInnerStyles.scss';

type InnerProps = {
  title: string,
} & Parameters<typeof TitleBar>[0];

const StackWrapInnerHeader = React.memo(
  function StackWrapInnerHeader({ title, ...props }: InnerProps) {
    const { backStack } = useStacksNavStore();
    return (
      <PullToRefresh>
        <TitleBar
          title={title}
          onLeftBtnClick={useCallback(e => {
            e.stopPropagation();
            backStack();
          }, [backStack])}
          LeftSvg={ChevronLeftSvg}
          {...props}
        />
      </PullToRefresh>
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
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}
