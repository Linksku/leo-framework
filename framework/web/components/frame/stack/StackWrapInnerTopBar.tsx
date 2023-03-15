import ChevronLeftSvg from 'fa5/svg/chevron-left-regular.svg';

import { useGoBackStack } from 'stores/StacksNavStore';

import styles from './StackWrapInnerTopBarStyles.scss';

type BtnProps = Memoed<Omit<Parameters<typeof Button>[0], 'onClick'>>;

function renderBtn({
  onClick,
  btnProps,
  Svg,
  svgDim,
  isLeft,
}: {
  onClick?: React.MouseEventHandler,
  btnProps?: BtnProps,
  Svg?: React.SVGFactory,
  svgDim?: number,
  isLeft?: boolean,
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
          {...btnProps}
        />
      </div>
    );
  }
  if (Svg) {
    return (
      <div
        className={cx(styles.btnWrap, styles.svgBtnWrap, {
          [styles.rightBtnWrap]: !isLeft,
        })}
        onClick={onClick}
        role="button"
        tabIndex={-1}
      >
        <Svg style={{ height: `${svgDim}rem`, width: `${svgDim}rem` }} />
      </div>
    );
  }
  return null;
}

type Props = {
  title?: string,
  hideBackBtn?: boolean,
  onRightBtnClick?: Memoed<React.MouseEventHandler>,
  rightBtnProps?: BtnProps,
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

  return (
    <div
      className={cx(styles.container, className)}
      {...bindSwipe?.()}
    >
      <div className={styles.inner}>
        {!hideBackBtn && renderBtn({
          Svg: ChevronLeftSvg,
          svgDim: 1.8,
          onClick: () => goBackStack(),
          isLeft: true,
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
