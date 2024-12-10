import styles from './InfoBanner.scss';

export default function InfoBanner({
  LeftSvg,
  msg,
  linkProps,
  isWarning,
  isError,
  centered,
  className,
  msgClassName,
}: {
  LeftSvg?: React.SVGFactory,
  msg: string | ReactElement,
  linkProps?: Parameters<typeof Link>[0],
  isWarning?: boolean,
  isError?: boolean,
  centered?: boolean,
  className?: string,
  msgClassName?: string,
}) {
  const fullClassName = cx(styles.container, className, {
    [styles.warning]: isWarning,
    [styles.error]: isError,
    [styles.centered]: centered,
  });
  if (linkProps) {
    return (
      <Link
        {...linkProps}
        className={fullClassName}
      >
        <div className={styles.inner}>
          {LeftSvg && (
            <LeftSvg
              className={styles.icon}
            />
          )}
          <div
            className={cx(styles.msg, msgClassName, {
              [styles.centeredMsg]: centered && !LeftSvg,
            })}
          >
            {msg}
          </div>
        </div>
      </Link>
    );
  }
  return (
    <div
      className={fullClassName}
    >
      <div className={styles.inner}>
        {LeftSvg && (
          <LeftSvg
            className={styles.icon}
          />
        )}
        <div className={cx(styles.msg, msgClassName)}>{msg}</div>
      </div>
    </div>
  );
}
