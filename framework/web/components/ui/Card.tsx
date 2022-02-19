import styles from './CardStyles.scss';

type Props = {
  style?: React.CSSProperties,
  className?: string,
};

export default function Card({
  children,
  style,
  className,
}: React.PropsWithChildren<Props>) {
  return (
    <div
      className={cn(styles.card, className)}
      style={style ?? undefined}
    >
      <div className={styles.topMargin} />
      <div>
        {children}
      </div>
      <div className={styles.bottomMargin} />
    </div>
  );
}
