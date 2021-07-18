import styles from './TitleBarStyles.scss';

function renderBtn(
  onClick?: Memoed<React.MouseEventHandler>,
  btnProps?: Memoed<Parameters<typeof Button>[0]>,
  Svg?: React.SVGFactory,
  svgDim?: number,
) {
  if (btnProps) {
    if (!onClick || btnProps.onClick || btnProps.href) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error('Titlebar: use onClick for button.');
      }
      return null;
    }
  } else if (Svg) {
    if (!onClick) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error('Titlebar: onClick is required.');
      }
      return null;
    }
  } else {
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
        if (btnProps) {
          return (
            <Button {...btnProps} />
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
  leftBtnProps?: Memoed<Parameters<typeof Button>[0]>,
  LeftSvg?: React.SVGFactory,
  leftSvgDim?: number,
  onRightBtnClick?: Memoed<React.MouseEventHandler>,
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
  leftBtnProps,
  LeftSvg,
  leftSvgDim = 18,
  onRightBtnClick,
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
        {renderBtn(onLeftBtnClick, leftBtnProps, LeftSvg, leftSvgDim)}
        {renderBtn(onRightBtnClick, rightBtnProps, RightSvg, rightSvgDim)}
      </div>
    </div>
  );
}

export default React.memo(TitleBar);
