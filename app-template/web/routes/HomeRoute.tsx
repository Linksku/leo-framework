import styles from './HomeRoute.scss';

export default function HomeRoute() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Welcome</h2>
      <p className={styles.content}>To start, edit app/web/routes/HomeRoute.tsx</p>
    </div>
  );
}
