import styles from './MaxWidthCard.scss';

type Props = {
  maxWidth?: 'lg' | 'md' | 'sm' | 'xs',
  minWidth?: 'lg' | 'md' | 'sm' | 'xs' | null,
  isFirstElem?: boolean,
  padding?: number | string,
  paddingTop?: number | string,
  paddingHorizontal?: number | string,
  paddingBottom?: number | string,
  marginTop?: number | string,
  marginBottom?: number | string,
};

export default function MaxWidthCard({
  maxWidth = 'lg',
  minWidth = 'md',
  isFirstElem,
  padding,
  paddingTop,
  paddingHorizontal,
  paddingBottom,
  marginTop,
  marginBottom,
  children,
}: React.PropsWithChildren<Props>) {
  const minWidthStyle = minWidth
    ? {
      lg: styles.minWidthLg,
      md: styles.minWidthMd,
      sm: styles.minWidthSm,
      xs: styles.minWidthXs,
    }[minWidth]
    : null;
  const maxWidthStyle = {
    lg: styles.maxWidthLg,
    md: styles.maxWidthMd,
    sm: styles.maxWidthSm,
    xs: styles.maxWidthXs,
  }[maxWidth];
  return (
    <div className={cx(styles.wrap, minWidthStyle, maxWidthStyle)}>
      <div
        className={cx(styles.card, {
          [styles.firstElem]: isFirstElem,
        })}
        style={{
          paddingTop: paddingTop ?? padding,
          paddingLeft: paddingHorizontal ?? padding,
          paddingRight: paddingHorizontal ?? padding,
          paddingBottom: paddingBottom ?? padding,
          marginTop,
          marginBottom,
        }}
      >
        {children}
      </div>
    </div>
  );
}
