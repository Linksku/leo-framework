import styles from './TitleBarStyles.scss';

function renderBtn(
  onClick?: Memoed<React.MouseEventHandler>,
  btnText?: string,
  btnProps?: Memoed<Parameters<typeof Button>[0]>,
  Svg?: React.SVGFactory,
  svgDim?: number,
) {
  if (!onClick || (!btnText && !Svg)) {
    return null;
  }

  return (
    <div
      className={styles.btnWrap}
      onClick={onClick}
      role="button"
      tabIndex={-1}
    >
      {(() => {
        if (btnText) {
          return (
            <Button label={btnText} {...btnProps} />
          );
        }
        if (Svg) {
          return (
            <Svg style={{ height: svgDim, width: svgDim }} />
          );
        }
        return null;
      })()}
    </div>
  );
}

type Props = {
  title?: string,
  onLeftBtnClick?: Memoed<React.MouseEventHandler>,
  leftBtnText?: string,
  leftBtnProps?: Memoed<Parameters<typeof Button>[0]>,
  LeftSvg?: React.SVGFactory,
  leftSvgDim?: number,
  onRightBtnClick?: Memoed<React.MouseEventHandler>,
  rightBtnText?: string,
  rightBtnProps?: Memoed<Parameters<typeof Button>[0]>,
  RightSvg?: React.SVGFactory,
  rightSvgDim?: number,
  className?: string,
  bindSwipe?: () => ({
    onMouseDown?: React.MouseEventHandler,
    onTouchStart?: React.TouchEventHandler,
    [k: string]: any,
  }),
} & React.HTMLAttributes<HTMLDivElement>;

function TitleBar({
  children,
  title,
  onLeftBtnClick,
  leftBtnText,
  leftBtnProps,
  LeftSvg,
  leftSvgDim = 18,
  onRightBtnClick,
  rightBtnText,
  rightBtnProps,
  RightSvg,
  rightSvgDim = 18,
  className,
  bindSwipe,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <div
      className={cn(styles.container, className)}
      {...bindSwipe?.()}
      {...props}
    >
      <h1 className={styles.title}>
        {title ?? children}
      </h1>
      <div className={styles.buttons}>
        {renderBtn(onLeftBtnClick, leftBtnText, leftBtnProps, LeftSvg, leftSvgDim)}
        {renderBtn(onRightBtnClick, rightBtnText, rightBtnProps, RightSvg, rightSvgDim)}
      </div>
    </div>
  );
}

export default React.memo(TitleBar);
