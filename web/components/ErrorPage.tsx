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
  return (
    <div className={cn(styles.container, className)}>
      <h2 className={styles.title}>{title}</h2>
      {content
        ? (
          <p>
            {content}
          </p>
        )
        : null}
    </div>
  );
}
