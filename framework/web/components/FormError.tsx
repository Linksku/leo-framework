import styles from './FormError.scss';

export default function FormError({ error, marginBottom }: {
  error: Nullish<string>,
  marginBottom?: string | number,
}) {
  if (!error) {
    return null;
  }

  return (
    <div
      className={styles.error}
      style={{
        marginBottom,
      }}
    >
      {error}
    </div>
  );
}
