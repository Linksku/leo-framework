import styles from './ErrorPageStyles.scss';

type Props = {
  title: ReactNode,
  content?: ReactNode,
  showReload?: boolean,
  btns?: ReactElement | ReactFragment | (ReactElement | ReactFragment)[],
  btnsMargin?: string,
  fullHeight?: boolean,
  className?: string,
};

export default function ErrorPage({
  title,
  content,
  showReload = true,
  btns,
  btnsMargin,
  fullHeight = true,
  className,
}: Props) {
  let reloadPage: ReturnType<typeof useReloadPage> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    reloadPage = useReloadPage();
  } catch {}

  return (
    <div
      className={cx(styles.container, className)}
      style={fullHeight ? { minHeight: '100vh' } : undefined}
    >
      <h2 className={styles.title}>{title}</h2>
      {content !== undefined && <p>{content}</p>}
      {showReload && (
        <p>
          {'You can try to '}
          <span
            onClick={e => {
              e.preventDefault();

              // It's possible for ErrorPage to be outside the providers.
              if (typeof reloadPage === 'function') {
                reloadPage();
              } else {
                // @ts-ignore reload(true) is still supported
                window.location.reload(true);
              }
            }}
            role="button"
            tabIndex={-1}
            className={styles.link}
          >
            reload
          </span>
          {' the page, go back to '}
          <a href="/">home</a>
          {/* eslint-disable-next-line react/jsx-child-element-spacing */}
          , or restart the app.
        </p>
      )}
      {btns && (
        <div
          className={styles.btns}
          style={{
            marginTop: btnsMargin,
          }}
        >
          {btns}
        </div>
      )}
    </div>
  );
}
