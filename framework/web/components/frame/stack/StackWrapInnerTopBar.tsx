import ChevronLeftSvg from 'svgs/fa5/chevron-left-regular.svg';

import type { HandleClickLink } from 'components/base/Link';
import { useGoBackStack } from 'stores/StacksNavStore';
import { useIsRouteActive } from 'stores/RouteStore';
import { APP_NAME } from 'config';

import styles from './StackWrapInnerTopBar.scss';

type BtnProps = Omit<Parameters<typeof Button>[0], 'onClick'>;

function renderBtn({
  onClick,
  btnProps,
  Svg,
  svgDim,
  isLeft,
  ariaLabel,
}: {
  onClick?: HandleClickLink,
  btnProps?: BtnProps,
  Svg?: React.SVGFactory,
  svgDim?: number,
  isLeft?: boolean,
  ariaLabel?: string,
}) {
  if (btnProps) {
    return (
      <div
        className={cx(styles.btnWrap, {
          [styles.rightBtnWrap]: !isLeft,
        })}
      >
        <Button
          onClick={onClick}
          aria-label={ariaLabel}
          {...btnProps}
        />
      </div>
    );
  }
  if (Svg) {
    return (
      <Link
        className={cx(styles.btnWrap, {
          [styles.rightBtnWrap]: !isLeft,
        })}
        onClick={onClick}
        activeBg
        aria-label={ariaLabel}
      >
        <Svg style={{ height: `${svgDim}rem`, width: `${svgDim}rem` }} />
      </Link>
    );
  }
  return null;
}

type Props = {
  title?: string,
  hideBackBtn?: boolean,
  onRightBtnClick?: Stable<HandleClickLink>,
  rightBtnProps?: Stable<BtnProps>,
  RightSvg?: React.SVGFactory,
  rightSvgDim?: number,
  className?: string,
  bindSwipe?: () => ({
    onMouseDown?: React.MouseEventHandler,
    onTouchStart?: React.TouchEventHandler,
    [k: string]: any,
  }),
};

export default React.memo(function StackWrapInnerTopBar({
  title,
  hideBackBtn,
  onRightBtnClick,
  rightBtnProps,
  RightSvg,
  rightSvgDim = 1.8,
  className,
  bindSwipe,
}: Props) {
  const goBackStack = useGoBackStack();
  const isRouteActive = useIsRouteActive();

  useEffect(() => {
    if (isRouteActive) {
      document.title = title === APP_NAME || !title
        ? APP_NAME
        : `${title} · ${APP_NAME}`;
    }
  }, [isRouteActive, title]);

  return (
    <div
      className={cx(styles.container, className)}
      {...bindSwipe?.()}
    >
      <div className={styles.inner}>
        {!hideBackBtn && renderBtn({
          Svg: ChevronLeftSvg,
          svgDim: 1.8,
          onClick: goBackStack,
          isLeft: true,
          ariaLabel: 'Back',
        })}
        <h1
          className={styles.title}
          style={{
            paddingLeft: hideBackBtn
              ? undefined
              : 0,
            paddingRight: rightBtnProps || RightSvg
              ? 0
              : undefined,
          }}
        >
          {title}
        </h1>
        {renderBtn({
          onClick: onRightBtnClick,
          btnProps: rightBtnProps,
          Svg: RightSvg,
          svgDim: rightSvgDim,
          isLeft: false,
        })}
      </div>
    </div>
  );
});
