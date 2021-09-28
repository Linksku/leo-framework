import Image from 'components/common/Image';
import UserPhoto from 'components/user/UserPhoto';

import styles from './UserCardStyles.scss';

type Props = {
  userId: number,
  className?: string,
};

export default function UserCard({ userId, className }: Props) {
  const user = useRequiredEntity('user', userId);

  return (
    <Link
      href={`/user/${userId}`}
      className={cn(styles.container, className)}
    >
      <Image
        url={user.coverPhotoUrls?.[0]}
        heightPercent={40}
        widthPercent={100}
      />
      <div className={styles.info}>
        <UserPhoto
          url={user.photoIconUrl}
          size={40}
        />
        <div className={styles.infoRight}>
          <h4 className={styles.name}>{user.name}</h4>
          <div className={styles.userInfo}>
            {user.school || user.jobCompany}
          </div>
        </div>
      </div>
    </Link>
  );
}
