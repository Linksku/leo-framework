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
        className={styles.svgWrap}
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
} & React.HTMLAttributes<HTMLDivElement>;

function TitleBar({
  children,
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
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <div
      className={cn(styles.container, className)}
      {...bindSwipe?.()}
      {...props}
    >
      {renderBtn(onLeftBtnClick, leftBtnProps, LeftSvg, leftSvgDim)}
      <h1 className={styles.title}>
        {title ?? children}
      </h1>
      {renderBtn(onRightBtnClick, rightBtnProps, RightSvg, rightSvgDim)}
    </div>
  );
}

export default React.memo(TitleBar);
