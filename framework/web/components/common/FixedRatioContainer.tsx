import styles from './FixedRatioContainerStyles.scss';

export type Props = {
  height?: number | string,
  width?: number | string,
  heightPercent?: number,
  widthPercent?: number,
  ratio?: number,
  padding?: number | string,
  borderRadius?: number | string,
  overflow?: 'hidden' | 'visible',
  className?: string,
};

export default function FixedRatioContainer({
  children,
  height,
  width,
  heightPercent,
  widthPercent,
  ratio,
  padding = 0,
  borderRadius,
  overflow,
  className,
}: React.PropsWithChildren<Props>) {
  const containerStyles: {
    height: string | undefined,
    width: string | undefined,
    paddingBottom: string | undefined,
    borderRadius: number | string | undefined,
  } = {
    height: undefined,
    width: '100%',
    paddingBottom: '100%',
    borderRadius,
  };
  if (height && width) {
    containerStyles.height = typeof height === 'number' ? `${height}px` : height;
    containerStyles.width = typeof width === 'number' ? `${width}px` : width;
    containerStyles.paddingBottom = '0';
  } else if (heightPercent && widthPercent) {
    containerStyles.width = `${widthPercent}%`;
    containerStyles.paddingBottom = `${heightPercent}%`;
  } else if (ratio) {
    containerStyles.paddingBottom = `${100 / ratio}%`;
  } else if (!process.env.PRODUCTION) {
    throw new Error('FixedRatioContainer: missing dimensions');
  }

  padding = padding && typeof padding === 'number' ? `${padding}px` : padding;
  return (
    <div
      className={cx(styles.container, className)}
      style={containerStyles}
    >
      <div
        className={styles.inner}
        style={{
          top: padding,
          left: padding,
          right: padding,
          bottom: padding,
          borderRadius: padding ? undefined : borderRadius,
          overflow,
        }}
      >
        {children}
      </div>
    </div>
  );
}
