import styles from './Hscroll.scss';

export default function Hscroll({ children }: React.PropsWithChildren) {
  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {children}
      </div>
    </div>
  );
}
