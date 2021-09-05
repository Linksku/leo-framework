import styles from './UserTaglineStyles.scss';

type Props = {
  userId: number,
  className?: string,
};

export default function UserTagline({
  userId,
  className,
}: Props) {
  const user = useEntity('user', userId);

  return (
    <div className={cn(styles.tagline, className)}>
      {user
        ? user.school || user.jobCompany
        : ''}
    </div>
  );
}
