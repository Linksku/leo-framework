import styles from './HomeHeaderIconUnreadCountStyles.scss';

type Props = {
  count: Nullish<number>,
};

export default function HomeHeaderIconUnreadCount({ count }: Props) {
  return count
    ? (
      <span className={styles.count}>
        <span>
          {count > 9 ? '9+' : count}
        </span>
      </span>
    )
    : null;
}
