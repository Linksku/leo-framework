import ImageSvg from '@fortawesome/fontawesome-free/svgs/regular/image.svg';

import styles from './ImageStyles.scss';

type Props = {
  url?: string,
  height?: number,
  width?: number,
  heightPercent?: number,
  widthPercent?: number,
  defaultSvg?: React.SVGFactory,
  className?: string,
};

export default function Image({
  url,
  height,
  width,
  heightPercent,
  widthPercent,
  defaultSvg,
  className,
}: Props) {
  const dims: {
    height: string | undefined,
    width: string | undefined,
    paddingBottom: string | undefined,
  } = {
    height: undefined,
    width: undefined,
    paddingBottom: undefined,
  };
  if (height && width) {
    dims.height = `${height}px`;
    dims.width = `${width}px`;
    dims.paddingBottom = '0';
  } else if (heightPercent && widthPercent) {
    dims.width = `${widthPercent}%`;
    dims.paddingBottom = `${heightPercent / widthPercent * 100}%`;
  }

  if (url) {
    return (
      <div
        className={cn(styles.img, className)}
        style={{
          backgroundImage: `url(${url})`,
          ...dims,
        }}
      />
    );
  }
  const Svg = defaultSvg ?? ImageSvg;
  return (
    <div
      className={cn(styles.defaultImg, className)}
      style={dims}
    >
      <Svg />
    </div>
  );
}
