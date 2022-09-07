import ImageSvg from 'fontawesome5/svgs/regular/image.svg';

import FixedRatioContainer, { Props as FixedRatioContainerProps } from './FixedRatioContainer';

import styles from './ImageStyles.scss';

type Props = {
  url?: string | null,
  alt?: string,
  fit?: 'cover' | 'contain' | 'fill',
  defaultSvg?: React.SVGFactory,
  svgPadding?: number | string,
  svgFill?: string,
  borderRadius?: number,
} & FixedRatioContainerProps;

export default function Image({
  url,
  alt,
  fit = 'cover',
  defaultSvg,
  svgPadding = '10%',
  svgFill,
  borderRadius,
  ...containerProps
}: Props) {
  if (url) {
    return (
      <FixedRatioContainer {...containerProps}>
        <img
          src={url}
          alt={alt}
          className={styles.img}
          style={{
            objectFit: fit,
          }}
        />
      </FixedRatioContainer>
    );
  }

  const Svg = defaultSvg ?? ImageSvg;
  return (
    <FixedRatioContainer
      {...containerProps}
      padding={svgPadding ?? containerProps.padding}
    >
      <Svg
        className={styles.svg}
        style={{
          fill: svgFill,
        }}
      />
    </FixedRatioContainer>
  );
}
