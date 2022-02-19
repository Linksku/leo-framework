import styles from './HscrollStyles.scss';

export default function Hscroll({ children }: React.PropsWithChildren<unknown>) {
  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {children}
      </div>
    </div>
  );
}
