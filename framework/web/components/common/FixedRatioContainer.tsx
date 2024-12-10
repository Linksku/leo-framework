import styles from './FixedRatioContainer.scss';

export type Props = {
  height?: number | string,
  width?: number | string,
  heightPercent?: number,
  widthPercent?: number,
  ratio?: number,
  className?: string,
  overrides?: Pick<
    React.CSSProperties,
    | 'backgroundColor'
    | 'borderRadius'
    | 'padding'
    | 'position'
    | 'overflow'
  >,
};

export default function FixedRatioContainer({
  children,
  height,
  width,
  heightPercent,
  widthPercent,
  ratio,
  className,
  overrides: {
    padding = 0,
    ...overrides
  } = {},
}: React.PropsWithChildren<Props>) {
  const containerStyles: Pick<
    React.CSSProperties,
    'height' | 'width' | 'paddingBottom' | 'borderRadius'
  > = {
    height: undefined,
    width: '100%',
    paddingBottom: '100%',
    borderRadius: overrides?.borderRadius,
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

  return (
    <div
      className={cx(styles.container, className)}
      style={{
        ...overrides,
        ...containerStyles,
      }}
    >
      <div
        className={styles.inner}
        style={{
          top: padding,
          left: padding,
          right: padding,
          bottom: padding,
          borderRadius: padding ? undefined : overrides?.borderRadius,
          overflow: overrides?.overflow,
        }}
      >
        {children}
      </div>
    </div>
  );
}
