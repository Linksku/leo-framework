import styles from './TableStyles.scss';

type Props = {
  className?: string,
};

export default function Table({
  children,
  className,
}: React.PropsWithChildren<Props>) {
  return (
    <div className={cn(styles.wrap, className)}>
      <div className={styles.shadow} />
      <div className={styles.scroll}>
        <table>
          {children}
        </table>
        <div />
      </div>
    </div>
  );
}
