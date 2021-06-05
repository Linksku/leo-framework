import styles from './ErrorPageStyles.scss';

type Props = {
  title: string,
  content?: ReactNode,
};

export default function ErrorPage({
  title,
  content,
}: Props) {
  return (
    <div className={styles.container}>
      <h2>{title}</h2>
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
