import styles from './TitleBarStyles.scss';

type BtnProps = Memoed<Omit<Parameters<typeof Button>[0], 'onClick'>>;

function renderBtn(
  onClick?: Memoed<React.MouseEventHandler>,
  btnProps?: BtnProps,
  Svg?: React.SVGFactory,
  svgDim?: number,
) {
  if (btnProps) {
    return (
      <div className={styles.btnWrap}>
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
        className={styles.btnWrap}
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
  onLeftBtnClick?: Memoed<React.MouseEventHandler>,
  leftBtnProps?: BtnProps,
  LeftSvg?: React.SVGFactory,
  leftSvgDim?: number,
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

function TitleBar({
  title,
  onLeftBtnClick,
  leftBtnProps,
  LeftSvg,
  leftSvgDim = 1.8,
  onRightBtnClick,
  rightBtnProps,
  RightSvg,
  rightSvgDim = 1.8,
  className,
  bindSwipe,
}: Props) {
  return (
    <div
      className={cn(styles.container, className)}
      {...bindSwipe?.()}
    >
      <div className={styles.inner}>
        {renderBtn(onLeftBtnClick, leftBtnProps, LeftSvg, leftSvgDim)}
        <h1
          className={styles.title}
          style={{
            paddingLeft: leftBtnProps || LeftSvg
              ? undefined
              : 0,
            paddingRight: rightBtnProps || RightSvg
              ? undefined
              : 0,
          }}
        >
          {title}
        </h1>
        {renderBtn(onRightBtnClick, rightBtnProps, RightSvg, rightSvgDim)}
      </div>
    </div>
  );
}

export default React.memo(TitleBar);
