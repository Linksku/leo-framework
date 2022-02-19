import ImageSvg from 'fontawesome5/svgs/regular/image.svg';

import styles from './ImageStyles.scss';

type Props = {
  url?: string | null,
  height?: number | string,
  width?: number | string,
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
    dims.height = typeof height === 'number' ? `${height}px` : height;
    dims.width = typeof width === 'number' ? `${width}px` : width;
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
      className={cn(styles.svgOuter, className)}
      style={dims}
    >
      <div className={styles.svgInner}>
        <Svg />
      </div>
    </div>
  );
}
