import { useIsHome } from 'stores/history/HistoryStore';
import styles from './ErrorPage.scss';

type Props = {
  title: ReactNode,
  content?: ReactNode,
  showReload?: boolean,
  btns?: ReactElement | ReactFragment | (ReactElement | ReactFragment)[],
  fullHeight?: boolean,
  className?: string,
};

export default function ErrorPage({
  title,
  content,
  showReload = true,
  btns,
  fullHeight = true,
  className,
}: Props) {
  const reloadPage = useReloadPage(true);
  const isHome = useIsHome(true);

  return (
    <div
      className={cx(styles.container, className, {
        [styles.fullHeight]: fullHeight && !isHome,
        [styles.fullHeightHome]: fullHeight && isHome,
      })}
    >
      <h2 className={styles.title}>{title}</h2>
      {content !== undefined && <p className={styles.content}>{content}</p>}
      {showReload && (
        <p>
          {'You can try to '}
          {/* Note: don't use Link here because stores may not be available */}
          <span
            onClick={e => {
              e.preventDefault();

              // It's possible for ErrorPage to be outside the providers.
              if (typeof reloadPage === 'function') {
                reloadPage();
              } else {
                // @ts-expect-error reload(true) is still supported
                window.location.reload(true);
              }
            }}
            role="button"
            tabIndex={0}
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
        <div className={styles.btns}>
          {btns}
        </div>
      )}
    </div>
  );
}
