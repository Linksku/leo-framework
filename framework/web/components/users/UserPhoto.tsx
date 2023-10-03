import UserSvg from 'fa5/svg/user-light.svg';

import Img from 'components/common/Img';

type Props = {
  sizeRem?: number,
} & Parameters<typeof Img>[0];

export default function UserPhoto({
  sizeRem,
  borderRadius = 5,
  ...props
}: Props) {
  return (
    <Img
      heightRem={sizeRem}
      widthRem={sizeRem}
      defaultSvg={UserSvg}
      borderRadius={borderRadius}
      withBoxShadow
      {...props}
    />
  );
}
