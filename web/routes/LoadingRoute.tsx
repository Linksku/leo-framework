import styles from './LoadingRouteStyles.scss';

export default function LoadingRoute() {
  return (
    <div className={styles.container}>
      <Spinner />
    </div>
  );
}
