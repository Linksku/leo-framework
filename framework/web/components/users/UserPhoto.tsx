import UserSvg from 'svgs/fa5/user-light.svg';

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
