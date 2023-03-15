import UserSvg from 'fa5/svg/user-light.svg';

import Image from 'components/common/Image';

type Props = {
  size?: number | string,
} & Parameters<typeof Image>[0];

export default function UserPhoto({
  size,
  borderRadius = 5,
  ...props
}: Props) {
  return (
    <Image
      height={size}
      width={size}
      defaultSvg={UserSvg}
      borderRadius={borderRadius}
      withBoxShadow
      {...props}
    />
  );
}
