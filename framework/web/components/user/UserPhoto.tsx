import UserSvg from 'fontawesome5/svgs/regular/user.svg';

import Image from 'components/common/Image';

type Props = {
  url?: string | null,
  size?: number | string,
  className?: string,
};

export default function UserPhoto({
  url,
  size,
  className,
}: Props) {
  return (
    <Image
      url={url}
      height={size}
      width={size}
      defaultSvg={UserSvg}
      className={className}
    />
  );
}
