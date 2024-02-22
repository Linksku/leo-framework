import styles from './InfoBanner.scss';

export default function InfoBanner({
  msg,
  LeftSvg,
  linkProps,
  isError,
  centered,
  className,
  msgClassName,
}: {
  msg: string | ReactElement,
  LeftSvg?: React.SVGFactory,
  linkProps?: Parameters<typeof Link>[0],
  isError?: boolean,
  centered?: boolean,
  className?: string,
  msgClassName?: string,
}) {
  const fullClassName = cx(styles.container, className, {
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
          <div className={msgClassName}>{msg}</div>
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
        <div className={msgClassName}>{msg}</div>
      </div>
    </div>
  );
}
