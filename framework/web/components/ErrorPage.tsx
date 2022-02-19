import styles from './ErrorPageStyles.scss';

type Props = {
  title: ReactNode,
  content?: ReactNode,
  className?: string,
};

export default function ErrorPage({
  title,
  content,
  className,
}: Props) {
  let reloadPage: ReturnType<typeof useReloadPage>;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    reloadPage = useReloadPage();
  } catch {
    // It's possible for this to be outside the providers.
    // @ts-ignore reload(true) is still supported
    reloadPage = _ => window.location.reload(true);
  }

  return (
    <div className={cn(styles.container, className)}>
      <h2 className={styles.title}>{title}</h2>
      <p>
        {content !== undefined
          ? content
          : (
            <>
              {'Please try '}
              <span
                onClick={e => {
                  e.preventDefault();
                  reloadPage(0);
                }}
                role="button"
                tabIndex={-1}
                className={styles.link}
              >
                reloading
              </span>
              {' the page or restarting the app'}
            </>
          )}
      </p>
    </div>
  );
}
